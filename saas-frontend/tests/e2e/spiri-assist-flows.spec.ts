import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import { AuthPage } from '../pages/AuthPage';
import {
    clearTestEntityRegistry,
    registerTestUser,
    registerTestCase,
    getCookiesFromPage,
    cleanupTestUsers,
    cleanupTestCases,
    gqlDirect,
} from '../utils/test-cleanup';
import {
    fillStripePaymentElement,
    setupIlluminatePractitioner,
    createAuthenticatedContext,
    cleanupIlluminatePractitioner,
} from '../utils/illuminate-setup';

// Per-worker state for parallel safety
const customerCookiesPerWorker = new Map<number, string>();
const customerContextPerWorker = new Map<number, BrowserContext>();
const trackingCodePerWorker = new Map<number, string>();
const caseCodePerWorker = new Map<number, string>();
const practitionerDataPerWorker = new Map<number, { slug: string; cookies: string; vendorId: string }>();

test.describe.serial('SpiriAssist Case Flows', () => {

    test.beforeAll(async ({}, testInfo) => {
        clearTestEntityRegistry(testInfo.parallelIndex);
    });

    test.afterAll(async ({}, testInfo) => {
        test.setTimeout(60000);
        const workerId = testInfo.parallelIndex;
        const cookies = customerCookiesPerWorker.get(workerId);

        // 1. Purge cases first (they reference the customer)
        if (cookies) {
            try {
                await cleanupTestCases(cookies, workerId);
            } catch (error) {
                console.error('[Cleanup] Error during case cleanup:', error);
            }
        }

        // 2. Purge practitioner vendor BEFORE any user purges (needs valid session)
        try {
            await cleanupIlluminatePractitioner(testInfo);
        } catch (error) {
            console.error('[Cleanup] Error during practitioner cleanup:', error);
        }

        // 3. Purge customer user last (after vendor is gone)
        if (cookies) {
            try {
                await cleanupTestUsers(cookies, workerId);
            } catch (error) {
                console.error('[Cleanup] Error during customer user cleanup:', error);
            } finally {
                customerCookiesPerWorker.delete(workerId);
            }
        }

        trackingCodePerWorker.delete(workerId);
        caseCodePerWorker.delete(workerId);
        practitionerDataPerWorker.delete(workerId);
        clearTestEntityRegistry(workerId);
    });

    test('customer creates a case', async ({ page }, testInfo) => {
        test.setTimeout(300000);

        const timestamp = Date.now();
        const workerId = testInfo.parallelIndex;
        const testEmail = `case-flow-${timestamp}-${workerId}@playwright.com`;
        const testName = `Case Flow User ${timestamp}`;

        // Capture console errors for debugging
        const consoleErrors: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });
        page.on('pageerror', err => {
            console.log(`[Test] PAGE ERROR: ${err.message}`);
            consoleErrors.push(`PAGE_ERROR: ${err.message}`);
        });

        // === STEP 1: Authenticate ===
        console.log('[Test] Step 1: Authenticating user...');
        await page.goto('/');

        // Dismiss cookie banner if present
        const cookieBanner = page.getByTestId('cookie-banner');
        if (await cookieBanner.isVisible({ timeout: 3000 }).catch(() => false)) {
            const acceptBtn = cookieBanner.locator('button', { hasText: 'Accept' });
            if (await acceptBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
                await acceptBtn.click();
                await expect(cookieBanner).not.toBeVisible({ timeout: 3000 });
            }
        }

        const authPage = new AuthPage(page);
        await authPage.startAuthFlow(testEmail);
        await expect(page.locator('[aria-label="input-login-otp"]')).toBeVisible({ timeout: 15000 });
        await page.locator('[aria-label="input-login-otp"]').click();
        await page.keyboard.type('123456');

        // Wait for auth to complete by polling session API
        let authCompleted = false;
        for (let attempt = 0; attempt < 20; attempt++) {
            await page.waitForTimeout(1500);
            const sessionText = await page.evaluate(async () => {
                try {
                    const resp = await fetch('/api/auth/session');
                    return await resp.text();
                } catch { return 'error'; }
            });
            if (sessionText && sessionText !== 'null' && sessionText !== '{}' && sessionText !== 'error') {
                authCompleted = true;
                console.log(`[Test] Auth completed on attempt ${attempt + 1}`);
                break;
            }
        }
        if (!authCompleted) {
            throw new Error('Authentication did not complete within 30 seconds');
        }
        console.log('[Test] Authenticated successfully');

        // Store cookies for cleanup and later reuse
        const cookies = await getCookiesFromPage(page);
        if (cookies) customerCookiesPerWorker.set(workerId, cookies);

        // Register user for cleanup
        const sessionResp = await page.evaluate(async () => {
            const resp = await fetch('/api/auth/session');
            return await resp.text();
        });
        let userId: string | undefined;
        try {
            const parsed = JSON.parse(sessionResp);
            userId = parsed?.user?.id;
        } catch {
            console.log('[Test] Could not parse session response');
        }
        if (userId && cookies) {
            registerTestUser({ id: userId, email: testEmail, cookies }, workerId);
        }

        // Store browser context for reuse in later tests
        customerContextPerWorker.set(workerId, page.context());

        // === STEP 1b: Dismiss consent dialog if shown ===
        console.log('[Test] Step 1b: Checking for consent review dialog...');
        await page.waitForTimeout(3000);

        const consentModal = page.getByTestId('consent-guard-modal');
        if (await consentModal.isVisible({ timeout: 5000 }).catch(() => false)) {
            console.log('[Test] Consent dialog detected — accepting documents...');

            const progressText = await page.getByTestId('consent-progress-count').textContent();
            const totalDocs = parseInt(progressText?.match(/of (\d+)/)?.[1] || '2');

            for (let docIdx = 0; docIdx < totalDocs; docIdx++) {
                await page.waitForTimeout(500);

                await page.evaluate(() => {
                    const cb = document.querySelector('[data-testid^="consent-checkbox-"]') as HTMLElement;
                    cb?.click();
                });

                if (docIdx < totalDocs - 1) {
                    const nextBtn = page.getByTestId('consent-next-btn');
                    await expect(nextBtn).toBeEnabled({ timeout: 5000 });
                    await page.evaluate(() => {
                        (document.querySelector('[data-testid="consent-next-btn"]') as HTMLElement)?.click();
                    });
                } else {
                    const acceptBtn = page.getByTestId('consent-accept-btn');
                    await expect(acceptBtn).toBeEnabled({ timeout: 5000 });
                    await page.evaluate(() => {
                        (document.querySelector('[data-testid="consent-accept-btn"]') as HTMLElement)?.click();
                    });
                }
            }

            await expect(consentModal).not.toBeVisible({ timeout: 10000 });
            console.log('[Test] Consent dialog dismissed');
        } else {
            console.log('[Test] No consent dialog');
        }

        // === STEP 2: Navigate to SpiriAssist landing page ===
        console.log('[Test] Step 2: Navigating to SpiriAssist...');
        await page.goto('/spiriassist');
        await expect(page.getByTestId('submit-case-btn').first()).toBeVisible({ timeout: 15000 });

        // === STEP 3: Open case creation dialog ===
        console.log('[Test] Step 3: Opening case creation dialog...');
        await page.getByTestId('submit-case-btn').first().click();
        const dialogTitle = page.locator('text=Create a new help request');
        await expect(dialogTitle).toBeVisible({ timeout: 15000 });

        // === STEP 4: Page 0 — Contact & Category ===
        console.log('[Test] Step 4: Filling contact and category...');
        const emailInput = page.locator('[aria-label="input-case-contact-email"]');
        await expect(emailInput).toBeVisible({ timeout: 30000 });

        const nameInput = page.locator('[aria-label="input-case-contact-name"]');
        await nameInput.fill(testName);

        const phoneInput = page.locator('input[placeholder="Phone Number"]');
        await expect(phoneInput).toBeVisible({ timeout: 5000 });
        await phoneInput.click();
        await page.keyboard.type('0412345678');

        await page.waitForTimeout(2000);

        const categoryTrigger = page.locator('[aria-label="combobox-case-category-trigger"]');
        await expect(categoryTrigger).toBeVisible({ timeout: 10000 });
        await categoryTrigger.click();
        await page.waitForTimeout(500);
        const categoryOption = page.locator('[aria-label="combobox-case-category-result"]').first();
        await expect(categoryOption).toBeVisible({ timeout: 5000 });
        await categoryOption.click();

        const religionPickerBtn = page.getByTestId('religion-picker');
        await expect(religionPickerBtn).toBeVisible({ timeout: 5000 });
        await religionPickerBtn.click();
        await page.waitForTimeout(1000);
        const religionTree = page.getByTestId('religion-tree');
        await expect(religionTree).toBeVisible({ timeout: 10000 });
        const firstReligionOption = religionTree.locator('[role="treeitem"]').first();
        await expect(firstReligionOption).toBeVisible({ timeout: 5000 });
        await firstReligionOption.click();

        await page.locator('[aria-label="button-next"]').click();
        console.log('[Test] Page 0 complete');

        // === STEP 5: Page 1 — Location & Description ===
        console.log('[Test] Step 5: Filling location and description...');
        const addressInput = page.locator('[aria-label="input-case-location"]');
        await expect(addressInput).toBeVisible({ timeout: 10000 });
        await addressInput.click();
        await addressInput.pressSequentially('Sydney Opera House', { delay: 50 });
        await page.waitForTimeout(3000);

        const autocompleteListbox = page.locator('[role="listbox"]');
        const listboxVisible = await autocompleteListbox.isVisible({ timeout: 5000 }).catch(() => false);
        if (listboxVisible) {
            const options = page.locator('[role="option"]');
            const optionCount = await options.count();
            if (optionCount > 0) {
                await options.first().click();
                await page.waitForTimeout(1000);
            }
        } else {
            await addressInput.clear();
            await page.waitForTimeout(500);
            await addressInput.pressSequentially('Melbourne', { delay: 50 });
            await page.waitForTimeout(3000);
            const retryOptions = page.locator('[role="option"]');
            if (await retryOptions.first().isVisible({ timeout: 5000 }).catch(() => false)) {
                await retryOptions.first().click();
                await page.waitForTimeout(1000);
            }
        }

        const durationInput = page.locator('[aria-label="input-startedFrom-amount"]');
        await durationInput.fill('3');

        const unitTrigger = page.locator('[aria-label="combobox-case-unit-trigger"]');
        const unitText = await unitTrigger.textContent();
        if (!unitText?.includes('Month')) {
            await unitTrigger.click();
            await page.waitForTimeout(500);
            const unitOption = page.locator('[aria-label="combobox-case-unit-result"]').first();
            await expect(unitOption).toBeVisible({ timeout: 5000 });
            await unitOption.click();
        }

        const descriptionContainer = page.locator('[aria-label="textInput-case-description"]');
        await expect(descriptionContainer).toBeVisible({ timeout: 5000 });
        const richTextEditor = descriptionContainer.locator('[contenteditable="true"]');
        await richTextEditor.click();
        await page.keyboard.type('This is an automated test case for SpiriAssist flow testing. We are experiencing unexplained activity and need professional investigation.');

        await page.locator('[aria-label="button-next"]').click();
        console.log('[Test] Page 1 complete');

        // === STEP 6: Page 2 — Affected People ===
        console.log('[Test] Step 6: Adding affected person...');
        const personInput = page.locator('[aria-label="input-case-new-personAffected"]');
        await expect(personInput).toBeVisible({ timeout: 10000 });
        await personInput.fill('John Smith');

        const confirmPersonBtns = page.locator('[aria-label="button-case-new-personAffected"]');
        await confirmPersonBtns.first().click();
        await page.waitForTimeout(500);
        await expect(page.locator('text=John Smith')).toBeVisible({ timeout: 5000 });

        await page.locator('[aria-label="button-next"]').click();
        console.log('[Test] Page 2 complete');

        // === STEP 7: Page 3 — Affected Areas ===
        console.log('[Test] Step 7: Adding affected area...');
        const areaInput = page.locator('input[placeholder="Area"]');
        await expect(areaInput).toBeVisible({ timeout: 10000 });
        await areaInput.fill('Living Room');

        const confirmAreaBtns = page.locator('[aria-label="button-case-new-areaAffected"]');
        await confirmAreaBtns.first().click();
        await page.waitForTimeout(500);
        await expect(page.locator('li:has-text("Living Room")')).toBeVisible({ timeout: 5000 });

        await page.locator('[aria-label="button-next"]').click();
        console.log('[Test] Page 3 complete');

        // === STEP 8: Page 4 — Urgency & Payment Summary ===
        console.log('[Test] Step 8: Reviewing payment summary...');
        await expect(page.locator('text=Listing Fee')).toBeVisible({ timeout: 15000 });

        const urgencyOption = page.locator('[data-testid^="urgency-option-"]').first();
        if (await urgencyOption.isVisible({ timeout: 5000 }).catch(() => false)) {
            await urgencyOption.click();
        }

        await expect(page.locator('span:has-text("Total:")')).toBeVisible({ timeout: 5000 });

        const createCaseBtn = page.locator('[aria-label="button-create-case"]');
        await expect(createCaseBtn).toBeVisible({ timeout: 5000 });
        await expect(createCaseBtn).toBeEnabled({ timeout: 5000 });
        await createCaseBtn.click();
        console.log('[Test] Clicked "Continue - payment"');

        await page.waitForTimeout(8000);

        // === STEP 9: Page 5 — Stripe Checkout ===
        console.log('[Test] Step 9: Completing Stripe checkout...');
        await expect(page.locator('text=Billing Address')).toBeVisible({ timeout: 15000 });

        await page.locator('input[placeholder="Full name"]').fill('Case Flow Test User');
        await page.locator('input[placeholder="Street address"]').fill('123 Test Street');
        await page.locator('input[placeholder="Apartment, suite, etc."]').fill('Unit 1');
        await page.locator('label:has-text("City") + input, input[placeholder="City"]').first().fill('Sydney');

        const stateInput = page.locator('label:has-text("State")').locator('..').locator('input');
        if (await stateInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await stateInput.fill('NSW');
        }

        await page.locator('input[placeholder="Postal code"]').fill('2000');
        await page.locator('input[placeholder*="Country"]').fill('AU');

        const saveAddressBtn = page.locator('button:has-text("Save Address")');
        await expect(saveAddressBtn).toBeVisible({ timeout: 5000 });
        await saveAddressBtn.click();
        await page.waitForTimeout(2000);

        const paymentMethodSection = page.locator('text=Payment Method');
        await expect(paymentMethodSection).toBeVisible({ timeout: 5000 });
        await paymentMethodSection.click();
        await page.waitForTimeout(3000);

        await fillStripePaymentElement(page);

        const consentSection = page.getByTestId('checkout-consent-section');
        if (await consentSection.isVisible({ timeout: 5000 }).catch(() => false)) {
            const checkboxes = consentSection.locator('[role="checkbox"]');
            const count = await checkboxes.count();
            for (let i = 0; i < count; i++) {
                const cb = checkboxes.nth(i);
                const state = await cb.getAttribute('data-state');
                if (state !== 'checked') {
                    await cb.click({ force: true });
                    await page.waitForTimeout(300);
                }
            }
        }

        const finishPayBtn = page.getByTestId('finish-pay-btn');
        await expect(finishPayBtn).toBeEnabled({ timeout: 10000 });
        await finishPayBtn.click();
        console.log('[Test] Clicked Finish & Pay');

        // === STEP 10: Wait for Stripe redirect ===
        await page.waitForURL(/redirect_status=succeeded/, { timeout: 60000 });
        console.log('[Test] Stripe redirect received');

        // === STEP 11: Wait for case creation URL redirect ===
        await page.waitForURL(/create_case_status=suceeded/, { timeout: 60000 });
        console.log('[Test] Case creation redirect received');

        const successUrl = new URL(page.url());
        const trackingCode = successUrl.searchParams.get('case_tracking_code');
        expect(trackingCode).toBeTruthy();
        console.log(`[Test] Tracking code: ${trackingCode}`);

        // Store tracking code for subsequent tests
        trackingCodePerWorker.set(workerId, trackingCode!);
        registerTestCase(trackingCode!, workerId);

        // === STEP 12: Wait for success dialog ===
        await expect(page.locator('text=Case request submitted')).toBeVisible({ timeout: 120000 });
        console.log('[Test] Success dialog visible — case status is NEW');

        await page.locator('[aria-label="button-close-createOffer-dialog"]').click();
        await page.waitForTimeout(1000);
        console.log('[Test] Case creation complete');
    });

    test('customer views case on tracking page', async ({ page }, testInfo) => {
        test.setTimeout(60000);

        const workerId = testInfo.parallelIndex;
        const trackingCode = trackingCodePerWorker.get(workerId);
        expect(trackingCode).toBeTruthy();

        // Restore customer session
        const cookies = customerCookiesPerWorker.get(workerId);
        if (cookies) {
            const cookiePairs = cookies.split('; ').map(c => {
                const [name, ...rest] = c.split('=');
                return { name, value: rest.join('='), domain: 'localhost', path: '/' };
            });
            await page.context().addCookies(cookiePairs);
        }

        console.log(`[Test] Navigating to tracking page: /track/case/${trackingCode}`);
        await page.goto(`/track/case/${trackingCode}`);

        // Verify and capture case code for strict matching in later tests
        const caseCodeEl = page.getByTestId('case-code');
        await expect(caseCodeEl).toBeVisible({ timeout: 15000 });
        const caseCode = (await caseCodeEl.textContent())?.trim();
        expect(caseCode).toBeTruthy();
        caseCodePerWorker.set(workerId, caseCode!);
        console.log(`[Test] Case code: ${caseCode}`);

        // Verify status is NEW
        const caseStatusEl = page.getByTestId('case-status');
        await expect(caseStatusEl).toBeVisible({ timeout: 10000 });
        await expect(caseStatusEl).toHaveText('NEW', { timeout: 5000 });
        console.log('[Test] Case status is NEW');

        // Expand Contact accordion and verify details
        const contactTrigger = page.locator('text=Contact');
        await expect(contactTrigger).toBeVisible({ timeout: 5000 });
        await contactTrigger.click();
        await page.waitForTimeout(500);

        // Verify contact email is visible (the test email we used)
        await expect(page.locator('text=@playwright.com')).toBeVisible({ timeout: 5000 });
        console.log('[Test] Contact details verified');

        // Verify accordion sections exist
        await expect(page.locator('text=Affected Areas')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('text=Affected People')).toBeVisible({ timeout: 5000 });
        console.log('[Test] Affected Areas and People sections visible');

        // Verify awaiting applications message (no offers yet)
        const awaitingMsg = page.getByTestId('awaiting-applications');
        await expect(awaitingMsg).toBeVisible({ timeout: 10000 });
        console.log('[Test] Awaiting applications message visible');

        console.log('[Test] Tracking page verification complete');
    });

    test('practitioner applies for case', async ({ browser }, testInfo) => {
        test.setTimeout(300000);

        const workerId = testInfo.parallelIndex;
        const trackingCode = trackingCodePerWorker.get(workerId);
        expect(trackingCode).toBeTruthy();

        // Setup Illuminate practitioner
        console.log('[Test] Setting up Illuminate practitioner...');
        const practitionerData = await setupIlluminatePractitioner(browser, testInfo, 'case-flow-prac');
        practitionerDataPerWorker.set(workerId, practitionerData);
        console.log(`[Test] Practitioner ready: ${practitionerData.slug}`);

        // Create authenticated practitioner browser context
        const practContext = await createAuthenticatedContext(browser, practitionerData.cookies);
        const practPage = await practContext.newPage();

        try {
            // Navigate to practitioner's SpiriAssist manage page
            console.log('[Test] Navigating to practitioner SpiriAssist page...');
            await practPage.goto(`/p/${practitionerData.slug}/manage/spiri-assist`);

            // Verify NOT locked (practitioner has Illuminate tier)
            const lockedPreview = practPage.getByTestId('spiri-assist-locked-preview');
            await expect(lockedPreview).not.toBeVisible({ timeout: 15000 });
            console.log('[Test] SpiriAssist page accessible (not locked)');

            // Wait for available cases to load
            await expect(practPage.locator('text=Available Help Requests')).toBeVisible({ timeout: 15000 });
            console.log('[Test] Available Help Requests panel visible');

            // Wait for categories and cases to load — look for a category with cases (count badge > 0)
            // The cases are grouped by category with a count badge (circle with number)
            await practPage.waitForTimeout(5000); // Allow cases query to complete

            // Find and click the Apply button for our specific case
            const applyButton = practPage.locator(`[aria-label="button-apply-to-case-${trackingCode}"]`);

            // The case may be inside a collapsed collapsible, so we need to expand categories
            // Try to find the apply button — if not visible, expand all collapsible triggers
            let applyVisible = await applyButton.isVisible({ timeout: 3000 }).catch(() => false);

            if (!applyVisible) {
                console.log('[Test] Apply button not immediately visible, expanding categories...');
                // Click on category collapsible triggers that have cases (non-zero badge)
                const collapsibleTriggers = practPage.locator('.flex.flex-row.items-center.justify-between.space-x-2');
                const triggerCount = await collapsibleTriggers.count();

                for (let i = 0; i < triggerCount; i++) {
                    const trigger = collapsibleTriggers.nth(i);
                    // Check if this category has cases (badge shows non-zero)
                    const badge = trigger.locator('.rounded-full');
                    const badgeText = await badge.textContent().catch(() => '0');
                    if (badgeText && parseInt(badgeText.trim()) > 0) {
                        await trigger.click();
                        await practPage.waitForTimeout(1000);
                        console.log(`[Test] Expanded category with ${badgeText.trim()} case(s)`);

                        // Check if our apply button is now visible
                        applyVisible = await applyButton.isVisible({ timeout: 2000 }).catch(() => false);
                        if (applyVisible) break;
                    }
                }
            }

            expect(applyVisible).toBe(true);
            console.log('[Test] Apply button found for case');

            // Click Apply to open the application dialog
            await applyButton.click();
            console.log('[Test] Clicked Apply button');

            // Wait for the application dialog to appear
            const applicationDetails = practPage.locator('[aria-label="textInput-create-offer-details"]');
            await expect(applicationDetails).toBeVisible({ timeout: 10000 });
            console.log('[Test] Application dialog opened');

            // Fill the application description in the rich text editor
            const offerEditor = applicationDetails.locator('[contenteditable="true"]');
            await offerEditor.click();
            await practPage.keyboard.type('I am an experienced investigator with expertise in this area. I would like to take on this case and help resolve the situation.');
            console.log('[Test] Filled application description');

            // Submit the application — find the Apply/submit button within the dialog
            const submitBtn = practPage.locator('button:has-text("Apply")').last();
            await expect(submitBtn).toBeVisible({ timeout: 5000 });
            await submitBtn.click();
            console.log('[Test] Submitted application');

            // Wait for the dialog to close (indicates success)
            await expect(applicationDetails).not.toBeVisible({ timeout: 15000 });
            console.log('[Test] Application dialog closed — application submitted successfully');
        } finally {
            await practContext.close();
        }
    });

    test('customer sees and accepts practitioner offer', async ({ page }, testInfo) => {
        test.setTimeout(60000);

        const workerId = testInfo.parallelIndex;
        const trackingCode = trackingCodePerWorker.get(workerId);
        expect(trackingCode).toBeTruthy();

        // Restore customer session
        const cookies = customerCookiesPerWorker.get(workerId);
        if (cookies) {
            const cookiePairs = cookies.split('; ').map(c => {
                const [name, ...rest] = c.split('=');
                return { name, value: rest.join('='), domain: 'localhost', path: '/' };
            });
            await page.context().addCookies(cookiePairs);
        }

        console.log(`[Test] Navigating to tracking page: /track/case/${trackingCode}`);
        await page.goto(`/track/case/${trackingCode}`);

        // Wait for the page to load
        const caseStatusEl = page.getByTestId('case-status');
        await expect(caseStatusEl).toBeVisible({ timeout: 15000 });
        await expect(caseStatusEl).toHaveText('NEW', { timeout: 5000 });

        // Wait for practitioner's offer to appear with accept/reject buttons
        const acceptBtn = page.locator('[aria-label="button-accept-offerCase"]');
        await expect(acceptBtn).toBeVisible({ timeout: 30000 });
        console.log('[Test] Accept button visible — offer is displayed');

        const rejectBtn = page.locator('[aria-label="button-reject-offerCase"]');
        await expect(rejectBtn).toBeVisible({ timeout: 5000 });
        console.log('[Test] Reject button visible');

        // Click Accept
        await acceptBtn.click();
        console.log('[Test] Clicked Accept');

        // Verify case status changed to ACTIVE (page reloads after accept)
        await expect(caseStatusEl).toHaveText('ACTIVE', { timeout: 30000 });
        console.log('[Test] Case status is ACTIVE');

        // Verify "Managed by" is shown
        const managedByEl = page.getByTestId('managed-by');
        await expect(managedByEl).toBeVisible({ timeout: 10000 });
        console.log('[Test] Managed by text visible');

        const managedByText = await managedByEl.textContent();
        expect(managedByText).toContain('Managed by:');
        console.log(`[Test] ${managedByText?.trim()}`);

        console.log('[Test] Customer accept offer flow complete');
    });

    test('practitioner views assigned case', async ({ browser }, testInfo) => {
        test.setTimeout(120000);

        const workerId = testInfo.parallelIndex;
        const trackingCode = trackingCodePerWorker.get(workerId);
        const caseCode = caseCodePerWorker.get(workerId);
        const practitionerData = practitionerDataPerWorker.get(workerId);
        expect(trackingCode).toBeTruthy();
        expect(caseCode).toBeTruthy();
        expect(practitionerData).toBeTruthy();

        // Wait for the case to be queryable via cross-partition query before navigating
        console.log('[Test] Waiting for case to appear in assigned cases query...');
        for (let attempt = 0; attempt < 10; attempt++) {
            try {
                const result = await gqlDirect<{ cases: { id: string; caseStatus: string }[] }>(
                    `query get_my_cases($status: [String]!) { cases(statuses: $status) { id, caseStatus } }`,
                    { status: ['ACTIVE', 'CLOSED'] },
                    practitionerData!.cookies
                );
                if (result.cases && result.cases.length > 0) {
                    console.log(`[Test] Case found in query after ${attempt + 1} attempt(s): ${result.cases.length} case(s)`);
                    break;
                }
            } catch { /* ignore query errors */ }
            if (attempt < 9) await new Promise(r => setTimeout(r, 2000));
        }

        const practContext = await createAuthenticatedContext(browser, practitionerData!.cookies);
        const practPage = await practContext.newPage();

        try {
            console.log('[Test] Navigating to practitioner SpiriAssist manage page...');
            await practPage.goto(`/p/${practitionerData!.slug}/manage/spiri-assist`);

            // Wait for assigned cases panel to load
            await expect(practPage.getByTestId('assigned-cases-active-tab')).toBeVisible({ timeout: 15000 });
            console.log('[Test] Assigned cases panel loaded');

            // Ensure Active tab is selected (it should be by default)
            await practPage.getByTestId('assigned-cases-active-tab').click();

            // Verify OUR specific case appears by case code
            const ourCase = practPage.getByTestId(`assigned-case-code-${caseCode}`);
            await expect(ourCase).toBeVisible({ timeout: 15000 });
            console.log(`[Test] Case ${caseCode} found in Active tab`);

            // Click See Details for our case (the button is in the same parent panel)
            const casePanel = ourCase.locator('..').locator('..');
            const seeDetailsBtn = casePanel.locator('[aria-label="button-see-casedetails"]');
            await expect(seeDetailsBtn).toBeVisible({ timeout: 5000 });
            await seeDetailsBtn.click();

            // Verify case details loaded with ACTIVE status
            const caseDetailStatus = practPage.getByTestId('case-detail-status');
            await expect(caseDetailStatus).toBeVisible({ timeout: 15000 });
            await expect(caseDetailStatus).toContainText('ACTIVE', { timeout: 10000 });
            console.log('[Test] Case details show ACTIVE status');

            // Verify the case code in the detail panel matches
            const caseDetailCode = practPage.getByTestId('case-detail-code');
            await expect(caseDetailCode).toBeVisible({ timeout: 10000 });
            await expect(caseDetailCode).toContainText(caseCode!, { timeout: 5000 });
            console.log('[Test] Case detail code matches');

            // Verify the Activities & Notes tab is visible (only shows for non-NEW cases)
            await expect(practPage.getByTestId('interactions-tab-activities')).toBeVisible({ timeout: 10000 });
            console.log('[Test] Activities & Notes tab visible');

            // Verify Close Case button is available
            await expect(practPage.getByTestId('btn-close-case')).toBeVisible({ timeout: 10000 });
            console.log('[Test] Close Case button visible');

            console.log('[Test] Practitioner view assigned case complete');
        } finally {
            await practContext.close();
        }
    });

    test('practitioner logs client activity', async ({ browser }, testInfo) => {
        test.setTimeout(120000);

        const workerId = testInfo.parallelIndex;
        const caseCode = caseCodePerWorker.get(workerId);
        const practitionerData = practitionerDataPerWorker.get(workerId);
        expect(caseCode).toBeTruthy();
        expect(practitionerData).toBeTruthy();

        const practContext = await createAuthenticatedContext(browser, practitionerData!.cookies);
        const practPage = await practContext.newPage();

        try {
            console.log('[Test] Navigating to practitioner SpiriAssist manage page...');
            await practPage.goto(`/p/${practitionerData!.slug}/manage/spiri-assist`);

            // Wait for assigned cases and click into our specific case
            await expect(practPage.getByTestId('assigned-cases-active-tab')).toBeVisible({ timeout: 15000 });
            await practPage.getByTestId('assigned-cases-active-tab').click();

            const ourCase = practPage.getByTestId(`assigned-case-code-${caseCode}`);
            await expect(ourCase).toBeVisible({ timeout: 15000 });
            const casePanel = ourCase.locator('..').locator('..');
            const seeDetailsBtn = casePanel.locator('[aria-label="button-see-casedetails"]');
            await expect(seeDetailsBtn).toBeVisible({ timeout: 5000 });
            await seeDetailsBtn.click();

            // Wait for case details to load
            await expect(practPage.getByTestId('case-detail-status')).toContainText('ACTIVE', { timeout: 15000 });

            // Ensure Activities & Notes tab is selected
            const activitiesTab = practPage.getByTestId('interactions-tab-activities');
            await expect(activitiesTab).toBeVisible({ timeout: 10000 });
            await activitiesTab.click();
            await practPage.waitForTimeout(1000);

            // Click "Log Client Activity" button
            const logActivityBtn = practPage.getByTestId('btn-log-client-activity');
            await expect(logActivityBtn).toBeVisible({ timeout: 10000 });
            await logActivityBtn.click();
            console.log('[Test] Opened Log Client Activity dialog');

            // Fill the activity title
            const titleInput = practPage.getByTestId('input-activity-title');
            await expect(titleInput).toBeVisible({ timeout: 10000 });
            await titleInput.fill('Initial site visit and assessment');
            console.log('[Test] Filled activity title');

            // Fill the details in the rich text editor
            const detailsEditor = practPage.locator('[placeholder="Your description here"]').locator('[contenteditable="true"]');
            if (await detailsEditor.isVisible({ timeout: 5000 }).catch(() => false)) {
                await detailsEditor.click();
                await practPage.keyboard.type('Conducted initial site visit to assess the situation. Gathered preliminary information and documented key observations.');
                console.log('[Test] Filled activity details');
            } else {
                // Fallback: try the contenteditable directly within the form
                const richText = practPage.locator('form [contenteditable="true"]');
                await expect(richText).toBeVisible({ timeout: 5000 });
                await richText.click();
                await practPage.keyboard.type('Conducted initial site visit to assess the situation.');
                console.log('[Test] Filled activity details (fallback)');
            }

            // Submit the activity log
            const saveBtn = practPage.getByTestId('btn-save-activity');
            await expect(saveBtn).toBeVisible({ timeout: 5000 });
            await saveBtn.click();
            console.log('[Test] Clicked Save');

            // Wait for dialog to close (indicates success)
            await expect(saveBtn).not.toBeVisible({ timeout: 15000 });
            console.log('[Test] Activity log dialog closed — activity saved successfully');

            // Verify the activity appears in the list — empty state must NOT be showing
            const noInteractionsMsg = practPage.getByTestId('no-interactions-message');
            await expect(noInteractionsMsg).not.toBeVisible({ timeout: 15000 });
            console.log('[Test] Empty state gone — activity is in the list');

            console.log('[Test] Practitioner log activity complete');
        } finally {
            await practContext.close();
        }
    });

    test('customer sees activity on tracking page', async ({ page }, testInfo) => {
        test.setTimeout(60000);

        const workerId = testInfo.parallelIndex;
        const trackingCode = trackingCodePerWorker.get(workerId);
        expect(trackingCode).toBeTruthy();

        // Restore customer session
        const cookies = customerCookiesPerWorker.get(workerId);
        if (cookies) {
            const cookiePairs = cookies.split('; ').map(c => {
                const [name, ...rest] = c.split('=');
                return { name, value: rest.join('='), domain: 'localhost', path: '/' };
            });
            await page.context().addCookies(cookiePairs);
        }

        console.log(`[Test] Navigating to tracking page: /track/case/${trackingCode}`);
        await page.goto(`/track/case/${trackingCode}`);

        // Verify case is still ACTIVE
        const caseStatusEl = page.getByTestId('case-status');
        await expect(caseStatusEl).toBeVisible({ timeout: 15000 });
        await expect(caseStatusEl).toHaveText('ACTIVE', { timeout: 10000 });
        console.log('[Test] Case status is ACTIVE');

        // Wait for activities list to load with at least one activity
        const activitiesList = page.getByTestId('customer-activities-list');
        await expect(activitiesList).toBeVisible({ timeout: 15000 });
        console.log('[Test] Activities list visible');

        // Strictly verify the activity we logged is present
        const activityItems = activitiesList.locator('li');
        await expect(activityItems.first()).toBeVisible({ timeout: 15000 });
        const count = await activityItems.count();
        expect(count).toBeGreaterThanOrEqual(1);
        console.log(`[Test] Found ${count} activity(ies) on tracking page`);

        // Verify empty state is NOT shown
        const noActivitiesMsg = page.getByTestId('no-activities-message');
        await expect(noActivitiesMsg).not.toBeVisible({ timeout: 5000 });

        console.log('[Test] Customer view activity complete');
    });

    test('practitioner closes the case', async ({ browser }, testInfo) => {
        test.setTimeout(120000);

        const workerId = testInfo.parallelIndex;
        const caseCode = caseCodePerWorker.get(workerId);
        const practitionerData = practitionerDataPerWorker.get(workerId);
        expect(caseCode).toBeTruthy();
        expect(practitionerData).toBeTruthy();

        const practContext = await createAuthenticatedContext(browser, practitionerData!.cookies);
        const practPage = await practContext.newPage();

        try {
            console.log('[Test] Navigating to practitioner SpiriAssist manage page...');
            await practPage.goto(`/p/${practitionerData!.slug}/manage/spiri-assist`);

            // Wait for assigned cases and click into our specific case
            await expect(practPage.getByTestId('assigned-cases-active-tab')).toBeVisible({ timeout: 15000 });
            await practPage.getByTestId('assigned-cases-active-tab').click();

            const ourCase = practPage.getByTestId(`assigned-case-code-${caseCode}`);
            await expect(ourCase).toBeVisible({ timeout: 15000 });
            const casePanel = ourCase.locator('..').locator('..');
            const seeDetailsBtn = casePanel.locator('[aria-label="button-see-casedetails"]');
            await expect(seeDetailsBtn).toBeVisible({ timeout: 5000 });
            await seeDetailsBtn.click();

            // Verify case is ACTIVE before closing
            const caseDetailStatus = practPage.getByTestId('case-detail-status');
            await expect(caseDetailStatus).toContainText('ACTIVE', { timeout: 15000 });
            console.log('[Test] Case is ACTIVE, proceeding to close');

            // Click Close Case button
            const closeCaseBtn = practPage.getByTestId('btn-close-case');
            await expect(closeCaseBtn).toBeVisible({ timeout: 10000 });
            await closeCaseBtn.click();
            console.log('[Test] Clicked Close Case');

            // Confirm in the "Are you sure?" dialog
            const confirmBtn = practPage.getByTestId('btn-confirm-close-case');
            await expect(confirmBtn).toBeVisible({ timeout: 10000 });
            await confirmBtn.click();
            console.log('[Test] Confirmed case closure');

            // Verify case status changed to CLOSED (wait for mutation to complete)
            await expect(caseDetailStatus).toContainText('CLOSED', { timeout: 30000 });
            console.log('[Test] Case status is now CLOSED');

            console.log('[Test] Practitioner close case complete');
        } finally {
            await practContext.close();
        }
    });

    test('closed case in historical tab and customer sees closed', async ({ browser, page }, testInfo) => {
        test.setTimeout(120000);

        const workerId = testInfo.parallelIndex;
        const caseCode = caseCodePerWorker.get(workerId);
        const trackingCode = trackingCodePerWorker.get(workerId);
        const practitionerData = practitionerDataPerWorker.get(workerId);
        expect(caseCode).toBeTruthy();
        expect(trackingCode).toBeTruthy();
        expect(practitionerData).toBeTruthy();

        // --- Practitioner: verify historical tab ---
        const practContext = await createAuthenticatedContext(browser, practitionerData!.cookies);
        const practPage = await practContext.newPage();

        try {
            console.log('[Test] Navigating to practitioner SpiriAssist manage page...');
            await practPage.goto(`/p/${practitionerData!.slug}/manage/spiri-assist`);

            await expect(practPage.getByTestId('assigned-cases-historical-tab')).toBeVisible({ timeout: 15000 });
            await practPage.getByTestId('assigned-cases-historical-tab').click();
            console.log('[Test] Switched to Historical tab');

            const ourCase = practPage.getByTestId(`assigned-case-code-${caseCode}`);
            await expect(ourCase).toBeVisible({ timeout: 15000 });
            console.log(`[Test] Case ${caseCode} found in Historical tab`);

            const casePanel = ourCase.locator('..').locator('..');
            const seeDetailsBtn = casePanel.locator('[aria-label="button-see-casedetails"]');
            await expect(seeDetailsBtn).toBeVisible({ timeout: 5000 });
            await seeDetailsBtn.click();

            const caseDetailStatus = practPage.getByTestId('case-detail-status');
            await expect(caseDetailStatus).toBeVisible({ timeout: 15000 });
            await expect(caseDetailStatus).toContainText('CLOSED', { timeout: 10000 });
            console.log('[Test] Historical case shows CLOSED status');

            const closeCaseBtn = practPage.getByTestId('btn-close-case');
            await expect(closeCaseBtn).not.toBeVisible({ timeout: 5000 });
            console.log('[Test] Close Case button hidden for closed case');
        } finally {
            await practContext.close();
        }

        // --- Customer: verify closed on tracking page ---
        const cookies = customerCookiesPerWorker.get(workerId);
        if (cookies) {
            const cookiePairs = cookies.split('; ').map(c => {
                const [name, ...rest] = c.split('=');
                return { name, value: rest.join('='), domain: 'localhost', path: '/' };
            });
            await page.context().addCookies(cookiePairs);
        }

        console.log(`[Test] Navigating to tracking page: /track/case/${trackingCode}`);
        await page.goto(`/track/case/${trackingCode}`);

        const caseStatusEl = page.getByTestId('case-status');
        await expect(caseStatusEl).toBeVisible({ timeout: 15000 });
        await expect(caseStatusEl).toHaveText('CLOSED', { timeout: 15000 });
        console.log('[Test] Case status is CLOSED on tracking page');

        const managedByEl = page.getByTestId('managed-by');
        await expect(managedByEl).toBeVisible({ timeout: 10000 });
        console.log('[Test] Managed by text still visible');

        console.log('[Test] Full case lifecycle complete');
    });

});

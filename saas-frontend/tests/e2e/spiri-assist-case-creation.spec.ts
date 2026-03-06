import { test, expect } from '@playwright/test';
import { AuthPage } from '../pages/AuthPage';
import {
    clearTestEntityRegistry,
    registerTestUser,
    registerTestCase,
    getCookiesFromPage,
    cleanupTestUsers,
    cleanupTestCases,
} from '../utils/test-cleanup';
import { fillStripePaymentElement } from '../utils/illuminate-setup';

// Per-worker state for parallel safety
const cookiesPerWorker = new Map<number, string>();
const userIdsPerWorker = new Map<number, string>();

test.beforeAll(async ({}, testInfo) => {
    clearTestEntityRegistry(testInfo.parallelIndex);
});

test.afterAll(async ({}, testInfo) => {
    test.setTimeout(60000);
    const workerId = testInfo.parallelIndex;
    const cookies = cookiesPerWorker.get(workerId);

    if (cookies) {
        try {
            await cleanupTestCases(cookies, workerId);
            await cleanupTestUsers(cookies, workerId);
        } catch (error) {
            console.error('[Cleanup] Error during cleanup:', error);
        } finally {
            cookiesPerWorker.delete(workerId);
            userIdsPerWorker.delete(workerId);
        }
    }
    clearTestEntityRegistry(workerId);
});

test.describe('SpiriAssist Case Creation', () => {
    test('should submit a new case and verify it on tracking page', async ({ page }, testInfo) => {
        test.setTimeout(300000); // 5 minutes for form fill + Stripe payment

        const timestamp = Date.now();
        const workerId = testInfo.parallelIndex;
        const testEmail = `case-test-${timestamp}-${workerId}@playwright.com`;
        const testName = `Case Test User ${timestamp}`;

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

        // Store cookies for cleanup
        const cookies = await getCookiesFromPage(page);
        if (cookies) cookiesPerWorker.set(workerId, cookies);
        console.log(`[Test] Cookies after auth: ${cookies ? 'present' : 'none'}`);

        // Register user for cleanup (get userId from session)
        const sessionResp = await page.evaluate(async () => {
            const resp = await fetch('/api/auth/session');
            const text = await resp.text();
            return text;
        });
        console.log(`[Test] Session response: ${sessionResp}`);
        let userId: string | undefined;
        try {
            const parsed = JSON.parse(sessionResp);
            userId = parsed?.user?.id;
        } catch {
            console.log('[Test] Could not parse session response');
        }
        if (userId && cookies) {
            userIdsPerWorker.set(workerId, userId);
            registerTestUser({ id: userId, email: testEmail, cookies }, workerId);
        }
        console.log(`[Test] User ID: ${userId}`);

        // === STEP 1b: Dismiss consent dialog if shown ===
        // ConsentGuard appears globally after auth when there are outstanding consents.
        // Handle it early to prevent it from blocking later interactions.
        console.log('[Test] Step 1b: Checking for consent review dialog...');
        await page.waitForTimeout(3000); // Give consent query time to load

        const consentModal = page.getByTestId('consent-guard-modal');
        if (await consentModal.isVisible({ timeout: 5000 }).catch(() => false)) {
            console.log('[Test] Consent dialog detected — accepting documents...');

            const progressText = await page.getByTestId('consent-progress-count').textContent();
            const totalDocs = parseInt(progressText?.match(/of (\d+)/)?.[1] || '2');
            console.log(`[Test] ${totalDocs} consent document(s) to review`);

            for (let docIdx = 0; docIdx < totalDocs; docIdx++) {
                await page.waitForTimeout(500);

                // Click the consent checkbox via evaluate to bypass overlay pointer interception
                await page.evaluate(() => {
                    const cb = document.querySelector('[data-testid^="consent-checkbox-"]') as HTMLElement;
                    cb?.click();
                });
                console.log(`[Test] Checked consent document ${docIdx + 1}/${totalDocs}`);

                if (docIdx < totalDocs - 1) {
                    const nextBtn = page.getByTestId('consent-next-btn');
                    await expect(nextBtn).toBeEnabled({ timeout: 5000 });
                    await page.evaluate(() => {
                        (document.querySelector('[data-testid="consent-next-btn"]') as HTMLElement)?.click();
                    });
                    console.log(`[Test] Clicked Next on consent document ${docIdx + 1}`);
                } else {
                    const acceptBtn = page.getByTestId('consent-accept-btn');
                    await expect(acceptBtn).toBeEnabled({ timeout: 5000 });
                    await page.evaluate(() => {
                        (document.querySelector('[data-testid="consent-accept-btn"]') as HTMLElement)?.click();
                    });
                    console.log('[Test] Clicked Accept & Continue');
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
        console.log('[Test] SpiriAssist landing page loaded');

        // === STEP 3: Open case creation dialog ===
        console.log('[Test] Step 3: Opening case creation dialog...');
        await page.getByTestId('submit-case-btn').first().click();

        // Wait for the dialog to appear with the form
        const dialogTitle = page.locator('text=Create a new help request');
        await expect(dialogTitle).toBeVisible({ timeout: 15000 });
        console.log('[Test] Case creation dialog opened');

        // === STEP 4: Page 0 — Contact & Category ===
        console.log('[Test] Step 4: Filling contact and category (page 0)...');

        // Wait for category/religion data to load (fields only render when data is ready)
        const emailInput = page.locator('[aria-label="input-case-contact-email"]');
        await expect(emailInput).toBeVisible({ timeout: 30000 });

        // Fill name
        const nameInput = page.locator('[aria-label="input-case-contact-name"]');
        await nameInput.fill(testName);
        console.log('[Test] Filled contact name');

        // Fill phone number (PhoneInput uses ariaLabel prop internally, so use placeholder)
        const phoneInput = page.locator('input[placeholder="Phone Number"]');
        await expect(phoneInput).toBeVisible({ timeout: 5000 });
        await phoneInput.click();
        await page.keyboard.type('0412345678');
        console.log('[Test] Filled phone number');

        // Wait for category and religion options to load
        await page.waitForTimeout(2000);

        // Select category from ComboBox
        const categoryTrigger = page.locator('[aria-label="combobox-case-category-trigger"]');
        await expect(categoryTrigger).toBeVisible({ timeout: 10000 });
        await categoryTrigger.click();
        await page.waitForTimeout(500);
        const categoryOption = page.locator('[aria-label="combobox-case-category-result"]').first();
        await expect(categoryOption).toBeVisible({ timeout: 5000 });
        await categoryOption.click();
        console.log('[Test] Selected category');

        // Select religion from hierarchical picker
        const religionPickerBtn = page.getByTestId('religion-picker');
        await expect(religionPickerBtn).toBeVisible({ timeout: 5000 });
        await religionPickerBtn.click();
        await page.waitForTimeout(1000);
        // Pick first available religion option from the tree
        const religionTree = page.getByTestId('religion-tree');
        await expect(religionTree).toBeVisible({ timeout: 10000 });
        const firstReligionOption = religionTree.locator('[role="treeitem"]').first();
        await expect(firstReligionOption).toBeVisible({ timeout: 5000 });
        await firstReligionOption.click();
        console.log('[Test] Selected religion from hierarchical picker');

        // Click Next
        await page.locator('[aria-label="button-next"]').click();
        console.log('[Test] Page 0 complete — clicked Next');

        // === STEP 5: Page 1 — Location & Description ===
        console.log('[Test] Step 5: Filling location and description (page 1)...');

        // Fill address (Google Places autocomplete)
        const addressInput = page.locator('[aria-label="input-case-location"]');
        await expect(addressInput).toBeVisible({ timeout: 10000 });
        await addressInput.click();
        await addressInput.pressSequentially('Sydney Opera House', { delay: 50 });
        console.log('[Test] Typed address, waiting for Google Places API...');
        await page.waitForTimeout(3000);

        // Select from autocomplete dropdown
        const autocompleteListbox = page.locator('[role="listbox"]');
        const listboxVisible = await autocompleteListbox.isVisible({ timeout: 5000 }).catch(() => false);
        if (listboxVisible) {
            const options = page.locator('[role="option"]');
            const optionCount = await options.count();
            if (optionCount > 0) {
                await options.first().click();
                await page.waitForTimeout(1000);
                console.log('[Test] Selected address from autocomplete');
            }
        } else {
            // Retry with simpler query
            await addressInput.clear();
            await page.waitForTimeout(500);
            await addressInput.pressSequentially('Melbourne', { delay: 50 });
            await page.waitForTimeout(3000);
            const retryOptions = page.locator('[role="option"]');
            if (await retryOptions.first().isVisible({ timeout: 5000 }).catch(() => false)) {
                await retryOptions.first().click();
                await page.waitForTimeout(1000);
                console.log('[Test] Selected address on retry');
            }
        }

        // Fill duration amount
        const durationInput = page.locator('[aria-label="input-startedFrom-amount"]');
        await durationInput.fill('3');
        console.log('[Test] Filled duration amount');

        // Select duration unit (default is Month, which is fine — skip if already set)
        const unitTrigger = page.locator('[aria-label="combobox-case-unit-trigger"]');
        const unitText = await unitTrigger.textContent();
        if (!unitText?.includes('Month')) {
            await unitTrigger.click();
            await page.waitForTimeout(500);
            const unitOption = page.locator('[aria-label="combobox-case-unit-result"]').first();
            await expect(unitOption).toBeVisible({ timeout: 5000 });
            await unitOption.click();
        }
        console.log('[Test] Duration unit set');

        // Fill description (Lexical rich text editor)
        const descriptionContainer = page.locator('[aria-label="textInput-case-description"]');
        await expect(descriptionContainer).toBeVisible({ timeout: 5000 });
        const richTextEditor = descriptionContainer.locator('[contenteditable="true"]');
        await richTextEditor.click();
        await page.keyboard.type('This is an automated test case for SpiriAssist. We are experiencing unexplained activity in the property and need professional investigation.');
        console.log('[Test] Filled description');

        // Click Next
        await page.locator('[aria-label="button-next"]').click();
        console.log('[Test] Page 1 complete — clicked Next');

        // === STEP 6: Page 2 — Affected People ===
        console.log('[Test] Step 6: Adding affected person (page 2)...');

        // Wait for page 2 content
        const personInput = page.locator('[aria-label="input-case-new-personAffected"]');
        await expect(personInput).toBeVisible({ timeout: 10000 });

        // Fill person name
        await personInput.fill('John Smith');
        console.log('[Test] Filled person name');

        // Click Confirm to add the person (first button with this aria-label is Confirm)
        const confirmPersonBtns = page.locator('[aria-label="button-case-new-personAffected"]');
        await confirmPersonBtns.first().click();
        await page.waitForTimeout(500);

        // Verify person appears in the list
        await expect(page.locator('text=John Smith')).toBeVisible({ timeout: 5000 });
        console.log('[Test] Person added and visible in list');

        // Click Next
        await page.locator('[aria-label="button-next"]').click();
        console.log('[Test] Page 2 complete — clicked Next');

        // === STEP 7: Page 3 — Affected Areas ===
        console.log('[Test] Step 7: Adding affected area (page 3)...');

        // Wait for page 3 content (area input shares aria-label with toggle buttons, use placeholder)
        const areaInput = page.locator('input[placeholder="Area"]');
        await expect(areaInput).toBeVisible({ timeout: 10000 });

        // Fill area name
        await areaInput.fill('Living Room');
        console.log('[Test] Filled area name');

        // Click Confirm to add the area
        const confirmAreaBtns = page.locator('[aria-label="button-case-new-areaAffected"]');
        await confirmAreaBtns.first().click();
        await page.waitForTimeout(500);

        // Verify area appears in the list (rendered as "The Living Room" in <li>)
        await expect(page.locator('li:has-text("Living Room")')).toBeVisible({ timeout: 5000 });
        console.log('[Test] Area added and visible in list');

        // Click Next
        await page.locator('[aria-label="button-next"]').click();
        console.log('[Test] Page 3 complete — clicked Next');

        // === STEP 8: Page 4 — Urgency & Payment Summary ===
        console.log('[Test] Step 8: Reviewing payment summary (page 4)...');

        // Wait for urgency options and payment summary to load
        await expect(page.locator('text=Listing Fee')).toBeVisible({ timeout: 15000 });
        console.log('[Test] Payment summary visible');

        // Select an urgency fee option if available
        const urgencyOption = page.locator('[data-testid^="urgency-option-"]').first();
        if (await urgencyOption.isVisible({ timeout: 5000 }).catch(() => false)) {
            await urgencyOption.click();
            console.log('[Test] Selected urgency fee option');
        } else {
            console.log('[Test] No urgency fee options available — skipping');
        }

        // Verify total shows
        await expect(page.locator('span:has-text("Total:")')).toBeVisible({ timeout: 5000 });

        // Click "Continue - payment"
        const createCaseBtn = page.locator('[aria-label="button-create-case"]');
        await expect(createCaseBtn).toBeVisible({ timeout: 5000 });
        await expect(createCaseBtn).toBeEnabled({ timeout: 5000 });
        await createCaseBtn.click();
        console.log('[Test] Clicked "Continue - payment", waiting for mutation...');

        // Wait for mutation to complete and page to transition to Stripe payment
        await page.waitForTimeout(8000);

        // === STEP 9: Page 5 — Stripe Checkout ===
        console.log('[Test] Step 9: Completing Stripe checkout (page 5)...');

        // Wait for the checkout UI to load
        await expect(page.locator('text=Billing Address')).toBeVisible({ timeout: 15000 });
        console.log('[Test] Checkout UI loaded');

        // Step 9a: Fill billing address
        console.log('[Test] Filling billing address...');
        await page.locator('input[placeholder="Full name"]').fill('Case Test User');
        await page.locator('input[placeholder="Street address"]').fill('123 Test Street');
        await page.locator('input[placeholder="Apartment, suite, etc."]').fill('Unit 1');
        await page.locator('label:has-text("City") + input, input[placeholder="City"]').first().fill('Sydney');

        const stateInput = page.locator('label:has-text("State")').locator('..').locator('input');
        if (await stateInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await stateInput.fill('NSW');
        }

        await page.locator('input[placeholder="Postal code"]').fill('2000');
        await page.locator('input[placeholder*="Country"]').fill('AU');
        console.log('[Test] Billing address filled');

        // Click Save Address
        const saveAddressBtn = page.locator('button:has-text("Save Address")');
        await expect(saveAddressBtn).toBeVisible({ timeout: 5000 });
        await saveAddressBtn.click();
        console.log('[Test] Saved billing address');
        await page.waitForTimeout(2000);

        // Step 9b: Expand Payment Method accordion
        const paymentMethodSection = page.locator('text=Payment Method');
        await expect(paymentMethodSection).toBeVisible({ timeout: 5000 });
        await paymentMethodSection.click();
        console.log('[Test] Expanded Payment Method section');
        await page.waitForTimeout(3000); // Wait for Stripe Elements to load

        // Step 9c: Fill Stripe PaymentElement
        await fillStripePaymentElement(page);
        console.log('[Test] Stripe PaymentElement filled');

        // Step 9d: Check checkout consent checkboxes
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
            console.log(`[Test] Checked ${count} checkout consent checkbox(es)`);
        } else {
            console.log('[Test] No checkout consent checkboxes found');
        }

        // Step 9e: Click "Finish & Pay"
        const finishPayBtn = page.getByTestId('finish-pay-btn');
        await expect(finishPayBtn).toBeEnabled({ timeout: 10000 });
        await finishPayBtn.click();
        console.log('[Test] Clicked Finish & Pay, waiting for Stripe confirmation...');

        // === STEP 10: Wait for Stripe redirect ===
        console.log('[Test] Step 10: Waiting for Stripe redirect...');

        // Stripe redirects back with ?redirect_status=succeeded&setup_intent=...
        await page.waitForURL(/redirect_status=succeeded/, { timeout: 60000 });
        console.log('[Test] Stripe redirect received');

        // Two concurrent flows process the redirect:
        // 1. ResolveStripeSuccess shows "Processing Payment" dialog and polls checkSetupIntentPayment
        // 2. CreateHelpRequestButton queries setUpIntentTarget, then replaces URL to
        //    ?create_case_status=suceeded&case_tracking_code=... which dismisses ResolveStripeSuccess

        // === STEP 11: Wait for case creation URL redirect ===
        console.log('[Test] Step 11: Waiting for CreateHelpRequestButton to process redirect...');
        await page.waitForURL(/create_case_status=suceeded/, { timeout: 60000 });
        console.log('[Test] Case creation redirect received');

        // Extract tracking code from URL
        const successUrl = new URL(page.url());
        const trackingCode = successUrl.searchParams.get('case_tracking_code');
        expect(trackingCode).toBeTruthy();
        console.log(`[Test] Tracking code: ${trackingCode}`);

        // Register case for cleanup
        registerTestCase(trackingCode!, workerId);

        // === STEP 12: Wait for success dialog ===
        console.log('[Test] Step 12: Waiting for case success dialog...');

        // CaseCreateDialog shows spinner while caseStatus=CREATED, then
        // "Case request submitted" once webhook fires and status becomes NEW.
        // Webhook chain: setup_intent.succeeded → payment_intent.succeeded → case status CREATED→NEW
        await expect(page.locator('text=Case request submitted')).toBeVisible({ timeout: 120000 });
        console.log('[Test] Success dialog visible — webhook confirmed, case status is NEW');

        // Close the success dialog
        await page.locator('[aria-label="button-close-createOffer-dialog"]').click();
        await page.waitForTimeout(1000);
        console.log('[Test] Success dialog closed');

        // === STEP 13: Verify case on tracking page ===
        console.log('[Test] Step 13: Verifying case on tracking page...');
        await page.goto(`/track/case/${trackingCode}`);

        // Wait for case details to load — Contact accordion section is always visible
        await expect(page.locator('text=Contact')).toBeVisible({ timeout: 15000 });
        console.log('[Test] Tracking page loaded');

        // Verify case status is NEW (webhook must have completed)
        await expect(page.locator('text=NEW')).toBeVisible({ timeout: 10000 });
        console.log('[Test] Case status is NEW');

        // Verify key case data is present
        await expect(page.locator('text=Affected Areas')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('text=Affected People')).toBeVisible({ timeout: 5000 });
        console.log('[Test] Case details verified on tracking page');

        console.log('[Test] SpiriAssist case creation test PASSED — full flow verified!');
    });
});

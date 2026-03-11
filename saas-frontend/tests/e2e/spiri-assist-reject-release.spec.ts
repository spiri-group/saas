import { test, expect, Browser, BrowserContext } from '@playwright/test';
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

// ─── Per-worker state ────────────────────────────────────────────────────────
const customerCookiesPerWorker = new Map<number, string>();
const customerContextPerWorker = new Map<number, BrowserContext>();
const trackingCodePerWorker = new Map<number, string>();
const caseCodePerWorker = new Map<number, string>();
const practitionerDataPerWorker = new Map<number, { slug: string; cookies: string; vendorId: string }>();

// ─── Shared helpers ──────────────────────────────────────────────────────────

/** Authenticate a new customer and store cookies/context for later tests */
async function authenticateCustomer(page: import('@playwright/test').Page, testInfo: import('@playwright/test').TestInfo, prefix: string) {
    const timestamp = Date.now();
    const workerId = testInfo.parallelIndex;
    const testEmail = `${prefix}-${timestamp}-${workerId}@playwright.com`;
    const testName = `${prefix} User ${timestamp}`;

    await page.goto('/');

    // Dismiss cookie banner
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

    let authCompleted = false;
    for (let attempt = 0; attempt < 20; attempt++) {
        await page.waitForTimeout(1500);
        const sessionText = await page.evaluate(async () => {
            try { const resp = await fetch('/api/auth/session'); return await resp.text(); } catch { return 'error'; }
        });
        if (sessionText && sessionText !== 'null' && sessionText !== '{}' && sessionText !== 'error') {
            authCompleted = true;
            console.log(`[Test] Auth completed on attempt ${attempt + 1}`);
            break;
        }
    }
    if (!authCompleted) throw new Error('Authentication did not complete within 30 seconds');
    console.log('[Test] Authenticated successfully');

    const cookies = await getCookiesFromPage(page);
    if (cookies) customerCookiesPerWorker.set(workerId, cookies);

    const sessionResp = await page.evaluate(async () => { const resp = await fetch('/api/auth/session'); return await resp.text(); });
    let userId: string | undefined;
    try { const parsed = JSON.parse(sessionResp); userId = parsed?.user?.id; } catch { /* ignore */ }
    if (userId && cookies) registerTestUser({ id: userId, email: testEmail, cookies }, workerId);

    customerContextPerWorker.set(workerId, page.context());

    // Dismiss consent dialog
    await page.waitForTimeout(3000);
    const consentModal = page.getByTestId('consent-guard-modal');
    if (await consentModal.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('[Test] Consent dialog detected — accepting documents...');
        const progressText = await page.getByTestId('consent-progress-count').textContent();
        const totalDocs = parseInt(progressText?.match(/of (\d+)/)?.[1] || '2');
        for (let docIdx = 0; docIdx < totalDocs; docIdx++) {
            await page.waitForTimeout(500);
            await page.evaluate(() => { (document.querySelector('[data-testid^="consent-checkbox-"]') as HTMLElement)?.click(); });
            if (docIdx < totalDocs - 1) {
                const nextBtn = page.getByTestId('consent-next-btn');
                await expect(nextBtn).toBeEnabled({ timeout: 5000 });
                await page.evaluate(() => { (document.querySelector('[data-testid="consent-next-btn"]') as HTMLElement)?.click(); });
            } else {
                const acceptBtn = page.getByTestId('consent-accept-btn');
                await expect(acceptBtn).toBeEnabled({ timeout: 5000 });
                await page.evaluate(() => { (document.querySelector('[data-testid="consent-accept-btn"]') as HTMLElement)?.click(); });
            }
        }
        await expect(consentModal).not.toBeVisible({ timeout: 10000 });
        console.log('[Test] Consent dialog dismissed');
    }

    return { testEmail, testName };
}

/** Create a case and store tracking code. Returns after case is confirmed NEW. */
async function createCase(page: import('@playwright/test').Page, testInfo: import('@playwright/test').TestInfo, testName: string) {
    const workerId = testInfo.parallelIndex;

    await page.goto('/spiriassist');
    await expect(page.getByTestId('submit-case-btn').first()).toBeVisible({ timeout: 15000 });
    await page.getByTestId('submit-case-btn').first().click();
    await expect(page.locator('text=Create a new help request')).toBeVisible({ timeout: 15000 });

    // Page 0 — Contact & Category
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
    await page.locator('[aria-label="combobox-case-category-result"]').first().click();

    const religionPickerBtn = page.getByTestId('religion-picker');
    await expect(religionPickerBtn).toBeVisible({ timeout: 5000 });
    await religionPickerBtn.click();
    await page.waitForTimeout(1000);
    const religionTree = page.getByTestId('religion-tree');
    await expect(religionTree).toBeVisible({ timeout: 10000 });
    await religionTree.locator('[role="treeitem"]').first().click();

    await page.locator('[aria-label="button-next"]').click();

    // Page 1 — Location & Description
    const addressInput = page.locator('[aria-label="input-case-location"]');
    await expect(addressInput).toBeVisible({ timeout: 10000 });
    await addressInput.click();
    await addressInput.pressSequentially('Sydney Opera House', { delay: 50 });
    await page.waitForTimeout(3000);

    const autocompleteListbox = page.locator('[role="listbox"]');
    const listboxVisible = await autocompleteListbox.isVisible({ timeout: 5000 }).catch(() => false);
    if (listboxVisible) {
        const options = page.locator('[role="option"]');
        if (await options.count() > 0) { await options.first().click(); await page.waitForTimeout(1000); }
    } else {
        await addressInput.clear();
        await page.waitForTimeout(500);
        await addressInput.pressSequentially('Melbourne', { delay: 50 });
        await page.waitForTimeout(3000);
        const retryOptions = page.locator('[role="option"]');
        if (await retryOptions.first().isVisible({ timeout: 5000 }).catch(() => false)) {
            await retryOptions.first().click(); await page.waitForTimeout(1000);
        }
    }

    await page.locator('[aria-label="input-startedFrom-amount"]').fill('3');
    const unitTrigger = page.locator('[aria-label="combobox-case-unit-trigger"]');
    const unitText = await unitTrigger.textContent();
    if (!unitText?.includes('Month')) {
        await unitTrigger.click(); await page.waitForTimeout(500);
        await page.locator('[aria-label="combobox-case-unit-result"]').first().click();
    }

    const descriptionContainer = page.locator('[aria-label="textInput-case-description"]');
    await expect(descriptionContainer).toBeVisible({ timeout: 5000 });
    const richTextEditor = descriptionContainer.locator('[contenteditable="true"]');
    await richTextEditor.click();
    await page.keyboard.type('Automated test case for reject/release flow testing.');
    await page.locator('[aria-label="button-next"]').click();

    // Page 2 — Affected People
    const personInput = page.locator('[aria-label="input-case-new-personAffected"]');
    await expect(personInput).toBeVisible({ timeout: 10000 });
    await personInput.fill('Jane Smith');
    await page.locator('[aria-label="button-case-new-personAffected"]').first().click();
    await page.waitForTimeout(500);
    await page.locator('[aria-label="button-next"]').click();

    // Page 3 — Affected Areas
    const areaInput = page.locator('input[placeholder="Area"]');
    await expect(areaInput).toBeVisible({ timeout: 10000 });
    await areaInput.fill('Bedroom');
    await page.locator('[aria-label="button-case-new-areaAffected"]').first().click();
    await page.waitForTimeout(500);
    await page.locator('[aria-label="button-next"]').click();

    // Page 4 — Urgency & Payment Summary
    await expect(page.locator('text=Listing Fee')).toBeVisible({ timeout: 15000 });
    const urgencyOption = page.locator('[data-testid^="urgency-option-"]').first();
    if (await urgencyOption.isVisible({ timeout: 5000 }).catch(() => false)) { await urgencyOption.click(); }

    const createCaseBtn = page.locator('[aria-label="button-create-case"]');
    await expect(createCaseBtn).toBeEnabled({ timeout: 5000 });
    await createCaseBtn.click();
    await page.waitForTimeout(8000);

    // Stripe Checkout
    await expect(page.locator('text=Billing Address')).toBeVisible({ timeout: 15000 });
    await page.locator('input[placeholder="Full name"]').fill('Reject Test User');
    await page.locator('input[placeholder="Street address"]').fill('456 Test Ave');
    await page.locator('input[placeholder="Apartment, suite, etc."]').fill('Unit 2');
    await page.locator('label:has-text("City") + input, input[placeholder="City"]').first().fill('Sydney');
    const stateInput = page.locator('label:has-text("State")').locator('..').locator('input');
    if (await stateInput.isVisible({ timeout: 2000 }).catch(() => false)) { await stateInput.fill('NSW'); }
    await page.locator('input[placeholder="Postal code"]').fill('2000');
    await page.locator('input[placeholder*="Country"]').fill('AU');
    const saveAddressBtn = page.locator('button:has-text("Save Address")');
    await expect(saveAddressBtn).toBeVisible({ timeout: 5000 });
    await saveAddressBtn.click();
    await page.waitForTimeout(2000);
    await page.locator('text=Payment Method').click();
    await page.waitForTimeout(3000);
    await fillStripePaymentElement(page);

    const consentSection = page.getByTestId('checkout-consent-section');
    if (await consentSection.isVisible({ timeout: 5000 }).catch(() => false)) {
        const checkboxes = consentSection.locator('[role="checkbox"]');
        const count = await checkboxes.count();
        for (let i = 0; i < count; i++) {
            const cb = checkboxes.nth(i);
            const state = await cb.getAttribute('data-state');
            if (state !== 'checked') { await cb.click({ force: true }); await page.waitForTimeout(300); }
        }
    }

    const finishPayBtn = page.getByTestId('finish-pay-btn');
    await expect(finishPayBtn).toBeEnabled({ timeout: 10000 });
    await finishPayBtn.click();

    await page.waitForURL(/redirect_status=succeeded/, { timeout: 60000 });
    await page.waitForURL(/create_case_status=suceeded/, { timeout: 60000 });

    const successUrl = new URL(page.url());
    const trackingCode = successUrl.searchParams.get('case_tracking_code');
    expect(trackingCode).toBeTruthy();
    trackingCodePerWorker.set(workerId, trackingCode!);
    registerTestCase(trackingCode!, workerId);

    await expect(page.locator('text=Case request submitted')).toBeVisible({ timeout: 120000 });
    await page.locator('[aria-label="button-close-createOffer-dialog"]').click();
    await page.waitForTimeout(1000);

    console.log(`[Test] Case created with tracking code: ${trackingCode}`);
    return trackingCode!;
}

/** Practitioner applies for a case by tracking code */
async function practitionerApplies(browser: Browser, testInfo: import('@playwright/test').TestInfo) {
    const workerId = testInfo.parallelIndex;
    const trackingCode = trackingCodePerWorker.get(workerId)!;
    const practitionerData = practitionerDataPerWorker.get(workerId)!;

    const practContext = await createAuthenticatedContext(browser, practitionerData.cookies);
    const practPage = await practContext.newPage();

    try {
        await practPage.goto(`/p/${practitionerData.slug}/manage/spiri-assist`);
        await expect(practPage.locator('text=Available Help Requests')).toBeVisible({ timeout: 15000 });
        await practPage.waitForTimeout(5000);

        const applyButton = practPage.locator(`[aria-label="button-apply-to-case-${trackingCode}"]`);
        let applyVisible = await applyButton.isVisible({ timeout: 3000 }).catch(() => false);

        if (!applyVisible) {
            const collapsibleTriggers = practPage.locator('.flex.flex-row.items-center.justify-between.space-x-2');
            const triggerCount = await collapsibleTriggers.count();
            for (let i = 0; i < triggerCount; i++) {
                const trigger = collapsibleTriggers.nth(i);
                const badge = trigger.locator('.rounded-full');
                const badgeText = await badge.textContent().catch(() => '0');
                if (badgeText && parseInt(badgeText.trim()) > 0) {
                    await trigger.click();
                    await practPage.waitForTimeout(1000);
                    applyVisible = await applyButton.isVisible({ timeout: 2000 }).catch(() => false);
                    if (applyVisible) break;
                }
            }
        }
        expect(applyVisible).toBe(true);

        await applyButton.click();
        const applicationDetails = practPage.locator('[aria-label="textInput-create-offer-details"]');
        await expect(applicationDetails).toBeVisible({ timeout: 10000 });
        const offerEditor = applicationDetails.locator('[contenteditable="true"]');
        await offerEditor.click();
        await practPage.keyboard.type('I would like to investigate this case.');

        const submitBtn = practPage.locator('button:has-text("Apply")').last();
        await expect(submitBtn).toBeVisible({ timeout: 5000 });
        await submitBtn.click();
        await expect(applicationDetails).not.toBeVisible({ timeout: 15000 });
        console.log('[Test] Practitioner application submitted');
    } finally {
        await practContext.close();
    }
}

/** Restore customer cookies on a page */
function restoreCustomerCookies(page: import('@playwright/test').Page, workerId: number) {
    const cookies = customerCookiesPerWorker.get(workerId);
    if (cookies) {
        const cookiePairs = cookies.split('; ').map(c => {
            const [name, ...rest] = c.split('=');
            return { name, value: rest.join('='), domain: 'localhost', path: '/' };
        });
        return page.context().addCookies(cookiePairs);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: Reject Offer Flow
// ═══════════════════════════════════════════════════════════════════════════════

test.describe.serial('SpiriAssist Reject Offer', () => {

    test.beforeAll(async ({}, testInfo) => {
        clearTestEntityRegistry(testInfo.parallelIndex);
    });

    test.afterAll(async ({}, testInfo) => {
        test.setTimeout(60000);
        const workerId = testInfo.parallelIndex;
        const cookies = customerCookiesPerWorker.get(workerId);

        // Close browser context first to stop background React Query refetches
        const ctx = customerContextPerWorker.get(workerId);
        if (ctx) { try { await ctx.close(); } catch { /* ignore */ } customerContextPerWorker.delete(workerId); }

        if (cookies) {
            try { await cleanupTestCases(cookies, workerId); } catch (error) { console.error('[Cleanup] Case cleanup error:', error); }
        }
        try { await cleanupIlluminatePractitioner(testInfo); } catch (error) { console.error('[Cleanup] Practitioner cleanup error:', error); }
        if (cookies) {
            try { await cleanupTestUsers(cookies, workerId); } catch (error) { console.error('[Cleanup] User cleanup error:', error); }
            finally { customerCookiesPerWorker.delete(workerId); }
        }

        trackingCodePerWorker.delete(workerId);
        caseCodePerWorker.delete(workerId);
        practitionerDataPerWorker.delete(workerId);
        clearTestEntityRegistry(workerId);
    });

    test('customer creates a case', async ({ page }, testInfo) => {
        test.setTimeout(300000);
        console.log('[Test] Authenticating customer...');
        const { testName } = await authenticateCustomer(page, testInfo, 'reject-flow');
        console.log('[Test] Creating case...');
        await createCase(page, testInfo, testName);
    });

    test('practitioner applies for case', async ({ browser }, testInfo) => {
        test.setTimeout(300000);
        const workerId = testInfo.parallelIndex;

        console.log('[Test] Setting up Illuminate practitioner...');
        const practitionerData = await setupIlluminatePractitioner(browser, testInfo, 'reject-prac');
        practitionerDataPerWorker.set(workerId, practitionerData);
        console.log(`[Test] Practitioner ready: ${practitionerData.slug}`);

        await practitionerApplies(browser, testInfo);
    });

    test('customer rejects offer and case stays NEW', async ({ page }, testInfo) => {
        test.setTimeout(60000);
        const workerId = testInfo.parallelIndex;
        const trackingCode = trackingCodePerWorker.get(workerId);
        const cookies = customerCookiesPerWorker.get(workerId);
        expect(trackingCode).toBeTruthy();
        expect(cookies).toBeTruthy();

        await restoreCustomerCookies(page, workerId);

        console.log(`[Test] Navigating to tracking page: /track/case/${trackingCode}`);
        await page.goto(`/track/case/${trackingCode}`);

        // Verify offer is visible
        const rejectBtn = page.locator('[aria-label="button-reject-offerCase"]');
        await expect(rejectBtn).toBeVisible({ timeout: 30000 });
        console.log('[Test] Reject button visible — offer is displayed');

        const acceptBtn = page.locator('[aria-label="button-accept-offerCase"]');
        await expect(acceptBtn).toBeVisible({ timeout: 5000 });
        console.log('[Test] Accept button visible');

        // Click Reject
        await rejectBtn.click();
        console.log('[Test] Clicked Reject');

        // After reject: useFormStatus shows "Success" for 2s, then reloads the page
        await page.waitForTimeout(5000);

        // Verify case status is still NEW after rejection
        const caseStatusEl = page.getByTestId('case-status');
        await expect(caseStatusEl).toBeVisible({ timeout: 15000 });
        await expect(caseStatusEl).toHaveText('NEW', { timeout: 10000 });
        console.log('[Test] Case status is still NEW after rejection');

        // Verify the offer is gone — "awaiting applications" message should be back
        const awaitingMsg = page.getByTestId('awaiting-applications');
        await expect(awaitingMsg).toBeVisible({ timeout: 15000 });
        console.log('[Test] Awaiting applications message visible — offer rejected successfully');

        // Also confirm via API
        const result = await gqlDirect<{ case: { id: string; caseStatus: string } }>(
            `query get_case($trackingCode: ID) { case(trackingCode: $trackingCode) { id, caseStatus } }`,
            { trackingCode },
            cookies!
        );
        expect(result.case).toBeTruthy();
        expect(result.case.caseStatus).toBe('NEW');
        console.log(`[Test] Case ${result.case.id} confirmed NEW via API`);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: Release Case Flow
// Customer accepts offer → case ACTIVE → customer requests new investigator →
// case goes back to NEW
// ═══════════════════════════════════════════════════════════════════════════════

test.describe.serial('SpiriAssist Release Case', () => {

    test.beforeAll(async ({}, testInfo) => {
        clearTestEntityRegistry(testInfo.parallelIndex);
    });

    test.afterAll(async ({}, testInfo) => {
        test.setTimeout(60000);
        const workerId = testInfo.parallelIndex;
        const cookies = customerCookiesPerWorker.get(workerId);

        // Close browser context first to stop background React Query refetches
        const ctx = customerContextPerWorker.get(workerId);
        if (ctx) { try { await ctx.close(); } catch { /* ignore */ } customerContextPerWorker.delete(workerId); }

        if (cookies) {
            try { await cleanupTestCases(cookies, workerId); } catch (error) { console.error('[Cleanup] Case cleanup error:', error); }
        }
        try { await cleanupIlluminatePractitioner(testInfo); } catch (error) { console.error('[Cleanup] Practitioner cleanup error:', error); }
        if (cookies) {
            try { await cleanupTestUsers(cookies, workerId); } catch (error) { console.error('[Cleanup] User cleanup error:', error); }
            finally { customerCookiesPerWorker.delete(workerId); }
        }

        trackingCodePerWorker.delete(workerId);
        caseCodePerWorker.delete(workerId);
        practitionerDataPerWorker.delete(workerId);
        clearTestEntityRegistry(workerId);
    });

    test('customer creates a case', async ({ page }, testInfo) => {
        test.setTimeout(300000);
        console.log('[Test] Authenticating customer...');
        const { testName } = await authenticateCustomer(page, testInfo, 'release-flow');
        console.log('[Test] Creating case...');
        await createCase(page, testInfo, testName);
    });

    test('practitioner applies for case', async ({ browser }, testInfo) => {
        test.setTimeout(300000);
        const workerId = testInfo.parallelIndex;

        console.log('[Test] Setting up Illuminate practitioner...');
        const practitionerData = await setupIlluminatePractitioner(browser, testInfo, 'release-prac');
        practitionerDataPerWorker.set(workerId, practitionerData);
        console.log(`[Test] Practitioner ready: ${practitionerData.slug}`);

        await practitionerApplies(browser, testInfo);
    });

    test('customer accepts offer', async ({ page }, testInfo) => {
        test.setTimeout(60000);
        const workerId = testInfo.parallelIndex;
        const trackingCode = trackingCodePerWorker.get(workerId);
        expect(trackingCode).toBeTruthy();

        await restoreCustomerCookies(page, workerId);
        await page.goto(`/track/case/${trackingCode}`);

        const acceptBtn = page.locator('[aria-label="button-accept-offerCase"]');
        await expect(acceptBtn).toBeVisible({ timeout: 30000 });
        await acceptBtn.click();
        console.log('[Test] Clicked Accept');

        const caseStatusEl = page.getByTestId('case-status');
        await expect(caseStatusEl).toHaveText('ACTIVE', { timeout: 30000 });
        console.log('[Test] Case status is ACTIVE');

        const managedByEl = page.getByTestId('managed-by');
        await expect(managedByEl).toBeVisible({ timeout: 10000 });
        console.log('[Test] Managed by text visible');
    });

    test('customer requests new investigator', async ({ page }, testInfo) => {
        test.setTimeout(60000);
        const workerId = testInfo.parallelIndex;
        const trackingCode = trackingCodePerWorker.get(workerId);
        expect(trackingCode).toBeTruthy();

        await restoreCustomerCookies(page, workerId);
        await page.goto(`/track/case/${trackingCode}`);

        // Verify case is ACTIVE
        const caseStatusEl = page.getByTestId('case-status');
        await expect(caseStatusEl).toHaveText('ACTIVE', { timeout: 15000 });

        // Click "Request new investigator"
        const requestBtn = page.locator('[aria-label="button-request-new-investigator"]');
        await expect(requestBtn).toBeVisible({ timeout: 15000 });
        await requestBtn.click();
        console.log('[Test] Clicked Request new investigator');

        // A dialog should open showing the release offer
        // The release offer has no payment required (clientRequested=true, no price)
        // Customer should see "Confirm" button to accept the release
        const confirmBtn = page.locator('[aria-label="button-accept-offerCase"]');
        await expect(confirmBtn).toBeVisible({ timeout: 15000 });
        console.log('[Test] Release offer dialog visible with Confirm button');

        await confirmBtn.click();
        console.log('[Test] Clicked Confirm on release offer');

        // After confirming release, page reloads and case should go back to NEW
        await page.waitForTimeout(5000);

        await expect(caseStatusEl).toBeVisible({ timeout: 15000 });
        await expect(caseStatusEl).toHaveText('NEW', { timeout: 30000 });
        console.log('[Test] Case status is back to NEW — release successful');

        // Verify "managed by" is no longer shown
        const managedByEl = page.getByTestId('managed-by');
        await expect(managedByEl).not.toBeVisible({ timeout: 5000 });
        console.log('[Test] Managed by text no longer visible');

        // Verify "awaiting applications" message is back
        const awaitingMsg = page.getByTestId('awaiting-applications');
        await expect(awaitingMsg).toBeVisible({ timeout: 15000 });
        console.log('[Test] Awaiting applications message visible — case released successfully');
    });
});

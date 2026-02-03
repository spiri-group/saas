import { test, expect } from '@playwright/test';
import { AuthPage } from '../pages/AuthPage';
import { HomePage } from '../pages/HomePage';
import { UserSetupPage } from '../pages/UserSetupPage';
import { PractitionerSetupPage } from '../pages/PractitionerSetupPage';
import {
    clearTestEntityRegistry,
    registerTestUser,
    registerTestPractitioner,
    registerTestMerchant,
    getCookiesFromPage,
    cleanupTestUsers,
    cleanupTestPractitioners,
    cleanupTestMerchants,
    getVendorIdFromSlug,
} from '../utils/test-cleanup';

// Store cookies per test worker
const cookiesPerWorker = new Map<number, string>();

/**
 * Practitioner Shopfronts Tests
 *
 * Tests the ability for practitioners to link their merchant shops
 * to their practitioner profile.
 *
 * Flow:
 * 1. Create user + practitioner
 * 2. Create merchant (same user)
 * 3. Link merchant to practitioner via management page
 * 4. Verify shop appears on public profile
 * 5. Unlink and verify removal
 */

test.beforeAll(async ({}, testInfo) => {
    console.log('[Setup] Preparing practitioner shopfronts test environment...');
    clearTestEntityRegistry(testInfo.parallelIndex);
});

test.afterAll(async ({}, testInfo) => {
    test.setTimeout(180000);
    const workerId = testInfo.parallelIndex;
    const cookies = cookiesPerWorker.get(workerId);

    if (cookies) {
        try {
            await cleanupTestMerchants(cookies, workerId);
            await cleanupTestPractitioners(cookies, workerId);
            await cleanupTestUsers(cookies, workerId);
        } catch (error) {
            console.error('[Cleanup] Error during cleanup:', error);
        } finally {
            cookiesPerWorker.delete(workerId);
        }
    }
    clearTestEntityRegistry(workerId);
});

test.describe('Practitioner Shopfronts', () => {
    let authPage: AuthPage;
    let homePage: HomePage;
    let userSetupPage: UserSetupPage;
    let practitionerSetupPage: PractitionerSetupPage;

    test.beforeEach(async ({ page }) => {
        authPage = new AuthPage(page);
        homePage = new HomePage(page);
        userSetupPage = new UserSetupPage(page);
        practitionerSetupPage = new PractitionerSetupPage(page);
        await page.goto('/');
    });

    test('should link and unlink merchant shopfront to practitioner profile', async ({ page }, testInfo) => {
        test.setTimeout(420000); // 7 minutes for full flow

        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const workerId = testInfo.parallelIndex;
        const testEmail = `shopfront-test-${timestamp}-${workerId}@playwright.com`;
        const practitionerSlug = `test-prac-shop-${timestamp}-${randomSuffix}`;
        const merchantSlug = `test-merch-shop-${timestamp}-${randomSuffix}`;

        // === STEP 1: AUTHENTICATION ===
        console.log('[Test] Step 1: Authenticating...');
        await authPage.startAuthFlow(testEmail);
        await expect(page.locator('[aria-label="input-login-otp"]')).toBeVisible({ timeout: 15000 });
        await page.locator('[aria-label="input-login-otp"]').click();
        await page.keyboard.type('123456');
        await page.waitForURL('/', { timeout: 15000 });

        // === STEP 2: USER SETUP ===
        console.log('[Test] Step 2: Setting up user profile...');
        await homePage.waitForCompleteProfileLink();
        await homePage.clickCompleteProfile();
        await expect(page).toHaveURL(/\/u\/.*\/setup/, { timeout: 10000 });

        const url = page.url();
        const userIdMatch = url.match(/\/u\/([^\/]+)\/setup/);
        if (userIdMatch) {
            registerTestUser({ id: userIdMatch[1], email: testEmail }, workerId);
            const cookies = await getCookiesFromPage(page);
            if (cookies) cookiesPerWorker.set(workerId, cookies);
        }

        await userSetupPage.fillUserProfile({
            firstName: 'Shopfront',
            lastName: 'Test',
            phone: '0412345678',
            address: 'Sydney Opera House',
            religion: true,
            securityQuestion: 'What is your favorite color?',
            securityAnswer: 'Blue',
        });

        // === STEP 3: CREATE PRACTITIONER ===
        console.log('[Test] Step 3: Creating practitioner...');
        const practitionerBtn = page.locator('[data-testid="continue-as-practitioner-btn"]');
        await expect(practitionerBtn).toBeVisible({ timeout: 10000 });
        await expect(practitionerBtn).toBeEnabled({ timeout: 10000 });
        await practitionerBtn.click();
        await expect(page).toHaveURL(/\/p\/setup\?practitionerId=/, { timeout: 15000 });

        await practitionerSetupPage.waitForStep1();
        await practitionerSetupPage.fillBasicInfo({
            name: `Shopfront Test Practitioner ${timestamp}`,
            slug: practitionerSlug,
            email: testEmail,
            countryName: 'Australia',
        });
        await practitionerSetupPage.clickContinue();

        await practitionerSetupPage.waitForStep2();
        await practitionerSetupPage.fillProfile({
            headline: 'Tarot Reader & Crystal Healer',
            bio: 'I specialize in tarot readings and crystal healing.',
            modalities: ['TAROT', 'ORACLE'],
            specializations: ['RELATIONSHIPS', 'SPIRITUAL_AWAKENING'],
        });
        await practitionerSetupPage.clickContinue();

        await practitionerSetupPage.waitForStep3();
        await practitionerSetupPage.fillDetails({
            pronouns: 'she/her',
            yearsExperience: 5,
        });

        await practitionerSetupPage.submitForm();
        await page.waitForURL(new RegExp(`/p/${practitionerSlug}`), { timeout: 30000 });

        // Register practitioner for cleanup with fresh cookies and actual vendor ID
        const practitionerCookies = await getCookiesFromPage(page);
        if (practitionerCookies) {
            cookiesPerWorker.set(workerId, practitionerCookies);
            const actualVendorId = await getVendorIdFromSlug(practitionerSlug, practitionerCookies);
            if (actualVendorId) {
                console.log(`[Test] Registering practitioner for cleanup: vendorId=${actualVendorId}, slug=${practitionerSlug}`);
                registerTestPractitioner({ id: actualVendorId, slug: practitionerSlug, email: testEmail, cookies: practitionerCookies }, workerId);
            } else {
                console.error(`[Test] WARNING: Could not fetch actual vendor ID for slug ${practitionerSlug}`);
                registerTestPractitioner({ slug: practitionerSlug, email: testEmail, cookies: practitionerCookies }, workerId);
            }
        }

        console.log(`[Test] Practitioner slug: ${practitionerSlug}`);
        console.log('[Test] Step 3 complete: Practitioner created');

        // === STEP 4: CREATE MERCHANT VIA "OPEN NEW SHOP" ===
        console.log('[Test] Step 4: Creating merchant via Open New Shop...');

        // Navigate to practitioner manage page
        await page.goto(`/p/${practitionerSlug}/manage`);

        // Click on "My Shop Fronts" in the side nav to expand it
        const shopFrontsNav = page.getByTestId('my-shop-fronts-nav');
        await expect(shopFrontsNav).toBeVisible({ timeout: 15000 });
        await shopFrontsNav.scrollIntoViewIfNeeded();
        await shopFrontsNav.click();
        await page.waitForTimeout(500);

        // Click "Open New Shop"
        const openShopButton = page.getByTestId('open-new-shop-btn');
        await expect(openShopButton).toBeVisible({ timeout: 10000 });
        await openShopButton.click();

        await page.waitForURL(/\/m\/setup/, { timeout: 15000 });

        // Wait for form to be ready instead of networkidle (more reliable)
        const nameInput = page.locator('input[name="name"]');
        await expect(nameInput).toBeVisible({ timeout: 15000 });
        await expect(nameInput).toBeEnabled({ timeout: 5000 });

        // Fill merchant profile
        await page.fill('input[name="name"]', `Shopfront Test Crystals ${timestamp}`);

        const slugInput = page.locator('input[name="slug"]');
        await expect(slugInput).toBeEnabled({ timeout: 10000 });
        await slugInput.fill(merchantSlug);

        const emailInput = page.getByRole('textbox', { name: /business email/i });
        await emailInput.waitFor({ state: 'visible', timeout: 5000 });
        await emailInput.fill(testEmail);

        // Select country
        await page.click('[aria-label="country-picker-trigger"]');
        await page.waitForSelector('[aria-label="country-picker-search"]', { timeout: 5000 });
        await page.fill('[aria-label="country-picker-search"]', 'Australia');
        await page.waitForTimeout(300);
        await page.click('[aria-label="country-picker-result"]');
        await page.waitForTimeout(500);

        await page.fill('input[name="state"]', 'NSW');
        await page.waitForTimeout(500);

        // Select religion
        const religionButton = page.locator('[aria-label="religion-picker"]');
        await expect(religionButton).not.toBeDisabled({ timeout: 10000 });
        await religionButton.click();
        await page.waitForTimeout(500);
        await page.waitForSelector('[data-testid="religion-tree"]', { timeout: 10000 });
        const firstReligion = page.locator('[role="treeitem"]').first();
        await firstReligion.waitFor({ state: 'visible', timeout: 5000 });
        await firstReligion.click();

        // Select merchant type
        await page.waitForTimeout(500);
        const merchantTypeButton = page.locator('[aria-label="merchant-type-picker"]');
        await expect(merchantTypeButton).toBeVisible({ timeout: 10000 });
        await merchantTypeButton.click();
        await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10000 });
        const firstMerchantType = page.locator('[data-testid="merchant-type-tree"] [role="treeitem"]').first();
        await firstMerchantType.waitFor({ state: 'visible', timeout: 5000 });
        await firstMerchantType.click();
        await page.waitForTimeout(500);
        const closeButton = page.locator('[role="dialog"] [aria-label="close-dialog"]');
        await closeButton.click();

        // Continue to pricing
        const continueToPricingButton = page.getByRole('button', { name: /Continue to Pricing/i });
        await expect(continueToPricingButton).toBeEnabled({ timeout: 5000 });
        await continueToPricingButton.click();

        await page.waitForTimeout(3000);
        await expect(page.locator('[data-testid="merchant-subscription-section"]')).toBeVisible({ timeout: 15000 });

        // Submit form - no payment collected at signup
        const submitButton = page.getByRole('button', { name: /^Finish$/i });
        await expect(submitButton).toBeEnabled({ timeout: 10000 });
        await submitButton.click();

        // No payment dialog - redirect directly to merchant profile page
        await page.waitForURL(new RegExp(`/m/${merchantSlug}`), { timeout: 30000 });

        registerTestMerchant({ slug: merchantSlug, email: testEmail }, workerId);
        console.log('[Test] Step 4 complete: Merchant created');

        // Close welcome dialog if present
        const welcomeDialog = page.locator('[role="dialog"]:has-text("Welcome")');
        if (await welcomeDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
            const dismissButton = page.locator('[role="dialog"] button').first();
            if (await dismissButton.isVisible()) {
                await dismissButton.click();
                await page.waitForTimeout(1000);
            }
        }

        // Update cookies
        const updatedCookies = await getCookiesFromPage(page);
        if (updatedCookies) cookiesPerWorker.set(workerId, updatedCookies);

        // === STEP 5: NAVIGATE TO SHOPFRONTS MANAGEMENT ===
        console.log('[Test] Step 5: Navigating to shopfronts management...');
        await page.goto(`/p/${practitionerSlug}/manage/shopfronts`);

        await expect(page.getByRole('heading', { name: 'My Shop Fronts' })).toBeVisible({ timeout: 15000 });
        console.log('[Test] Step 5 complete: On shopfronts management page');

        // === STEP 6: LINK THE MERCHANT ===
        console.log('[Test] Step 6: Linking merchant to practitioner...');

        // Now the button should be enabled since user has a merchant
        const linkButton = page.getByTestId('link-shopfront-btn');
        await expect(linkButton).toBeVisible({ timeout: 10000 });
        await expect(linkButton).toBeEnabled({ timeout: 10000 });
        await linkButton.click();

        // Wait for dialog with available merchants
        await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(1000);

        // Click on our merchant card to link it (should be the only one available)
        const merchantCardInDialog = page.locator('[role="dialog"]').locator('[data-testid^="link-merchant-"]').first();
        await expect(merchantCardInDialog).toBeVisible({ timeout: 10000 });

        // Scroll into view and click
        await merchantCardInDialog.scrollIntoViewIfNeeded();
        await merchantCardInDialog.click();

        // Wait for success toast
        const toastContainer = page.locator('[data-sonner-toaster]');
        const successToast = toastContainer.locator('[data-type="success"]');
        await expect(successToast).toBeVisible({ timeout: 10000 });

        // Wait for dialog to close (indicates mutation was triggered)
        await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 15000 });

        // Refresh the page to ensure we get fresh data from the server
        await page.reload();
        await expect(page.getByRole('heading', { name: 'My Shop Fronts' })).toBeVisible({ timeout: 15000 });

        // Wait for query to complete
        await page.waitForTimeout(2000);

        // Verify linked shop appears
        const linkedShopCard = page.locator('[data-testid^="linked-shop-"]').filter({ hasText: `Shopfront Test Crystals ${timestamp}` });
        await expect(linkedShopCard).toBeVisible({ timeout: 15000 });
        console.log('[Test] Step 6 complete: Merchant linked');

        // === STEP 7: VERIFY ON PUBLIC PROFILE ===
        console.log('[Test] Step 7: Verifying shop on public profile...');
        await page.goto(`/p/${practitionerSlug}`);

        const shopfrontsSection = page.getByTestId('shopfronts-section');
        await expect(shopfrontsSection).toBeVisible({ timeout: 15000 });
        await expect(shopfrontsSection.locator(`text=Shopfront Test Crystals`)).toBeVisible({ timeout: 10000 });
        console.log('[Test] Step 7 complete: Shop visible on public profile');

        // === STEP 8: UNLINK THE SHOP ===
        console.log('[Test] Step 8: Unlinking the shop...');
        await page.goto(`/p/${practitionerSlug}/manage/shopfronts`);

        // Wait for page to load and linked shops data to be fetched
        await expect(page.getByRole('heading', { name: 'My Shop Fronts' })).toBeVisible({ timeout: 15000 });

        // Wait for linked shop card to appear (data fetching)
        const linkedShopCardStep8 = page.locator('[data-testid^="linked-shop-"]').filter({ hasText: `Shopfront Test Crystals ${timestamp}` });
        await expect(linkedShopCardStep8).toBeVisible({ timeout: 15000 });

        const unlinkButton = page.locator('[data-testid^="unlink-shop-"]').first();
        await expect(unlinkButton).toBeVisible({ timeout: 10000 });
        await unlinkButton.click();

        await expect(page.locator('[role="alertdialog"]')).toBeVisible({ timeout: 5000 });
        const confirmButton = page.getByTestId('confirm-unlink-btn');
        await expect(confirmButton).toBeVisible({ timeout: 5000 });
        await confirmButton.click();

        await page.waitForTimeout(2000);
        // Verify linked shop is removed (use correct testid: linked-shop-)
        const linkedShopCardAfterUnlink = page.locator('[data-testid^="linked-shop-"]').filter({ hasText: `Shopfront Test Crystals ${timestamp}` });
        await expect(linkedShopCardAfterUnlink).not.toBeVisible({ timeout: 10000 });
        console.log('[Test] Step 8 complete: Shop unlinked');

        // === STEP 9: VERIFY REMOVED FROM PUBLIC PROFILE ===
        console.log('[Test] Step 9: Verifying shop removed from public profile...');
        await page.goto(`/p/${practitionerSlug}`);

        // Wait for page to load by checking for a stable element
        await page.waitForSelector('main', { timeout: 15000 });

        const shopfrontsSectionAfterUnlink = page.getByTestId('shopfronts-section');
        const isSectionVisible = await shopfrontsSectionAfterUnlink.isVisible({ timeout: 3000 }).catch(() => false);

        if (isSectionVisible) {
            await expect(shopfrontsSectionAfterUnlink.locator(`text=Shopfront Test Crystals ${timestamp}`)).not.toBeVisible({ timeout: 5000 });
        }

        console.log('[Test] Step 9 complete: Shop removed from public profile');
        console.log('[Test] ✅ Practitioner shopfronts test completed successfully!');
    });
});

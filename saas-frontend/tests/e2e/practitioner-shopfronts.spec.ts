import { test, expect } from '@playwright/test';
import { PractitionerSetupPage } from '../pages/PractitionerSetupPage';
import {
    clearTestEntityRegistry,
    registerTestMerchant,
    getCookiesFromPage,
    cleanupTestUsers,
    cleanupTestPractitioners,
    cleanupTestMerchants,
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
 * 1. Create user + practitioner (via unified onboarding)
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
    test('should link and unlink merchant shopfront to practitioner profile', async ({ page }, testInfo) => {
        test.setTimeout(420000); // 7 minutes for full flow

        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const workerId = testInfo.parallelIndex;
        const testEmail = `shopfront-test-${timestamp}-${workerId}@playwright.com`;
        const merchantSlug = `test-merch-shop-${timestamp}-${randomSuffix}`;

        // === STEP 1: CREATE PRACTITIONER (unified onboarding) ===
        console.log('[Test] Step 1: Creating practitioner via unified onboarding...');
        const practitionerSetupPage = new PractitionerSetupPage(page);
        const practitionerSlug = await practitionerSetupPage.createPractitioner(
            testEmail,
            `Shopfront Test Practitioner ${timestamp}`,
            testInfo,
            'awaken'
        );

        // Store cookies for cleanup
        const cookies = await getCookiesFromPage(page);
        if (cookies) cookiesPerWorker.set(workerId, cookies);

        console.log(`[Test] Practitioner slug: ${practitionerSlug}`);
        console.log('[Test] Step 1 complete: Practitioner created');

        // === STEP 2: CREATE MERCHANT VIA SHOP FRONTS UPGRADE ===
        console.log('[Test] Step 2: Creating merchant via Shop Fronts upgrade...');

        // Navigate to practitioner manage page (initial entry point)
        await page.goto(`/p/${practitionerSlug}/manage`);

        // Dismiss cookie banner if present
        const cookieBanner = page.getByTestId('cookie-banner');
        if (await cookieBanner.isVisible({ timeout: 3000 }).catch(() => false)) {
            const acceptBtn = cookieBanner.locator('button', { hasText: 'Accept' });
            if (await acceptBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
                await acceptBtn.click();
                await expect(cookieBanner).not.toBeVisible({ timeout: 3000 });
            }
        }

        // Click "Shop Fronts" in the sidenav — opens upgrade dialog on awaken tier
        const shopFrontsNav = page.getByTestId('nav-shop-fronts');
        await expect(shopFrontsNav).toBeVisible({ timeout: 15000 });
        await shopFrontsNav.scrollIntoViewIfNeeded();
        await shopFrontsNav.click();

        // Upgrade dialog appears — select Manifest tier and confirm
        const upgradeModal = page.getByTestId('shop-upgrade-modal');
        await expect(upgradeModal).toBeVisible({ timeout: 10000 });
        const manifestTierCard = page.getByTestId('shop-upgrade-tier-manifest');
        await expect(manifestTierCard).toBeVisible({ timeout: 5000 });
        await manifestTierCard.click();
        const upgradeBtn = page.getByTestId('shop-upgrade-confirm-btn');
        await expect(upgradeBtn).toBeEnabled({ timeout: 5000 });
        await upgradeBtn.click();

        // Wait for redirect to unified setup with tier param
        await page.waitForURL(/\/setup/, { timeout: 15000 });

        // Consent auto-skips (already accepted during practitioner setup).
        // Basic + plan also skip because tier param is set.
        // Lands directly on Merchant Profile step.

        // --- Merchant Profile step ---
        const merchantNameInput = page.getByTestId('setup-merchant-name');
        await expect(merchantNameInput).toBeVisible({ timeout: 15000 });
        await merchantNameInput.fill(`Shopfront Test Crystals ${timestamp}`);

        // Wait for auto-slug generation to complete before overwriting
        await page.waitForTimeout(1000);
        const merchantSlugInput = page.getByTestId('setup-merchant-slug');
        await expect(merchantSlugInput).toBeEnabled({ timeout: 10000 });
        await merchantSlugInput.fill(merchantSlug);

        const merchantEmailInput = page.getByTestId('setup-merchant-email');
        await expect(merchantEmailInput).toBeVisible({ timeout: 5000 });
        await merchantEmailInput.fill(testEmail);

        const merchantStateInput = page.getByTestId('setup-merchant-state');
        await expect(merchantStateInput).toBeVisible({ timeout: 5000 });
        await merchantStateInput.fill('NSW');

        // Select merchant type (required)
        const merchantTypeBtn = page.locator('[aria-label="merchant-type-picker"]');
        await expect(merchantTypeBtn).toBeVisible({ timeout: 10000 });
        await merchantTypeBtn.click();
        await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10000 });
        await page.locator('[data-testid="merchant-type-tree"] [role="treeitem"]').first().waitFor({ state: 'visible', timeout: 5000 });
        await page.locator('[data-testid="merchant-type-tree"] [role="treeitem"]').first().click();
        await page.waitForTimeout(500);
        await page.locator('[role="dialog"] [aria-label="close-dialog"]').click();

        // Select religion (required)
        const religionBtn = page.locator('[aria-label="religion-picker"]');
        await expect(religionBtn).toBeVisible({ timeout: 10000 });
        await religionBtn.click();
        await page.waitForSelector('[data-testid="religion-tree"]', { timeout: 10000 });
        await page.locator('[role="treeitem"]').first().click();
        await page.waitForTimeout(500);

        // Submit merchant profile
        const merchantSubmitBtn = page.getByTestId('setup-merchant-submit-btn');
        await expect(merchantSubmitBtn).toBeEnabled({ timeout: 5000 });
        await merchantSubmitBtn.click();

        // --- Card Capture step — skip ---
        const skipCardBtn = page.getByTestId('card-capture-skip-btn');
        await expect(skipCardBtn).toBeVisible({ timeout: 30000 });
        await skipCardBtn.click();
        console.log('[Test] Skipped card capture');

        // --- Also Practitioner step — click No (already have one) ---
        const alsoPractitionerNo = page.getByTestId('setup-also-practitioner-no');
        await expect(alsoPractitionerNo).toBeVisible({ timeout: 15000 });
        await alsoPractitionerNo.click();

        // Wait for redirect to merchant profile page
        await page.waitForURL(new RegExp(`/m/`), { timeout: 30000 });

        registerTestMerchant({ slug: merchantSlug, email: testEmail }, workerId);
        console.log('[Test] Step 2 complete: Merchant created');

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

        // === STEP 3: NAVIGATE TO SHOPFRONTS MANAGEMENT ===
        console.log('[Test] Step 3: Navigating to shopfronts management...');
        await page.goto(`/p/${practitionerSlug}/manage/shopfronts`);

        await expect(page.getByRole('heading', { name: 'My Shop Fronts' })).toBeVisible({ timeout: 15000 });
        console.log('[Test] Step 3 complete: On shopfronts management page');

        // === STEP 4: LINK THE MERCHANT ===
        console.log('[Test] Step 4: Linking merchant to practitioner...');

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
        console.log('[Test] Step 4 complete: Merchant linked');

        // === STEP 5: VERIFY ON PUBLIC PROFILE ===
        console.log('[Test] Step 5: Verifying shop on public profile...');
        await page.goto(`/p/${practitionerSlug}`);

        const shopfrontsSection = page.getByTestId('shopfronts-section');
        await expect(shopfrontsSection).toBeVisible({ timeout: 15000 });
        await expect(shopfrontsSection.locator(`text=Shopfront Test Crystals`)).toBeVisible({ timeout: 10000 });
        console.log('[Test] Step 5 complete: Shop visible on public profile');

        // === STEP 6: UNLINK THE SHOP ===
        console.log('[Test] Step 6: Unlinking the shop...');
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
        console.log('[Test] Step 6 complete: Shop unlinked');

        // === STEP 7: VERIFY REMOVED FROM PUBLIC PROFILE ===
        console.log('[Test] Step 7: Verifying shop removed from public profile...');
        await page.goto(`/p/${practitionerSlug}`);

        // Wait for page to load by checking for a stable element
        await page.waitForSelector('main', { timeout: 15000 });

        const shopfrontsSectionAfterUnlink = page.getByTestId('shopfronts-section');
        const isSectionVisible = await shopfrontsSectionAfterUnlink.isVisible({ timeout: 3000 }).catch(() => false);

        if (isSectionVisible) {
            await expect(shopfrontsSectionAfterUnlink.locator(`text=Shopfront Test Crystals ${timestamp}`)).not.toBeVisible({ timeout: 5000 });
        }

        console.log('[Test] Step 7 complete: Shop removed from public profile');
        console.log('[Test] Practitioner shopfronts test completed successfully!');
    });
});

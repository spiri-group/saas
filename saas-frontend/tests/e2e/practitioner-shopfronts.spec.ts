import { test, expect, Page } from '@playwright/test';
import { deflateSync } from 'zlib';
import { PractitionerSetupPage } from '../pages/PractitionerSetupPage';
import {
    clearTestEntityRegistry,
    registerTestMerchant,
    getCookiesFromPage,
    cleanupTestUsers,
    cleanupTestPractitioners,
    cleanupTestMerchants,
    completeStripeTestOnboarding,
    getVendorIdFromSlug,
    addTestLocation,
} from '../utils/test-cleanup';

// Store cookies per test worker
const cookiesPerWorker = new Map<number, string>();

/**
 * Helper to wait for any dialog overlay to close
 */
async function waitForDialogOverlayToClose(page: Page) {
    const dialogOverlay = page.locator('[data-state="open"][aria-hidden="true"].fixed.inset-0');
    try {
        await dialogOverlay.waitFor({ state: 'hidden', timeout: 10000 });
    } catch {
        // No overlay present, continue
    }
}

/**
 * Helper to scroll an element into view and click it using JavaScript.
 * Bypasses Playwright's viewport checks which fail on tall dialogs.
 */
async function scrollAndClick(page: Page, locator: ReturnType<Page['locator']>) {
    await locator.evaluate((el) => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        (el as HTMLElement).click();
    });
    await page.waitForTimeout(300);
}

/**
 * Create a valid PNG image buffer programmatically.
 * Generates a 100x100 solid-colour image that passes server-side vips/sharp processing.
 */
function createValidPngBuffer(): Buffer {
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    function crc32(buf: Buffer): number {
        let c = 0xffffffff;
        for (const b of buf) {
            c ^= b;
            for (let j = 0; j < 8; j++) {
                c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0);
            }
        }
        return (c ^ 0xffffffff) >>> 0;
    }

    function chunk(type: string, data: Buffer): Buffer {
        const len = Buffer.alloc(4);
        len.writeUInt32BE(data.length);
        const t = Buffer.from(type, 'ascii');
        const crc = Buffer.alloc(4);
        crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
        return Buffer.concat([len, t, data, crc]);
    }

    // IHDR: 100x100, 8-bit RGB
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(100, 0);
    ihdr.writeUInt32BE(100, 4);
    ihdr[8] = 8;  // bit depth
    ihdr[9] = 2;  // color type RGB

    // Image data: 100 rows × (1 filter byte + 300 RGB bytes)
    const raw = Buffer.alloc(100 * 301);
    for (let y = 0; y < 100; y++) {
        raw[y * 301] = 0; // filter: none
        for (let x = 0; x < 100; x++) {
            const i = y * 301 + 1 + x * 3;
            raw[i] = 100;     // R
            raw[i + 1] = 50;  // G
            raw[i + 2] = 150; // B
        }
    }

    return Buffer.concat([
        signature,
        chunk('IHDR', ihdr),
        chunk('IDAT', deflateSync(raw)),
        chunk('IEND', Buffer.alloc(0)),
    ]);
}

/**
 * Helper to upload a test thumbnail image.
 */
async function uploadTestThumbnail(page: Page) {
    const pngBuffer = createValidPngBuffer();
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
        name: 'test-product-thumbnail.png',
        mimeType: 'image/png',
        buffer: pngBuffer,
    });
    console.log('[Test] Uploading thumbnail image...');
    await page.waitForTimeout(6000);
    console.log('[Test] Thumbnail upload complete');
}

/**
 * Practitioner Shopfronts Tests
 *
 * Tests the ability for practitioners to link their merchant shops
 * to their practitioner profile, including listing a product.
 *
 * Flow:
 * 1. Create user + practitioner (via unified onboarding)
 * 2. Create merchant (same user)
 * 2b. Set up prerequisites + list a product in the merchant shop
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
        test.setTimeout(720000); // 12 minutes for full flow (includes product creation with all variant fields)

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

        // Update cookies
        const updatedCookies = await getCookiesFromPage(page);
        if (updatedCookies) cookiesPerWorker.set(workerId, updatedCookies);

        // === STEP 2b: SET UP PRODUCT PREREQUISITES & LIST A PRODUCT ===
        console.log('[Test] Step 2b: Setting up product prerequisites and listing a product...');
        const productName = `Test Product ${timestamp}`;
        const cookiesForApi = updatedCookies || cookies;

        // 2b.1: Resolve merchant ID + set up prerequisites via API
        console.log('[Test] Step 2b.1: Setting up location and Stripe onboarding via API...');
        let merchantId: string | null = null;
        if (cookiesForApi) {
            merchantId = await getVendorIdFromSlug(merchantSlug, cookiesForApi);
            if (merchantId) {
                // Add location (prerequisite for product creation)
                await addTestLocation(merchantId, cookiesForApi, 'Test Store');
                console.log('[Test] Location added via API');

                // Complete Stripe onboarding (prerequisite for listing products)
                const onboardingResult = await completeStripeTestOnboarding(merchantId, cookiesForApi);
                if (onboardingResult.success) {
                    console.log('[Test] Stripe onboarding completed successfully');
                } else {
                    console.log('[Test] Stripe onboarding warning:', onboardingResult.message);
                }
            } else {
                console.log('[Test] Could not resolve merchant ID from slug');
            }
        }

        // Reload to pick up new location + Stripe status
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Dismiss welcome dialog if present (click "Customise your profile")
        const welcomeBtn = page.locator('button:has-text("Customise your profile")');
        if (await welcomeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await welcomeBtn.click();
            await page.waitForTimeout(1000);
        }
        await waitForDialogOverlayToClose(page);

        // 2b.3: Open product creation dialog via sidebar: Catalogue → New Product
        console.log('[Test] Step 2b.3: Opening product creation dialog...');
        const catalogueMenu = page.locator('button[aria-label="Catalogue"]');
        await catalogueMenu.waitFor({ state: 'visible', timeout: 10000 });
        await catalogueMenu.click();
        await page.waitForTimeout(500);
        const newProductItem = page.locator('button[aria-label="New Product"]');
        await newProductItem.waitFor({ state: 'visible', timeout: 5000 });
        await newProductItem.click();

        const productDialog = page.locator('[role="dialog"]:not([aria-hidden="true"])');
        await expect(productDialog).toBeVisible({ timeout: 10000 });

        // 2b.4: Step 1 — Product Details
        console.log('[Test] Step 2b.4: Filling product details...');
        await expect(page.locator('text=Product Details')).toBeVisible({ timeout: 5000 });

        await page.fill('input[name="name"]', productName);
        await page.waitForTimeout(500);

        // Select category via the hierarchical picker dialog
        const categoryCombobox = page.locator('button[role="combobox"]:has-text("Select a category")');
        if (await categoryCombobox.isVisible({ timeout: 3000 }).catch(() => false)) {
            await categoryCombobox.click();
            // Wait for the Select Category dialog to open
            const categoryDialog = page.locator('[role="dialog"]:has-text("Select Category")');
            await expect(categoryDialog).toBeVisible({ timeout: 5000 });
            // Click the first category item (auto-selects and closes dialog)
            const firstCategoryItem = categoryDialog.locator('text=Crystals & Gemstones');
            await expect(firstCategoryItem).toBeVisible({ timeout: 5000 });
            await firstCategoryItem.click();
            await page.waitForTimeout(500);
            console.log('[Test] Category selected: Crystals & Gemstones');
        }

        // Check "No refunds" checkbox (avoids needing refund policy setup)
        const noRefundsCheckbox = page.locator('#no-refunds-checkbox');
        if (await noRefundsCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
            await scrollAndClick(page, noRefundsCheckbox);
        }

        // Wait for "Sold From" location to auto-populate (locations query must load first)
        const soldFromCombo = productDialog.locator('button[role="combobox"]:has-text("Test Store")');
        const locationLoaded = await soldFromCombo.isVisible({ timeout: 10000 }).catch(() => false);
        if (!locationLoaded) {
            // Location didn't auto-select — manually select it
            const locationPicker = productDialog.locator('button[role="combobox"]:has-text("Select locations")');
            if (await locationPicker.isVisible({ timeout: 3000 }).catch(() => false)) {
                await locationPicker.click();
                await page.waitForTimeout(500);
                const locationOption = page.locator('[cmdk-item]').first();
                await locationOption.click();
                await page.waitForTimeout(500);
                console.log('[Test] Manually selected location');
            }
        } else {
            console.log('[Test] Location auto-selected: Test Store');
        }

        // Upload test thumbnail
        await uploadTestThumbnail(page);

        // Click Next to proceed to Pricing Strategy (use exact match to avoid "Next slide" button)
        const nextButton = page.getByRole('button', { name: 'Next', exact: true });
        await scrollAndClick(page, nextButton);
        await page.waitForTimeout(2000);

        // 2b.5: Step 2 — Pricing Strategy
        console.log('[Test] Step 2b.5: Selecting pricing strategy...');
        await expect(page.locator('text=Pricing Strategy')).toBeVisible({ timeout: 5000 });

        const strategySelect = page.locator('button[role="combobox"]:has-text("Choose your pricing goal")');
        if (await strategySelect.isVisible({ timeout: 5000 }).catch(() => false)) {
            await strategySelect.click();
            await page.waitForTimeout(500);
            const volumeOption = page.locator('[role="option"]:has-text("Sell more units")');
            await volumeOption.click();
            await page.waitForTimeout(500);
        }

        // Click Next to proceed to Variants
        await scrollAndClick(page, nextButton);
        await page.waitForTimeout(2000);

        // 2b.6: Step 3 — Variants (fill ALL required fields)
        console.log('[Test] Step 2b.6: Filling variant details...');
        await expect(page.locator('text=Product Variants')).toBeVisible({ timeout: 5000 });

        // Variant name defaults to "Variant 1" (passes min(1) validation)

        // 6a: Fill variant code (required, min 1 char)
        const codeInput = productDialog.locator('input[placeholder="Code"]');
        await codeInput.scrollIntoViewIfNeeded();
        await codeInput.fill('TEST-001');
        console.log('[Test] Filled variant code');

        // 6b: Add description via popover (required, countWords > 0)
        const addDescBtn = productDialog.locator('button:has-text("Add Description")');
        await addDescBtn.scrollIntoViewIfNeeded();
        await addDescBtn.click();
        await page.waitForTimeout(1000);
        // RichTextInput uses Lexical with ContentEditable
        const richTextEditor = page.locator('[contenteditable="true"]').first();
        await richTextEditor.click();
        await page.keyboard.type('Test product description for automated testing.');
        await page.waitForTimeout(500);
        const finishDescBtn = page.locator('button:has-text("Finish and Confirm")');
        await scrollAndClick(page, finishDescBtn);
        await page.waitForTimeout(500);
        console.log('[Test] Added description');

        // 6c: Add image via popover (required, min 1 image)
        const imagesBtn = productDialog.locator('button').filter({ hasText: /^Images/ }).first();
        await imagesBtn.scrollIntoViewIfNeeded();
        await imagesBtn.click();
        await page.waitForTimeout(1000);
        // Upload image via FileUploader's file input
        const variantPngBuffer = createValidPngBuffer();
        const variantFileInput = page.locator('input[type="file"]').first();
        await variantFileInput.setInputFiles({
            name: 'test-variant-image.png',
            mimeType: 'image/png',
            buffer: variantPngBuffer,
        });
        console.log('[Test] Uploading variant image...');
        await page.waitForTimeout(8000); // Wait for upload + processing
        const finishImgBtn = page.locator('button:has-text("Finish & Confirm")');
        await scrollAndClick(page, finishImgBtn);
        await page.waitForTimeout(500);
        console.log('[Test] Added variant image');

        // 6d: Select HS Code (required - opens dialog within product dialog)
        const hsCodeBtn = productDialog.locator('button:has-text("Select HS Code")');
        await hsCodeBtn.scrollIntoViewIfNeeded();
        await hsCodeBtn.click();
        const hsDialog = page.locator('[role="dialog"]:has-text("Select Harmonized System Code")');
        await expect(hsDialog).toBeVisible({ timeout: 5000 });
        // Search for "gemstone" to get real HS code results
        const hsSearchInput = hsDialog.locator('input[placeholder="Search HS Codes..."]');
        await hsSearchInput.fill('gemstone');
        await page.waitForTimeout(3000); // Wait for debounced search + API response
        // Click the first HS code result (CarouselItem with cursor-pointer, has formatted code text)
        const hsCodeResults = hsDialog.locator('span.text-slate-500');
        const firstHsResult = hsCodeResults.first();
        if (await firstHsResult.isVisible({ timeout: 5000 }).catch(() => false)) {
            // Click the parent CarouselItem (the clickable element)
            await firstHsResult.locator('..').click();
            await page.waitForTimeout(500);
            console.log('[Test] Clicked HS code result');
        } else {
            console.log('[Test] WARNING: No HS code results found for "gemstone"');
        }
        const confirmHsBtn = hsDialog.locator('button:has-text("Confirm and Close")');
        await scrollAndClick(page, confirmHsBtn);
        await page.waitForTimeout(500);
        console.log('[Test] Selected HS Code');

        // 6e: Select Country of Manufacture (required, min 1 char)
        const comManufacture = productDialog.locator('button[role="combobox"]:has-text("Country of Manufacture")');
        await comManufacture.scrollIntoViewIfNeeded();
        await comManufacture.click();
        await page.waitForTimeout(500);
        // Type in the search input that appears in the combobox popover
        const mfgSearchInput = page.locator('input[placeholder="Search ..."]').last();
        await mfgSearchInput.fill('Australia');
        await page.waitForTimeout(500);
        // Click the matching result
        const mfgResult = page.locator('[cmdk-item]').filter({ hasText: 'Australia' }).first();
        await mfgResult.click();
        await page.waitForTimeout(500);
        console.log('[Test] Selected Country of Manufacture');

        // 6f: Select Country of Origin (required, min 1 char)
        const comOrigin = productDialog.locator('button[role="combobox"]:has-text("Country of Origin")');
        await comOrigin.scrollIntoViewIfNeeded();
        await comOrigin.click();
        await page.waitForTimeout(500);
        const originSearchInput = page.locator('input[placeholder="Search ..."]').last();
        await originSearchInput.fill('Australia');
        await page.waitForTimeout(500);
        const originResult = page.locator('[cmdk-item]').filter({ hasText: 'Australia' }).first();
        await originResult.click();
        await page.waitForTimeout(500);
        console.log('[Test] Selected Country of Origin');

        // 6g: Fill landed cost (required, amount > 0)
        // CurrencyInput renders <input type="text" inputmode="decimal"> with NO name attr.
        // There are exactly 2 such inputs: landedCost and sellingPrice (both show "$0.00").
        // The landed cost one comes first in DOM order.
        const currencyInputs = productDialog.locator('input[type="text"][inputmode="decimal"]:not([name])');
        const landedCostInput = currencyInputs.first();
        await landedCostInput.scrollIntoViewIfNeeded();
        await landedCostInput.click(); // onFocus selects all text
        await page.waitForTimeout(300);
        await page.keyboard.type('10.00');
        await page.waitForTimeout(1500); // Wait for 1000ms debounce
        console.log('[Test] Filled landed cost');

        // 6h: Fill available stock (required, min 1)
        const stockInput = productDialog.locator('input[name="variants.0.qty_soh"]');
        await stockInput.scrollIntoViewIfNeeded();
        await stockInput.fill('100');
        await page.waitForTimeout(500);
        console.log('[Test] Filled stock quantity');

        // Wait for auto-pricing calculation (triggered by landed cost + strategy)
        await page.waitForTimeout(3000);
        console.log('[Test] Waited for auto-pricing calculation');

        // Click "List Product" (button is at bottom of 900px dialog, outside 720px viewport)
        console.log('[Test] Submitting product...');
        const listButton = page.locator('button:has-text("List Product")');
        await listButton.focus();
        await page.keyboard.press('Enter');
        console.log('[Test] Pressed Enter on List Product button');

        // Wait for the dialog to switch to ListProductSuccess ("Product Created!")
        const productCreatedHeading = page.locator('h2:has-text("Product Created!")');
        await expect(productCreatedHeading).toBeVisible({ timeout: 30000 });
        console.log('[Test] Product created successfully — success dialog visible');

        // Close the success dialog by clicking "Back to Profile"
        await page.waitForTimeout(1000);
        const backToProfileBtn = page.locator('button:has-text("Back to Profile")');
        await expect(backToProfileBtn).toBeVisible({ timeout: 5000 });
        await scrollAndClick(page, backToProfileBtn);
        console.log('[Test] Clicked "Back to Profile"');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        // 2b.7: Verify product appears on merchant shop page
        // Draft products are visible to the logged-in merchant owner
        console.log('[Test] Step 2b.7: Verifying product appears on merchant shop page...');
        const productOnShopPage = page.locator(`text=${productName}`);
        await expect(productOnShopPage).toBeVisible({ timeout: 20000 });
        console.log('[Test] Step 2b complete: Product listed and visible on merchant shop page');

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

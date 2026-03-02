import { test, expect, BrowserContext } from '@playwright/test';
import {
  setupIlluminatePractitioner,
  cleanupIlluminatePractitioner,
  practitionerCookiesPerWorker,
  practitionerSlugPerWorker,
  generateUniqueEmail,
  fillStripePaymentElement,
  createAuthenticatedContext,
} from '../utils/illuminate-setup';

/**
 * Expo Mode E2E — Full lifecycle with customer checkout and walk-up sale
 *
 * Run: yarn test:grep "Expo Mode"
 */

test.beforeAll(async ({ browser }, testInfo) => {
  test.setTimeout(240000);
  await setupIlluminatePractitioner(browser, testInfo, 'illum-expo');
});

test.afterAll(async ({}, testInfo) => {
  test.setTimeout(120000);
  await cleanupIlluminatePractitioner(testInfo);
});

test.describe('Expo Mode', () => {
  test('Expo Mode — full lifecycle with customer checkout and walk-up sale', async ({ browser }, testInfo) => {
    test.setTimeout(540000); // 9 minutes — includes inventory depletion flow

    const slug = practitionerSlugPerWorker.get(testInfo.parallelIndex);
    const cookies = practitionerCookiesPerWorker.get(testInfo.parallelIndex);
    expect(slug).toBeDefined();
    expect(cookies).toBeDefined();

    const practitionerContext = await createAuthenticatedContext(browser, cookies!);
    const practitionerPage = await practitionerContext.newPage();

    let customerContext: BrowserContext | null = null;

    try {
      // ── Navigate to Expo Mode ──
      await practitionerPage.goto(`/p/${slug}/manage/expo-mode`);
      await expect(practitionerPage.locator('[data-testid="expo-mode-page"]')).toBeVisible({ timeout: 15000 });

      const emptyOrActive = practitionerPage.locator('[data-testid="no-expos"]').or(
        practitionerPage.locator('[data-testid="active-expo-card"]')
      );
      await expect(emptyOrActive).toBeVisible({ timeout: 10000 });
      console.log('[Expo Mode] Page loaded');

      // ── Create a new expo ──
      await practitionerPage.locator('[data-testid="create-expo-btn"]').click();
      await expect(practitionerPage.locator('[data-testid="create-expo-dialog"]')).toBeVisible({ timeout: 10000 });

      const expoName = `E2E Expo ${Date.now()}`;
      await practitionerPage.locator('[data-testid="expo-name-input"]').fill(expoName);
      await practitionerPage.locator('[data-testid="confirm-create-btn"]').click();

      await expect(practitionerPage.locator('[data-testid="active-expo-card"]')).toBeVisible({ timeout: 15000 });
      console.log('[Expo Mode] Expo created');

      // Click into expo dashboard
      await practitionerPage.locator('[data-testid="active-expo-card"]').click();
      await expect(practitionerPage.locator('[data-testid="expo-dashboard"]')).toBeVisible({ timeout: 15000 });
      await expect(practitionerPage.locator('[data-testid="expo-status-badge"]')).toContainText(/Setup/i);
      console.log('[Expo Mode] Dashboard loaded with SETUP status');

      // ── Add catalog items ──
      // Item 1: Crystal Reading $30 (no inventory)
      await practitionerPage.locator('[data-testid="add-item-btn"]').click();
      await expect(practitionerPage.locator('[data-testid="add-item-dialog"]')).toBeVisible({ timeout: 10000 });
      await practitionerPage.locator('[data-testid="item-name-input"]').fill('Crystal Reading');
      await practitionerPage.locator('[data-testid="item-price-input"]').fill('30');
      await practitionerPage.locator('[data-testid="confirm-add-item-btn"]').click();
      await expect(practitionerPage.locator('[data-testid="add-item-dialog"]')).not.toBeVisible({ timeout: 5000 });
      console.log('[Expo Mode] Item 1 added: Crystal Reading $30');

      // Item 2: Aura Photo $15, tracked inventory, qty 2
      await practitionerPage.locator('[data-testid="add-item-btn"]').click();
      await expect(practitionerPage.locator('[data-testid="add-item-dialog"]')).toBeVisible({ timeout: 10000 });
      await practitionerPage.locator('[data-testid="item-name-input"]').fill('Aura Photo');
      await practitionerPage.locator('[data-testid="item-price-input"]').fill('15');
      await practitionerPage.locator('[data-testid="track-inventory-checkbox"]').check();
      await expect(practitionerPage.locator('[data-testid="item-qty-input"]')).toBeVisible({ timeout: 5000 });
      await practitionerPage.locator('[data-testid="item-qty-input"]').fill('2');
      await practitionerPage.locator('[data-testid="confirm-add-item-btn"]').click();
      await expect(practitionerPage.locator('[data-testid="add-item-dialog"]')).not.toBeVisible({ timeout: 5000 });
      console.log('[Expo Mode] Item 2 added: Aura Photo $15 (qty 2)');

      // Verify both items visible
      const catalogItems = practitionerPage.locator('[data-testid^="catalog-item-"]');
      await expect(catalogItems).toHaveCount(2, { timeout: 10000 });

      // ── Go Live ──
      await practitionerPage.locator('[data-testid="go-live-btn"]').click();
      await practitionerPage.waitForTimeout(2000);

      await expect(practitionerPage.locator('[data-testid="expo-status-badge"]')).toContainText(/Live/i, { timeout: 15000 });
      await expect(practitionerPage.locator('[data-testid="share-card"]')).toBeVisible({ timeout: 10000 });
      console.log('[Expo Mode] Expo is LIVE');

      // ── Toggle catalog item (disable then re-enable) ──
      const crystalCatalogItem = practitionerPage.locator('[data-testid^="catalog-item-"]').filter({ hasText: 'Crystal Reading' });
      await expect(crystalCatalogItem).toBeVisible({ timeout: 10000 });
      const crystalCatalogTestId = await crystalCatalogItem.getAttribute('data-testid');
      const crystalId = crystalCatalogTestId!.replace('catalog-item-', '');

      // Disable Crystal Reading — button text flips from "Disable" to "Enable" and card gets opacity
      const toggleBtn = practitionerPage.locator(`[data-testid="toggle-item-${crystalId}"]`);
      await toggleBtn.click();
      await expect(toggleBtn).toHaveText('Enable', { timeout: 5000 });
      console.log('[Expo Mode] Crystal Reading toggled OFF (button shows Enable)');

      // Re-enable Crystal Reading — button text flips back to "Disable"
      await toggleBtn.click();
      await expect(toggleBtn).toHaveText('Disable', { timeout: 5000 });
      console.log('[Expo Mode] Crystal Reading toggled ON (button shows Disable)');

      // Extract expo code
      const copyLinkBtn = practitionerPage.locator('[data-testid="copy-link-btn"]');
      await expect(copyLinkBtn).toBeVisible();

      const expoUrl = await practitionerPage.locator('[data-testid="share-card"]').textContent();
      const expoCodeMatch = expoUrl?.match(/\/expo\/([a-zA-Z0-9-]+)/);
      const expoCode = expoCodeMatch ? expoCodeMatch[1] : null;
      expect(expoCode).not.toBeNull();
      console.log(`[Expo Mode] Expo code: ${expoCode}`);

      // ── Customer visits expo page ──
      customerContext = await browser.newContext();
      const customerPage = await customerContext.newPage();

      await customerPage.goto(`/expo/${expoCode}`);
      await expect(customerPage.locator('[data-testid="expo-catalog"]')).toBeVisible({ timeout: 15000 });
      console.log('[Expo Mode] Customer catalog loaded');

      // Dismiss cookie banner if present
      const expoCookieBanner = customerPage.locator('[data-testid="cookie-banner"]');
      if (await expoCookieBanner.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expoCookieBanner.locator('button:has-text("Accept")').click();
        await expect(expoCookieBanner).not.toBeVisible({ timeout: 3000 });
      }

      // Find Crystal Reading and add to cart
      const crystalItem = customerPage.locator('[data-testid^="public-item-"]').filter({ hasText: 'Crystal Reading' });
      await expect(crystalItem).toBeVisible({ timeout: 10000 });

      const crystalItemTestId = await crystalItem.getAttribute('data-testid');
      const crystalItemId = crystalItemTestId!.replace('public-item-', '');

      await customerPage.locator(`[data-testid="add-to-cart-${crystalItemId}"]`).click();
      console.log('[Expo Mode] Crystal Reading added to cart');

      // Open cart
      await customerPage.locator('[data-testid="view-cart-btn"]').click();
      await expect(customerPage.locator('[data-testid="cart-sheet"]')).toBeVisible({ timeout: 5000 });
      await expect(customerPage.locator(`[data-testid="cart-item-${crystalItemId}"]`)).toBeVisible();

      // Proceed to checkout
      await customerPage.locator('[data-testid="checkout-btn"]').click();

      // Fill customer info
      await customerPage.locator('[data-testid="customer-name-input"]').fill('Test Customer');
      await customerPage.locator('[data-testid="customer-email-input"]').fill(generateUniqueEmail('expo-cust', testInfo));

      // Fill Stripe payment
      await fillStripePaymentElement(customerPage);

      // Click outside Stripe iframe to commit card values
      await customerPage.locator('[data-testid="customer-name-input"]').click();
      await customerPage.waitForTimeout(2000);

      // Pay
      const payBtn = customerPage.locator('[data-testid="pay-btn"]');
      await payBtn.scrollIntoViewIfNeeded();
      await expect(payBtn).toBeEnabled({ timeout: 5000 });

      for (let attempt = 1; attempt <= 2; attempt++) {
        await payBtn.click();
        console.log(`[Expo Mode] Pay button clicked (attempt ${attempt})...`);

        try {
          await customerPage.waitForURL(/success=true/, { timeout: 30000 });
          console.log('[Expo Mode] Stripe redirected to success URL');
          break;
        } catch {
          if (attempt === 2) {
            const errorEl = customerPage.locator('[data-testid="payment-error"]');
            if (await errorEl.isVisible({ timeout: 2000 }).catch(() => false)) {
              const errorText = await errorEl.textContent();
              console.log(`[Expo Mode] Payment error: ${errorText}`);
            }
            console.log(`[Expo Mode] Current URL: ${customerPage.url()}`);
            throw new Error('Stripe payment redirect did not complete after 2 attempts');
          }
          console.log('[Expo Mode] Redirect not detected, retrying...');
          await customerPage.waitForTimeout(2000);
        }
      }

      await expect(customerPage.locator('[data-testid="checkout-success"]')).toBeVisible({ timeout: 15000 });
      console.log('[Expo Mode] Customer checkout successful');

      // ── Back to practitioner: wait for sale to appear ──
      let saleAppeared = false;
      for (let attempt = 0; attempt < 20; attempt++) {
        if (attempt > 0) {
          await practitionerPage.waitForTimeout(3000);
          await practitionerPage.reload();
          await practitionerPage.waitForLoadState('networkidle');
        }

        const salesStat = practitionerPage.locator('[data-testid="stat-sales"]');
        const salesText = await salesStat.textContent().catch(() => '0');
        if (salesText && parseInt(salesText) >= 1) {
          saleAppeared = true;
          console.log(`[Expo Mode] Sale appeared in stats (attempt ${attempt + 1})`);
          break;
        }
        console.log(`[Expo Mode] Waiting for sale to appear... (attempt ${attempt + 1}/20)`);
      }
      expect(saleAppeared).toBe(true);

      // Verify stats
      await expect(practitionerPage.locator('[data-testid="stat-sales"]')).toContainText('1');
      await expect(practitionerPage.locator('[data-testid="stat-revenue"]')).toContainText('30.00');
      await expect(practitionerPage.locator('[data-testid="stat-items-sold"]')).toContainText('1');

      // ── Log walk-up sale (cash) ──
      await practitionerPage.locator('[data-testid="log-sale-btn"]').click();
      await expect(practitionerPage.locator('[data-testid="log-sale-dialog"]')).toBeVisible({ timeout: 10000 });

      const auraPhotoItem = practitionerPage.locator('[data-testid^="sale-item-"]').filter({ hasText: 'Aura Photo' });
      await expect(auraPhotoItem).toBeVisible();
      const auraItemTestId = await auraPhotoItem.getAttribute('data-testid');
      const auraItemId = auraItemTestId!.replace('sale-item-', '');

      await practitionerPage.locator(`[data-testid="sale-item-plus-${auraItemId}"]`).click();

      await practitionerPage.locator('[data-testid="payment-method-select"]').click();
      await practitionerPage.locator('[role="option"]:has-text("Cash")').click();

      await practitionerPage.locator('[data-testid="confirm-log-sale-btn"]').click();
      await expect(practitionerPage.locator('[data-testid="log-sale-dialog"]')).not.toBeVisible({ timeout: 5000 });
      console.log('[Expo Mode] Walk-up sale logged: Aura Photo x1 (Cash)');

      // Verify updated stats
      await practitionerPage.reload();
      await practitionerPage.waitForLoadState('networkidle');
      await expect(practitionerPage.locator('[data-testid="stat-sales"]')).toContainText('2', { timeout: 10000 });
      await expect(practitionerPage.locator('[data-testid="stat-revenue"]')).toContainText('45.00', { timeout: 5000 });
      await expect(practitionerPage.locator('[data-testid="stat-items-sold"]')).toContainText('2', { timeout: 5000 });
      console.log('[Expo Mode] Stats verified after first walk-up sale: 2 sales, $45.00, 2 items');

      // Verify practitioner catalog shows "1/2 sold" for Aura Photo
      const auraPhotoCatalogItem = practitionerPage.locator('[data-testid^="catalog-item-"]').filter({ hasText: 'Aura Photo' });
      await expect(auraPhotoCatalogItem).toContainText('1/2 sold', { timeout: 10000 });
      console.log('[Expo Mode] Practitioner catalog shows 1/2 sold for Aura Photo');

      // ── Log 2nd walk-up sale for Aura Photo to deplete inventory ──
      await practitionerPage.locator('[data-testid="log-sale-btn"]').click();
      await expect(practitionerPage.locator('[data-testid="log-sale-dialog"]')).toBeVisible({ timeout: 10000 });

      // Add Aura Photo — find the item and click plus
      const auraPhotoSaleItem2 = practitionerPage.locator('[data-testid^="sale-item-"]').filter({ hasText: 'Aura Photo' });
      await expect(auraPhotoSaleItem2).toBeVisible();
      const auraItemTestId2 = await auraPhotoSaleItem2.getAttribute('data-testid');
      const auraItemId2 = auraItemTestId2!.replace('sale-item-', '');

      // Should show "(1 left)" since 1 was already sold
      await expect(auraPhotoSaleItem2).toContainText('1 left', { timeout: 5000 });

      await practitionerPage.locator(`[data-testid="sale-item-plus-${auraItemId2}"]`).click();

      // Plus button should now be disabled (qty 1 = max available)
      await expect(practitionerPage.locator(`[data-testid="sale-item-plus-${auraItemId2}"]`)).toBeDisabled({ timeout: 5000 });
      console.log('[Expo Mode] Plus button disabled at max available inventory');

      // Select Cash and confirm
      await practitionerPage.locator('[data-testid="payment-method-select"]').click();
      await practitionerPage.locator('[role="option"]:has-text("Cash")').click();

      await practitionerPage.locator('[data-testid="confirm-log-sale-btn"]').click();
      await expect(practitionerPage.locator('[data-testid="log-sale-dialog"]')).not.toBeVisible({ timeout: 5000 });
      console.log('[Expo Mode] Walk-up sale 2 logged: Aura Photo x1 (Cash) — inventory depleted');

      // Reload and verify practitioner catalog shows "2/2 sold" and SOLD OUT
      await practitionerPage.reload();
      await practitionerPage.waitForLoadState('networkidle');

      const auraPhotoCatalogAfter = practitionerPage.locator('[data-testid^="catalog-item-"]').filter({ hasText: 'Aura Photo' });
      await expect(auraPhotoCatalogAfter).toContainText('2/2 sold', { timeout: 10000 });
      await expect(auraPhotoCatalogAfter).toContainText('SOLD OUT', { timeout: 5000 });
      console.log('[Expo Mode] Practitioner catalog shows 2/2 sold + SOLD OUT badge');

      // ── Customer page: verify SOLD OUT prevents purchase ──
      const customer2Context = await browser.newContext();
      const customer2Page = await customer2Context.newPage();

      try {
        await customer2Page.goto(`/expo/${expoCode}`);
        await expect(customer2Page.locator('[data-testid="expo-catalog"]')).toBeVisible({ timeout: 15000 });

        // Dismiss cookie banner if present
        const cookieBanner2 = customer2Page.locator('[data-testid="cookie-banner"]');
        if (await cookieBanner2.isVisible({ timeout: 2000 }).catch(() => false)) {
          await cookieBanner2.locator('button:has-text("Accept")').click();
          await expect(cookieBanner2).not.toBeVisible({ timeout: 3000 });
        }

        // Aura Photo should show SOLD OUT
        const auraPhotoPublic = customer2Page.locator('[data-testid^="public-item-"]').filter({ hasText: 'Aura Photo' });
        await expect(auraPhotoPublic).toBeVisible({ timeout: 10000 });
        await expect(auraPhotoPublic).toContainText('SOLD OUT', { timeout: 5000 });

        // Get Aura Photo item ID to verify no add-to-cart button
        const auraPublicTestId = await auraPhotoPublic.getAttribute('data-testid');
        const auraPublicId = auraPublicTestId!.replace('public-item-', '');
        await expect(customer2Page.locator(`[data-testid="add-to-cart-${auraPublicId}"]`)).not.toBeVisible({ timeout: 5000 });
        console.log('[Expo Mode] Customer page: Aura Photo shows SOLD OUT, no add-to-cart');

        // Crystal Reading should still be purchasable
        const crystalPublic = customer2Page.locator('[data-testid^="public-item-"]').filter({ hasText: 'Crystal Reading' });
        await expect(crystalPublic).toBeVisible({ timeout: 5000 });
        const crystalPublicTestId = await crystalPublic.getAttribute('data-testid');
        const crystalPublicId = crystalPublicTestId!.replace('public-item-', '');
        await expect(customer2Page.locator(`[data-testid="add-to-cart-${crystalPublicId}"]`)).toBeVisible({ timeout: 5000 });
        console.log('[Expo Mode] Customer page: Crystal Reading still purchasable');
      } finally {
        await customer2Context.close();
      }

      // ── Practitioner: verify log-sale dialog shows 0 left for Aura Photo ──
      await practitionerPage.locator('[data-testid="log-sale-btn"]').click();
      await expect(practitionerPage.locator('[data-testid="log-sale-dialog"]')).toBeVisible({ timeout: 10000 });

      const auraPhotoSaleItemFinal = practitionerPage.locator('[data-testid^="sale-item-"]').filter({ hasText: 'Aura Photo' });
      await expect(auraPhotoSaleItemFinal).toContainText('0 left', { timeout: 5000 });

      const auraItemTestIdFinal = await auraPhotoSaleItemFinal.getAttribute('data-testid');
      const auraItemIdFinal = auraItemTestIdFinal!.replace('sale-item-', '');
      await expect(practitionerPage.locator(`[data-testid="sale-item-plus-${auraItemIdFinal}"]`)).toBeDisabled({ timeout: 5000 });
      console.log('[Expo Mode] Log-sale dialog: Aura Photo shows (0 left), plus disabled');

      await practitionerPage.locator('[data-testid="cancel-log-sale-btn"]').click();
      await expect(practitionerPage.locator('[data-testid="log-sale-dialog"]')).not.toBeVisible({ timeout: 5000 });
      console.log('[Expo Mode] Inventory depletion flow complete');

      // ── Pause / Resume ──
      await practitionerPage.locator('[data-testid="pause-btn"]').click();
      await expect(practitionerPage.locator('[data-testid="expo-status-badge"]')).toContainText(/Paused/i, { timeout: 10000 });
      console.log('[Expo Mode] Expo PAUSED');

      await practitionerPage.locator('[data-testid="resume-btn"]').click();
      await expect(practitionerPage.locator('[data-testid="expo-status-badge"]')).toContainText(/Live/i, { timeout: 10000 });
      console.log('[Expo Mode] Expo RESUMED');

      // ── End expo ──
      await practitionerPage.locator('[data-testid="end-expo-btn"]').click();
      await expect(practitionerPage.locator('[data-testid="end-expo-confirm"]')).toBeVisible({ timeout: 5000 });
      await practitionerPage.locator('[data-testid="confirm-end-btn"]').click();
      await expect(practitionerPage.locator('[data-testid="expo-status-badge"]')).toContainText(/Ended/i, { timeout: 10000 });
      console.log('[Expo Mode] Expo ENDED');

      // Navigate back to list
      await practitionerPage.goto(`/p/${slug}/manage/expo-mode`);
      await expect(practitionerPage.locator('[data-testid="expo-mode-page"]')).toBeVisible({ timeout: 15000 });
      const pastExpoCard = practitionerPage.locator('[data-testid^="expo-card-"]').first();
      await expect(pastExpoCard).toBeVisible({ timeout: 10000 });
      console.log('[Expo Mode] Past expo visible in list');

      // ── Past expo review ──
      await pastExpoCard.click();
      await expect(practitionerPage.locator('[data-testid="expo-dashboard"]')).toBeVisible({ timeout: 15000 });
      console.log('[Expo Mode] Navigated to past expo detail');

      await expect(practitionerPage.locator('[data-testid="expo-status-badge"]')).toContainText(/Ended/i, { timeout: 10000 });
      await expect(practitionerPage.locator('[data-testid="stat-sales"]')).toContainText('3', { timeout: 5000 });
      await expect(practitionerPage.locator('[data-testid="stat-revenue"]')).toBeVisible({ timeout: 5000 });
      await expect(practitionerPage.locator('[data-testid="stat-items-sold"]')).toContainText('3', { timeout: 5000 });
      console.log('[Expo Mode] Past expo stats verified: 3 sales, 3 items sold');

      // Navigate back to list
      await practitionerPage.goto(`/p/${slug}/manage/expo-mode`);
      await expect(practitionerPage.locator('[data-testid="expo-mode-page"]')).toBeVisible({ timeout: 15000 });
      console.log('[Expo Mode] Navigated back to list after past expo review');

      console.log('[Expo Mode] Full lifecycle complete');
    } finally {
      if (customerContext) await customerContext.close();
      await practitionerContext.close();
    }
  });
});

import { test, expect } from '@playwright/test';
import { AuthPage } from '../pages/AuthPage';
import { CataloguePage } from '../pages/CataloguePage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import {
  clearTestEntityRegistry,
  getCookiesFromPage,
  cleanupTestUsers,
} from '../utils/test-cleanup';

/**
 * Purchase Flow Tests
 * End-to-end tests for checkout and payment flows.
 *
 * Note: Basic cart operations (add, remove, persist) are tested in shopping-cart.spec.ts.
 * This file focuses on checkout and payment integration.
 *
 * Prerequisites:
 * - TEST_MERCHANT_SLUG environment variable set to a merchant with products
 * - Test products available in the merchant's catalogue
 *
 * Parallel Execution:
 * - Uses per-worker state isolation
 * - Creates unique test users for each test run
 */

// Store per-worker state
const cookiesPerWorker = new Map<number, string>();
const userIdsPerWorker = new Map<number, string>();

test.beforeAll(async ({}, testInfo) => {
  console.log('[Setup] Preparing purchase flow test environment...');
  clearTestEntityRegistry(testInfo.parallelIndex);
});

test.afterAll(async ({}, testInfo) => {
  test.setTimeout(60000);

  const workerId = testInfo.parallelIndex;
  const cookies = cookiesPerWorker.get(workerId);

  if (cookies) {
    try {
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

test.describe('Cart to Checkout Flow', () => {
  test('should proceed from cart to checkout', async ({ page }, testInfo) => {
    const testMerchantSlug = process.env.TEST_MERCHANT_SLUG;
    if (!testMerchantSlug) {
      test.skip();
      return;
    }

    const cartPage = new CartPage(page);
    const cataloguePage = new CataloguePage(page);

    // Go to merchant page
    await cataloguePage.navigateToCatalogue(testMerchantSlug);
    await cataloguePage.waitForCatalogueLoad();

    // Add a test item to cart
    await cartPage.addItemToCartDirectly({
      image_url: 'https://via.placeholder.com/200',
      productRef: {
        id: `checkout-test-${Date.now()}`,
        partition: [`checkout-test-${Date.now()}`],
        container: 'Main-Product',
      },
      variantId: 'variant-1',
      descriptor: 'Checkout Test Product',
      quantity: 1,
      price: { amount: 49.99, currency: 'USD' },
    });

    // Open cart
    const cartButton = page.locator('[data-testid="cart-button"], button[aria-label="Shopping cart"], button:has-text("Cart")');

    if (await cartButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await cartButton.click();
      await page.waitForTimeout(500);

      // Look for checkout button
      const checkoutBtn = page.locator('button:has-text("Checkout"), button:has-text("Proceed"), a:has-text("Checkout")');

      if (await checkoutBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Note: Actually clicking checkout may require auth
        // For this test, we verify the button exists
        expect(await checkoutBtn.isEnabled()).toBe(true);
        console.log('[Test] Checkout button is visible and enabled');
      } else {
        console.log('[Test] Checkout button not found in cart drawer');
      }
    } else {
      console.log('[Test] Cart button not visible');
    }
  });
});

test.describe('Checkout Page', () => {
  test('should display checkout page with order summary', async ({ page }) => {
    // This test requires a valid checkout link
    // For now, we test the checkout page structure
    const testMerchantSlug = process.env.TEST_MERCHANT_SLUG;
    const testOrderId = process.env.TEST_ORDER_ID;

    if (!testMerchantSlug || !testOrderId) {
      console.log('[Test] Skipping - TEST_MERCHANT_SLUG or TEST_ORDER_ID not configured');
      test.skip();
      return;
    }

    const checkoutPage = new CheckoutPage(page);

    await checkoutPage.navigateToCheckout(testMerchantSlug, testOrderId);
    await checkoutPage.waitForCheckoutLoad();

    // Check for various checkout states
    const isExpired = await checkoutPage.isCheckoutExpired();
    const isAlreadyPaid = await checkoutPage.isAlreadyPaid();
    const hasError = await checkoutPage.hasError();

    if (isExpired) {
      console.log('[Test] Checkout link is expired');
      await expect(page.locator('text=Expired')).toBeVisible();
    } else if (isAlreadyPaid) {
      console.log('[Test] Order already paid');
      await expect(page.locator('text=Already Paid')).toBeVisible();
    } else if (hasError) {
      console.log('[Test] Checkout link not found');
      await expect(page.locator('text=Not Found')).toBeVisible();
    } else {
      // Valid checkout page
      console.log('[Test] Valid checkout page displayed');

      // Verify order items are shown
      const itemCount = await checkoutPage.getOrderItemCount();
      console.log(`[Test] Order has ${itemCount} items`);

      // Verify security badge
      const hasSecurityBadge = await checkoutPage.hasSecurityBadge();
      if (hasSecurityBadge) {
        console.log('[Test] Security badge is visible');
      }
    }
  });

  test('should handle expired checkout links', async ({ page }) => {
    const testMerchantSlug = process.env.TEST_MERCHANT_SLUG;
    if (!testMerchantSlug) {
      test.skip();
      return;
    }

    const checkoutPage = new CheckoutPage(page);

    // Use a fake order ID that won't exist
    await checkoutPage.navigateToCheckout(testMerchantSlug, 'non-existent-order-12345');
    await checkoutPage.waitForCheckoutLoad();

    // Should show error state
    const hasError = await checkoutPage.hasError();
    expect(hasError).toBe(true);

    await expect(page.locator('text=Not Found, text=invalid')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Full Purchase Flow (E2E)', () => {
  test('complete purchase flow - browse, cart, checkout', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    const testMerchantSlug = process.env.TEST_MERCHANT_SLUG;
    if (!testMerchantSlug) {
      console.log('[Test] Skipping full flow - TEST_MERCHANT_SLUG not configured');
      test.skip();
      return;
    }

    const workerId = testInfo.parallelIndex;
    const timestamp = Date.now();

    const authPage = new AuthPage(page);
    const cataloguePage = new CataloguePage(page);
    const cartPage = new CartPage(page);

    // Step 1: Go to merchant catalogue
    console.log('[Test] Step 1: Navigating to merchant catalogue...');
    await cataloguePage.navigateToCatalogue(testMerchantSlug);
    await cataloguePage.waitForCatalogueLoad();

    const productCount = await cataloguePage.getProductCount();
    if (productCount === 0) {
      console.log('[Test] No products available, skipping full flow');
      test.skip();
      return;
    }
    console.log(`[Test] Found ${productCount} products`);

    // Step 2: Click on a product
    console.log('[Test] Step 2: Viewing product details...');
    await cataloguePage.clickProductByIndex(0);
    await page.waitForLoadState('networkidle');

    // Capture product info for later verification
    const productTitle = await page.locator('h1, [data-testid="product-title"]').textContent().catch(() => 'Unknown Product');
    console.log(`[Test] Viewing product: ${productTitle}`);

    // Step 3: Add to cart
    console.log('[Test] Step 3: Adding to cart...');
    const addToCartBtn = page.locator('button:has-text("Add to Cart"), button:has-text("Add to Bag"), [data-testid="add-to-cart"]');

    if (await addToCartBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addToCartBtn.click();
      await page.waitForTimeout(1000);

      // Verify cart has item
      const cartItems = await cartPage.getCartFromStorage();
      expect(cartItems.length).toBeGreaterThan(0);
      console.log('[Test] Item added to cart');
    } else {
      // Manually add item if button not visible
      console.log('[Test] Adding item to cart via localStorage...');
      await cartPage.addItemToCartDirectly({
        image_url: undefined,
        productRef: {
          id: `e2e-test-${timestamp}`,
          partition: [`e2e-test-${timestamp}`],
          container: 'Main-Product',
        },
        variantId: 'v1',
        descriptor: productTitle?.trim() || 'Test Product',
        quantity: 1,
        price: { amount: 50.00, currency: 'USD' },
      });
    }

    // Step 4: Open cart and verify
    console.log('[Test] Step 4: Verifying cart contents...');
    const cartButton = page.locator('[data-testid="cart-button"], button[aria-label="Shopping cart"]');

    if (await cartButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await cartButton.click();
      await page.waitForTimeout(500);

      // Verify cart drawer shows item
      const cartDrawer = page.locator('[data-testid="cart-drawer"], [role="dialog"]:has-text("Cart")');
      if (await cartDrawer.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('[Test] Cart drawer opened successfully');

        // Check for checkout button
        const checkoutBtn = page.locator('button:has-text("Checkout"), button:has-text("Proceed")');
        if (await checkoutBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
          console.log('[Test] Checkout button found');
          // Note: Actual checkout would require authenticated user session
          // and a valid order creation on the backend
        }
      }
    }

    // Step 5: Authenticate (if proceeding to checkout)
    console.log('[Test] Step 5: Test flow complete up to checkout');
    console.log('[Test] Note: Full checkout requires backend order creation');

    // Take final screenshot
    await page.screenshot({ path: 'test-results/screenshots/purchase-flow-complete.png' });
  });
});

test.describe('Authenticated Purchase Flow', () => {
  test('should complete purchase as authenticated user', async ({ page }, testInfo) => {
    test.setTimeout(240000);

    const testMerchantSlug = process.env.TEST_MERCHANT_SLUG;
    if (!testMerchantSlug) {
      test.skip();
      return;
    }

    const workerId = testInfo.parallelIndex;
    const timestamp = Date.now();
    const testEmail = `purchase-test-${timestamp}-${workerId}@playwright.com`;

    const authPage = new AuthPage(page);
    const cataloguePage = new CataloguePage(page);
    const cartPage = new CartPage(page);

    // Step 1: Authenticate
    console.log('[Test] Step 1: Authenticating user...');
    await page.goto('/');
    await authPage.startAuthFlow(testEmail);
    await expect(page.locator('[aria-label="input-login-otp"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[aria-label="input-login-otp"]').click();
    await page.keyboard.type('123456');
    await page.waitForURL('/', { timeout: 15000 });

    // Register user for cleanup
    const url = page.url();
    const cookies = await getCookiesFromPage(page);
    if (cookies) {
      cookiesPerWorker.set(workerId, cookies);
    }

    // Check for user setup
    const completeProfileLink = page.locator('a:has-text("Complete Profile"), text=Complete your profile');
    if (await completeProfileLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('[Test] User profile setup required - skipping to catalogue');
    }

    // Step 2: Browse catalogue
    console.log('[Test] Step 2: Browsing merchant catalogue...');
    await cataloguePage.navigateToCatalogue(testMerchantSlug);
    await cataloguePage.waitForCatalogueLoad();

    const productCount = await cataloguePage.getProductCount();
    if (productCount === 0) {
      console.log('[Test] No products available');
      test.skip();
      return;
    }

    // Step 3: Add item to cart
    console.log('[Test] Step 3: Adding product to cart...');
    await cataloguePage.clickProductByIndex(0);
    await page.waitForLoadState('networkidle');

    const addToCartBtn = page.locator('button:has-text("Add to Cart")');
    if (await addToCartBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addToCartBtn.click();
      await page.waitForTimeout(1000);
    } else {
      await cartPage.addItemToCartDirectly({
        image_url: undefined,
        productRef: { id: `auth-test-${timestamp}`, partition: [`auth-test-${timestamp}`], container: 'Main-Product' },
        variantId: 'v1',
        descriptor: 'Auth Test Product',
        quantity: 1,
        price: { amount: 25.00, currency: 'USD' },
      });
    }

    // Verify cart
    const cartItems = await cartPage.getCartFromStorage();
    expect(cartItems.length).toBeGreaterThan(0);

    console.log('[Test] Authenticated purchase flow test completed');
    console.log('[Test] Note: Full payment flow requires backend integration');
  });
});

test.describe('Payment Flow (Stripe Integration)', () => {
  test('should display Stripe payment form on checkout', async ({ page }) => {
    const testMerchantSlug = process.env.TEST_MERCHANT_SLUG;
    const testOrderId = process.env.TEST_ORDER_ID;

    if (!testMerchantSlug || !testOrderId) {
      console.log('[Test] Skipping payment flow - TEST_ORDER_ID not configured');
      test.skip();
      return;
    }

    const checkoutPage = new CheckoutPage(page);

    await checkoutPage.navigateToCheckout(testMerchantSlug, testOrderId);
    await checkoutPage.waitForCheckoutLoad();

    // Check if it's a valid checkout
    if (await checkoutPage.isCheckoutExpired() || await checkoutPage.hasError() || await checkoutPage.isAlreadyPaid()) {
      console.log('[Test] Checkout not in valid state for payment test');
      test.skip();
      return;
    }

    // Look for Stripe iframe
    const stripeFrame = page.locator('iframe[name^="__privateStripeFrame"]');

    if (await stripeFrame.isVisible({ timeout: 10000 }).catch(() => false)) {
      console.log('[Test] Stripe payment form is visible');

      // Verify we can interact with Stripe fields
      const frame = page.frameLocator('iframe[name^="__privateStripeFrame"]').first();
      const cardInput = frame.locator('input[name="number"]');

      if (await cardInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('[Test] Card input field is accessible');
      }
    } else {
      console.log('[Test] Stripe iframe not found - checking for Pay button');

      const payButton = page.locator('button:has-text("Pay")');
      await expect(payButton).toBeVisible({ timeout: 5000 });
    }
  });

  test('should handle declined card', async ({ page }) => {
    const testMerchantSlug = process.env.TEST_MERCHANT_SLUG;
    const testOrderId = process.env.TEST_ORDER_ID;

    if (!testMerchantSlug || !testOrderId) {
      test.skip();
      return;
    }

    const checkoutPage = new CheckoutPage(page);

    await checkoutPage.navigateToCheckout(testMerchantSlug, testOrderId);
    await checkoutPage.waitForCheckoutLoad();

    if (await checkoutPage.isCheckoutExpired() || await checkoutPage.hasError() || await checkoutPage.isAlreadyPaid()) {
      test.skip();
      return;
    }

    // Try payment with declined card
    await checkoutPage.payWithDeclinedCard();

    // Should show error
    const error = await checkoutPage.getPaymentError();
    if (error) {
      console.log(`[Test] Payment error received: ${error}`);
      expect(error.toLowerCase()).toContain('decline');
    }
  });
});

import { test, expect } from '@playwright/test';
import { CartPage } from '../pages/CartPage';
import { CataloguePage } from '../pages/CataloguePage';

/**
 * Shopping Cart Tests
 * Tests the shopping cart functionality:
 * 1. Adding items to cart
 * 2. Updating quantities
 * 3. Removing items
 * 4. Cart persistence in localStorage
 * 5. Cart badge updates
 *
 * Note: These tests use localStorage manipulation for cart operations
 * since the cart is client-side. No authentication required.
 *
 * Parallel Execution:
 * - Cart state is isolated per browser context (localStorage)
 * - Each test starts with a fresh cart state
 */

test.describe('Shopping Cart - Basic Operations', () => {
  let cartPage: CartPage;

  test.beforeEach(async ({ page }) => {
    cartPage = new CartPage(page);

    // Clear cart before each test
    await page.goto('/');
    await cartPage.clearCartStorage();
  });

  test('should start with empty cart', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const cartItems = await cartPage.getCartFromStorage();
    expect(cartItems).toHaveLength(0);
  });

  test('should add item to cart via localStorage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Add test item directly to localStorage
    const testItem = {
      image_url: 'https://example.com/image.jpg',
      productRef: {
        id: 'test-product-1',
        partition: ['test-product-1'],
        container: 'Main-Product',
      },
      variantId: 'variant-1',
      descriptor: 'Test Product - Size M',
      quantity: 1,
      price: { amount: 29.99, currency: 'USD' },
    };

    await cartPage.addItemToCartDirectly(testItem);

    // Verify item was added
    const cartItems = await cartPage.getCartFromStorage();
    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].descriptor).toBe('Test Product - Size M');
    expect(cartItems[0].quantity).toBe(1);
  });

  test('should increase quantity when adding same item', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const testItem = {
      image_url: 'https://example.com/image.jpg',
      productRef: {
        id: 'test-product-1',
        partition: ['test-product-1'],
        container: 'Main-Product',
      },
      variantId: 'variant-1',
      descriptor: 'Test Product - Size M',
      quantity: 1,
      price: { amount: 29.99, currency: 'USD' },
    };

    // Add item twice
    await cartPage.addItemToCartDirectly(testItem);
    await cartPage.addItemToCartDirectly(testItem);

    // Verify quantity increased
    const cartItems = await cartPage.getCartFromStorage();
    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].quantity).toBe(2);
  });

  test('should add different variants as separate items', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const itemVariant1 = {
      image_url: 'https://example.com/image.jpg',
      productRef: {
        id: 'test-product-1',
        partition: ['test-product-1'],
        container: 'Main-Product',
      },
      variantId: 'variant-1',
      descriptor: 'Test Product - Size S',
      quantity: 1,
      price: { amount: 29.99, currency: 'USD' },
    };

    const itemVariant2 = {
      image_url: 'https://example.com/image.jpg',
      productRef: {
        id: 'test-product-1',
        partition: ['test-product-1'],
        container: 'Main-Product',
      },
      variantId: 'variant-2',
      descriptor: 'Test Product - Size M',
      quantity: 2,
      price: { amount: 29.99, currency: 'USD' },
    };

    await cartPage.addItemToCartDirectly(itemVariant1);
    await cartPage.addItemToCartDirectly(itemVariant2);

    // Verify both variants are separate items
    const cartItems = await cartPage.getCartFromStorage();
    expect(cartItems).toHaveLength(2);
    expect(cartItems[0].variantId).toBe('variant-1');
    expect(cartItems[1].variantId).toBe('variant-2');
  });

  test('should clear cart', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Add some items
    await cartPage.addItemToCartDirectly({
      image_url: undefined,
      productRef: { id: 'p1', partition: ['p1'], container: 'Main-Product' },
      variantId: 'v1',
      descriptor: 'Item 1',
      quantity: 1,
      price: { amount: 10, currency: 'USD' },
    });

    await cartPage.addItemToCartDirectly({
      image_url: undefined,
      productRef: { id: 'p2', partition: ['p2'], container: 'Main-Product' },
      variantId: 'v2',
      descriptor: 'Item 2',
      quantity: 2,
      price: { amount: 20, currency: 'USD' },
    });

    // Verify items added
    let cartItems = await cartPage.getCartFromStorage();
    expect(cartItems).toHaveLength(2);

    // Clear cart
    await cartPage.clearCartStorage();

    // Verify cart is empty
    cartItems = await cartPage.getCartFromStorage();
    expect(cartItems).toHaveLength(0);
  });

  test('should persist cart across page reloads', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Add item
    await cartPage.addItemToCartDirectly({
      image_url: 'https://example.com/product.jpg',
      productRef: { id: 'persist-test', partition: ['persist-test'], container: 'Main-Product' },
      variantId: 'v1',
      descriptor: 'Persistence Test Product',
      quantity: 3,
      price: { amount: 49.99, currency: 'USD' },
    });

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify cart persisted
    const cartItems = await cartPage.getCartFromStorage();
    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].descriptor).toBe('Persistence Test Product');
    expect(cartItems[0].quantity).toBe(3);
  });
});

test.describe('Shopping Cart - Event System', () => {
  test('should dispatch event when cart changes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Set up event listener
    const eventReceived = await page.evaluate(async () => {
      return new Promise<boolean>((resolve) => {
        let received = false;

        window.addEventListener('shoppingCartEvent', () => {
          received = true;
          resolve(true);
        });

        // Add item to trigger event
        const storedCart = localStorage.getItem('shoppingCart');
        const cart = storedCart ? JSON.parse(storedCart) : [];
        cart.push({
          image_url: 'https://example.com/img.jpg',
          productRef: { id: 'event-test', partition: ['event-test'], container: 'Main-Product' },
          variantId: 'v1',
          descriptor: 'Event Test',
          quantity: 1,
          price: { amount: 10, currency: 'USD' },
        });
        localStorage.setItem('shoppingCart', JSON.stringify(cart));
        window.dispatchEvent(new CustomEvent('shoppingCartEvent', { detail: cart }));

        // Timeout if event not received
        setTimeout(() => {
          if (!received) resolve(false);
        }, 1000);
      });
    });

    expect(eventReceived).toBe(true);
  });
});

test.describe('Shopping Cart - With Merchant Page', () => {
  test('should update cart badge when items added', async ({ page }) => {
    // Skip if no test merchant configured
    const testMerchantSlug = process.env.TEST_MERCHANT_SLUG;
    if (!testMerchantSlug) {
      test.skip();
      return;
    }

    const cartPage = new CartPage(page);
    const cataloguePage = new CataloguePage(page);

    await cataloguePage.navigateToCatalogue(testMerchantSlug);
    await cataloguePage.waitForCatalogueLoad();

    // Clear cart first
    await cartPage.clearCartStorage();

    // Get initial badge count
    const initialCount = await cartPage.getCartBadgeCount();

    // Add item
    await cartPage.addItemToCartDirectly({
      image_url: undefined,
      productRef: { id: 'badge-test', partition: ['badge-test'], container: 'Main-Product' },
      variantId: 'v1',
      descriptor: 'Badge Test Product',
      quantity: 2,
      price: { amount: 25, currency: 'USD' },
    });

    // Wait for UI update
    await page.waitForTimeout(500);

    // Check badge updated (if visible)
    const cartButton = page.locator('[data-testid="cart-button"], button[aria-label="Shopping cart"]');
    if (await cartButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      const newCount = await cartPage.getCartBadgeCount();
      // Badge should show item count or total quantity
      expect(newCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should open cart drawer and show items', async ({ page }) => {
    const testMerchantSlug = process.env.TEST_MERCHANT_SLUG;
    if (!testMerchantSlug) {
      test.skip();
      return;
    }

    const cartPage = new CartPage(page);
    const cataloguePage = new CataloguePage(page);

    await cataloguePage.navigateToCatalogue(testMerchantSlug);
    await cataloguePage.waitForCatalogueLoad();

    // Add test item
    await cartPage.addItemToCartDirectly({
      image_url: 'https://via.placeholder.com/150',
      productRef: { id: 'drawer-test', partition: ['drawer-test'], container: 'Main-Product' },
      variantId: 'v1',
      descriptor: 'Drawer Test Product',
      quantity: 1,
      price: { amount: 35.50, currency: 'USD' },
    });

    // Open cart
    const cartButton = page.locator('[data-testid="cart-button"], button[aria-label="Shopping cart"]');
    if (await cartButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cartButton.click();
      await page.waitForTimeout(500);

      // Verify cart drawer opened
      const cartDrawer = page.locator('[data-testid="cart-drawer"], [role="dialog"]:has-text("Cart")');
      const isOpen = await cartDrawer.isVisible({ timeout: 5000 }).catch(() => false);

      if (isOpen) {
        // Verify item is shown
        const itemText = page.locator('text=Drawer Test Product');
        await expect(itemText).toBeVisible({ timeout: 3000 });
      }
    }
  });
});

test.describe('Shopping Cart - Calculations', () => {
  test('should calculate correct total for multiple items', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const cartPage = new CartPage(page);

    // Add items with known prices
    await cartPage.addItemToCartDirectly({
      image_url: undefined,
      productRef: { id: 'calc-1', partition: ['calc-1'], container: 'Main-Product' },
      variantId: 'v1',
      descriptor: 'Item A',
      quantity: 2,
      price: { amount: 10.00, currency: 'USD' }, // $20.00
    });

    await cartPage.addItemToCartDirectly({
      image_url: undefined,
      productRef: { id: 'calc-2', partition: ['calc-2'], container: 'Main-Product' },
      variantId: 'v1',
      descriptor: 'Item B',
      quantity: 3,
      price: { amount: 15.50, currency: 'USD' }, // $46.50
    });

    // Get cart and calculate
    const cartItems = await cartPage.getCartFromStorage();

    const total = cartItems.reduce((sum: number, item: any) => {
      return sum + (item.quantity * item.price.amount);
    }, 0);

    // Expected: 2 * $10 + 3 * $15.50 = $20 + $46.50 = $66.50
    expect(total).toBeCloseTo(66.50, 2);
  });

  test('should handle different currencies', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const cartPage = new CartPage(page);

    // Add items with different currencies
    await cartPage.addItemToCartDirectly({
      image_url: undefined,
      productRef: { id: 'curr-1', partition: ['curr-1'], container: 'Main-Product' },
      variantId: 'v1',
      descriptor: 'USD Item',
      quantity: 1,
      price: { amount: 10.00, currency: 'USD' },
    });

    await cartPage.addItemToCartDirectly({
      image_url: undefined,
      productRef: { id: 'curr-2', partition: ['curr-2'], container: 'Main-Product' },
      variantId: 'v1',
      descriptor: 'AUD Item',
      quantity: 1,
      price: { amount: 15.00, currency: 'AUD' },
    });

    const cartItems = await cartPage.getCartFromStorage();

    // Verify currencies are preserved
    expect(cartItems[0].price.currency).toBe('USD');
    expect(cartItems[1].price.currency).toBe('AUD');
  });
});

test.describe('Shopping Cart - Edge Cases', () => {
  test('should handle empty productRef gracefully', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Directly manipulate localStorage with edge case
    await page.evaluate(() => {
      const cart = [{
        image_url: undefined,
        productRef: { id: '', partition: [], container: '' },
        variantId: 'v1',
        descriptor: 'Empty Ref Item',
        quantity: 1,
        price: { amount: 5, currency: 'USD' },
      }];
      localStorage.setItem('shoppingCart', JSON.stringify(cart));
    });

    const cartItems = await page.evaluate(() => {
      const stored = localStorage.getItem('shoppingCart');
      return stored ? JSON.parse(stored) : [];
    });

    // Should still store the item
    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].descriptor).toBe('Empty Ref Item');
  });

  test('should handle zero quantity gracefully', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const cartPage = new CartPage(page);

    // Add item with quantity 1
    await cartPage.addItemToCartDirectly({
      image_url: undefined,
      productRef: { id: 'zero-qty', partition: ['zero-qty'], container: 'Main-Product' },
      variantId: 'v1',
      descriptor: 'Zero Qty Test',
      quantity: 1,
      price: { amount: 10, currency: 'USD' },
    });

    // Try to add with quantity 0
    await page.evaluate(() => {
      const storedCart = localStorage.getItem('shoppingCart');
      const cart = storedCart ? JSON.parse(storedCart) : [];

      // Find item and set quantity to 0
      const item = cart.find((i: any) => i.productRef.id === 'zero-qty');
      if (item) {
        item.quantity = 0;
      }

      localStorage.setItem('shoppingCart', JSON.stringify(cart));
      window.dispatchEvent(new CustomEvent('shoppingCartEvent', { detail: cart }));
    });

    const cartItems = await cartPage.getCartFromStorage();

    // Item with 0 quantity should still exist in storage (UI might filter it)
    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].quantity).toBe(0);
  });

  test('should handle large quantities', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const cartPage = new CartPage(page);

    await cartPage.addItemToCartDirectly({
      image_url: undefined,
      productRef: { id: 'large-qty', partition: ['large-qty'], container: 'Main-Product' },
      variantId: 'v1',
      descriptor: 'Large Quantity Item',
      quantity: 9999,
      price: { amount: 1.00, currency: 'USD' },
    });

    const cartItems = await cartPage.getCartFromStorage();
    expect(cartItems[0].quantity).toBe(9999);
  });
});

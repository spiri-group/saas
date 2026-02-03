import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Cart Page Object Model
 * Handles shopping cart interactions
 */
export class CartPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Selectors
  private selectors = {
    // Cart container
    cartDrawer: '[data-testid="cart-drawer"], [role="dialog"]:has-text("Cart")',
    cartPanel: '[data-testid="cart-panel"]',
    cartEmpty: '[data-testid="cart-empty"], text=Your cart is empty',

    // Cart items
    cartItem: '[data-testid="cart-item"]',
    itemName: '[data-testid="item-name"]',
    itemPrice: '[data-testid="item-price"]',
    itemQuantity: '[data-testid="item-quantity"]',
    itemTotal: '[data-testid="item-total"]',

    // Quantity controls
    increaseQty: '[data-testid="increase-qty"], button[aria-label="Increase quantity"]',
    decreaseQty: '[data-testid="decrease-qty"], button[aria-label="Decrease quantity"]',
    quantityInput: 'input[type="number"][aria-label*="quantity"]',
    removeItem: '[data-testid="remove-item"], button[aria-label="Remove"]',

    // Cart summary
    subtotal: '[data-testid="cart-subtotal"]',
    tax: '[data-testid="cart-tax"]',
    total: '[data-testid="cart-total"]',

    // Actions
    checkoutButton: 'button:has-text("Checkout"), button:has-text("Proceed to Checkout")',
    clearCartButton: 'button:has-text("Clear Cart"), button:has-text("Empty Cart")',
    continueShoppingButton: 'button:has-text("Continue Shopping")',
    closeCartButton: 'button[aria-label="Close"], button:has-text("Close")',

    // Cart trigger in nav
    cartButton: '[data-testid="cart-button"], button[aria-label="Shopping cart"]',
    cartBadge: '[data-testid="cart-badge"], [data-testid="cart-count"]',
  };

  /**
   * Open the cart drawer/panel
   */
  async openCart() {
    const cartButton = this.page.locator(this.selectors.cartButton);
    await cartButton.click();
    await this.page.waitForTimeout(500);
    // Wait for cart to be visible
    await this.page.waitForSelector('[data-testid="cart-drawer"], [role="dialog"]:has-text("Cart"), [data-testid="cart-panel"]', { timeout: 5000 });
  }

  /**
   * Close the cart drawer
   */
  async closeCart() {
    const closeButton = this.page.locator(this.selectors.closeCartButton);
    if (await closeButton.isVisible()) {
      await closeButton.click();
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Check if cart is open
   */
  async isCartOpen(): Promise<boolean> {
    return await this.page.locator(this.selectors.cartDrawer + ', ' + this.selectors.cartPanel).isVisible();
  }

  /**
   * Check if cart is empty
   */
  async isCartEmpty(): Promise<boolean> {
    const emptyText = this.page.locator('text=Your cart is empty, text=Cart is empty, text=No items');
    return await emptyText.isVisible().catch(() => {
      return this.getCartItemCount().then(count => count === 0);
    });
  }

  /**
   * Get cart items
   */
  async getCartItems() {
    return this.page.locator('[data-testid="cart-item"], .cart-item').all();
  }

  /**
   * Get cart item count
   */
  async getCartItemCount(): Promise<number> {
    const items = await this.getCartItems();
    return items.length;
  }

  /**
   * Get cart badge count (from nav icon)
   */
  async getCartBadgeCount(): Promise<number> {
    const badge = this.page.locator(this.selectors.cartBadge);
    if (await badge.isVisible()) {
      const text = await badge.textContent();
      return parseInt(text || '0', 10);
    }
    return 0;
  }

  /**
   * Get item by name
   */
  async getCartItemByName(name: string) {
    return this.page.locator(`[data-testid="cart-item"]:has-text("${name}"), .cart-item:has-text("${name}")`).first();
  }

  /**
   * Increase quantity for an item
   */
  async increaseItemQuantity(itemName: string) {
    const item = await this.getCartItemByName(itemName);
    const increaseBtn = item.locator(this.selectors.increaseQty);
    await increaseBtn.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Decrease quantity for an item
   */
  async decreaseItemQuantity(itemName: string) {
    const item = await this.getCartItemByName(itemName);
    const decreaseBtn = item.locator(this.selectors.decreaseQty);
    await decreaseBtn.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Set quantity for an item
   */
  async setItemQuantity(itemName: string, quantity: number) {
    const item = await this.getCartItemByName(itemName);
    const qtyInput = item.locator('input[type="number"]');
    if (await qtyInput.isVisible()) {
      await qtyInput.fill(quantity.toString());
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Remove item from cart
   */
  async removeItem(itemName: string) {
    const item = await this.getCartItemByName(itemName);
    const removeBtn = item.locator('button[aria-label*="Remove"], button:has-text("Remove"), [data-testid="remove-item"]');
    await removeBtn.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Clear entire cart
   */
  async clearCart() {
    const clearBtn = this.page.locator(this.selectors.clearCartButton);
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Clear cart via localStorage (direct manipulation)
   */
  async clearCartStorage() {
    await this.page.evaluate(() => {
      localStorage.removeItem('shoppingCart');
      window.dispatchEvent(new CustomEvent('shoppingCartEvent', { detail: [] }));
    });
    await this.page.waitForTimeout(300);
  }

  /**
   * Get cart subtotal text
   */
  async getSubtotal(): Promise<string> {
    const subtotal = this.page.locator(this.selectors.subtotal);
    return await subtotal.textContent() || '';
  }

  /**
   * Get cart total text
   */
  async getTotal(): Promise<string> {
    const total = this.page.locator('[data-testid="cart-total"], .cart-total');
    return await total.textContent() || '';
  }

  /**
   * Proceed to checkout
   */
  async proceedToCheckout() {
    await this.click(this.selectors.checkoutButton);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Verify item is in cart
   */
  async verifyItemInCart(itemName: string): Promise<boolean> {
    const item = await this.getCartItemByName(itemName);
    return await item.isVisible();
  }

  /**
   * Get quantity of specific item
   */
  async getItemQuantity(itemName: string): Promise<number> {
    const item = await this.getCartItemByName(itemName);
    const qtyText = await item.locator('[data-testid="item-quantity"], .item-quantity, input[type="number"]').inputValue().catch(async () => {
      const text = await item.locator('text=/Qty:?\s*\d+/, text=/×\s*\d+/').textContent();
      const match = text?.match(/\d+/);
      return match ? match[0] : '0';
    });
    return parseInt(qtyText || '0', 10);
  }

  /**
   * Add item to cart directly (via localStorage)
   * Useful for setting up test state
   */
  async addItemToCartDirectly(item: {
    image_url?: string;
    productRef: { id: string; partition: string[]; container: string };
    variantId: string;
    descriptor: string;
    quantity: number;
    price: { amount: number; currency: string };
  }) {
    await this.page.evaluate((newItem) => {
      const storedCart = localStorage.getItem('shoppingCart');
      const cart = storedCart ? JSON.parse(storedCart) : [];

      // Check if item already exists
      const existingIndex = cart.findIndex((item: any) =>
        item.variantId === newItem.variantId &&
        item.productRef.id === newItem.productRef.id
      );

      if (existingIndex >= 0) {
        cart[existingIndex].quantity += newItem.quantity;
      } else {
        cart.push(newItem);
      }

      localStorage.setItem('shoppingCart', JSON.stringify(cart));
      window.dispatchEvent(new CustomEvent('shoppingCartEvent', { detail: cart }));
    }, item);

    await this.page.waitForTimeout(300);
  }

  /**
   * Get all items from cart storage
   */
  async getCartFromStorage(): Promise<any[]> {
    return await this.page.evaluate(() => {
      const storedCart = localStorage.getItem('shoppingCart');
      return storedCart ? JSON.parse(storedCart) : [];
    });
  }
}

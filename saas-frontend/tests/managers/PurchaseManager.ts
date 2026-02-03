import { Page, expect } from '@playwright/test';

/**
 * PurchaseManager - Handles complete purchase flows in e2e tests
 *
 * Consolidates duplicated cart, checkout, and payment logic across test files.
 * Works with both practitioner services and merchant products.
 */

export interface BillingAddress {
  name: string;
  line1: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface PurchaseResult {
  success: boolean;
  orderId?: string;
  error?: string;
}

export interface PurchaseOptions {
  /** Skip billing address entry (use if already saved) */
  skipBilling?: boolean;
  /** Billing address details */
  billing?: BillingAddress;
  /** Card number (default: 4242424242424242 - Stripe test card) */
  cardNumber?: string;
  /** Card expiry (default: 12/34) */
  cardExpiry?: string;
  /** Card CVC (default: 123) */
  cardCvc?: string;
  /** Timeout for payment success (default: 60000ms) */
  paymentTimeout?: number;
}

const DEFAULT_BILLING: BillingAddress = {
  name: 'Test Customer',
  line1: '123 Test Street',
  city: 'Sydney',
  state: 'NSW',
  postalCode: '2000',
  country: 'AU',
};

const DEFAULT_OPTIONS: Required<PurchaseOptions> = {
  skipBilling: false,
  billing: DEFAULT_BILLING,
  cardNumber: '4242424242424242',
  cardExpiry: '12/34',
  cardCvc: '123',
  paymentTimeout: 90000, // 90 seconds - allows time for Stripe webhook processing
};

export class PurchaseManager {
  constructor(private page: Page) {}

  /**
   * Add a service/product to cart from its detail page
   */
  async addToCart(): Promise<void> {
    const addToCartBtn = this.page.getByTestId('add-to-cart-btn');
    await expect(addToCartBtn).toBeVisible({ timeout: 15000 });
    await addToCartBtn.click();
    await this.page.waitForTimeout(2000);

    // Verify cart updated
    const cartCount = this.page.getByTestId('cart-count');
    await expect(cartCount).toHaveText(/[1-9]/, { timeout: 10000 });
    console.log('[PurchaseManager] Item added to cart');
  }

  /**
   * Open the cart drawer/panel
   */
  async openCart(): Promise<void> {
    const cartButton = this.page.locator('button[aria-label*="cart" i], [data-testid="cart-button"]').first();
    await cartButton.click();
    await this.page.waitForTimeout(1500);
    console.log('[PurchaseManager] Cart opened');
  }

  /**
   * Verify an item is in the cart
   */
  async verifyItemInCart(itemName: string): Promise<void> {
    // Scope to modal/cart drawer to avoid matching page title or toast notifications
    const cartContainer = this.page.locator('#modal-div, [data-testid="cart-drawer"]').first();
    await expect(cartContainer.getByText(itemName).first()).toBeVisible({ timeout: 10000 });
    console.log(`[PurchaseManager] Verified "${itemName}" in cart`);
  }

  /**
   * Proceed from cart to checkout
   */
  async proceedToCheckout(): Promise<void> {
    // Wait for checkout button (may show "Checkout", "Loading payment ...", or "Error")
    const checkoutBtn = this.page.getByTestId('checkout-btn');
    await expect(checkoutBtn).toBeVisible({ timeout: 10000 });

    // Wait for button to be ready (not loading)
    const buttonText = await checkoutBtn.innerText();
    if (buttonText === 'Error') {
      throw new Error('Cart is in error state - order creation likely failed');
    }

    // Wait for idle state (shows "Checkout")
    await expect(checkoutBtn).toHaveText('Checkout', { timeout: 10000 });
    await expect(checkoutBtn).toBeEnabled({ timeout: 5000 });
    await checkoutBtn.click();
    console.log('[PurchaseManager] Clicked checkout button');

    // Wait for checkout dialog to appear OR error state
    const checkoutDialog = this.page.locator('dialog, [role="dialog"]');
    const errorButton = this.page.getByTestId('checkout-btn').filter({ hasText: 'Error' });

    try {
      await expect(checkoutDialog.or(errorButton)).toBeVisible({ timeout: 15000 });

      if (await errorButton.isVisible().catch(() => false)) {
        throw new Error('Order creation failed - checkout button shows Error');
      }

      console.log('[PurchaseManager] Proceeded to checkout');
    } catch (e) {
      // Check if we're stuck on loading or error
      const currentText = await checkoutBtn.innerText();
      throw new Error(`Failed to proceed to checkout. Button state: "${currentText}". ${e.message}`);
    }
  }

  /**
   * Fill billing address in checkout using manual entry
   * Users with no saved addresses will see manual entry form by default
   */
  async fillBillingAddress(address: BillingAddress = DEFAULT_BILLING): Promise<void> {
    // Scope all selectors to the checkout dialog
    const dialog = this.page.locator('dialog, [role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 10000 });
    console.log('[PurchaseManager] Checkout dialog visible');

    // Wait for checkout to finish loading
    const loadingCheckout = dialog.locator('text=Loading checkout');
    if (await loadingCheckout.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('[PurchaseManager] Waiting for checkout to load...');
      await loadingCheckout.waitFor({ state: 'hidden', timeout: 15000 });
    }

    const loadingAddresses = dialog.locator('text=Loading your addresses');
    if (await loadingAddresses.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('[PurchaseManager] Waiting for addresses to load...');
      await loadingAddresses.waitFor({ state: 'hidden', timeout: 15000 });
    }

    await this.page.waitForTimeout(2000); // Wait for React state updates after loading

    // Click on billing section header to expand it - need to click the container, not just text
    // The clickable area is the CardHeader which contains "Billing Address" text
    const billingSection = dialog.locator('div:has-text("Billing Address")').filter({ has: this.page.locator('svg') }).first();
    console.log('[PurchaseManager] Clicking billing section to expand...');
    await billingSection.click();
    await this.page.waitForTimeout(2000); // Wait for animation

    // Check if manual form is visible OR if we need to click toggle
    let nameLabel = dialog.getByLabel('Full Name');
    const manualToggle = dialog.locator('button:has-text("Enter details manually")');

    // Check if it expanded - if not, try clicking more specifically
    if (!(await nameLabel.isVisible({ timeout: 2000 }).catch(() => false)) &&
        !(await manualToggle.isVisible({ timeout: 1000 }).catch(() => false))) {
      console.log('[PurchaseManager] Section may not have expanded, trying again...');
      // Try clicking the parent of the billing text
      const billingText = dialog.locator('text=Billing Address').first();
      await billingText.click({ force: true });
      await this.page.waitForTimeout(2000);
    }

    // First check if we see the Google search mode (which means we need to click toggle)
    if (await manualToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('[PurchaseManager] Google mode showing, clicking manual toggle');
      await manualToggle.click({ force: true });
      await this.page.waitForTimeout(2000); // Wait for toggle animation
    }

    // Now wait for the manual form to appear
    if (await nameLabel.isVisible({ timeout: 8000 }).catch(() => false)) {
      console.log('[PurchaseManager] Manual address form visible, filling fields');
      await nameLabel.fill(address.name);
      await dialog.getByLabel('Address Line 1').fill(address.line1);
      await dialog.getByLabel('City').fill(address.city);
      if (address.state) {
        await dialog.getByLabel('State').fill(address.state);
      }
      await dialog.getByLabel('Postal Code').fill(address.postalCode);
      await dialog.getByLabel('Country').fill(address.country);

      const saveAddress = dialog.locator('button:has-text("Save Address")');
      await expect(saveAddress).toBeVisible({ timeout: 5000 });
      await saveAddress.click();
      console.log('[PurchaseManager] Clicked Save Address');

      // Wait for billing address to be saved and section to collapse
      await this.page.waitForTimeout(3000);

      // Verify billing is complete by checking for green indicator
      const billingComplete = dialog.locator('.bg-green-500').first();
      if (await billingComplete.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('[PurchaseManager] Billing address saved successfully (green indicator)');
      } else {
        console.log('[PurchaseManager] Billing address saved (no green indicator visible)');
      }
    } else {
      console.log('[PurchaseManager] Warning: Could not find billing address form');
      // Take screenshot for debugging
      await this.page.screenshot({ path: 'billing-form-not-found.png' });
    }
  }

  /**
   * Fill Stripe payment card details
   */
  async fillCardDetails(
    cardNumber: string = '4242424242424242',
    expiry: string = '12/34',
    cvc: string = '123'
  ): Promise<void> {
    // Expand payment section if collapsed - click on the Payment Method header
    const paymentSection = this.page.locator('text=Payment Method').first();
    if (await paymentSection.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Check if it's collapsed (no Stripe iframes visible yet)
      const stripeCheck = this.page.locator('iframe[name^="__privateStripeFrame"]');
      if (!(await stripeCheck.first().isVisible({ timeout: 2000 }).catch(() => false))) {
        await paymentSection.click();
        console.log('[PurchaseManager] Expanded payment section');
        await this.page.waitForTimeout(3000); // Wait for Stripe to load
      }
    }

    // Wait for Stripe iframes to load
    const stripeFrames = this.page.locator('iframe[name^="__privateStripeFrame"]');
    await expect(stripeFrames.first()).toBeVisible({ timeout: 30000 });
    await this.page.waitForTimeout(2000);
    console.log('[PurchaseManager] Stripe iframes visible');

    // Fill card details in Stripe iframes
    const frameCount = await stripeFrames.count();
    console.log(`[PurchaseManager] Found ${frameCount} Stripe frames`);

    for (let i = 0; i < frameCount; i++) {
      const frame = this.page.frameLocator('iframe[name^="__privateStripeFrame"]').nth(i);

      const numberInput = frame.locator('input[name="number"]');
      if (await numberInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await numberInput.fill(cardNumber);
        console.log('[PurchaseManager] Filled card number');
      }

      const expiryInput = frame.locator('input[name="expiry"]');
      if (await expiryInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expiryInput.fill(expiry);
        console.log('[PurchaseManager] Filled expiry');
      }

      const cvcInput = frame.locator('input[name="cvc"]');
      if (await cvcInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cvcInput.fill(cvc);
        console.log('[PurchaseManager] Filled CVC');
      }
    }

    console.log('[PurchaseManager] Card details filled');
  }

  /**
   * Submit payment and wait for success
   * @param timeout - Maximum time to wait for payment confirmation (default: 90s)
   *
   * NOTE: This requires Stripe webhooks to be forwarded to the local backend.
   * Run: `stripe listen --forward-to localhost:7071/api/payments`
   * Without webhook forwarding, the payment will be processed by Stripe but
   * the frontend won't receive confirmation.
   */
  async submitPayment(timeout: number = 90000): Promise<void> {
    const payButton = this.page.locator('button:has-text("Finish & Pay"), button:has-text("Pay")').first();
    await expect(payButton).toBeEnabled({ timeout: 10000 });
    await payButton.click();
    console.log('[PurchaseManager] Payment submitted');

    // Wait for "Payment successful" - this requires the webhook to process successfully
    const paymentSuccess = this.page.locator('text=Payment successful');

    // First wait for the processing dialog to appear (indicates Stripe received payment)
    const processingDialog = this.page.locator('text=Processing Payment');
    await expect(processingDialog).toBeVisible({ timeout: 30000 });
    console.log('[PurchaseManager] Payment submitted to Stripe, waiting for webhook confirmation...');

    // Now wait for "Payment successful" which indicates webhook processed successfully
    await expect(paymentSuccess).toBeVisible({ timeout: timeout - 30000 });
    console.log('[PurchaseManager] Payment successful');
  }

  /**
   * Complete the full checkout flow (billing + payment)
   */
  async completeCheckout(options: PurchaseOptions = {}): Promise<void> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    if (!opts.skipBilling) {
      await this.fillBillingAddress(opts.billing);
    }

    await this.fillCardDetails(opts.cardNumber, opts.cardExpiry, opts.cardCvc);
    await this.submitPayment(opts.paymentTimeout);
  }

  /**
   * Complete full purchase flow from service detail page
   *
   * Assumes you're already on the service/product detail page.
   * Handles: add to cart -> open cart -> checkout -> billing -> payment
   */
  async completePurchaseFromDetailPage(
    itemName: string,
    options: PurchaseOptions = {}
  ): Promise<PurchaseResult> {
    try {
      await this.addToCart();
      await this.openCart();
      await this.verifyItemInCart(itemName);
      await this.proceedToCheckout();
      await this.completeCheckout(options);

      return { success: true };
    } catch (error: any) {
      console.error('[PurchaseManager] Purchase failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verify checkout is ready (cart has items, checkout button enabled)
   *
   * Use this for tests that just want to verify the flow works
   * without actually completing the purchase.
   */
  async verifyCheckoutReady(itemName: string): Promise<void> {
    await this.openCart();
    await this.verifyItemInCart(itemName);

    const checkoutBtn = this.page.getByTestId('checkout-btn');
    await expect(checkoutBtn).toBeVisible({ timeout: 5000 });
    await expect(checkoutBtn).toBeEnabled({ timeout: 5000 });

    console.log('[PurchaseManager] Checkout ready - verified');
  }

  /**
   * Quick purchase - add to cart and complete checkout in one call
   *
   * Use when you're already on the service/product page and just
   * want to quickly complete a purchase for test setup.
   */
  async quickPurchase(itemName: string, billing?: BillingAddress): Promise<PurchaseResult> {
    return this.completePurchaseFromDetailPage(itemName, {
      billing: billing || DEFAULT_BILLING,
    });
  }
}

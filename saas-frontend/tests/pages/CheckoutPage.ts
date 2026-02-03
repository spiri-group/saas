import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Checkout Page Object Model
 * Handles checkout and payment flows
 */
export class CheckoutPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Selectors
  private selectors = {
    // Page structure
    checkoutContainer: '[data-testid="checkout-container"]',
    loadingState: 'text=Loading checkout',

    // Order summary
    orderItems: '[data-testid="order-items"]',
    orderItem: '[data-testid="order-item"]',
    itemName: '[data-testid="item-name"]',
    itemQuantity: '[data-testid="item-quantity"]',
    itemPrice: '[data-testid="item-price"]',

    // Payment summary
    paymentSummary: '[data-testid="payment-summary"]',
    subtotal: '[data-testid="subtotal"]',
    tax: '[data-testid="tax"]',
    shipping: '[data-testid="shipping"]',
    total: '[data-testid="total"]',

    // Customer info
    customerEmail: '[data-testid="customer-email"]',
    shippingAddress: '[data-testid="shipping-address"]',

    // Stripe payment elements
    stripeFrame: 'iframe[name^="__privateStripeFrame"]',
    cardNumberInput: 'input[name="number"]',
    cardExpiryInput: 'input[name="expiry"]',
    cardCvcInput: 'input[name="cvc"]',

    // Actions
    payButton: 'button:has-text("Pay Now"), button:has-text("Complete Payment")',
    backButton: 'button:has-text("Back")',

    // Status messages
    expiredMessage: 'text=Checkout Link Expired',
    alreadyPaidMessage: 'text=Already Paid',
    errorMessage: 'text=Checkout Link Not Found',
    successMessage: 'text=Payment successful, text=Order confirmed',

    // Security badge
    securityBadge: '[data-testid="security-badge"], text=secured by Stripe',
  };

  /**
   * Navigate to checkout page
   */
  async navigateToCheckout(merchantSlug: string, orderId: string) {
    await this.goto(`/m/${merchantSlug}/checkout/${orderId}`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for checkout page to load
   */
  async waitForCheckoutLoad() {
    // Wait for loading state to disappear
    await this.page.waitForSelector(this.selectors.loadingState, { state: 'hidden', timeout: 15000 }).catch(() => {});
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if checkout is expired
   */
  async isCheckoutExpired(): Promise<boolean> {
    return await this.page.locator(this.selectors.expiredMessage).isVisible();
  }

  /**
   * Check if already paid
   */
  async isAlreadyPaid(): Promise<boolean> {
    return await this.page.locator(this.selectors.alreadyPaidMessage).isVisible();
  }

  /**
   * Check if checkout has error
   */
  async hasError(): Promise<boolean> {
    return await this.page.locator(this.selectors.errorMessage).isVisible();
  }

  /**
   * Get order items count
   */
  async getOrderItemCount(): Promise<number> {
    const items = await this.page.locator('[data-testid="order-item"], .order-item').all();
    return items.length;
  }

  /**
   * Get order item names
   */
  async getOrderItemNames(): Promise<string[]> {
    const names = await this.page.locator('[data-testid="item-name"], .item-name').allTextContents();
    return names.map(n => n.trim());
  }

  /**
   * Get total amount text
   */
  async getTotalAmount(): Promise<string> {
    const total = this.page.locator('[data-testid="total"], .total-amount, text=/Total/i').last();
    const text = await total.textContent();
    return text || '';
  }

  /**
   * Get customer email
   */
  async getCustomerEmail(): Promise<string> {
    const emailElement = this.page.locator('[data-testid="customer-email"], .customer-email');
    if (await emailElement.isVisible()) {
      return await emailElement.textContent() || '';
    }
    // Try to find email in text
    const emailText = await this.page.locator('text=/@/').first().textContent();
    return emailText || '';
  }

  /**
   * Fill Stripe card details
   * @param cardNumber - Test card number (default: 4242424242424242)
   * @param expiry - Expiry date (default: 12/34)
   * @param cvc - CVC code (default: 123)
   */
  async fillCardDetails(
    cardNumber: string = '4242424242424242',
    expiry: string = '12/34',
    cvc: string = '123'
  ) {
    // Wait for Stripe frame to load
    await this.page.waitForTimeout(1000);

    // Get the Stripe iframe
    const stripeFrame = this.page.frameLocator('iframe[name^="__privateStripeFrame"]').first();

    // Fill card number
    const cardInput = stripeFrame.locator('input[name="number"]');
    await cardInput.waitFor({ state: 'visible', timeout: 10000 });
    await cardInput.fill(cardNumber);

    // Fill expiry
    const expiryInput = stripeFrame.locator('input[name="expiry"]');
    await expiryInput.fill(expiry);

    // Fill CVC
    const cvcInput = stripeFrame.locator('input[name="cvc"]');
    await cvcInput.fill(cvc);

    await this.page.waitForTimeout(500);
  }

  /**
   * Submit payment
   */
  async submitPayment() {
    const payButton = this.page.locator(this.selectors.payButton);
    await payButton.click();

    // Wait for payment to process
    await this.page.waitForTimeout(2000);
  }

  /**
   * Complete the full payment flow
   */
  async completePayment(
    cardNumber: string = '4242424242424242',
    expiry: string = '12/34',
    cvc: string = '123'
  ) {
    await this.fillCardDetails(cardNumber, expiry, cvc);
    await this.submitPayment();

    // Wait for success or redirect
    await this.page.waitForTimeout(5000);
  }

  /**
   * Check if payment was successful
   */
  async isPaymentSuccessful(): Promise<boolean> {
    // Check for success message or redirect to confirmation
    const successIndicators = [
      this.page.locator('text=Payment successful'),
      this.page.locator('text=Order confirmed'),
      this.page.locator('text=Thank you'),
    ];

    for (const indicator of successIndicators) {
      if (await indicator.isVisible({ timeout: 5000 }).catch(() => false)) {
        return true;
      }
    }

    // Check if URL changed to confirmation page
    const url = this.page.url();
    return url.includes('confirmation') || url.includes('success') || url.includes('thank-you');
  }

  /**
   * Verify order details
   */
  async verifyOrderDetails(expectedItems: { name: string; quantity: number }[]): Promise<boolean> {
    const itemNames = await this.getOrderItemNames();

    for (const expected of expectedItems) {
      if (!itemNames.some(name => name.includes(expected.name))) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get payment error message
   */
  async getPaymentError(): Promise<string | null> {
    const errorElement = this.page.locator('[data-testid="payment-error"], .error-message, [role="alert"]');
    if (await errorElement.isVisible()) {
      return await errorElement.textContent();
    }
    return null;
  }

  /**
   * Check if page shows security badge
   */
  async hasSecurityBadge(): Promise<boolean> {
    return await this.page.locator(this.selectors.securityBadge).isVisible();
  }

  /**
   * Fill shipping address (if required)
   */
  async fillShippingAddress(address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  }) {
    const streetInput = this.page.locator('input[name="street"], input[placeholder*="Street"]');
    if (await streetInput.isVisible()) {
      await streetInput.fill(address.street);

      const cityInput = this.page.locator('input[name="city"], input[placeholder*="City"]');
      await cityInput.fill(address.city);

      const stateInput = this.page.locator('input[name="state"], input[placeholder*="State"]');
      await stateInput.fill(address.state);

      const zipInput = this.page.locator('input[name="zip"], input[placeholder*="Zip"]');
      await zipInput.fill(address.zip);

      // Country might be a select
      const countryInput = this.page.locator('select[name="country"], input[name="country"]');
      if (await countryInput.isVisible()) {
        await countryInput.fill(address.country);
      }
    }
  }

  /**
   * Test with declined card
   */
  async payWithDeclinedCard() {
    await this.fillCardDetails('4000000000000002', '12/34', '123'); // Stripe declined test card
    await this.submitPayment();
    await this.page.waitForTimeout(3000);
  }

  /**
   * Test with insufficient funds card
   */
  async payWithInsufficientFunds() {
    await this.fillCardDetails('4000000000009995', '12/34', '123'); // Stripe insufficient funds test card
    await this.submitPayment();
    await this.page.waitForTimeout(3000);
  }
}

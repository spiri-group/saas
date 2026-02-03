import { Page, expect } from '@playwright/test';

export class ReadingRequestPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Navigation - opens SpiriReading dialog from sidenav
  async goto(userId: string) {
    await this.page.goto(`/u/${userId}/space`);
    await this.page.waitForLoadState('networkidle');
  }

  async openSpiriReadingDialog() {
    // First expand the Readings menu if not already expanded
    const readingsMenuItem = this.page.locator('[aria-label="personal-space-side-nav"]').getByRole('menuitem', { name: 'Readings' });
    await readingsMenuItem.click();
    await this.page.waitForTimeout(500); // Wait for submenu animation

    // Click the SpiriReading menuitem in the submenu (use exact match to avoid matching the summary text)
    const spiriReadingMenuItem = this.page.getByRole('menuitem', { name: 'SpiriReading', exact: true });
    await spiriReadingMenuItem.click();

    // Wait for dialog to open
    await expect(this.page.locator('[role="dialog"]')).toBeVisible({ timeout: 10000 });
  }

  async waitForPageLoad() {
    // Wait for wizard step 1 (Topic & Context) inside the dialog
    await expect(this.page.locator('h2:has-text("Request a SpiriReading")')).toBeVisible({ timeout: 10000 });
    // Wait for topic select to be visible (step 1 element)
    await expect(this.page.locator('[data-testid="topic-select"]')).toBeVisible({ timeout: 15000 });
  }

  // Navigate to step 2 (spread selection)
  async goToStep2() {
    await this.page.locator('button:has-text("Next: Choose Spread")').click();
    // Wait for spread cards to load
    await expect(this.page.locator('[data-testid^="spread-card-"]').first()).toBeVisible({ timeout: 15000 });
  }

  // Navigate back to step 1
  async goToStep1() {
    const backButton = this.page.locator('button:has-text("Back")');
    // Use force click if element is outside viewport due to dialog content overflow
    await backButton.click({ force: true });
    await expect(this.page.locator('[data-testid="topic-select"]')).toBeVisible({ timeout: 5000 });
  }

  // Spread selection
  async selectSpread(spreadType: 'SINGLE' | 'THREE_CARD' | 'FIVE_CARD') {
    await this.page.locator(`[data-testid="spread-card-${spreadType}"]`).click();
  }

  async isSpreadSelected(spreadType: string): Promise<boolean> {
    const card = this.page.locator(`[data-testid="spread-card-${spreadType}"]`);
    const className = await card.getAttribute('class');
    return className?.includes('border-purple-500') ?? false;
  }

  // Form inputs
  async selectTopic(topicValue: 'love' | 'relationships' | 'marriage' | 'career' | 'finances' | 'health' | 'family' | 'spiritual' | 'life-path' | 'decisions' | 'general' | 'other') {
    await this.page.locator('[data-testid="topic-select"]').click();
    // Wait for the dropdown to open and select the option
    await this.page.locator(`[role="option"]:has-text("${this.getTopicLabel(topicValue)}")`).click();
  }

  async setCustomTopic(customTopic: string) {
    await this.page.locator('[data-testid="custom-topic-input"]').fill(customTopic);
  }

  private getTopicLabel(value: string): string {
    const labels: Record<string, string> = {
      'love': 'Love & Romance',
      'relationships': 'Relationships',
      'marriage': 'Marriage',
      'career': 'Career & Work',
      'finances': 'Finances & Money',
      'health': 'Health & Wellbeing',
      'family': 'Family',
      'spiritual': 'Spiritual Growth',
      'life-path': 'Life Path & Purpose',
      'decisions': 'Decision Making',
      'general': 'General Guidance',
      'other': 'Other',
    };
    return labels[value] || value;
  }

  async setContext(context: string) {
    await this.page.locator('[data-testid="context-input"]').fill(context);
  }

  // Submit - opens checkout dialog OR submits directly if saved card selected
  async submitRequest() {
    const submitButton = this.page.locator('[data-testid="submit-request-button"]');
    // Use force click if element is outside viewport due to dialog content overflow
    await submitButton.click({ force: true });
  }

  async isSubmitButtonEnabled(): Promise<boolean> {
    return await this.page.locator('[data-testid="submit-request-button"]').isEnabled();
  }

  async getSubmitButtonText(): Promise<string | null> {
    return await this.page.locator('[data-testid="submit-request-button"]').textContent();
  }

  // Saved card helpers
  async hasSavedCards(): Promise<boolean> {
    // Check if any saved card option is visible (not the "Use a different card" button)
    const savedCardButtons = this.page.locator('button:has(p:has-text("••••"))');
    return (await savedCardButtons.count()) > 0;
  }

  async getSavedCardCount(): Promise<number> {
    const savedCardButtons = this.page.locator('button:has(p:has-text("••••"))');
    return await savedCardButtons.count();
  }

  async selectSavedCard(index: number = 0) {
    const savedCardButtons = this.page.locator('button:has(p:has-text("••••"))');
    const button = savedCardButtons.nth(index);
    // Use force click if element is outside viewport due to dialog content overflow
    await button.click({ force: true });
  }

  async selectNewCard() {
    // Click "Use a different card" button
    const newCardButton = this.page.locator('button:has-text("Use a different card")');
    // Use force click if element is outside viewport due to dialog content overflow
    await newCardButton.click({ force: true });
  }

  async isNewCardOptionSelected(): Promise<boolean> {
    const newCardButton = this.page.locator('button:has-text("Use a different card"), button:has-text("Add payment card")');
    const className = await newCardButton.getAttribute('class');
    return className?.includes('border-purple-500') ?? false;
  }

  async isSavedCardSelected(index: number = 0): Promise<boolean> {
    const savedCardButtons = this.page.locator('button:has(p:has-text("••••"))');
    const button = savedCardButtons.nth(index);
    const className = await button.getAttribute('class');
    return className?.includes('border-purple-500') ?? false;
  }

  async getSavedCardLast4(index: number = 0): Promise<string | null> {
    const savedCardButtons = this.page.locator('button:has(p:has-text("••••"))');
    const button = savedCardButtons.nth(index);
    const text = await button.locator('p:has-text("••••")').textContent();
    // Extract last 4 digits from text like "Visa •••• 4242"
    const match = text?.match(/•••• (\d{4})/);
    return match ? match[1] : null;
  }

  async waitForPaymentMethodSection() {
    // Wait for payment method section to appear (after selecting spread)
    await expect(this.page.locator('label:has-text("Payment Method")')).toBeVisible({ timeout: 10000 });
  }

  // History / My Readings
  async getRequestCount(): Promise<number> {
    const requests = this.page.locator('[data-testid^="reading-request-"]');
    return await requests.count();
  }

  async isEmptyStateVisible(): Promise<boolean> {
    return await this.page.locator('text=No reading requests yet').isVisible();
  }

  async isRequestInHistory(topic: string): Promise<boolean> {
    try {
      await this.page.waitForSelector(`text=${topic}`, {
        state: 'visible',
        timeout: 10000
      });
      return true;
    } catch {
      return false;
    }
  }

  async cancelRequest(requestId: string) {
    await this.page.locator(`[data-testid="cancel-request-${requestId}"]`).click();
  }

  async viewCompletedReading(requestId: string) {
    await this.page.locator(`[data-testid="view-reading-${requestId}"]`).click();
  }

  // Verification helpers
  async getSelectedSpreadPrice(): Promise<string | null> {
    const priceElement = this.page.locator('[data-testid="selected-spread-price"]');
    if (await priceElement.isVisible()) {
      return await priceElement.textContent();
    }
    return null;
  }

  async waitForSubmitSuccess() {
    // Wait for checkout view to appear after successful submit
    await expect(this.page.locator('[data-testid="checkout-view"]')).toBeVisible({ timeout: 10000 });
  }

  // Checkout view helpers (inline checkout within the wizard dialog)
  async waitForCheckoutView() {
    // Wait for the checkout view to appear (inline within the wizard dialog)
    await expect(this.page.locator('[data-testid="checkout-view"]')).toBeVisible({ timeout: 15000 });
    // Wait for Stripe PaymentElement to load
    await expect(this.page.locator('iframe[name^="__privateStripeFrame"]').first()).toBeVisible({ timeout: 15000 });
  }

  async isCheckoutViewVisible(): Promise<boolean> {
    return await this.page.locator('[data-testid="checkout-view"]').isVisible();
  }

  /**
   * Fill Stripe PaymentElement with test card details
   * Uses the same pattern as working checkout tests
   */
  async fillStripePaymentElement() {
    // Wait for Stripe iframes to be ready
    await this.page.waitForTimeout(2000);

    const stripeFrames = this.page.locator('iframe[name^="__privateStripeFrame"]');
    await expect(stripeFrames.first()).toBeVisible({ timeout: 10000 });

    const frameCount = await stripeFrames.count();
    console.log(`[FillStripe] Found ${frameCount} Stripe iframes`);

    let filledNumber = false;
    let filledExpiry = false;
    let filledCvc = false;

    for (let i = 0; i < frameCount; i++) {
      const frame = this.page.frameLocator(`iframe[name^="__privateStripeFrame"]`).nth(i);

      // Try card number
      if (!filledNumber) {
        const numberInput = frame.locator('input[name="number"]');
        if (await numberInput.isVisible({ timeout: 500 }).catch(() => false)) {
          await numberInput.fill('4242424242424242');
          filledNumber = true;
          console.log(`[FillStripe] Filled card number in iframe ${i}`);
        }
      }

      // Try expiry
      if (!filledExpiry) {
        const expiryInput = frame.locator('input[name="expiry"]');
        if (await expiryInput.isVisible({ timeout: 500 }).catch(() => false)) {
          await expiryInput.fill('12/34');
          filledExpiry = true;
          console.log(`[FillStripe] Filled expiry in iframe ${i}`);
        }
      }

      // Try CVC
      if (!filledCvc) {
        const cvcInput = frame.locator('input[name="cvc"]');
        if (await cvcInput.isVisible({ timeout: 500 }).catch(() => false)) {
          await cvcInput.fill('123');
          filledCvc = true;
          console.log(`[FillStripe] Filled CVC in iframe ${i}`);
        }
      }
    }

    if (!filledNumber || !filledExpiry || !filledCvc) {
      console.log(`[FillStripe] Partial fill - Number: ${filledNumber}, Expiry: ${filledExpiry}, CVC: ${filledCvc}`);
      // Don't throw - let test decide what to do
    }

    // Wait for validation
    await this.page.waitForTimeout(500);
  }

  async completeCheckout() {
    // Click the "Finish & Pay" button in the checkout dialog
    await this.page.locator('button:has-text("Finish & Pay")').click();
  }

  async savePaymentMethod() {
    // Click the "Save Card & Submit Request" button for SpiriReading payment method collection
    await this.page.locator('button:has-text("Save Card & Submit")').click();
  }

  async cancelCheckout() {
    // Click cancel or close the dialog
    const cancelBtn = this.page.locator('button:has-text("Cancel")');
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
    } else {
      // Try closing the dialog
      await this.page.keyboard.press('Escape');
    }
  }

  // All Readings page helpers
  async navigateToAllReadings(userId: string) {
    await this.page.goto(`/u/${userId}/space/readings/received`);
    await this.page.waitForLoadState('networkidle');
  }

  async waitForAllReadingsPage() {
    await expect(this.page.locator('h1:has-text("My Readings")')).toBeVisible({ timeout: 10000 });
  }

  async getCompletedReadingCount(): Promise<number> {
    const readings = this.page.locator('button:has-text("View Reading")');
    return await readings.count();
  }

  async isReadingVisible(topic: string): Promise<boolean> {
    try {
      await this.page.waitForSelector(`text=${topic}`, {
        state: 'visible',
        timeout: 10000
      });
      return true;
    } catch {
      return false;
    }
  }

  async clickViewReading(topic: string) {
    // Find the reading card with the topic and click its View button
    const readingCard = this.page.locator(`div:has(h3:has-text("${topic}"))`).first();
    await readingCard.locator('button:has-text("View Reading")').click();
    // Wait for dialog to open
    await expect(this.page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
  }

  async isReadingDetailVisible(): Promise<boolean> {
    return await this.page.locator('[role="dialog"]:has-text("Your Reading")').isVisible();
  }

  async getReadingOverallMessage(): Promise<string | null> {
    const messageElement = this.page.locator('h4:has-text("Reader\'s Message") + div p');
    if (await messageElement.isVisible({ timeout: 3000 }).catch(() => false)) {
      return await messageElement.textContent();
    }
    return null;
  }

  async closeReadingDetail() {
    await this.page.keyboard.press('Escape');
    await expect(this.page.locator('[role="dialog"]:has-text("Your Reading")')).not.toBeVisible({ timeout: 5000 });
  }

  // Review helpers
  async isLeaveReviewButtonVisible(): Promise<boolean> {
    return await this.page.locator('button:has-text("Leave a Review")').isVisible({ timeout: 3000 }).catch(() => false);
  }

  async clickLeaveReview() {
    await this.page.locator('button:has-text("Leave a Review")').click();
  }

  async setReviewRating(rating: number) {
    // Click on the nth star (0-indexed, so rating 5 = index 4)
    const star = this.page.locator('button:has(svg.lucide-star)').nth(rating - 1);
    await star.click();
  }

  async setReviewHeadline(headline: string) {
    await this.page.locator('input[placeholder*="important to know"]').fill(headline);
  }

  async setReviewText(text: string) {
    await this.page.locator('textarea[placeholder*="experience with this reading"]').fill(text);
  }

  async submitReview() {
    await this.page.locator('button:has-text("Submit Review")').click();
  }

  async isSubmitReviewEnabled(): Promise<boolean> {
    return await this.page.locator('button:has-text("Submit Review")').isEnabled();
  }

  async isReviewDisplayed(): Promise<boolean> {
    return await this.page.locator('text=Your Review').isVisible({ timeout: 5000 }).catch(() => false);
  }

  async getDisplayedReviewHeadline(): Promise<string | null> {
    // The headline is shown as an h5 element inside the review section
    const headlineElement = this.page.locator('.space-y-3:has(text="Your Review") h5');
    if (await headlineElement.isVisible({ timeout: 3000 }).catch(() => false)) {
      return await headlineElement.textContent();
    }
    return null;
  }

  async getDisplayedReviewRating(): Promise<number> {
    // Count filled stars in the displayed review
    const filledStars = this.page.locator('.space-y-3:has(text="Your Review") svg.fill-amber-400');
    return await filledStars.count();
  }
}

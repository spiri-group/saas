import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { AuthPage } from './AuthPage';
import { HomePage } from './HomePage';
import { UserSetupPage } from './UserSetupPage';
import { registerTestUser, registerTestMerchant, getCookiesFromPage, getVendorIdFromSlug } from '../utils/test-cleanup';

/**
 * Merchant Setup Page Object Model
 * Handles the /m/setup?merchantId={id} page where users become merchants
 */
export class MerchantSetupPage extends BasePage {
  // Selectors
  private readonly selectors = {
    // Form fields
    nameInput: 'input[name="name"]',
    slugInput: 'input[name="slug"]',
    emailInput: 'input[name="email"]',
    countrySelect: 'button[role="combobox"]',
    stateInput: 'input[name="state"]',

    // Dropdowns and selections
    religionCombobox: '[data-testid="religion-combobox"]',
    servicesMultiselect: '[data-testid="services-multiselect"]',

    // Subscription
    subscriptionSection: '[data-testid="subscription-section"]',
    subscriptionPlan: (planName: string) => `[data-testid="plan-${planName}"]`,

    // Submit
    submitButton: 'button[type="submit"]',
    continueButton: 'button:has-text("Continue")',

    // Layout
    welcomeHeading: 'text=Becoming a Merchant',
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to merchant setup page
   */
  async navigateToSetup() {
    await this.goto('/m/setup');
  }

  /**
   * Check if we're on the merchant setup page
   */
  async isOnSetupPage(): Promise<boolean> {
    try {
      await this.page.waitForSelector(this.selectors.welcomeHeading, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Fill merchant basic information
   */
  async fillBasicInfo(data: {
    name: string;
    slug: string;
    email: string;
    country: string;
    countryName: string; // Full country name for selecting from ComboBox
    state?: string;
  }) {
    await this.page.fill(this.selectors.nameInput, data.name);
    await this.page.fill(this.selectors.slugInput, data.slug);
    await this.page.fill(this.selectors.emailInput, data.email);

    // Select country from ComboBox with search
    await this.page.click('[aria-label="country-picker-trigger"]');
    await this.page.waitForSelector('[aria-label="country-picker-search"]', { timeout: 5000 });
    // Type to search for country
    await this.page.fill('[aria-label="country-picker-search"]', data.countryName);
    await this.page.waitForTimeout(300);
    // Click on the result
    await this.page.click('[aria-label="country-picker-result"]');
    await this.page.waitForTimeout(500);

    // Fill state if provided
    if (data.state) {
      await this.page.fill(this.selectors.stateInput, data.state);
    }
  }

  /**
   * Select religion from dropdown
   */
  async selectReligion(religion: string) {
    await this.page.click(this.selectors.religionCombobox);
    await this.page.click(`[role="option"]:has-text("${religion}")`);
  }

  /**
   * Select services (multiple)
   */
  async selectServices(services: string[]) {
    for (const service of services) {
      await this.page.click(this.selectors.servicesMultiselect);
      await this.page.click(`[role="option"]:has-text("${service}")`);
    }
  }

  /**
   * Select subscription plan
   */
  async selectSubscriptionPlan(planName: string) {
    await this.page.click(this.selectors.subscriptionPlan(planName));
  }

  /**
   * Submit the merchant setup form
   */
  async submitForm() {
    await this.page.click(this.selectors.submitButton);

    // Wait for processing
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Complete full merchant signup
   */
  async completeMerchantSignup(merchantData: {
    name: string;
    slug: string;
    email: string;
    country: string;
    countryName: string;
    state?: string;
    religion: string;
    services: string[];
    subscriptionPlan: string;
  }) {
    await this.fillBasicInfo({
      name: merchantData.name,
      slug: merchantData.slug,
      email: merchantData.email,
      country: merchantData.country,
      countryName: merchantData.countryName,
      state: merchantData.state,
    });

    await this.selectReligion(merchantData.religion);
    await this.selectServices(merchantData.services);
    await this.selectSubscriptionPlan(merchantData.subscriptionPlan);

    await this.submitForm();

    // Wait for redirect to merchant dashboard
    await this.page.waitForURL(/\/m\/[^\/]+/, { timeout: 15000 });
  }

  /**
   * Check if slug is available
   */
  async checkSlugAvailability(slug: string): Promise<boolean> {
    await this.page.fill(this.selectors.slugInput, slug);
    await this.page.waitForTimeout(1000); // Wait for debounced validation

    // Look for error message
    const errorMessage = this.page.locator('text=/already taken/i');
    const hasError = await errorMessage.isVisible().catch(() => false);

    return !hasError;
  }

  /**
   * Get validation errors
   */
  async getValidationErrors(): Promise<string[]> {
    const errors = await this.page.locator('[role="alert"]').allTextContents();
    return errors.filter(text => text.trim().length > 0);
  }

  /**
   * Check if submit button is enabled
   */
  async isSubmitEnabled(): Promise<boolean> {
    const button = this.page.locator(this.selectors.submitButton);
    return !(await button.isDisabled());
  }

  /**
   * Click "Continue to Pricing" button to proceed to step 2
   */
  async continueToPricing() {
    const continueButton = this.page.getByRole('button', { name: /Continue to Pricing/i });
    await continueButton.waitFor({ state: 'visible', timeout: 5000 });
    await continueButton.click();
    await this.page.waitForTimeout(1000); // Wait for step transition
  }

  /**
   * Click "Back" button to return to step 1
   */
  async goBackToDetails() {
    const backButton = this.page.getByRole('button', { name: /Back/i });
    await backButton.waitFor({ state: 'visible', timeout: 5000 });
    await backButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Create a complete merchant with user profile, merchant setup, and payment
   * This is a convenience method for tests that need a merchant but aren't testing the signup flow
   * Returns the merchant slug
   */
  async createMerchant(
    testEmail: string,
    merchantName: string,
    testInfo: { parallelIndex: number }
  ): Promise<string> {
    const timestamp = Date.now();
    const workerId = testInfo.parallelIndex;
    const merchantSlug = `test-merchant-${timestamp}`;

    const authPage = new AuthPage(this.page);
    const homePage = new HomePage(this.page);
    const userSetupPage = new UserSetupPage(this.page);

    // Clear any existing session to ensure fresh start
    await this.page.context().clearCookies();

    // Step 1: Authenticate
    await this.page.goto('/');
    await authPage.startAuthFlow(testEmail);
    await this.page.waitForSelector('[aria-label="input-login-otp"]', { timeout: 15000 });
    await this.page.locator('[aria-label="input-login-otp"]').click();
    await this.page.keyboard.type('123456');
    await this.page.waitForURL('/', { timeout: 15000 });

    // Step 2: Complete user profile
    await homePage.waitForCompleteProfileLink();
    await homePage.clickCompleteProfile();
    await this.page.waitForURL(/\/u\/.*\/setup/, { timeout: 10000 });

    const url = this.page.url();
    const userIdMatch = url.match(/\/u\/([^\/]+)\/setup/);
    if (userIdMatch) {
      const userId = userIdMatch[1];
      const cookies = await getCookiesFromPage(this.page);
      // Register user with their cookies so cleanup can use the correct session
      registerTestUser({ id: userId, email: testEmail, cookies }, workerId);
    }

    await userSetupPage.fillUserProfile({
      firstName: 'Test',
      lastName: 'Merchant',
      phone: '0412345678',
      address: 'Sydney Opera House',
      religion: true, // Select religion
      securityQuestion: 'What is your favorite color?',
      securityAnswer: 'Blue',
    });

    const continueAsMerchantButton = this.page.locator('button:has-text("Continue as Merchant")');
    await continueAsMerchantButton.waitFor({ state: 'visible', timeout: 10000 });
    await continueAsMerchantButton.click();
    await this.page.waitForURL(/\/m\/setup\?merchantId=/, { timeout: 15000 });

    // Step 3: Complete merchant setup
    await this.page.waitForTimeout(2000);
    await this.page.fill('input[name="name"]', merchantName);

    const slugInput = this.page.locator('input[name="slug"]');
    await slugInput.waitFor({ state: 'visible', timeout: 5000 });
    await slugInput.fill(merchantSlug);

    const emailInput = this.page.getByRole('textbox', { name: /business email/i });
    await emailInput.waitFor({ state: 'visible', timeout: 5000 });
    await emailInput.fill(testEmail);

    // Select country - Australia
    await this.page.click('[aria-label="country-picker-trigger"]');
    await this.page.waitForSelector('[aria-label="country-picker-search"]', { timeout: 5000 });
    await this.page.fill('[aria-label="country-picker-search"]', 'Australia');
    await this.page.waitForTimeout(300);
    await this.page.click('[aria-label="country-picker-result"]');
    await this.page.waitForTimeout(500);

    await this.page.fill('input[name="state"]', 'NSW');

    // Select religion
    const religionButton = this.page.locator('[aria-label="religion-picker"]');
    await religionButton.waitFor({ state: 'visible', timeout: 10000 });
    await religionButton.click();
    await this.page.waitForTimeout(500);
    await this.page.waitForSelector('[data-testid="religion-tree"]', { timeout: 10000 });
    await this.page.locator('[role="treeitem"]').first().click();

    // Select merchant type
    await this.page.waitForTimeout(500);
    const merchantTypeButton = this.page.locator('[aria-label="merchant-type-picker"]');
    await merchantTypeButton.click();
    await this.page.locator('[role="dialog"]:visible').waitFor({ timeout: 10000 });
    await this.page.locator('[data-testid="merchant-type-tree"] [role="treeitem"]').first().click();
    await this.page.waitForTimeout(500);
    await this.page.locator('[role="dialog"] [aria-label="close-dialog"]').click();

    // Continue to pricing
    const continueButton = this.page.getByRole('button', { name: /Continue to Pricing/i });
    await continueButton.waitFor({ state: 'visible', timeout: 5000 });
    await continueButton.click();

    await this.page.waitForTimeout(3000);
    await this.page.locator('[data-testid="merchant-subscription-section"]').waitFor({ timeout: 15000 });

    // Submit form - creates merchant and advances to Step 3 (optional card)
    const submitButton = this.page.getByRole('button', { name: /^Continue$/i });
    await submitButton.waitFor({ state: 'visible', timeout: 10000 });
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    await submitButton.click();

    // Step 3: Optional card collection - skip it
    const skipCardButton = this.page.getByTestId('onboarding-skip-card-btn');
    await skipCardButton.waitFor({ state: 'visible', timeout: 30000 });
    await skipCardButton.click();

    // After skipping card, redirects to merchant profile page
    await this.page.waitForURL(new RegExp(`/m/${merchantSlug}`), { timeout: 30000 });

    // Register merchant for cleanup with actual vendor ID
    const merchantCookies = await getCookiesFromPage(this.page);
    if (merchantCookies) {
      const actualVendorId = await getVendorIdFromSlug(merchantSlug, merchantCookies);
      if (actualVendorId) {
        console.log(`[MerchantSetup] Registering merchant for cleanup: vendorId=${actualVendorId}, slug=${merchantSlug}`);
        registerTestMerchant({ id: actualVendorId, slug: merchantSlug, email: testEmail, cookies: merchantCookies }, workerId);
      } else {
        console.error(`[MerchantSetup] WARNING: Could not fetch actual vendor ID for slug ${merchantSlug}`);
        registerTestMerchant({ slug: merchantSlug, email: testEmail, cookies: merchantCookies }, workerId);
      }
    }

    // Wait for and dismiss welcome dialog
    await this.page.waitForTimeout(3000); // Allow dialog to appear
    try {
      // Try to find and click the welcome button
      const welcomeButton = this.page.getByRole('button', { name: /customise your profile/i });
      if (await welcomeButton.isVisible({ timeout: 5000 })) {
        console.log('[MerchantSetup] Dismissing welcome dialog...');
        await welcomeButton.click();
        await this.page.waitForTimeout(2000);
      }
    } catch (e) {
      console.log('[MerchantSetup] Welcome dialog not found or already dismissed');
    }

    // Ensure no dialog overlay is blocking
    const overlay = this.page.locator('[data-state="open"][aria-hidden="true"].fixed.inset-0');
    await overlay.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});

    return merchantSlug;
  }
}

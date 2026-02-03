import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { AuthPage } from './AuthPage';
import { HomePage } from './HomePage';
import { UserSetupPage } from './UserSetupPage';
import { registerTestUser, registerTestPractitioner, getCookiesFromPage, getVendorIdFromSlug } from '../utils/test-cleanup';

/**
 * Practitioner Setup Page Object Model
 * Handles the /p/setup?practitionerId={id} page where users become practitioners
 *
 * The practitioner onboarding flow is:
 * Step 1: Basic Info (name, slug, email, country)
 * Step 2: Profile (headline, bio, modalities, specializations)
 * Step 3: Details (optional - pronouns, years experience, training, approach)
 * Step 4: Your Plan (subscription selection)
 */
export class PractitionerSetupPage extends BasePage {
  private readonly selectors = {
    // Step 1: Basic Info
    nameInput: 'input[name="name"]',
    slugInput: 'input[name="slug"]',
    emailInput: 'input[name="email"]',
    countryPickerTrigger: '[data-testid="country-picker-trigger"]',
    countryPickerSearch: '[data-testid="country-picker-search"]',
    countryPickerResult: '[data-testid="country-picker-result"]',

    // Step 2: Profile
    headlineInput: 'input[name="headline"]',
    bioTextarea: 'textarea[name="bio"]',
    modalitiesSelect: '[data-testid="modalities-select"]',
    specializationsSelect: '[data-testid="specializations-select"]',

    // Step 3: Details (optional)
    pronounsInput: 'input[name="pronouns"]',
    yearsExperienceInput: 'input[name="yearsExperience"]',
    spiritualJourneyTextarea: 'textarea[name="spiritualJourney"]',
    approachTextarea: 'textarea[name="approach"]',

    // Step 4: Subscription
    subscriptionSection: '[data-testid="practitioner-subscription-section"]',
    basePlanPrice: '[data-testid="practitioner-base-plan-price"]',

    // Navigation
    continueButton: '[data-testid="continue-btn"]',
    backButton: '[data-testid="back-btn"]',
    submitButton: '[data-testid="submit-btn"]',

    // Layout
    welcomeHeading: 'text=Becoming a Practitioner',
    step1Heading: '[data-testid="step1-heading"]',
    step2Heading: '[data-testid="step2-heading"]',
    step3Heading: '[data-testid="step3-heading"]',
    step4Heading: '[data-testid="step4-heading"]',
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to practitioner setup page
   */
  async navigateToSetup() {
    await this.goto('/p/setup');
  }

  /**
   * Check if we're on the practitioner setup page
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
   * Wait for step 1 to be visible
   */
  async waitForStep1() {
    await expect(this.page.locator(this.selectors.step1Heading)).toBeVisible({ timeout: 10000 });
  }

  /**
   * Wait for step 2 to be visible
   */
  async waitForStep2() {
    await expect(this.page.locator(this.selectors.step2Heading)).toBeVisible({ timeout: 10000 });
  }

  /**
   * Wait for step 3 to be visible
   */
  async waitForStep3() {
    await expect(this.page.locator(this.selectors.step3Heading)).toBeVisible({ timeout: 10000 });
  }

  /**
   * Wait for step 4 to be visible
   */
  async waitForStep4() {
    await expect(this.page.locator(this.selectors.step4Heading)).toBeVisible({ timeout: 10000 });
  }

  /**
   * Fill step 1: Basic Information
   */
  async fillBasicInfo(data: {
    name: string;
    slug: string;
    email: string;
    countryName: string;
  }) {
    await this.page.fill(this.selectors.nameInput, data.name);

    // Wait for slug to be generated and enabled
    const slugInput = this.page.locator(this.selectors.slugInput);
    await expect(slugInput).toBeEnabled({ timeout: 10000 });
    await slugInput.fill(data.slug);

    await this.page.fill(this.selectors.emailInput, data.email);

    // Select country from ComboBox with search
    await this.page.click(this.selectors.countryPickerTrigger);
    await this.page.waitForSelector(this.selectors.countryPickerSearch, { timeout: 5000 });
    await this.page.fill(this.selectors.countryPickerSearch, data.countryName);
    await this.page.waitForTimeout(300);
    await this.page.click(this.selectors.countryPickerResult);
    await this.page.waitForTimeout(500);
  }

  /**
   * Fill step 2: Profile
   */
  async fillProfile(data: {
    headline: string;
    bio: string;
    modalities: string[];
    specializations: string[];
  }) {
    await this.page.fill(this.selectors.headlineInput, data.headline);
    await this.page.fill(this.selectors.bioTextarea, data.bio);

    // Select modalities - wait for badges to be visible then click
    for (const modality of data.modalities) {
      const modalityBadge = this.page.locator(`[data-testid="modality-option-${modality}"]`);
      await modalityBadge.waitFor({ state: 'visible', timeout: 5000 });
      await modalityBadge.click();
      await this.page.waitForTimeout(100);
    }

    // Select specializations - wait for badges to be visible then click
    for (const spec of data.specializations) {
      const specBadge = this.page.locator(`[data-testid="specialization-option-${spec}"]`);
      await specBadge.waitFor({ state: 'visible', timeout: 5000 });
      await specBadge.click();
      await this.page.waitForTimeout(100);
    }
  }

  /**
   * Fill step 3: Additional Details (optional)
   */
  async fillDetails(data: {
    pronouns?: string;
    yearsExperience?: number;
    spiritualJourney?: string;
    approach?: string;
  }) {
    if (data.pronouns) {
      await this.page.fill(this.selectors.pronounsInput, data.pronouns);
    }
    if (data.yearsExperience !== undefined) {
      await this.page.fill(this.selectors.yearsExperienceInput, data.yearsExperience.toString());
    }
    if (data.spiritualJourney) {
      await this.page.fill(this.selectors.spiritualJourneyTextarea, data.spiritualJourney);
    }
    if (data.approach) {
      await this.page.fill(this.selectors.approachTextarea, data.approach);
    }
  }

  /**
   * Wait for subscription plans to load in step 4
   * The base plan (Essentials) is automatically selected
   */
  async waitForSubscriptionLoaded() {
    // Wait for the subscription section to appear
    await expect(this.page.locator(this.selectors.subscriptionSection)).toBeVisible({ timeout: 15000 });
    // Wait for the base plan price to be visible (indicates plans have loaded)
    await expect(this.page.locator(this.selectors.basePlanPrice)).toBeVisible({ timeout: 15000 });
  }

  /**
   * Click continue to next step
   */
  async clickContinue() {
    const continueBtn = this.page.locator(this.selectors.continueButton);
    await expect(continueBtn).toBeVisible({ timeout: 5000 });
    await expect(continueBtn).toBeEnabled({ timeout: 5000 });
    await continueBtn.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Click back to previous step
   */
  async clickBack() {
    const backBtn = this.page.locator(this.selectors.backButton);
    await expect(backBtn).toBeVisible({ timeout: 5000 });
    await backBtn.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Submit the practitioner setup form
   */
  async submitForm() {
    const submitBtn = this.page.locator(this.selectors.submitButton);
    await expect(submitBtn).toBeEnabled({ timeout: 10000 });
    await submitBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get validation errors
   */
  async getValidationErrors(): Promise<string[]> {
    const errors = await this.page.locator('[role="alert"], .text-destructive').allTextContents();
    return errors.filter(text => text.trim().length > 0);
  }

  /**
   * Check if continue button is enabled
   */
  async isContinueEnabled(): Promise<boolean> {
    const button = this.page.locator(this.selectors.continueButton);
    return !(await button.isDisabled());
  }

  /**
   * Create a complete practitioner with user profile and practitioner setup
   * This is a convenience method for tests that need a practitioner but aren't testing the signup flow
   * Returns the practitioner slug
   */
  async createPractitioner(
    testEmail: string,
    practitionerName: string,
    testInfo: { parallelIndex: number }
  ): Promise<string> {
    const timestamp = Date.now();
    const workerId = testInfo.parallelIndex;
    const practitionerSlug = `test-practitioner-${timestamp}`;

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
      registerTestUser({ id: userId, email: testEmail, cookies }, workerId);
    }

    await userSetupPage.fillUserProfile({
      firstName: 'Test',
      lastName: 'Practitioner',
      phone: '0412345678',
      address: 'Sydney Opera House',
      securityQuestion: 'What is your favorite color?',
      securityAnswer: 'Blue',
    });

    // Click "Continue as Practitioner" button
    const continueAsPractitionerButton = this.page.locator('[data-testid="continue-as-practitioner-btn"]');
    await continueAsPractitionerButton.waitFor({ state: 'visible', timeout: 10000 });
    await continueAsPractitionerButton.click();
    await this.page.waitForURL(/\/p\/setup\?practitionerId=/, { timeout: 15000 });

    // Step 3: Complete practitioner setup - Step 1 (Basic Info)
    await this.waitForStep1();
    await this.fillBasicInfo({
      name: practitionerName,
      slug: practitionerSlug,
      email: testEmail,
      countryName: 'Australia',
    });
    await this.clickContinue();

    // Step 3: Complete practitioner setup - Step 2 (Profile)
    await this.waitForStep2();
    await this.fillProfile({
      headline: 'Experienced Tarot Reader & Intuitive Guide',
      bio: 'I have been reading tarot for over 10 years and specialize in helping people find clarity in their lives.',
      modalities: ['TAROT', 'ORACLE'],
      specializations: ['RELATIONSHIPS', 'CAREER'],
    });
    await this.clickContinue();

    // Step 3: Complete practitioner setup - Step 3 (Details - optional)
    await this.waitForStep3();
    await this.fillDetails({
      pronouns: 'she/her',
      yearsExperience: 10,
      approach: 'I approach each reading with compassion and clarity.',
    });
    await this.clickContinue();

    // Step 4: Subscription selection (Essentials base plan is auto-selected)
    await this.waitForStep4();
    await this.waitForSubscriptionLoaded();

    await this.submitForm();

    // Wait for redirect to practitioner profile page
    await this.page.waitForURL(new RegExp(`/p/${practitionerSlug}`), { timeout: 30000 });

    // Register practitioner for cleanup with actual vendor ID
    const practitionerCookies = await getCookiesFromPage(this.page);
    if (practitionerCookies) {
      const actualVendorId = await getVendorIdFromSlug(practitionerSlug, practitionerCookies);
      if (actualVendorId) {
        console.log(`[PractitionerSetup] Registering practitioner for cleanup: vendorId=${actualVendorId}, slug=${practitionerSlug}`);
        registerTestPractitioner({ id: actualVendorId, slug: practitionerSlug, email: testEmail, cookies: practitionerCookies }, workerId);
      } else {
        console.error(`[PractitionerSetup] WARNING: Could not fetch actual vendor ID for slug ${practitionerSlug}`);
        registerTestPractitioner({ slug: practitionerSlug, email: testEmail, cookies: practitionerCookies }, workerId);
      }
    }

    return practitionerSlug;
  }
}

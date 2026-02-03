import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * User Setup Page Object Model
 * Handles the /u/[userId]/setup page where users complete their profile
 */
export class UserSetupPage extends BasePage {
  // Selectors
  private readonly selectors = {
    // Form fields - note: email is displayed as text in the header, not an input field
    firstNameInput: 'input[name="firstname"]',
    lastNameInput: 'input[name="lastname"]',
    phoneNumberInput: 'input[aria-label="Phone number"]',
    addressInput: 'input[placeholder="Enter your address"]',
    religionPicker: 'button[aria-label="religion-picker"]',

    // Security question
    securityQuestionInput: 'input[placeholder="e.g., What was the name of your first pet?"]',
    securityAnswerInput: 'input[placeholder="Your answer"]',

    // Buttons
    startBrowsingButton: 'button:has-text("Start Browsing SpiriVerse")',
    continueAsMerchantButton: 'button:has-text("Continue as Merchant")',

    // Layout
    welcomeText: 'text=Welcome to Your Spiritual Journey',
    setupHeading: 'h2:has-text("Get Started")',
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to user setup page
   */
  async navigateToSetup(userId: string) {
    await this.goto(`/u/${userId}/setup`);
  }

  /**
   * Check if we're on the setup page
   */
  async isOnSetupPage(): Promise<boolean> {
    try {
      await this.page.waitForSelector(this.selectors.setupHeading, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Fill in user profile information
   */
  async fillUserProfile(data: {
    firstName: string;
    lastName: string;
    phone: string;
    address: string;
    religion?: boolean; // Optional - whether to select religion
    securityQuestion: string;
    securityAnswer: string;
  }) {
    // Wait for form to be fully loaded and ready
    // Wait for first name input to be visible
    const firstNameInput = this.page.locator(this.selectors.firstNameInput);
    await firstNameInput.waitFor({ state: 'visible', timeout: 10000 });

    // Small delay to ensure form animations complete
    await this.page.waitForTimeout(500);

    // Use click + fill for text inputs to ensure they're cleared first
    await this.page.click(this.selectors.firstNameInput);
    await this.page.fill(this.selectors.firstNameInput, ''); // Clear first
    await this.page.fill(this.selectors.firstNameInput, data.firstName);

    await this.page.click(this.selectors.lastNameInput);
    await this.page.fill(this.selectors.lastNameInput, ''); // Clear first
    await this.page.fill(this.selectors.lastNameInput, data.lastName);

    // Phone input - clear and type
    await this.page.click(this.selectors.phoneNumberInput);
    await this.page.fill(this.selectors.phoneNumberInput, ''); // Clear first
    await this.page.keyboard.type(data.phone);

    // Small delay to ensure all fields are filled
    await this.page.waitForTimeout(200);

    // Address input is autocomplete - type and select from dropdown
    await this.page.click(this.selectors.addressInput);
    await this.page.keyboard.type(data.address);

    // Wait for autocomplete suggestions to appear
    // The component uses a custom dropdown with role="listbox" and role="option"
    try {
      // Wait for the listbox to appear
      await this.page.waitForSelector('[role="listbox"]', { timeout: 5000 });

      // Wait for at least one option to be available
      await this.page.waitForSelector('[role="option"]', { timeout: 5000 });

      // Small delay to ensure dropdown is fully rendered and first item is active
      await this.page.waitForTimeout(300);
    } catch {
      // If autocomplete doesn't appear, just continue
      await this.page.waitForTimeout(1000);
    }

    // Select the first suggestion (it should already be active/highlighted)
    // The component sets activeIndex to 0 when results appear (line 114 in AddressInput.tsx)
    await this.page.keyboard.press('Enter');

    // Wait for address to be set
    await this.page.waitForTimeout(500);

    // Optionally select religion (if requested)
    if (data.religion) {
      const religionButton = this.page.locator(this.selectors.religionPicker);
      await religionButton.waitFor({ state: 'visible', timeout: 5000 });
      await religionButton.click();
      await this.page.waitForTimeout(500);

      // Wait for loading to complete (the dialog shows "Loading religions..." while fetching)
      const loadingText = this.page.locator('text=Loading religions');
      await loadingText.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});

      // Now wait for the religion tree to appear
      await this.page.waitForSelector('[data-testid="religion-tree"]', { timeout: 15000 });
      // Select first religion option
      await this.page.locator('[role="treeitem"]').first().click();
      await this.page.waitForTimeout(500);
    }

    // Fill security question and answer
    await this.page.fill(this.selectors.securityQuestionInput, data.securityQuestion);
    await this.page.fill(this.selectors.securityAnswerInput, data.securityAnswer);

    // Wait for form to stabilize
    await this.page.waitForTimeout(500);
  }

  /**
   * Click "Start browsing SpiriVerse" button (completes setup as regular user)
   */
  async startBrowsing() {
    const button = this.page.locator(this.selectors.startBrowsingButton);

    // Ensure button is enabled and not in loading state
    await button.waitFor({ state: 'visible', timeout: 5000 });

    // Wait for button to be enabled and not busy
    await button.waitFor({ state: 'attached', timeout: 5000 });
    await this.page.waitForTimeout(500); // Small delay for any pending state updates

    // Click the button
    await button.click();

    // Wait for redirect to home page (longer timeout for slow server actions)
    await this.page.waitForURL('/', { timeout: 30000 });
  }

  /**
   * Click "Continue as a Merchant" button (proceeds to merchant setup)
   */
  async continueAsMerchant() {
    const button = this.page.locator(this.selectors.continueAsMerchantButton);

    // Ensure button is enabled and not in loading state
    await button.waitFor({ state: 'visible', timeout: 5000 });

    // Wait for button to be enabled and not busy
    await button.waitFor({ state: 'attached', timeout: 5000 });
    await this.page.waitForTimeout(500); // Small delay for any pending state updates

    // Click the button
    await button.click();

    // Wait for redirect to merchant setup (longer timeout for slow server actions)
    await this.page.waitForURL('/m/setup', { timeout: 30000 });
  }

  /**
   * Complete full user signup flow (become a regular user)
   */
  async completeUserSignup(userData: {
    firstName: string;
    lastName: string;
    phone: string;
    address: string;
    securityQuestion: string;
    securityAnswer: string;
  }) {
    await this.fillUserProfile(userData);
    await this.startBrowsing();
  }

  /**
   * Complete user profile and proceed to merchant signup
   */
  async completeUserProfileAndBecomeMerchant(userData: {
    firstName: string;
    lastName: string;
    phone: string;
    address: string;
    securityQuestion: string;
    securityAnswer: string;
  }) {
    await this.fillUserProfile(userData);
    await this.continueAsMerchant();
  }

  /**
   * Check if start browsing button is enabled
   */
  async isStartBrowsingEnabled(): Promise<boolean> {
    const button = this.page.locator(this.selectors.startBrowsingButton);
    return !(await button.isDisabled());
  }

  /**
   * Check if continue as merchant button is enabled
   */
  async isContinueAsMerchantEnabled(): Promise<boolean> {
    const button = this.page.locator(this.selectors.continueAsMerchantButton);
    return !(await button.isDisabled());
  }

  /**
   * Verify form validation (buttons should be disabled if form is pristine/invalid)
   */
  async verifyFormValidation() {
    // Buttons should be disabled initially
    const startBrowsingDisabled = !(await this.isStartBrowsingEnabled());
    const merchantDisabled = !(await this.isContinueAsMerchantEnabled());

    return startBrowsingDisabled && merchantDisabled;
  }
}

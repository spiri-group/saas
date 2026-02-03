import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Personal Space Onboarding Page Object Model
 * Handles the /u/[userId]/onboarding page for spiritual interests selection
 */
export class PersonalSpaceOnboardingPage extends BasePage {
  // Selectors
  private readonly selectors = {
    // Screen identifiers
    screen1: '[data-testid="screen-1"]',
    screen2: '[data-testid="screen-2"]',

    // Step indicators
    stepIndicator1: '[data-testid="step-indicator-1"]',
    stepIndicator2: '[data-testid="step-indicator-2"]',

    // Primary options (Screen 1)
    primaryOptions: '[data-testid="primary-options"]',
    primaryMediumship: '[data-testid="primary-option-mediumship"]',
    primaryParanormal: '[data-testid="primary-option-paranormal"]',
    primaryCrystals: '[data-testid="primary-option-crystals"]',
    primaryWitchcraft: '[data-testid="primary-option-witchcraft"]',
    primaryEnergy: '[data-testid="primary-option-energy"]',
    primaryHerbalism: '[data-testid="primary-option-herbalism"]',
    primaryFaith: '[data-testid="primary-option-faith"]',

    // Secondary options (Screen 2)
    secondaryOptions: '[data-testid="secondary-options"]',
    secondaryMediumship: '[data-testid="secondary-option-mediumship"]',
    secondaryParanormal: '[data-testid="secondary-option-paranormal"]',
    secondaryCrystals: '[data-testid="secondary-option-crystals"]',
    secondaryWitchcraft: '[data-testid="secondary-option-witchcraft"]',
    secondaryEnergy: '[data-testid="secondary-option-energy"]',
    secondaryHerbalism: '[data-testid="secondary-option-herbalism"]',
    secondaryFaith: '[data-testid="secondary-option-faith"]',

    // Buttons
    continueButton: '[data-testid="continue-button"]',
    backButton: '[data-testid="back-button"]',
    skipButton: '[data-testid="skip-button"]',
    finishButton: '[data-testid="finish-button"]',

    // Headings
    screen1Heading: 'text=What speaks to your spirit?',
    screen2Heading: 'text=Anything else that calls to you?',
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to onboarding page
   */
  async navigateToOnboarding(userId: string) {
    await this.goto(`/u/${userId}/onboarding`);
  }

  /**
   * Check if we're on Screen 1
   */
  async isOnScreen1(): Promise<boolean> {
    try {
      await this.page.waitForSelector(this.selectors.screen1, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if we're on Screen 2
   */
  async isOnScreen2(): Promise<boolean> {
    try {
      await this.page.waitForSelector(this.selectors.screen2, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the count of primary options displayed
   */
  async getPrimaryOptionsCount(): Promise<number> {
    const options = this.page.locator('[data-testid^="primary-option-"]');
    return options.count();
  }

  /**
   * Get the count of secondary options displayed
   */
  async getSecondaryOptionsCount(): Promise<number> {
    const options = this.page.locator('[data-testid^="secondary-option-"]');
    return options.count();
  }

  /**
   * Select a primary interest
   */
  async selectPrimaryInterest(interest: 'mediumship' | 'paranormal' | 'crystals' | 'witchcraft' | 'energy' | 'herbalism' | 'faith') {
    const selector = `[data-testid="primary-option-${interest}"]`;
    await this.page.click(selector);
  }

  /**
   * Toggle a secondary interest
   */
  async toggleSecondaryInterest(interest: 'mediumship' | 'paranormal' | 'crystals' | 'witchcraft' | 'energy' | 'herbalism' | 'faith') {
    const selector = `[data-testid="secondary-option-${interest}"]`;
    await this.page.click(selector);
  }

  /**
   * Check if a primary option is selected (has the selected styling)
   */
  async isPrimaryOptionSelected(interest: string): Promise<boolean> {
    const selector = `[data-testid="primary-option-${interest}"]`;
    const element = this.page.locator(selector);
    const className = await element.getAttribute('class');
    return className?.includes('border-purple-500') || false;
  }

  /**
   * Check if a secondary option is selected
   */
  async isSecondaryOptionSelected(interest: string): Promise<boolean> {
    const selector = `[data-testid="secondary-option-${interest}"]`;
    const element = this.page.locator(selector);
    const className = await element.getAttribute('class');
    return className?.includes('border-purple-500') || false;
  }

  /**
   * Check if Continue button is enabled
   */
  async isContinueButtonEnabled(): Promise<boolean> {
    const button = this.page.locator(this.selectors.continueButton);
    return !(await button.isDisabled());
  }

  /**
   * Click Continue button to go to Screen 2
   */
  async clickContinue() {
    await this.page.click(this.selectors.continueButton);
    // Wait for screen 2 to appear
    await this.page.waitForSelector(this.selectors.screen2, { timeout: 5000 });
  }

  /**
   * Click Back button to return to Screen 1
   */
  async clickBack() {
    await this.page.click(this.selectors.backButton);
    // Wait for screen 1 to appear
    await this.page.waitForSelector(this.selectors.screen1, { timeout: 5000 });
  }

  /**
   * Click Skip button
   */
  async clickSkip() {
    await this.page.click(this.selectors.skipButton);
  }

  /**
   * Click Finish button
   */
  async clickFinish() {
    await this.page.click(this.selectors.finishButton);
  }

  /**
   * Complete onboarding with only primary selection (skip secondary)
   */
  async completeWithPrimaryOnly(primary: 'mediumship' | 'paranormal' | 'crystals' | 'witchcraft' | 'energy' | 'herbalism' | 'faith') {
    await this.selectPrimaryInterest(primary);
    await this.clickContinue();
    await this.clickSkip();
  }

  /**
   * Complete onboarding with primary and secondary selections
   */
  async completeWithSelections(
    primary: 'mediumship' | 'paranormal' | 'crystals' | 'witchcraft' | 'energy' | 'herbalism' | 'faith',
    secondaries: Array<'mediumship' | 'paranormal' | 'crystals' | 'witchcraft' | 'energy' | 'herbalism' | 'faith'>
  ) {
    await this.selectPrimaryInterest(primary);
    await this.clickContinue();

    for (const secondary of secondaries) {
      await this.toggleSecondaryInterest(secondary);
    }

    await this.clickFinish();
  }

  /**
   * Check if an interest option is present in secondary options
   * (Primary selection should be excluded from secondary)
   */
  async isInterestInSecondaryOptions(interest: string): Promise<boolean> {
    const selector = `[data-testid="secondary-option-${interest}"]`;
    const count = await this.page.locator(selector).count();
    return count > 0;
  }

  /**
   * Wait for redirect to home page after completing onboarding
   */
  async waitForCompletionRedirect() {
    await this.page.waitForURL('/', { timeout: 15000 });
  }
}

import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Onboarding Page Object Model
 * Handles the /u/[userId]/onboarding page where users select spiritual interests
 */
export class OnboardingPage extends BasePage {
  // Selectors
  private readonly selectors = {
    // Step indicators
    stepIndicator1: '[data-testid="step-indicator-1"]',
    stepIndicator2: '[data-testid="step-indicator-2"]',

    // Screen containers
    screen1: '[data-testid="screen-1"]',
    screen2: '[data-testid="screen-2"]',

    // Primary interest options (keys match SpiritualInterest enum)
    primaryOptions: '[data-testid="primary-options"]',
    primaryOptionMediumship: '[data-testid="primary-option-mediumship"]',
    primaryOptionParanormal: '[data-testid="primary-option-paranormal"]',
    primaryOptionCrystals: '[data-testid="primary-option-crystals"]',
    primaryOptionWitchcraft: '[data-testid="primary-option-witchcraft"]',
    primaryOptionEnergy: '[data-testid="primary-option-energy"]',
    primaryOptionHerbalism: '[data-testid="primary-option-herbalism"]',
    primaryOptionFaith: '[data-testid="primary-option-faith"]',

    // Secondary interest options
    secondaryOptions: '[data-testid="secondary-options"]',
    secondaryOptionMediumship: '[data-testid="secondary-option-mediumship"]',
    secondaryOptionParanormal: '[data-testid="secondary-option-paranormal"]',
    secondaryOptionCrystals: '[data-testid="secondary-option-crystals"]',
    secondaryOptionWitchcraft: '[data-testid="secondary-option-witchcraft"]',
    secondaryOptionEnergy: '[data-testid="secondary-option-energy"]',
    secondaryOptionHerbalism: '[data-testid="secondary-option-herbalism"]',
    secondaryOptionFaith: '[data-testid="secondary-option-faith"]',

    // Buttons
    continueButton: '[data-testid="continue-button"]',
    backButton: '[data-testid="back-button"]',
    skipButton: '[data-testid="skip-button"]',
    finishButton: '[data-testid="finish-button"]',
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
   * Wait for onboarding page to load (screen 1)
   */
  async waitForPageLoad() {
    // Wait for the "What speaks to your spirit?" heading to appear
    await expect(this.page.locator('h1:has-text("What speaks to your spirit?")')).toBeVisible({ timeout: 10000 });
    // Wait for at least one interest button to appear (using data-testid for reliability)
    await expect(this.page.locator('[data-testid="primary-option-mediumship"]')).toBeVisible({ timeout: 5000 });
  }

  /**
   * Check if we're on screen 1 (primary selection)
   */
  async isOnScreen1(): Promise<boolean> {
    return await this.page.locator(this.selectors.screen1).isVisible();
  }

  /**
   * Check if we're on screen 2 (secondary selection)
   */
  async isOnScreen2(): Promise<boolean> {
    return await this.page.locator(this.selectors.screen2).isVisible();
  }

  /**
   * Select primary spiritual interest
   */
  async selectPrimaryInterest(interest: 'mediumship' | 'paranormal' | 'crystals' | 'witchcraft' | 'energy' | 'herbalism' | 'faith') {
    // Use data-testid selector - more reliable
    const selector = `[data-testid="primary-option-${interest}"]`;
    const element = this.page.locator(selector);

    // Wait for the element to be visible before clicking
    await expect(element).toBeVisible({ timeout: 5000 });
    console.log(`[Onboarding] Clicking on ${interest} option...`);
    await element.click();

    // Brief wait for React state update
    await this.page.waitForTimeout(500);

    // Verify the continue button is now enabled (indicates selection worked)
    const continueBtn = this.page.locator('[data-testid="continue-button"]');
    const isEnabled = await continueBtn.isEnabled();
    console.log(`[Onboarding] Continue button enabled: ${isEnabled}`);

    if (!isEnabled) {
      throw new Error(`Failed to select ${interest} - continue button is still disabled`);
    }
  }

  /**
   * Click continue button (moves from screen 1 to screen 2)
   */
  async clickContinue() {
    const continueBtn = this.page.locator('[data-testid="continue-button"]');

    // Wait for continue button to be enabled (requires primary selection)
    await expect(continueBtn).toBeEnabled({ timeout: 5000 });
    await continueBtn.click();

    // Wait for screen 2 to appear
    await expect(this.page.locator('[data-testid="screen-2"]')).toBeVisible({ timeout: 5000 });
  }

  /**
   * Select secondary spiritual interest(s)
   */
  async selectSecondaryInterest(interest: 'mediumship' | 'paranormal' | 'crystals' | 'witchcraft' | 'energy' | 'herbalism' | 'faith') {
    const selectorMap = {
      mediumship: this.selectors.secondaryOptionMediumship,
      paranormal: this.selectors.secondaryOptionParanormal,
      crystals: this.selectors.secondaryOptionCrystals,
      witchcraft: this.selectors.secondaryOptionWitchcraft,
      energy: this.selectors.secondaryOptionEnergy,
      herbalism: this.selectors.secondaryOptionHerbalism,
      faith: this.selectors.secondaryOptionFaith,
    };

    const selector = selectorMap[interest];
    await this.page.locator(selector).click();
  }

  /**
   * Click back button (returns to screen 1)
   */
  async clickBack() {
    await this.page.locator(this.selectors.backButton).click();
    // Wait for screen 1 to appear
    await expect(this.page.locator(this.selectors.screen1)).toBeVisible({ timeout: 5000 });
  }

  /**
   * Click skip button (skips secondary selection and completes onboarding)
   */
  async clickSkip() {
    const skipBtn = this.page.locator('[data-testid="skip-button"]');

    // Wait for skip button to be visible
    await expect(skipBtn).toBeVisible({ timeout: 5000 });
    console.log('[Onboarding] Clicking skip button...');
    await skipBtn.click();

    // Wait for the mutation to complete - the OnboardingGuard will automatically
    // re-render and show Personal Space when user profile cache is invalidated
    console.log('[Onboarding] Waiting for Personal Space to appear...');
    await expect(this.page.locator('[data-testid="personal-space-heading"]')).toBeVisible({ timeout: 20000 });
    console.log('[Onboarding] Personal Space loaded');
  }

  /**
   * Click finish button (completes onboarding with secondary selections)
   */
  async clickFinish() {
    await this.page.locator(this.selectors.finishButton).click();
    // Wait for the mutation to complete - guard will re-render with Personal Space
    await expect(this.page.locator('[data-testid="personal-space-heading"]')).toBeVisible({ timeout: 20000 });
  }

  /**
   * Complete full onboarding flow with primary interest only
   */
  async completeWithPrimaryOnly(primary: 'mediumship' | 'paranormal' | 'crystals' | 'witchcraft' | 'energy' | 'herbalism' | 'faith') {
    console.log(`[Onboarding] Starting onboarding with primary interest: ${primary}`);

    await this.waitForPageLoad();
    console.log('[Onboarding] Page loaded, selecting primary interest...');

    await this.selectPrimaryInterest(primary);
    console.log('[Onboarding] Primary interest selected, clicking continue...');

    await this.clickContinue();
    console.log('[Onboarding] On screen 2, clicking skip...');

    await this.clickSkip();
    console.log('[Onboarding] Onboarding complete, redirected to home');
  }

  /**
   * Complete full onboarding flow with primary and secondary interests
   */
  async completeWithSecondary(
    primary: 'mediumship' | 'paranormal' | 'crystals' | 'witchcraft' | 'energy' | 'herbalism' | 'faith',
    secondary: ('mediumship' | 'paranormal' | 'crystals' | 'witchcraft' | 'energy' | 'herbalism' | 'faith')[]
  ) {
    await this.waitForPageLoad();
    await this.selectPrimaryInterest(primary);
    await this.clickContinue();

    for (const interest of secondary) {
      // Skip if same as primary (it won't be shown)
      if (interest !== primary) {
        await this.selectSecondaryInterest(interest);
      }
    }

    await this.clickFinish();
  }

  /**
   * Check if continue button is enabled
   */
  async isContinueEnabled(): Promise<boolean> {
    return await this.page.locator(this.selectors.continueButton).isEnabled();
  }
}

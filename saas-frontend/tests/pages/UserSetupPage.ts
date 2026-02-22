import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * User Setup Page Object Model
 * Handles the unified /setup page (BasicDetailsStep) where users complete their profile
 *
 * New flow (2026):
 *   BasicDetailsStep → "Start Your Journey" (browse) or "Set Up a Business" (merchant/practitioner)
 *   Fields: firstName, lastName, email (auto-filled), country (auto-detected), religion (optional)
 */
export class UserSetupPage extends BasePage {
  private readonly selectors = {
    // Form fields
    firstNameInput: '[data-testid="setup-first-name"]',
    lastNameInput: '[data-testid="setup-last-name"]',
    emailInput: '[data-testid="setup-email"]',
    countryCombobox: '[data-testid="setup-country"]',
    religionPicker: '[data-testid="setup-religion-picker"]',

    // Buttons
    startBrowsingButton: '[data-testid="setup-basic-browse-btn"]',
    setupBusinessButton: '[data-testid="setup-basic-setup-btn"]',
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to setup page
   */
  async navigateToSetup() {
    await this.goto('/setup');
  }

  /**
   * Wait for the basic details form to be visible
   */
  async waitForForm() {
    await expect(this.page.locator(this.selectors.firstNameInput)).toBeVisible({ timeout: 10000 });
  }

  /**
   * Fill in basic user profile information
   */
  async fillUserProfile(data: {
    firstName: string;
    lastName: string;
  }) {
    await this.waitForForm();
    await this.page.waitForTimeout(500);

    await this.page.locator(this.selectors.firstNameInput).click();
    await this.page.locator(this.selectors.firstNameInput).fill('');
    await this.page.locator(this.selectors.firstNameInput).fill(data.firstName);

    await this.page.locator(this.selectors.lastNameInput).click();
    await this.page.locator(this.selectors.lastNameInput).fill('');
    await this.page.locator(this.selectors.lastNameInput).fill(data.lastName);

    // Email and country are auto-filled from session/geolocation
    await this.page.waitForTimeout(300);
  }

  /**
   * Click "Start Your Journey" button (completes setup as regular user)
   */
  async startBrowsing() {
    const button = this.page.locator(this.selectors.startBrowsingButton);
    await expect(button).toBeVisible({ timeout: 5000 });
    await this.page.waitForTimeout(300);
    await button.click();

    // Wait for redirect to personal space
    await this.page.waitForURL(/\/u\/.*\/space/, { timeout: 30000 });
  }

  /**
   * Click "Set Up a Business" button (proceeds to plan selection)
   */
  async setupBusiness() {
    const button = this.page.locator(this.selectors.setupBusinessButton);
    await expect(button).toBeVisible({ timeout: 5000 });
    await this.page.waitForTimeout(300);
    await button.click();

    // Wait for plan step to appear
    await expect(this.page.locator('[data-testid="choose-plan-step"]')).toBeVisible({ timeout: 10000 });
  }

  /**
   * Check if start browsing button is visible
   */
  async isStartBrowsingVisible(): Promise<boolean> {
    return await this.page.locator(this.selectors.startBrowsingButton).isVisible();
  }
}

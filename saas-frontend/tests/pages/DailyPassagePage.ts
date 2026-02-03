import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Daily Passage Page Object Model
 * Handles the /u/[userId]/space/faith/daily page
 */
export class DailyPassagePage extends BasePage {
  private readonly selectors = {
    // Page elements
    pageTitle: 'h1:has-text("Daily Passage")',
    passageCard: '.backdrop-blur-xl',
    streakBadge: 'text=/\\d+ day streak/',

    // Passage content
    passageDate: '[data-testid="passage-date"]',
    passageReference: 'h2',
    passageText: 'blockquote',
    passageVersion: 'text=/— \\w+/',

    // Status badges
    readBadge: 'text=Read',
    reflectedBadge: 'text=Reflected',

    // Action buttons
    markReadButton: '[data-testid="mark-read-button"]',
    reflectButton: '[data-testid="reflect-button"]',

    // Reflection form
    reflectionInput: '[data-testid="reflection-input"]',
    applicationInput: '[data-testid="application-input"]',
    prayerResponseInput: '[data-testid="prayer-response-input"]',
    saveReflectionButton: '[data-testid="save-reflection-button"]',
    cancelButton: 'button:has-text("Cancel")',

    // Reflection display
    existingReflection: 'h4:has-text("Your Reflection")',
    existingApplication: 'h4:has-text("Application")',
    existingPrayer: 'h4:has-text("Prayer")',

    // Past passages section
    pastPassagesSection: 'h3:has-text("Recent Passages")',
    pastPassageItem: '.space-y-3 > div',
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to daily passage page
   */
  async goto(userId: string) {
    await this.page.goto(`/u/${userId}/space/faith/daily`);
  }

  /**
   * Wait for page to fully load
   */
  async waitForPageLoad() {
    await expect(this.page.locator(this.selectors.pageTitle)).toBeVisible({ timeout: 15000 });
    // Wait for passage card to appear
    await expect(this.page.locator(this.selectors.passageCard).first()).toBeVisible({ timeout: 15000 });
  }

  /**
   * Check if today's passage is displayed
   */
  async hasTodaysPassage(): Promise<boolean> {
    return await this.page.locator(this.selectors.passageReference).isVisible();
  }

  /**
   * Get the passage reference (e.g., "John 3:16")
   */
  async getPassageReference(): Promise<string> {
    return await this.page.locator(this.selectors.passageReference).textContent() || '';
  }

  /**
   * Get the passage text
   */
  async getPassageText(): Promise<string> {
    return await this.page.locator(this.selectors.passageText).textContent() || '';
  }

  /**
   * Check if the passage is marked as read
   */
  async isMarkedAsRead(): Promise<boolean> {
    return await this.page.locator(this.selectors.readBadge).isVisible();
  }

  /**
   * Check if the passage has a reflection
   */
  async hasReflection(): Promise<boolean> {
    return await this.page.locator(this.selectors.reflectedBadge).isVisible();
  }

  /**
   * Click the Mark as Read button
   */
  async clickMarkAsRead() {
    await this.page.locator(this.selectors.markReadButton).click();
  }

  /**
   * Wait for mark as read to complete
   */
  async waitForMarkAsReadComplete() {
    await expect(this.page.locator(this.selectors.readBadge)).toBeVisible({ timeout: 10000 });
  }

  /**
   * Click the Reflect button (Add Reflection or Edit Reflection)
   */
  async clickReflect() {
    await this.page.locator(this.selectors.reflectButton).click();
  }

  /**
   * Wait for reflection form to appear
   */
  async waitForReflectionForm() {
    await expect(this.page.locator(this.selectors.reflectionInput)).toBeVisible({ timeout: 5000 });
  }

  /**
   * Fill in the reflection
   */
  async setReflection(text: string) {
    await this.page.locator(this.selectors.reflectionInput).fill(text);
  }

  /**
   * Fill in the personal application
   */
  async setApplication(text: string) {
    await this.page.locator(this.selectors.applicationInput).fill(text);
  }

  /**
   * Fill in the prayer response
   */
  async setPrayerResponse(text: string) {
    await this.page.locator(this.selectors.prayerResponseInput).fill(text);
  }

  /**
   * Save the reflection
   */
  async saveReflection() {
    await this.page.locator(this.selectors.saveReflectionButton).click();
  }

  /**
   * Wait for reflection to be saved
   */
  async waitForReflectionSaved() {
    await expect(this.page.locator(this.selectors.reflectedBadge)).toBeVisible({ timeout: 10000 });
    // Form should be hidden
    await expect(this.page.locator(this.selectors.reflectionInput)).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Cancel the reflection form
   */
  async cancelReflection() {
    await this.page.locator(this.selectors.cancelButton).click();
  }

  /**
   * Check if existing reflection is displayed
   */
  async isExistingReflectionVisible(): Promise<boolean> {
    return await this.page.locator(this.selectors.existingReflection).isVisible();
  }

  /**
   * Check if streak badge is visible
   */
  async hasStreak(): Promise<boolean> {
    return await this.page.locator(this.selectors.streakBadge).isVisible();
  }

  /**
   * Get the streak count
   */
  async getStreakCount(): Promise<number> {
    const text = await this.page.locator(this.selectors.streakBadge).textContent();
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Check if past passages section is visible
   */
  async hasPastPassagesSection(): Promise<boolean> {
    return await this.page.locator(this.selectors.pastPassagesSection).isVisible();
  }

  /**
   * Complete a simple reflection
   */
  async completeReflection(reflection: string, application?: string, prayer?: string) {
    await this.clickReflect();
    await this.waitForReflectionForm();
    await this.setReflection(reflection);
    if (application) {
      await this.setApplication(application);
    }
    if (prayer) {
      await this.setPrayerResponse(prayer);
    }
    await this.saveReflection();
    await this.waitForReflectionSaved();
  }
}

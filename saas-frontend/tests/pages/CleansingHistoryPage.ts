import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Cleansing History Page Object Model
 * Handles the /u/[userId]/space/crystals/cleansing page
 */
export class CleansingHistoryPage extends BasePage {
  private readonly selectors = {
    // Page elements
    pageTitle: 'h1:has-text("Cleansing")',
    logSessionButton: '[data-testid="log-cleansing-button"]',

    // Form elements
    cleansingForm: '[role="dialog"]',
    dateInput: '[data-testid="cleansing-date-input"]',
    methodSelect: '[data-testid="cleansing-method-select"]',
    crystalSelect: '[data-testid="cleansing-crystal-select"]',
    moonPhaseSelect: '[data-testid="cleansing-moon-phase-select"]',
    intentionTextarea: '[data-testid="cleansing-intention-textarea"]',
    notesTextarea: '[data-testid="cleansing-notes-textarea"]',
    submitButton: '[data-testid="submit-cleansing-button"]',

    // History elements
    emptyState: 'text=No cleansing sessions logged',
    cleansingEntry: '[data-testid^="cleansing-entry-"]',
    deleteButton: '[data-testid^="delete-cleansing-"]',
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to cleansing history page
   */
  async goto(userId: string) {
    await this.page.goto(`/u/${userId}/space/crystals/cleansing`);
  }

  /**
   * Wait for page to fully load
   */
  async waitForPageLoad() {
    await expect(this.page.locator(this.selectors.pageTitle)).toBeVisible({ timeout: 15000 });
    // Wait for either empty state or entries to appear
    const emptyState = this.page.locator(this.selectors.emptyState);
    const entries = this.page.locator(this.selectors.cleansingEntry);
    await expect(emptyState.or(entries.first())).toBeVisible({ timeout: 15000 });
  }

  /**
   * Click the Log Session button
   */
  async clickLogSession() {
    await this.page.locator(this.selectors.logSessionButton).click();
  }

  /**
   * Wait for form dialog to appear
   */
  async waitForFormDialog() {
    await expect(this.page.locator(this.selectors.cleansingForm)).toBeVisible({ timeout: 5000 });
  }

  /**
   * Set cleansing date
   */
  async setDate(date: string) {
    await this.page.locator(this.selectors.dateInput).fill(date);
  }

  /**
   * Select cleansing method
   */
  async selectMethod(method: string) {
    await this.page.locator(this.selectors.methodSelect).click();
    await this.page.locator(`[role="option"]:has-text("${method}")`).click();
  }

  /**
   * Select moon phase
   */
  async selectMoonPhase(phase: string) {
    await this.page.locator(this.selectors.moonPhaseSelect).click();
    await this.page.locator(`[role="option"]:has-text("${phase}")`).click();
  }

  /**
   * Set intention
   */
  async setIntention(intention: string) {
    await this.page.locator(this.selectors.intentionTextarea).fill(intention);
  }

  /**
   * Set notes
   */
  async setNotes(notes: string) {
    await this.page.locator(this.selectors.notesTextarea).fill(notes);
  }

  /**
   * Submit the form
   */
  async submitForm() {
    await this.page.locator(this.selectors.submitButton).click();
  }

  /**
   * Check if submit button is enabled
   */
  async isSubmitButtonEnabled(): Promise<boolean> {
    return await this.page.locator(this.selectors.submitButton).isEnabled();
  }

  /**
   * Wait for form dialog to close
   */
  async waitForFormToClose() {
    await expect(this.page.locator(this.selectors.cleansingForm)).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Check if empty state is visible
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return await this.page.locator(this.selectors.emptyState).isVisible();
  }

  /**
   * Get count of cleansing entries
   */
  async getEntryCount(): Promise<number> {
    return await this.page.locator(this.selectors.cleansingEntry).count();
  }

  /**
   * Create a simple cleansing entry
   */
  async createSimpleEntry(method: string) {
    await this.clickLogSession();
    await this.waitForFormDialog();
    await this.selectMethod(method);
    await this.submitForm();
    await this.waitForFormToClose();
  }
}

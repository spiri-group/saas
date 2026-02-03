import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Energy Journal Page Object Model
 * Handles the /u/[userId]/space/energy/journal page
 */
export class EnergyJournalPage extends BasePage {
  private readonly selectors = {
    // Page elements
    pageTitle: 'h1:has-text("Energy Journal")',
    newEntryButton: '[data-testid="new-energy-journal-button"]',

    // Form elements
    entryForm: '[role="dialog"]',
    entryTypeSelect: '[data-testid="entry-type-select"]',
    modalitySelect: '[data-testid="modality-select"]',
    durationInput: '[data-testid="duration-input"]',
    energyLevelSlider: '[data-testid="energy-level-slider"]',
    notesTextarea: '[data-testid="notes-textarea"]',
    insightsTextarea: '[data-testid="insights-textarea"]',
    submitButton: '[data-testid="save-energy-journal"]',

    // History elements
    emptyState: 'text=No energy journal entries yet',
    entryCard: '[data-testid^="energy-entry-"]',
    editButton: '[data-testid^="edit-energy-entry-"]',
    deleteButton: '[data-testid^="delete-energy-entry-"]',
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to energy journal page
   */
  async goto(userId: string) {
    await this.page.goto(`/u/${userId}/space/energy/journal`);
  }

  /**
   * Wait for page to fully load
   */
  async waitForPageLoad() {
    await expect(this.page.locator(this.selectors.pageTitle)).toBeVisible({ timeout: 15000 });
    // Wait for either empty state or entries to appear
    const emptyState = this.page.locator(this.selectors.emptyState);
    const entries = this.page.locator(this.selectors.entryCard);
    await expect(emptyState.or(entries.first())).toBeVisible({ timeout: 15000 });
  }

  /**
   * Click the New Entry button
   */
  async clickNewEntry() {
    await this.page.locator(this.selectors.newEntryButton).click();
  }

  /**
   * Wait for form dialog to appear
   */
  async waitForFormDialog() {
    await expect(this.page.locator(this.selectors.entryForm)).toBeVisible({ timeout: 5000 });
  }

  /**
   * Select entry type
   */
  async selectEntryType(type: string) {
    await this.page.locator(this.selectors.entryTypeSelect).click();
    await this.page.locator(`[role="option"]:has-text("${type}")`).click();
  }

  /**
   * Select modality
   */
  async selectModality(modality: string) {
    await this.page.locator(this.selectors.modalitySelect).click();
    await this.page.locator(`[role="option"]:has-text("${modality}")`).click();
  }

  /**
   * Set duration
   */
  async setDuration(minutes: number) {
    await this.page.locator(this.selectors.durationInput).fill(minutes.toString());
  }

  /**
   * Set notes
   */
  async setNotes(notes: string) {
    await this.page.locator(this.selectors.notesTextarea).fill(notes);
  }

  /**
   * Set insights
   */
  async setInsights(insights: string) {
    await this.page.locator(this.selectors.insightsTextarea).fill(insights);
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
    await expect(this.page.locator(this.selectors.entryForm)).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Check if empty state is visible
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return await this.page.locator(this.selectors.emptyState).isVisible();
  }

  /**
   * Get count of entries
   */
  async getEntryCount(): Promise<number> {
    return await this.page.locator(this.selectors.entryCard).count();
  }

  /**
   * Create a simple energy journal entry
   */
  async createSimpleEntry(type: string, modality: string, duration: number) {
    await this.clickNewEntry();
    await this.waitForFormDialog();
    await this.selectEntryType(type);
    await this.selectModality(modality);
    await this.setDuration(duration);
    await this.submitForm();
    await this.waitForFormToClose();
  }
}

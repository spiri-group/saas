import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Crystal Journal Page Object Model
 * Handles the /u/[userId]/space/journal/crystal page
 */
export class CrystalJournalPage extends BasePage {
  private readonly selectors = {
    // Page elements
    pageTitle: 'h1:has-text("Crystal Journal")',
    newEntryButton: '[data-testid="new-entry-button"]',

    // Form elements
    companionForm: '[data-testid="companion-form"]',
    submitButton: '[data-testid="companion-submit-button"]',

    // Companion card elements
    companionCard: '[data-testid="companion-card"]',
    setCompanionButton: '[data-testid="set-companion-button"]',
    todaysCompanion: 'h3:has-text("Today\'s Companion")',

    // Empty states
    emptyState: 'text=No journal entries yet',
    emptyCompanion: 'text=Which crystal is journeying with you today?',

    // History elements
    recentEntriesHeader: 'h2:has-text("Recent Entries")',
    journalEntry: '.space-y-3 > div.flex.items-center',
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to crystal journal page
   */
  async goto(userId: string) {
    await this.page.goto(`/u/${userId}/space/journal/crystal`);
  }

  /**
   * Wait for page to fully load
   */
  async waitForPageLoad() {
    await expect(this.page.locator(this.selectors.pageTitle)).toBeVisible({ timeout: 15000 });
    // Wait for page content to load
    await expect(this.page.locator(this.selectors.todaysCompanion)).toBeVisible({ timeout: 15000 });
  }

  /**
   * Click the New Entry button
   */
  async clickNewEntry() {
    await this.page.locator(this.selectors.newEntryButton).click();
  }

  /**
   * Click Set Today's Companion button (when no companion is set)
   */
  async clickSetCompanion() {
    await this.page.locator(this.selectors.setCompanionButton).click();
  }

  /**
   * Wait for form dialog to appear
   */
  async waitForFormDialog() {
    await expect(this.page.locator(this.selectors.companionForm)).toBeVisible({ timeout: 5000 });
  }

  /**
   * Select a crystal from collection in the form
   */
  async selectCrystalFromCollection(crystalName: string) {
    const select = this.page.locator('[data-testid="companion-form"]').locator('button[role="combobox"]').first();
    await select.click();
    await this.page.locator(`[role="option"]:has-text("${crystalName}")`).click();
  }

  /**
   * Enter custom crystal name
   */
  async enterCustomCrystal(name: string) {
    const select = this.page.locator('[data-testid="companion-form"]').locator('button[role="combobox"]').first();
    await select.click();
    await this.page.locator('[role="option"]:has-text("Other crystal")').click();
    await this.page.locator('[data-testid="companion-form"] input[placeholder="Enter crystal name"]').fill(name);
  }

  /**
   * Select location in form
   */
  async selectLocation(location: string) {
    const locationSelect = this.page.locator('[data-testid="companion-form"]').locator('button[role="combobox"]').nth(1);
    await locationSelect.click();
    await this.page.locator(`[role="option"]:has-text("${location}")`).click();
  }

  /**
   * Set reason in form
   */
  async setReason(reason: string) {
    await this.page.locator('#reason').fill(reason);
  }

  /**
   * Set intention in form
   */
  async setIntention(intention: string) {
    await this.page.locator('#intention').fill(intention);
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
    await expect(this.page.locator(this.selectors.companionForm)).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Check if companion card shows a crystal
   */
  async hasCompanionSet(): Promise<boolean> {
    return await this.page.locator(this.selectors.companionCard).isVisible();
  }

  /**
   * Check if empty companion state is visible
   */
  async isEmptyCompanionVisible(): Promise<boolean> {
    return await this.page.locator(this.selectors.emptyCompanion).isVisible();
  }

  /**
   * Get the name of today's companion
   */
  async getTodaysCompanionName(): Promise<string | null> {
    const card = this.page.locator(this.selectors.companionCard);
    if (!(await card.isVisible())) return null;
    return await card.locator('h4').textContent();
  }

  /**
   * Check if empty history state is visible
   */
  async isEmptyHistoryVisible(): Promise<boolean> {
    return await this.page.locator(this.selectors.emptyState).isVisible();
  }

  /**
   * Get count of journal entries in history
   */
  async getHistoryCount(): Promise<number> {
    // Check if there's a "Recent Entries" section
    const hasHistory = await this.page.locator(this.selectors.recentEntriesHeader).isVisible();
    if (!hasHistory) return 0;

    // Count entries in the history list
    return await this.page.locator('.space-y-3 > div.flex.items-center.gap-4').count();
  }

  /**
   * Check if a crystal appears in history
   */
  async isCrystalInHistory(crystalName: string): Promise<boolean> {
    try {
      await this.page.waitForSelector(`text="${crystalName}"`, {
        state: 'visible',
        timeout: 10000
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a simple journal entry
   */
  async createSimpleEntry(crystalName: string, intention?: string) {
    await this.clickNewEntry();
    await this.waitForFormDialog();
    await this.enterCustomCrystal(crystalName);
    if (intention) {
      await this.setIntention(intention);
    }
    await this.submitForm();
    await this.waitForFormToClose();
  }
}

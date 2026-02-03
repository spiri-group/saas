import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Symbols Page Object Model
 * Handles the /u/[userId]/space/symbols pages:
 * - Dashboard (/symbols)
 * - Dictionary (/symbols/dictionary)
 * - My Card Symbols (/symbols/my-card-symbols)
 */
export class SymbolsPage extends BasePage {
  private readonly selectors = {
    // Dashboard elements
    dashboardTitle: '[data-testid="symbols-dashboard-title"]',
    totalSymbolsStat: '[data-testid="total-symbols-stat"]',
    totalSymbolsValue: '[data-testid="total-symbols-value"]',
    crossEntryStat: '[data-testid="cross-entry-stat"]',
    crossEntryValue: '[data-testid="cross-entry-value"]',
    mostFrequentStat: '[data-testid="most-frequent-stat"]',
    mostFrequentValue: '[data-testid="most-frequent-value"]',

    // My Card Symbols elements
    myCardSymbolsTitle: '[data-testid="my-card-symbols-title"]',
    cardSearchInput: '[data-testid="card-search-input"]',
    filterAll: '[data-testid="filter-all"]',
    filterMajor: '[data-testid="filter-major"]',
    filterCups: '[data-testid="filter-cups"]',
    filterWands: '[data-testid="filter-wands"]',
    filterSwords: '[data-testid="filter-swords"]',
    filterPentacles: '[data-testid="filter-pentacles"]',
    filterCustomized: '[data-testid="filter-customized"]',

    // Card grid
    cardItem: (cardName: string) => `[data-testid="card-${cardName.toLowerCase().replace(/\s+/g, '-')}"]`,
    customizedBadge: '[data-testid="customized-badge"]',

    // Edit dialog elements
    editDialog: '[data-testid="edit-card-dialog"]',
    personalSymbolsInput: '[data-testid="personal-symbols-input"]',
    usePersonalOnlySwitch: '[data-testid="use-personal-only-switch"]',
    notesInput: '[data-testid="notes-input"]',
    saveCardButton: '[data-testid="save-card-button"]',
    cancelButton: '[data-testid="cancel-button"]',
    deleteCardButton: '[data-testid="delete-card-button"]',

    // Loading state
    loadingSpinner: '.animate-spin',
  };

  constructor(page: Page) {
    super(page);
  }

  // ============================================
  // Navigation
  // ============================================

  /**
   * Navigate to symbols dashboard
   */
  async gotoDashboard(userId: string) {
    await this.page.goto(`/u/${userId}/space/symbols`);
  }

  /**
   * Navigate to symbol dictionary
   */
  async gotoDictionary(userId: string) {
    await this.page.goto(`/u/${userId}/space/symbols/dictionary`);
  }

  /**
   * Navigate to my card symbols page
   */
  async gotoMyCardSymbols(userId: string) {
    await this.page.goto(`/u/${userId}/space/symbols/my-card-symbols`);
  }

  // ============================================
  // Dashboard Methods
  // ============================================

  /**
   * Wait for dashboard to load
   */
  async waitForDashboardLoad() {
    await expect(this.page.locator(this.selectors.dashboardTitle)).toBeVisible({ timeout: 15000 });
    // Wait for loading to finish - stats should show actual numbers, not "..."
    await expect(this.page.locator(this.selectors.totalSymbolsValue)).not.toHaveText('...', { timeout: 15000 });
  }

  /**
   * Check if dashboard is visible
   */
  async isDashboardVisible(): Promise<boolean> {
    return await this.page.locator(this.selectors.dashboardTitle).isVisible();
  }

  /**
   * Get total symbols count from dashboard
   */
  async getTotalSymbolsCount(): Promise<string> {
    return await this.page.locator(this.selectors.totalSymbolsValue).textContent() || '0';
  }

  /**
   * Get cross-entry symbols count from dashboard
   */
  async getCrossEntryCount(): Promise<string> {
    return await this.page.locator(this.selectors.crossEntryValue).textContent() || '0';
  }

  // ============================================
  // My Card Symbols Methods
  // ============================================

  /**
   * Wait for my card symbols page to load
   */
  async waitForMyCardSymbolsLoad() {
    await expect(this.page.locator(this.selectors.myCardSymbolsTitle)).toBeVisible({ timeout: 15000 });
    // Wait for loading to finish
    await expect(this.page.locator(this.selectors.loadingSpinner)).not.toBeVisible({ timeout: 10000 });
  }

  /**
   * Check if my card symbols page is visible
   */
  async isMyCardSymbolsPageVisible(): Promise<boolean> {
    return await this.page.locator(this.selectors.myCardSymbolsTitle).isVisible();
  }

  /**
   * Search for a card
   */
  async searchCard(searchTerm: string) {
    await this.page.locator(this.selectors.cardSearchInput).fill(searchTerm);
  }

  /**
   * Clear search
   */
  async clearSearch() {
    await this.page.locator(this.selectors.cardSearchInput).clear();
  }

  /**
   * Click a filter chip
   */
  async clickFilter(filter: 'all' | 'major' | 'cups' | 'wands' | 'swords' | 'pentacles' | 'customized') {
    const filterMap = {
      all: this.selectors.filterAll,
      major: this.selectors.filterMajor,
      cups: this.selectors.filterCups,
      wands: this.selectors.filterWands,
      swords: this.selectors.filterSwords,
      pentacles: this.selectors.filterPentacles,
      customized: this.selectors.filterCustomized,
    };
    await this.page.locator(filterMap[filter]).click();
  }

  /**
   * Click on a card to open edit dialog
   */
  async clickCard(cardName: string) {
    await this.page.locator(this.selectors.cardItem(cardName)).click();
  }

  /**
   * Check if a card is visible in the grid
   */
  async isCardVisible(cardName: string): Promise<boolean> {
    return await this.page.locator(this.selectors.cardItem(cardName)).isVisible();
  }

  /**
   * Check if a card has the customized badge
   */
  async isCardCustomized(cardName: string): Promise<boolean> {
    const card = this.page.locator(this.selectors.cardItem(cardName));
    const badge = card.locator(this.selectors.customizedBadge);
    return await badge.isVisible();
  }

  /**
   * Get count of customized cards (from filter button text)
   */
  async getCustomizedCount(): Promise<number> {
    const text = await this.page.locator(this.selectors.filterCustomized).textContent();
    const match = text?.match(/\((\d+)\)/);
    return match ? parseInt(match[1]) : 0;
  }

  // ============================================
  // Edit Dialog Methods
  // ============================================

  /**
   * Wait for edit dialog to appear
   */
  async waitForEditDialog() {
    await expect(this.page.locator(this.selectors.editDialog)).toBeVisible({ timeout: 5000 });
  }

  /**
   * Wait for edit dialog to close
   */
  async waitForEditDialogToClose() {
    await expect(this.page.locator(this.selectors.editDialog)).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Set personal symbols
   */
  async setPersonalSymbols(symbols: string) {
    await this.page.locator(this.selectors.personalSymbolsInput).fill(symbols);
  }

  /**
   * Get personal symbols value
   */
  async getPersonalSymbols(): Promise<string> {
    return await this.page.locator(this.selectors.personalSymbolsInput).inputValue();
  }

  /**
   * Toggle "Use Personal Only" switch
   */
  async toggleUsePersonalOnly() {
    await this.page.locator(this.selectors.usePersonalOnlySwitch).click();
  }

  /**
   * Check if "Use Personal Only" is checked
   */
  async isUsePersonalOnlyChecked(): Promise<boolean> {
    const switchEl = this.page.locator(this.selectors.usePersonalOnlySwitch);
    const checked = await switchEl.getAttribute('data-state');
    return checked === 'checked';
  }

  /**
   * Set notes
   */
  async setNotes(notes: string) {
    await this.page.locator(this.selectors.notesInput).fill(notes);
  }

  /**
   * Get notes value
   */
  async getNotes(): Promise<string> {
    return await this.page.locator(this.selectors.notesInput).inputValue();
  }

  /**
   * Click save button
   */
  async clickSave() {
    await this.page.locator(this.selectors.saveCardButton).click();
  }

  /**
   * Click cancel button
   */
  async clickCancel() {
    await this.page.locator(this.selectors.cancelButton).click();
  }

  /**
   * Click delete button
   */
  async clickDelete() {
    await this.page.locator(this.selectors.deleteCardButton).click();
  }

  /**
   * Check if delete button is visible
   */
  async isDeleteButtonVisible(): Promise<boolean> {
    return await this.page.locator(this.selectors.deleteCardButton).isVisible();
  }

  /**
   * Check if save button is enabled
   */
  async isSaveButtonEnabled(): Promise<boolean> {
    return await this.page.locator(this.selectors.saveCardButton).isEnabled();
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Create a card symbol entry
   */
  async createCardSymbol(cardName: string, symbols: string, options?: {
    usePersonalOnly?: boolean;
    notes?: string;
  }) {
    await this.clickCard(cardName);
    await this.waitForEditDialog();
    await this.setPersonalSymbols(symbols);

    if (options?.usePersonalOnly) {
      await this.toggleUsePersonalOnly();
    }

    if (options?.notes) {
      await this.setNotes(options.notes);
    }

    await this.clickSave();
    await this.waitForEditDialogToClose();

    // Wait for the customized badge to appear (indicates mutation completed and cache refreshed)
    const cardSelector = this.selectors.cardItem(cardName);
    await expect(this.page.locator(`${cardSelector} ${this.selectors.customizedBadge}`)).toBeVisible({ timeout: 10000 });
  }

  /**
   * Delete a card symbol entry
   */
  async deleteCardSymbol(cardName: string) {
    await this.clickCard(cardName);
    await this.waitForEditDialog();
    await this.clickDelete();
    await this.waitForEditDialogToClose();

    // Wait for the customized badge to disappear (indicates mutation completed and cache refreshed)
    const cardSelector = this.selectors.cardItem(cardName);
    await expect(this.page.locator(`${cardSelector} ${this.selectors.customizedBadge}`)).not.toBeVisible({ timeout: 10000 });
  }
}

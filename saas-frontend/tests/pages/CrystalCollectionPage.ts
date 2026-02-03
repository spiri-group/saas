import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Crystal Collection Page Object Model
 * Handles the /u/[userId]/space/crystals/collection page
 */
export class CrystalCollectionPage extends BasePage {
  private readonly selectors = {
    // Page elements
    pageTitle: 'h1:has-text("My Collection")',
    addCrystalButton: '[data-testid="add-crystal-button"]',

    // Form elements
    crystalForm: '[data-testid="crystal-form"]',
    crystalNameInput: '[data-testid="crystal-name-input"]',
    submitButton: '[data-testid="submit-button"]',

    // Collection elements
    crystalSearch: '[data-testid="crystal-search"]',
    emptyState: 'text=Start Your Collection',
    crystalCard: '[data-testid^="crystal-card-"]',

    // Delete confirmation
    deleteConfirmDialog: 'text=Delete Crystal',
    deleteConfirmButton: 'button:has-text("Delete")',
    cancelDeleteButton: 'button:has-text("Cancel")',
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to crystal collection page
   */
  async goto(userId: string) {
    await this.page.goto(`/u/${userId}/space/crystals/collection`);
  }

  /**
   * Wait for page to fully load
   */
  async waitForPageLoad() {
    await expect(this.page.locator(this.selectors.pageTitle)).toBeVisible({ timeout: 15000 });
    // Wait for either empty state or collection to appear
    const emptyState = this.page.locator(this.selectors.emptyState);
    const collection = this.page.locator(this.selectors.crystalCard);
    await expect(emptyState.or(collection.first())).toBeVisible({ timeout: 15000 });
  }

  /**
   * Click the Add Crystal button
   */
  async clickAddCrystal() {
    await this.page.locator(this.selectors.addCrystalButton).click();
  }

  /**
   * Wait for form dialog to appear
   */
  async waitForFormDialog() {
    await expect(this.page.locator(this.selectors.crystalForm)).toBeVisible({ timeout: 5000 });
  }

  /**
   * Set crystal name in form
   */
  async setCrystalName(name: string) {
    await this.page.locator(this.selectors.crystalNameInput).fill(name);
  }

  /**
   * Submit the crystal form
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
    await expect(this.page.locator(this.selectors.crystalForm)).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Check if empty state is visible
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return await this.page.locator(this.selectors.emptyState).isVisible();
  }

  /**
   * Get count of crystals in collection
   */
  async getCrystalCount(): Promise<number> {
    return await this.page.locator(this.selectors.crystalCard).count();
  }

  /**
   * Check if a crystal with given name exists in collection
   */
  async isCrystalInCollection(crystalName: string): Promise<boolean> {
    try {
      await this.page.waitForSelector(`${this.selectors.crystalCard}:has-text("${crystalName}")`, {
        state: 'visible',
        timeout: 10000
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Search for crystals
   */
  async searchCrystals(query: string) {
    await this.page.locator(this.selectors.crystalSearch).fill(query);
  }

  /**
   * Clear search
   */
  async clearSearch() {
    await this.page.locator(this.selectors.crystalSearch).fill('');
  }

  /**
   * Open actions menu for a crystal card
   */
  async openCrystalMenu(crystalId: string) {
    const card = this.page.locator(`[data-testid="crystal-card-${crystalId}"]`);
    await card.hover();
    await card.locator('button:has([class*="MoreVertical"])').click();
  }

  /**
   * Click edit on a crystal card (via dropdown menu)
   */
  async clickEditCrystal(crystalId: string) {
    await this.openCrystalMenu(crystalId);
    await this.page.locator('[role="menuitem"]:has-text("Edit")').click();
  }

  /**
   * Click delete on a crystal card (via dropdown menu)
   */
  async clickDeleteCrystal(crystalId: string) {
    await this.openCrystalMenu(crystalId);
    await this.page.locator('[role="menuitem"]:has-text("Delete")').click();
  }

  /**
   * Confirm delete in dialog
   */
  async confirmDelete() {
    await expect(this.page.locator(this.selectors.deleteConfirmDialog)).toBeVisible();
    await this.page.locator(this.selectors.deleteConfirmButton).click();
  }

  /**
   * Cancel delete in dialog
   */
  async cancelDelete() {
    await expect(this.page.locator(this.selectors.deleteConfirmDialog)).toBeVisible();
    await this.page.locator(this.selectors.cancelDeleteButton).click();
  }

  /**
   * Wait for delete dialog to close
   */
  async waitForDeleteDialogToClose() {
    await expect(this.page.locator(this.selectors.deleteConfirmDialog)).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Create a simple crystal with just a name
   */
  async createSimpleCrystal(name: string) {
    await this.clickAddCrystal();
    await this.waitForFormDialog();
    await this.setCrystalName(name);
    await this.submitForm();
    await this.waitForFormToClose();
  }
}

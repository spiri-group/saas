import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Crystal Grids Page Object Model
 * Handles the /u/[userId]/space/crystals/grids page
 */
export class CrystalGridsPage extends BasePage {
  private readonly selectors = {
    // Page elements
    pageTitle: 'h1:has-text("Crystal Grids")',
    createGridButton: '[data-testid="create-grid-button"]',

    // Form elements
    gridForm: '[data-testid="grid-form"]',
    gridNameInput: '[data-testid="grid-name-input"]',
    submitButton: '[data-testid="grid-submit-button"]',

    // Grid elements
    emptyState: 'text=No Crystal Grids',
    gridCard: '[data-testid^="grid-card-"]',

    // Delete confirmation
    deleteConfirmDialog: 'text=Delete Crystal Grid',
    deleteConfirmButton: 'button:has-text("Delete")',
    cancelDeleteButton: 'button:has-text("Cancel")',
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to crystal grids page
   */
  async goto(userId: string) {
    await this.page.goto(`/u/${userId}/space/crystals/grids`);
  }

  /**
   * Wait for page to fully load
   */
  async waitForPageLoad() {
    await expect(this.page.locator(this.selectors.pageTitle)).toBeVisible({ timeout: 15000 });
    // Wait for either empty state or grids to appear
    const emptyState = this.page.locator(this.selectors.emptyState);
    const grids = this.page.locator(this.selectors.gridCard);
    await expect(emptyState.or(grids.first())).toBeVisible({ timeout: 15000 });
  }

  /**
   * Click the Create Grid button
   */
  async clickCreateGrid() {
    await this.page.locator(this.selectors.createGridButton).click();
  }

  /**
   * Wait for form dialog to appear
   */
  async waitForFormDialog() {
    await expect(this.page.locator(this.selectors.gridForm)).toBeVisible({ timeout: 5000 });
  }

  /**
   * Set grid name in form
   */
  async setGridName(name: string) {
    await this.page.locator(this.selectors.gridNameInput).fill(name);
  }

  /**
   * Set grid purpose in form
   */
  async setGridPurpose(purpose: string) {
    await this.page.locator('#gridPurpose').fill(purpose);
  }

  /**
   * Click add crystal button in form
   */
  async clickAddCrystalToGrid() {
    await this.page.locator('button:has-text("Add Crystal")').first().click();
  }

  /**
   * Fill first crystal placement in form
   */
  async fillFirstCrystalPlacement(crystalName: string, position: string) {
    // Select "Other" to enter custom name
    const crystalSelect = this.page.locator('[data-testid="grid-form"] select').first();
    if (await crystalSelect.isVisible()) {
      await crystalSelect.selectOption('custom');
    }

    // Fill crystal name (for custom crystals)
    const nameInput = this.page.locator('[data-testid="grid-form"] input[placeholder="Crystal name"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill(crystalName);
    }

    // Select position
    const positionSelects = this.page.locator('[data-testid="grid-form"]').locator('button[role="combobox"]:has-text("Select")');
    if (await positionSelects.first().isVisible()) {
      await positionSelects.first().click();
      await this.page.locator(`[role="option"]:has-text("${position}")`).click();
    }
  }

  /**
   * Submit the grid form
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
    await expect(this.page.locator(this.selectors.gridForm)).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Check if empty state is visible
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return await this.page.locator(this.selectors.emptyState).isVisible();
  }

  /**
   * Get count of grids
   */
  async getGridCount(): Promise<number> {
    return await this.page.locator(this.selectors.gridCard).count();
  }

  /**
   * Check if a grid with given name exists
   */
  async isGridInList(gridName: string): Promise<boolean> {
    try {
      await this.page.waitForSelector(`${this.selectors.gridCard}:has-text("${gridName}")`, {
        state: 'visible',
        timeout: 10000
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Click edit on a grid card
   */
  async clickEditGrid(gridId: string) {
    const card = this.page.locator(`[data-testid="grid-card-${gridId}"]`);
    await card.locator('button:has([class*="Edit"])').click();
  }

  /**
   * Click delete on a grid card
   */
  async clickDeleteGrid(gridId: string) {
    const card = this.page.locator(`[data-testid="grid-card-${gridId}"]`);
    await card.locator('button:has([class*="Trash"])').click();
  }

  /**
   * Click activate on a grid card
   */
  async clickActivateGrid(gridId: string) {
    const card = this.page.locator(`[data-testid="grid-card-${gridId}"]`);
    await card.locator('button:has-text("Activate")').click();
  }

  /**
   * Click deactivate on a grid card
   */
  async clickDeactivateGrid(gridId: string) {
    const card = this.page.locator(`[data-testid="grid-card-${gridId}"]`);
    await card.locator('button:has-text("Deactivate")').click();
  }

  /**
   * Confirm delete in dialog
   */
  async confirmDelete() {
    await expect(this.page.locator(this.selectors.deleteConfirmDialog)).toBeVisible();
    await this.page.locator(this.selectors.deleteConfirmButton).click();
  }

  /**
   * Wait for delete dialog to close
   */
  async waitForDeleteDialogToClose() {
    await expect(this.page.locator(this.selectors.deleteConfirmDialog)).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Check if a grid is marked as active
   */
  async isGridActive(gridId: string): Promise<boolean> {
    const card = this.page.locator(`[data-testid="grid-card-${gridId}"]`);
    const activeIndicator = card.locator('text=Active');
    return await activeIndicator.isVisible();
  }
}

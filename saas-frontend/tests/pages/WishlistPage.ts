import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Crystal Wishlist Page Object Model
 * Handles the /u/[userId]/space/crystals/wishlist page
 */
export class WishlistPage extends BasePage {
  private readonly selectors = {
    // Page elements
    pageTitle: 'h1:has-text("Crystal Wishlist")',
    addWishlistButton: '[data-testid="add-wishlist-button"]',

    // Form elements
    wishlistForm: '[role="dialog"]',
    crystalNameInput: '[data-testid="wishlist-name-input"]',
    prioritySelect: '[data-testid="wishlist-priority-select"]',
    budgetInput: '[data-testid="wishlist-budget-input"]',
    notesTextarea: '[data-testid="wishlist-notes-textarea"]',
    submitButton: '[data-testid="submit-wishlist-button"]',

    // List elements
    emptyState: 'text=Your wishlist is empty',
    wishlistItem: '[data-testid^="wishlist-item-"]',
    editButton: '[data-testid^="edit-wishlist-"]',
    deleteButton: '[data-testid^="delete-wishlist-"]',
    markAcquiredButton: '[data-testid^="acquired-wishlist-"]',
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to wishlist page
   */
  async goto(userId: string) {
    await this.page.goto(`/u/${userId}/space/crystals/wishlist`);
  }

  /**
   * Wait for page to fully load
   */
  async waitForPageLoad() {
    await expect(this.page.locator(this.selectors.pageTitle)).toBeVisible({ timeout: 15000 });
    // Wait for either empty state or wishlist items to appear
    const emptyState = this.page.locator(this.selectors.emptyState);
    const items = this.page.locator(this.selectors.wishlistItem);
    await expect(emptyState.or(items.first())).toBeVisible({ timeout: 15000 });
  }

  /**
   * Click the Add to Wishlist button
   */
  async clickAddToWishlist() {
    await this.page.locator(this.selectors.addWishlistButton).click();
  }

  /**
   * Wait for form dialog to appear
   */
  async waitForFormDialog() {
    await expect(this.page.locator(this.selectors.wishlistForm)).toBeVisible({ timeout: 5000 });
  }

  /**
   * Set crystal name
   */
  async setCrystalName(name: string) {
    await this.page.locator(this.selectors.crystalNameInput).fill(name);
  }

  /**
   * Select priority
   */
  async selectPriority(priority: string) {
    await this.page.locator(this.selectors.prioritySelect).click();
    await this.page.locator(`[role="option"]:has-text("${priority}")`).click();
  }

  /**
   * Set budget
   */
  async setBudget(budget: number) {
    await this.page.locator(this.selectors.budgetInput).fill(budget.toString());
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
    await expect(this.page.locator(this.selectors.wishlistForm)).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Check if empty state is visible
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return await this.page.locator(this.selectors.emptyState).isVisible();
  }

  /**
   * Get count of wishlist items
   */
  async getWishlistCount(): Promise<number> {
    return await this.page.locator(this.selectors.wishlistItem).count();
  }

  /**
   * Check if a crystal is in the wishlist
   */
  async isCrystalInWishlist(crystalName: string): Promise<boolean> {
    try {
      await this.page.waitForSelector(`${this.selectors.wishlistItem}:has-text("${crystalName}")`, {
        state: 'visible',
        timeout: 10000
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a simple wishlist item
   */
  async createSimpleWishlistItem(name: string) {
    await this.clickAddToWishlist();
    await this.waitForFormDialog();
    await this.setCrystalName(name);
    await this.submitForm();
    await this.waitForFormToClose();
  }
}

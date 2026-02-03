import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Dreams Journal Page Object Model
 * Handles the /u/[userId]/space/journal/dreams page
 */
export class DreamsJournalPage extends BasePage {
  private readonly selectors = {
    // Page elements
    pageTitle: 'h1:has-text("Dreams Journal")',
    newDreamButton: '[data-testid="new-dream-button"]',

    // Form elements
    dreamForm: '[role="dialog"]',
    titleInput: '[data-testid="dream-title-input"]',
    contentTextarea: '[data-testid="dream-content-textarea"]',
    dateInput: '[data-testid="dream-date-input"]',
    moodSelect: '[data-testid="dream-mood-select"]',
    dreamTypeSelect: '[data-testid="dream-type-select"]',
    claritySelect: '[data-testid="dream-clarity-select"]',
    lucidCheckbox: '[data-testid="dream-lucid-checkbox"]',
    interpretationTextarea: '[data-testid="dream-interpretation-textarea"]',
    submitButton: '[data-testid="save-dream-button"]',

    // History elements
    emptyState: 'text=No dreams recorded yet',
    dreamCard: '[data-testid^="dream-card-"]',
    dreamEntry: '.bg-slate-800\\/30',
    editButton: '[data-testid^="edit-dream-"]',
    deleteButton: '[data-testid^="delete-dream-"]',
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to dreams journal page
   */
  async goto(userId: string) {
    await this.page.goto(`/u/${userId}/space/journal/dreams`);
  }

  /**
   * Wait for page to fully load
   */
  async waitForPageLoad() {
    await expect(this.page.locator(this.selectors.pageTitle)).toBeVisible({ timeout: 15000 });
    // Wait for either empty state or dreams to appear
    const emptyState = this.page.locator(this.selectors.emptyState);
    const dreams = this.page.locator(this.selectors.dreamEntry);
    await expect(emptyState.or(dreams.first())).toBeVisible({ timeout: 15000 });
  }

  /**
   * Click the New Dream button
   */
  async clickNewDream() {
    await this.page.locator(this.selectors.newDreamButton).click();
  }

  /**
   * Wait for form dialog to appear
   */
  async waitForFormDialog() {
    await expect(this.page.locator(this.selectors.dreamForm)).toBeVisible({ timeout: 5000 });
  }

  /**
   * Set dream title
   */
  async setTitle(title: string) {
    await this.page.locator(this.selectors.titleInput).fill(title);
  }

  /**
   * Set dream content
   */
  async setContent(content: string) {
    await this.page.locator(this.selectors.contentTextarea).fill(content);
  }

  /**
   * Set dream date
   */
  async setDate(date: string) {
    await this.page.locator(this.selectors.dateInput).fill(date);
  }

  /**
   * Select mood
   */
  async selectMood(mood: string) {
    await this.page.locator(this.selectors.moodSelect).click();
    await this.page.locator(`[role="option"]:has-text("${mood}")`).click();
  }

  /**
   * Select dream type
   */
  async selectDreamType(type: string) {
    await this.page.locator(this.selectors.dreamTypeSelect).click();
    await this.page.locator(`[role="option"]:has-text("${type}")`).click();
  }

  /**
   * Toggle lucid dream checkbox
   */
  async toggleLucid() {
    await this.page.locator(this.selectors.lucidCheckbox).click();
  }

  /**
   * Set interpretation
   */
  async setInterpretation(interpretation: string) {
    await this.page.locator(this.selectors.interpretationTextarea).fill(interpretation);
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
    await expect(this.page.locator(this.selectors.dreamForm)).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Check if empty state is visible
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return await this.page.locator(this.selectors.emptyState).isVisible();
  }

  /**
   * Get count of dreams
   */
  async getDreamCount(): Promise<number> {
    return await this.page.locator(this.selectors.dreamEntry).count();
  }

  /**
   * Check if a dream with given title exists
   */
  async isDreamInList(title: string): Promise<boolean> {
    try {
      await this.page.waitForSelector(`text="${title}"`, {
        state: 'visible',
        timeout: 10000
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a simple dream entry
   */
  async createSimpleDream(title: string, content: string) {
    await this.clickNewDream();
    await this.waitForFormDialog();
    await this.setTitle(title);
    await this.setContent(content);
    await this.submitForm();
    await this.waitForFormToClose();
  }
}

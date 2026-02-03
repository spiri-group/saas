import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Scripture Reflections Page Object Model
 * Handles the /u/[userId]/space/faith/scripture page
 */
export class ScriptureReflectionsPage extends BasePage {
  private readonly selectors = {
    // Page elements
    pageTitle: 'h1:has-text("Scripture Reflections")',
    newReflectionButton: '[data-testid="new-scripture-reflection-button"]',

    // Stats cards
    totalReflectionsCard: 'text=Total Reflections',
    booksReadCard: 'text=Books Read',
    thisWeekCard: 'text=This Week',

    // Form elements (dialog)
    reflectionForm: '[role="dialog"]',
    referenceInput: '[data-testid="scripture-reference"]',
    whatSpokeTextarea: '[data-testid="what-spoke-to-me"]',
    applicationTextarea: '[data-testid="personal-application"]',
    dateInput: '[data-testid="scripture-date"]',
    submitButton: '[data-testid="save-scripture-reflection"]',

    // History elements
    emptyState: 'text=No scripture reflections yet',
    reflectionCard: '[data-testid^="scripture-reflection-"]',
    editButton: '[data-testid^="edit-scripture-reflection-"]',
    deleteButton: '[data-testid^="delete-scripture-reflection-"]',

    // Badges in history
    referenceBadge: '.bg-emerald-500\\/20',
    bookTypeBadge: '.bg-slate-500\\/20',
    versionBadge: '.bg-blue-500\\/20',

    // Cross-references display
    crossRefBadge: '.bg-white\\/5',
    questionsIndicator: 'text=/\\d+ questions? to explore/',
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to scripture reflections page
   */
  async goto(userId: string) {
    await this.page.goto(`/u/${userId}/space/faith/scripture`);
  }

  /**
   * Wait for page to fully load
   */
  async waitForPageLoad() {
    await expect(this.page.locator(this.selectors.pageTitle)).toBeVisible({ timeout: 15000 });
    // Wait for either empty state or entries to appear
    const emptyState = this.page.locator(this.selectors.emptyState);
    const entries = this.page.locator(this.selectors.reflectionCard);
    await expect(emptyState.or(entries.first())).toBeVisible({ timeout: 15000 });
  }

  /**
   * Click the New Reflection button
   */
  async clickNewReflection() {
    await this.page.locator(this.selectors.newReflectionButton).click();
  }

  /**
   * Wait for form dialog to appear
   */
  async waitForFormDialog() {
    await expect(this.page.locator(this.selectors.reflectionForm)).toBeVisible({ timeout: 5000 });
  }

  /**
   * Set scripture reference
   */
  async setReference(reference: string) {
    await this.page.locator(this.selectors.referenceInput).fill(reference);
  }

  /**
   * Set what spoke to me
   */
  async setWhatSpokeToMe(text: string) {
    await this.page.locator(this.selectors.whatSpokeTextarea).fill(text);
  }

  /**
   * Set personal application
   */
  async setApplication(text: string) {
    await this.page.locator(this.selectors.applicationTextarea).fill(text);
  }

  /**
   * Submit the form
   */
  async submitForm() {
    await this.page.locator(this.selectors.submitButton).click();
  }

  /**
   * Wait for form dialog to close
   */
  async waitForFormToClose() {
    await expect(this.page.locator(this.selectors.reflectionForm)).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Check if empty state is visible
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return await this.page.locator(this.selectors.emptyState).isVisible();
  }

  /**
   * Get count of scripture reflections
   */
  async getReflectionCount(): Promise<number> {
    return await this.page.locator(this.selectors.reflectionCard).count();
  }

  /**
   * Click edit button for a specific reflection
   */
  async clickEditReflection(reflectionId: string) {
    await this.page.locator(`[data-testid="edit-scripture-reflection-${reflectionId}"]`).click();
  }

  /**
   * Click delete button for a specific reflection
   */
  async clickDeleteReflection(reflectionId: string) {
    // Handle confirmation dialog
    this.page.on('dialog', dialog => dialog.accept());
    await this.page.locator(`[data-testid="delete-scripture-reflection-${reflectionId}"]`).click();
  }

  /**
   * Create a simple scripture reflection
   */
  async createSimpleReflection(reference: string, whatSpokeToMe: string) {
    await this.clickNewReflection();
    await this.waitForFormDialog();
    await this.setReference(reference);
    await this.setWhatSpokeToMe(whatSpokeToMe);
    await this.submitForm();
    await this.waitForFormToClose();
  }

  /**
   * Create a scripture reflection with application
   */
  async createReflectionWithApplication(reference: string, whatSpokeToMe: string, application: string) {
    await this.clickNewReflection();
    await this.waitForFormDialog();
    await this.setReference(reference);
    await this.setWhatSpokeToMe(whatSpokeToMe);
    await this.setApplication(application);
    await this.submitForm();
    await this.waitForFormToClose();
  }
}

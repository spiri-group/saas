import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Session Reflections Page Object Model
 * Handles the /u/[userId]/space/energy/sessions page
 */
export class SessionReflectionsPage extends BasePage {
  private readonly selectors = {
    // Page elements
    pageTitle: 'h1:has-text("Session Reflections")',
    newReflectionButton: '[data-testid="new-session-reflection-button"]',

    // Form elements
    reflectionForm: '[role="dialog"]',
    sessionDateInput: '[data-testid="session-date"]',
    duringSessionTextarea: '[data-testid="session-during"]',
    notesTextarea: '[data-testid="session-notes"]',
    submitButton: '[data-testid="save-session-reflection"]',

    // History elements
    emptyState: 'text=No session reflections yet',
    reflectionCard: '[data-testid^="session-reflection-"]',
    editButton: '[data-testid^="edit-session-reflection-"]',
    deleteButton: '[data-testid^="delete-session-reflection-"]',
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to session reflections page
   */
  async goto(userId: string) {
    await this.page.goto(`/u/${userId}/space/energy/sessions`);
  }

  /**
   * Wait for page to fully load
   */
  async waitForPageLoad() {
    await expect(this.page.locator(this.selectors.pageTitle)).toBeVisible({ timeout: 15000 });
    // Wait for either empty state or reflections to appear
    const emptyState = this.page.locator(this.selectors.emptyState);
    const reflections = this.page.locator(this.selectors.reflectionCard);
    await expect(emptyState.or(reflections.first())).toBeVisible({ timeout: 15000 });
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
   * Set session date
   */
  async setSessionDate(date: string) {
    await this.page.locator(this.selectors.sessionDateInput).fill(date);
  }

  /**
   * Set during session notes
   */
  async setDuringSession(notes: string) {
    await this.page.locator(this.selectors.duringSessionTextarea).fill(notes);
  }

  /**
   * Set personal notes
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
    await expect(this.page.locator(this.selectors.reflectionForm)).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Check if empty state is visible
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return await this.page.locator(this.selectors.emptyState).isVisible();
  }

  /**
   * Get count of reflections
   */
  async getReflectionCount(): Promise<number> {
    return await this.page.locator(this.selectors.reflectionCard).count();
  }

  /**
   * Create a simple session reflection
   */
  async createSimpleReflection(duringSession: string) {
    await this.clickNewReflection();
    await this.waitForFormDialog();
    await this.setDuringSession(duringSession);
    await this.submitForm();
    await this.waitForFormToClose();
  }
}

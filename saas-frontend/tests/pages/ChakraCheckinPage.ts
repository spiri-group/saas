import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Chakra Check-In Page Object Model
 * Handles the /u/[userId]/space/energy/chakra page
 */
export class ChakraCheckinPage extends BasePage {
  private readonly selectors = {
    // Page elements
    pageTitle: 'h1:has-text("Chakra Check-In")',
    newCheckinButton: '[data-testid="new-chakra-checkin-button"]',

    // Form elements
    checkinForm: '[role="dialog"]',
    chakraStatusButton: '[data-testid^="chakra-status-"]',
    overallNotesTextarea: '[data-testid="overall-notes"]',
    submitButton: '[data-testid="save-chakra-checkin"]',

    // Today's status
    todaysStatus: '[data-testid="todays-chakra-status"]',

    // History elements
    emptyState: 'text=No chakra check-ins yet',
    checkinCard: '[data-testid^="chakra-checkin-"]',
    deleteButton: '[data-testid^="delete-chakra-checkin-"]',
  };

  private readonly chakras = [
    'root',
    'sacral',
    'solar',
    'heart',
    'throat',
    'third-eye',
    'crown'
  ];

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to chakra check-in page
   */
  async goto(userId: string) {
    await this.page.goto(`/u/${userId}/space/energy/chakra`);
  }

  /**
   * Wait for page to fully load
   */
  async waitForPageLoad() {
    await expect(this.page.locator(this.selectors.pageTitle)).toBeVisible({ timeout: 15000 });
    // Wait for either empty state or check-ins to appear
    const emptyState = this.page.locator(this.selectors.emptyState);
    const checkins = this.page.locator(this.selectors.checkinCard);
    const todaysStatus = this.page.locator(this.selectors.todaysStatus);
    await expect(emptyState.or(checkins.first()).or(todaysStatus)).toBeVisible({ timeout: 15000 });
  }

  /**
   * Click the New Check-In button
   */
  async clickNewCheckin() {
    await this.page.locator(this.selectors.newCheckinButton).click();
  }

  /**
   * Wait for form dialog to appear
   */
  async waitForFormDialog() {
    await expect(this.page.locator(this.selectors.checkinForm)).toBeVisible({ timeout: 5000 });
  }

  /**
   * Set chakra status
   */
  async setChakraStatus(chakra: string, status: string) {
    const selector = `[data-testid="chakra-status-${chakra}-${status}"]`;
    await this.page.locator(selector).click();
  }

  /**
   * Set all chakras to balanced
   */
  async setAllChakrasBalanced() {
    for (const chakra of this.chakras) {
      await this.setChakraStatus(chakra, 'balanced');
    }
  }

  /**
   * Set overall notes
   */
  async setOverallNotes(notes: string) {
    await this.page.locator(this.selectors.overallNotesTextarea).fill(notes);
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
    await expect(this.page.locator(this.selectors.checkinForm)).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Check if empty state is visible
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return await this.page.locator(this.selectors.emptyState).isVisible();
  }

  /**
   * Check if today's status is visible
   */
  async hasTodaysCheckin(): Promise<boolean> {
    return await this.page.locator(this.selectors.todaysStatus).isVisible();
  }

  /**
   * Get count of check-ins in history
   */
  async getCheckinCount(): Promise<number> {
    return await this.page.locator(this.selectors.checkinCard).count();
  }

  /**
   * Create a simple chakra check-in with all balanced
   */
  async createBalancedCheckin() {
    await this.clickNewCheckin();
    await this.waitForFormDialog();
    await this.setAllChakrasBalanced();
    await this.submitForm();
    await this.waitForFormToClose();
  }
}

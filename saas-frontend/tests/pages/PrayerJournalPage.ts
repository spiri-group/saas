import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Prayer Journal Page Object Model
 * Handles the /u/[userId]/space/faith/prayer page
 */
export class PrayerJournalPage extends BasePage {
  private readonly selectors = {
    // Page elements
    pageTitle: 'h1:has-text("Prayer Journal")',
    newEntryButton: '[data-testid="new-prayer-entry-button"]',

    // Stats cards
    totalPrayersCard: 'text=Total Prayers',
    answeredPrayersCard: 'text=Answered',
    activePrayersCard: 'text=Active Prayers',
    thisWeekCard: 'text=This Week',

    // Form elements (dialog)
    entryForm: '[role="dialog"]',
    prayerTypeSelect: '[data-testid="prayer-type"]',
    contentTextarea: '[data-testid="prayer-content"]',
    titleInput: '[data-testid="prayer-title"]',
    prayingForInput: '[data-testid="praying-for"]',
    scriptureRefInput: '[data-testid="scripture-reference"]',
    insightsTextarea: '[data-testid="prayer-insights"]',
    statusSelect: '[data-testid="prayer-status"]',
    submitButton: '[data-testid="save-prayer-entry"]',

    // History elements
    emptyState: 'text=No prayer entries yet',
    entryCard: '[data-testid^="prayer-entry-"]',
    editButton: '[data-testid^="edit-prayer-entry-"]',
    deleteButton: '[data-testid^="delete-prayer-entry-"]',
    markAnsweredButton: '[data-testid^="mark-answered-"]',

    // Badges in history
    prayerTypeBadge: '.bg-sky-500\\/20',
    answeredBadge: 'text=Answered',
    activeBadge: 'text=Active',

    // Tabs
    allTab: 'button:has-text("All")',
    activeTab: 'button:has-text("Active")',
    answeredTab: 'button:has-text("Answered")',
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to prayer journal page
   */
  async goto(userId: string) {
    await this.page.goto(`/u/${userId}/space/faith/prayer`);
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
   * Click the New Prayer button
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
   * Select prayer type
   */
  async selectPrayerType(type: 'Praise' | 'Petition' | 'Thanksgiving' | 'Intercession' | 'Confession' | 'Meditation' | 'Contemplation' | 'Devotional') {
    await this.page.locator(this.selectors.prayerTypeSelect).click();
    await this.page.locator(`[role="option"]:has-text("${type}")`).click();
  }

  /**
   * Set prayer content
   */
  async setContent(content: string) {
    await this.page.locator(this.selectors.contentTextarea).fill(content);
  }

  /**
   * Set prayer title
   */
  async setTitle(title: string) {
    await this.page.locator(this.selectors.titleInput).fill(title);
  }

  /**
   * Set praying for (for petition/intercession types)
   */
  async setPrayingFor(prayingFor: string) {
    await this.page.locator(this.selectors.prayingForInput).fill(prayingFor);
  }

  /**
   * Set scripture reference
   */
  async setScriptureReference(reference: string) {
    await this.page.locator(this.selectors.scriptureRefInput).fill(reference);
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
   * Get count of prayer entries
   */
  async getEntryCount(): Promise<number> {
    return await this.page.locator(this.selectors.entryCard).count();
  }

  /**
   * Click edit button for a specific entry
   */
  async clickEditEntry(entryId: string) {
    await this.page.locator(`[data-testid="edit-prayer-${entryId}"]`).click();
  }

  /**
   * Click delete button for a specific entry
   */
  async clickDeleteEntry(entryId: string) {
    // Handle confirmation dialog
    this.page.on('dialog', dialog => dialog.accept());
    await this.page.locator(`[data-testid="delete-prayer-${entryId}"]`).click();
  }

  /**
   * Click mark as answered button for a specific entry
   */
  async clickMarkAnswered(entryId: string) {
    await this.page.locator(`[data-testid="mark-answered-${entryId}"]`).click();
  }

  /**
   * Wait for entry to show answered badge
   */
  async waitForAnsweredBadge(entryId: string) {
    await expect(this.page.locator(`[data-testid="prayer-entry-${entryId}"] ${this.selectors.answeredBadge}`)).toBeVisible({ timeout: 10000 });
  }

  /**
   * Switch to All tab
   */
  async switchToAllTab() {
    await this.page.locator(this.selectors.allTab).click();
  }

  /**
   * Switch to Active tab
   */
  async switchToActiveTab() {
    await this.page.locator(this.selectors.activeTab).click();
  }

  /**
   * Switch to Answered tab
   */
  async switchToAnsweredTab() {
    await this.page.locator(this.selectors.answeredTab).click();
  }

  /**
   * Create a simple prayer entry
   */
  async createSimpleEntry(type: 'Praise' | 'Petition' | 'Thanksgiving' | 'Intercession' | 'Confession' | 'Meditation' | 'Contemplation' | 'Devotional', content: string) {
    await this.clickNewEntry();
    await this.waitForFormDialog();
    await this.selectPrayerType(type);
    await this.setContent(content);
    await this.submitForm();
    await this.waitForFormToClose();
  }

  /**
   * Create a full prayer entry with all fields
   */
  async createFullEntry(options: {
    type: 'Praise' | 'Petition' | 'Thanksgiving' | 'Intercession' | 'Confession' | 'Meditation' | 'Contemplation' | 'Devotional';
    content: string;
    title?: string;
    prayingFor?: string;
    scriptureRef?: string;
    insights?: string;
  }) {
    await this.clickNewEntry();
    await this.waitForFormDialog();
    await this.selectPrayerType(options.type);
    if (options.title) {
      await this.setTitle(options.title);
    }
    await this.setContent(options.content);
    if (options.prayingFor) {
      await this.setPrayingFor(options.prayingFor);
    }
    if (options.scriptureRef) {
      await this.setScriptureReference(options.scriptureRef);
    }
    if (options.insights) {
      await this.setInsights(options.insights);
    }
    await this.submitForm();
    await this.waitForFormToClose();
  }
}

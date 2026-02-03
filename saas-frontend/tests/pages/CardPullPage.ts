import { Page, expect } from '@playwright/test';

/**
 * Page Object for the Tarot Journal feature (/journal/card-pull)
 *
 * This page allows users to:
 * - Log tarot/oracle card readings from any source (self, external, SpiriVerse)
 * - View reading history
 * - Track card patterns
 * - Build a personal symbol dictionary
 */
export class CardPullPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ============================================
  // Navigation
  // ============================================

  async goto(userId: string) {
    await this.page.goto(`/u/${userId}/space/journal/card-pull`);
    // Wait for DOM to be ready (don't wait for networkidle as it can timeout on active polling)
    await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 });
  }

  async waitForPageLoad() {
    // Wait for DOM to be ready first
    await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 });

    // Check what's on the page for debugging
    const currentUrl = this.page.url();
    console.log(`[CardPullPage] Current URL: ${currentUrl}`);

    // Check if onboarding is showing (guard might still be checking)
    const onboardingVisible = await this.page.locator('h1:has-text("What speaks to your spirit?")').isVisible().catch(() => false);
    if (onboardingVisible) {
      throw new Error(
        'Onboarding UI is showing - user profile may not have primarySpiritualInterest set. ' +
        'The test setup should complete onboarding before navigating to Personal Space.'
      );
    }

    // Check if loading spinner is showing
    const loadingVisible = await this.page.locator('text=Loading your space').isVisible().catch(() => false);
    if (loadingVisible) {
      console.log('[CardPullPage] Loading spinner visible, waiting for it to disappear...');
      await expect(this.page.locator('text=Loading your space')).not.toBeVisible({ timeout: 15000 });
    }

    // Wait for the Tarot Journal heading
    await expect(this.page.locator('h1:has-text("Tarot Journal")')).toBeVisible({ timeout: 20000 });
    // Wait for the "Record a Reading" button to appear (indicates page is fully loaded)
    await expect(this.page.locator('[data-testid="new-reading-button"]')).toBeVisible({ timeout: 10000 });
    console.log('[CardPullPage] Page loaded successfully');
  }

  // ============================================
  // New Reading Button
  // ============================================

  async clickNewPull() {
    await this.page.locator('[data-testid="new-reading-button"]').click();
  }

  // ============================================
  // Form - Dialog
  // ============================================

  async waitForFormDialog() {
    await expect(this.page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
    // Wait for the source selection step to be visible and stable
    await expect(this.page.locator('[data-testid="source-selection"]')).toBeVisible({ timeout: 5000 });
    // Small delay to let any animations settle
    await this.page.waitForTimeout(300);
  }

  async waitForFormToClose() {
    // Wait for the saving indicator to complete first (mutation may take time)
    try {
      // Wait for "Saving..." to appear then disappear, or if it never appears, just continue
      const savingButton = this.page.locator('[data-testid="submit-button"]:has-text("Saving...")');
      if (await savingButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(savingButton).not.toBeVisible({ timeout: 30000 });
      }
    } catch {
      // Button may have already changed state
    }
    // Then wait for dialog to close
    await expect(this.page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 15000 });
  }

  // ============================================
  // Form - Step 1 (Source, Date, Spread)
  // ============================================

  async selectSource(source: 'SELF' | 'SPIRIVERSE' | 'EXTERNAL') {
    const sourceButton = this.page.locator(`[data-testid="source-option-${source.toLowerCase()}"]`);
    await sourceButton.waitFor({ state: 'visible', timeout: 5000 });
    await sourceButton.click({ force: true });
    await this.page.waitForTimeout(200);
  }

  async selectSpread(spreadKey: string) {
    await this.page.locator(`[data-testid="spread-${spreadKey}"]`).click();
    await this.page.waitForTimeout(200);
  }

  async clickContinue() {
    await this.page.locator('[data-testid="continue-button"]').click();
    // Wait for step 2 to appear
    await expect(this.page.locator('[data-testid="cards-step"]')).toBeVisible({ timeout: 5000 });
  }

  async goBackToSourceSelection() {
    await this.page.locator('[data-testid="back-button"]').click();
    await expect(this.page.locator('[data-testid="source-selection"]')).toBeVisible({ timeout: 5000 });
  }

  // ============================================
  // Form - Details (Step 2)
  // ============================================

  async setDate(date: string) {
    await this.page.locator('[data-testid="date-input"]').fill(date);
  }

  async selectDeck(deckLabel: string) {
    const trigger = this.page.locator('[data-testid="deck-select"]');
    await trigger.waitFor({ state: 'visible' });
    await trigger.click({ force: true });
    await this.page.locator(`[role="option"]:has-text("${deckLabel}")`).click();
  }

  async setCustomDeck(deckName: string) {
    await this.page.locator('[data-testid="custom-deck-input"]').fill(deckName);
  }

  async selectExternalPlatform(platform: 'TIKTOK' | 'YOUTUBE' | 'IN_PERSON' | 'PODCAST' | 'OTHER') {
    await this.page.locator(`[data-testid="platform-${platform.toLowerCase()}"]`).click();
  }

  async setReaderName(name: string) {
    await this.page.locator('[data-testid="reader-name-input"]').fill(name);
  }

  async setSourceUrl(url: string) {
    await this.page.locator('[data-testid="source-url-input"]').fill(url);
  }

  // ============================================
  // Form - Cards (Step 2)
  // ============================================

  async setCardName(index: number, name: string) {
    await this.page.locator(`[data-testid="card-name-input-${index}"]`).fill(name);
  }

  async toggleCardReversed(index: number) {
    await this.page.locator(`[data-testid="card-reversed-switch-${index}"]`).click();
  }

  async setCardInterpretation(index: number, interpretation: string) {
    await this.page.locator(`[data-testid="card-interpretation-input-${index}"]`).fill(interpretation);
  }

  async addCard() {
    await this.page.locator('[data-testid="add-card-button"]').click();
  }

  async removeCard(index: number) {
    await this.page.locator(`[data-testid="remove-card-${index}"]`).click();
  }

  // ============================================
  // Form - Additional Fields
  // ============================================

  async setQuestion(question: string) {
    await this.page.locator('[data-testid="question-input"]').fill(question);
  }

  async setFirstImpression(impression: string) {
    await this.page.locator('[data-testid="first-impression-input"]').fill(impression);
  }

  async setResonanceScore(score: number) {
    await this.page.locator(`[data-testid="resonance-${score}"]`).click();
  }

  // ============================================
  // Form - Submission
  // ============================================

  async submitForm() {
    await this.page.locator('[data-testid="submit-button"]').click();
  }

  async isSubmitButtonEnabled(): Promise<boolean> {
    return await this.page.locator('[data-testid="submit-button"]').isEnabled();
  }

  // ============================================
  // History Tab
  // ============================================

  async getHistoryCount(): Promise<number> {
    const history = this.page.locator('[data-testid="reading-history"]');
    if (await history.isVisible({ timeout: 5000 }).catch(() => false)) {
      return await history.locator('[data-testid^="reading-entry-"]').count();
    }
    return 0;
  }

  async isEmptyStateVisible(): Promise<boolean> {
    // Wait for loading to finish first (wait for skeletons to disappear)
    try {
      await this.page.waitForSelector('.animate-pulse', { state: 'detached', timeout: 10000 });
    } catch {
      // Skeletons may have already gone
    }
    return await this.page.locator('text=No readings logged yet').isVisible({ timeout: 5000 }).catch(() => false);
  }

  async isPullInHistory(cardName: string): Promise<boolean> {
    try {
      // First wait for the history container to appear (replaces empty state)
      await this.page.waitForSelector('[data-testid="reading-history"]', {
        state: 'visible',
        timeout: 10000
      });
      // Then wait for the specific card name text within the history
      await this.page.waitForSelector(`[data-testid="reading-history"] :text("${cardName}")`, {
        state: 'visible',
        timeout: 5000
      });
      return true;
    } catch {
      return false;
    }
  }

  async expandReadingEntry(entryId: string) {
    await this.page.locator(`[data-testid="reading-entry-${entryId}"]`).click();
  }

  async clickEditEntry(entryId: string) {
    await this.page.locator(`[data-testid="edit-entry-${entryId}"]`).click();
  }

  async clickDeleteEntry(entryId: string) {
    await this.page.locator(`[data-testid="delete-entry-${entryId}"]`).click();
  }

  /**
   * Click the edit button on the first reading entry in history
   * When editing, the form opens directly to the cards step (skipping source selection)
   */
  async clickEditFirstEntry() {
    const editButton = this.page.locator('[data-testid^="edit-entry-"]').first();
    await editButton.click();
    // Wait for dialog to appear
    await expect(this.page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
    // When editing, the form opens to cards step, not source selection
    await expect(this.page.locator('[data-testid="cards-step"]')).toBeVisible({ timeout: 5000 });
    // Small delay to let any animations settle
    await this.page.waitForTimeout(300);
  }

  /**
   * Click the delete button on the first reading entry in history
   * Handles the browser confirm dialog automatically
   */
  async clickDeleteFirstEntry() {
    const deleteButton = this.page.locator('[data-testid^="delete-entry-"]').first();

    // Wait for button to be visible and enabled
    await deleteButton.waitFor({ state: 'visible', timeout: 5000 });

    // Set up dialog handler before clicking - use a Promise to ensure proper sequencing
    const dialogPromise = this.page.waitForEvent('dialog', { timeout: 10000 }).then(async (dialog) => {
      await dialog.accept();
    });

    // Click the delete button
    await deleteButton.click();

    // Wait for the dialog to be handled
    await dialogPromise;
  }

  /**
   * Wait for the delete operation to complete
   */
  async waitForDeleteToComplete() {
    // Wait for "Deleting..." text to appear then disappear
    try {
      const deletingButton = this.page.locator('button:has-text("Deleting...")');
      if (await deletingButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(deletingButton).not.toBeVisible({ timeout: 30000 });
      }
    } catch {
      // Button may have already changed state
    }

    // Wait for the entry to be removed or empty state to appear
    // This handles the cache invalidation more reliably than a fixed timeout
    try {
      await this.page.waitForFunction(() => {
        const entries = document.querySelectorAll('[data-testid^="reading-entry-"]');
        const emptyState = document.querySelector('text=No readings logged yet') ||
          document.evaluate("//p[contains(text(), 'No readings logged yet')]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        return entries.length === 0 || emptyState !== null;
      }, { timeout: 10000 });
    } catch {
      // Fall back to waiting if the function times out
      await this.page.waitForTimeout(2000);
    }
  }

  /**
   * Check if the "needs reflection" badge is visible on the first entry
   */
  async hasNeedsReflectionBadge(): Promise<boolean> {
    return await this.page.locator('[data-testid="needs-reflection-badge"]').first().isVisible({ timeout: 3000 }).catch(() => false);
  }

  /**
   * Check if the "reflected" badge is visible on the first entry
   */
  async hasReflectedBadge(): Promise<boolean> {
    return await this.page.locator('[data-testid="reflected-badge"]').first().isVisible({ timeout: 3000 }).catch(() => false);
  }

  // ============================================
  // Tab Navigation
  // ============================================

  async selectTab(tabName: 'history' | 'patterns') {
    const tabTestIds: Record<string, string> = {
      history: 'tab-readings',
      patterns: 'tab-cards',
    };
    await this.page.locator(`[data-testid="${tabTestIds[tabName]}"]`).click();
    await this.page.waitForTimeout(300); // Allow tab content to render
  }

  async isTabActive(tabName: 'history' | 'patterns'): Promise<boolean> {
    const tabTestIds: Record<string, string> = {
      history: 'tab-readings',
      patterns: 'tab-cards',
    };
    const tab = this.page.locator(`[data-testid="${tabTestIds[tabName]}"]`);
    const classes = await tab.getAttribute('class');
    // Active tab has purple styling
    return classes?.includes('bg-purple-500/20') ?? false;
  }

  /**
   * Check if the Cards tab shows the specified card name
   */
  async isCardInPatternsTab(cardName: string): Promise<boolean> {
    await this.selectTab('patterns');
    return await this.page.locator(`text=${cardName}`).isVisible({ timeout: 5000 }).catch(() => false);
  }

  // ============================================
  // Card Patterns - Time Period Filtering
  // ============================================

  /**
   * Select a time period filter in the Card Patterns tab
   */
  async selectPatternPeriod(period: 'WEEK' | 'MONTH' | 'THREE_MONTHS' | 'SIX_MONTHS' | 'YEAR' | 'ALL_TIME') {
    await this.selectTab('patterns');
    const periodLabels: Record<string, string> = {
      'WEEK': 'This Week',
      'MONTH': 'This Month',
      'THREE_MONTHS': 'Last 3 Months',
      'SIX_MONTHS': 'Last 6 Months',
      'YEAR': 'This Year',
      'ALL_TIME': 'All Time',
    };
    const label = periodLabels[period];
    // Click the period button (visible on desktop)
    await this.page.locator(`button:has-text("${label}")`).click();
    // Wait for data to refresh
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if the period selector is visible
   */
  async isPeriodSelectorVisible(): Promise<boolean> {
    await this.selectTab('patterns');
    // Check for "This Month" button which is always visible as default
    return await this.page.locator('button:has-text("This Month")').isVisible({ timeout: 5000 }).catch(() => false);
  }

  /**
   * Check if the "What's Emerging" section is visible
   */
  async hasEmergingCardsSection(): Promise<boolean> {
    return await this.page.locator('text=What\'s Emerging').isVisible({ timeout: 5000 }).catch(() => false);
  }

  /**
   * Check if the "What's Fading" section is visible
   */
  async hasFadingCardsSection(): Promise<boolean> {
    return await this.page.locator('text=What\'s Fading').isVisible({ timeout: 5000 }).catch(() => false);
  }

  /**
   * Get the period date range text (e.g., "Nov 1 - Dec 1, 2025")
   */
  async getPeriodDateRange(): Promise<string | null> {
    const dateRange = this.page.locator('.text-slate-400').filter({ hasText: /[A-Z][a-z]{2} \d+/ }).first();
    if (await dateRange.isVisible({ timeout: 3000 }).catch(() => false)) {
      return await dateRange.textContent();
    }
    return null;
  }

  /**
   * Check if comparison stats are shown (e.g., "+2 readings vs last period")
   */
  async hasComparisonStats(): Promise<boolean> {
    // Look for the change indicator (arrows with percentage)
    const hasUpArrow = await this.page.locator('text=/\\+\\d+.*%/').isVisible({ timeout: 3000 }).catch(() => false);
    const hasDownArrow = await this.page.locator('text=/-\\d+.*%/').isVisible({ timeout: 3000 }).catch(() => false);
    const hasNoChange = await this.page.locator('text=No change').isVisible({ timeout: 3000 }).catch(() => false);
    return hasUpArrow || hasDownArrow || hasNoChange;
  }

  /**
   * Check if the patterns empty state for a specific period is shown
   */
  async hasPatternsPeriodEmptyState(): Promise<boolean> {
    return await this.page.locator('text=No readings in').isVisible({ timeout: 3000 }).catch(() => false);
  }

  /**
   * Get the total readings count displayed in the stats
   */
  async getReadingsCount(): Promise<number> {
    await this.selectTab('patterns');
    // The stat card structure is: parent div > flex div with label span > value div
    // Find the span with "Readings" text, go up to parent stat card, then find the value
    const readingsLabel = this.page.locator('span.text-slate-400:text-is("Readings")');
    // Navigate to sibling - the value div is a sibling of the label's parent flex div
    const statCard = readingsLabel.locator('xpath=ancestor::div[contains(@class, "rounded-xl")]');
    const valueText = await statCard.locator('div.text-2xl').textContent();
    return parseInt(valueText || '0', 10);
  }
}

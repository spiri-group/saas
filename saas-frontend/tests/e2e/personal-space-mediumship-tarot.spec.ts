import { test, expect, Page, TestInfo } from '@playwright/test';
import { CardPullPage } from '../pages/CardPullPage';
import { AuthPage } from '../pages/AuthPage';
import { HomePage } from '../pages/HomePage';
import { UserSetupPage } from '../pages/UserSetupPage';
import { OnboardingPage } from '../pages/OnboardingPage';
import { TEST_CONFIG } from '../fixtures/test-config';
import {
  clearTestEntityRegistry,
  registerTestUser,
  getCookiesFromPage,
  cleanupTestUsers,
} from '../utils/test-cleanup';

// Store cookies per test worker to avoid race conditions
const cookiesPerWorker = new Map<number, string>();

/**
 * Tarot Journal Tests
 *
 * Tests the Tarot Journal feature (/journal/card-pull):
 * - Source selection (self-pull, external, SpiriVerse)
 * - Record readings with deck and cards
 * - Per-card interpretation
 * - History display
 *
 * Requires MEDIUMSHIP spiritual interest to be set in onboarding.
 */

// Cleanup before tests
test.beforeAll(async ({}, testInfo) => {
  console.log('[Setup] Preparing test environment for Tarot Journal...');
  clearTestEntityRegistry(testInfo.parallelIndex);
});

// Cleanup after all tests
test.afterAll(async ({}, testInfo) => {
  test.setTimeout(120000); // 2 minutes for cleanup

  const workerId = testInfo.parallelIndex;
  const cookies = cookiesPerWorker.get(workerId);

  if (cookies) {
    try {
      await cleanupTestUsers(cookies, workerId);
    } catch (error) {
      console.error('[Cleanup] Error during cleanup:', error);
    } finally {
      cookiesPerWorker.delete(workerId);
    }
  }
  clearTestEntityRegistry(workerId);
});

/**
 * Helper to set up authenticated user with spiritual interests
 */
async function setupAuthenticatedUser(
  page: Page,
  testInfo: TestInfo,
  authPage: AuthPage,
  homePage: HomePage,
  setupPage: UserSetupPage,
  onboardingPage: OnboardingPage
): Promise<string> {
  const testEmail = TEST_CONFIG.TEST_EMAIL;
  let testUserId = '';

  await page.goto('/');
  await authPage.startAuthFlow(testEmail);
  await expect(page.locator('[aria-label="input-login-otp"]')).toBeVisible({ timeout: 15000 });
  await page.locator('[aria-label="input-login-otp"]').click();
  await page.keyboard.type('123456');
  await page.waitForURL('/', { timeout: 15000 });

  try {
    await homePage.waitForCompleteProfileLink();
    await homePage.clickCompleteProfile();
    await expect(page).toHaveURL(/\/u\/.*\/setup/, { timeout: 10000 });

    const url = page.url();
    const userIdMatch = url.match(/\/u\/([^\/]+)\/setup/);
    if (userIdMatch) {
      testUserId = userIdMatch[1];
      registerTestUser({ id: testUserId, email: testEmail }, testInfo.parallelIndex);
      const cookies = await getCookiesFromPage(page);
      if (cookies) cookiesPerWorker.set(testInfo.parallelIndex, cookies);
    }

    await setupPage.fillUserProfile({
      firstName: 'Test',
      lastName: 'User',
      phone: '0412345678',
      address: 'Sydney Opera House',
      securityQuestion: 'What is your favorite color?',
      securityAnswer: 'Blue',
    });
    await setupPage.startBrowsing();
    await page.waitForURL('/', { timeout: 15000 });

    // Click "My Personal Space" link - new user will see onboarding inline
    const personalSpaceLink = page.locator('a:has-text("My Personal Space")');
    await expect(personalSpaceLink).toBeVisible({ timeout: 10000 });
    await personalSpaceLink.click();

    // Wait for page to load - will show onboarding UI inline for new users
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    console.log('[Setup] Clicked My Personal Space, completing onboarding...');

    // Complete onboarding with MEDIUMSHIP as primary interest
    // The guard shows onboarding inline and will automatically switch to
    // Personal Space when the mutation completes
    await onboardingPage.completeWithPrimaryOnly('mediumship');
    console.log('[Setup] Entered Personal Space successfully');
  } catch (error) {
    console.error('[Setup] Error during setup:', error);
    throw error; // Re-throw so the test fails properly
  }

  return testUserId;
}

test.describe('Personal Space - Mediumship - Tarot', () => {
  test('should display empty state and open form with source selection', async ({ page }, testInfo) => {
    const cardPullPage = new CardPullPage(page);
    const authPage = new AuthPage(page);
    const homePage = new HomePage(page);
    const setupPage = new UserSetupPage(page);
    const onboardingPage = new OnboardingPage(page);

    const testUserId = await setupAuthenticatedUser(page, testInfo, authPage, homePage, setupPage, onboardingPage);
    await cardPullPage.goto(testUserId);
    await cardPullPage.waitForPageLoad();

    // Should show empty state
    expect(await cardPullPage.isEmptyStateVisible()).toBe(true);

    // Open form dialog
    await cardPullPage.clickNewPull();
    await cardPullPage.waitForFormDialog();

    // Step 1: Should show source selection, date, and spread options
    await expect(page.locator('[data-testid="source-selection"]')).toBeVisible();
    await expect(page.locator('[data-testid="source-option-self"]')).toBeVisible();
    await expect(page.locator('[data-testid="source-option-external"]')).toBeVisible();
    await expect(page.locator('[data-testid="date-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="spread-single"]')).toBeVisible();

    // Select source and spread, then continue to step 2
    await cardPullPage.selectSource('SELF');
    await cardPullPage.selectSpread('three-card');
    await cardPullPage.clickContinue();

    // Step 2: Form should now have deck select and card inputs
    await expect(page.locator('[data-testid="deck-select"]')).toBeVisible();
    await expect(page.locator('[data-testid="card-name-input-0"]')).toBeVisible();
  });

  test('should create a self-pull reading and display in history', async ({ page }, testInfo) => {
    const cardPullPage = new CardPullPage(page);
    const authPage = new AuthPage(page);
    const homePage = new HomePage(page);
    const setupPage = new UserSetupPage(page);
    const onboardingPage = new OnboardingPage(page);

    const testUserId = await setupAuthenticatedUser(page, testInfo, authPage, homePage, setupPage, onboardingPage);
    await cardPullPage.goto(testUserId);
    await cardPullPage.waitForPageLoad();

    // Open form, select source and spread, continue to step 2
    await cardPullPage.clickNewPull();
    await cardPullPage.waitForFormDialog();
    await cardPullPage.selectSource('SELF');
    await cardPullPage.selectSpread('single');
    await cardPullPage.clickContinue();

    // Fill form
    await cardPullPage.selectDeck('Rider-Waite-Smith');
    await cardPullPage.setCardName(0, 'The Fool');

    // Continue to step 3 (reflection) - submit button is there
    await page.locator('[data-testid="next-button"]').click();
    await expect(page.locator('[data-testid="reflection-step"]')).toBeVisible();

    // Submit should be enabled now
    expect(await cardPullPage.isSubmitButtonEnabled()).toBe(true);

    await cardPullPage.submitForm();
    await cardPullPage.waitForFormToClose();

    // Should appear in history
    expect(await cardPullPage.isPullInHistory('The Fool')).toBe(true);
    expect(await cardPullPage.getHistoryCount()).toBe(1);
  });

  test('should create a reading with multiple cards and interpretations', async ({ page }, testInfo) => {
    // This test creates multiple cards with interpretations - needs more time
    test.setTimeout(120000);

    const cardPullPage = new CardPullPage(page);
    const authPage = new AuthPage(page);
    const homePage = new HomePage(page);
    const setupPage = new UserSetupPage(page);
    const onboardingPage = new OnboardingPage(page);

    const testUserId = await setupAuthenticatedUser(page, testInfo, authPage, homePage, setupPage, onboardingPage);
    await cardPullPage.goto(testUserId);
    await cardPullPage.waitForPageLoad();

    // Open form, select source and spread, continue to step 2
    await cardPullPage.clickNewPull();
    await cardPullPage.waitForFormDialog();
    await cardPullPage.selectSource('SELF');
    await cardPullPage.selectSpread('three-card');
    await cardPullPage.clickContinue();

    // Fill form with multiple cards (3-card spread pre-populates 3 card inputs)
    await cardPullPage.selectDeck('Rider-Waite-Smith');

    // Fill all three cards
    await cardPullPage.setCardName(0, 'Ten of Cups');
    await cardPullPage.setCardName(1, 'The Tower');
    await cardPullPage.toggleCardReversed(1);
    await cardPullPage.setCardName(2, 'The Star');

    // Continue to step 3 (reflection)
    await page.locator('[data-testid="next-button"]').click();
    await expect(page.locator('[data-testid="reflection-step"]')).toBeVisible();

    // Add interpretations in step 3
    await cardPullPage.setCardInterpretation(0, 'Happiness and emotional fulfillment');
    await cardPullPage.setCardInterpretation(1, 'Change is coming but will be positive');
    await cardPullPage.setCardInterpretation(2, 'Hope and inspiration ahead');

    await cardPullPage.submitForm();
    await cardPullPage.waitForFormToClose();

    // Should appear in history
    expect(await cardPullPage.isPullInHistory('Ten of Cups')).toBe(true);
    expect(await cardPullPage.isPullInHistory('The Tower')).toBe(true);
    expect(await cardPullPage.isPullInHistory('The Star')).toBe(true);

    // Expand the reading entry to verify interpretations were saved
    const readingEntry = page.locator('[data-testid^="reading-entry-"]').first();
    await readingEntry.click();

    // Verify interpretations are visible
    await expect(page.locator('text=Happiness and emotional fulfillment')).toBeVisible();
    await expect(page.locator('text=Change is coming but will be positive')).toBeVisible();
    await expect(page.locator('text=Hope and inspiration ahead')).toBeVisible();
  });

  test('should display reading data in Cards tab with patterns', async ({ page }, testInfo) => {
    // This test creates a multi-card reading and checks the patterns tab
    test.setTimeout(120000);

    const cardPullPage = new CardPullPage(page);
    const authPage = new AuthPage(page);
    const homePage = new HomePage(page);
    const setupPage = new UserSetupPage(page);
    const onboardingPage = new OnboardingPage(page);

    const testUserId = await setupAuthenticatedUser(page, testInfo, authPage, homePage, setupPage, onboardingPage);
    await cardPullPage.goto(testUserId);
    await cardPullPage.waitForPageLoad();

    // Create a reading with both Major Arcana and Minor Arcana cards
    await cardPullPage.clickNewPull();
    await cardPullPage.waitForFormDialog();
    await cardPullPage.selectSource('SELF');
    await cardPullPage.selectSpread('other'); // Use "other" to add custom number of cards
    await cardPullPage.clickContinue();
    await cardPullPage.selectDeck('Rider-Waite-Smith');

    // Add The Moon (Major Arcana) and Ten of Cups (Minor Arcana - Cups suit)
    await cardPullPage.setCardName(0, 'The Moon');
    await cardPullPage.addCard();
    await cardPullPage.setCardName(1, 'Ten of Cups');

    await page.locator('[data-testid="next-button"]').click();
    await expect(page.locator('[data-testid="reflection-step"]')).toBeVisible();

    // Add interpretations
    await cardPullPage.setCardInterpretation(0, 'Intuition and hidden truths');
    await cardPullPage.setCardInterpretation(1, 'Happiness and emotional fulfillment');
    await cardPullPage.submitForm();
    await cardPullPage.waitForFormToClose();

    // Verify both cards appear in history
    expect(await cardPullPage.isPullInHistory('The Moon')).toBe(true);
    expect(await cardPullPage.isPullInHistory('Ten of Cups')).toBe(true);

    // Check Cards tab - should show card patterns
    await cardPullPage.selectTab('patterns');
    const cardsTabContent = page.locator('h2:has-text("Card Patterns")');
    await expect(cardsTabContent).toBeVisible({ timeout: 5000 });

    // Both cards should appear in Most Frequent Cards
    await expect(page.locator('text=The Moon').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Ten of Cups').first()).toBeVisible({ timeout: 5000 });

    // Major Arcana stat should show (The Moon is Major Arcana)
    await expect(page.locator('text=Major Arcana')).toBeVisible({ timeout: 5000 });

    // Cups should appear in Suit Distribution (Ten of Cups is Minor Arcana)
    await expect(page.locator('text=Cups').first()).toBeVisible({ timeout: 5000 });

    // Go back to Readings tab and verify both cards still show
    await cardPullPage.selectTab('history');
    expect(await cardPullPage.isPullInHistory('The Moon')).toBe(true);
    expect(await cardPullPage.isPullInHistory('Ten of Cups')).toBe(true);
  });

  test('should validate required fields', async ({ page }, testInfo) => {
    const cardPullPage = new CardPullPage(page);
    const authPage = new AuthPage(page);
    const homePage = new HomePage(page);
    const setupPage = new UserSetupPage(page);
    const onboardingPage = new OnboardingPage(page);

    const testUserId = await setupAuthenticatedUser(page, testInfo, authPage, homePage, setupPage, onboardingPage);
    await cardPullPage.goto(testUserId);
    await cardPullPage.waitForPageLoad();

    await cardPullPage.clickNewPull();
    await cardPullPage.waitForFormDialog();
    await cardPullPage.selectSource('SELF');
    await cardPullPage.selectSpread('single');
    await cardPullPage.clickContinue();

    // Continue button (to step 3) should be disabled with empty card name
    const nextButton = page.locator('[data-testid="next-button"]');
    expect(await nextButton.isEnabled()).toBe(false);

    // Select deck only - still disabled (no card name)
    await cardPullPage.selectDeck('Rider-Waite-Smith');
    expect(await nextButton.isEnabled()).toBe(false);

    // Add card name - should enable
    await cardPullPage.setCardName(0, 'Ace of Wands');
    expect(await nextButton.isEnabled()).toBe(true);

    // Clear card name - should disable again
    await cardPullPage.setCardName(0, '');
    expect(await nextButton.isEnabled()).toBe(false);
  });

  test('should delete a reading from history', async ({ page }, testInfo) => {
    const cardPullPage = new CardPullPage(page);
    const authPage = new AuthPage(page);
    const homePage = new HomePage(page);
    const setupPage = new UserSetupPage(page);
    const onboardingPage = new OnboardingPage(page);

    const testUserId = await setupAuthenticatedUser(page, testInfo, authPage, homePage, setupPage, onboardingPage);
    await cardPullPage.goto(testUserId);
    await cardPullPage.waitForPageLoad();

    // First create a reading to delete
    await cardPullPage.clickNewPull();
    await cardPullPage.waitForFormDialog();
    await cardPullPage.selectSource('SELF');
    await cardPullPage.selectSpread('single');
    await cardPullPage.clickContinue();
    await cardPullPage.selectDeck('Rider-Waite-Smith');
    await cardPullPage.setCardName(0, 'The Magician');
    await page.locator('[data-testid="next-button"]').click();
    await expect(page.locator('[data-testid="reflection-step"]')).toBeVisible();
    await cardPullPage.submitForm();
    await cardPullPage.waitForFormToClose();

    // Verify reading was created
    expect(await cardPullPage.isPullInHistory('The Magician')).toBe(true);
    expect(await cardPullPage.getHistoryCount()).toBe(1);

    // Delete the reading
    await cardPullPage.clickDeleteFirstEntry();
    await cardPullPage.waitForDeleteToComplete();

    // Should show empty state again - use Playwright's auto-retry expect
    await expect(page.locator('text=No readings logged yet')).toBeVisible({ timeout: 15000 });
    expect(await cardPullPage.getHistoryCount()).toBe(0);
  });

  test('should show needs reflection badge and allow editing to add interpretations', async ({ page }, testInfo) => {
    // This test creates a reading, edits it to add interpretations - needs more time
    test.setTimeout(120000);

    const cardPullPage = new CardPullPage(page);
    const authPage = new AuthPage(page);
    const homePage = new HomePage(page);
    const setupPage = new UserSetupPage(page);
    const onboardingPage = new OnboardingPage(page);

    const testUserId = await setupAuthenticatedUser(page, testInfo, authPage, homePage, setupPage, onboardingPage);
    await cardPullPage.goto(testUserId);
    await cardPullPage.waitForPageLoad();

    // Create a reading WITHOUT reflections (skip step 3)
    await cardPullPage.clickNewPull();
    await cardPullPage.waitForFormDialog();
    await cardPullPage.selectSource('SELF');
    await cardPullPage.selectSpread('single');
    await cardPullPage.clickContinue();
    await cardPullPage.selectDeck('Rider-Waite-Smith');
    await cardPullPage.setCardName(0, 'The High Priestess');
    await page.locator('[data-testid="next-button"]').click();
    await expect(page.locator('[data-testid="reflection-step"]')).toBeVisible();

    // Submit without adding interpretations - use the "skip reflection" link
    await page.locator('button:has-text("Skip reflection and save now")').click();
    await cardPullPage.waitForFormToClose();

    // Verify reading appears in history
    expect(await cardPullPage.isPullInHistory('The High Priestess')).toBe(true);

    // Should show "needs reflection" badge (not "reflected")
    expect(await cardPullPage.hasNeedsReflectionBadge()).toBe(true);
    expect(await cardPullPage.hasReflectedBadge()).toBe(false);

    // Edit the reading to add interpretations
    await cardPullPage.clickEditFirstEntry();

    // Should open directly to step 2 (cards) when editing
    await expect(page.locator('[data-testid="cards-step"]')).toBeVisible();

    // Go to step 3 to add interpretations
    await page.locator('[data-testid="next-button"]').click();
    await expect(page.locator('[data-testid="reflection-step"]')).toBeVisible();

    // Add an interpretation
    await cardPullPage.setCardInterpretation(0, 'Intuition and inner wisdom');
    await cardPullPage.submitForm();
    await cardPullPage.waitForFormToClose();

    // Wait for the cache to invalidate and UI to update
    await page.waitForTimeout(1000);

    // Now should show "reflected" badge instead of "needs reflection"
    await expect(page.locator('[data-testid="reflected-badge"]')).toBeVisible({ timeout: 10000 });
    expect(await cardPullPage.hasNeedsReflectionBadge()).toBe(false);

    // Verify interpretation was saved by expanding the entry
    const readingEntry = page.locator('[data-testid^="reading-entry-"]').first();
    await readingEntry.click();
    await expect(page.locator('text=Intuition and inner wisdom')).toBeVisible();
  });

  test('should display card patterns with time period filtering', async ({ page }, testInfo) => {
    // This test creates multiple readings with different dates to test time filtering
    test.setTimeout(180000);
    const cardPullPage = new CardPullPage(page);
    const authPage = new AuthPage(page);
    const homePage = new HomePage(page);
    const setupPage = new UserSetupPage(page);
    const onboardingPage = new OnboardingPage(page);

    const testUserId = await setupAuthenticatedUser(page, testInfo, authPage, homePage, setupPage, onboardingPage);
    await cardPullPage.goto(testUserId);
    await cardPullPage.waitForPageLoad();

    // Calculate dates for testing
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0]; // YYYY-MM-DD

    // Reading 1: Today (should appear in Week, Month, All Time)
    const todayStr = formatDate(today);

    // Reading 2: 2 months ago (should appear in Month if within 30 days, otherwise only in 3 Months and All Time)
    const twoMonthsAgo = new Date(today);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const twoMonthsAgoStr = formatDate(twoMonthsAgo);

    // Helper to create a reading with a specific date and card
    const createReading = async (date: string, cardName: string) => {
      await cardPullPage.clickNewPull();
      await cardPullPage.waitForFormDialog();
      await cardPullPage.selectSource('SELF');
      await cardPullPage.selectSpread('single');
      await cardPullPage.setDate(date);
      await cardPullPage.clickContinue();
      await cardPullPage.selectDeck('Rider-Waite-Smith');
      await cardPullPage.setCardName(0, cardName);
      await page.locator('[data-testid="next-button"]').click();
      await expect(page.locator('[data-testid="reflection-step"]')).toBeVisible();
      await cardPullPage.submitForm();
      await cardPullPage.waitForFormToClose();
    };

    // Create reading from 2 months ago
    await createReading(twoMonthsAgoStr, 'The Empress');
    expect(await cardPullPage.isPullInHistory('The Empress')).toBe(true);

    // Create reading from today
    await createReading(todayStr, 'The High Priestess');
    expect(await cardPullPage.isPullInHistory('The High Priestess')).toBe(true);

    // Navigate to Card Patterns tab
    await cardPullPage.selectTab('patterns');

    // Wait for the Card Patterns dashboard to load
    await expect(page.locator('.animate-spin')).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("This Month")')).toBeVisible({ timeout: 10000 });

    // Verify period selector is visible
    expect(await cardPullPage.isPeriodSelectorVisible()).toBe(true);

    // "This Month" should show only The High Priestess (today's reading)
    await expect(page.locator('text=The High Priestess').first()).toBeVisible({ timeout: 5000 });
    // The Empress was 2 months ago, should NOT appear in "This Month"
    await expect(page.locator('text=The Empress')).not.toBeVisible({ timeout: 3000 });

    // Verify stat cards are showing
    await expect(page.locator('text=Cards Pulled')).toBeVisible();
    await expect(page.locator('text=Major Arcana')).toBeVisible();

    // Switch to "This Week" - should still only show The High Priestess
    await cardPullPage.selectPatternPeriod('WEEK');
    await expect(page.locator('text=The High Priestess').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=The Empress')).not.toBeVisible({ timeout: 3000 });

    // Switch to "Last 3 Months" - should show BOTH cards
    await cardPullPage.selectPatternPeriod('THREE_MONTHS');
    await expect(page.locator('text=The High Priestess').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=The Empress').first()).toBeVisible({ timeout: 5000 });

    // Switch to "All Time" - should show BOTH cards
    await cardPullPage.selectPatternPeriod('ALL_TIME');
    await expect(page.locator('text=The High Priestess').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=The Empress').first()).toBeVisible({ timeout: 5000 });

    // Verify the readings count in All Time shows 2
    const readingsCount = await cardPullPage.getReadingsCount();
    expect(readingsCount).toBe(2);
  });
});

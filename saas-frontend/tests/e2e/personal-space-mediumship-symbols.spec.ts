import { test, expect, Page, TestInfo } from '@playwright/test';
import { SymbolsPage } from '../pages/SymbolsPage';
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
 * Symbols Feature Tests
 *
 * Tests the Symbols feature (/space/symbols):
 * - Dashboard with stats
 * - My Card Symbols CRUD
 * - Card filtering and search
 *
 * Requires MEDIUMSHIP spiritual interest to be set in onboarding.
 */

// Cleanup before tests
test.beforeAll(async ({}, testInfo) => {
  console.log('[Setup] Preparing test environment for Symbols...');
  clearTestEntityRegistry(testInfo.parallelIndex);
});

// Cleanup after all tests
test.afterAll(async ({}, testInfo) => {
  test.setTimeout(120000);

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

    const personalSpaceLink = page.locator('a:has-text("My Personal Space")');
    await expect(personalSpaceLink).toBeVisible({ timeout: 10000 });
    await personalSpaceLink.click();

    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await onboardingPage.completeWithPrimaryOnly('mediumship');
  } catch (error) {
    console.error('[Setup] Error during setup:', error);
    throw error;
  }

  return testUserId;
}

test.describe('Personal Space - Mediumship - Symbols', () => {
  test('should display dashboard and navigate to My Card Symbols', async ({ page }, testInfo) => {
    test.setTimeout(90000);

    const symbolsPage = new SymbolsPage(page);
    const authPage = new AuthPage(page);
    const homePage = new HomePage(page);
    const setupPage = new UserSetupPage(page);
    const onboardingPage = new OnboardingPage(page);

    const testUserId = await setupAuthenticatedUser(page, testInfo, authPage, homePage, setupPage, onboardingPage);

    // Test Dashboard
    await symbolsPage.gotoDashboard(testUserId);
    await symbolsPage.waitForDashboardLoad();

    expect(await symbolsPage.isDashboardVisible()).toBe(true);
    await expect(page.locator('[data-testid="total-symbols-stat"]')).toBeVisible();
    await expect(page.locator('[data-testid="cross-entry-stat"]')).toBeVisible();

    // New user should have 0 symbols
    const totalSymbols = await symbolsPage.getTotalSymbolsCount();
    expect(totalSymbols).toBe('0');

    // Navigate to My Card Symbols
    await symbolsPage.gotoMyCardSymbols(testUserId);
    await symbolsPage.waitForMyCardSymbolsLoad();

    expect(await symbolsPage.isMyCardSymbolsPageVisible()).toBe(true);
    await expect(page.locator('[data-testid="filter-all"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-major"]')).toBeVisible();

    // Cards should be visible
    expect(await symbolsPage.isCardVisible('The Fool')).toBe(true);
    expect(await symbolsPage.getCustomizedCount()).toBe(0);
  });

  test('should filter and search cards', async ({ page }, testInfo) => {
    test.setTimeout(90000);

    const symbolsPage = new SymbolsPage(page);
    const authPage = new AuthPage(page);
    const homePage = new HomePage(page);
    const setupPage = new UserSetupPage(page);
    const onboardingPage = new OnboardingPage(page);

    const testUserId = await setupAuthenticatedUser(page, testInfo, authPage, homePage, setupPage, onboardingPage);
    await symbolsPage.gotoMyCardSymbols(testUserId);
    await symbolsPage.waitForMyCardSymbolsLoad();

    // Test Major Arcana filter
    await symbolsPage.clickFilter('major');
    await page.waitForTimeout(300);
    expect(await symbolsPage.isCardVisible('The Fool')).toBe(true);
    expect(await symbolsPage.isCardVisible('Death')).toBe(true);
    expect(await symbolsPage.isCardVisible('Ace of Cups')).toBe(false);

    // Test Cups filter
    await symbolsPage.clickFilter('cups');
    await page.waitForTimeout(300);
    expect(await symbolsPage.isCardVisible('Ace of Cups')).toBe(true);
    expect(await symbolsPage.isCardVisible('The Fool')).toBe(false);

    // Reset to All
    await symbolsPage.clickFilter('all');
    await page.waitForTimeout(300);

    // Test search
    await symbolsPage.searchCard('Moon');
    await page.waitForTimeout(300);
    expect(await symbolsPage.isCardVisible('The Moon')).toBe(true);
    expect(await symbolsPage.isCardVisible('The Sun')).toBe(false);

    // Clear search
    await symbolsPage.clearSearch();
    await page.waitForTimeout(300);
    expect(await symbolsPage.isCardVisible('The Sun')).toBe(true);
  });

  test('should create, update, and delete personal card symbols', async ({ page }, testInfo) => {
    test.setTimeout(120000);

    const symbolsPage = new SymbolsPage(page);
    const authPage = new AuthPage(page);
    const homePage = new HomePage(page);
    const setupPage = new UserSetupPage(page);
    const onboardingPage = new OnboardingPage(page);

    const testUserId = await setupAuthenticatedUser(page, testInfo, authPage, homePage, setupPage, onboardingPage);
    await symbolsPage.gotoMyCardSymbols(testUserId);
    await symbolsPage.waitForMyCardSymbolsLoad();

    // === CREATE ===
    expect(await symbolsPage.getCustomizedCount()).toBe(0);

    await symbolsPage.clickCard('The Fool');
    await symbolsPage.waitForEditDialog();
    await symbolsPage.setPersonalSymbols('adventure, spontaneity, trust');
    await symbolsPage.setNotes('Embracing new beginnings');
    await symbolsPage.clickSave();
    await symbolsPage.waitForEditDialogToClose();

    // Wait for badge to appear
    await expect(page.locator('[data-testid="card-the-fool"] [data-testid="customized-badge"]')).toBeVisible({ timeout: 10000 });
    expect(await symbolsPage.getCustomizedCount()).toBe(1);

    // === UPDATE ===
    await symbolsPage.clickCard('The Fool');
    await symbolsPage.waitForEditDialog();

    // Verify existing data loaded
    const existingSymbols = await symbolsPage.getPersonalSymbols();
    expect(existingSymbols).toContain('adventure');
    expect(await symbolsPage.isDeleteButtonVisible()).toBe(true);

    // Update and toggle "Use Personal Only"
    await symbolsPage.setPersonalSymbols('adventure, freedom, new journey');
    await symbolsPage.toggleUsePersonalOnly();
    expect(await symbolsPage.isUsePersonalOnlyChecked()).toBe(true);

    await symbolsPage.clickSave();
    await symbolsPage.waitForEditDialogToClose();
    await expect(page.locator('text=Card symbols updated')).toBeVisible({ timeout: 5000 });

    // === DELETE ===
    await symbolsPage.deleteCardSymbol('The Fool');
    expect(await symbolsPage.getCustomizedCount()).toBe(0);
  });

  test('should show customized filter correctly', async ({ page }, testInfo) => {
    test.setTimeout(120000);

    const symbolsPage = new SymbolsPage(page);
    const authPage = new AuthPage(page);
    const homePage = new HomePage(page);
    const setupPage = new UserSetupPage(page);
    const onboardingPage = new OnboardingPage(page);

    const testUserId = await setupAuthenticatedUser(page, testInfo, authPage, homePage, setupPage, onboardingPage);
    await symbolsPage.gotoMyCardSymbols(testUserId);
    await symbolsPage.waitForMyCardSymbolsLoad();

    // Create symbols for two cards
    await symbolsPage.createCardSymbol('The Sun', 'joy, vitality, success');
    await symbolsPage.createCardSymbol('Ace of Wands', 'inspiration, passion');

    expect(await symbolsPage.getCustomizedCount()).toBe(2);

    // Click customized filter
    await symbolsPage.clickFilter('customized');
    await page.waitForTimeout(300);

    // Only customized cards should be visible
    expect(await symbolsPage.isCardVisible('The Sun')).toBe(true);
    expect(await symbolsPage.isCardVisible('Ace of Wands')).toBe(true);
    expect(await symbolsPage.isCardVisible('The Fool')).toBe(false);
    expect(await symbolsPage.isCardVisible('The Moon')).toBe(false);
  });

  test('should cancel edit without saving', async ({ page }, testInfo) => {
    test.setTimeout(60000);

    const symbolsPage = new SymbolsPage(page);
    const authPage = new AuthPage(page);
    const homePage = new HomePage(page);
    const setupPage = new UserSetupPage(page);
    const onboardingPage = new OnboardingPage(page);

    const testUserId = await setupAuthenticatedUser(page, testInfo, authPage, homePage, setupPage, onboardingPage);
    await symbolsPage.gotoMyCardSymbols(testUserId);
    await symbolsPage.waitForMyCardSymbolsLoad();

    const initialCount = await symbolsPage.getCustomizedCount();

    // Open dialog, enter data, then cancel
    await symbolsPage.clickCard('Death');
    await symbolsPage.waitForEditDialog();
    await symbolsPage.setPersonalSymbols('transformation, endings');
    await symbolsPage.clickCancel();
    await symbolsPage.waitForEditDialogToClose();

    await page.waitForTimeout(500);

    // Nothing should have changed
    expect(await symbolsPage.getCustomizedCount()).toBe(initialCount);
    expect(await symbolsPage.isCardCustomized('Death')).toBe(false);
  });
});

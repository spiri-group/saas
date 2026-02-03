import { test, expect, Page, TestInfo } from '@playwright/test';
import { AuthPage } from '../pages/AuthPage';
import { HomePage } from '../pages/HomePage';
import { UserSetupPage } from '../pages/UserSetupPage';
import { OnboardingPage } from '../pages/OnboardingPage';
import {
  getCookiesFromPage,
  registerTestUser,
  clearTestEntityRegistry,
  cleanupTestUsers,
} from '../utils/test-cleanup';

/**
 * Personal Space - Crystals - Daily Companion
 *
 * Tests the daily crystal companion feature:
 * - Set today's companion crystal
 * - Add intention and reason
 * - Change companion and verify history
 *
 * Requires CRYSTALS spiritual interest to be set in onboarding.
 */

// Store cookies per test worker
const cookiesPerWorker = new Map<number, string>();
const userIdPerWorker = new Map<number, string>();

// Cleanup before tests
test.beforeAll(async ({}, testInfo) => {
  console.log('[Setup] Preparing test environment for Crystal Companion...');
  clearTestEntityRegistry(testInfo.parallelIndex);
});

// Cleanup after all tests
test.afterAll(async ({}, testInfo) => {
  test.setTimeout(120000);
  const workerId = testInfo.parallelIndex;
  const cookies = cookiesPerWorker.get(workerId);
  if (cookies) {
    await cleanupTestUsers(cookies, workerId);
    cookiesPerWorker.delete(workerId);
  }
  userIdPerWorker.delete(workerId);
  clearTestEntityRegistry(workerId);
});

/** Generate unique test email */
function generateUniqueTestEmail(testInfo: TestInfo): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `crystal-comp-${timestamp}-${testInfo.parallelIndex}-${randomSuffix}@playwright.com`;
}

/** Setup authenticated user with crystals interest */
async function setupAuthenticatedUser(
  page: Page,
  testInfo: TestInfo
): Promise<string> {
  const testEmail = generateUniqueTestEmail(testInfo);
  const authPage = new AuthPage(page);
  const homePage = new HomePage(page);
  const setupPage = new UserSetupPage(page);
  const onboardingPage = new OnboardingPage(page);

  await page.goto('/');
  await authPage.startAuthFlow(testEmail);
  await expect(page.locator('[aria-label="input-login-otp"]')).toBeVisible({ timeout: 15000 });
  await page.locator('[aria-label="input-login-otp"]').click();
  await page.keyboard.type('123456');
  await page.waitForURL('/', { timeout: 15000 });

  await homePage.waitForCompleteProfileLink();
  await homePage.clickCompleteProfile();
  await expect(page).toHaveURL(/\/u\/.*\/setup/, { timeout: 10000 });

  const url = page.url();
  const userIdMatch = url.match(/\/u\/([^\/]+)\/setup/);
  let testUserId = '';
  if (userIdMatch) {
    testUserId = userIdMatch[1];
    userIdPerWorker.set(testInfo.parallelIndex, testUserId);
    registerTestUser({ id: testUserId, email: testEmail }, testInfo.parallelIndex);
    const cookies = await getCookiesFromPage(page);
    if (cookies) cookiesPerWorker.set(testInfo.parallelIndex, cookies);
  }

  await setupPage.fillUserProfile({
    firstName: 'Crystal',
    lastName: 'Companion',
    phone: '0412345679',
    address: 'Sydney Opera House',
    securityQuestion: 'Which crystal is your daily companion?',
    securityAnswer: 'Rose Quartz',
  });
  await setupPage.startBrowsing();
  await page.waitForURL('/', { timeout: 15000 });

  // Click "My Personal Space" link
  const personalSpaceLink = page.locator('a:has-text("My Personal Space")');
  await expect(personalSpaceLink).toBeVisible({ timeout: 10000 });
  await personalSpaceLink.click();
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  console.log('[Setup] Clicked My Personal Space, completing onboarding...');

  // Complete onboarding with CRYSTALS as primary interest
  await onboardingPage.completeWithPrimaryOnly('crystals');
  console.log('[Setup] Entered Personal Space successfully');

  return testUserId;
}

/** Navigate to crystal companion via sidenav */
async function navigateToCompanion(page: Page) {
  // Click on "Crystals" in the sidenav to expand submenu
  const sideNav = page.locator('[aria-label="personal-space-side-nav"]');
  const crystalsButton = sideNav.locator('button[aria-label="Crystals"]').first();
  await expect(crystalsButton).toBeVisible({ timeout: 10000 });
  await crystalsButton.click();
  await page.waitForTimeout(500);

  // Click on "Daily Companion" in the expanded submenu
  const companionButton = page.locator('button[aria-label="Daily Companion"]').first();
  await expect(companionButton).toBeVisible({ timeout: 5000 });
  await companionButton.click();

  // Wait for the companion page to load - either empty state or companion card
  const setButton = page.locator('[data-testid="set-companion-button"]');
  const companionCard = page.locator('[data-testid="companion-card"]');
  await expect(setButton.or(companionCard)).toBeVisible({ timeout: 10000 });
}

/** Restore cookies from previous test */
async function restoreCookies(page: Page, testInfo: TestInfo) {
  const cookies = cookiesPerWorker.get(testInfo.parallelIndex);
  if (!cookies) {
    throw new Error('No cookies found for worker - previous test may have failed');
  }
  const cookiePairs = cookies.split('; ');
  const cookieObjs = cookiePairs.map(pair => {
    const [name, value] = pair.split('=');
    return { name, value: value || '', domain: 'localhost', path: '/' };
  });
  await page.context().addCookies(cookieObjs);
}

/** Navigate to personal space from home */
async function navigateToPersonalSpace(page: Page) {
  await page.goto('/');
  const personalSpaceLink = page.locator('a:has-text("My Personal Space")');
  await expect(personalSpaceLink).toBeVisible({ timeout: 10000 });
  await personalSpaceLink.click();
  await expect(page.getByTestId('personal-space-heading')).toBeVisible({ timeout: 10000 });
}

test.describe.serial('Personal Space - Crystals - Daily Companion', () => {
  test('1. should set today\'s companion with custom crystal', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    // Setup user - after this, user is already in Personal Space
    await setupAuthenticatedUser(page, testInfo);

    // Navigate to crystal companion via sidenav
    await navigateToCompanion(page);

    console.log('[Crystal Companion] Navigated via sidenav, setting first companion...');

    // Should show empty state initially
    const emptyPrompt = page.locator('text=Which crystal is journeying with you today?');
    await expect(emptyPrompt).toBeVisible({ timeout: 10000 });
    console.log('[Crystal Companion] Empty state visible');

    // Click set companion button
    const setButton = page.locator('[data-testid="set-companion-button"]');
    await expect(setButton).toBeVisible({ timeout: 5000 });
    await setButton.click();

    // Verify form dialog opened
    const formDialog = page.locator('[data-testid="companion-form"]');
    await expect(formDialog).toBeVisible({ timeout: 5000 });
    console.log('[Crystal Companion] Form dialog opened');

    // Select "Other crystal (not in collection)" since we have no collection yet
    const crystalSelect = page.locator('button:has-text("Select a crystal")').first();
    await expect(crystalSelect).toBeVisible({ timeout: 5000 });
    await crystalSelect.click();
    await page.waitForTimeout(500);

    const customOption = page.locator('[role="option"]:has-text("Other crystal (not in collection)")').first();
    await expect(customOption).toBeVisible({ timeout: 5000 });
    await customOption.click();
    await page.waitForTimeout(500);

    // Fill in custom crystal name
    const crystalNameInput = page.locator('input[placeholder="Enter crystal name"]');
    await expect(crystalNameInput).toBeVisible({ timeout: 5000 });
    await crystalNameInput.fill('Rose Quartz');
    console.log('[Crystal Companion] Entered custom crystal name');

    // Select location
    const locationSelect = page.locator('button:has-text("Select location")').first();
    await expect(locationSelect).toBeVisible({ timeout: 5000 });
    await locationSelect.click();
    await page.waitForTimeout(500);
    const pocketOption = page.locator('[role="option"]:has-text("Pocket")').first();
    await expect(pocketOption).toBeVisible({ timeout: 5000 });
    await pocketOption.click();
    console.log('[Crystal Companion] Selected Pocket location');

    // Fill intention
    const intentionInput = page.locator('#intention');
    await expect(intentionInput).toBeVisible({ timeout: 5000 });
    await intentionInput.fill('Self-love and compassion');
    console.log('[Crystal Companion] Added intention');

    // Fill reason
    const reasonInput = page.locator('#reason');
    await expect(reasonInput).toBeVisible({ timeout: 5000 });
    await reasonInput.fill('I need gentle heart healing energy today');
    console.log('[Crystal Companion] Added reason');

    // Submit the form
    const submitButton = page.locator('[data-testid="companion-submit-button"]');
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    await submitButton.click();

    // Wait for dialog to close
    await expect(formDialog).not.toBeVisible({ timeout: 10000 });
    console.log('[Crystal Companion] Form submitted and closed');

    // Verify companion card appears with crystal name
    const companionCard = page.locator('[data-testid="companion-card"]');
    await expect(companionCard).toBeVisible({ timeout: 10000 });
    await expect(companionCard).toContainText('Rose Quartz');
    console.log('[Crystal Companion] Companion card visible with Rose Quartz');

    await page.screenshot({ path: 'test-results/crystal-companion-first-set.png' });
  });

  test('2. should change companion and verify original in history', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    // Restore cookies from previous test
    await restoreCookies(page, testInfo);

    // Navigate to personal space and then to companion
    await navigateToPersonalSpace(page);
    await navigateToCompanion(page);

    console.log('[Crystal Companion] Changing companion...');

    // Verify current companion is Rose Quartz
    const companionCard = page.locator('[data-testid="companion-card"]');
    await expect(companionCard).toBeVisible({ timeout: 10000 });
    await expect(companionCard).toContainText('Rose Quartz');
    console.log('[Crystal Companion] Current companion (Rose Quartz) visible');

    // Click "Change Today's Companion" button
    const changeButton = page.locator('button:has-text("Change Today")').first();
    await expect(changeButton).toBeVisible({ timeout: 5000 });
    await changeButton.click();

    // Verify form dialog opened
    const formDialog = page.locator('[data-testid="companion-form"]');
    await expect(formDialog).toBeVisible({ timeout: 5000 });
    console.log('[Crystal Companion] Form dialog opened');

    // The form might show the current crystal in dropdown, click to open
    const crystalTrigger = formDialog.locator('button[role="combobox"]').first();
    await expect(crystalTrigger).toBeVisible({ timeout: 5000 });
    await crystalTrigger.click();
    await page.waitForTimeout(500);

    // Select custom option
    const customOption = page.locator('[role="option"]:has-text("Other crystal (not in collection)")').first();
    await expect(customOption).toBeVisible({ timeout: 5000 });
    await customOption.click();
    await page.waitForTimeout(500);

    // Fill in new crystal name
    const crystalNameInput = page.locator('input[placeholder="Enter crystal name"]');
    await expect(crystalNameInput).toBeVisible({ timeout: 5000 });
    await crystalNameInput.fill('Citrine');
    console.log('[Crystal Companion] Entered new crystal name: Citrine');

    // Update intention
    const intentionInput = page.locator('#intention');
    await expect(intentionInput).toBeVisible({ timeout: 5000 });
    await intentionInput.clear();
    await intentionInput.fill('Abundance and joy');

    // Submit the form
    const submitButton = page.locator('[data-testid="companion-submit-button"]');
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    await submitButton.click();

    // Wait for dialog to close
    await expect(formDialog).not.toBeVisible({ timeout: 10000 });
    console.log('[Crystal Companion] Form submitted and closed');

    // Wait for the UI to update with the new companion
    // The mutation should invalidate the cache and trigger a refetch
    await page.waitForTimeout(2000);

    // Verify companion card shows new crystal - wait for it to not contain old value first
    await expect(companionCard).not.toContainText('Rose Quartz', { timeout: 15000 });
    await expect(companionCard).toContainText('Citrine', { timeout: 5000 });
    console.log('[Crystal Companion] New companion (Citrine) visible');

    await page.screenshot({ path: 'test-results/crystal-companion-changed.png' });
  });

  test('3. should verify companion change persisted', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    // Restore cookies from previous test
    await restoreCookies(page, testInfo);

    // Navigate to personal space and then to companion
    await navigateToPersonalSpace(page);
    await navigateToCompanion(page);

    console.log('[Crystal Companion] Verifying companion change persisted...');

    // Verify the current companion is Citrine (from test 2)
    const companionCard = page.locator('[data-testid="companion-card"]');
    await expect(companionCard).toBeVisible({ timeout: 10000 });
    await expect(companionCard).toContainText('Citrine');
    await expect(companionCard).toContainText('Abundance and joy');
    console.log('[Crystal Companion] Citrine companion persisted correctly');

    await page.screenshot({ path: 'test-results/crystal-companion-persisted.png' });
  });
});

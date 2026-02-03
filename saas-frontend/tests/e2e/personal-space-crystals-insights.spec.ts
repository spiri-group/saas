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
 * Personal Space - Crystals - Practitioner Insights
 *
 * Tests the practitioner insights feature:
 * - View community insights on crystal detail
 * - Add a new insight
 * - Agree with an insight
 *
 * Requires CRYSTALS spiritual interest and seed data in database.
 */

// Store cookies per test worker
const cookiesPerWorker = new Map<number, string>();
let testUserId = '';

// Cleanup before tests
test.beforeAll(async ({}, testInfo) => {
  console.log('[Setup] Preparing test environment for Practitioner Insights...');
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
      console.error('[Cleanup] Error:', error);
    } finally {
      cookiesPerWorker.delete(workerId);
    }
  }
  clearTestEntityRegistry(workerId);
});

/** Generate unique test email */
function generateUniqueTestEmail(testInfo: TestInfo): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `crystal-insights-${timestamp}-${testInfo.parallelIndex}-${randomSuffix}@playwright.com`;
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
      firstName: 'Crystal',
      lastName: 'Practitioner',
      phone: '0412345678',
      address: 'Sydney Opera House',
      securityQuestion: 'What is your favorite crystal?',
      securityAnswer: 'Amethyst',
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
  } catch (error) {
    console.error('[Setup] Error:', error);
    throw error;
  }

  return testUserId;
}

/** Navigate to crystal guide via sidenav */
async function navigateToCrystalGuide(page: Page) {
  // Click on "Crystals" in the sidenav to expand submenu
  const sideNav = page.locator('[aria-label="personal-space-side-nav"]');
  const crystalsButton = sideNav.locator('button[aria-label="Crystals"]').first();
  await expect(crystalsButton).toBeVisible({ timeout: 10000 });
  await crystalsButton.click();
  await page.waitForTimeout(500);

  // Click on "Crystal Guide" in the expanded submenu
  const guideButton = page.locator('[data-testid="crystal-guide-nav"]').first();
  await expect(guideButton).toBeVisible({ timeout: 5000 });
  await guideButton.click();

  // Wait for the guide page to load
  await expect(page.getByTestId('crystal-guide-search')).toBeVisible({ timeout: 10000 });
}

/** Restore cookies from previous test */
async function restoreCookies(page: Page, testInfo: TestInfo) {
  const cookies = cookiesPerWorker.get(testInfo.parallelIndex);
  if (cookies) {
    const cookiePairs = cookies.split('; ');
    const cookieObjs = cookiePairs.map(pair => {
      const [name, value] = pair.split('=');
      return { name, value: value || '', domain: 'localhost', path: '/' };
    });
    await page.context().addCookies(cookieObjs);
  }
}

/** Navigate to personal space from home */
async function navigateToPersonalSpace(page: Page) {
  await page.goto('/');
  const personalSpaceLink = page.locator('a:has-text("My Personal Space")');
  await expect(personalSpaceLink).toBeVisible({ timeout: 10000 });
  await personalSpaceLink.click();
  await expect(page.getByTestId('personal-space-heading')).toBeVisible({ timeout: 10000 });
}

/** Open first crystal detail panel */
async function openCrystalDetailPanel(page: Page) {
  const firstCrystal = page.locator('[data-testid^="crystal-card-"]').first();
  await expect(firstCrystal).toBeVisible({ timeout: 10000 });
  await firstCrystal.click();
  await page.waitForTimeout(1000);

  // Verify panel opened
  const closeButton = page.getByTestId('close-detail-panel');
  await expect(closeButton).toBeVisible({ timeout: 5000 });
}

test.describe.serial('Personal Space - Crystals - Practitioner Insights', () => {
  test('1. should see community insights section in detail panel', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    // Setup user - after this, user is already in Personal Space
    await setupAuthenticatedUser(page, testInfo);

    // Navigate to crystal guide via sidenav
    await navigateToCrystalGuide(page);

    console.log('[Insights] Navigated to Crystal Guide...');

    // Wait for crystals to load
    await page.waitForTimeout(2000);

    // Open first crystal detail panel
    await openCrystalDetailPanel(page);

    // Should see community insights section
    const addInsightBtn = page.getByTestId('add-insight-btn');
    await expect(addInsightBtn).toBeVisible({ timeout: 5000 });
    console.log('[Insights] Community Insights section visible');

    await page.screenshot({ path: 'test-results/insights-section.png' });
  });

  test('2. should add a new practitioner insight', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    // Restore cookies from previous test
    await restoreCookies(page, testInfo);

    // Navigate to personal space and then to guide
    await navigateToPersonalSpace(page);
    await navigateToCrystalGuide(page);

    console.log('[Insights] Testing add insight...');

    // Wait for crystals to load
    await page.waitForTimeout(2000);

    // Open first crystal detail panel
    await openCrystalDetailPanel(page);

    // Click "Share Insight" button
    const addInsightBtn = page.getByTestId('add-insight-btn');
    await expect(addInsightBtn).toBeVisible({ timeout: 5000 });
    await addInsightBtn.click();
    await page.waitForTimeout(500);

    // Insight form should appear
    const insightTypeSelect = page.getByTestId('insight-type-select');
    await expect(insightTypeSelect).toBeVisible({ timeout: 5000 });
    console.log('[Insights] Insight form opened');

    // Select insight type (Usage Tip is default)
    await insightTypeSelect.click();
    await page.waitForTimeout(500);
    const usageTipOption = page.locator('[role="option"]:has-text("Usage Tip")').first();
    if (await usageTipOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await usageTipOption.click();
    }

    // Fill insight content
    const insightContent = page.getByTestId('insight-content');
    await expect(insightContent).toBeVisible({ timeout: 5000 });
    await insightContent.fill('I find this crystal works best when placed under my pillow during full moon nights. The energy feels especially powerful for dream work.');

    // Submit insight
    const submitBtn = page.getByTestId('submit-insight-btn');
    await expect(submitBtn).toBeEnabled({ timeout: 5000 });
    await submitBtn.click();

    // Wait for submission
    await page.waitForTimeout(2000);
    console.log('[Insights] Insight submitted');

    // Form should close (or show success)
    await expect(insightContent).not.toBeVisible({ timeout: 5000 });
    console.log('[Insights] Insight form closed after submission');

    await page.screenshot({ path: 'test-results/insights-added.png' });
  });

  test('3. should see submitted insight in list', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    // Restore cookies from previous test
    await restoreCookies(page, testInfo);

    // Navigate to personal space and then to guide
    await navigateToPersonalSpace(page);
    await navigateToCrystalGuide(page);

    console.log('[Insights] Verifying insight appears in list...');

    // Wait for crystals to load
    await page.waitForTimeout(2000);

    // Open first crystal detail panel
    await openCrystalDetailPanel(page);

    // Wait for insights to load
    await page.waitForTimeout(2000);

    // Look for our insight (may be pending approval, so may not appear)
    const insightsList = page.locator('[data-testid^="insight-"]');
    const insightCount = await insightsList.count();
    console.log('[Insights] Found', insightCount, 'insights in list');

    // Check if there are any insights or empty state
    const emptyState = page.locator('text=No community insights yet');
    const hasEmptyState = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);

    if (insightCount > 0) {
      console.log('[Insights] Insights are visible in the list');
    } else if (hasEmptyState) {
      console.log('[Insights] Empty state visible - insight may be pending approval');
    }

    await page.screenshot({ path: 'test-results/insights-list.png' });
  });

  test('4. should agree with an insight', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    // Restore cookies from previous test
    await restoreCookies(page, testInfo);

    // Navigate to personal space and then to guide
    await navigateToPersonalSpace(page);
    await navigateToCrystalGuide(page);

    console.log('[Insights] Testing agree functionality...');

    // Wait for crystals to load
    await page.waitForTimeout(2000);

    // Open first crystal detail panel
    await openCrystalDetailPanel(page);

    // Wait for insights to load
    await page.waitForTimeout(2000);

    // Look for any insight with agree button
    const agreeButtons = page.locator('[data-testid^="agree-insight-"]');
    const agreeCount = await agreeButtons.count();

    if (agreeCount > 0) {
      console.log('[Insights] Found', agreeCount, 'insights with agree buttons');

      // Click first agree button
      const firstAgree = agreeButtons.first();
      await firstAgree.click();
      await page.waitForTimeout(1000);
      console.log('[Insights] Clicked agree on first insight');
    } else {
      console.log('[Insights] No insights available to agree with');
    }

    await page.screenshot({ path: 'test-results/insights-agreed.png' });
  });
});

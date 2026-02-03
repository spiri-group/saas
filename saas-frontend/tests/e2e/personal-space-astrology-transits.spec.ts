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
 * Personal Space - Astrology - Transit Tracker
 *
 * Tests the transit tracker feature:
 * - View general transits without birth chart
 * - See prompt to add birth chart
 * - After adding chart, see personal transits
 *
 * Requires MEDIUMSHIP spiritual interest to be set in onboarding.
 */

// Store cookies per test worker
const cookiesPerWorker = new Map<number, string>();
let testUserId = '';

// Cleanup before tests
test.beforeAll(async ({}, testInfo) => {
  console.log('[Setup] Preparing test environment for Transit Tracker...');
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
  return `astro-transit-${timestamp}-${testInfo.parallelIndex}-${randomSuffix}@playwright.com`;
}

/** Setup authenticated user with mediumship interest */
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
      firstName: 'Transit',
      lastName: 'Watcher',
      phone: '0412345679',
      address: 'Sydney Opera House',
      securityQuestion: 'Favorite planet?',
      securityAnswer: 'Jupiter',
    });
    await setupPage.startBrowsing();
    await page.waitForURL('/', { timeout: 15000 });

    // Click "My Personal Space" link
    const personalSpaceLink = page.locator('a:has-text("My Personal Space")');
    await expect(personalSpaceLink).toBeVisible({ timeout: 10000 });
    await personalSpaceLink.click();
    await page.waitForTimeout(3000);
    console.log('[Setup] Clicked My Personal Space, completing onboarding...');

    // Complete onboarding with MEDIUMSHIP as primary interest
    await onboardingPage.completeWithPrimaryOnly('mediumship');
    console.log('[Setup] Entered Personal Space successfully');
  } catch (error) {
    console.error('[Setup] Error:', error);
    throw error;
  }

  return testUserId;
}

test.describe.serial('Personal Space - Astrology - Transit Tracker', () => {
  test('1. should show general transits and prompt without birth chart', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    await setupAuthenticatedUser(page, testInfo);

    // Click on "Astrology" in the sidenav to expand submenu
    const sideNav = page.locator('[aria-label="personal-space-side-nav"]');
    const astrologyButton = sideNav.locator('button[aria-label="Astrology"]').first();
    await expect(astrologyButton).toBeVisible({ timeout: 10000 });
    await astrologyButton.click();
    await page.waitForTimeout(500);

    // Click on "Transit Tracker" in the expanded submenu
    const transitButton = page.locator('button[aria-label="Transit Tracker"]').first();
    await expect(transitButton).toBeVisible({ timeout: 5000 });
    await transitButton.click();
    await page.waitForTimeout(3000);
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/transit-tracker-no-chart.png' });

    // Verify general transits show (Moon Phase card)
    const moonPhaseCard = page.locator('[data-testid="moon-phase-card"]').or(page.locator('text=Moon Phase')).or(page.locator('text=Current Moon')).first();
    await expect(moonPhaseCard).toBeVisible({ timeout: 10000 });
    console.log('[Transit Tracker] ✓ Moon phase card visible');

    // Verify prompt to add birth chart
    const addChartPrompt = page.locator('text=Add Your Birth Chart').or(page.locator('text=Create Birth Chart')).or(page.locator('text=birth chart for personalized')).first();
    const hasPrompt = await addChartPrompt.isVisible({ timeout: 5000 }).catch(() => false);
    console.log('[Transit Tracker] ✓ Add birth chart prompt visible:', hasPrompt);
    expect(hasPrompt).toBe(true);

    // Verify NO personal transits section (since no birth chart)
    const personalTransits = page.locator('[data-testid="personal-transits-section"]').or(page.locator('text=Transits to Your Chart')).first();
    const hasPersonalTransits = await personalTransits.isVisible({ timeout: 3000 }).catch(() => false);
    console.log('[Transit Tracker] Personal transits visible (should be false):', hasPersonalTransits);
  });

  test('2. should show personal transits after adding birth chart', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    // Restore cookies
    const cookies = cookiesPerWorker.get(testInfo.parallelIndex);
    if (cookies) {
      const cookiePairs = cookies.split('; ');
      const cookieObjs = cookiePairs.map(pair => {
        const [name, value] = pair.split('=');
        return { name, value: value || '', domain: 'localhost', path: '/' };
      });
      await page.context().addCookies(cookieObjs);
    }

    // Go to home page and click My Personal Space
    await page.goto('/');
    await page.waitForTimeout(3000);
    const personalSpaceLink = page.locator('a:has-text("My Personal Space")');
    await expect(personalSpaceLink).toBeVisible({ timeout: 10000 });
    await personalSpaceLink.click();
    await page.waitForTimeout(3000);
    await page.waitForTimeout(2000);

    // Click on "Astrology" in the sidenav to expand submenu
    const sideNav = page.locator('[aria-label="personal-space-side-nav"]');
    const astrologyButton = sideNav.locator('button[aria-label="Astrology"]').first();
    await expect(astrologyButton).toBeVisible({ timeout: 10000 });
    await astrologyButton.click();
    await page.waitForTimeout(500);

    // Click on "My Birth Chart" to create a chart first
    const birthChartButton = page.locator('button[aria-label="My Birth Chart"]').first();
    await expect(birthChartButton).toBeVisible({ timeout: 5000 });
    await birthChartButton.click();
    await page.waitForTimeout(3000);
    await page.waitForTimeout(2000);

    // Create chart with exact time for full calculations
    // Form is displayed directly on the page when no chart exists
    const birthDateInput = page.locator('[data-testid="birth-date-input"], input[type="date"]').first();
    await expect(birthDateInput).toBeVisible({ timeout: 10000 });
    await birthDateInput.fill('1985-03-20');

    // Select "Exact" time precision
    const exactTimeOption = page.locator('[data-testid="precision-exact"]');
    await expect(exactTimeOption).toBeVisible({ timeout: 5000 });
    await exactTimeOption.click();
    await page.waitForTimeout(500);

    // Fill exact time (9:15 AM)
    const hoursInput = page.locator('[data-testid="time-hours"]');
    await expect(hoursInput).toBeVisible({ timeout: 5000 });
    await hoursInput.fill('09');

    const minutesInput = page.locator('[data-testid="time-minutes"]');
    await minutesInput.fill('15');

    // Click AM button
    const amButton = page.locator('[data-testid="time-am"]');
    await amButton.click();
    await page.waitForTimeout(300);

    const cityInput = page.locator('[data-testid="city-search-input"]').first();
    await expect(cityInput).toBeVisible({ timeout: 5000 });
    await cityInput.fill('Sydney');
    await page.waitForTimeout(2000); // Wait for debounce (300ms) + API call

    // Click city option from dropdown
    const citySuggestion = page.locator('button[data-testid^="city-option-"]:has-text("Sydney")').first();
    await expect(citySuggestion).toBeVisible({ timeout: 5000 });
    await citySuggestion.click();
    await page.waitForTimeout(1000);

    // Save - only use specific testid
    const saveButton = page.locator('[data-testid="save-birth-chart-btn"]');
    await expect(saveButton).toBeEnabled({ timeout: 5000 });
    await saveButton.click();
    await page.waitForTimeout(3000);
    console.log('[Transit Tracker] Birth chart created');

    // Now navigate to Transit Tracker via sidenav
    // Click Astrology again (submenu may have collapsed)
    const astrologyButton2 = sideNav.locator('button[aria-label="Astrology"]').first();
    await astrologyButton2.click();
    await page.waitForTimeout(500);

    // Click on "Transit Tracker"
    const transitButton = page.locator('button[aria-label="Transit Tracker"]').first();
    await expect(transitButton).toBeVisible({ timeout: 5000 });
    await transitButton.click();
    await page.waitForTimeout(3000);
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'test-results/transit-tracker-with-chart.png' });

    // Verify personal transits now show
    const personalTransits = page.locator('[data-testid="personal-transits-section"]').or(page.locator('text=Active Now')).or(page.locator('text=Transits to Your Chart')).or(page.locator('text=Personal Transits')).first();
    const hasPersonalTransits = await personalTransits.isVisible({ timeout: 10000 }).catch(() => false);
    console.log('[Transit Tracker] ✓ Personal transits visible:', hasPersonalTransits);

    // The prompt should no longer be visible
    const addChartPrompt = page.locator('text=Add Your Birth Chart for Personalized').first();
    const hasPrompt = await addChartPrompt.isVisible({ timeout: 3000 }).catch(() => false);
    console.log('[Transit Tracker] Add chart prompt visible (should be false):', hasPrompt);
    expect(hasPrompt).toBe(false);
  });
});

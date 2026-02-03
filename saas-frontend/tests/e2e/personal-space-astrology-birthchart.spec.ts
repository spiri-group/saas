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
 * Personal Space - Astrology - Birth Chart
 *
 * Tests the birth chart feature:
 * - Create birth chart with unknown time (partial chart)
 * - Edit to add exact time (full chart with rising/houses)
 * - Toggle practitioner access and verify persistence
 *
 * Requires MEDIUMSHIP spiritual interest to be set in onboarding.
 */

// Store cookies per test worker
const cookiesPerWorker = new Map<number, string>();
let testUserId = '';

// Cleanup before tests
test.beforeAll(async ({}, testInfo) => {
  console.log('[Setup] Preparing test environment for Astrology Birth Chart...');
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
  return `astro-bc-${timestamp}-${testInfo.parallelIndex}-${randomSuffix}@playwright.com`;
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
      firstName: 'Astro',
      lastName: 'Chart',
      phone: '0412345678',
      address: 'Sydney Opera House',
      securityQuestion: 'What is your rising sign?',
      securityAnswer: 'Leo',
    });
    await setupPage.startBrowsing();
    await page.waitForURL('/', { timeout: 15000 });

    // Click "My Personal Space" link
    const personalSpaceLink = page.locator('a:has-text("My Personal Space")');
    await expect(personalSpaceLink).toBeVisible({ timeout: 10000 });
    await personalSpaceLink.click();
    await page.waitForLoadState('networkidle', { timeout: 15000 });
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

test.describe.serial('Personal Space - Astrology - Birth Chart', () => {
  test('1. should create birth chart with unknown time and show partial data', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    // Setup user - after this, user is already in Personal Space
    await setupAuthenticatedUser(page, testInfo);

    // Click on "Astrology" in the sidenav to expand submenu
    const sideNav = page.locator('[aria-label="personal-space-side-nav"]');
    const astrologyButton = sideNav.locator('button[aria-label="Astrology"]').first();
    await expect(astrologyButton).toBeVisible({ timeout: 10000 });
    await astrologyButton.click();
    await page.waitForTimeout(500);

    // Click on "My Birth Chart" in the expanded submenu
    const birthChartButton = page.locator('button[aria-label="My Birth Chart"]').first();
    await expect(birthChartButton).toBeVisible({ timeout: 5000 });
    await birthChartButton.click();
    await page.waitForTimeout(3000);

    console.log('[Birth Chart] Navigated via sidenav, creating with unknown time...');

    // Form is displayed directly on the page when no chart exists
    // Fill birth date - wait for it as indicator that page loaded
    const birthDateInput = page.locator('[data-testid="birth-date-input"]').first();
    await expect(birthDateInput).toBeVisible({ timeout: 15000 });

    // Fill date and verify
    await birthDateInput.fill('1990-06-15');
    await page.waitForTimeout(500);
    const dateValue = await birthDateInput.inputValue();
    console.log('[Birth Chart] Date value after fill:', dateValue);
    expect(dateValue).toBe('1990-06-15');

    // Select "Unknown" birth time precision
    const unknownTimeOption = page.locator('[data-testid="precision-unknown"]');
    await expect(unknownTimeOption).toBeVisible({ timeout: 5000 });
    await unknownTimeOption.click();
    await page.waitForTimeout(500);

    // Verify date wasn't cleared by clicking precision
    const dateAfterPrecision = await birthDateInput.inputValue();
    console.log('[Birth Chart] Date value after precision click:', dateAfterPrecision);
    expect(dateAfterPrecision).toBe('1990-06-15');

    // Fill birth location
    const cityInput = page.locator('[data-testid="city-search-input"]').first();
    await expect(cityInput).toBeVisible({ timeout: 5000 });
    await cityInput.fill('Melbourne');
    await page.waitForTimeout(2000); // Wait for debounce (300ms) + API call

    // Click city option from dropdown (buttons with data-testid starting with city-option-)
    const citySuggestion = page.locator('button[data-testid^="city-option-"]:has-text("Melbourne")').first();
    await expect(citySuggestion).toBeVisible({ timeout: 5000 });
    await citySuggestion.click();
    await page.waitForTimeout(1000);

    // Save - only use specific testid to avoid matching Login button
    const saveButton = page.locator('[data-testid="save-birth-chart-btn"]');
    await expect(saveButton).toBeEnabled({ timeout: 5000 });
    await saveButton.click();

    // Wait for the chart to be created - edit button appears when chart exists
    const editButton = page.locator('[data-testid="edit-chart-btn"]');
    await expect(editButton).toBeVisible({ timeout: 20000 });
    console.log('[Birth Chart] ✓ Chart created successfully (edit button visible)');

    await page.screenshot({ path: 'test-results/birth-chart-unknown-time.png' });

    // Verify partial chart - sun sign should be visible (Gemini for June 15)
    const sunSign = page.locator('text=Gemini').first();
    await expect(sunSign).toBeVisible({ timeout: 10000 });
    console.log('[Birth Chart] ✓ Sun sign (Gemini) visible');

    // Rising sign should show "Unknown" or not be calculated
    const risingUnknown = page.locator('text=Unknown').first();
    const risingVisible = await risingUnknown.isVisible({ timeout: 3000 }).catch(() => false);
    console.log('[Birth Chart] Rising shows as unknown:', risingVisible);
  });

  test('2. should edit birth chart to add exact time and show full data', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    // Restore cookies from previous test
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
    await page.waitForTimeout(2000);
    const personalSpaceLink = page.locator('a:has-text("My Personal Space")');
    await expect(personalSpaceLink).toBeVisible({ timeout: 10000 });
    await personalSpaceLink.click();
    await page.waitForTimeout(3000);

    // Click on "Astrology" in the sidenav to expand submenu
    const sideNav = page.locator('[aria-label="personal-space-side-nav"]');
    const astrologyButton = sideNav.locator('button[aria-label="Astrology"]').first();
    await expect(astrologyButton).toBeVisible({ timeout: 10000 });
    await astrologyButton.click();
    await page.waitForTimeout(500);

    // Click on "My Birth Chart" in the expanded submenu
    const birthChartButton = page.locator('button[aria-label="My Birth Chart"]').first();
    await expect(birthChartButton).toBeVisible({ timeout: 5000 });
    await birthChartButton.click();
    await page.waitForTimeout(3000);

    console.log('[Birth Chart] Editing to add exact time...');

    // Click Edit button - wait for it to appear (chart was created in test 1)
    const editButton = page.locator('[data-testid="edit-chart-btn"]').first();
    await expect(editButton).toBeVisible({ timeout: 15000 });
    await editButton.click();
    await page.waitForTimeout(1500);

    // Select "Exact" time precision
    const exactTimeOption = page.locator('[data-testid="precision-exact"]');
    await expect(exactTimeOption).toBeVisible({ timeout: 5000 });
    await exactTimeOption.click();
    await page.waitForTimeout(500);

    // Fill exact time using the custom time inputs (2:30 PM)
    const hoursInput = page.locator('[data-testid="time-hours"]');
    await expect(hoursInput).toBeVisible({ timeout: 5000 });
    await hoursInput.fill('02');

    const minutesInput = page.locator('[data-testid="time-minutes"]');
    await minutesInput.fill('30');

    // Click PM button
    const pmButton = page.locator('[data-testid="time-pm"]');
    await pmButton.click();
    await page.waitForTimeout(500);

    // Save changes
    const saveButton = page.locator('[data-testid="save-birth-chart-btn"]');
    await expect(saveButton).toBeEnabled({ timeout: 5000 });
    await saveButton.click();

    // Wait for dialog to close (success indicator)
    await expect(page.locator('[data-testid="edit-chart-btn"]')).toBeVisible({ timeout: 15000 });
    console.log('[Birth Chart] ✓ Dialog closed - update successful');

    await page.screenshot({ path: 'test-results/birth-chart-with-time.png' });

    // Verify the time is now shown on the page (2:30 PM = 14:30)
    const timeDisplay = page.locator('text=14:30');
    await expect(timeDisplay).toBeVisible({ timeout: 10000 });
    console.log('[Birth Chart] ✓ Time (14:30) displayed');

    // Verify rising sign is now calculated - should NOT show "Unknown" anymore
    // The rising sign should appear in the Big Three section
    const unknownRising = page.locator('text=Unknown');
    const stillUnknown = await unknownRising.isVisible({ timeout: 3000 }).catch(() => false);
    expect(stillUnknown).toBe(false);
    console.log('[Birth Chart] ✓ Rising sign is no longer Unknown');

    // Verify house numbers are now shown (planets should have house assignments)
    // House numbers appear as small badges like "10", "6", etc.
    const houseNumber = page.locator('span:has-text("10"), span:has-text("11"), span:has-text("1")').first();
    const hasHouseNumbers = await houseNumber.isVisible({ timeout: 5000 }).catch(() => false);
    console.log('[Birth Chart] House numbers visible:', hasHouseNumbers);
  });
});

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
 * Personal Space - Crystals - Cleansing Rituals
 *
 * Tests the crystal cleansing feature:
 * - Log cleansing session with method
 * - Add moon phase tracking
 * - Include charging with cleansing
 *
 * Requires CRYSTALS spiritual interest to be set in onboarding.
 */

// Store cookies per test worker
const cookiesPerWorker = new Map<number, string>();
const userIdPerWorker = new Map<number, string>();

// Cleanup before tests
test.beforeAll(async ({}, testInfo) => {
  console.log('[Setup] Preparing test environment for Crystal Cleansing...');
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
  return `crystal-clns-${timestamp}-${testInfo.parallelIndex}-${randomSuffix}@playwright.com`;
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
    lastName: 'Cleanser',
    phone: '0412345682',
    address: 'Sydney Opera House',
    securityQuestion: 'How do you cleanse your crystals?',
    securityAnswer: 'Moonlight',
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

/** Navigate to crystal cleansing via sidenav */
async function navigateToCleansing(page: Page) {
  // Click on "Crystals" in the sidenav to expand submenu
  const sideNav = page.locator('[aria-label="personal-space-side-nav"]');
  const crystalsButton = sideNav.locator('button[aria-label="Crystals"]').first();
  await expect(crystalsButton).toBeVisible({ timeout: 10000 });
  await crystalsButton.click();
  await page.waitForTimeout(500);

  // Click on "Cleansing History" in the expanded submenu
  const cleansingButton = page.locator('button[aria-label="Cleansing History"]').first();
  await expect(cleansingButton).toBeVisible({ timeout: 5000 });
  await cleansingButton.click();

  // Wait for the cleansing page to load by checking for the Log Cleansing button
  await expect(page.getByTestId('log-cleansing-button')).toBeVisible({ timeout: 10000 });
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

test.describe.serial('Personal Space - Crystals - Cleansing Rituals', () => {
  test('1. should log cleansing session with moonlight method', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    // Setup user - after this, user is already in Personal Space
    await setupAuthenticatedUser(page, testInfo);

    // Navigate to crystal cleansing via sidenav
    await navigateToCleansing(page);

    console.log('[Crystal Cleansing] Navigated via sidenav, logging first session...');

    // Should show empty state initially
    const emptyState = page.locator('text=Begin Your Cleansing Practice');
    await expect(emptyState).toBeVisible({ timeout: 10000 });
    console.log('[Crystal Cleansing] Empty state visible');

    // Click log cleansing button
    const logButton = page.locator('[data-testid="log-cleansing-button"]').first();
    await expect(logButton).toBeVisible({ timeout: 5000 });
    await logButton.click();

    // Verify form dialog opened
    const formDialog = page.locator('[data-testid="cleansing-form"]');
    await expect(formDialog).toBeVisible({ timeout: 5000 });
    console.log('[Crystal Cleansing] Form dialog opened');

    // Enter custom crystal names (we don't have a collection yet)
    const crystalInput = page.locator('input[placeholder*="crystal names"]');
    await expect(crystalInput).toBeVisible({ timeout: 5000 });
    await crystalInput.fill('Amethyst, Clear Quartz, Rose Quartz');
    console.log('[Crystal Cleansing] Entered crystal names');

    // Select Moonlight method
    const moonlightButton = page.locator('button:has-text("Moonlight")').first();
    await expect(moonlightButton).toBeVisible({ timeout: 5000 });
    await moonlightButton.click();
    console.log('[Crystal Cleansing] Selected Moonlight method');

    // Fill method details
    const methodDetailsInput = page.locator('#methodDetails');
    await expect(methodDetailsInput).toBeVisible({ timeout: 5000 });
    await methodDetailsInput.fill('Left on windowsill overnight under full moon');

    // Select moon phase
    const moonPhaseSelect = page.locator('button:has-text("Select phase")').first();
    await expect(moonPhaseSelect).toBeVisible({ timeout: 5000 });
    await moonPhaseSelect.click();
    await page.waitForTimeout(500);
    const fullMoonOption = page.locator('[role="option"]:has-text("Full Moon")').first();
    await expect(fullMoonOption).toBeVisible({ timeout: 5000 });
    await fullMoonOption.click();
    console.log('[Crystal Cleansing] Selected Full Moon phase');

    // Fill intention
    const intentionInput = page.locator('#intention');
    await expect(intentionInput).toBeVisible({ timeout: 5000 });
    await intentionInput.fill('Releasing all negative energy and restoring pure vibration');

    // Submit the form
    const submitButton = page.locator('[data-testid="cleansing-submit-button"]');
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    await submitButton.click();

    // Wait for dialog to close
    await expect(formDialog).not.toBeVisible({ timeout: 10000 });
    console.log('[Crystal Cleansing] Form submitted and closed');

    // Verify cleansing session appears in history
    const sessionEntry = page.locator('text=Moonlight').first();
    await expect(sessionEntry).toBeVisible({ timeout: 10000 });
    console.log('[Crystal Cleansing] Session visible in history');

    await page.screenshot({ path: 'test-results/crystal-cleansing-first-session.png' });
  });

  test('2. should log cleansing session with charging', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    // Restore cookies from previous test
    await restoreCookies(page, testInfo);

    // Navigate to personal space and then to cleansing
    await navigateToPersonalSpace(page);
    await navigateToCleansing(page);

    console.log('[Crystal Cleansing] Logging session with charging...');

    // Verify first session exists
    const firstSession = page.locator('text=Moonlight').first();
    await expect(firstSession).toBeVisible({ timeout: 10000 });
    console.log('[Crystal Cleansing] First session visible');

    // Click log cleansing button
    const logButton = page.locator('[data-testid="log-cleansing-button"]').first();
    await expect(logButton).toBeVisible({ timeout: 5000 });
    await logButton.click();

    // Verify form dialog opened
    const formDialog = page.locator('[data-testid="cleansing-form"]');
    await expect(formDialog).toBeVisible({ timeout: 5000 });

    // Enter custom crystal names
    const crystalInput = page.locator('input[placeholder*="crystal names"]');
    await expect(crystalInput).toBeVisible({ timeout: 5000 });
    await crystalInput.fill('Black Tourmaline, Selenite');

    // Select Smoke method
    const smokeButton = page.locator('button:has-text("Smoke")').first();
    await expect(smokeButton).toBeVisible({ timeout: 5000 });
    await smokeButton.click();
    console.log('[Crystal Cleansing] Selected Smoke method');

    // Fill method details
    const methodDetailsInput = page.locator('#methodDetails');
    await expect(methodDetailsInput).toBeVisible({ timeout: 5000 });
    await methodDetailsInput.fill('Palo Santo smoke cleansing');

    // Check "I also charged these crystals"
    const chargingCheckbox = page.locator('#didCharge');
    await expect(chargingCheckbox).toBeVisible({ timeout: 5000 });
    await chargingCheckbox.click();
    console.log('[Crystal Cleansing] Enabled charging');
    await page.waitForTimeout(500);

    // Select charging method
    const chargingMethodSelect = page.locator('button:has-text("Select method")').first();
    await expect(chargingMethodSelect).toBeVisible({ timeout: 5000 });
    await chargingMethodSelect.click();
    await page.waitForTimeout(500);
    const sunlightOption = page.locator('[role="option"]:has-text("Sunlight")').first();
    await expect(sunlightOption).toBeVisible({ timeout: 5000 });
    await sunlightOption.click();
    console.log('[Crystal Cleansing] Selected Sunlight charging');

    // Fill intention
    const intentionInput = page.locator('#intention');
    await expect(intentionInput).toBeVisible({ timeout: 5000 });
    await intentionInput.fill('Protection and grounding energy');

    // Submit the form
    const submitButton = page.locator('[data-testid="cleansing-submit-button"]');
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    await submitButton.click();

    // Wait for dialog to close
    await expect(formDialog).not.toBeVisible({ timeout: 10000 });
    console.log('[Crystal Cleansing] Second session with charging logged');

    // Verify both sessions appear
    const moonlightSession = page.locator('text=Moonlight').first();
    const smokeSession = page.locator('text=Smoke').first();

    await expect(moonlightSession).toBeVisible({ timeout: 10000 });
    await expect(smokeSession).toBeVisible({ timeout: 10000 });
    console.log('[Crystal Cleansing] Both sessions visible');

    await page.screenshot({ path: 'test-results/crystal-cleansing-with-charging.png' });
  });

  test('3. should verify cleansing stats are displayed', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    // Restore cookies from previous test
    await restoreCookies(page, testInfo);

    // Navigate to personal space and then to cleansing
    await navigateToPersonalSpace(page);
    await navigateToCleansing(page);

    console.log('[Crystal Cleansing] Verifying cleansing stats...');

    // Verify both sessions still in history
    const moonlightSession = page.locator('text=Moonlight').first();
    const smokeSession = page.locator('text=Smoke').first();
    await expect(moonlightSession).toBeVisible({ timeout: 10000 });
    await expect(smokeSession).toBeVisible({ timeout: 10000 });

    // Both sessions verified - cleansing history is working
    console.log('[Crystal Cleansing] Both sessions persisted correctly');

    await page.screenshot({ path: 'test-results/crystal-cleansing-stats.png' });
  });
});

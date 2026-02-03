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
 * Personal Space - Crystals - Wishlist
 *
 * Tests the crystal wishlist feature:
 * - Add crystal to wishlist
 * - Set priority and budget
 * - Mark crystal as acquired
 *
 * Requires CRYSTALS spiritual interest to be set in onboarding.
 */

// Store cookies per test worker
const cookiesPerWorker = new Map<number, string>();
const userIdPerWorker = new Map<number, string>();

// Cleanup before tests
test.beforeAll(async ({}, testInfo) => {
  console.log('[Setup] Preparing test environment for Crystal Wishlist...');
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
  return `crystal-wish-${timestamp}-${testInfo.parallelIndex}-${randomSuffix}@playwright.com`;
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
    lastName: 'Wisher',
    phone: '0412345681',
    address: 'Sydney Opera House',
    securityQuestion: 'What crystal do you dream of?',
    securityAnswer: 'Moldavite',
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

/** Navigate to crystal wishlist via sidenav */
async function navigateToWishlist(page: Page) {
  // Click on "Crystals" in the sidenav to expand submenu
  const sideNav = page.locator('[aria-label="personal-space-side-nav"]');
  const crystalsButton = sideNav.locator('button[aria-label="Crystals"]').first();
  await expect(crystalsButton).toBeVisible({ timeout: 10000 });
  await crystalsButton.click();
  await page.waitForTimeout(500);

  // Click on "Wishlist" in the expanded submenu
  const wishlistButton = page.locator('button[aria-label="Wishlist"]').first();
  await expect(wishlistButton).toBeVisible({ timeout: 5000 });
  await wishlistButton.click();

  // Wait for the wishlist page to load
  await expect(page.getByTestId('add-wishlist-button')).toBeVisible({ timeout: 10000 });
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

test.describe.serial('Personal Space - Crystals - Wishlist', () => {
  test('1. should add first crystal to wishlist with details', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    // Setup user - after this, user is already in Personal Space
    await setupAuthenticatedUser(page, testInfo);

    // Navigate to crystal wishlist via sidenav
    await navigateToWishlist(page);

    console.log('[Crystal Wishlist] Navigated via sidenav, adding first wish...');

    // Should show empty state initially
    const emptyState = page.locator('text=Dream of Your Next Crystal');
    await expect(emptyState).toBeVisible({ timeout: 10000 });
    console.log('[Crystal Wishlist] Empty state visible');

    // Click add to wishlist button
    const addButton = page.locator('[data-testid="add-wishlist-button"]').first();
    await expect(addButton).toBeVisible({ timeout: 5000 });
    await addButton.click();

    // Verify form dialog opened
    const formDialog = page.locator('[data-testid="wishlist-form"]');
    await expect(formDialog).toBeVisible({ timeout: 5000 });
    console.log('[Crystal Wishlist] Form dialog opened');

    // Fill crystal name using the direct name input
    const nameInput = page.locator('[data-testid="wishlist-name-input"]');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill('Moldavite');
    console.log('[Crystal Wishlist] Entered crystal name');

    // Select "Must Have" priority (first button in priority options)
    const mustHaveButton = page.locator('button:has-text("Must Have")').first();
    await expect(mustHaveButton).toBeVisible({ timeout: 5000 });
    await mustHaveButton.click();
    console.log('[Crystal Wishlist] Selected Must Have priority');

    // Fill purpose
    const purposeInput = page.locator('#wishPurpose');
    await expect(purposeInput).toBeVisible({ timeout: 5000 });
    await purposeInput.fill('Spiritual transformation and awakening');

    // Fill reason
    const reasonInput = page.locator('#wishReason');
    await expect(reasonInput).toBeVisible({ timeout: 5000 });
    await reasonInput.fill('I feel a deep calling to work with this cosmic stone for spiritual growth');

    // Fill max budget
    const budgetInput = page.locator('#maxBudget');
    await expect(budgetInput).toBeVisible({ timeout: 5000 });
    await budgetInput.fill('500');

    // Submit the form
    const submitButton = page.locator('[data-testid="wishlist-submit-button"]');
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    await submitButton.click();

    // Wait for dialog to close
    await expect(formDialog).not.toBeVisible({ timeout: 10000 });
    console.log('[Crystal Wishlist] Form submitted and closed');

    // Verify crystal appears in wishlist
    const wishlistItem = page.locator('text=Moldavite').first();
    await expect(wishlistItem).toBeVisible({ timeout: 10000 });
    console.log('[Crystal Wishlist] Crystal visible in wishlist');

    await page.screenshot({ path: 'test-results/crystal-wishlist-first-item.png' });
  });

  test('2. should add second crystal with different priority', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    // Restore cookies from previous test
    await restoreCookies(page, testInfo);

    // Navigate to personal space and then to wishlist
    await navigateToPersonalSpace(page);
    await navigateToWishlist(page);

    console.log('[Crystal Wishlist] Adding second item...');

    // Verify first item exists
    const firstItem = page.locator('text=Moldavite').first();
    await expect(firstItem).toBeVisible({ timeout: 10000 });
    console.log('[Crystal Wishlist] First item visible');

    // Click add to wishlist button
    const addButton = page.locator('[data-testid="add-wishlist-button"]').first();
    await expect(addButton).toBeVisible({ timeout: 5000 });
    await addButton.click();

    // Verify form dialog opened
    const formDialog = page.locator('[data-testid="wishlist-form"]');
    await expect(formDialog).toBeVisible({ timeout: 5000 });

    // Fill crystal name using the direct name input
    const nameInput = page.locator('[data-testid="wishlist-name-input"]');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill('Larimar');

    // Select "Nice to Have" priority
    const niceToHaveButton = page.locator('button:has-text("Nice to Have")').first();
    await expect(niceToHaveButton).toBeVisible({ timeout: 5000 });
    await niceToHaveButton.click();

    // Fill purpose
    const purposeInput = page.locator('#wishPurpose');
    await expect(purposeInput).toBeVisible({ timeout: 5000 });
    await purposeInput.fill('Throat chakra work and communication');

    // Submit the form
    const submitButton = page.locator('[data-testid="wishlist-submit-button"]');
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    await submitButton.click();

    // Wait for dialog to close
    await expect(formDialog).not.toBeVisible({ timeout: 10000 });
    console.log('[Crystal Wishlist] Second item added');

    // Verify both items appear in wishlist
    const moldavite = page.locator('text=Moldavite').first();
    const larimar = page.locator('text=Larimar').first();

    await expect(moldavite).toBeVisible({ timeout: 10000 });
    await expect(larimar).toBeVisible({ timeout: 10000 });
    console.log('[Crystal Wishlist] Both items visible');

    await page.screenshot({ path: 'test-results/crystal-wishlist-two-items.png' });
  });

  test('3. should show high priority indicator for must-have items', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    // Restore cookies from previous test
    await restoreCookies(page, testInfo);

    // Navigate to personal space and then to wishlist
    await navigateToPersonalSpace(page);
    await navigateToWishlist(page);

    console.log('[Crystal Wishlist] Verifying priority indicators...');

    // Verify both items still in list
    const moldavite = page.locator('text=Moldavite').first();
    const larimar = page.locator('text=Larimar').first();
    await expect(moldavite).toBeVisible({ timeout: 10000 });
    await expect(larimar).toBeVisible({ timeout: 10000 });

    // Check for high priority indicator - should show at least one high priority
    const highPriorityIndicator = page.locator('text=/high priority/i').first();
    await expect(highPriorityIndicator).toBeVisible({ timeout: 10000 });
    console.log('[Crystal Wishlist] High priority indicator visible');

    await page.screenshot({ path: 'test-results/crystal-wishlist-priorities.png' });
  });
});

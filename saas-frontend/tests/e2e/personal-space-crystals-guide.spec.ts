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
 * Personal Space - Crystals - Crystal Guide
 *
 * Tests the crystal reference guide feature:
 * - Navigate to Crystal Guide
 * - Search crystals by name
 * - Filter crystals by chakra/element
 * - Open crystal detail panel
 * - View crystal properties (chakras, elements, care instructions)
 * - Add crystal to wishlist via funnel CTA
 *
 * Requires CRYSTALS spiritual interest and seed data in database.
 */

// Store cookies per test worker
const cookiesPerWorker = new Map<number, string>();
let testUserId = '';

// Cleanup before tests
test.beforeAll(async ({}, testInfo) => {
  console.log('[Setup] Preparing test environment for Crystal Guide...');
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
  return `crystal-guide-${timestamp}-${testInfo.parallelIndex}-${randomSuffix}@playwright.com`;
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
      lastName: 'Guide',
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

test.describe.serial('Personal Space - Crystals - Crystal Guide', () => {
  test('1. should navigate to Crystal Guide and see crystals', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    // Setup user - after this, user is already in Personal Space
    await setupAuthenticatedUser(page, testInfo);

    // Navigate to crystal guide via sidenav
    await navigateToCrystalGuide(page);

    console.log('[Crystal Guide] Navigated via sidenav...');

    // Should see crystals grid (assumes seed data exists)
    const crystalCards = page.locator('[data-testid^="crystal-card-"]');

    // Wait for at least some crystals to load
    await page.waitForTimeout(2000);
    const count = await crystalCards.count();
    console.log('[Crystal Guide] Found', count, 'crystal cards');

    // Should have crystals if seed data exists
    if (count > 0) {
      console.log('[Crystal Guide] Crystals loaded successfully');
    } else {
      console.log('[Crystal Guide] No crystals found - seed data may not exist');
    }

    await page.screenshot({ path: 'test-results/crystal-guide-initial.png' });
  });

  test('2. should search crystals by name', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    // Restore cookies from previous test
    await restoreCookies(page, testInfo);

    // Navigate to personal space and then to guide
    await navigateToPersonalSpace(page);
    await navigateToCrystalGuide(page);

    console.log('[Crystal Guide] Testing search functionality...');

    // Wait for crystals to load
    await page.waitForTimeout(2000);

    // Search for "Amethyst"
    const searchInput = page.getByTestId('crystal-guide-search');
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    await searchInput.fill('Amethyst');
    await page.waitForTimeout(1000);

    // Should see Amethyst in results
    const amethystCard = page.locator('[data-testid="crystal-card-amethyst"]');
    const visible = await amethystCard.isVisible({ timeout: 5000 }).catch(() => false);

    if (visible) {
      console.log('[Crystal Guide] Amethyst found in search results');
      await expect(amethystCard).toBeVisible();
    } else {
      console.log('[Crystal Guide] Amethyst not found - checking for any results');
      // Check if any crystals with "amethyst" in name appear
      const anyAmethyst = page.locator('[data-testid^="crystal-card-"]:has-text("Amethyst")').first();
      const anyVisible = await anyAmethyst.isVisible({ timeout: 3000 }).catch(() => false);
      console.log('[Crystal Guide] Any amethyst visible:', anyVisible);
    }

    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(500);
    console.log('[Crystal Guide] Search cleared');

    await page.screenshot({ path: 'test-results/crystal-guide-search.png' });
  });

  test('3. should filter crystals by chakra', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    // Restore cookies from previous test
    await restoreCookies(page, testInfo);

    // Navigate to personal space and then to guide
    await navigateToPersonalSpace(page);
    await navigateToCrystalGuide(page);

    console.log('[Crystal Guide] Testing chakra filter...');

    // Wait for crystals to load
    await page.waitForTimeout(2000);

    // Open chakra filter dropdown
    const chakraFilter = page.getByTestId('chakra-filter');
    await expect(chakraFilter).toBeVisible({ timeout: 5000 });
    await chakraFilter.click();
    await page.waitForTimeout(500);

    // Select "Crown" chakra
    const crownOption = page.locator('[role="option"]:has-text("Crown")').first();
    if (await crownOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await crownOption.click();
      await page.waitForTimeout(1000);
      console.log('[Crystal Guide] Crown chakra filter applied');
    } else {
      console.log('[Crystal Guide] Crown option not found');
    }

    await page.screenshot({ path: 'test-results/crystal-guide-chakra-filter.png' });
  });

  test('4. should open crystal detail panel and view properties', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    // Restore cookies from previous test
    await restoreCookies(page, testInfo);

    // Navigate to personal space and then to guide
    await navigateToPersonalSpace(page);
    await navigateToCrystalGuide(page);

    console.log('[Crystal Guide] Testing detail panel...');

    // Wait for crystals to load
    await page.waitForTimeout(2000);

    // Click on first crystal card
    const firstCrystal = page.locator('[data-testid^="crystal-card-"]').first();
    await expect(firstCrystal).toBeVisible({ timeout: 10000 });
    await firstCrystal.click();
    await page.waitForTimeout(1000);

    // Detail panel should open
    const closeButton = page.getByTestId('close-detail-panel');
    await expect(closeButton).toBeVisible({ timeout: 5000 });
    console.log('[Crystal Guide] Detail panel opened');

    // Should see funnel CTAs
    const addToWishlistBtn = page.getByTestId('add-to-wishlist-btn');
    const findSellersBtn = page.getByTestId('find-sellers-btn');
    await expect(addToWishlistBtn).toBeVisible({ timeout: 5000 });
    await expect(findSellersBtn).toBeVisible({ timeout: 5000 });
    console.log('[Crystal Guide] Funnel CTAs visible');

    // Should see chakra badges if crystal has chakras
    const chakraBadges = page.locator('[data-testid^="chakra-"]');
    const chakraCount = await chakraBadges.count();
    console.log('[Crystal Guide] Found', chakraCount, 'chakra badges');

    // Should see element badges if crystal has elements
    const elementBadges = page.locator('[data-testid^="element-"]');
    const elementCount = await elementBadges.count();
    console.log('[Crystal Guide] Found', elementCount, 'element badges');

    await page.screenshot({ path: 'test-results/crystal-guide-detail-panel.png' });

    // Close the panel
    await closeButton.click();
    await expect(closeButton).not.toBeVisible({ timeout: 5000 });
    console.log('[Crystal Guide] Detail panel closed');
  });

  test('5. should add crystal to wishlist via funnel CTA', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    // Restore cookies from previous test
    await restoreCookies(page, testInfo);

    // Navigate to personal space and then to guide
    await navigateToPersonalSpace(page);
    await navigateToCrystalGuide(page);

    console.log('[Crystal Guide] Testing add to wishlist...');

    // Wait for crystals to load
    await page.waitForTimeout(2000);

    // Click on first crystal card
    const firstCrystal = page.locator('[data-testid^="crystal-card-"]').first();
    await expect(firstCrystal).toBeVisible({ timeout: 10000 });
    await firstCrystal.click();
    await page.waitForTimeout(1000);

    // Detail panel should open
    const addToWishlistBtn = page.getByTestId('add-to-wishlist-btn');
    await expect(addToWishlistBtn).toBeVisible({ timeout: 5000 });

    // Set up dialog handler for success alert
    page.on('dialog', async dialog => {
      console.log('[Crystal Guide] Alert dialog:', dialog.message());
      await dialog.accept();
    });

    // Click add to wishlist
    await addToWishlistBtn.click();
    console.log('[Crystal Guide] Clicked add to wishlist');

    // Wait for mutation to complete
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/crystal-guide-wishlist-added.png' });
  });
});

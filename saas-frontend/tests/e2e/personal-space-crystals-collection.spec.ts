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
 * Personal Space - Crystals - Collection
 *
 * Tests the crystal collection feature:
 * - Create crystal with basic info
 * - Edit crystal to add more details
 * - Search and filter crystals
 * - Delete crystal
 *
 * Requires CRYSTALS spiritual interest to be set in onboarding.
 */

// Store cookies per test worker
const cookiesPerWorker = new Map<number, string>();
let testUserId = '';

// Cleanup before tests
test.beforeAll(async ({}, testInfo) => {
  console.log('[Setup] Preparing test environment for Crystal Collection...');
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
  return `crystal-coll-${timestamp}-${testInfo.parallelIndex}-${randomSuffix}@playwright.com`;
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
      lastName: 'Collector',
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

/** Navigate to crystal collection via sidenav */
async function navigateToCollection(page: Page) {
  // Click on "Crystals" in the sidenav to expand submenu
  const sideNav = page.locator('[aria-label="personal-space-side-nav"]');
  const crystalsButton = sideNav.locator('button[aria-label="Crystals"]').first();
  await expect(crystalsButton).toBeVisible({ timeout: 10000 });
  await crystalsButton.click();
  await page.waitForTimeout(500);

  // Click on "My Collection" in the expanded submenu
  const collectionButton = page.locator('button[aria-label="My Collection"]').first();
  await expect(collectionButton).toBeVisible({ timeout: 5000 });
  await collectionButton.click();

  // Wait for the collection page to load
  await expect(page.getByTestId('add-crystal-button')).toBeVisible({ timeout: 10000 });
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

test.describe.serial('Personal Space - Crystals - Collection', () => {
  test('1. should create first crystal with basic info', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    // Setup user - after this, user is already in Personal Space
    await setupAuthenticatedUser(page, testInfo);

    // Navigate to crystal collection via sidenav
    await navigateToCollection(page);

    console.log('[Crystal Collection] Navigated via sidenav, creating first crystal...');

    // Should show empty state initially
    const emptyState = page.locator('text=Begin Your Crystal Journey');
    await expect(emptyState).toBeVisible({ timeout: 10000 });
    console.log('[Crystal Collection] Empty state visible');

    // Click add crystal button
    const addButton = page.locator('[data-testid="add-crystal-button"]').first();
    await expect(addButton).toBeVisible({ timeout: 5000 });
    await addButton.click();
    await page.waitForTimeout(1000);

    // Verify form dialog opened
    const formDialog = page.locator('[data-testid="crystal-form"]');
    await expect(formDialog).toBeVisible({ timeout: 5000 });
    console.log('[Crystal Collection] Form dialog opened');

    // Fill basic crystal info
    const nameInput = page.locator('[data-testid="crystal-name-input"]');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill('Clear Quartz');

    // Submit should be enabled now
    const submitButton = page.locator('[data-testid="submit-button"]');
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    await submitButton.click();

    // Wait for dialog to close
    await expect(formDialog).not.toBeVisible({ timeout: 10000 });
    console.log('[Crystal Collection] Form submitted and closed');

    // Verify crystal appears in collection
    const crystalCard = page.locator('[data-testid^="crystal-card-"]:has-text("Clear Quartz")').first();
    await expect(crystalCard).toBeVisible({ timeout: 10000 });
    console.log('[Crystal Collection] Crystal card visible in collection');

    await page.screenshot({ path: 'test-results/crystal-collection-first-crystal.png' });
  });

  test('2. should create second crystal with more details', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    // Restore cookies from previous test
    await restoreCookies(page, testInfo);

    // Navigate to personal space and then to collection
    await navigateToPersonalSpace(page);
    await navigateToCollection(page);

    console.log('[Crystal Collection] Creating second crystal with details...');

    // Click add crystal button
    const addButton = page.locator('[data-testid="add-crystal-button"]').first();
    await expect(addButton).toBeVisible({ timeout: 10000 });
    await addButton.click();
    await page.waitForTimeout(1000);

    // Fill crystal info with more details
    const nameInput = page.locator('[data-testid="crystal-name-input"]');
    await nameInput.fill('Amethyst');

    // Select color (Purple)
    const colorTrigger = page.locator('button:has-text("Select color")').first();
    if (await colorTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
      await colorTrigger.click();
      await page.waitForTimeout(500);
      const purpleOption = page.locator('[role="option"]:has-text("Purple")').first();
      if (await purpleOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await purpleOption.click();
        console.log('[Crystal Collection] Selected Purple color');
      }
    }

    // Select form (Tumbled)
    const formTrigger = page.locator('button:has-text("Select form")').first();
    if (await formTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
      await formTrigger.click();
      await page.waitForTimeout(500);
      const tumbledOption = page.locator('[role="option"]:has-text("Tumbled")').first();
      if (await tumbledOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await tumbledOption.click();
        console.log('[Crystal Collection] Selected Tumbled form');
      }
    }

    // Fill origin
    const originInput = page.locator('#origin');
    if (await originInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await originInput.fill('Brazil');
    }

    // Fill primary purpose
    const purposeInput = page.locator('#purpose');
    if (await purposeInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await purposeInput.fill('Spiritual protection and intuition');
    }

    // Submit the form
    const submitButton = page.locator('[data-testid="submit-button"]');
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    await submitButton.click();

    // Wait for dialog to close
    const formDialog = page.locator('[data-testid="crystal-form"]');
    await expect(formDialog).not.toBeVisible({ timeout: 10000 });
    console.log('[Crystal Collection] Second crystal created');

    // Verify both crystals appear in collection
    await page.waitForTimeout(2000);
    const clearQuartz = page.locator('[data-testid^="crystal-card-"]:has-text("Clear Quartz")').first();
    const amethyst = page.locator('[data-testid^="crystal-card-"]:has-text("Amethyst")').first();

    await expect(clearQuartz).toBeVisible({ timeout: 10000 });
    await expect(amethyst).toBeVisible({ timeout: 10000 });
    console.log('[Crystal Collection] Both crystals visible');

    await page.screenshot({ path: 'test-results/crystal-collection-two-crystals.png' });
  });

  test('3. should search and filter crystals', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    // Restore cookies from previous test
    await restoreCookies(page, testInfo);

    // Navigate to personal space and then to collection
    await navigateToPersonalSpace(page);
    await navigateToCollection(page);

    console.log('[Crystal Collection] Testing search functionality...');

    // Wait for crystals to load
    await page.waitForTimeout(2000);

    // Both crystals should be visible initially
    const clearQuartz = page.locator('[data-testid^="crystal-card-"]:has-text("Clear Quartz")').first();
    const amethyst = page.locator('[data-testid^="crystal-card-"]:has-text("Amethyst")').first();
    await expect(clearQuartz).toBeVisible({ timeout: 10000 });
    await expect(amethyst).toBeVisible({ timeout: 10000 });

    // Search for "Amethyst"
    const searchInput = page.locator('[data-testid="crystal-search"]');
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill('Amethyst');
      await page.waitForTimeout(1000);

      // Amethyst should still be visible
      await expect(amethyst).toBeVisible({ timeout: 5000 });
      console.log('[Crystal Collection] Amethyst visible after search');

      // Clear Quartz should be hidden
      const clearQuartzVisible = await clearQuartz.isVisible({ timeout: 3000 }).catch(() => false);
      console.log('[Crystal Collection] Clear Quartz hidden after search:', !clearQuartzVisible);
      expect(clearQuartzVisible).toBe(false);

      // Clear search
      await searchInput.clear();
      await page.waitForTimeout(1000);

      // Both should be visible again
      await expect(clearQuartz).toBeVisible({ timeout: 5000 });
      await expect(amethyst).toBeVisible({ timeout: 5000 });
      console.log('[Crystal Collection] Both visible after clearing search');
    } else {
      console.log('[Crystal Collection] Search input not found, skipping search test');
    }

    await page.screenshot({ path: 'test-results/crystal-collection-search.png' });
  });

  test('4. should edit crystal to add nickname', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    // Restore cookies from previous test
    await restoreCookies(page, testInfo);

    // Navigate to personal space and then to collection
    await navigateToPersonalSpace(page);
    await navigateToCollection(page);

    console.log('[Crystal Collection] Testing edit functionality...');

    // Wait for crystals to load
    await page.waitForTimeout(2000);

    // Find the Amethyst card and hover to reveal menu
    const amethystCard = page.locator('[data-testid^="crystal-card-"]:has-text("Amethyst")').first();
    await expect(amethystCard).toBeVisible({ timeout: 10000 });
    await amethystCard.hover();

    // Click the menu button (MoreVertical icon)
    const menuButton = amethystCard.locator('button').first();
    await menuButton.click();
    await page.waitForTimeout(500);

    // Click Edit option
    const editOption = page.locator('[role="menuitem"]:has-text("Edit")').first();
    await expect(editOption).toBeVisible({ timeout: 5000 });
    await editOption.click();
    await page.waitForTimeout(1000);

    // Verify form dialog opened with existing data
    const formDialog = page.locator('[data-testid="crystal-form"]');
    await expect(formDialog).toBeVisible({ timeout: 5000 });
    console.log('[Crystal Collection] Edit dialog opened');

    // Add a nickname
    const nicknameInput = page.locator('#nickname');
    if (await nicknameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nicknameInput.fill('My Purple Guardian');
      console.log('[Crystal Collection] Added nickname');
    }

    // Submit the form
    const submitButton = page.locator('[data-testid="submit-button"]');
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    await submitButton.click();

    // Wait for dialog to close
    await expect(formDialog).not.toBeVisible({ timeout: 10000 });
    console.log('[Crystal Collection] Edit submitted and closed');

    // Verify the nickname appears on the card
    await page.waitForTimeout(2000);
    const updatedCard = page.locator('[data-testid^="crystal-card-"]:has-text("My Purple Guardian")').first();
    const nicknameVisible = await updatedCard.isVisible({ timeout: 10000 }).catch(() => false);
    console.log('[Crystal Collection] Nickname visible on card:', nicknameVisible);
    expect(nicknameVisible).toBe(true);

    await page.screenshot({ path: 'test-results/crystal-collection-edited.png' });
  });

  test('5. should delete a crystal', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    // Restore cookies from previous test
    await restoreCookies(page, testInfo);

    // Navigate to personal space and then to collection
    await navigateToPersonalSpace(page);
    await navigateToCollection(page);

    console.log('[Crystal Collection] Testing delete functionality...');

    // Wait for crystals to load
    await page.waitForTimeout(2000);

    // Find the Clear Quartz card and hover to reveal menu
    const clearQuartzCard = page.locator('[data-testid^="crystal-card-"]:has-text("Clear Quartz")').first();
    await expect(clearQuartzCard).toBeVisible({ timeout: 10000 });
    await clearQuartzCard.hover();

    // Click the menu button
    const menuButton = clearQuartzCard.locator('button').first();
    await menuButton.click();
    await page.waitForTimeout(500);

    // Click Delete option
    const deleteOption = page.locator('[role="menuitem"]:has-text("Delete")').first();
    await expect(deleteOption).toBeVisible({ timeout: 5000 });

    // Set up dialog handler for confirmation
    page.on('dialog', async dialog => {
      console.log('[Crystal Collection] Confirm dialog appeared:', dialog.message());
      await dialog.accept();
    });

    await deleteOption.click();

    // Wait for the card to be removed from DOM (mutation + refetch)
    await expect(clearQuartzCard).not.toBeVisible({ timeout: 10000 });
    console.log('[Crystal Collection] Clear Quartz deleted successfully');

    // Amethyst (with nickname) should still be visible
    const amethystCard = page.locator('[data-testid^="crystal-card-"]:has-text("My Purple Guardian")').first();
    await expect(amethystCard).toBeVisible({ timeout: 5000 });
    console.log('[Crystal Collection] Amethyst still visible after delete');

    await page.screenshot({ path: 'test-results/crystal-collection-after-delete.png' });
  });
});

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
 * Personal Space - Crystals - Crystal Grids
 *
 * Tests the crystal grids feature:
 * - Create grid with crystals
 * - Activate/deactivate grid
 * - Edit grid details
 *
 * Requires CRYSTALS spiritual interest to be set in onboarding.
 */

// Store cookies per test worker
const cookiesPerWorker = new Map<number, string>();
const userIdPerWorker = new Map<number, string>();

// Cleanup before tests
test.beforeAll(async ({}, testInfo) => {
  console.log('[Setup] Preparing test environment for Crystal Grids...');
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
  return `crystal-grid-${timestamp}-${testInfo.parallelIndex}-${randomSuffix}@playwright.com`;
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
    lastName: 'Gridmaker',
    phone: '0412345680',
    address: 'Sydney Opera House',
    securityQuestion: 'What is sacred geometry?',
    securityAnswer: 'Divine pattern',
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

/** Navigate to crystal grids via sidenav */
async function navigateToGrids(page: Page) {
  // Click on "Crystals" in the sidenav to expand submenu
  const sideNav = page.locator('[aria-label="personal-space-side-nav"]');
  const crystalsButton = sideNav.locator('button[aria-label="Crystals"]').first();
  await expect(crystalsButton).toBeVisible({ timeout: 10000 });
  await crystalsButton.click();
  await page.waitForTimeout(500);

  // Click on "Crystal Grids" in the expanded submenu
  const gridsButton = page.locator('button[aria-label="Crystal Grids"]').first();
  await expect(gridsButton).toBeVisible({ timeout: 5000 });
  await gridsButton.click();

  // Wait for the grids page to load
  await expect(page.getByTestId('create-grid-button')).toBeVisible({ timeout: 10000 });
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

test.describe.serial('Personal Space - Crystals - Crystal Grids', () => {
  test('1. should create crystal grid with custom crystals', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    // Setup user - after this, user is already in Personal Space
    await setupAuthenticatedUser(page, testInfo);

    // Navigate to crystal grids via sidenav
    await navigateToGrids(page);

    console.log('[Crystal Grids] Navigated via sidenav, creating first grid...');

    // Should show empty state initially
    const emptyState = page.locator('text=Create Your First Crystal Grid');
    await expect(emptyState).toBeVisible({ timeout: 10000 });
    console.log('[Crystal Grids] Empty state visible');

    // Click create grid button
    const createButton = page.locator('[data-testid="create-grid-button"]').first();
    await expect(createButton).toBeVisible({ timeout: 5000 });
    await createButton.click();

    // Verify form dialog opened
    const formDialog = page.locator('[data-testid="grid-form"]');
    await expect(formDialog).toBeVisible({ timeout: 5000 });
    console.log('[Crystal Grids] Form dialog opened');

    // Fill grid name
    const nameInput = page.locator('[data-testid="grid-name-input"]');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill('Abundance Manifestation');
    console.log('[Crystal Grids] Entered grid name');

    // Fill purpose/intention
    const purposeInput = page.locator('#gridPurpose');
    await expect(purposeInput).toBeVisible({ timeout: 5000 });
    await purposeInput.fill('Manifesting financial abundance and prosperity in my life');
    console.log('[Crystal Grids] Entered purpose');

    // Select grid shape
    const shapeSelect = page.locator('button:has-text("Select sacred geometry")').first();
    await expect(shapeSelect).toBeVisible({ timeout: 5000 });
    await shapeSelect.click();
    await page.waitForTimeout(500);
    const flowerOption = page.locator('[role="option"]:has-text("Flower of Life")').first();
    await expect(flowerOption).toBeVisible({ timeout: 5000 });
    await flowerOption.click();
    console.log('[Crystal Grids] Selected Flower of Life shape');

    // Add first crystal placement
    const addCrystalButton = page.locator('button:has-text("Add First Crystal")').or(page.locator('button:has-text("Add Crystal")')).first();
    await expect(addCrystalButton).toBeVisible({ timeout: 5000 });
    await addCrystalButton.click();
    await page.waitForTimeout(500);
    console.log('[Crystal Grids] Added crystal placement slot');

    // Crystal select defaults to "custom" (Other) since we have no crystals in collection
    // The input field should be visible directly since crystalId is undefined
    const crystalNameInput = page.locator('input[placeholder="Crystal name"]').first();
    await expect(crystalNameInput).toBeVisible({ timeout: 5000 });
    await crystalNameInput.fill('Citrine');
    console.log('[Crystal Grids] Entered crystal name: Citrine');

    // Select position - Center (Focus Stone)
    const positionSelect = page.locator('button:has-text("Select")').first();
    await expect(positionSelect).toBeVisible({ timeout: 5000 });
    await positionSelect.click();
    await page.waitForTimeout(500);
    const centerOption = page.locator('[role="option"]:has-text("Center")').first();
    await expect(centerOption).toBeVisible({ timeout: 5000 });
    await centerOption.click();
    console.log('[Crystal Grids] Selected Center position');

    // Select role - Focus Stone
    const roleSelect = page.locator('button:has-text("Crystal\'s role")').first();
    await expect(roleSelect).toBeVisible({ timeout: 5000 });
    await roleSelect.click();
    await page.waitForTimeout(500);
    const focusOption = page.locator('[role="option"]:has-text("Focus Stone")').first();
    await expect(focusOption).toBeVisible({ timeout: 5000 });
    await focusOption.click();
    console.log('[Crystal Grids] Selected Focus Stone role');

    // Submit the form
    const submitButton = page.locator('[data-testid="grid-submit-button"]');
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    await submitButton.click();

    // Wait for dialog to close
    await expect(formDialog).not.toBeVisible({ timeout: 10000 });
    console.log('[Crystal Grids] Form submitted and closed');

    // Verify grid appears in list
    const gridItem = page.locator('text=Abundance Manifestation').first();
    await expect(gridItem).toBeVisible({ timeout: 10000 });
    console.log('[Crystal Grids] Grid visible in list');

    await page.screenshot({ path: 'test-results/crystal-grid-created.png' });
  });

  test('2. should verify first grid persisted', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    // Restore cookies from previous test
    await restoreCookies(page, testInfo);

    // Navigate to personal space and then to grids
    await navigateToPersonalSpace(page);
    await navigateToGrids(page);

    console.log('[Crystal Grids] Verifying first grid persisted...');

    // Verify first grid exists and shows correct data
    const firstGrid = page.locator('text=Abundance Manifestation').first();
    await expect(firstGrid).toBeVisible({ timeout: 10000 });
    console.log('[Crystal Grids] First grid persisted and visible');

    await page.screenshot({ path: 'test-results/crystal-grid-persisted.png' });
  });

});

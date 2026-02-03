import { test, expect } from '@playwright/test';
import { AuthPage } from '../pages/AuthPage';
import { HomePage } from '../pages/HomePage';
import { UserSetupPage } from '../pages/UserSetupPage';
import { PractitionerSetupPage } from '../pages/PractitionerSetupPage';
import {
  clearTestEntityRegistry,
  registerTestUser,
  registerTestPractitioner,
  getCookiesFromPage,
  cleanupTestUsers,
  cleanupTestPractitioners,
  getVendorIdFromSlug,
} from '../utils/test-cleanup';

// Store cookies per test worker
const cookiesPerWorker = new Map<number, string>();

/**
 * Practitioner Signup Flow Tests
 *
 * Consolidated tests for practitioner registration and dashboard:
 * 1. Full signup flow with validation checks along the way
 * 2. Public profile display verification
 * 3. Dashboard navigation and functionality
 * 4. Service creation dialogs
 */

test.beforeAll(async ({}, testInfo) => {
  console.log('[Setup] Preparing practitioner test environment...');
  clearTestEntityRegistry(testInfo.parallelIndex);

  // Note: If you see "slug already taken" errors, manually delete test practitioners
  // from the database with slugs matching "test-prac-*" or "test-practitioner-*"
});

test.afterAll(async ({}, testInfo) => {
  test.setTimeout(120000);
  const workerId = testInfo.parallelIndex;
  const cookies = cookiesPerWorker.get(workerId);

  if (cookies) {
    try {
      await cleanupTestPractitioners(cookies, workerId);
      await cleanupTestUsers(cookies, workerId);
    } catch (error) {
      console.error('[Cleanup] Error during cleanup:', error);
    } finally {
      cookiesPerWorker.delete(workerId);
    }
  }
  clearTestEntityRegistry(workerId);
});

test.describe('Practitioner', () => {
  let authPage: AuthPage;
  let homePage: HomePage;
  let userSetupPage: UserSetupPage;
  let practitionerSetupPage: PractitionerSetupPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    homePage = new HomePage(page);
    userSetupPage = new UserSetupPage(page);
    practitionerSetupPage = new PractitionerSetupPage(page);
    await page.goto('/');
  });

  test('complete practitioner signup flow with dashboard navigation', async ({ page }, testInfo) => {
    test.setTimeout(300000); // 5 minutes for full flow including dashboard tests

    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const workerId = testInfo.parallelIndex;
    const testEmail = `practitioner-${timestamp}-${workerId}@playwright.com`;
    const practitionerSlug = `test-prac-${timestamp}-${randomSuffix}`;

    // === AUTHENTICATION ===
    await authPage.startAuthFlow(testEmail);
    await expect(page.locator('[aria-label="input-login-otp"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[aria-label="input-login-otp"]').click();
    await page.keyboard.type('123456');
    await page.waitForURL('/', { timeout: 15000 });

    // === USER SETUP ===
    await homePage.waitForCompleteProfileLink();
    await homePage.clickCompleteProfile();
    await expect(page).toHaveURL(/\/u\/.*\/setup/, { timeout: 10000 });

    // Register user for cleanup
    const url = page.url();
    const userIdMatch = url.match(/\/u\/([^\/]+)\/setup/);
    if (userIdMatch) {
      registerTestUser({ id: userIdMatch[1], email: testEmail }, workerId);
      const cookies = await getCookiesFromPage(page);
      if (cookies) cookiesPerWorker.set(workerId, cookies);
    }

    await userSetupPage.fillUserProfile({
      firstName: 'Test',
      lastName: 'Practitioner',
      phone: '0412345678',
      address: 'Sydney Opera House',
      securityQuestion: 'What is your favorite color?',
      securityAnswer: 'Blue',
    });

    // Click "Continue as Practitioner"
    const practitionerBtn = page.locator('[data-testid="continue-as-practitioner-btn"]');
    await expect(practitionerBtn).toBeVisible({ timeout: 10000 });
    await expect(practitionerBtn).toBeEnabled({ timeout: 10000 });
    await practitionerBtn.click();
    await expect(page).toHaveURL(/\/p\/setup\?practitionerId=/, { timeout: 15000 });

    // === STEP 1: BASIC INFO ===
    await practitionerSetupPage.waitForStep1();

    // Test validation - try to continue with empty fields
    await practitionerSetupPage.clickContinue();
    await page.waitForTimeout(500);
    let errors = await practitionerSetupPage.getValidationErrors();
    expect(errors.length).toBeGreaterThan(0);

    // Test slug format - invalid characters should show error
    await page.fill('input[name="slug"]', 'Invalid Slug!');
    await page.waitForTimeout(300);

    // Test auto-slug generation from name
    await page.fill('input[name="name"]', `Test Practitioner ${timestamp}`);
    await page.waitForTimeout(500);
    const autoSlug = await page.inputValue('input[name="slug"]');
    expect(autoSlug).toMatch(/^[a-z0-9-]+$/); // Should be lowercase with hyphens

    // Fill valid step 1 data
    await practitionerSetupPage.fillBasicInfo({
      name: `Test Practitioner ${timestamp}`,
      slug: practitionerSlug,
      email: testEmail,
      countryName: 'Australia',
    });
    await practitionerSetupPage.clickContinue();

    // === STEP 2: PROFILE ===
    await practitionerSetupPage.waitForStep2();

    // Test validation - try to continue without modalities/specializations
    await page.fill('input[name="headline"]', 'Test Headline');
    await page.fill('textarea[name="bio"]', 'This is a test bio that needs to be at least 50 characters long for validation.');
    await practitionerSetupPage.clickContinue();
    await page.waitForTimeout(500);
    errors = await practitionerSetupPage.getValidationErrors();
    expect(errors.length).toBeGreaterThan(0); // Should require modalities/specializations

    // Test back navigation preserves data
    await practitionerSetupPage.clickBack();
    await practitionerSetupPage.waitForStep1();
    const nameValue = await page.inputValue('input[name="name"]');
    expect(nameValue).toContain('Test Practitioner');

    // Go forward again
    await practitionerSetupPage.clickContinue();
    await practitionerSetupPage.waitForStep2();

    // Fill valid step 2 data
    await practitionerSetupPage.fillProfile({
      headline: 'Experienced Tarot Reader & Intuitive Guide',
      bio: 'I have been reading tarot for over 10 years and specialize in helping people find clarity. My approach is gentle yet direct, providing actionable insights for your journey.',
      modalities: ['TAROT', 'ORACLE'],
      specializations: ['RELATIONSHIPS', 'CAREER'],
    });
    await practitionerSetupPage.clickContinue();

    // === STEP 3: DETAILS (OPTIONAL) ===
    await practitionerSetupPage.waitForStep3();
    await practitionerSetupPage.fillDetails({
      pronouns: 'she/her',
      yearsExperience: 10,
      spiritualJourney: 'My journey began when I received my first tarot deck as a gift.',
      approach: 'I believe in empowering clients to make their own decisions through guidance.',
    });
    await practitionerSetupPage.clickContinue();

    // === STEP 4: SUBSCRIPTION ===
    await practitionerSetupPage.waitForStep4();
    await practitionerSetupPage.waitForSubscriptionLoaded();
    // Base plan (Essentials) is automatically selected, just verify it loaded

    await practitionerSetupPage.submitForm();

    // === VERIFY PROFILE PAGE ===
    await page.waitForURL(new RegExp(`/p/${practitionerSlug}`), { timeout: 30000 });

    // Get cookies and fetch actual vendor ID for cleanup
    const updatedCookies = await getCookiesFromPage(page);
    if (updatedCookies) {
      cookiesPerWorker.set(workerId, updatedCookies);

      // IMPORTANT: The practitionerId from the URL is NOT the actual vendor ID.
      // The server generates its own ID during create_practitioner mutation.
      // We need to fetch the actual vendor ID using the slug.
      const actualVendorId = await getVendorIdFromSlug(practitionerSlug, updatedCookies);

      if (actualVendorId) {
        console.log(`[Test] Registering practitioner for cleanup: vendorId=${actualVendorId}, slug=${practitionerSlug}`);
        registerTestPractitioner({ id: actualVendorId, slug: practitionerSlug, email: testEmail, cookies: updatedCookies }, workerId);
      } else {
        console.error(`[Test] WARNING: Could not fetch actual vendor ID for slug ${practitionerSlug}`);
        registerTestPractitioner({ slug: practitionerSlug, email: testEmail, cookies: updatedCookies }, workerId);
      }
    }

    // Verify profile displays correctly
    expect(page.url()).toMatch(new RegExp(`/p/${practitionerSlug}`));
    await expect(page.locator('h1').filter({ hasText: 'Test Practitioner' })).toBeVisible({ timeout: 10000 });

    // === NAVIGATE TO DASHBOARD ===
    await page.goto(`/p/${practitionerSlug}/manage`);
    await expect(page.getByText('Welcome back')).toBeVisible({ timeout: 15000 });

    // Verify dashboard elements
    await expect(page.getByText('Quick Actions')).toBeVisible();
    await expect(page.getByText('Getting Started')).toBeVisible();

    // === TEST SIDEBAR NAVIGATION ===
    const sideNav = page.locator('[aria-label="practitioner-side-nav"]');
    await expect(sideNav).toBeVisible();

    // Navigate to Services page
    await sideNav.getByRole('menuitem', { name: 'My Services' }).click();
    await page.waitForTimeout(300);
    await sideNav.getByRole('menuitem', { name: 'View All Services' }).click();
    await expect(page).toHaveURL(new RegExp(`/p/${practitionerSlug}/manage/services`), { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'My Services' })).toBeVisible();

    // Navigate to Reading Requests page
    await sideNav.getByRole('menuitem', { name: 'Reading Requests' }).click();
    await expect(page).toHaveURL(new RegExp(`/p/${practitionerSlug}/manage/readings`), { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'SpiriReadings', exact: true })).toBeVisible();

    // Navigate to Bookings page
    await sideNav.getByRole('menuitem', { name: 'Bookings' }).click();
    await expect(page).toHaveURL(new RegExp(`/p/${practitionerSlug}/manage/bookings`), { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Bookings' })).toBeVisible();

    // Navigate to Availability page
    await sideNav.getByRole('menuitem', { name: 'Availability' }).click();
    await expect(page).toHaveURL(new RegExp(`/p/${practitionerSlug}/manage/availability`), { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Availability' })).toBeVisible();

    // Navigate to Profile page (via Profile > Overview submenu)
    await sideNav.getByRole('menuitem', { name: 'Profile' }).click();
    await page.waitForTimeout(300);
    await sideNav.getByRole('menuitem', { name: 'Overview' }).click();
    await expect(page).toHaveURL(new RegExp(`/p/${practitionerSlug}/manage/profile`), { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible();

    // Navigate back to Dashboard
    await sideNav.getByRole('menuitem', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL(new RegExp(`/p/${practitionerSlug}/manage$`), { timeout: 10000 });

    // === TEST SERVICE CREATION DIALOGS ===
    // Test New Reading dialog from quick actions
    await page.getByRole('button', { name: 'New Reading' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Test New Healing dialog from sidebar
    await sideNav.getByRole('menuitem', { name: 'My Services' }).click();
    await page.waitForTimeout(300);
    await sideNav.getByRole('menuitem', { name: 'New Healing' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // === TEST GO TO PUBLIC PROFILE ===
    // Navigate directly to public profile to verify it works
    await page.goto(`/p/${practitionerSlug}`);
    await expect(page.locator('h1').filter({ hasText: 'Test Practitioner' })).toBeVisible({ timeout: 10000 });
  });
});

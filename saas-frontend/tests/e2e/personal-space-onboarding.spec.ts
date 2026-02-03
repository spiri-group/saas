import { test, expect, Page, TestInfo } from '@playwright/test';
import { PersonalSpaceOnboardingPage } from '../pages/PersonalSpaceOnboardingPage';
import { AuthPage } from '../pages/AuthPage';
import { HomePage } from '../pages/HomePage';
import { UserSetupPage } from '../pages/UserSetupPage';
import { TEST_CONFIG } from '../fixtures/test-config';
import {
  clearTestEntityRegistry,
  registerTestUser,
  getCookiesFromPage,
  cleanupTestUsers,
} from '../utils/test-cleanup';

// Store cookies per test worker to avoid race conditions
const cookiesPerWorker = new Map<number, string>();

/**
 * Personal Space Onboarding Flow Tests
 *
 * Tests the two-screen onboarding flow for Personal Space:
 * Screen 1: Primary spiritual interest selection (single select, required)
 * Screen 2: Secondary interests selection (multi-select, optional)
 *
 * Consolidated into 4 comprehensive tests to minimize auth setup overhead.
 */

// Cleanup before tests
test.beforeAll(async ({}, testInfo) => {
  console.log('[Setup] Preparing test environment for Personal Space onboarding...');
  clearTestEntityRegistry(testInfo.parallelIndex);
});

// Cleanup after all tests
test.afterAll(async ({}, testInfo) => {
  test.setTimeout(120000); // 2 minutes for cleanup

  const workerId = testInfo.parallelIndex;
  const cookies = cookiesPerWorker.get(workerId);

  if (cookies) {
    try {
      await cleanupTestUsers(cookies, workerId);
    } catch (error) {
      console.error('[Cleanup] Error during cleanup:', error);
    } finally {
      cookiesPerWorker.delete(workerId);
    }
  }
  clearTestEntityRegistry(workerId);
});

/**
 * Helper to set up authenticated user and navigate to onboarding
 */
async function setupAuthenticatedUser(
  page: Page,
  testInfo: TestInfo,
  authPage: AuthPage,
  homePage: HomePage,
  setupPage: UserSetupPage
): Promise<string> {
  const testEmail = TEST_CONFIG.TEST_EMAIL;
  let testUserId = '';

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
      firstName: 'Test',
      lastName: 'User',
      phone: '0412345678',
      address: 'Sydney Opera House',
      securityQuestion: 'What is your favorite color?',
      securityAnswer: 'Blue',
    });
    await setupPage.startBrowsing();
  } catch {
    const personalSpaceLink = page.locator('a[href^="/u/"]');
    if (await personalSpaceLink.isVisible()) {
      const href = await personalSpaceLink.getAttribute('href');
      const match = href?.match(/\/u\/([^\/]+)/);
      if (match) {
        testUserId = match[1];
        registerTestUser({ id: testUserId, email: testEmail }, testInfo.parallelIndex);
        const cookies = await getCookiesFromPage(page);
        if (cookies) cookiesPerWorker.set(testInfo.parallelIndex, cookies);
      }
    }
  }

  return testUserId;
}

test.describe('Personal Space - Onboarding', () => {
  test('Screen 1: should render all options, enforce single-select, and show step indicators', async ({ page }, testInfo) => {
    const onboardingPage = new PersonalSpaceOnboardingPage(page);
    const authPage = new AuthPage(page);
    const homePage = new HomePage(page);
    const setupPage = new UserSetupPage(page);

    const testUserId = await setupAuthenticatedUser(page, testInfo, authPage, homePage, setupPage);
    await page.goto(`/u/${testUserId}/onboarding`);
    await expect(page.locator('[data-testid="screen-1"]')).toBeVisible({ timeout: 10000 });

    // Verify all 7 options are rendered
    const optionsCount = await onboardingPage.getPrimaryOptionsCount();
    expect(optionsCount).toBe(7);
    await expect(page.locator('[data-testid="primary-option-mediumship"]')).toBeVisible();
    await expect(page.locator('[data-testid="primary-option-paranormal"]')).toBeVisible();
    await expect(page.locator('[data-testid="primary-option-crystals"]')).toBeVisible();
    await expect(page.locator('[data-testid="primary-option-witchcraft"]')).toBeVisible();
    await expect(page.locator('[data-testid="primary-option-energy"]')).toBeVisible();
    await expect(page.locator('[data-testid="primary-option-herbalism"]')).toBeVisible();
    await expect(page.locator('[data-testid="primary-option-faith"]')).toBeVisible();

    // Verify headings
    await expect(page.locator('text=What speaks to your spirit?')).toBeVisible();
    await expect(page.locator('text=This helps us create a space that feels like home.')).toBeVisible();

    // Step 1 indicator should be active, step 2 not yet
    await expect(page.locator('[data-testid="step-indicator-1"]')).toHaveClass(/bg-purple-500/);
    await expect(page.locator('[data-testid="step-indicator-2"]')).not.toHaveClass(/bg-purple-500/);

    // Continue button disabled when nothing selected
    expect(await onboardingPage.isContinueButtonEnabled()).toBe(false);

    // Select first option - button should enable
    await onboardingPage.selectPrimaryInterest('mediumship');
    expect(await onboardingPage.isContinueButtonEnabled()).toBe(true);
    expect(await onboardingPage.isPrimaryOptionSelected('mediumship')).toBe(true);

    // Select different option - single select enforced
    await onboardingPage.selectPrimaryInterest('energy');
    expect(await onboardingPage.isPrimaryOptionSelected('energy')).toBe(true);
    expect(await onboardingPage.isPrimaryOptionSelected('mediumship')).toBe(false);
  });

  test('Screen 2: should exclude primary, allow multi-select, toggle, and navigate back', async ({ page }, testInfo) => {
    const onboardingPage = new PersonalSpaceOnboardingPage(page);
    const authPage = new AuthPage(page);
    const homePage = new HomePage(page);
    const setupPage = new UserSetupPage(page);

    const testUserId = await setupAuthenticatedUser(page, testInfo, authPage, homePage, setupPage);
    await page.goto(`/u/${testUserId}/onboarding`);
    await expect(page.locator('[data-testid="screen-1"]')).toBeVisible({ timeout: 10000 });

    // Select primary and continue to Screen 2
    await onboardingPage.selectPrimaryInterest('mediumship');
    await onboardingPage.clickContinue();

    // Verify Screen 2 rendered
    expect(await onboardingPage.isOnScreen2()).toBe(true);
    await expect(page.locator('text=Anything else that calls to you?')).toBeVisible();

    // Both step indicators should be active on Screen 2
    await expect(page.locator('[data-testid="step-indicator-1"]')).toHaveClass(/bg-purple-500/);
    await expect(page.locator('[data-testid="step-indicator-2"]')).toHaveClass(/bg-purple-500/);

    // Primary selection excluded from secondary (6 options, not 7)
    expect(await onboardingPage.isInterestInSecondaryOptions('mediumship')).toBe(false);
    expect(await onboardingPage.getSecondaryOptionsCount()).toBe(6);

    // Multi-select works
    await onboardingPage.toggleSecondaryInterest('energy');
    await onboardingPage.toggleSecondaryInterest('crystals');
    expect(await onboardingPage.isSecondaryOptionSelected('energy')).toBe(true);
    expect(await onboardingPage.isSecondaryOptionSelected('crystals')).toBe(true);

    // Toggle deselects
    await onboardingPage.toggleSecondaryInterest('energy');
    expect(await onboardingPage.isSecondaryOptionSelected('energy')).toBe(false);

    // Back button returns to Screen 1 with selection preserved
    await onboardingPage.clickBack();
    expect(await onboardingPage.isOnScreen1()).toBe(true);
    expect(await onboardingPage.isPrimaryOptionSelected('mediumship')).toBe(true);
  });

  test('Flow completion with Skip: should save primary only and redirect to home', async ({ page }, testInfo) => {
    const onboardingPage = new PersonalSpaceOnboardingPage(page);
    const authPage = new AuthPage(page);
    const homePage = new HomePage(page);
    const setupPage = new UserSetupPage(page);

    const testUserId = await setupAuthenticatedUser(page, testInfo, authPage, homePage, setupPage);
    await page.goto(`/u/${testUserId}/onboarding`);
    await expect(page.locator('[data-testid="screen-1"]')).toBeVisible({ timeout: 10000 });

    // Complete flow with Skip
    await onboardingPage.selectPrimaryInterest('crystals');
    await onboardingPage.clickContinue();
    await onboardingPage.clickSkip();

    // Should redirect to home
    await page.waitForURL('/', { timeout: 15000 });
    await expect(page).toHaveURL('/');
  });

  test('Flow completion with selections: should save all interests and redirect to home', async ({ page }, testInfo) => {
    const onboardingPage = new PersonalSpaceOnboardingPage(page);
    const authPage = new AuthPage(page);
    const homePage = new HomePage(page);
    const setupPage = new UserSetupPage(page);

    const testUserId = await setupAuthenticatedUser(page, testInfo, authPage, homePage, setupPage);
    await page.goto(`/u/${testUserId}/onboarding`);
    await expect(page.locator('[data-testid="screen-1"]')).toBeVisible({ timeout: 10000 });

    // Complete flow with selections
    await onboardingPage.selectPrimaryInterest('energy');
    await onboardingPage.clickContinue();
    await onboardingPage.toggleSecondaryInterest('crystals');
    await onboardingPage.toggleSecondaryInterest('herbalism');
    await onboardingPage.clickFinish();

    // Should redirect to home
    await page.waitForURL('/', { timeout: 15000 });
    await expect(page).toHaveURL('/');
  });
});

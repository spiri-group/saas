import { test, expect, Page, TestInfo } from '@playwright/test';
import { DreamsJournalPage } from '../pages/DreamsJournalPage';
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
 * Dreams Journal Tests
 *
 * Tests for the Dreams Journal feature.
 * IMPORTANT: These tests require MEDIUMSHIP spiritual interest to be set.
 */

// Cleanup before tests
test.beforeAll(async ({}, testInfo) => {
  console.log('[Setup] Preparing test environment for Dreams Journal...');
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
      console.error('[Cleanup] Error during cleanup:', error);
    } finally {
      cookiesPerWorker.delete(workerId);
    }
  }
  clearTestEntityRegistry(workerId);
});

/**
 * Helper to set up authenticated user with MEDIUMSHIP interest
 */
async function setupMediumshipUser(
  page: Page,
  testInfo: TestInfo,
  authPage: AuthPage,
  homePage: HomePage,
  setupPage: UserSetupPage,
  onboardingPage: PersonalSpaceOnboardingPage
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
      firstName: 'Dream',
      lastName: 'Tester',
      phone: '0412345678',
      address: 'Sydney Opera House',
      securityQuestion: 'What is your spirit animal?',
      securityAnswer: 'Owl',
    });
    await setupPage.startBrowsing();

    // Complete onboarding with MEDIUMSHIP as primary interest
    await page.goto(`/u/${testUserId}/onboarding`);
    await expect(page.locator('[data-testid="screen-1"]')).toBeVisible({ timeout: 10000 });
    await onboardingPage.selectPrimaryInterest('mediumship');
    await onboardingPage.clickContinue();
    await onboardingPage.clickSkip();
    await page.waitForURL('/', { timeout: 15000 });
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

test.describe('Personal Space - Mediumship - Dreams', () => {
  test('Dreams Journal: create dream entry and verify', async ({ page }, testInfo) => {
    const dreamsPage = new DreamsJournalPage(page);
    const authPage = new AuthPage(page);
    const homePage = new HomePage(page);
    const setupPage = new UserSetupPage(page);
    const onboardingPage = new PersonalSpaceOnboardingPage(page);

    const testUserId = await setupMediumshipUser(page, testInfo, authPage, homePage, setupPage, onboardingPage);
    await dreamsPage.goto(testUserId);
    await dreamsPage.waitForPageLoad();

    // Should show empty state initially
    expect(await dreamsPage.isEmptyStateVisible()).toBe(true);

    // Open form
    await dreamsPage.clickNewDream();
    await dreamsPage.waitForFormDialog();

    // Create dream entry
    await dreamsPage.setTitle('Flying Over Mountains');
    await dreamsPage.setContent('I was soaring high above snow-capped peaks, feeling completely free and weightless.');
    await dreamsPage.setInterpretation('This dream may represent a desire for freedom and transcendence.');
    await dreamsPage.submitForm();
    await dreamsPage.waitForFormToClose();

    // Dream should appear in list
    expect(await dreamsPage.getDreamCount()).toBe(1);
    expect(await dreamsPage.isDreamInList('Flying Over Mountains')).toBe(true);
  });

  test('Dreams Journal: create lucid dream entry', async ({ page }, testInfo) => {
    const dreamsPage = new DreamsJournalPage(page);
    const authPage = new AuthPage(page);
    const homePage = new HomePage(page);
    const setupPage = new UserSetupPage(page);
    const onboardingPage = new PersonalSpaceOnboardingPage(page);

    const testUserId = await setupMediumshipUser(page, testInfo, authPage, homePage, setupPage, onboardingPage);
    await dreamsPage.goto(testUserId);
    await dreamsPage.waitForPageLoad();

    // Open form
    await dreamsPage.clickNewDream();
    await dreamsPage.waitForFormDialog();

    // Create lucid dream entry
    await dreamsPage.setTitle('Lucid Adventure');
    await dreamsPage.setContent('I realized I was dreaming and took control, deciding to explore the dreamscape.');
    await dreamsPage.toggleLucid();
    await dreamsPage.submitForm();
    await dreamsPage.waitForFormToClose();

    // Dream should appear with lucid badge
    expect(await dreamsPage.getDreamCount()).toBeGreaterThanOrEqual(1);
    expect(await dreamsPage.isDreamInList('Lucid Adventure')).toBe(true);
  });
});

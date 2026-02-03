import { test, expect, Page, TestInfo } from '@playwright/test';
import { EnergyJournalPage } from '../pages/EnergyJournalPage';
import { ChakraCheckinPage } from '../pages/ChakraCheckinPage';
import { SessionReflectionsPage } from '../pages/SessionReflectionsPage';
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
 * Energy Tests
 *
 * Consolidated tests for Energy Journal, Chakra Check-In, and Session Reflections.
 * IMPORTANT: These tests require ENERGY spiritual interest to be set.
 */

// Cleanup before tests
test.beforeAll(async ({}, testInfo) => {
  console.log('[Setup] Preparing test environment for Energy features...');
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
 * Helper to set up authenticated user with ENERGY interest
 */
async function setupEnergyUser(
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
      firstName: 'Energy',
      lastName: 'Tester',
      phone: '0412345678',
      address: 'Sydney Opera House',
      securityQuestion: 'What is your favorite modality?',
      securityAnswer: 'Reiki',
    });
    await setupPage.startBrowsing();

    // Complete onboarding with ENERGY as primary interest
    await page.goto(`/u/${testUserId}/onboarding`);
    await expect(page.locator('[data-testid="screen-1"]')).toBeVisible({ timeout: 10000 });
    await onboardingPage.selectPrimaryInterest('energy');
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

test.describe('Personal Space - Energy', () => {
  test('Energy Journal: create entry and verify', async ({ page }, testInfo) => {
    const journalPage = new EnergyJournalPage(page);
    const authPage = new AuthPage(page);
    const homePage = new HomePage(page);
    const setupPage = new UserSetupPage(page);
    const onboardingPage = new PersonalSpaceOnboardingPage(page);

    const testUserId = await setupEnergyUser(page, testInfo, authPage, homePage, setupPage, onboardingPage);
    await journalPage.goto(testUserId);
    await journalPage.waitForPageLoad();

    // Should show empty state initially
    expect(await journalPage.isEmptyStateVisible()).toBe(true);

    // Open form
    await journalPage.clickNewEntry();
    await journalPage.waitForFormDialog();

    // Create entry
    await journalPage.selectEntryType('Meditation');
    await journalPage.selectModality('Reiki');
    await journalPage.setDuration(30);
    await journalPage.setNotes('Focused on grounding and centering');
    await journalPage.submitForm();
    await journalPage.waitForFormToClose();

    // Entry should appear
    expect(await journalPage.getEntryCount()).toBe(1);
  });

  test('Chakra Check-In: create check-in and verify', async ({ page }, testInfo) => {
    const chakraPage = new ChakraCheckinPage(page);
    const authPage = new AuthPage(page);
    const homePage = new HomePage(page);
    const setupPage = new UserSetupPage(page);
    const onboardingPage = new PersonalSpaceOnboardingPage(page);

    const testUserId = await setupEnergyUser(page, testInfo, authPage, homePage, setupPage, onboardingPage);
    await chakraPage.goto(testUserId);
    await chakraPage.waitForPageLoad();

    // Should show empty state initially
    expect(await chakraPage.isEmptyStateVisible()).toBe(true);

    // Open form
    await chakraPage.clickNewCheckin();
    await chakraPage.waitForFormDialog();

    // Set some chakra statuses
    await chakraPage.setChakraStatus('root', 'balanced');
    await chakraPage.setChakraStatus('heart', 'overactive');
    await chakraPage.setChakraStatus('crown', 'underactive');
    await chakraPage.setOverallNotes('Feeling grounded but heart needs attention');
    await chakraPage.submitForm();
    await chakraPage.waitForFormToClose();

    // Check-in should appear
    expect(await chakraPage.hasTodaysCheckin()).toBe(true);
  });

  test('Session Reflections: create reflection and verify', async ({ page }, testInfo) => {
    const sessionsPage = new SessionReflectionsPage(page);
    const authPage = new AuthPage(page);
    const homePage = new HomePage(page);
    const setupPage = new UserSetupPage(page);
    const onboardingPage = new PersonalSpaceOnboardingPage(page);

    const testUserId = await setupEnergyUser(page, testInfo, authPage, homePage, setupPage, onboardingPage);
    await sessionsPage.goto(testUserId);
    await sessionsPage.waitForPageLoad();

    // Should show empty state initially
    expect(await sessionsPage.isEmptyStateVisible()).toBe(true);

    // Open form
    await sessionsPage.clickNewReflection();
    await sessionsPage.waitForFormDialog();

    // Create reflection
    await sessionsPage.setDuringSession('Felt warmth and tingling in hands during the session');
    await sessionsPage.setNotes('Great session, client reported feeling lighter');
    await sessionsPage.submitForm();
    await sessionsPage.waitForFormToClose();

    // Reflection should appear
    expect(await sessionsPage.getReflectionCount()).toBe(1);
  });
});

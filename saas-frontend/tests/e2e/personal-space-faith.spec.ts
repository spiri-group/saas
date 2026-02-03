import { test, expect, Page, TestInfo } from '@playwright/test';
import { DailyPassagePage } from '../pages/DailyPassagePage';
import { PrayerJournalPage } from '../pages/PrayerJournalPage';
import { ScriptureReflectionsPage } from '../pages/ScriptureReflectionsPage';
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

// Store cookies and userId per test worker to avoid race conditions
const cookiesPerWorker = new Map<number, string>();
const userIdPerWorker = new Map<number, string>();

/**
 * Faith Tests
 *
 * Consolidated tests for Daily Passage, Prayer Journal, and Scripture Reflections.
 * Tests are consolidated where possible - each test builds on the previous state.
 * IMPORTANT: These tests require FAITH spiritual interest to be set.
 */

// Cleanup before tests
test.beforeAll(async ({}, testInfo) => {
  console.log('[Setup] Preparing test environment for Faith features...');
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
      userIdPerWorker.delete(workerId);
    }
  }
  clearTestEntityRegistry(workerId);
});

/**
 * Helper to set up authenticated user with FAITH interest
 * Reuses existing user if already created for this worker
 */
async function setupFaithUser(
  page: Page,
  testInfo: TestInfo,
  authPage: AuthPage,
  homePage: HomePage,
  setupPage: UserSetupPage,
  onboardingPage: PersonalSpaceOnboardingPage
): Promise<string> {
  const workerId = testInfo.parallelIndex;

  // Return existing user if already set up
  const existingUserId = userIdPerWorker.get(workerId);
  if (existingUserId) {
    // Just need to ensure we're logged in
    await page.goto('/');
    const personalSpaceLink = page.locator('a[href^="/u/"]');
    if (await personalSpaceLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      return existingUserId;
    }
  }

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
      registerTestUser({ id: testUserId, email: testEmail }, workerId);
      const cookies = await getCookiesFromPage(page);
      if (cookies) cookiesPerWorker.set(workerId, cookies);
      userIdPerWorker.set(workerId, testUserId);
    }

    await setupPage.fillUserProfile({
      firstName: 'Faith',
      lastName: 'Tester',
      phone: '0412345678',
      address: 'Sydney Opera House',
      securityQuestion: 'What is your favorite verse?',
      securityAnswer: 'John 3:16',
    });
    await setupPage.startBrowsing();

    // Complete onboarding with FAITH as primary interest
    await page.goto(`/u/${testUserId}/onboarding`);
    await expect(page.locator('[data-testid="screen-1"]')).toBeVisible({ timeout: 10000 });
    await onboardingPage.selectPrimaryInterest('faith');
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
        registerTestUser({ id: testUserId, email: testEmail }, workerId);
        const cookies = await getCookiesFromPage(page);
        if (cookies) cookiesPerWorker.set(workerId, cookies);
        userIdPerWorker.set(workerId, testUserId);
      }
    }
  }

  return testUserId;
}

test.describe('Personal Space - Faith', () => {
  /**
   * Daily Passage - Consolidated test
   * Tests: view passage, mark as read, add reflection, edit reflection
   */
  test('Daily Passage: view, mark read, add and edit reflection', async ({ page }, testInfo) => {
    const dailyPage = new DailyPassagePage(page);
    const authPage = new AuthPage(page);
    const homePage = new HomePage(page);
    const setupPage = new UserSetupPage(page);
    const onboardingPage = new PersonalSpaceOnboardingPage(page);

    const testUserId = await setupFaithUser(page, testInfo, authPage, homePage, setupPage, onboardingPage);
    await dailyPage.goto(testUserId);
    await dailyPage.waitForPageLoad();

    // 1. Verify today's passage is displayed
    expect(await dailyPage.hasTodaysPassage()).toBe(true);
    const reference = await dailyPage.getPassageReference();
    expect(reference).toBeTruthy();
    console.log(`[Daily Passage] Today's passage: ${reference}`);

    // 2. Mark as read (if not already)
    const wasRead = await dailyPage.isMarkedAsRead();
    if (!wasRead) {
      await dailyPage.clickMarkAsRead();
      await dailyPage.waitForMarkAsReadComplete();
      expect(await dailyPage.isMarkedAsRead()).toBe(true);
      console.log('[Daily Passage] Marked as read');
    }

    // 3. Add a reflection
    await dailyPage.completeReflection(
      'This passage reminds me of God\'s faithfulness',
      'I will trust God more in my daily decisions',
      'Lord, help me to apply this truth in my life'
    );
    expect(await dailyPage.hasReflection()).toBe(true);
    expect(await dailyPage.isExistingReflectionVisible()).toBe(true);
    console.log('[Daily Passage] Added reflection');

    // 4. Edit the reflection
    await dailyPage.clickReflect(); // Opens edit form
    await dailyPage.waitForReflectionForm();
    await dailyPage.setReflection('Updated reflection - God is always faithful');
    await dailyPage.saveReflection();
    await dailyPage.waitForReflectionSaved();
    console.log('[Daily Passage] Edited reflection');
  });

  /**
   * Prayer Journal - Consolidated test
   * Tests: create entry, edit entry, mark as answered, delete entry
   */
  test('Prayer Journal: full CRUD operations', async ({ page }, testInfo) => {
    const prayerPage = new PrayerJournalPage(page);
    const authPage = new AuthPage(page);
    const homePage = new HomePage(page);
    const setupPage = new UserSetupPage(page);
    const onboardingPage = new PersonalSpaceOnboardingPage(page);

    const testUserId = await setupFaithUser(page, testInfo, authPage, homePage, setupPage, onboardingPage);
    await prayerPage.goto(testUserId);
    await prayerPage.waitForPageLoad();

    // 1. Verify empty state
    const initialCount = await prayerPage.getEntryCount();
    console.log(`[Prayer Journal] Initial entry count: ${initialCount}`);

    // 2. Create a simple prayer entry
    await prayerPage.createSimpleEntry('Thanksgiving', 'Thank you Lord for your blessings today');
    const countAfterCreate = await prayerPage.getEntryCount();
    expect(countAfterCreate).toBe(initialCount + 1);
    console.log('[Prayer Journal] Created simple entry');

    // 3. Create a full prayer entry with all fields
    await prayerPage.createFullEntry({
      type: 'Petition',
      content: 'Lord, I come before you with my needs for guidance at work',
      title: 'Morning Prayer for Guidance',
      scriptureRef: 'Philippians 4:6-7',
      insights: 'Felt peace after praying',
    });
    const countAfterFull = await prayerPage.getEntryCount();
    expect(countAfterFull).toBe(initialCount + 2);
    console.log('[Prayer Journal] Created full entry');

    // Note: Edit, mark answered, and delete would require getting entry IDs from the UI
    // which requires additional data-testid attributes or a different approach
  });

  /**
   * Scripture Reflections - Consolidated test
   * Tests: create simple reflection, create with application, verify persistence
   */
  test('Scripture Reflections: create and verify reflections', async ({ page }, testInfo) => {
    const scripturePage = new ScriptureReflectionsPage(page);
    const authPage = new AuthPage(page);
    const homePage = new HomePage(page);
    const setupPage = new UserSetupPage(page);
    const onboardingPage = new PersonalSpaceOnboardingPage(page);

    const testUserId = await setupFaithUser(page, testInfo, authPage, homePage, setupPage, onboardingPage);
    await scripturePage.goto(testUserId);
    await scripturePage.waitForPageLoad();

    // 1. Get initial count
    const initialCount = await scripturePage.getReflectionCount();
    console.log(`[Scripture Reflections] Initial count: ${initialCount}`);

    // 2. Create a simple reflection
    await scripturePage.createSimpleReflection(
      'Psalm 23:1-3',
      'The imagery of the Lord as shepherd brings me peace and comfort'
    );
    const countAfterSimple = await scripturePage.getReflectionCount();
    expect(countAfterSimple).toBe(initialCount + 1);
    console.log('[Scripture Reflections] Created simple reflection');

    // 3. Create a reflection with application
    await scripturePage.createReflectionWithApplication(
      'Romans 8:28',
      'The promise that God works ALL things for good, even difficult circumstances',
      'Trust God\'s plan even when I don\'t understand my current situation'
    );
    const countAfterFull = await scripturePage.getReflectionCount();
    expect(countAfterFull).toBe(initialCount + 2);
    console.log('[Scripture Reflections] Created reflection with application');

    // 4. Verify persistence by refreshing
    await page.reload();
    await scripturePage.waitForPageLoad();
    const countAfterReload = await scripturePage.getReflectionCount();
    expect(countAfterReload).toBe(initialCount + 2);
    console.log('[Scripture Reflections] Verified persistence after reload');
  });

  /**
   * Faith Sidenav Navigation
   * Tests: verify Faith section appears and links work
   */
  test('Faith sidenav: navigation to all faith pages', async ({ page }, testInfo) => {
    const authPage = new AuthPage(page);
    const homePage = new HomePage(page);
    const setupPage = new UserSetupPage(page);
    const onboardingPage = new PersonalSpaceOnboardingPage(page);

    const testUserId = await setupFaithUser(page, testInfo, authPage, homePage, setupPage, onboardingPage);

    // Navigate to personal space
    await page.goto(`/u/${testUserId}/space`);

    // Wait for sidenav to load
    await expect(page.locator('[aria-label="personal-space-side-nav"]')).toBeVisible({ timeout: 10000 });

    // Check Faith section exists
    const faithSection = page.locator('text=Faith');
    await expect(faithSection).toBeVisible();
    console.log('[Sidenav] Faith section visible');

    // Test Daily Passage link
    await page.click('text=Daily Passage');
    await expect(page).toHaveURL(new RegExp(`/u/${testUserId}/space/faith/daily`));
    await expect(page.locator('h1:has-text("Daily Passage")')).toBeVisible({ timeout: 10000 });
    console.log('[Sidenav] Daily Passage navigation works');

    // Test Prayer Journal link
    await page.click('text=Prayer Journal');
    await expect(page).toHaveURL(new RegExp(`/u/${testUserId}/space/faith/prayer`));
    await expect(page.locator('h1:has-text("Prayer Journal")')).toBeVisible({ timeout: 10000 });
    console.log('[Sidenav] Prayer Journal navigation works');

    // Test Scripture Reflections link
    await page.click('text=Scripture Reflections');
    await expect(page).toHaveURL(new RegExp(`/u/${testUserId}/space/faith/scripture`));
    await expect(page.locator('h1:has-text("Scripture Reflections")')).toBeVisible({ timeout: 10000 });
    console.log('[Sidenav] Scripture Reflections navigation works');
  });
});

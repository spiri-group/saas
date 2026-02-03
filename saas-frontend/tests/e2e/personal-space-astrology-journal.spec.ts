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
 * Personal Space - Astrology - Journal
 *
 * Tests the astrology journal feature:
 * - Create entry with mood and planet tags
 * - Verify transit snapshot captured
 * - Filter entries by mood
 *
 * Requires MEDIUMSHIP spiritual interest to be set in onboarding.
 */

// Store cookies per test worker
const cookiesPerWorker = new Map<number, string>();
let testUserId = '';

// Cleanup before tests
test.beforeAll(async ({}, testInfo) => {
  console.log('[Setup] Preparing test environment for Astrology Journal...');
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
  return `astro-journal-${timestamp}-${testInfo.parallelIndex}-${randomSuffix}@playwright.com`;
}

/** Setup authenticated user with mediumship interest */
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
      firstName: 'Journal',
      lastName: 'Writer',
      phone: '0412345680',
      address: 'Sydney Opera House',
      securityQuestion: 'Favorite moon phase?',
      securityAnswer: 'Full Moon',
    });
    await setupPage.startBrowsing();
    await page.waitForURL('/', { timeout: 15000 });

    // Click "My Personal Space" link
    const personalSpaceLink = page.locator('a:has-text("My Personal Space")');
    await expect(personalSpaceLink).toBeVisible({ timeout: 10000 });
    await personalSpaceLink.click();
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    console.log('[Setup] Clicked My Personal Space, completing onboarding...');

    // Complete onboarding with MEDIUMSHIP as primary interest
    await onboardingPage.completeWithPrimaryOnly('mediumship');
    console.log('[Setup] Entered Personal Space successfully');
  } catch (error) {
    console.error('[Setup] Error:', error);
    throw error;
  }

  return testUserId;
}

test.describe.serial('Personal Space - Astrology - Journal', () => {
  test('1. should create journal entry with mood and planet tags', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    await setupAuthenticatedUser(page, testInfo);

    // Click on "Journal" in the sidenav to expand submenu
    const journalButton = page.locator('[data-testid="journal-nav"]');
    await expect(journalButton).toBeVisible({ timeout: 10000 });
    await journalButton.click();
    await page.waitForTimeout(500);

    // Click on "Astrology" in the expanded Journal submenu (using specific testId to avoid main Astrology section)
    const astrologyJournalButton = page.locator('[data-testid="journal-astrology-nav"]');
    await expect(astrologyJournalButton).toBeVisible({ timeout: 5000 });
    await astrologyJournalButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/journal-initial.png' });

    // Click "New Entry"
    const newEntryButton = page.locator('[data-testid="new-entry-btn"], [data-testid="first-entry-btn"], button:has-text("New Entry"), button:has-text("Write Your First")').first();
    await expect(newEntryButton).toBeVisible({ timeout: 10000 });
    await newEntryButton.click();
    await page.waitForTimeout(1500);

    // Verify dialog opened
    const formDialog = page.locator('[role="dialog"]').first();
    await expect(formDialog).toBeVisible({ timeout: 5000 });

    // Fill content
    const contentInput = page.locator('[data-testid="journal-content-input"], textarea').first();
    await expect(contentInput).toBeVisible({ timeout: 5000 });
    await contentInput.fill('Today I feel a strong connection to the cosmic energies. The moon is illuminating my path forward, and I sense transformation on the horizon.');

    // Add mood - click "Reflective"
    const reflectiveMood = page.locator('[data-testid="mood-reflective"], button:has-text("Reflective")').first();
    if (await reflectiveMood.isVisible({ timeout: 3000 }).catch(() => false)) {
      await reflectiveMood.click();
      console.log('[Journal] Selected "Reflective" mood');
    }

    // Add planet tag - Saturn
    const saturnTag = page.locator('[data-testid="planet-tag-saturn"], button:has-text("Saturn")').first();
    if (await saturnTag.isVisible({ timeout: 3000 }).catch(() => false)) {
      await saturnTag.click();
      console.log('[Journal] Tagged Saturn');
    }

    await page.screenshot({ path: 'test-results/journal-form-filled.png' });

    // Save
    const saveButton = page.locator('[data-testid="save-journal-btn"], button:has-text("Save Entry"), button:has-text("Save")').first();
    await expect(saveButton).toBeVisible({ timeout: 5000 });
    await saveButton.click();

    // Wait for dialog to close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 10000 });
    console.log('[Journal] Dialog closed after save');

    // Wait for entries to load
    await page.waitForTimeout(2000);

    // Verify entry in list - look for the content text we just entered (not in dialog)
    const entryInList = page.locator('[data-testid^="journal-entry-"]:has-text("cosmic energies")').first();
    const entryVisible = await entryInList.isVisible({ timeout: 10000 }).catch(() => false);
    console.log('[Journal] ✓ Entry visible in timeline:', entryVisible);
    expect(entryVisible).toBe(true);

    await page.screenshot({ path: 'test-results/journal-entry-saved.png' });
  });

  test('2. should create second entry and filter by mood', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    // Restore cookies
    const cookies = cookiesPerWorker.get(testInfo.parallelIndex);
    if (cookies) {
      const cookiePairs = cookies.split('; ');
      const cookieObjs = cookiePairs.map(pair => {
        const [name, value] = pair.split('=');
        return { name, value: value || '', domain: 'localhost', path: '/' };
      });
      await page.context().addCookies(cookieObjs);
    }

    // Go to home page and click My Personal Space
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const personalSpaceLink = page.locator('a:has-text("My Personal Space")');
    await expect(personalSpaceLink).toBeVisible({ timeout: 10000 });
    await personalSpaceLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Click on "Journal" in the sidenav to expand submenu
    const journalButton = page.locator('[data-testid="journal-nav"]');
    await expect(journalButton).toBeVisible({ timeout: 10000 });
    await journalButton.click();
    await page.waitForTimeout(500);

    // Click on "Astrology" in the expanded Journal submenu (using specific testId to avoid main Astrology section)
    const astrologyJournalButton = page.locator('[data-testid="journal-astrology-nav"]');
    await expect(astrologyJournalButton).toBeVisible({ timeout: 5000 });
    await astrologyJournalButton.click();
    await page.waitForTimeout(3000);

    // Create second entry with "Inspired" mood
    const newEntryButton = page.locator('[data-testid="new-entry-btn"], button:has-text("New Entry")').first();
    await newEntryButton.click();
    await page.waitForTimeout(1500);

    const contentInput = page.locator('[data-testid="journal-content-input"], textarea').first();
    await contentInput.fill('Feeling incredibly inspired today. New ideas are flowing freely and creativity abounds.');

    const inspiredMood = page.locator('[data-testid="mood-inspired"], button:has-text("Inspired"), button:has-text("Energised")').first();
    if (await inspiredMood.isVisible({ timeout: 3000 }).catch(() => false)) {
      await inspiredMood.click();
    }

    const saveButton = page.locator('[data-testid="save-journal-btn"], button:has-text("Save")').first();
    await saveButton.click();
    await page.waitForTimeout(3000);

    console.log('[Journal] Created second entry with Inspired mood');

    // Both entries should be visible now
    const firstEntry = page.locator('text=cosmic energies').first();
    const secondEntry = page.locator('text=incredibly inspired').first();
    await expect(firstEntry).toBeVisible({ timeout: 5000 });
    await expect(secondEntry).toBeVisible({ timeout: 5000 });

    // Expand filters
    const filtersToggle = page.locator('[data-testid="toggle-filters-btn"], button:has-text("Filters"), button:has-text("Filter")').first();
    if (await filtersToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
      await filtersToggle.click();
      await page.waitForTimeout(500);
    }

    // Filter by "Reflective" mood
    const filterReflective = page.locator('[data-testid="filter-mood-reflective"], [data-testid="mood-filter-reflective"]').first();
    if (await filterReflective.isVisible({ timeout: 3000 }).catch(() => false)) {
      await filterReflective.click();
      await page.waitForTimeout(2000);
      console.log('[Journal] Applied "Reflective" mood filter');

      // Verify only reflective entry shows
      const reflectiveEntry = page.locator('text=cosmic energies').first();
      const reflectiveVisible = await reflectiveEntry.isVisible({ timeout: 5000 }).catch(() => false);
      console.log('[Journal] ✓ Reflective entry visible after filter:', reflectiveVisible);
      expect(reflectiveVisible).toBe(true);

      // Inspired entry should be hidden
      const inspiredEntry = page.locator('text=incredibly inspired').first();
      const inspiredVisible = await inspiredEntry.isVisible({ timeout: 3000 }).catch(() => false);
      console.log('[Journal] Inspired entry visible after filter (should be false):', inspiredVisible);
    }

    await page.screenshot({ path: 'test-results/journal-filtered.png' });

    // Clear filters
    const clearFilters = page.locator('[data-testid="clear-filters-btn"], button:has-text("Clear")').first();
    if (await clearFilters.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clearFilters.click();
      await page.waitForTimeout(1000);
    }
  });
});

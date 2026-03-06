import { test, expect } from '@playwright/test';
import { PractitionerSetupPage } from '../pages/PractitionerSetupPage';
import {
  clearTestEntityRegistry,
  getCookiesFromPage,
  cleanupTestUsers,
  cleanupTestPractitioners,
} from '../utils/test-cleanup';

/**
 * Directory Tier — Full onboarding and feature gating
 *
 * 1. Signs up a Directory-tier practitioner through the unified onboarding flow
 * 2. Verifies the practitioner profile page loads after signup
 * 3. Verifies Directory features are accessible (SpiriAssist, Gallery)
 * 4. Verifies Awaken+ features are gated (Payment Links, Expo Mode, Live Assist)
 * 5. Verifies upgrade path is available
 */

const practitionerCookiesPerWorker = new Map<number, string>();
const practitionerSlugPerWorker = new Map<number, string>();

test.beforeAll(async ({}, testInfo) => {
  clearTestEntityRegistry(testInfo.parallelIndex);
});

test.afterAll(async ({}, testInfo) => {
  test.setTimeout(120000);
  const workerId = testInfo.parallelIndex;

  const practitionerCookies = practitionerCookiesPerWorker.get(workerId);
  if (practitionerCookies) {
    try {
      await cleanupTestPractitioners(practitionerCookies, workerId);
    } catch (error) {
      console.error('[Cleanup] Error cleaning up practitioners:', error);
    } finally {
      practitionerCookiesPerWorker.delete(workerId);
    }
  }

  try {
    await cleanupTestUsers(undefined, workerId);
  } catch (error) {
    console.error('[Cleanup] Error cleaning up users:', error);
  }

  clearTestEntityRegistry(workerId);
});

function generateUniqueEmail(prefix: string, testInfo: { parallelIndex: number }): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${testInfo.parallelIndex}-${randomSuffix}@playwright.com`;
}

test.describe('Directory Tier', () => {
  test('practitioner signup with Directory tier and feature gating', async ({ page }, testInfo) => {
    test.setTimeout(180000); // 3 minutes

    // ── Sign up a Directory-tier practitioner ──
    const practitionerEmail = generateUniqueEmail('dir-signup', testInfo);
    const setupPage = new PractitionerSetupPage(page);
    const slug = await setupPage.createPractitioner(practitionerEmail, 'Directory Test', testInfo, 'directory');

    const cookies = await getCookiesFromPage(page);
    if (cookies) practitionerCookiesPerWorker.set(testInfo.parallelIndex, cookies);
    practitionerSlugPerWorker.set(testInfo.parallelIndex, slug);

    console.log(`[Directory] Practitioner created: ${slug}`);

    // ── Verify profile page loaded ──
    await expect(page).toHaveURL(new RegExp(`/p/${slug}`));
    console.log('[Directory] Profile page loaded');

    // ── Verify SpiriAssist is accessible (Directory feature) ──
    await page.goto(`/p/${slug}/manage/spiri-assist`);
    // Should NOT show the locked preview since Directory has SpiriAssist
    await expect(page.locator('[data-testid="spiri-assist-locked-preview"]')).not.toBeVisible({ timeout: 15000 });
    console.log('[Directory] SpiriAssist: accessible (not locked)');

    // ── Verify Payment Links is gated (Illuminate feature) ──
    await page.goto(`/p/${slug}/manage/payment-links`);
    await expect(page.locator('[data-testid="payment-links-upgrade"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="payment-links-view"]')).not.toBeVisible();
    console.log('[Directory] Payment Links: upgrade prompt visible (correctly gated)');

    // ── Verify Expo Mode is gated (Illuminate feature) ──
    await page.goto(`/p/${slug}/manage/expo-mode`);
    await expect(page.locator('[data-testid="expo-mode-upgrade"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="expo-mode-page"]')).not.toBeVisible();
    console.log('[Directory] Expo Mode: upgrade prompt visible (correctly gated)');

    // ── Verify Live Assist is gated (Illuminate feature) ──
    await page.goto(`/p/${slug}/manage/live-assist`);
    await expect(page.locator('[data-testid="live-assist-upgrade"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="live-assist-page"]')).not.toBeVisible();
    console.log('[Directory] Live Assist: upgrade prompt visible (correctly gated)');

    // ── Verify upgrade button is available on subscription page ──
    await page.goto(`/p/${slug}/manage/subscription`);
    await expect(page.locator('[data-testid="subscription-management"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="upgrade-plan-btn"]')).toBeVisible({ timeout: 5000 });
    console.log('[Directory] Upgrade button visible on subscription page');

    // ── Verify upgrade modal shows higher tiers ──
    await page.locator('[data-testid="upgrade-plan-btn"]').click();
    await expect(page.locator('[data-testid="upgrade-modal"]')).toBeVisible({ timeout: 5000 });

    // Should show Awaken, Illuminate, Manifest, Transcend as upgrade options
    await expect(page.locator('[data-testid="upgrade-tier-awaken"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="upgrade-tier-illuminate"]')).toBeVisible();
    await expect(page.locator('[data-testid="upgrade-tier-manifest"]')).toBeVisible();
    await expect(page.locator('[data-testid="upgrade-tier-transcend"]')).toBeVisible();

    // Should NOT show Directory as an upgrade option (already on it)
    await expect(page.locator('[data-testid="upgrade-tier-directory"]')).not.toBeVisible();
    console.log('[Directory] Upgrade modal shows 4 higher tiers');

    // Close modal
    await page.locator('[data-testid="upgrade-modal-close"]').click();

    console.log('[Directory] All feature gating tests passed');
  });
});

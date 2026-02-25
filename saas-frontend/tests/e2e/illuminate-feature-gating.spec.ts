import { test, expect } from '@playwright/test';
import { PractitionerSetupPage } from '../pages/PractitionerSetupPage';
import {
  clearTestEntityRegistry,
  getCookiesFromPage,
  cleanupTestUsers,
  cleanupTestPractitioners,
} from '../utils/test-cleanup';
import { generateTestEmail } from '../utils/test-helpers';

/**
 * Illuminate Feature Gating — Awaken practitioner blocked from all 4 features
 *
 * Signs up an Awaken-tier practitioner and verifies that all four
 * Illuminate-only features show upgrade UI instead of the actual page.
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

test.describe('Illuminate Feature Gating', () => {
  test('Awaken practitioner is blocked from all 4 Illuminate features', async ({ page }, testInfo) => {
    test.setTimeout(180000); // 3 minutes

    // ── Sign up an Awaken-tier practitioner ──
    const practitionerEmail = generateUniqueEmail('gate-awaken', testInfo);
    const setupPage = new PractitionerSetupPage(page);
    const slug = await setupPage.createPractitioner(practitionerEmail, 'Gate Test', testInfo, 'awaken');

    const cookies = await getCookiesFromPage(page);
    if (cookies) practitionerCookiesPerWorker.set(testInfo.parallelIndex, cookies);
    practitionerSlugPerWorker.set(testInfo.parallelIndex, slug);

    console.log(`[Gating] Awaken practitioner created: ${slug}`);

    // ── 1. Payment Links → upgrade UI visible ──
    await page.goto(`/p/${slug}/manage/payment-links`);
    await expect(page.locator('[data-testid="payment-links-upgrade"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="payment-links-view"]')).not.toBeVisible();
    console.log('[Gating] Payment Links: upgrade prompt visible');

    // Verify upgrade button links to subscription page
    const paymentLinksUpgradeBtn = page.locator('[data-testid="payment-links-upgrade-btn"]');
    await expect(paymentLinksUpgradeBtn).toBeVisible();
    const paymentLinksHref = await paymentLinksUpgradeBtn.getAttribute('href');
    expect(paymentLinksHref).toContain(`/p/${slug}/manage/subscription`);

    // ── 2. Expo Mode → upgrade UI visible ──
    await page.goto(`/p/${slug}/manage/expo-mode`);
    await expect(page.locator('[data-testid="expo-mode-upgrade"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="expo-mode-page"]')).not.toBeVisible();
    console.log('[Gating] Expo Mode: upgrade prompt visible');

    const expoUpgradeBtn = page.locator('[data-testid="upgrade-btn"]');
    await expect(expoUpgradeBtn).toBeVisible();

    // ── 3. Live Assist → upgrade UI visible ──
    await page.goto(`/p/${slug}/manage/live-assist`);
    await expect(page.locator('[data-testid="live-assist-upgrade"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="live-assist-page"]')).not.toBeVisible();
    console.log('[Gating] Live Assist: upgrade prompt visible');

    const liveAssistUpgradeBtn = page.locator('[data-testid="upgrade-btn"]');
    await expect(liveAssistUpgradeBtn).toBeVisible();

    // ── 4. SpiriAssist → locked preview visible ──
    await page.goto(`/p/${slug}/manage/spiri-assist`);
    await expect(page.locator('[data-testid="spiri-assist-locked-preview"]')).toBeVisible({ timeout: 15000 });
    console.log('[Gating] SpiriAssist: locked preview visible');

    const spiriAssistUpgradeBtn = page.locator('[data-testid="spiri-assist-upgrade-btn"]');
    await expect(spiriAssistUpgradeBtn).toBeVisible();

    console.log('[Gating] All 4 Illuminate features are properly gated for Awaken tier');
  });
});

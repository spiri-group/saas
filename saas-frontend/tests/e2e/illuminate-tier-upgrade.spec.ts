import { test, expect } from '@playwright/test';
import { PractitionerSetupPage } from '../pages/PractitionerSetupPage';
import {
  clearTestEntityRegistry,
  getCookiesFromPage,
  getVendorIdFromSlug,
  cleanupTestUsers,
  cleanupTestPractitioners,
  completeStripeTestOnboarding,
} from '../utils/test-cleanup';

/**
 * Illuminate Tier Upgrade E2E
 *
 * Signs up an Awaken practitioner, completes Stripe onboarding, verifies
 * all 4 features are blocked, upgrades to Illuminate via UI, then verifies
 * all 4 features unlock.
 *
 * Run: yarn test:grep "Tier Upgrade"
 */

const practitionerCookiesPerWorker = new Map<number, string>();
const practitionerSlugPerWorker = new Map<number, string>();
const vendorIdPerWorker = new Map<number, string>();

function generateUniqueEmail(prefix: string, testInfo: { parallelIndex: number }): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${testInfo.parallelIndex}-${randomSuffix}@playwright.com`;
}

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
  practitionerSlugPerWorker.delete(workerId);
  vendorIdPerWorker.delete(workerId);
});

test.describe('Illuminate Tier Upgrade', () => {
  test('Practitioner signup, Stripe onboarding, and UI upgrade to Illuminate', async ({ browser }, testInfo) => {
    test.setTimeout(240000); // 4 minutes

    const practitionerContext = await browser.newContext();
    const practitionerPage = await practitionerContext.newPage();

    try {
      // ── Create awaken practitioner ──
      const practitionerEmail = generateUniqueEmail('illum-upgrade', testInfo);
      const setupPage = new PractitionerSetupPage(practitionerPage);
      const slug = await setupPage.createPractitioner(practitionerEmail, 'Illuminate Tester', testInfo, 'awaken');

      const cookies = await getCookiesFromPage(practitionerPage);
      if (cookies) practitionerCookiesPerWorker.set(testInfo.parallelIndex, cookies);
      practitionerSlugPerWorker.set(testInfo.parallelIndex, slug);

      console.log(`[Tier Upgrade] Awaken practitioner created: ${slug}`);

      // Get vendor ID and complete Stripe onboarding
      const vendorId = await getVendorIdFromSlug(slug, cookies!);
      expect(vendorId).not.toBeNull();
      vendorIdPerWorker.set(testInfo.parallelIndex, vendorId!);

      const onboardingResult = await completeStripeTestOnboarding(vendorId!, cookies!);
      expect(onboardingResult.success).toBe(true);
      console.log('[Tier Upgrade] Stripe onboarding complete');

      // ── Awaken tier: all 4 features should be BLOCKED ──
      await practitionerPage.goto(`/p/${slug}/manage/payment-links`);
      await expect(practitionerPage.locator('[data-testid="payment-links-upgrade"]')).toBeVisible({ timeout: 15000 });
      await expect(practitionerPage.locator('[data-testid="payment-links-view"]')).not.toBeVisible();
      console.log('[Tier Upgrade] Awaken → Payment Links: blocked');

      await practitionerPage.goto(`/p/${slug}/manage/expo-mode`);
      await expect(practitionerPage.locator('[data-testid="expo-mode-upgrade"]')).toBeVisible({ timeout: 15000 });
      await expect(practitionerPage.locator('[data-testid="expo-mode-page"]')).not.toBeVisible();
      console.log('[Tier Upgrade] Awaken → Expo Mode: blocked');

      await practitionerPage.goto(`/p/${slug}/manage/live-assist`);
      await expect(practitionerPage.locator('[data-testid="live-assist-upgrade"]')).toBeVisible({ timeout: 15000 });
      await expect(practitionerPage.locator('[data-testid="live-assist-page"]')).not.toBeVisible();
      console.log('[Tier Upgrade] Awaken → Live Assist: blocked');

      await practitionerPage.goto(`/p/${slug}/manage/spiri-assist`);
      await expect(practitionerPage.locator('[data-testid="spiri-assist-locked-preview"]')).toBeVisible({ timeout: 15000 });
      console.log('[Tier Upgrade] Awaken → SpiriAssist: blocked');

      // ── Upgrade to Illuminate via Subscription Management UI ──
      await practitionerPage.goto(`/p/${slug}/manage/subscription`);
      await expect(practitionerPage.locator('[data-testid="subscription-management"]')).toBeVisible({ timeout: 15000 });
      console.log('[Tier Upgrade] Subscription management page loaded');

      await practitionerPage.locator('[data-testid="upgrade-plan-btn"]').click();
      await expect(practitionerPage.locator('[data-testid="upgrade-modal"]')).toBeVisible({ timeout: 10000 });

      const modal = practitionerPage.locator('[data-testid="upgrade-modal"]');
      const upgradeBtn = modal.locator('[data-testid="upgrade-btn-illuminate"]');
      await upgradeBtn.scrollIntoViewIfNeeded();
      await upgradeBtn.click();

      await expect(practitionerPage.locator('[data-sonner-toast][data-type="success"]').first()).toBeVisible({ timeout: 15000 });
      await expect(practitionerPage.locator('[data-testid="upgrade-modal"]')).not.toBeVisible({ timeout: 5000 });
      console.log('[Tier Upgrade] Upgrade to Illuminate succeeded');

      // ── Illuminate tier: all 4 features should be UNLOCKED ──
      await practitionerPage.goto(`/p/${slug}/manage`);
      await practitionerPage.waitForLoadState('networkidle');

      // Dismiss cookie banner if present
      const cookieBanner = practitionerPage.locator('[data-testid="cookie-banner"]');
      if (await cookieBanner.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cookieBanner.locator('button:has-text("Accept")').click();
        await expect(cookieBanner).not.toBeVisible({ timeout: 3000 });
      }

      // Verify sidenav has nav items for all 4 Illuminate features
      await expect(practitionerPage.locator('[data-testid="nav-payment-links"]')).toBeVisible({ timeout: 15000 });
      await expect(practitionerPage.locator('[data-testid="nav-expo-mode"]')).toBeVisible();
      await expect(practitionerPage.locator('[data-testid="nav-live-assist"]')).toBeVisible();
      await expect(practitionerPage.locator('[data-testid="nav-spiri-assist"]')).toBeVisible();
      console.log('[Tier Upgrade] Illuminate → All 4 nav items visible in sidenav');

      // Navigate to each feature and verify actual page loads
      const features = [
        { nav: 'nav-payment-links', url: 'payment-links', visible: 'payment-links-view', name: 'Payment Links' },
        { nav: 'nav-expo-mode', url: 'expo-mode', visible: 'expo-mode-page', name: 'Expo Mode' },
        { nav: 'nav-live-assist', url: 'live-assist', visible: 'live-assist-page', name: 'Live Assist' },
      ];

      for (const feature of features) {
        await practitionerPage.locator(`[data-testid="${feature.nav}"]`).click();
        await expect(practitionerPage).toHaveURL(new RegExp(`/p/${slug}/manage/${feature.url}`), { timeout: 15000 });
        await expect(practitionerPage.locator(`[data-testid="${feature.visible}"]`)).toBeVisible({ timeout: 15000 });
        console.log(`[Tier Upgrade] Illuminate → ${feature.name}: accessible`);
        await practitionerPage.goBack();
        await expect(practitionerPage.locator('[data-testid="nav-payment-links"]')).toBeVisible({ timeout: 10000 });
      }

      // SpiriAssist
      const spiriAssistNav = practitionerPage.locator('[data-testid="nav-spiri-assist"]');
      await spiriAssistNav.scrollIntoViewIfNeeded();
      await spiriAssistNav.click();
      await expect(practitionerPage).toHaveURL(new RegExp(`/p/${slug}/manage/spiri-assist`), { timeout: 15000 });
      await expect(practitionerPage.locator('[data-testid="spiri-assist-locked-preview"]')).not.toBeVisible({ timeout: 5000 });
      console.log('[Tier Upgrade] Illuminate → SpiriAssist: accessible');

      console.log('[Tier Upgrade] All tier gating and upgrade verified');
    } finally {
      await practitionerContext.close();
    }
  });
});

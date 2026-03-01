import { Page, expect, Browser, BrowserContext } from '@playwright/test';
import { PractitionerSetupPage } from '../pages/PractitionerSetupPage';
import {
  clearTestEntityRegistry,
  getCookiesFromPage,
  getVendorIdFromSlug,
  cleanupTestUsers,
  cleanupTestPractitioners,
  completeStripeTestOnboarding,
} from './test-cleanup';

/**
 * Shared Illuminate practitioner setup for independent feature tests.
 *
 * Each spec calls `setupIlluminatePractitioner` in beforeAll to create a
 * fully-onboarded Illuminate practitioner with Stripe charges enabled.
 */

// ─── Per-worker state maps ──────────────────────────────────
// Each spec file gets its own module scope, so these maps are independent per spec.
export const practitionerCookiesPerWorker = new Map<number, string>();
export const practitionerSlugPerWorker = new Map<number, string>();
export const vendorIdPerWorker = new Map<number, string>();

// ─── Unique email generator ─────────────────────────────────
export function generateUniqueEmail(prefix: string, testInfo: { parallelIndex: number }): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${testInfo.parallelIndex}-${randomSuffix}@playwright.com`;
}

// ─── Fill Stripe PaymentElement iframes ─────────────────────
/**
 * Fill Stripe PaymentElement iframes with test card details.
 * Retries scanning iframes since Stripe can render them incrementally.
 */
export async function fillStripePaymentElement(page: Page): Promise<void> {
  await page.waitForTimeout(2000);

  const stripeFrames = page.locator('iframe[name^="__privateStripeFrame"]');
  await expect(stripeFrames.first()).toBeVisible({ timeout: 15000 });

  let filledNumber = false;
  let filledExpiry = false;
  let filledCvc = false;

  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt > 0) {
      await page.waitForTimeout(2000);
    }

    const frameCount = await stripeFrames.count();
    if (attempt === 0) console.log(`[FillStripe] Found ${frameCount} Stripe iframes`);

    for (let i = 0; i < frameCount; i++) {
      const frame = page.frameLocator('iframe[name^="__privateStripeFrame"]').nth(i);

      if (!filledNumber) {
        const numberInput = frame.locator('input[name="number"]');
        if (await numberInput.isVisible({ timeout: 500 }).catch(() => false)) {
          await numberInput.fill('4242424242424242');
          filledNumber = true;
          console.log(`[FillStripe] Filled card number in iframe ${i}`);
        }
      }

      if (!filledExpiry) {
        const expiryInput = frame.locator('input[name="expiry"]');
        if (await expiryInput.isVisible({ timeout: 500 }).catch(() => false)) {
          await expiryInput.fill('12/34');
          filledExpiry = true;
          console.log(`[FillStripe] Filled expiry in iframe ${i}`);
        }
      }

      if (!filledCvc) {
        const cvcInput = frame.locator('input[name="cvc"]');
        if (await cvcInput.isVisible({ timeout: 500 }).catch(() => false)) {
          await cvcInput.fill('123');
          filledCvc = true;
          console.log(`[FillStripe] Filled CVC in iframe ${i}`);
        }
      }
    }

    if (filledNumber && filledExpiry && filledCvc) break;

    if (attempt < 4) {
      const newCount = await stripeFrames.count();
      console.log(`[FillStripe] Retry ${attempt + 1} — ${newCount} iframes, filled: number=${filledNumber}, expiry=${filledExpiry}, cvc=${filledCvc}`);
    }
  }

  if (!filledNumber || !filledExpiry || !filledCvc) {
    throw new Error(`Stripe fill incomplete — Number: ${filledNumber}, Expiry: ${filledExpiry}, CVC: ${filledCvc}`);
  }

  await page.waitForTimeout(500);
}

// ─── Restore cookies into a new browser context ─────────────
export function parseCookiePairs(cookies: string) {
  return cookies.split('; ').map(c => {
    const [name, ...rest] = c.split('=');
    return { name, value: rest.join('='), domain: 'localhost', path: '/' };
  });
}

export async function createAuthenticatedContext(browser: Browser, cookies: string): Promise<BrowserContext> {
  const context = await browser.newContext();
  await context.addCookies(parseCookiePairs(cookies));
  return context;
}

// ─── Setup: create Illuminate practitioner ──────────────────
/**
 * Creates an Awaken practitioner, completes Stripe onboarding, and upgrades
 * to Illuminate via the subscription management UI. Stores state in the
 * per-worker maps so tests can retrieve slug/cookies/vendorId.
 *
 * Call this in `test.beforeAll`.
 */
export async function setupIlluminatePractitioner(
  browser: Browser,
  testInfo: { parallelIndex: number },
  emailPrefix: string,
): Promise<{ slug: string; cookies: string; vendorId: string }> {
  const workerId = testInfo.parallelIndex;
  clearTestEntityRegistry(workerId);

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Create Awaken practitioner
    const email = generateUniqueEmail(emailPrefix, testInfo);
    const setupPage = new PractitionerSetupPage(page);
    const slug = await setupPage.createPractitioner(email, 'Illuminate Tester', testInfo, 'awaken');

    const cookies = await getCookiesFromPage(page);
    expect(cookies).toBeDefined();
    practitionerCookiesPerWorker.set(workerId, cookies!);
    practitionerSlugPerWorker.set(workerId, slug);

    console.log(`[Setup] Awaken practitioner created: ${slug}`);

    // 2. Complete Stripe onboarding
    const vendorId = await getVendorIdFromSlug(slug, cookies!);
    expect(vendorId).not.toBeNull();
    vendorIdPerWorker.set(workerId, vendorId!);

    const onboardingResult = await completeStripeTestOnboarding(vendorId!, cookies!);
    expect(onboardingResult.success).toBe(true);
    console.log('[Setup] Stripe onboarding complete');

    // 3. Upgrade to Illuminate via subscription management UI
    await page.goto(`/p/${slug}/manage/subscription`);
    await expect(page.locator('[data-testid="subscription-management"]')).toBeVisible({ timeout: 15000 });

    await page.locator('[data-testid="upgrade-plan-btn"]').click();
    await expect(page.locator('[data-testid="upgrade-modal"]')).toBeVisible({ timeout: 10000 });

    const modal = page.locator('[data-testid="upgrade-modal"]');
    const upgradeBtn = modal.locator('[data-testid="upgrade-btn-illuminate"]');
    await upgradeBtn.scrollIntoViewIfNeeded();
    await upgradeBtn.click();

    await expect(page.locator('[data-sonner-toast][data-type="success"]').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="upgrade-modal"]')).not.toBeVisible({ timeout: 5000 });
    console.log('[Setup] Upgraded to Illuminate');

    return { slug, cookies: cookies!, vendorId: vendorId! };
  } finally {
    await context.close();
  }
}

// ─── Cleanup: tear down practitioner + user ─────────────────
/**
 * Call this in `test.afterAll` to clean up the practitioner and user.
 */
export async function cleanupIlluminatePractitioner(testInfo: { parallelIndex: number }): Promise<void> {
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
}

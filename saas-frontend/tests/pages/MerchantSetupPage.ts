import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { AuthPage } from './AuthPage';
import { UserSetupPage } from './UserSetupPage';
import { registerTestUser, registerTestMerchant, getCookiesFromPage, getVendorIdFromSlug } from '../utils/test-cleanup';
import { handleConsentGuardIfPresent } from '../utils/test-helpers';

/**
 * Merchant Setup Page Object Model
 *
 * Unified onboarding flow (2026):
 *   1. BasicDetailsStep — firstName, lastName, email, country → "Set Up a Business"
 *   2. ChoosePlanStep — select tier (manifest = merchant) → Continue
 *   3. OnboardingConsent — accept documents
 *   4. MerchantProfileStep — name, slug, email, state, merchant types, religion → Continue
 *   5. AlsoPractitionerStep — Yes/No
 *   → Redirect to /m/{slug}
 */
export class MerchantSetupPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // ── Onboarding Consent helper (different testids from site-level ConsentGuard) ──

  private async handleOnboardingConsent() {
    const container = this.page.locator('[data-testid="onboarding-consent"]');
    await expect(container).toBeVisible({ timeout: 15000 });
    console.log('[MerchantSetup] Handling onboarding consent...');

    for (let step = 0; step < 10; step++) {
      const checkbox = this.page.locator('[data-testid^="consent-checkbox-"]').first();
      await expect(checkbox).toBeVisible({ timeout: 5000 });
      await checkbox.click();

      // Final step → Accept & Continue
      const acceptBtn = this.page.locator('[data-testid="onboarding-consent-accept-btn"]');
      if (await acceptBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(acceptBtn).toBeEnabled({ timeout: 3000 });
        await acceptBtn.click();
        await this.page.waitForTimeout(1000);
        console.log('[MerchantSetup] Onboarding consent accepted');
        return;
      }

      // Not final → Next
      const nextBtn = this.page.locator('[data-testid="onboarding-consent-next-btn"]');
      await expect(nextBtn).toBeEnabled({ timeout: 3000 });
      await nextBtn.click();
      await this.page.waitForTimeout(500);
    }
  }

  // ── Merchant Profile Step ──

  async fillMerchantProfile(data: {
    name: string;
    slug: string;
    email: string;
    state?: string;
  }) {
    const nameInput = this.page.locator('[data-testid="setup-merchant-name"]');
    await expect(nameInput).toBeVisible({ timeout: 10000 });

    await nameInput.fill(data.name);

    // Wait for debounced slug auto-generation to fully complete.
    // The hook disables the input while generating (isGenerating=true),
    // so we wait for a value to appear AND the input to be re-enabled.
    const slugInput = this.page.locator('[data-testid="setup-merchant-slug"]');
    await expect(slugInput).toHaveValue(/.+/, { timeout: 15000 });
    await expect(slugInput).toBeEnabled({ timeout: 10000 });

    // Override auto-generated slug with our custom one
    await slugInput.fill(data.slug);

    await this.page.locator('[data-testid="setup-merchant-email"]').fill(data.email);

    if (data.state) {
      await this.page.locator('[data-testid="setup-merchant-state"]').fill(data.state);
    }

    // Select religion (required) — pick the first tree item
    await this.page.locator('[data-testid="religion-picker"]').click();
    await this.page.locator('[data-testid="religion-tree"]').waitFor({ state: 'visible', timeout: 10000 });
    await this.page.locator('[data-testid="religion-tree"] [role="treeitem"]').first().click();
    await this.page.waitForTimeout(500);

    // Select merchant type (required) — pick the first tree item
    await this.page.locator('[data-testid="merchant-type-picker"]').click();
    await this.page.locator('[data-testid="merchant-type-tree"]').waitFor({ state: 'visible', timeout: 10000 });
    await this.page.locator('[data-testid="merchant-type-tree"] [role="treeitem"]').first().click();
    await this.page.waitForTimeout(500);
    await this.page.locator('[aria-label="close-dialog"]').click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Create a complete merchant through the unified onboarding flow.
   * Returns the merchant slug.
   */
  async createMerchant(
    testEmail: string,
    merchantName: string,
    testInfo: { parallelIndex: number }
  ): Promise<string> {
    const timestamp = Date.now();
    const workerId = testInfo.parallelIndex;
    const merchantSlug = `test-merchant-${timestamp}`;

    const authPage = new AuthPage(this.page);
    const userSetupPage = new UserSetupPage(this.page);

    // Clear any existing session
    await this.page.context().clearCookies();

    // ── Step 1: Authenticate ──
    await this.page.goto('/');
    await authPage.startAuthFlow(testEmail);
    await this.page.waitForSelector('[aria-label="input-login-otp"]', { timeout: 15000 });
    await this.page.locator('[aria-label="input-login-otp"]').click();
    await this.page.keyboard.type('123456');
    await this.page.waitForURL('/', { timeout: 15000 });

    // ── Step 2: Handle site-level ConsentGuard ──
    await handleConsentGuardIfPresent(this.page);

    // ── Step 3: Navigate to setup page ──
    await this.page.goto('/setup');
    await userSetupPage.waitForForm();

    // Get user ID from session for cleanup registration
    const userId = await this.page.evaluate(async () => {
      const response = await fetch('/api/auth/session');
      const session = await response.json();
      return session?.user?.id;
    });

    if (userId) {
      const cookies = await getCookiesFromPage(this.page);
      registerTestUser({ id: userId, email: testEmail, cookies }, workerId);
    }

    // ── Step 4: BasicDetailsStep → fill name, click "Set Up a Business" ──
    await userSetupPage.fillUserProfile({
      firstName: 'Test',
      lastName: 'Merchant',
    });
    await userSetupPage.setupBusiness();

    // ── Step 5: ChoosePlanStep → select "manifest" (Merchant) tier ──
    await expect(this.page.locator('[data-testid="choose-plan-step"]')).toBeVisible({ timeout: 10000 });
    const manifestCard = this.page.locator('[data-testid="tier-card-manifest"]');
    await expect(manifestCard).toBeVisible({ timeout: 10000 });
    await manifestCard.click();

    const planContinueBtn = this.page.locator('[data-testid="plan-continue-btn"]');
    await expect(planContinueBtn).toBeEnabled({ timeout: 5000 });
    await planContinueBtn.click();

    // ── Step 6: OnboardingConsent → accept terms ──
    await this.handleOnboardingConsent();

    // ── Step 7: MerchantProfileStep → fill profile ──
    await this.fillMerchantProfile({
      name: merchantName,
      slug: merchantSlug,
      email: testEmail,
      state: 'NSW',
    });

    const submitBtn = this.page.locator('[data-testid="setup-merchant-submit-btn"]');
    await expect(submitBtn).toBeEnabled({ timeout: 5000 });
    await submitBtn.click();

    // ── Step 8: AlsoPractitionerStep → click "No" ──
    const noBtn = this.page.locator('[data-testid="setup-also-practitioner-no"]');
    await expect(noBtn).toBeVisible({ timeout: 10000 });
    await noBtn.click();

    // Wait for redirect to merchant profile page
    await this.page.waitForURL(new RegExp(`/m/${merchantSlug}`), { timeout: 30000 });
    console.log(`[MerchantSetup] ✓ Merchant created: ${merchantSlug}`);

    // Register merchant for cleanup
    const merchantCookies = await getCookiesFromPage(this.page);
    if (merchantCookies) {
      const actualVendorId = await getVendorIdFromSlug(merchantSlug, merchantCookies);
      if (actualVendorId) {
        registerTestMerchant({ id: actualVendorId, slug: merchantSlug, email: testEmail, cookies: merchantCookies }, workerId);
      } else {
        console.error(`[MerchantSetup] WARNING: Could not fetch vendor ID for ${merchantSlug}`);
        registerTestMerchant({ slug: merchantSlug, email: testEmail, cookies: merchantCookies }, workerId);
      }
    }

    return merchantSlug;
  }
}

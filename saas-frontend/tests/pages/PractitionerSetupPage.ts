import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { AuthPage } from './AuthPage';
import { UserSetupPage } from './UserSetupPage';
import { registerTestUser, registerTestPractitioner, getCookiesFromPage, getVendorIdFromSlug } from '../utils/test-cleanup';
import { handleConsentGuardIfPresent } from '../utils/test-helpers';

/**
 * Practitioner Setup Page Object Model
 *
 * Unified onboarding flow (2026):
 *   1. BasicDetailsStep — firstName, lastName, email, country → "Set Up a Business"
 *   2. ChoosePlanStep — select tier (awaken = practitioner) → Continue
 *   3. OnboardingConsent — accept documents
 *   4. PractitionerProfileStep — name, slug, headline, bio, modalities, specializations → Continue
 *   5. PractitionerOptionalStep — pronouns, years, journey, approach → Submit
 *   → Redirect to /p/{slug}
 */
export class PractitionerSetupPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // ── Onboarding Consent helper (different testids from site-level ConsentGuard) ──

  private async handleOnboardingConsent() {
    const container = this.page.locator('[data-testid="onboarding-consent"]');
    await expect(container).toBeVisible({ timeout: 15000 });
    console.log('[PractitionerSetup] Handling onboarding consent...');

    for (let step = 0; step < 10; step++) {
      const checkbox = this.page.locator('[data-testid^="consent-checkbox-"]').first();
      await expect(checkbox).toBeVisible({ timeout: 5000 });
      await checkbox.click();

      // Final step → Accept & Continue
      const acceptBtn = this.page.locator('[data-testid="onboarding-consent-accept-btn"]');
      if (await acceptBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(acceptBtn).toBeEnabled({ timeout: 3000 });
        await acceptBtn.click();
        // Wait for consent to be processed and next step to appear
        await this.page.waitForTimeout(1000);
        console.log('[PractitionerSetup] Onboarding consent accepted');
        return;
      }

      // Not final → Next
      const nextBtn = this.page.locator('[data-testid="onboarding-consent-next-btn"]');
      await expect(nextBtn).toBeEnabled({ timeout: 3000 });
      await nextBtn.click();
      await this.page.waitForTimeout(500);
    }
  }

  // ── Practitioner Profile Step ──

  async fillPractitionerProfile(data: {
    name: string;
    slug: string;
    headline: string;
    bio: string;
    modalities: string[];
    specializations: string[];
  }) {
    const nameInput = this.page.locator('[data-testid="setup-practitioner-name"]');
    await expect(nameInput).toBeVisible({ timeout: 10000 });

    await nameInput.fill(data.name);

    // Wait for debounced slug auto-generation to fully complete.
    // The hook disables the input while generating (isGenerating=true),
    // so we wait for a value to appear AND the input to be re-enabled.
    const slugInput = this.page.locator('[data-testid="setup-practitioner-slug"]');
    await expect(slugInput).toHaveValue(/.+/, { timeout: 15000 });
    await expect(slugInput).toBeEnabled({ timeout: 10000 });

    // Override auto-generated slug with our custom one
    await slugInput.fill(data.slug);

    await this.page.locator('[data-testid="setup-practitioner-headline"]').fill(data.headline);
    await this.page.locator('[data-testid="setup-practitioner-bio"]').fill(data.bio);

    for (const modality of data.modalities) {
      const badge = this.page.locator(`[data-testid="setup-modality-${modality}"]`);
      await badge.waitFor({ state: 'visible', timeout: 5000 });
      await badge.click();
      await this.page.waitForTimeout(100);
    }

    for (const spec of data.specializations) {
      const badge = this.page.locator(`[data-testid="setup-specialization-${spec}"]`);
      await badge.waitFor({ state: 'visible', timeout: 5000 });
      await badge.click();
      await this.page.waitForTimeout(100);
    }
  }

  // ── Practitioner Optional Step ──

  async fillPractitionerOptional(data: {
    pronouns?: string;
    yearsExperience?: number;
    approach?: string;
  }) {
    if (data.pronouns) {
      await this.page.locator('[data-testid="setup-practitioner-pronouns"]').fill(data.pronouns);
    }
    if (data.yearsExperience !== undefined) {
      await this.page.locator('[data-testid="setup-practitioner-years"]').fill(data.yearsExperience.toString());
    }
    if (data.approach) {
      await this.page.locator('[data-testid="setup-practitioner-approach"]').fill(data.approach);
    }
  }

  /**
   * Create a complete practitioner through the unified onboarding flow.
   * Returns the practitioner slug.
   */
  async createPractitioner(
    testEmail: string,
    practitionerName: string,
    testInfo: { parallelIndex: number },
    tier: 'awaken' | 'illuminate' | 'manifest' | 'transcend' = 'awaken'
  ): Promise<string> {
    const timestamp = Date.now();
    const workerId = testInfo.parallelIndex;
    const practitionerSlug = `test-practitioner-${timestamp}`;

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
      lastName: 'Practitioner',
    });
    await userSetupPage.setupBusiness();

    // ── Step 5: ChoosePlanStep → select tier ──
    await expect(this.page.locator('[data-testid="choose-plan-step"]')).toBeVisible({ timeout: 10000 });
    const tierCard = this.page.locator(`[data-testid="tier-card-${tier}"]`);
    await expect(tierCard).toBeVisible({ timeout: 10000 });
    await tierCard.click();

    const planContinueBtn = this.page.locator('[data-testid="plan-continue-btn"]');
    await expect(planContinueBtn).toBeEnabled({ timeout: 5000 });
    await planContinueBtn.click();

    // ── Step 6: OnboardingConsent → accept terms ──
    await this.handleOnboardingConsent();

    // ── Step 7: PractitionerProfileStep → fill profile ──
    await this.fillPractitionerProfile({
      name: practitionerName,
      slug: practitionerSlug,
      headline: 'Experienced Tarot Reader & Intuitive Guide',
      bio: 'I have been reading tarot for over 10 years and specialize in helping people find clarity in their lives.',
      modalities: ['TAROT', 'ORACLE'],
      specializations: ['RELATIONSHIPS', 'CAREER'],
    });

    const profileContinueBtn = this.page.locator('[data-testid="setup-practitioner-continue-btn"]');
    await expect(profileContinueBtn).toBeEnabled({ timeout: 5000 });
    await profileContinueBtn.click();

    // ── Step 8: PractitionerOptionalStep → fill optional details and submit ──
    await expect(this.page.locator('[data-testid="setup-practitioner-pronouns"]')).toBeVisible({ timeout: 10000 });
    await this.fillPractitionerOptional({
      pronouns: 'she/her',
      yearsExperience: 10,
      approach: 'I approach each reading with compassion and clarity.',
    });

    const submitBtn = this.page.locator('[data-testid="setup-practitioner-submit-btn"]');
    await expect(submitBtn).toBeEnabled({ timeout: 5000 });
    await submitBtn.click();

    // Wait for redirect to practitioner profile page
    await this.page.waitForURL(new RegExp(`/p/${practitionerSlug}`), { timeout: 30000 });
    console.log(`[PractitionerSetup] ✓ Practitioner created: ${practitionerSlug}`);

    // Register practitioner for cleanup
    const practitionerCookies = await getCookiesFromPage(this.page);
    if (practitionerCookies) {
      const actualVendorId = await getVendorIdFromSlug(practitionerSlug, practitionerCookies);
      if (actualVendorId) {
        registerTestPractitioner({ id: actualVendorId, slug: practitionerSlug, email: testEmail, cookies: practitionerCookies }, workerId);
      } else {
        console.error(`[PractitionerSetup] WARNING: Could not fetch vendor ID for ${practitionerSlug}`);
        registerTestPractitioner({ slug: practitionerSlug, email: testEmail, cookies: practitionerCookies }, workerId);
      }
    }

    return practitionerSlug;
  }
}

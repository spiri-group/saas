import { test, expect } from '@playwright/test';
import { AuthPage } from '../pages/AuthPage';
import { PractitionerSetupPage } from '../pages/PractitionerSetupPage';
import {
  clearTestEntityRegistry,
  registerTestUser,
  registerTestPractitioner,
  getCookiesFromPage,
  cleanupTestUsers,
  cleanupTestPractitioners,
  getVendorIdFromSlug,
} from '../utils/test-cleanup';
import { handleConsentGuardIfPresent } from '../utils/test-helpers';

// Store cookies per test worker
const cookiesPerWorker = new Map<number, string>();

/**
 * Practitioner Signup Flow Tests
 *
 * Tests the unified onboarding flow for practitioners:
 *   BasicDetails → ChoosePlan → OnboardingConsent → PractitionerProfile → PractitionerOptional → CardCapture → Profile
 * Then verifies dashboard navigation and service creation dialogs.
 */

test.beforeAll(async ({}, testInfo) => {
  console.log('[Setup] Preparing practitioner test environment...');
  clearTestEntityRegistry(testInfo.parallelIndex);
});

test.afterAll(async ({}, testInfo) => {
  test.setTimeout(120000);
  const workerId = testInfo.parallelIndex;
  const cookies = cookiesPerWorker.get(workerId);

  if (cookies) {
    try {
      await cleanupTestPractitioners(cookies, workerId);
      await cleanupTestUsers(cookies, workerId);
    } catch (error) {
      console.error('[Cleanup] Error during cleanup:', error);
    } finally {
      cookiesPerWorker.delete(workerId);
    }
  }
  clearTestEntityRegistry(workerId);
});

test.describe('Practitioner', () => {
  let authPage: AuthPage;
  let practitionerSetupPage: PractitionerSetupPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    practitionerSetupPage = new PractitionerSetupPage(page);
    await page.goto('/');
  });

  test('complete practitioner signup flow with dashboard navigation', async ({ page }, testInfo) => {
    test.setTimeout(300000); // 5 minutes for full flow including dashboard tests

    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const workerId = testInfo.parallelIndex;
    const testEmail = `practitioner-${timestamp}-${workerId}@playwright.com`;
    const practitionerSlug = `test-prac-${timestamp}-${randomSuffix}`;

    // === AUTHENTICATION ===
    await authPage.startAuthFlow(testEmail);
    await expect(page.locator('[aria-label="input-login-otp"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[aria-label="input-login-otp"]').click();
    await page.keyboard.type('123456');
    await page.waitForURL('/', { timeout: 15000 });

    // === HANDLE SITE-LEVEL CONSENT GUARD ===
    await handleConsentGuardIfPresent(page);

    // === NAVIGATE TO SETUP ===
    await page.goto('/setup');
    await page.waitForLoadState('networkidle');

    // === BASIC DETAILS STEP ===
    // Wait for either basic details or plan step (basic may be skipped if profile already exists)
    const firstNameInput = page.locator('[data-testid="setup-first-name"]');
    const planStep = page.locator('[data-testid="choose-plan-step"]');
    await expect(firstNameInput.or(planStep)).toBeVisible({ timeout: 20000 });

    // Register user for cleanup (get user ID from session)
    const userId = await page.evaluate(async () => {
      const response = await fetch('/api/auth/session');
      const session = await response.json();
      return session?.user?.id;
    });
    if (userId) {
      const cookies = await getCookiesFromPage(page);
      if (cookies) {
        cookiesPerWorker.set(workerId, cookies);
        registerTestUser({ id: userId, email: testEmail, cookies }, workerId);
      }
    }

    // Fill basic details if shown (skipped when user profile already exists)
    if (await firstNameInput.isVisible()) {
      await firstNameInput.fill('Test');
      await page.locator('[data-testid="setup-last-name"]').fill('Practitioner');
      await page.waitForTimeout(300);

      // Ensure country is selected (geolocation may not work in test env)
      const countryCombobox = page.locator('[data-testid="setup-country"]');
      const hasCountry = await countryCombobox.locator('text=Australia').isVisible().catch(() => false);
      if (!hasCountry) {
        await countryCombobox.click();
        await page.waitForTimeout(300);
        const australiaOption = page.getByRole('option', { name: 'Australia' });
        if (await australiaOption.isVisible({ timeout: 3000 }).catch(() => false)) {
          await australiaOption.click();
        } else {
          // Search for it
          const searchInput = page.locator('[role="listbox"]').locator('input').first();
          if (await searchInput.isVisible({ timeout: 1000 }).catch(() => false)) {
            await searchInput.fill('Australia');
            await page.waitForTimeout(300);
          }
          await page.getByRole('option', { name: 'Australia' }).click();
        }
        await page.waitForTimeout(300);
      }

      // Click "Set Up a Business" to proceed to plan selection
      const setupBusinessBtn = page.locator('[data-testid="setup-basic-setup-btn"]');
      await expect(setupBusinessBtn).toBeVisible({ timeout: 5000 });
      await setupBusinessBtn.click();
    }

    // === CHOOSE PLAN STEP ===
    await expect(planStep).toBeVisible({ timeout: 10000 });

    // Select "Awaken" tier (practitioner)
    const awakenCard = page.locator('[data-testid="tier-card-awaken"]');
    await expect(awakenCard).toBeVisible({ timeout: 10000 });
    await awakenCard.click();

    const planContinueBtn = page.locator('[data-testid="plan-continue-btn"]');
    await expect(planContinueBtn).toBeEnabled({ timeout: 5000 });
    await planContinueBtn.click();

    // === ONBOARDING CONSENT ===
    const consentContainer = page.locator('[data-testid="onboarding-consent"]');
    await expect(consentContainer).toBeVisible({ timeout: 15000 });

    // Accept all consent documents
    for (let step = 0; step < 10; step++) {
      const checkbox = page.locator('[data-testid^="consent-checkbox-"]').first();
      await expect(checkbox).toBeVisible({ timeout: 5000 });
      await checkbox.click();

      // Check if Accept & Continue button is visible (final step)
      const acceptBtn = page.locator('[data-testid="onboarding-consent-accept-btn"]');
      if (await acceptBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(acceptBtn).toBeEnabled({ timeout: 3000 });
        await acceptBtn.click();
        await page.waitForTimeout(1000);
        break;
      }

      // Otherwise click Next
      const nextBtn = page.locator('[data-testid="onboarding-consent-next-btn"]');
      await expect(nextBtn).toBeEnabled({ timeout: 3000 });
      await nextBtn.click();
      await page.waitForTimeout(500);
    }

    // === PRACTITIONER PROFILE STEP ===
    const nameInput = page.locator('[data-testid="setup-practitioner-name"]');
    await expect(nameInput).toBeVisible({ timeout: 10000 });

    // Test validation - try to continue with empty fields
    const continueBtn = page.locator('[data-testid="setup-practitioner-continue-btn"]');
    await continueBtn.click();
    await page.waitForTimeout(500);

    // Should show validation errors (name, slug, modalities, specializations are required)
    const errors = page.locator('[role="alert"], [data-testid*="error"], .text-destructive, .text-red');
    await expect(errors.first()).toBeVisible({ timeout: 3000 });

    // Fill name and verify auto-slug generation
    await nameInput.fill(`Test Practitioner ${timestamp}`);
    const slugInput = page.locator('[data-testid="setup-practitioner-slug"]');
    await expect(slugInput).toHaveValue(/.+/, { timeout: 15000 });
    await expect(slugInput).toBeEnabled({ timeout: 10000 });

    // Verify auto-generated slug is lowercase with hyphens
    const autoSlug = await slugInput.inputValue();
    expect(autoSlug).toMatch(/^[a-z0-9-]+$/);

    // Override slug with our test slug
    await slugInput.fill(practitionerSlug);

    // Select modalities
    await page.locator('[data-testid="setup-modality-TAROT"]').click();
    await page.waitForTimeout(100);
    await page.locator('[data-testid="setup-modality-ORACLE"]').click();
    await page.waitForTimeout(100);

    // Select specializations
    await page.locator('[data-testid="setup-specialization-RELATIONSHIPS"]').click();
    await page.waitForTimeout(100);
    await page.locator('[data-testid="setup-specialization-CAREER"]').click();
    await page.waitForTimeout(100);

    // Click continue
    await continueBtn.click();

    // === PRACTITIONER OPTIONAL STEP ===
    const pronounsInput = page.locator('[data-testid="setup-practitioner-pronouns"]');
    await expect(pronounsInput).toBeVisible({ timeout: 10000 });

    await pronounsInput.fill('she/her');
    await page.locator('[data-testid="setup-practitioner-years"]').fill('10');
    await page.locator('[data-testid="setup-practitioner-journey"]').fill(
      'My journey began when I received my first tarot deck as a gift.'
    );
    await page.locator('[data-testid="setup-practitioner-approach"]').fill(
      'I believe in empowering clients to make their own decisions through guidance.'
    );

    // Submit the form
    const submitBtn = page.locator('[data-testid="setup-practitioner-submit-btn"]');
    await expect(submitBtn).toBeEnabled({ timeout: 5000 });
    await submitBtn.click();

    // === CARD CAPTURE STEP ===
    // Skip card capture (no real Stripe in test env)
    const skipBtn = page.locator('[data-testid="card-capture-skip-btn"]');
    await expect(skipBtn).toBeVisible({ timeout: 30000 });
    await skipBtn.click();

    // === VERIFY REDIRECT TO PROFILE PAGE ===
    // After signup with skipped card capture, practitioner is not yet published
    // (go-live requires payment card + Stripe onboarding), so public profile shows "not found".
    // We just verify the redirect URL is correct, then test the dashboard.
    await page.waitForURL(new RegExp(`/p/${practitionerSlug}`), { timeout: 30000 });
    expect(page.url()).toMatch(new RegExp(`/p/${practitionerSlug}`));

    // Get cookies and fetch actual vendor ID for cleanup
    const updatedCookies = await getCookiesFromPage(page);
    if (updatedCookies) {
      cookiesPerWorker.set(workerId, updatedCookies);

      const actualVendorId = await getVendorIdFromSlug(practitionerSlug, updatedCookies);
      if (actualVendorId) {
        console.log(`[Test] Registering practitioner for cleanup: vendorId=${actualVendorId}, slug=${practitionerSlug}`);
        registerTestPractitioner({ id: actualVendorId, slug: practitionerSlug, email: testEmail, cookies: updatedCookies }, workerId);
      } else {
        console.error(`[Test] WARNING: Could not fetch actual vendor ID for slug ${practitionerSlug}`);
        registerTestPractitioner({ slug: practitionerSlug, email: testEmail, cookies: updatedCookies }, workerId);
      }
    }

    // === NAVIGATE TO DASHBOARD ===
    await page.goto(`/p/${practitionerSlug}/manage`);
    // Dashboard greeting is time-based (Good morning/afternoon/evening)
    await expect(page.locator('text=/Good (morning|afternoon|evening)/')).toBeVisible({ timeout: 15000 });

    // Verify dashboard elements
    await expect(page.getByText('Getting Started')).toBeVisible();

    // === TEST SIDEBAR NAVIGATION ===
    const sideNav = page.locator('[aria-label="practitioner-side-nav"]');
    await expect(sideNav).toBeVisible();

    // Navigate to Services > View All Services
    await sideNav.getByRole('menuitem', { name: 'Services' }).click();
    await page.waitForTimeout(300);
    await sideNav.getByRole('menuitem', { name: 'View All Services' }).click();
    await expect(page).toHaveURL(new RegExp(`/p/${practitionerSlug}/manage/services`), { timeout: 10000 });

    // Navigate to Schedule > Bookings
    await sideNav.getByRole('menuitem', { name: 'Schedule' }).click();
    await page.waitForTimeout(300);
    await sideNav.getByRole('menuitem', { name: 'Bookings' }).click();
    await expect(page).toHaveURL(new RegExp(`/p/${practitionerSlug}/manage/bookings`), { timeout: 10000 });

    // Navigate to Schedule > Availability (re-expand Schedule submenu)
    await sideNav.getByRole('menuitem', { name: 'Schedule' }).click();
    await page.waitForTimeout(300);
    await sideNav.getByRole('menuitem', { name: 'Availability' }).click();
    await expect(page).toHaveURL(new RegExp(`/p/${practitionerSlug}/manage/availability`), { timeout: 10000 });

    // Navigate to Profile > Overview (use testid to avoid matching "View Profile")
    await sideNav.locator('[data-testid="nav-profile"]').click();
    await page.waitForTimeout(300);
    await sideNav.getByRole('menuitem', { name: 'Overview' }).click();
    await expect(page).toHaveURL(new RegExp(`/p/${practitionerSlug}/manage/profile`), { timeout: 10000 });

    // Navigate back to Dashboard
    await sideNav.getByRole('menuitem', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL(new RegExp(`/p/${practitionerSlug}/manage$`), { timeout: 10000 });

    // === TEST SERVICE CREATION DIALOGS ===
    // Test New Reading dialog from quick actions
    await page.getByRole('button', { name: 'New Reading' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Test New Healing dialog from dashboard
    await page.getByRole('button', { name: 'New Healing' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // === TEST MANAGE PROFILE PAGE ===
    // Public profile is not yet visible (unpublished), but manage dashboard works
    await page.goto(`/p/${practitionerSlug}/manage/profile`);
    await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible({ timeout: 10000 });
  });
});

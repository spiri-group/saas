import { test, expect } from '@playwright/test';
import { AuthPage } from '../pages/AuthPage';
import { UserSetupPage } from '../pages/UserSetupPage';
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
import { handleConsentGuardIfPresent, generateTestEmail } from '../utils/test-helpers';

// Store cookies per test worker to avoid race conditions
const cookiesPerWorker = new Map<number, string>();

/**
 * Illuminate Tier E2E Tests
 *
 * Tests the Illuminate subscription tier features:
 * - Feature gating: Awaken practitioners see upgrade prompts
 * - Feature access: Illuminate practitioners can access Payment Links, Live Assist, Expo Mode
 * - Feature UI: Each illuminate feature page renders correctly
 * - Upgrade dialogs: Sidebar upgrade prompts work correctly
 *
 * Parallel Execution:
 * - Each test creates its own practitioner with unique credentials
 * - Per-worker cookie tracking via Map<number, string>
 * - Cleanup via purge_vendor/purge_user mutations in afterAll
 */

test.beforeAll(async ({}, testInfo) => {
  console.log('[Setup] Preparing illuminate tier test environment...');
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

test.describe('Illuminate Tier', () => {
  test('awaken practitioner sees upgrade prompts for illuminate features', async ({ page }, testInfo) => {
    test.setTimeout(300000);

    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const workerId = testInfo.parallelIndex;
    const testEmail = generateTestEmail(`awaken-${workerId}`);
    const practitionerSlug = `test-awaken-${timestamp}-${randomSuffix}`;

    const authPage = new AuthPage(page);
    const userSetupPage = new UserSetupPage(page);

    // === STEP 1: AUTHENTICATE ===
    await page.goto('/');
    await authPage.startAuthFlow(testEmail);
    await expect(page.locator('[aria-label="input-login-otp"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[aria-label="input-login-otp"]').click();
    await page.keyboard.type('123456');
    await page.waitForURL('/', { timeout: 15000 });

    // Handle site-level ConsentGuard if present
    await handleConsentGuardIfPresent(page);

    // === STEP 2: USER SETUP ===
    await page.goto('/setup');
    await userSetupPage.waitForForm();

    // Get user ID for cleanup
    const userId = await page.evaluate(async () => {
      const response = await fetch('/api/auth/session');
      const session = await response.json();
      return session?.user?.id;
    });
    if (userId) {
      const cookies = await getCookiesFromPage(page);
      if (cookies) {
        registerTestUser({ id: userId, email: testEmail, cookies }, workerId);
        cookiesPerWorker.set(workerId, cookies);
      }
    }

    await userSetupPage.fillUserProfile({ firstName: 'Test', lastName: 'AwakenPrac' });
    await userSetupPage.setupBusiness();

    // === STEP 3: SELECT AWAKEN TIER ===
    await expect(page.locator('[data-testid="choose-plan-step"]')).toBeVisible({ timeout: 10000 });
    const awakenCard = page.locator('[data-testid="tier-card-awaken"]');
    await expect(awakenCard).toBeVisible({ timeout: 10000 });
    await awakenCard.click();

    const planContinueBtn = page.locator('[data-testid="plan-continue-btn"]');
    await expect(planContinueBtn).toBeEnabled({ timeout: 5000 });
    await planContinueBtn.click();

    // === STEP 4: ONBOARDING CONSENT ===
    const consentContainer = page.locator('[data-testid="onboarding-consent"]');
    await expect(consentContainer).toBeVisible({ timeout: 15000 });

    for (let step = 0; step < 10; step++) {
      const checkbox = page.locator('[data-testid^="consent-checkbox-"]').first();
      await expect(checkbox).toBeVisible({ timeout: 5000 });
      await checkbox.click();

      const acceptBtn = page.locator('[data-testid="onboarding-consent-accept-btn"]');
      if (await acceptBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(acceptBtn).toBeEnabled({ timeout: 3000 });
        await acceptBtn.click();
        await page.waitForTimeout(1000);
        break;
      }

      const nextBtn = page.locator('[data-testid="onboarding-consent-next-btn"]');
      await expect(nextBtn).toBeEnabled({ timeout: 3000 });
      await nextBtn.click();
      await page.waitForTimeout(500);
    }

    // === STEP 5: PRACTITIONER PROFILE ===
    const nameInput = page.locator('[data-testid="setup-practitioner-name"]');
    await expect(nameInput).toBeVisible({ timeout: 10000 });
    await nameInput.fill(`Test AwakenPrac ${timestamp}`);

    const slugInput = page.locator('[data-testid="setup-practitioner-slug"]');
    await expect(slugInput).toHaveValue(/.+/, { timeout: 15000 });
    await expect(slugInput).toBeEnabled({ timeout: 10000 });
    await slugInput.fill(practitionerSlug);

    await page.locator('[data-testid="setup-practitioner-headline"]').fill('Tarot Reader');
    await page.locator('[data-testid="setup-practitioner-bio"]').fill(
      'I am a tarot reader with years of experience helping people find clarity in their lives and decisions.'
    );

    // Select modalities
    const tarotBadge = page.locator('[data-testid="setup-modality-TAROT"]');
    await tarotBadge.waitFor({ state: 'visible', timeout: 5000 });
    await tarotBadge.click();

    // Select specializations
    const relationshipsBadge = page.locator('[data-testid="setup-specialization-RELATIONSHIPS"]');
    await relationshipsBadge.waitFor({ state: 'visible', timeout: 5000 });
    await relationshipsBadge.click();

    const profileContinueBtn = page.locator('[data-testid="setup-practitioner-continue-btn"]');
    await expect(profileContinueBtn).toBeEnabled({ timeout: 5000 });
    await profileContinueBtn.click();

    // === STEP 6: OPTIONAL DETAILS ===
    await expect(page.locator('[data-testid="setup-practitioner-pronouns"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="setup-practitioner-pronouns"]').fill('she/her');

    const submitBtn = page.locator('[data-testid="setup-practitioner-submit-btn"]');
    await expect(submitBtn).toBeEnabled({ timeout: 5000 });
    await submitBtn.click();

    // === STEP 7: VERIFY REDIRECT TO PROFILE ===
    await page.waitForURL(new RegExp(`/p/${practitionerSlug}`), { timeout: 30000 });

    // Register practitioner for cleanup
    const practitionerCookies = await getCookiesFromPage(page);
    if (practitionerCookies) {
      cookiesPerWorker.set(workerId, practitionerCookies);
      const actualVendorId = await getVendorIdFromSlug(practitionerSlug, practitionerCookies);
      if (actualVendorId) {
        registerTestPractitioner({
          id: actualVendorId,
          slug: practitionerSlug,
          email: testEmail,
          cookies: practitionerCookies,
        }, workerId);
      } else {
        registerTestPractitioner({
          slug: practitionerSlug,
          email: testEmail,
          cookies: practitionerCookies,
        }, workerId);
      }
    }

    // === TEST: PAYMENT LINKS SHOWS UPGRADE PROMPT ===
    await page.goto(`/p/${practitionerSlug}/manage/payment-links`);
    await expect(page.getByTestId('payment-links-upgrade')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('payment-links-view')).not.toBeVisible();

    // Verify upgrade button links to subscription page
    const upgradeBtn = page.getByTestId('payment-links-upgrade-btn');
    await expect(upgradeBtn).toBeVisible();
    const upgradeLink = upgradeBtn.locator('..');
    await expect(upgradeLink).toHaveAttribute('href', `/p/${practitionerSlug}/manage/subscription`);

    // === TEST: LIVE ASSIST SHOWS UPGRADE PROMPT ===
    await page.goto(`/p/${practitionerSlug}/manage/live-assist`);
    await expect(page.getByTestId('live-assist-upgrade')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('live-assist-page')).not.toBeVisible();

    // Verify upgrade button
    const liveUpgradeBtn = page.getByTestId('upgrade-btn');
    await expect(liveUpgradeBtn).toBeVisible();

    // === TEST: EXPO MODE SHOWS UPGRADE PROMPT ===
    await page.goto(`/p/${practitionerSlug}/manage/expo-mode`);
    await expect(page.getByTestId('expo-mode-upgrade')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('expo-mode-page')).not.toBeVisible();

    // === TEST: SIDEBAR NAV SHOWS UPGRADE DIALOGS ===
    await page.goto(`/p/${practitionerSlug}/manage`);
    await expect(page.locator('[aria-label="practitioner-side-nav"]')).toBeVisible({ timeout: 15000 });

    // Click Payment Links in sidebar → should open upgrade dialog
    const paymentLinksNav = page.locator('[data-testid="nav-payment-links"]');
    await expect(paymentLinksNav).toBeVisible({ timeout: 5000 });
    await paymentLinksNav.click();

    // Verify feature upgrade dialog appears
    const upgradeModal = page.getByTestId('feature-upgrade-modal');
    await expect(upgradeModal).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('feature-upgrade-title')).toBeVisible();
    await expect(page.getByTestId('feature-upgrade-benefits')).toBeVisible();

    // Verify billing interval toggle
    await expect(page.getByTestId('feature-upgrade-interval-toggle')).toBeVisible();
    await expect(page.getByTestId('feature-upgrade-monthly-btn')).toBeVisible();
    await expect(page.getByTestId('feature-upgrade-annual-btn')).toBeVisible();

    // Verify price display loads
    await expect(page.getByTestId('feature-upgrade-price')).toBeVisible();

    // Verify action buttons
    await expect(page.getByTestId('feature-upgrade-cancel-btn')).toBeVisible();
    await expect(page.getByTestId('feature-upgrade-confirm-btn')).toBeVisible();

    // Close the upgrade dialog
    await page.getByTestId('feature-upgrade-cancel-btn').click();
    await page.waitForTimeout(500);

    // Click Live Assist in sidebar → should open upgrade dialog
    const liveAssistNav = page.locator('[data-testid="nav-live-assist"]');
    await expect(liveAssistNav).toBeVisible({ timeout: 5000 });
    await liveAssistNav.click();
    await expect(upgradeModal).toBeVisible({ timeout: 10000 });
    await page.getByTestId('feature-upgrade-cancel-btn').click();
    await page.waitForTimeout(500);

    // Click Expo Mode in sidebar → should open upgrade dialog
    const expoModeNav = page.locator('[data-testid="nav-expo-mode"]');
    await expect(expoModeNav).toBeVisible({ timeout: 5000 });
    await expoModeNav.click();
    await expect(upgradeModal).toBeVisible({ timeout: 10000 });
    await page.getByTestId('feature-upgrade-cancel-btn').click();
    await page.waitForTimeout(500);

    // Click SpiriAssist in sidebar → should open upgrade dialog
    const spiriAssistNav = page.locator('[data-testid="nav-spiri-assist"]');
    await expect(spiriAssistNav).toBeVisible({ timeout: 5000 });
    await spiriAssistNav.click();
    await expect(upgradeModal).toBeVisible({ timeout: 10000 });
    await page.getByTestId('feature-upgrade-cancel-btn').click();
  });

  test('illuminate practitioner can access all illuminate features', async ({ page }, testInfo) => {
    test.setTimeout(300000);

    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const workerId = testInfo.parallelIndex;
    const testEmail = generateTestEmail(`illuminate-${workerId}`);
    const practitionerSlug = `test-illum-${timestamp}-${randomSuffix}`;

    const authPage = new AuthPage(page);
    const userSetupPage = new UserSetupPage(page);

    // === STEP 1: AUTHENTICATE ===
    await page.goto('/');
    await authPage.startAuthFlow(testEmail);
    await expect(page.locator('[aria-label="input-login-otp"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[aria-label="input-login-otp"]').click();
    await page.keyboard.type('123456');
    await page.waitForURL('/', { timeout: 15000 });

    await handleConsentGuardIfPresent(page);

    // === STEP 2: USER SETUP ===
    await page.goto('/setup');
    await userSetupPage.waitForForm();

    const userId = await page.evaluate(async () => {
      const response = await fetch('/api/auth/session');
      const session = await response.json();
      return session?.user?.id;
    });
    if (userId) {
      const cookies = await getCookiesFromPage(page);
      if (cookies) {
        registerTestUser({ id: userId, email: testEmail, cookies }, workerId);
        cookiesPerWorker.set(workerId, cookies);
      }
    }

    await userSetupPage.fillUserProfile({ firstName: 'Test', lastName: 'IlluminatePrac' });
    await userSetupPage.setupBusiness();

    // === STEP 3: SELECT ILLUMINATE TIER ===
    await expect(page.locator('[data-testid="choose-plan-step"]')).toBeVisible({ timeout: 10000 });
    const illuminateCard = page.locator('[data-testid="tier-card-illuminate"]');
    await expect(illuminateCard).toBeVisible({ timeout: 10000 });
    await illuminateCard.click();

    const planContinueBtn = page.locator('[data-testid="plan-continue-btn"]');
    await expect(planContinueBtn).toBeEnabled({ timeout: 5000 });
    await planContinueBtn.click();

    // === STEP 4: ONBOARDING CONSENT ===
    const consentContainer = page.locator('[data-testid="onboarding-consent"]');
    await expect(consentContainer).toBeVisible({ timeout: 15000 });

    for (let step = 0; step < 10; step++) {
      const checkbox = page.locator('[data-testid^="consent-checkbox-"]').first();
      await expect(checkbox).toBeVisible({ timeout: 5000 });
      await checkbox.click();

      const acceptBtn = page.locator('[data-testid="onboarding-consent-accept-btn"]');
      if (await acceptBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(acceptBtn).toBeEnabled({ timeout: 3000 });
        await acceptBtn.click();
        await page.waitForTimeout(1000);
        break;
      }

      const nextBtn = page.locator('[data-testid="onboarding-consent-next-btn"]');
      await expect(nextBtn).toBeEnabled({ timeout: 3000 });
      await nextBtn.click();
      await page.waitForTimeout(500);
    }

    // === STEP 5: PRACTITIONER PROFILE ===
    const nameInput = page.locator('[data-testid="setup-practitioner-name"]');
    await expect(nameInput).toBeVisible({ timeout: 10000 });
    await nameInput.fill(`Test IlluminatePrac ${timestamp}`);

    const slugInput = page.locator('[data-testid="setup-practitioner-slug"]');
    await expect(slugInput).toHaveValue(/.+/, { timeout: 15000 });
    await expect(slugInput).toBeEnabled({ timeout: 10000 });
    await slugInput.fill(practitionerSlug);

    await page.locator('[data-testid="setup-practitioner-headline"]').fill('Illuminate Practitioner');
    await page.locator('[data-testid="setup-practitioner-bio"]').fill(
      'I am a practitioner specializing in live readings, payment links, and expo events for spiritual communities.'
    );

    const tarotBadge = page.locator('[data-testid="setup-modality-TAROT"]');
    await tarotBadge.waitFor({ state: 'visible', timeout: 5000 });
    await tarotBadge.click();

    const oracleBadge = page.locator('[data-testid="setup-modality-ORACLE"]');
    await oracleBadge.waitFor({ state: 'visible', timeout: 5000 });
    await oracleBadge.click();

    const relationshipsBadge = page.locator('[data-testid="setup-specialization-RELATIONSHIPS"]');
    await relationshipsBadge.waitFor({ state: 'visible', timeout: 5000 });
    await relationshipsBadge.click();

    const careerBadge = page.locator('[data-testid="setup-specialization-CAREER"]');
    await careerBadge.waitFor({ state: 'visible', timeout: 5000 });
    await careerBadge.click();

    const profileContinueBtn = page.locator('[data-testid="setup-practitioner-continue-btn"]');
    await expect(profileContinueBtn).toBeEnabled({ timeout: 5000 });
    await profileContinueBtn.click();

    // === STEP 6: OPTIONAL DETAILS ===
    await expect(page.locator('[data-testid="setup-practitioner-pronouns"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="setup-practitioner-pronouns"]').fill('they/them');
    await page.locator('[data-testid="setup-practitioner-years"]').fill('5');

    const submitBtn = page.locator('[data-testid="setup-practitioner-submit-btn"]');
    await expect(submitBtn).toBeEnabled({ timeout: 5000 });
    await submitBtn.click();

    // === STEP 7: VERIFY REDIRECT TO PROFILE ===
    await page.waitForURL(new RegExp(`/p/${practitionerSlug}`), { timeout: 30000 });

    // Register practitioner for cleanup
    const practitionerCookies = await getCookiesFromPage(page);
    if (practitionerCookies) {
      cookiesPerWorker.set(workerId, practitionerCookies);
      const actualVendorId = await getVendorIdFromSlug(practitionerSlug, practitionerCookies);
      if (actualVendorId) {
        registerTestPractitioner({
          id: actualVendorId,
          slug: practitionerSlug,
          email: testEmail,
          cookies: practitionerCookies,
        }, workerId);
      } else {
        registerTestPractitioner({
          slug: practitionerSlug,
          email: testEmail,
          cookies: practitionerCookies,
        }, workerId);
      }
    }

    // =============================================
    // TEST: PAYMENT LINKS - Full Feature Access
    // =============================================
    await page.goto(`/p/${practitionerSlug}/manage/payment-links`);

    // Should see the actual payment links view, NOT the upgrade prompt
    await expect(page.getByTestId('payment-links-view')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('payment-links-upgrade')).not.toBeVisible();

    // Verify page heading
    await expect(page.getByTestId('payment-links-heading')).toBeVisible();

    // Verify empty state (no links yet)
    await expect(page.getByTestId('payment-links-empty')).toBeVisible({ timeout: 10000 });

    // Verify Create Payment Link button is visible
    const createPaymentLinkBtn = page.getByTestId('create-payment-link-btn');
    await expect(createPaymentLinkBtn).toBeVisible();

    // Verify filter tabs are visible
    await expect(page.getByTestId('payment-links-filters')).toBeVisible();
    await expect(page.getByTestId('payment-links-filter-all')).toBeVisible();
    await expect(page.getByTestId('payment-links-filter-sent')).toBeVisible();
    await expect(page.getByTestId('payment-links-filter-viewed')).toBeVisible();
    await expect(page.getByTestId('payment-links-filter-paid')).toBeVisible();
    await expect(page.getByTestId('payment-links-filter-expired')).toBeVisible();
    await expect(page.getByTestId('payment-links-filter-cancelled')).toBeVisible();

    // Open Create Payment Link dialog
    await createPaymentLinkBtn.click();
    const createDialog = page.getByTestId('create-payment-link-dialog');
    await expect(createDialog).toBeVisible({ timeout: 10000 });

    // Verify dialog fields
    await expect(page.getByTestId('create-payment-link-title')).toBeVisible();
    await expect(page.getByTestId('payment-link-customer-email')).toBeVisible();
    await expect(page.getByTestId('payment-link-customer-name')).toBeVisible();
    await expect(page.getByTestId('payment-link-item-0')).toBeVisible();
    await expect(page.getByTestId('payment-link-item-description-0')).toBeVisible();
    await expect(page.getByTestId('payment-link-item-amount-0')).toBeVisible();
    await expect(page.getByTestId('payment-link-total')).toBeVisible();
    await expect(page.getByTestId('payment-link-expiration')).toBeVisible();
    await expect(page.getByTestId('payment-link-submit')).toBeVisible();

    // Test adding a second item
    await page.getByTestId('payment-link-add-item').click();
    await expect(page.getByTestId('payment-link-item-1')).toBeVisible({ timeout: 5000 });

    // Test removing the second item
    await page.getByTestId('payment-link-remove-item-1').click();
    await expect(page.getByTestId('payment-link-item-1')).not.toBeVisible();

    // Close dialog
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // =============================================
    // TEST: LIVE ASSIST - Full Feature Access
    // =============================================
    await page.goto(`/p/${practitionerSlug}/manage/live-assist`);

    // Should see the actual live assist page, NOT the upgrade prompt
    await expect(page.getByTestId('live-assist-page')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('live-assist-upgrade')).not.toBeVisible();

    // Verify empty state
    await expect(page.getByTestId('no-sessions')).toBeVisible({ timeout: 10000 });

    // Verify Go Live button is visible and enabled
    const goLiveBtn = page.getByTestId('go-live-btn');
    await expect(goLiveBtn).toBeVisible();
    await expect(goLiveBtn).toBeEnabled();

    // Open Go Live dialog
    await goLiveBtn.click();
    const goLiveDialog = page.getByTestId('start-live-session-dialog');
    await expect(goLiveDialog).toBeVisible({ timeout: 10000 });

    // Verify dialog fields
    await expect(page.getByTestId('session-title-input')).toBeVisible();
    await expect(page.getByTestId('pricing-custom')).toBeVisible();
    await expect(page.getByTestId('pricing-service')).toBeVisible();
    await expect(page.getByTestId('custom-amount-input')).toBeVisible();

    // Verify CTA message field
    await expect(page.getByTestId('cta-message-input')).toBeVisible();

    // Verify the Go Live button inside dialog is visible (disabled without amount)
    const dialogGoLiveBtn = goLiveDialog.getByTestId('go-live-btn');
    await expect(dialogGoLiveBtn).toBeVisible();

    // Fill in a custom amount to make Go Live enabled
    await page.getByTestId('custom-amount-input').fill('50');
    await expect(dialogGoLiveBtn).toBeEnabled({ timeout: 5000 });

    // Close dialog
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // =============================================
    // TEST: EXPO MODE - Full Feature Access
    // =============================================
    await page.goto(`/p/${practitionerSlug}/manage/expo-mode`);

    // Should see the actual expo mode page, NOT the upgrade prompt
    await expect(page.getByTestId('expo-mode-page')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('expo-mode-upgrade')).not.toBeVisible();

    // Verify empty state
    await expect(page.getByTestId('no-expos')).toBeVisible({ timeout: 10000 });

    // Verify Create Expo button is visible and enabled
    const createExpoBtn = page.getByTestId('create-expo-btn');
    await expect(createExpoBtn).toBeVisible();
    await expect(createExpoBtn).toBeEnabled();

    // Open Create Expo dialog
    await createExpoBtn.click();
    const createExpoDialog = page.getByTestId('create-expo-dialog');
    await expect(createExpoDialog).toBeVisible({ timeout: 10000 });

    // Verify dialog fields
    await expect(page.getByTestId('expo-name-input')).toBeVisible();
    await expect(page.getByTestId('cancel-create-btn')).toBeVisible();

    // Verify confirm button is disabled without a name
    const confirmCreateBtn = page.getByTestId('confirm-create-btn');
    await expect(confirmCreateBtn).toBeVisible();
    await expect(confirmCreateBtn).toBeDisabled();

    // Fill in expo name to enable confirm button
    await page.getByTestId('expo-name-input').fill('Test Expo');
    await expect(confirmCreateBtn).toBeEnabled({ timeout: 5000 });

    // Cancel and close dialog
    await page.getByTestId('cancel-create-btn').click();
    await expect(createExpoDialog).not.toBeVisible({ timeout: 5000 });

    // =============================================
    // TEST: SIDEBAR NAVIGATION - Direct Links
    // =============================================
    await page.goto(`/p/${practitionerSlug}/manage`);
    const sideNav = page.locator('[aria-label="practitioner-side-nav"]');
    await expect(sideNav).toBeVisible({ timeout: 15000 });

    // Payment Links nav should be a direct link (not an upgrade dialog trigger)
    const paymentLinksNav = page.locator('[data-testid="nav-payment-links"]');
    await expect(paymentLinksNav).toBeVisible({ timeout: 5000 });
    await paymentLinksNav.click();
    await expect(page).toHaveURL(new RegExp(`/p/${practitionerSlug}/manage/payment-links`), { timeout: 10000 });
    await expect(page.getByTestId('payment-links-view')).toBeVisible({ timeout: 15000 });

    // Navigate back
    await page.goto(`/p/${practitionerSlug}/manage`);
    await expect(sideNav).toBeVisible({ timeout: 15000 });

    // Live Assist nav should be a direct link
    const liveAssistNav = page.locator('[data-testid="nav-live-assist"]');
    await expect(liveAssistNav).toBeVisible({ timeout: 5000 });
    await liveAssistNav.click();
    await expect(page).toHaveURL(new RegExp(`/p/${practitionerSlug}/manage/live-assist`), { timeout: 10000 });
    await expect(page.getByTestId('live-assist-page')).toBeVisible({ timeout: 15000 });

    // Navigate back
    await page.goto(`/p/${practitionerSlug}/manage`);
    await expect(sideNav).toBeVisible({ timeout: 15000 });

    // Expo Mode nav should be a direct link
    const expoModeNav = page.locator('[data-testid="nav-expo-mode"]');
    await expect(expoModeNav).toBeVisible({ timeout: 5000 });
    await expoModeNav.click();
    await expect(page).toHaveURL(new RegExp(`/p/${practitionerSlug}/manage/expo-mode`), { timeout: 10000 });
    await expect(page.getByTestId('expo-mode-page')).toBeVisible({ timeout: 15000 });
  });
});

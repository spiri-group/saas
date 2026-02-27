import { test, expect, Page, TestInfo } from '@playwright/test';
import { AuthPage } from '../pages/AuthPage';
import {
  clearTestEntityRegistry,
  registerTestUser,
  registerTestPractitioner,
  getCookiesFromPage,
  cleanupTestUsers,
  cleanupTestPractitioners,
  getVendorIdFromSlug,
  addTestCard,
  gqlDirect,
} from '../utils/test-cleanup';
import { handleConsentGuardIfPresent } from '../utils/test-helpers';

// Store cookies per test worker
const cookiesPerWorker = new Map<number, string>();

/**
 * Practitioner Signup Flow Tests
 *
 * Two tests covering the card capture step during onboarding:
 *   1. Skip card capture, add card later via API
 *   2. Provide card during onboarding via Stripe CardElement iframe
 *
 * Both verify that goLiveReadiness.hasPaymentCard === true after completion.
 */

interface SignupResult {
  practitionerSlug: string;
  testEmail: string;
  workerId: number;
}

/**
 * Shared helper: completes practitioner signup from auth through the optional step.
 * Stops BEFORE the card capture step so each test can handle it differently.
 */
async function completeSignupUntilCardCapture(
  page: Page,
  testInfo: TestInfo
): Promise<SignupResult> {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const workerId = testInfo.parallelIndex;
  const testEmail = `practitioner-${timestamp}-${workerId}@playwright.com`;
  const practitionerSlug = `test-prac-${timestamp}-${randomSuffix}`;

  const authPage = new AuthPage(page);

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
  const firstNameInput = page.locator('[data-testid="setup-first-name"]');
  const planStep = page.locator('[data-testid="choose-plan-step"]');
  await expect(firstNameInput.or(planStep)).toBeVisible({ timeout: 20000 });

  // Register user for cleanup
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

    // Ensure country is selected
    const countryCombobox = page.locator('[data-testid="setup-country"]');
    const hasCountry = await countryCombobox.locator('text=Australia').isVisible().catch(() => false);
    if (!hasCountry) {
      await countryCombobox.click();
      await page.waitForTimeout(300);
      const australiaOption = page.getByRole('option', { name: 'Australia' });
      if (await australiaOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await australiaOption.click();
      } else {
        const searchInput = page.locator('[role="listbox"]').locator('input').first();
        if (await searchInput.isVisible({ timeout: 1000 }).catch(() => false)) {
          await searchInput.fill('Australia');
          await page.waitForTimeout(300);
        }
        await page.getByRole('option', { name: 'Australia' }).click();
      }
      await page.waitForTimeout(300);
    }

    const setupBusinessBtn = page.locator('[data-testid="setup-basic-setup-btn"]');
    await expect(setupBusinessBtn).toBeVisible({ timeout: 5000 });
    await setupBusinessBtn.click();
  }

  // === CHOOSE PLAN STEP ===
  await expect(planStep).toBeVisible({ timeout: 10000 });
  const awakenCard = page.locator('[data-testid="tier-card-awaken"]');
  await expect(awakenCard).toBeVisible({ timeout: 10000 });
  await awakenCard.click();

  const planContinueBtn = page.locator('[data-testid="plan-continue-btn"]');
  await expect(planContinueBtn).toBeEnabled({ timeout: 5000 });
  await planContinueBtn.click();

  // === ONBOARDING CONSENT ===
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

  // === PRACTITIONER PROFILE STEP ===
  const nameInput = page.locator('[data-testid="setup-practitioner-name"]');
  await expect(nameInput).toBeVisible({ timeout: 10000 });

  await nameInput.fill(`Test Practitioner ${timestamp}`);
  const slugInput = page.locator('[data-testid="setup-practitioner-slug"]');
  await expect(slugInput).toHaveValue(/.+/, { timeout: 15000 });
  await expect(slugInput).toBeEnabled({ timeout: 10000 });
  await slugInput.fill(practitionerSlug);

  await page.locator('[data-testid="setup-modality-TAROT"]').click();
  await page.waitForTimeout(100);
  await page.locator('[data-testid="setup-modality-ORACLE"]').click();
  await page.waitForTimeout(100);

  await page.locator('[data-testid="setup-specialization-RELATIONSHIPS"]').click();
  await page.waitForTimeout(100);
  await page.locator('[data-testid="setup-specialization-CAREER"]').click();
  await page.waitForTimeout(100);

  const continueBtn = page.locator('[data-testid="setup-practitioner-continue-btn"]');
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

  const submitBtn = page.locator('[data-testid="setup-practitioner-submit-btn"]');
  await expect(submitBtn).toBeEnabled({ timeout: 5000 });
  await submitBtn.click();

  // Card capture step should now appear
  return { practitionerSlug, testEmail, workerId };
}

/**
 * After signup + card capture, register practitioner for cleanup and return IDs.
 */
async function registerPractitionerForCleanup(
  page: Page,
  practitionerSlug: string,
  testEmail: string,
  workerId: number
): Promise<{ vendorId: string; cookies: string }> {
  const cookies = await getCookiesFromPage(page);
  let vendorId = '';

  if (cookies) {
    cookiesPerWorker.set(workerId, cookies);

    const actualVendorId = await getVendorIdFromSlug(practitionerSlug, cookies);
    if (actualVendorId) {
      vendorId = actualVendorId;
      console.log(`[Test] Registering practitioner for cleanup: vendorId=${actualVendorId}, slug=${practitionerSlug}`);
      registerTestPractitioner({ id: actualVendorId, slug: practitionerSlug, email: testEmail, cookies }, workerId);
    } else {
      console.error(`[Test] WARNING: Could not fetch actual vendor ID for slug ${practitionerSlug}`);
      registerTestPractitioner({ slug: practitionerSlug, email: testEmail, cookies }, workerId);
    }
  }

  return { vendorId, cookies: cookies || '' };
}

/**
 * Query goLiveReadiness to verify a payment card is saved.
 */
async function verifyCardSaved(vendorId: string, cookies: string): Promise<boolean> {
  const result = await gqlDirect<{ vendor: { goLiveReadiness: { hasPaymentCard: boolean } } }>(
    `query GoLiveCheck($vendorId: String!) { vendor(id: $vendorId) { goLiveReadiness { hasPaymentCard } } }`,
    { vendorId },
    cookies
  );
  return result.vendor.goLiveReadiness.hasPaymentCard;
}

/**
 * Fill card details in a Stripe CardElement iframe.
 *
 * The CardElement renders all fields (card number, expiry, CVC, postal)
 * in a SINGLE iframe. Stripe auto-advances focus between fields as the
 * user types. We click into the card number field and then use
 * page.keyboard.type() which sends keystrokes to the currently focused
 * element, letting Stripe handle the auto-advance transitions.
 */
async function fillStripeCardElement(page: Page): Promise<void> {
  const stripeFrames = page.locator('iframe[name^="__privateStripeFrame"]');
  await expect(stripeFrames.first()).toBeVisible({ timeout: 30000 });
  await page.waitForTimeout(3000); // Wait for Stripe to fully initialize

  const frameCount = await stripeFrames.count();
  console.log(`[CardCapture] Found ${frameCount} Stripe iframe(s)`);

  // Find the frame with the card number input (the actual CardElement iframe)
  let cardFrame: ReturnType<typeof page.frameLocator> | null = null;
  for (let i = 0; i < frameCount; i++) {
    const frame = page.frameLocator('iframe[name^="__privateStripeFrame"]').nth(i);
    if (await frame.locator('[name="cardnumber"]').isVisible({ timeout: 2000 }).catch(() => false)) {
      cardFrame = frame;
      console.log(`[CardCapture] Found CardElement in iframe ${i}`);
      break;
    }
  }

  if (!cardFrame) {
    throw new Error('Could not find Stripe CardElement iframe with card number input');
  }

  // Click into card number field and type — Stripe auto-advances between fields
  const cardNumberInput = cardFrame.locator('[name="cardnumber"]');
  await cardNumberInput.click();
  await cardNumberInput.pressSequentially('4242424242424242', { delay: 50 });
  console.log('[CardCapture] Typed card number');
  await page.waitForTimeout(500);

  // Stripe auto-advances to expiry
  const expiryInput = cardFrame.locator('[name="exp-date"]');
  await expiryInput.click();
  await expiryInput.pressSequentially('1234', { delay: 50 });
  console.log('[CardCapture] Typed expiry');
  await page.waitForTimeout(500);

  // Stripe auto-advances to CVC
  const cvcInput = cardFrame.locator('[name="cvc"]');
  await cvcInput.click();
  await cvcInput.pressSequentially('123', { delay: 50 });
  console.log('[CardCapture] Typed CVC');
  await page.waitForTimeout(500);

  // Stripe auto-advances to postal code
  const postalInput = cardFrame.locator('[name="postal"]');
  if (await postalInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await postalInput.click();
    await postalInput.pressSequentially('12345', { delay: 50 });
    console.log('[CardCapture] Typed postal code');
  }

  // Let Stripe validate all fields before submitting
  await page.waitForTimeout(1500);
}

/**
 * Verify the public profile page actually rendered after redirect,
 * then open the Bio & Headline dialog via sidebar, fill and save,
 * and verify the data persisted via GraphQL.
 *
 * Assumes the page is already on `/p/{slug}` (from redirect or navigation)
 * and the sidebar is visible (owner is logged in).
 */
async function verifyProfileAndEditBio(
  page: Page,
  practitionerSlug: string,
  vendorId: string,
  cookies: string,
  timestamp: number
): Promise<void> {
  // === VERIFY PROFILE PAGE LOADED (not "Practitioner not found") ===
  const notFoundHeading = page.getByRole('heading', { name: 'Practitioner not found' });
  const practitionerName = page.locator('h1').filter({ hasText: /Test Practitioner/ });
  await expect(notFoundHeading).not.toBeVisible({ timeout: 5000 });
  await expect(practitionerName).toBeVisible({ timeout: 15000 });

  // === OPEN BIO & HEADLINE DIALOG VIA SIDEBAR ===
  const sideNav = page.locator('[aria-label="practitioner-side-nav"]');
  await expect(sideNav).toBeVisible();
  await sideNav.locator('[data-testid="nav-profile"]').click();
  await page.waitForTimeout(300);
  await sideNav.getByRole('menuitem', { name: 'Bio & Headline' }).click();

  // === FILL AND SAVE BIO ===
  const dialog = page.locator('[data-testid="edit-practitioner-bio-dialog"]');
  await expect(dialog).toBeVisible({ timeout: 15000 });

  const testHeadline = `E2E Test Headline ${timestamp}`;
  const testBio = `This is an automated E2E test bio written at ${timestamp} to verify the practitioner profile works correctly end to end after signup completion.`;

  const headlineInput = dialog.locator('[data-testid="headline-input"]');
  await headlineInput.clear();
  await headlineInput.fill(testHeadline);

  const bioInput = dialog.locator('[data-testid="bio-input"]');
  await bioInput.clear();
  await bioInput.fill(testBio);

  await dialog.locator('[data-testid="save-bio-btn"]').click();
  await expect(dialog).not.toBeVisible({ timeout: 15000 });
  console.log('[Test] Bio & Headline saved successfully');

  // === VERIFY PERSISTED VIA GRAPHQL ===
  const result = await gqlDirect<{ vendor: { practitioner: { headline: string; bio: string } } }>(
    `query GetPrac($id: String!) { vendor(id: $id) { practitioner { headline bio } } }`,
    { id: vendorId },
    cookies
  );
  expect(result.vendor.practitioner.headline).toBe(testHeadline);
  expect(result.vendor.practitioner.bio).toBe(testBio);
  console.log('[Test] Verified bio & headline persisted via GraphQL');
}

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
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('practitioner signup — skip card, add later', async ({ page }, testInfo) => {
    test.setTimeout(300000); // 5 minutes for full flow including dashboard tests

    // === COMPLETE SIGNUP THROUGH OPTIONAL STEP ===
    const { practitionerSlug, testEmail, workerId } = await completeSignupUntilCardCapture(page, testInfo);

    // === CARD CAPTURE STEP — SKIP ===
    const skipBtn = page.locator('[data-testid="card-capture-skip-btn"]');
    await expect(skipBtn).toBeVisible({ timeout: 30000 });
    await skipBtn.click();

    // === VERIFY REDIRECT TO PROFILE PAGE ===
    await page.waitForURL(new RegExp(`/p/${practitionerSlug}`), { timeout: 30000 });
    expect(page.url()).toMatch(new RegExp(`/p/${practitionerSlug}`));

    // Verify the profile page actually rendered (not "Practitioner not found")
    await expect(page.getByRole('heading', { name: 'Practitioner not found' })).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('h1').filter({ hasText: /Test Practitioner/ })).toBeVisible({ timeout: 15000 });
    console.log('[Test] Profile page rendered correctly after redirect');

    // === REGISTER FOR CLEANUP & GET IDS ===
    const { vendorId, cookies } = await registerPractitionerForCleanup(page, practitionerSlug, testEmail, workerId);
    expect(vendorId).toBeTruthy();
    expect(cookies).toBeTruthy();

    // === ADD CARD VIA API ===
    console.log(`[Test] Adding test card via API for vendor ${vendorId}...`);
    const cardResult = await addTestCard(vendorId, cookies);
    expect(cardResult.success).toBe(true);
    console.log(`[Test] Card added: ${cardResult.card?.brand} ending ${cardResult.card?.last4}`);

    // === VERIFY CARD SAVED VIA GO-LIVE READINESS ===
    const hasCard = await verifyCardSaved(vendorId, cookies);
    expect(hasCard).toBe(true);
    console.log('[Test] Verified hasPaymentCard === true');

    // === NAVIGATE TO DASHBOARD ===
    await page.goto(`/p/${practitionerSlug}/manage`);
    await expect(page.locator('text=/Good (morning|afternoon|evening)/')).toBeVisible({ timeout: 15000 });
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

    // Navigate to Schedule > Availability
    await sideNav.getByRole('menuitem', { name: 'Schedule' }).click();
    await page.waitForTimeout(300);
    await sideNav.getByRole('menuitem', { name: 'Availability' }).click();
    await expect(page).toHaveURL(new RegExp(`/p/${practitionerSlug}/manage/availability`), { timeout: 10000 });

    // Navigate to Profile > Overview
    await sideNav.locator('[data-testid="nav-profile"]').click();
    await page.waitForTimeout(300);
    await sideNav.getByRole('menuitem', { name: 'Overview' }).click();
    await expect(page).toHaveURL(new RegExp(`/p/${practitionerSlug}/manage/profile`), { timeout: 10000 });

    // Navigate back to Dashboard
    await sideNav.getByRole('menuitem', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL(new RegExp(`/p/${practitionerSlug}/manage$`), { timeout: 10000 });

    // === TEST BIO & HEADLINE EDIT VIA SIDEBAR ===
    await sideNav.locator('[data-testid="nav-profile"]').click();
    await page.waitForTimeout(300);
    await sideNav.getByRole('menuitem', { name: 'Bio & Headline' }).click();

    const bioDialog = page.locator('[data-testid="edit-practitioner-bio-dialog"]');
    await expect(bioDialog).toBeVisible({ timeout: 15000 });

    const testHeadline = `E2E Test Headline ${Date.now()}`;
    const testBio = 'This is an automated E2E test bio to verify the practitioner profile works correctly end to end after signup completion.';

    const headlineInput = bioDialog.locator('[data-testid="headline-input"]');
    await headlineInput.clear();
    await headlineInput.fill(testHeadline);

    const bioInput = bioDialog.locator('[data-testid="bio-input"]');
    await bioInput.clear();
    await bioInput.fill(testBio);

    await bioDialog.locator('[data-testid="save-bio-btn"]').click();
    await expect(bioDialog).not.toBeVisible({ timeout: 15000 });
    console.log('[Test] Bio & Headline saved via manage sidebar');

    // Verify persisted via GraphQL
    const bioResult = await gqlDirect<{ vendor: { practitioner: { headline: string; bio: string } } }>(
      `query GetPrac($id: String!) { vendor(id: $id) { practitioner { headline bio } } }`,
      { id: vendorId },
      cookies
    );
    expect(bioResult.vendor.practitioner.headline).toBe(testHeadline);
    expect(bioResult.vendor.practitioner.bio).toBe(testBio);
    console.log('[Test] Verified bio & headline persisted via GraphQL');
  });

  test('practitioner signup — provide card during onboarding', async ({ page }, testInfo) => {
    test.setTimeout(300000); // 5 minutes for full flow including Stripe interaction

    // === COMPLETE SIGNUP THROUGH OPTIONAL STEP ===
    const { practitionerSlug, testEmail, workerId } = await completeSignupUntilCardCapture(page, testInfo);

    // === CARD CAPTURE STEP — FILL STRIPE CARD ELEMENT ===
    // Wait for card capture step to load (SetupIntent must be created first)
    const submitCardBtn = page.locator('[data-testid="card-capture-submit-btn"]');
    await expect(submitCardBtn).toBeVisible({ timeout: 30000 });
    console.log('[Test] Card capture step visible');

    // Fill card details in Stripe CardElement iframe
    await fillStripeCardElement(page);

    // Click "Add Card & Continue"
    await expect(submitCardBtn).toBeEnabled({ timeout: 5000 });
    await submitCardBtn.click();
    console.log('[Test] Clicked Add Card & Continue');

    // === VERIFY REDIRECT TO PROFILE PAGE ===
    await page.waitForURL(new RegExp(`/p/${practitionerSlug}`), { timeout: 60000 });
    expect(page.url()).toMatch(new RegExp(`/p/${practitionerSlug}`));
    console.log('[Test] Redirected to practitioner profile page');

    // === REGISTER FOR CLEANUP & GET IDS ===
    const { vendorId, cookies } = await registerPractitionerForCleanup(page, practitionerSlug, testEmail, workerId);
    expect(vendorId).toBeTruthy();
    expect(cookies).toBeTruthy();

    // === VERIFY CARD SAVED VIA GO-LIVE READINESS ===
    const hasCard = await verifyCardSaved(vendorId, cookies);
    expect(hasCard).toBe(true);
    console.log('[Test] Verified hasPaymentCard === true (card provided during onboarding)');

    // === VERIFY PROFILE PAGE LOADED & EDIT BIO VIA SIDEBAR ===
    await verifyProfileAndEditBio(page, practitionerSlug, vendorId, cookies, Date.now());
  });
});

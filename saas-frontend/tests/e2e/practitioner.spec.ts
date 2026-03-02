import { test, expect, Page } from '@playwright/test';
import { PractitionerSetupPage } from '../pages/PractitionerSetupPage';
import {
  clearTestEntityRegistry,
  registerTestPractitioner,
  getCookiesFromPage,
  cleanupTestUsers,
  cleanupTestPractitioners,
  getVendorIdFromSlug,
  addTestCard,
  gqlDirect,
} from '../utils/test-cleanup';

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
  await page.waitForTimeout(500);
  await page.getByRole('menuitem', { name: 'Bio & Headline' }).click();

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
  test('practitioner signup — skip card, add later', async ({ page }, testInfo) => {
    test.setTimeout(300000); // 5 minutes for full flow including dashboard tests

    const workerId = testInfo.parallelIndex;
    const timestamp = Date.now();
    const testEmail = `practitioner-${timestamp}-${workerId}@playwright.com`;
    const practitionerName = `Test Practitioner ${timestamp}`;

    // === COMPLETE SIGNUP THROUGH OPTIONAL STEP (stops before card capture) ===
    const setupPage = new PractitionerSetupPage(page);
    const practitionerSlug = await setupPage.createPractitionerUntilCardCapture(
      testEmail,
      practitionerName,
      testInfo,
      'awaken'
    );

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

    // Navigate to Services > View All Services (dropdown is rendered as portal)
    await sideNav.getByRole('menuitem', { name: 'Services' }).click();
    await page.waitForTimeout(500);
    await page.getByRole('menuitem', { name: 'View All Services' }).click();
    await expect(page).toHaveURL(new RegExp(`/p/${practitionerSlug}/manage/services`), { timeout: 10000 });

    // Navigate to Schedule > Bookings
    await sideNav.getByRole('menuitem', { name: 'Schedule' }).click();
    await page.waitForTimeout(500);
    await page.getByRole('menuitem', { name: 'Bookings' }).click();
    await expect(page).toHaveURL(new RegExp(`/p/${practitionerSlug}/manage/bookings`), { timeout: 10000 });

    // Navigate to Schedule > Availability
    await sideNav.getByRole('menuitem', { name: 'Schedule' }).click();
    await page.waitForTimeout(500);
    await page.getByRole('menuitem', { name: 'Availability' }).click();
    await expect(page).toHaveURL(new RegExp(`/p/${practitionerSlug}/manage/availability`), { timeout: 10000 });

    // Navigate to Profile > Overview
    await sideNav.locator('[data-testid="nav-profile"]').click();
    await page.waitForTimeout(500);
    await page.getByRole('menuitem', { name: 'Overview' }).click();
    await expect(page).toHaveURL(new RegExp(`/p/${practitionerSlug}/manage/profile`), { timeout: 10000 });

    // Navigate back to Dashboard
    await sideNav.getByRole('menuitem', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL(new RegExp(`/p/${practitionerSlug}/manage$`), { timeout: 10000 });

    // === TEST BIO & HEADLINE EDIT VIA SIDEBAR ===
    await sideNav.locator('[data-testid="nav-profile"]').click();
    await page.waitForTimeout(300);
    await page.getByRole('menuitem', { name: 'Bio & Headline' }).click();

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

    const workerId = testInfo.parallelIndex;
    const timestamp = Date.now();
    const testEmail = `practitioner-${timestamp}-${workerId}@playwright.com`;
    const practitionerName = `Test Practitioner ${timestamp}`;

    // === COMPLETE SIGNUP THROUGH OPTIONAL STEP (stops before card capture) ===
    const setupPage = new PractitionerSetupPage(page);
    const practitionerSlug = await setupPage.createPractitionerUntilCardCapture(
      testEmail,
      practitionerName,
      testInfo,
      'awaken'
    );

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
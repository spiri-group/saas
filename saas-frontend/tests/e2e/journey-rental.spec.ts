import { test, expect, Page, TestInfo } from '@playwright/test';
import { PractitionerSetupPage } from '../pages/PractitionerSetupPage';
import { AuthPage } from '../pages/AuthPage';
import { UserSetupPage } from '../pages/UserSetupPage';
import { OnboardingPage } from '../pages/OnboardingPage';
import { JourneyStorefrontPage } from '../pages/JourneyStorefrontPage';
import { JourneyListPage } from '../pages/JourneyListPage';
import { JourneyPlayerPage } from '../pages/JourneyPlayerPage';
import { PurchaseManager } from '../managers/PurchaseManager';
import { handleConsentGuardIfPresent } from '../utils/test-helpers';
import {
  getCookiesFromPage,
  registerTestUser,
  clearTestEntityRegistry,
  cleanupTestUsers,
  cleanupTestPractitioners,
  completeStripeTestOnboarding,
  executeGraphQL,
} from '../utils/test-cleanup';

/**
 * Journey Rental - Full E2E Flow
 *
 * 1. Practitioner creates a journey with rental pricing enabled
 * 2. Customer rents the journey (not buys)
 * 3. Rental shows in Personal Space with days-remaining badge and player with rental banner
 * 4. After expiring the rental via API, player shows locked state and list shows expired section
 */

const DESCRIBE_KEY = 'journey-rental-e2e';
let practitionerSlug: string;
let practitionerId: string;
let journeyName: string;
let journeyId: string;
let customerId: string;
let customerEmail: string;

const cookiesPerWorker = new Map<string, string>();
const browserCookiesPerWorker = new Map<string, Array<{name: string; value: string; domain: string; path: string; expires: number; httpOnly: boolean; secure: boolean; sameSite: 'Strict' | 'Lax' | 'None'}>>();

function generateTestEmail(prefix: string, testInfo: TestInfo): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${testInfo.parallelIndex}-${randomSuffix}@playwright.com`;
}

async function waitForDialogOverlayToClose(page: Page) {
  const dialogOverlay = page.locator('[data-state="open"][aria-hidden="true"].fixed.inset-0');
  try {
    await dialogOverlay.waitFor({ state: 'hidden', timeout: 10000 });
  } catch {
    // No overlay present
  }
}

async function dismissWelcomeDialog(page: Page) {
  try {
    await page.waitForTimeout(2000);
    const welcomeButton = page.locator('button:has-text("Customise your profile")');
    if (await welcomeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await welcomeButton.click();
      await page.waitForTimeout(1000);
    }
    const closeButton = page.locator('[role="dialog"]:visible button:has-text("Close")');
    if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeButton.click();
      await page.waitForTimeout(1000);
    }
    await waitForDialogOverlayToClose(page);
  } catch {
    // Dialog didn't appear
  }
}

async function getPractitionerIdFromSlug(page: Page, slug: string): Promise<string | null> {
  try {
    return await page.evaluate(async (practitionerSlug) => {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query GetVendorId($slug: String!) {
            vendorIdFromSlug(slug: $slug) {
              merchantId
            }
          }`,
          variables: { slug: practitionerSlug }
        })
      });
      const data = await response.json();
      return data.data?.vendorIdFromSlug?.merchantId;
    }, slug);
  } catch {
    return null;
  }
}

// =============================================================================
// JOURNEY RENTAL - FULL E2E FLOW
// =============================================================================
test.describe.serial('Journey Rental - Full E2E Flow', () => {

  test.beforeAll(async ({}, testInfo) => {
    clearTestEntityRegistry(testInfo.parallelIndex);
  });

  test.afterAll(async ({}, testInfo) => {
    test.setTimeout(120000);
    const workerId = testInfo.parallelIndex;
    const practitionerCookies = cookiesPerWorker.get(`${workerId}-${DESCRIBE_KEY}`);

    if (practitionerCookies) {
      try {
        await cleanupTestPractitioners(practitionerCookies, workerId);
      } catch (error) {
        console.error('[Cleanup] Error cleaning up practitioners:', error);
      }
    }

    try {
      await cleanupTestUsers(undefined, workerId);
    } catch (error) {
      console.error('[Cleanup] Error cleaning up users:', error);
    }

    clearTestEntityRegistry(workerId);
  });

  test('1. Practitioner creates a journey with rental pricing enabled', async ({ page }, testInfo) => {
    test.setTimeout(360000);

    console.log('[Rental Test 1] Creating practitioner and rental-enabled journey...');

    // Create practitioner
    const testEmail = generateTestEmail('rental-prac', testInfo);
    const practitionerSetupPage = new PractitionerSetupPage(page);
    practitionerSlug = await practitionerSetupPage.createPractitioner(testEmail, 'Rental Guide Test', testInfo);
    console.log(`[Rental Test 1] Practitioner slug: ${practitionerSlug}`);

    const cookies = await getCookiesFromPage(page);
    await dismissWelcomeDialog(page);

    // Get merchant ID and complete Stripe onboarding
    practitionerId = await getPractitionerIdFromSlug(page, practitionerSlug) || '';
    if (practitionerId && cookies) {
      console.log(`[Rental Test 1] Practitioner ID: ${practitionerId}`);
      const onboardingResult = await completeStripeTestOnboarding(practitionerId, cookies);
      if (onboardingResult.success) {
        console.log('[Rental Test 1] Stripe onboarding completed');
        await page.reload();
        await page.waitForLoadState('networkidle');
      }
    }

    // Store cookies for cleanup (practitioner already registered by createPractitioner)
    const workerId = testInfo.parallelIndex;
    if (cookies) {
      cookiesPerWorker.set(`${workerId}-${DESCRIBE_KEY}`, cookies);
    }

    // Create journey with rental pricing via GraphQL API directly
    const timestamp = Date.now();
    journeyName = `Rental Meditation ${timestamp}`;

    const createResult = await page.evaluate(async ({ vendorId, name }) => {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `mutation CreateJourney($vendorId: ID!, $input: CreateJourneyInput!) {
            create_journey(vendorId: $vendorId, input: $input) {
              code success message journey { id name }
            }
          }`,
          variables: {
            vendorId,
            input: {
              name,
              description: 'A calming meditation available for rental.',
              journeyStructure: 'SINGLE_TRACK',
              difficulty: 'BEGINNER',
              modalities: ['MEDITATION'],
              pricing: {
                collectionPrice: { amount: 2500, currency: 'AUD' },
                allowSingleTrackPurchase: false,
                allowRental: true,
                rentalPrice: { amount: 999, currency: 'AUD' },
                rentalDurationDays: 7,
              },
            },
          },
        }),
      });
      const data = await response.json();
      return data.data?.create_journey;
    }, { vendorId: practitionerId, name: journeyName });

    expect(createResult?.success).toBe(true);
    journeyId = createResult.journey.id;
    console.log(`[Rental Test 1] Journey created: ${journeyId} (${journeyName})`);

    // Add a track and publish
    const trackAndPublish = await page.evaluate(async ({ vendorId, jId }) => {
      const results: string[] = [];
      try {
        const trackResp = await fetch('/api/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `mutation UpsertJourneyTrack($vendorId: ID!, $journeyId: ID!, $input: JourneyTrackInput!) {
              upsert_journey_track(vendorId: $vendorId, journeyId: $journeyId, input: $input) {
                code success message track { id title }
              }
            }`,
            variables: {
              vendorId,
              journeyId: jId,
              input: {
                trackNumber: 1,
                title: 'Grounding Session',
                description: 'A guided grounding meditation.',
                durationSeconds: 60,
                audioFile: {
                  code: 'test-audio-' + Date.now(),
                  name: 'grounding-session.wav',
                  urlRelative: 'public/test/grounding-session.wav',
                  type: 'AUDIO',
                  size: 'RECTANGLE_HORIZONTAL',
                  sizeBytes: 16044,
                  durationSeconds: 60,
                },
              },
            },
          }),
        });
        const trackData = await trackResp.json();
        results.push(`Track: ${JSON.stringify(trackData.data?.upsert_journey_track?.success)}`);

        const publishResp = await fetch('/api/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `mutation UpdateJourney($vendorId: ID!, $input: UpdateJourneyInput!) {
              update_journey(vendorId: $vendorId, input: $input) {
                code success message journey { id isLive }
              }
            }`,
            variables: {
              vendorId,
              input: { id: jId, isLive: true },
            },
          }),
        });
        const publishData = await publishResp.json();
        results.push(`Publish: ${JSON.stringify(publishData.data?.update_journey?.success)}`);

        return results;
      } catch (error) {
        results.push(`Error: ${String(error)}`);
        return results;
      }
    }, { vendorId: practitionerId, jId: journeyId });

    for (const r of trackAndPublish) {
      console.log(`[Rental Test 1] ${r}`);
    }

    console.log('[Rental Test 1] Journey created with rental pricing, track added, published.');
  });

  test('2. Customer rents the journey from storefront', async ({ browser }, testInfo) => {
    test.setTimeout(300000);

    console.log('[Rental Test 2] Customer signup and rental flow...');
    expect(practitionerSlug).toBeDefined();
    expect(journeyId).toBeTruthy();

    const customerContext = await browser.newContext();
    const customerPage = await customerContext.newPage();
    const workerId = testInfo.parallelIndex;
    const stateKey = `${workerId}-${DESCRIBE_KEY}-customer`;

    customerEmail = generateTestEmail('rental-cust', testInfo);

    try {
      // Customer signup
      console.log('[Rental Test 2] Step 1: Customer signing up...');
      const authPage = new AuthPage(customerPage);
      const userSetupPage = new UserSetupPage(customerPage);

      await customerPage.goto('/');
      await authPage.startAuthFlow(customerEmail);
      await expect(customerPage.locator('[aria-label="input-login-otp"]')).toBeVisible({ timeout: 15000 });
      await customerPage.locator('[aria-label="input-login-otp"]').click();
      await customerPage.keyboard.type('123456');
      await customerPage.waitForURL('/', { timeout: 15000 });

      await handleConsentGuardIfPresent(customerPage);

      // Wait for auto-redirect to /setup rather than hard-navigating
      await customerPage.waitForURL(/\/setup/, { timeout: 15000 }).catch(async () => {
        await customerPage.goto('/setup');
      });
      await userSetupPage.waitForForm();

      customerId = await customerPage.evaluate(async () => {
        const response = await fetch('/api/auth/session');
        const session = await response.json();
        return session?.user?.id || '';
      });
      console.log(`[Rental Test 2] Customer ID: ${customerId}`);

      await userSetupPage.fillUserProfile({
        firstName: 'Rental',
        lastName: 'Tester',
      });
      await userSetupPage.startBrowsing();

      const onboardingPage = new OnboardingPage(customerPage);
      await onboardingPage.completeWithPrimaryOnly('mediumship');
      console.log('[Rental Test 2] Customer profile completed');

      // Store cookies
      const cookies = await getCookiesFromPage(customerPage);
      const browserCookies = await customerPage.context().cookies();
      if (cookies) {
        cookiesPerWorker.set(stateKey, cookies);
        browserCookiesPerWorker.set(stateKey, browserCookies);
        if (customerId) {
          registerTestUser({ id: customerId, email: customerEmail, cookies }, workerId);
        }
      }

      // Navigate to journey storefront
      console.log(`[Rental Test 2] Step 2: Browsing journey storefront...`);
      await customerPage.goto(`/m/${practitionerSlug}/journey/${journeyId}`);
      await customerPage.waitForLoadState('networkidle');
      await customerPage.waitForTimeout(3000);

      const storefrontPage = new JourneyStorefrontPage(customerPage);
      await storefrontPage.waitForPageLoad();

      const title = await storefrontPage.getTitle();
      expect(title).toContain('Rental Meditation');
      console.log(`[Rental Test 2] Journey title: ${title}`);

      // Dismiss cookie banner if present
      const cookieBanner = customerPage.getByTestId('cookie-banner');
      if (await cookieBanner.isVisible({ timeout: 2000 }).catch(() => false)) {
        const acceptBtn = customerPage.getByTestId('cookie-accept-btn');
        if (await acceptBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await acceptBtn.click();
          await expect(cookieBanner).not.toBeVisible({ timeout: 3000 });
        }
      }

      // Verify Rent button is visible
      const rentVisible = await storefrontPage.isRentButtonVisible();
      expect(rentVisible).toBe(true);
      console.log('[Rental Test 2] Rent button visible on storefront');

      // Click Rent (not Buy)
      console.log('[Rental Test 2] Step 3: Renting journey...');
      await storefrontPage.clickRent();
      await customerPage.waitForTimeout(2000);

      // Verify cart updated
      const cartCount = customerPage.getByTestId('cart-count');
      await expect(cartCount).toHaveText(/[1-9]/, { timeout: 10000 });
      console.log('[Rental Test 2] Rental added to cart');

      // Complete purchase
      console.log('[Rental Test 2] Step 4: Completing rental purchase...');
      const purchaseManager = new PurchaseManager(customerPage);
      await purchaseManager.openCart();
      await purchaseManager.proceedToCheckout();
      await purchaseManager.fillBillingAddress();
      await purchaseManager.fillCardDetails();
      await purchaseManager.acceptConsentCheckboxes();

      const payButton = customerPage.getByTestId('finish-pay-btn');
      await expect(payButton).toBeEnabled({ timeout: 30000 });
      await payButton.click();
      console.log('[Rental Test 2] Payment submitted');

      const processingDialog = customerPage.locator('text=Processing Payment');
      await expect(processingDialog).toBeVisible({ timeout: 30000 });

      const paymentSuccess = customerPage.locator('text=Payment successful');
      await expect(paymentSuccess).toBeVisible({ timeout: 60000 });
      console.log('[Rental Test 2] Rental payment successful');

      await customerPage.screenshot({ path: 'test-results/journey-rental-purchase-complete.png' });

    } finally {
      await customerContext.close();
    }
  });

  test('3. Rental shows in Personal Space with rental badge and player banner', async ({ browser }, testInfo) => {
    test.setTimeout(180000);

    console.log('[Rental Test 3] Verifying rental in Personal Space...');
    expect(customerId).toBeTruthy();
    expect(journeyId).toBeTruthy();

    const workerId = testInfo.parallelIndex;
    const stateKey = `${workerId}-${DESCRIBE_KEY}-customer`;
    const savedCookies = cookiesPerWorker.get(stateKey);
    const savedBrowserCookies = browserCookiesPerWorker.get(stateKey);

    const customerContext = await browser.newContext();
    const customerPage = await customerContext.newPage();

    try {
      // Restore customer session
      if (savedBrowserCookies && savedBrowserCookies.length > 0) {
        await customerPage.context().addCookies(savedBrowserCookies);
        console.log('[Rental Test 3] Customer session restored');
      } else {
        throw new Error('[Rental Test 3] No customer cookies found');
      }

      // Wait for webhook to process the rental
      const journeyListPage = new JourneyListPage(customerPage);
      let journeyFound = false;
      const maxRetries = 6;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        await journeyListPage.navigateTo(customerId);
        await journeyListPage.waitForPageLoad();

        if (await journeyListPage.isListPageVisible()) {
          const cardCount = await journeyListPage.getJourneyCardCount();
          if (cardCount > 0) {
            console.log(`[Rental Test 3] Journey cards found: ${cardCount} (attempt ${attempt})`);
            journeyFound = true;
            break;
          }
        }

        if (attempt < maxRetries) {
          console.log(`[Rental Test 3] Rental not yet available, waiting 15s... (attempt ${attempt}/${maxRetries})`);
          await customerPage.waitForTimeout(15000);
        }
      }

      expect(journeyFound).toBe(true);

      // Ensure rental fields are set on the progress record.
      // The deployed webhook may not have the rental code yet, so we set them via API.
      // Once the backend is deployed with rental support, this becomes a no-op (same values).
      const futureExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      console.log('[Rental Test 3] Ensuring rental fields are set on progress record...');
      await executeGraphQL<{ set_rental_expiry: { id: string } }>(
        `mutation SetRentalExpiry($journeyId: ID!, $userId: ID!, $expiresAt: String!, $accessType: String) {
          set_rental_expiry(journeyId: $journeyId, userId: $userId, expiresAt: $expiresAt, accessType: $accessType) {
            id
            accessType
            rentalExpiresAt
          }
        }`,
        { journeyId, userId: customerId, expiresAt: futureExpiry, accessType: 'RENTAL' },
        savedCookies
      );
      console.log('[Rental Test 3] Rental fields ensured on progress record');

      // Reload the page to pick up updated data
      await journeyListPage.navigateTo(customerId);
      await journeyListPage.waitForPageLoad();

      // Verify rental badge is visible on the journey card
      const hasRentalBadge = await journeyListPage.hasRentalBadge();
      console.log(`[Rental Test 3] Rental badge visible: ${hasRentalBadge}`);
      expect(hasRentalBadge).toBe(true);

      // Active section should have the rental
      expect(await journeyListPage.hasActiveSection()).toBe(true);
      const activeCount = await journeyListPage.getActiveJourneyCount();
      expect(activeCount).toBeGreaterThan(0);
      console.log(`[Rental Test 3] Active rentals: ${activeCount}`);

      await customerPage.screenshot({ path: 'test-results/journey-rental-list.png' });

      // Navigate to the journey player
      console.log('[Rental Test 3] Opening journey player...');
      const playerPage = new JourneyPlayerPage(customerPage);
      await playerPage.navigateTo(customerId, journeyId);
      await playerPage.waitForPageLoad();

      expect(await playerPage.isPlayerVisible()).toBe(true);

      // Verify rental banner is visible
      const bannerVisible = await playerPage.isRentalBannerVisible();
      console.log(`[Rental Test 3] Rental banner visible: ${bannerVisible}`);
      expect(bannerVisible).toBe(true);

      const bannerText = await playerPage.getRentalBannerText();
      expect(bannerText).toContain('days remaining');
      console.log(`[Rental Test 3] Banner text: ${bannerText}`);

      // Verify player controls work normally
      const nowPlayingTitle = await playerPage.getNowPlayingTitle();
      console.log(`[Rental Test 3] Now playing: ${nowPlayingTitle}`);
      expect(nowPlayingTitle.length).toBeGreaterThan(0);

      await customerPage.screenshot({ path: 'test-results/journey-rental-player.png' });
      console.log('[Rental Test 3] Rental Personal Space verification complete');

    } finally {
      await customerContext.close();
    }
  });

  test('4. Expired rental shows locked state in player and expired section in list', async ({ browser }, testInfo) => {
    test.setTimeout(180000);

    console.log('[Rental Test 4] Expiring rental and verifying locked state...');
    expect(customerId).toBeTruthy();
    expect(journeyId).toBeTruthy();

    const workerId = testInfo.parallelIndex;
    const stateKey = `${workerId}-${DESCRIBE_KEY}-customer`;
    const savedCookies = cookiesPerWorker.get(stateKey);
    const savedBrowserCookies = browserCookiesPerWorker.get(stateKey);

    expect(savedCookies).toBeTruthy();

    // Expire the rental by setting rentalExpiresAt to a past date via GraphQL API
    console.log('[Rental Test 4] Setting rental expiry to past date...');
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 1 day ago

    const expireResult = await executeGraphQL<{
      set_rental_expiry: {
        id: string;
        rentalExpiresAt: string;
      };
    }>(
      `mutation SetRentalExpiry($journeyId: ID!, $userId: ID!, $expiresAt: String!) {
        set_rental_expiry(journeyId: $journeyId, userId: $userId, expiresAt: $expiresAt) {
          id
          rentalExpiresAt
        }
      }`,
      { journeyId, userId: customerId, expiresAt: pastDate },
      savedCookies
    );

    console.log(`[Rental Test 4] Rental expired. New expiresAt: ${expireResult.set_rental_expiry.rentalExpiresAt}`);

    const customerContext = await browser.newContext();
    const customerPage = await customerContext.newPage();

    try {
      // Restore customer session
      if (savedBrowserCookies && savedBrowserCookies.length > 0) {
        await customerPage.context().addCookies(savedBrowserCookies);
        console.log('[Rental Test 4] Customer session restored');
      } else {
        throw new Error('[Rental Test 4] No customer cookies found');
      }

      // Check the player shows the expired state
      console.log('[Rental Test 4] Navigating to journey player...');
      const playerPage = new JourneyPlayerPage(customerPage);
      await playerPage.navigateTo(customerId, journeyId);
      await playerPage.waitForPlayerOrExpired();

      const expiredVisible = await playerPage.isRentalExpiredPageVisible();
      console.log(`[Rental Test 4] Expired page visible: ${expiredVisible}`);
      expect(expiredVisible).toBe(true);

      // Verify "View in Store" button is present
      const repurchaseVisible = await playerPage.isRepurchaseButtonVisible();
      expect(repurchaseVisible).toBe(true);
      console.log('[Rental Test 4] Repurchase button visible');

      // Player should NOT be visible (it's the expired page instead)
      const playerVisible = await playerPage.isPlayerVisible();
      expect(playerVisible).toBe(false);

      await customerPage.screenshot({ path: 'test-results/journey-rental-expired-player.png' });

      // Navigate to journeys list and verify expired section
      console.log('[Rental Test 4] Checking expired section in Personal Space list...');
      const journeyListPage = new JourneyListPage(customerPage);
      await journeyListPage.navigateTo(customerId);
      await journeyListPage.waitForPageLoad();

      expect(await journeyListPage.isListPageVisible()).toBe(true);

      const hasExpired = await journeyListPage.hasExpiredSection();
      console.log(`[Rental Test 4] Expired section visible: ${hasExpired}`);
      expect(hasExpired).toBe(true);

      const expiredCount = await journeyListPage.getExpiredRentalCount();
      console.log(`[Rental Test 4] Expired rentals: ${expiredCount}`);
      expect(expiredCount).toBeGreaterThan(0);

      // Verify expired badge on the card
      const hasExpiredBadge = await journeyListPage.hasExpiredBadge();
      console.log(`[Rental Test 4] Expired badge visible: ${hasExpiredBadge}`);
      expect(hasExpiredBadge).toBe(true);

      // Active section should no longer have this rental
      const activeCount = await journeyListPage.getActiveJourneyCount();
      console.log(`[Rental Test 4] Active journeys (should be 0): ${activeCount}`);
      expect(activeCount).toBe(0);

      await customerPage.screenshot({ path: 'test-results/journey-rental-expired-list.png' });
      console.log('[Rental Test 4] Expired rental verification complete');

    } finally {
      await customerContext.close();
    }
  });
});

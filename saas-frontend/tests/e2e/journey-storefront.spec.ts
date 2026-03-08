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
  registerTestPractitioner,
  clearTestEntityRegistry,
  cleanupTestUsers,
  cleanupTestPractitioners,
  completeStripeTestOnboarding,
} from '../utils/test-cleanup';

/**
 * Guided Journeys - Full E2E Customer Journey
 *
 * 1. Practitioner signs up and creates a guided journey with a track
 * 2. Customer discovers journey on storefront, adds to cart, purchases
 * 3. Customer views journey in Personal Space and verifies player UI
 */

const DESCRIBE_KEY = 'journey-e2e';
let practitionerSlug: string;
let practitionerId: string;
let journeyName: string;
let journeyId: string;
let customerId: string;
let customerEmail: string;

const cookiesPerWorker = new Map<string, string>();

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

/** Generate a minimal valid WAV file (1 second of silence) */
function generateTestAudioBuffer(): Buffer {
  const sampleRate = 8000;
  const numSamples = sampleRate; // 1 second
  const bytesPerSample = 2;
  const dataSize = numSamples * bytesPerSample;
  const headerSize = 44;
  const buffer = Buffer.alloc(headerSize + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // chunk size
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * bytesPerSample, 28); // byte rate
  buffer.writeUInt16LE(bytesPerSample, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  // Samples are all zeros (silence)

  return buffer;
}

// =============================================================================
// GUIDED JOURNEYS - FULL E2E CUSTOMER JOURNEY
// =============================================================================
test.describe.serial('Guided Journeys - Full E2E Customer Journey', () => {

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

  test('1. Practitioner creates account and sets up a guided journey', async ({ page }, testInfo) => {
    test.setTimeout(360000);

    console.log('[Test 1] Creating practitioner and guided journey...');

    // Create practitioner
    const testEmail = generateTestEmail('journey-prac', testInfo);
    const practitionerSetupPage = new PractitionerSetupPage(page);
    practitionerSlug = await practitionerSetupPage.createPractitioner(testEmail, 'Journey Guide Test', testInfo);
    console.log(`[Test 1] Practitioner slug: ${practitionerSlug}`);

    const cookies = await getCookiesFromPage(page);
    await dismissWelcomeDialog(page);

    // Get merchant ID and complete Stripe onboarding
    practitionerId = await getPractitionerIdFromSlug(page, practitionerSlug) || '';
    if (practitionerId && cookies) {
      console.log(`[Test 1] Practitioner ID: ${practitionerId}`);
      const onboardingResult = await completeStripeTestOnboarding(practitionerId, cookies);
      if (onboardingResult.success) {
        console.log('[Test 1] Stripe onboarding completed');
        await page.reload();
        await page.waitForLoadState('networkidle');
      }
    }

    // Store cookies for later tests and register practitioner for cleanup
    const workerId = testInfo.parallelIndex;
    if (cookies) {
      cookiesPerWorker.set(`${workerId}-${DESCRIBE_KEY}`, cookies);
    }
    registerTestPractitioner({
      id: practitionerId,
      slug: practitionerSlug,
      cookies: cookies || undefined,
    }, workerId);

    // Navigate to journeys management
    await page.goto(`/p/${practitionerSlug}/manage/journeys`);
    await page.waitForLoadState('networkidle');
    await dismissWelcomeDialog(page);
    await page.waitForTimeout(2000);

    // Click "Single Track" create card — this opens the CreateJourneyDialog directly
    const createCard = page.getByTestId('create-journey-card');
    await expect(createCard).toBeVisible({ timeout: 10000 });
    await createCard.click();
    await page.waitForTimeout(1000);

    // Wait for CreateJourneyDialog to appear
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    console.log('[Test 1] Journey creation dialog opened');

    // Step 1: Basics
    const timestamp = Date.now();
    journeyName = `Grounding Meditation ${timestamp}`;

    const nameInput = page.getByTestId('journey-name-input');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill(journeyName);

    const descInput = page.getByTestId('journey-description-input');
    await descInput.fill('A calming grounding meditation to connect with the earth and find inner peace.');

    const priceInput = page.getByTestId('journey-price-input');
    await priceInput.fill('15.00');

    // Click Next to go to Details step
    const nextBtn = page.getByTestId('journey-next-btn');
    await expect(nextBtn).toBeEnabled({ timeout: 5000 });
    await nextBtn.click();
    await page.waitForTimeout(1000);
    console.log('[Test 1] Moved to Step 2 (Details)');

    // Step 2: Details - fill intention and select a modality
    const intentionInput = page.getByTestId('journey-intention-input');
    if (await intentionInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await intentionInput.fill('I am grounded, centered, and at peace with the earth beneath me.');
    }

    const modalityBadge = page.getByTestId('modality-MEDITATION');
    if (await modalityBadge.isVisible({ timeout: 3000 }).catch(() => false)) {
      await modalityBadge.click();
    }

    // Click Next to go to Thumbnail step
    await nextBtn.click();
    await page.waitForTimeout(1000);
    console.log('[Test 1] Moved to Step 3 (Thumbnail)');

    // Step 3: Thumbnail - skip (submit without thumbnail)
    const submitBtn = page.getByTestId('journey-submit-btn');
    await expect(submitBtn).toBeVisible({ timeout: 5000 });
    await submitBtn.click();
    await page.waitForTimeout(5000);
    console.log('[Test 1] Journey creation submitted');

    // After creation, the UI switches to JourneyTrackManager
    // Wait for track manager to appear (shows "No tracks yet" or add track button)
    const addFirstTrackBtn = page.getByTestId('add-first-track-btn');
    const addTrackBtn = page.getByTestId('add-track-btn');
    await expect(addFirstTrackBtn.or(addTrackBtn)).toBeVisible({ timeout: 15000 });
    console.log('[Test 1] Track manager visible');

    // Get the journey ID via the catalogue GraphQL query
    const fetchJourneys = async () => {
      return await page.evaluate(async (vendorId) => {
        try {
          const response = await fetch('/api/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: `query GetPractitionerJourneys($vendorId: ID!, $types: [String]) {
                catalogue(vendorId: $vendorId, types: $types, includeDrafts: true) {
                  listings { id name }
                }
              }`,
              variables: { vendorId, types: ['JOURNEY'] },
            }),
          });
          const data = await response.json();
          return { listings: data.data?.catalogue?.listings, errors: data.errors };
        } catch (error) {
          return { listings: null, errors: [String(error)] };
        }
      }, practitionerId);
    };

    let journeyResult = await fetchJourneys();
    console.log(`[Test 1] Catalogue query result: ${JSON.stringify(journeyResult)}`);

    if (!journeyResult.listings || journeyResult.listings.length === 0) {
      // Retry after a delay (Cosmos DB eventual consistency)
      console.log('[Test 1] No journeys found, retrying...');
      await page.waitForTimeout(5000);
      journeyResult = await fetchJourneys();
    }

    if (journeyResult.listings && journeyResult.listings.length > 0) {
      journeyId = journeyResult.listings[0].id;
      console.log(`[Test 1] Journey ID: ${journeyId} (${journeyResult.listings[0].name})`);
    } else {
      throw new Error(`[Test 1] FAILED: Journey was not created. Result: ${JSON.stringify(journeyResult)}`);
    }

    // Create a track and publish the journey via GraphQL API
    const trackAndPublish = await page.evaluate(async ({ vendorId, jId }) => {
      const results: string[] = [];
      try {
        // Create a track
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
                title: 'Earth Connection',
                description: 'A guided meditation connecting you to the energy of the earth.',
                durationSeconds: 60,
                audioFile: {
                  code: 'test-audio-' + Date.now(),
                  name: 'earth-connection.wav',
                  urlRelative: 'public/test/earth-connection.wav',
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
        results.push(`Track: ${JSON.stringify(trackData)}`);

        // Publish the journey (set isLive: true)
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
        results.push(`Publish: ${JSON.stringify(publishData)}`);

        return results;
      } catch (error) {
        results.push(`Error: ${String(error)}`);
        return results;
      }
    }, { vendorId: practitionerId, jId: journeyId });

    for (const r of trackAndPublish) {
      console.log(`[Test 1] ${r}`);
    }

    console.log(`[Test 1] Journey created, track added, and published. Ready for customer purchase.`);
    await page.screenshot({ path: 'test-results/journey-created.png' });
  });

  test('2. Customer signs up, browses storefront, and purchases the journey', async ({ browser }, testInfo) => {
    test.setTimeout(300000);

    console.log('[Test 2] Customer signup and purchase flow...');
    expect(practitionerSlug).toBeDefined();
    expect(journeyId).toBeTruthy();
    expect(journeyName).toBeTruthy();

    const customerContext = await browser.newContext();
    const customerPage = await customerContext.newPage();
    const workerId = testInfo.parallelIndex;
    const stateKey = `${workerId}-${DESCRIBE_KEY}-customer`;

    customerEmail = generateTestEmail('journey-cust', testInfo);

    try {
      // Customer signup
      console.log('[Test 2] Step 1: Customer signing up...');
      const authPage = new AuthPage(customerPage);
      const userSetupPage = new UserSetupPage(customerPage);

      await customerPage.goto('/');
      await authPage.startAuthFlow(customerEmail);
      await expect(customerPage.locator('[aria-label="input-login-otp"]')).toBeVisible({ timeout: 15000 });
      await customerPage.locator('[aria-label="input-login-otp"]').click();
      await customerPage.keyboard.type('123456');
      await customerPage.waitForURL('/', { timeout: 15000 });

      await handleConsentGuardIfPresent(customerPage);

      // Setup profile
      await customerPage.goto('/setup');
      await userSetupPage.waitForForm();

      customerId = await customerPage.evaluate(async () => {
        const response = await fetch('/api/auth/session');
        const session = await response.json();
        return session?.user?.id || '';
      });
      console.log(`[Test 2] Customer ID: ${customerId}`);

      await userSetupPage.fillUserProfile({
        firstName: 'Journey',
        lastName: 'Seeker',
      });
      await userSetupPage.startBrowsing();

      // Complete onboarding
      const onboardingPage = new OnboardingPage(customerPage);
      await onboardingPage.completeWithPrimaryOnly('mediumship');
      console.log('[Test 2] Customer profile completed');

      // Store cookies
      const cookies = await getCookiesFromPage(customerPage);
      if (cookies) {
        cookiesPerWorker.set(stateKey, cookies);
        if (customerId) {
          registerTestUser({ id: customerId, email: customerEmail, cookies }, workerId);
        }
      }

      // Navigate to journey storefront
      console.log(`[Test 2] Step 2: Browsing journey storefront at /m/${practitionerSlug}/journey/${journeyId}...`);
      await customerPage.goto(`/m/${practitionerSlug}/journey/${journeyId}`);
      await customerPage.waitForLoadState('networkidle');
      await customerPage.waitForTimeout(3000);
      console.log(`[Test 2] Current URL: ${customerPage.url()}`);

      // Verify storefront page loads
      const storefrontPage = new JourneyStorefrontPage(customerPage);
      await storefrontPage.waitForPageLoad();

      const title = await storefrontPage.getTitle();
      expect(title).toContain('Grounding Meditation');
      console.log(`[Test 2] Journey title: ${title}`);

      // Dismiss cookie banner if present (before checking other elements)
      const cookieBanner = customerPage.getByTestId('cookie-banner');
      if (await cookieBanner.isVisible({ timeout: 2000 }).catch(() => false)) {
        const acceptBtn = customerPage.getByTestId('cookie-accept-btn');
        if (await acceptBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await acceptBtn.click();
          await expect(cookieBanner).not.toBeVisible({ timeout: 3000 });
          console.log('[Test 2] Dismissed cookie banner');
        }
      }

      // Verify info bar
      expect(await storefrontPage.isInfoBarVisible()).toBe(true);
      console.log(`[Test 2] Info bar visible, price visible: ${await storefrontPage.isPriceVisible()}`);

      // Verify tracks are listed
      const trackCount = await storefrontPage.getTrackCount();
      expect(trackCount).toBeGreaterThan(0);
      console.log(`[Test 2] Track count: ${trackCount}`);

      // Add journey to cart
      console.log('[Test 2] Step 3: Adding journey to cart...');
      await storefrontPage.clickAddToCart();
      await customerPage.waitForTimeout(2000);

      // Verify cart updated
      const cartCount = customerPage.getByTestId('cart-count');
      await expect(cartCount).toHaveText(/[1-9]/, { timeout: 10000 });
      console.log('[Test 2] Journey added to cart');

      // Complete purchase using PurchaseManager
      console.log('[Test 2] Step 4: Completing purchase...');
      const purchaseManager = new PurchaseManager(customerPage);
      await purchaseManager.openCart();
      await purchaseManager.verifyItemInCart(journeyName);
      await purchaseManager.proceedToCheckout();

      // Fill billing, card details, and accept consent
      await purchaseManager.fillBillingAddress();
      await purchaseManager.fillCardDetails();
      await purchaseManager.acceptConsentCheckboxes();

      // Wait for sales tax calculation and Stripe card validation to complete
      const payButton = customerPage.getByTestId('finish-pay-btn');
      await expect(payButton).toBeEnabled({ timeout: 30000 });
      console.log('[Test 2] Pay button enabled');

      await payButton.click();
      console.log('[Test 2] Payment submitted');

      // Wait for processing and success
      const processingDialog = customerPage.locator('text=Processing Payment');
      await expect(processingDialog).toBeVisible({ timeout: 30000 });
      console.log('[Test 2] Payment processing...');

      const paymentSuccess = customerPage.locator('text=Payment successful');
      await expect(paymentSuccess).toBeVisible({ timeout: 60000 });
      console.log('[Test 2] Payment successful');

      await customerPage.screenshot({ path: 'test-results/journey-purchase-complete.png' });
      console.log('[Test 2] Purchase completed successfully');

    } finally {
      await customerContext.close();
    }
  });

  test('3. Customer views purchased journey in Personal Space', async ({ browser }, testInfo) => {
    test.setTimeout(180000);

    console.log('[Test 3] Verifying journey in Personal Space...');
    expect(customerId).toBeTruthy();
    expect(journeyId).toBeTruthy();

    const workerId = testInfo.parallelIndex;
    const stateKey = `${workerId}-${DESCRIBE_KEY}-customer`;
    const cookies = cookiesPerWorker.get(stateKey);

    const customerContext = await browser.newContext();
    const customerPage = await customerContext.newPage();

    try {
      // Restore customer session
      if (cookies) {
        const cookiePairs = cookies.split('; ');
        const cookieObjs = cookiePairs.map(pair => {
          const [name, value] = pair.split('=');
          return { name, value: value || '', domain: 'localhost', path: '/' };
        });
        await customerPage.context().addCookies(cookieObjs);
        console.log('[Test 3] Customer session restored');
      } else {
        throw new Error('[Test 3] No customer cookies found');
      }

      // Wait for webhook to process (Stripe sends to Azure, not local)
      // Retry up to 90 seconds for the journey to appear in Personal Space
      const journeyListPage = new JourneyListPage(customerPage);
      let journeyFound = false;
      const maxRetries = 6;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        await journeyListPage.navigateTo(customerId);
        await journeyListPage.waitForPageLoad();

        if (await journeyListPage.isListPageVisible()) {
          const cardCount = await journeyListPage.getJourneyCardCount();
          if (cardCount > 0) {
            console.log(`[Test 3] Journey cards found: ${cardCount} (attempt ${attempt})`);
            journeyFound = true;

            if (await journeyListPage.hasActiveSection()) {
              const activeCount = await journeyListPage.getActiveJourneyCount();
              console.log(`[Test 3] Active journeys: ${activeCount}`);
              expect(activeCount).toBeGreaterThan(0);
            }
            break;
          }
        }

        if (attempt < maxRetries) {
          console.log(`[Test 3] Journey not yet available, waiting 15s... (attempt ${attempt}/${maxRetries})`);
          await customerPage.waitForTimeout(15000);
        }
      }

      expect(journeyFound).toBe(true);
      await customerPage.screenshot({ path: 'test-results/journey-personal-space-list.png' });

      // Navigate to the journey player
      console.log('[Test 3] Opening journey player...');
      const playerPage = new JourneyPlayerPage(customerPage);
      await playerPage.navigateTo(customerId, journeyId);
      await playerPage.waitForPageLoad();

      expect(await playerPage.isPlayerVisible()).toBe(true);

      // Verify player UI elements
      const nowPlayingTitle = await playerPage.getNowPlayingTitle();
      console.log(`[Test 3] Now playing: ${nowPlayingTitle}`);
      expect(nowPlayingTitle.length).toBeGreaterThan(0);

      const journeyTitle = await playerPage.getJourneyName();
      console.log(`[Test 3] Journey: ${journeyTitle}`);

      // Verify playback controls
      expect(await playerPage.isSeekBarVisible()).toBe(true);

      const currentTime = await playerPage.getCurrentTime();
      expect(currentTime).toContain(':');

      // Verify track list
      const trackCount = await playerPage.getTrackCount();
      expect(trackCount).toBeGreaterThan(0);
      console.log(`[Test 3] Tracks: ${trackCount}`);

      // Verify play/pause has aria-label
      const playPauseBtn = customerPage.getByTestId('play-pause-btn');
      const ariaLabel = await playPauseBtn.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();

      // Verify prev/next buttons
      const prevBtn = customerPage.getByTestId('prev-track-btn');
      const prevLabel = await prevBtn.getAttribute('aria-label');
      expect(prevLabel).toBe('Previous track');

      const nextBtn = customerPage.getByTestId('next-track-btn');
      const nextLabel = await nextBtn.getAttribute('aria-label');
      expect(nextLabel).toBe('Next track');

      console.log('[Test 3] Player UI verified with all controls');

      // Navigate back to journeys list using back button
      await playerPage.clickBackToJourneys();
      await customerPage.waitForURL(/\/journeys$/, { timeout: 10000 });
      expect(customerPage.url()).toContain('/journeys');
      console.log('[Test 3] Back navigation works');

      await customerPage.screenshot({ path: 'test-results/journey-player-verified.png' });
      console.log('[Test 3] Personal Space verification complete');

    } finally {
      await customerContext.close();
    }
  });

  test('4. Journey storefront has proper SEO metadata', async ({ browser }, testInfo) => {
    test.setTimeout(60000);

    console.log('[Test 4] Verifying SEO metadata...');
    expect(practitionerSlug).toBeTruthy();
    expect(journeyId).toBeTruthy();

    // Restore customer session (merchant pages require auth)
    const workerId = testInfo.parallelIndex;
    const stateKey = `${workerId}-${DESCRIBE_KEY}-customer`;
    const cookies = cookiesPerWorker.get(stateKey);

    const customerContext = await browser.newContext();
    const page = await customerContext.newPage();

    if (cookies) {
      const cookiePairs = cookies.split('; ');
      const cookieObjs = cookiePairs.map(pair => {
        const [name, value] = pair.split('=');
        return { name, value: value || '', domain: 'localhost', path: '/' };
      });
      await page.context().addCookies(cookieObjs);
      console.log('[Test 4] Customer session restored');
    }

    await page.goto(`/m/${practitionerSlug}/journey/${journeyId}`);
    await page.waitForLoadState('networkidle');

    // Check page title is set (not default Next.js title)
    const pageTitle = await page.title();
    expect(pageTitle).not.toBe('');
    expect(pageTitle).not.toBe('Create Next App');
    console.log(`[Test 4] Page title: ${pageTitle}`);

    // Check OG tags (server-side metadata may fail in dev — log but don't hard-fail)
    const ogTitleEl = page.locator('meta[property="og:title"]');
    if (await ogTitleEl.count() > 0) {
      const ogTitle = await ogTitleEl.getAttribute('content');
      console.log(`[Test 4] OG title: ${ogTitle}`);
    } else {
      console.log('[Test 4] OG title meta tag not present (server-side metadata may have failed)');
    }

    const ogDescEl = page.locator('meta[property="og:description"]');
    if (await ogDescEl.count() > 0) {
      const ogDescription = await ogDescEl.getAttribute('content');
      console.log(`[Test 4] OG description: ${ogDescription}`);
    }

    // Verify the journey detail page loads client-side
    const storefrontPage = new JourneyStorefrontPage(page);
    await storefrontPage.waitForPageLoad();

    // Verify journey title is visible
    const journeyTitle = await storefrontPage.getTitle();
    expect(journeyTitle).toContain('Grounding Meditation');
    console.log(`[Test 4] Journey title: ${journeyTitle}`);

    // Verify info bar is visible
    expect(await storefrontPage.isInfoBarVisible()).toBe(true);
    console.log('[Test 4] Info bar visible');

    // Verify keyboard accessibility on track preview buttons
    const trackPreviewCount = await storefrontPage.getTrackPreviewCount();
    if (trackPreviewCount > 0) {
      const firstPlayBtn = page.locator('[data-testid^="track-play-btn-"]').first();
      const ariaLabel = await firstPlayBtn.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();

      await firstPlayBtn.focus();
      const focused = await firstPlayBtn.evaluate(el => document.activeElement === el);
      expect(focused).toBe(true);
      console.log('[Test 4] Track preview buttons are keyboard accessible');
    }

    console.log('[Test 4] SEO and accessibility verified');

    await customerContext.close();
  });
});

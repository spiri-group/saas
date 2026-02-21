import { test, expect } from '@playwright/test';
import { ReadingRequestPage } from '../pages/ReadingRequestPage';
import { SpiriReadingsPage } from '../pages/SpiriReadingsPage';
import { PractitionerSetupPage } from '../pages/PractitionerSetupPage';
import { AuthPage } from '../pages/AuthPage';
import { UserSetupPage } from '../pages/UserSetupPage';
import { OnboardingPage } from '../pages/OnboardingPage';
import { TEST_CONFIG } from '../fixtures/test-config';
import { handleConsentGuardIfPresent } from '../utils/test-helpers';
import {
  clearTestEntityRegistry,
  registerTestUser,
  getCookiesFromPage,
  cleanupTestUsers,
  cleanupTestPractitioners,
  completeStripeTestOnboarding,
} from '../utils/test-cleanup';

/**
 * SpiriReading E2E — Full Customer Journey (Sequential)
 *
 * Single test covering the complete lifecycle:
 * 1. Practitioner signs up + Stripe onboarding
 * 2. User signs up + creates a reading request (3-step wizard + payment)
 * 3. Practitioner sees request → claims → fulfills
 * 4. User views completed reading + leaves review
 * 5. Symbol dictionary verification
 */

// Per-worker cleanup state
const cookiesPerWorker = new Map<number, string>();
const practitionerCookiesPerWorker = new Map<number, string>();

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

  const userCookies = cookiesPerWorker.get(workerId);
  if (userCookies) {
    try {
      await cleanupTestUsers(userCookies, workerId);
    } catch (error) {
      console.error('[Cleanup] Error cleaning up users:', error);
    } finally {
      cookiesPerWorker.delete(workerId);
    }
  }

  clearTestEntityRegistry(workerId);
});

function generateUniqueEmail(prefix: string, testInfo: { parallelIndex: number }): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${testInfo.parallelIndex}-${randomSuffix}@playwright.com`;
}

test.describe('SpiriReading', () => {
  test('full customer journey: request → claim → fulfill → review', async ({ browser }, testInfo) => {
    test.setTimeout(480000); // 8 minutes

    const userContext = await browser.newContext();
    const practitionerContext = await browser.newContext();
    const userPage = await userContext.newPage();
    const practitionerPage = await practitionerContext.newPage();

    try {
      // ================================================================
      // PHASE 1: Practitioner signs up + Stripe onboarding
      // ================================================================
      console.log('[E2E] Phase 1: Setting up practitioner...');

      const practitionerSetupPage = new PractitionerSetupPage(practitionerPage);
      const spiriReadingsPage = new SpiriReadingsPage(practitionerPage);
      const practitionerEmail = generateUniqueEmail('e2e-practitioner', testInfo);
      const practitionerSlug = await practitionerSetupPage.createPractitioner(practitionerEmail, 'E2E Reader', testInfo);

      const practitionerCookies = await getCookiesFromPage(practitionerPage);
      if (practitionerCookies) practitionerCookiesPerWorker.set(testInfo.parallelIndex, practitionerCookies);

      console.log(`[E2E] ✓ Practitioner created: ${practitionerSlug}`);

      // Complete Stripe onboarding so practitioner can receive payments
      const practitionerId = await getPractitionerIdAndCompleteOnboarding(practitionerPage, practitionerSlug, practitionerCookies!);
      console.log('[E2E] ✓ Stripe onboarding complete');

      // ================================================================
      // PHASE 2: User signs up + creates reading request
      // ================================================================
      console.log('[E2E] Phase 2: Setting up user and creating reading request...');

      const readingRequestPage = new ReadingRequestPage(userPage);
      const authPage = new AuthPage(userPage);
      const setupPage = new UserSetupPage(userPage);
      const onboardingPage = new OnboardingPage(userPage);

      // --- User signup via unified /setup flow ---
      const testEmail = TEST_CONFIG.TEST_EMAIL;
      let testUserId = '';

      await userPage.goto('/');
      await authPage.startAuthFlow(testEmail);
      await expect(userPage.locator('[aria-label="input-login-otp"]')).toBeVisible({ timeout: 15000 });
      await userPage.locator('[aria-label="input-login-otp"]').click();
      await userPage.keyboard.type('123456');
      await userPage.waitForURL('/', { timeout: 15000 });

      // Handle site-level ConsentGuard if present
      await handleConsentGuardIfPresent(userPage);

      // Navigate to unified setup page
      await userPage.goto('/setup');
      await setupPage.waitForForm();

      // Get user ID from session for cleanup
      testUserId = await userPage.evaluate(async () => {
        const response = await fetch('/api/auth/session');
        const session = await response.json();
        return session?.user?.id || '';
      });

      const cookies = await getCookiesFromPage(userPage);
      if (testUserId) {
        registerTestUser({ id: testUserId, email: testEmail, cookies }, testInfo.parallelIndex);
      }
      if (cookies) cookiesPerWorker.set(testInfo.parallelIndex, cookies);

      // Fill basic details and click "Start Your Journey"
      await setupPage.fillUserProfile({ firstName: 'Test', lastName: 'Reader' });
      await setupPage.startBrowsing();

      // Complete onboarding (spiritual interest selection)
      await onboardingPage.completeWithPrimaryOnly('mediumship');

      console.log(`[E2E] ✓ User created: ${testUserId}`);

      // --- Create reading request via wizard ---
      await readingRequestPage.goto(testUserId);
      await readingRequestPage.openSpiriReadingDialog();
      await readingRequestPage.waitForPageLoad();

      // Step 1: Category
      await readingRequestPage.selectCategory('TAROT');
      await readingRequestPage.goToStep2();

      // Step 2: Topic + context
      const uniqueTopic = `E2E Journey ${Date.now()}`;
      await readingRequestPage.selectTopic('other');
      await readingRequestPage.setCustomTopic(uniqueTopic);
      await readingRequestPage.setContext('Automated E2E test reading request');

      // Step 3: Spread + payment
      await readingRequestPage.goToStep3();
      await readingRequestPage.selectSpread('SINGLE');
      await readingRequestPage.waitForPaymentMethodSection();

      await readingRequestPage.submitRequest();
      await readingRequestPage.waitForCheckoutView();
      await readingRequestPage.fillStripePaymentElement();
      await readingRequestPage.savePaymentMethod();

      // Wait for payment to process
      let paymentCompleted = false;
      for (let i = 0; i < 10; i++) {
        await userPage.waitForTimeout(1000);
        const dialogVisible = await userPage.locator('[data-testid="checkout-view"]').isVisible().catch(() => false);
        if (!dialogVisible) {
          paymentCompleted = true;
          break;
        }
      }

      console.log(`[E2E] ✓ Reading request created (payment completed: ${paymentCompleted})`);

      // Verify reading appears in My Readings and extract its ID
      await readingRequestPage.navigateToAllReadings(testUserId);
      await readingRequestPage.waitForAllReadingsPage();

      let readingRequestId: string | null = null;
      for (let i = 0; i < 5; i++) {
        if (i > 0) {
          await userPage.reload();
          await userPage.waitForTimeout(2000);
        }
        const ourReading = userPage.locator(`[data-testid^="reading-spiri-reading-"]:has-text("${uniqueTopic}")`);
        const isVisible = await ourReading.isVisible({ timeout: 3000 }).catch(() => false);
        if (isVisible) {
          const testIdAttr = await ourReading.getAttribute('data-testid');
          readingRequestId = testIdAttr?.replace('reading-spiri-reading-', '') || null;
          console.log(`[E2E] ✓ Reading visible in My Readings: ${readingRequestId}`);
          break;
        }
      }
      expect(readingRequestId).not.toBeNull();

      // The Stripe setup_intent.succeeded webhook fires to the deployed Azure Functions
      // dev endpoint, which transitions the request from PENDING_PAYMENT → AWAITING_CLAIM.
      // We wait for this in the Request Bank retry loop below.

      // ================================================================
      // PHASE 3: Practitioner claims and fulfills
      // ================================================================
      console.log('[E2E] Phase 3: Practitioner claiming and fulfilling (waiting for Stripe webhook)...');

      await practitionerPage.goto(`/p/${practitionerSlug}/manage/readings`);
      await expect(practitionerPage).toHaveURL(new RegExp(`/p/${practitionerSlug}/manage/readings`));

      // Verify page loaded with tabs
      await expect(practitionerPage.locator('[data-testid="tab-request-bank"]')).toBeVisible({ timeout: 10000 });
      await expect(practitionerPage.locator('[data-testid="tab-my-claims"]')).toBeVisible();

      // Switch to My Claims to verify it's empty initially
      await practitionerPage.locator('[data-testid="tab-my-claims"]').click();
      await expect(practitionerPage.locator('[data-testid="empty-claimed-requests"]')).toBeVisible();

      // Switch back to Request Bank
      await practitionerPage.locator('[data-testid="tab-request-bank"]').click();

      // Search for the user's request
      let requestId: string | null = null;
      const searchInput = practitionerPage.locator('[data-testid="request-bank-search"]');

      // Wait for Stripe webhook to transition request to AWAITING_CLAIM.
      // Stripe typically delivers webhooks within seconds, but Azure Functions
      // cold start can add 5-15s. We retry up to 20 times (3s apart = ~60s max).
      for (let i = 0; i < 20; i++) {
        if (i > 0) {
          await practitionerPage.reload();
          await practitionerPage.waitForTimeout(3000);
          // Re-click Request Bank tab after reload
          await practitionerPage.locator('[data-testid="tab-request-bank"]').click();
          await practitionerPage.waitForTimeout(1000);
        }

        await searchInput.waitFor({ state: 'visible', timeout: 5000 });
        await searchInput.fill(uniqueTopic);
        await practitionerPage.waitForTimeout(500);

        const requestWithTopic = practitionerPage.locator(`[data-testid^="available-request-"]:has-text("${uniqueTopic}")`);
        const isVisible = await requestWithTopic.isVisible({ timeout: 3000 }).catch(() => false);

        if (isVisible) {
          const testIdAttr = await requestWithTopic.getAttribute('data-testid');
          requestId = testIdAttr?.replace('available-request-', '') || null;
          console.log(`[E2E] ✓ Found request in Request Bank (attempt ${i + 1}): ${requestId}`);
          break;
        }
        console.log(`[E2E] Waiting for webhook... request not in Request Bank yet (attempt ${i + 1}/20)`);
      }
      expect(requestId).not.toBeNull();

      // Claim the request
      const claimButtonText = await spiriReadingsPage.getClaimButtonText(requestId!);
      expect(claimButtonText).toContain('Claim');

      await spiriReadingsPage.claimRequest(requestId!);
      await practitionerPage.waitForTimeout(3000);

      // Check for claim errors
      const hasError = await spiriReadingsPage.isClaimErrorVisible();
      if (hasError) {
        const errorMsg = await spiriReadingsPage.getClaimErrorMessage();
        await spiriReadingsPage.dismissClaimError();
        throw new Error(`Claim failed: ${errorMsg}`);
      }

      // Verify claim appears in My Claims
      await spiriReadingsPage.clickMyClaimsTab();
      await practitionerPage.waitForTimeout(1000);

      const claimedRequest = practitionerPage.locator(`[data-testid="claimed-request-${requestId}"]`);
      let claimVisible = await claimedRequest.isVisible({ timeout: 5000 }).catch(() => false);
      if (!claimVisible) {
        await practitionerPage.reload();
        await practitionerPage.waitForTimeout(2000);
        await spiriReadingsPage.clickMyClaimsTab();
        await practitionerPage.waitForTimeout(1000);
      }
      await expect(claimedRequest).toBeVisible({ timeout: 10000 });
      console.log('[E2E] ✓ Request claimed — visible in My Claims');

      // Verify shotclock
      const deadlineText = claimedRequest.locator('text=/left to fulfill|Deadline expired/i');
      await expect(deadlineText).toBeVisible();

      // Open fulfillment dialog and fill form
      await spiriReadingsPage.clickFulfillRequest(requestId!);
      await spiriReadingsPage.waitForFulfillmentDialog();

      // Verify validation — submit disabled when empty
      expect(await spiriReadingsPage.isSubmitFulfillmentEnabled()).toBe(false);

      await spiriReadingsPage.setCardName(0, 'The Magician');
      await spiriReadingsPage.setCardInterpretation(0, 'You have all the tools you need.');
      await spiriReadingsPage.setOverallMessage('E2E test reading complete.');

      // Submit still disabled without photo
      expect(await spiriReadingsPage.isSubmitFulfillmentEnabled()).toBe(false);

      // Upload test image
      await spiriReadingsPage.uploadSpreadPhoto();

      // Now submit should be enabled
      expect(await spiriReadingsPage.isSubmitFulfillmentEnabled()).toBe(true);

      // Submit fulfillment (payment captured on fulfillment)
      await spiriReadingsPage.submitFulfillment();
      await practitionerPage.waitForTimeout(5000);

      // Check for fulfillment errors
      const fulfillmentError = practitionerPage.locator('[role="alert"]:has-text("Payment"), [role="dialog"]:has-text("failed")');
      const hasFulfillmentError = await fulfillmentError.isVisible({ timeout: 3000 }).catch(() => false);
      if (hasFulfillmentError) {
        const errorText = await fulfillmentError.textContent().catch(() => 'Unknown error');
        throw new Error(`Payment failed during fulfillment: ${errorText}`);
      }

      console.log('[E2E] ✓ Reading fulfilled');

      // Verify claim removed from My Claims
      await spiriReadingsPage.clickMyClaimsTab();
      const emptyClaimsState = practitionerPage.locator('[data-testid="empty-claimed-requests"]');
      const claimsLoaded = practitionerPage.locator('[data-testid^="claimed-request-"]').first();
      await expect(emptyClaimsState.or(claimsLoaded)).toBeVisible({ timeout: 10000 });

      let isStillInClaims = await practitionerPage.locator(`[data-testid="claimed-request-${requestId}"]`).isVisible({ timeout: 2000 }).catch(() => false);
      if (isStillInClaims) {
        await practitionerPage.reload();
        await practitionerPage.waitForLoadState('networkidle');
        await spiriReadingsPage.clickMyClaimsTab();
        await expect(emptyClaimsState.or(claimsLoaded)).toBeVisible({ timeout: 10000 });
        isStillInClaims = await practitionerPage.locator(`[data-testid="claimed-request-${requestId}"]`).isVisible({ timeout: 2000 }).catch(() => false);
      }
      expect(isStillInClaims).toBe(false);
      console.log('[E2E] ✓ Fulfilled request removed from My Claims');

      // ================================================================
      // PHASE 4: User views completed reading
      // ================================================================
      console.log('[E2E] Phase 4: User viewing completed reading...');

      await readingRequestPage.navigateToAllReadings(testUserId);
      await readingRequestPage.waitForAllReadingsPage();

      let foundCompleted = false;
      for (let i = 0; i < 5; i++) {
        if (i > 0) {
          await userPage.reload();
          await userPage.waitForTimeout(2000);
        }

        const ourReading = userPage.locator(`[data-testid^="reading-spiri-reading-"]:has-text("${uniqueTopic}")`);
        const isVisible = await ourReading.isVisible({ timeout: 3000 }).catch(() => false);

        if (isVisible) {
          const hasCompletedStatus = await ourReading.locator('text=Completed').or(ourReading.locator('text=Fulfilled')).isVisible({ timeout: 2000 }).catch(() => false);
          const hasViewButton = await ourReading.locator('[data-testid="view-reading-button"]').isVisible({ timeout: 2000 }).catch(() => false);

          if (hasCompletedStatus || hasViewButton) {
            foundCompleted = true;
            console.log(`[E2E] ✓ Reading shows completed (attempt ${i + 1})`);
            break;
          }
        }
        console.log(`[E2E] Reading not completed yet, retry ${i + 1}/5...`);
      }
      expect(foundCompleted).toBe(true);

      // Open reading detail
      const ourReadingCard = userPage.locator(`[data-testid^="reading-spiri-reading-"]:has-text("${uniqueTopic}")`);
      const viewButton = ourReadingCard.locator('[data-testid="view-reading-button"]');
      await expect(viewButton).toBeVisible({ timeout: 5000 });
      await viewButton.click();
      await expect(userPage.locator('[role="dialog"]:has-text("Your Reading")').first()).toBeVisible({ timeout: 5000 });

      // Verify reading content
      await expect(userPage.locator('text=The Magician')).toBeVisible({ timeout: 3000 });
      await expect(userPage.locator('text=You have all the tools you need')).toBeVisible({ timeout: 3000 });
      await expect(userPage.locator('text=E2E test reading complete')).toBeVisible({ timeout: 3000 });

      // Verify auto-extracted symbols
      const symbolsSection = userPage.locator('text=Symbols in this card');
      await expect(symbolsSection).toBeVisible({ timeout: 5000 });

      const hasManif = await userPage.locator('span:has-text("manifestation")').isVisible({ timeout: 2000 }).catch(() => false);
      const hasPower = await userPage.locator('span:has-text("power")').isVisible({ timeout: 2000 }).catch(() => false);
      expect(hasManif || hasPower).toBe(true);

      console.log('[E2E] ✓ All reading content verified');

      // ================================================================
      // PHASE 5: User leaves a review
      // ================================================================
      console.log('[E2E] Phase 5: User leaving review...');

      if (await readingRequestPage.isLeaveReviewButtonVisible()) {
        await readingRequestPage.clickLeaveReview();
        await readingRequestPage.setReviewRating(5);
        await readingRequestPage.setReviewHeadline('Amazing reading experience!');
        await readingRequestPage.setReviewText('This was an incredibly insightful reading. The reader really understood my question.');

        expect(await readingRequestPage.isSubmitReviewEnabled()).toBe(true);
        await readingRequestPage.submitReview();
        await userPage.waitForTimeout(3000);

        expect(await readingRequestPage.isReviewDisplayed()).toBe(true);
        await expect(userPage.locator('text=Amazing reading experience!')).toBeVisible();
        console.log('[E2E] ✓ Review submitted and displayed');
      } else {
        console.log('[E2E] ⚠ Leave a Review button not visible');
      }

      await readingRequestPage.closeReadingDetail();

      // ================================================================
      // PHASE 6: Symbol dictionary verification
      // ================================================================
      console.log('[E2E] Phase 6: Verifying symbol dictionary...');

      // Query symbols via GraphQL
      const symbolDictionaryCheck = await userPage.evaluate(async (userId: string) => {
        const response = await fetch('/api/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `query GetPersonalSymbols($userId: ID!) {
              personalSymbols(userId: $userId) {
                symbolName
                readingOccurrences
                totalOccurrences
              }
            }`,
            variables: { userId }
          })
        });
        const data = await response.json();
        return data.data?.personalSymbols || [];
      }, testUserId);

      const magicianSymbols = ['manifestation', 'power', 'skill', 'willpower', 'action'];
      const foundSymbols = symbolDictionaryCheck.filter((s: { symbolName: string }) =>
        magicianSymbols.includes(s.symbolName.toLowerCase())
      );
      expect(foundSymbols.length).toBeGreaterThan(0);
      console.log(`[E2E] ✓ Symbol dictionary has ${foundSymbols.length} symbols from The Magician`);

      const hasReadingOccurrence = foundSymbols.some((s: { readingOccurrences: number }) => s.readingOccurrences > 0);
      expect(hasReadingOccurrence).toBe(true);

      // Verify in UI
      await userPage.goto(`/u/${testUserId}/space/symbols/dictionary`);
      await userPage.waitForLoadState('networkidle');
      await userPage.waitForTimeout(2000);

      const dictionaryHeader = userPage.locator('h1:has-text("Symbol Dictionary"), h1:has-text("Your Symbols")');
      await expect(dictionaryHeader).toBeVisible({ timeout: 10000 });

      let foundSymbolInUI = false;
      for (const symbolName of magicianSymbols) {
        const symbolElement = userPage.locator(`text=${symbolName}`).first();
        if (await symbolElement.isVisible({ timeout: 1000 }).catch(() => false)) {
          foundSymbolInUI = true;
          console.log(`[E2E] ✓ Found symbol "${symbolName}" in Symbol Dictionary UI`);
          break;
        }
      }
      expect(foundSymbolInUI).toBe(true);

      console.log('[E2E] ✅ Full customer journey complete');

    } finally {
      await userContext.close();
      await practitionerContext.close();
    }
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getPractitionerIdAndCompleteOnboarding(
  page: import('@playwright/test').Page,
  practitionerSlug: string,
  cookies: string
): Promise<string> {
  const practitionerId = await page.evaluate(async (slug: string) => {
    const response = await fetch('/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query GetVendorId($slug: String!) {
          vendorIdFromSlug(slug: $slug) {
            merchantId
          }
        }`,
        variables: { slug }
      })
    });
    const data = await response.json();
    return data.data?.vendorIdFromSlug?.merchantId;
  }, practitionerSlug);

  if (!practitionerId) {
    throw new Error(`Could not get practitioner ID for slug: ${practitionerSlug}`);
  }

  const onboardingResult = await completeStripeTestOnboarding(practitionerId, cookies);
  if (!onboardingResult.success) {
    throw new Error(`Stripe onboarding failed: ${onboardingResult.message}`);
  }

  return practitionerId;
}

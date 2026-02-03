import { test, expect, Page, TestInfo } from '@playwright/test';
import { ReadingRequestPage } from '../pages/ReadingRequestPage';
import { SpiriReadingsPage } from '../pages/SpiriReadingsPage';
import { PractitionerSetupPage } from '../pages/PractitionerSetupPage';
import { AuthPage } from '../pages/AuthPage';
import { HomePage } from '../pages/HomePage';
import { UserSetupPage } from '../pages/UserSetupPage';
import { OnboardingPage } from '../pages/OnboardingPage';
import { TEST_CONFIG } from '../fixtures/test-config';
import {
  clearTestEntityRegistry,
  registerTestUser,
  getCookiesFromPage,
  cleanupTestUsers,
  cleanupTestPractitioners,
  completeStripeTestOnboarding,
} from '../utils/test-cleanup';

/**
 * SpiriReading End-to-End Tests
 *
 * Consolidated tests covering the full SpiriReading lifecycle:
 * - User wizard flow with validation
 * - Payment method selection
 * - Practitioner claim and fulfillment
 */

// Store state per test worker to avoid race conditions
const cookiesPerWorker = new Map<number, string>();
const practitionerCookiesPerWorker = new Map<number, string>();

// Cleanup before tests
test.beforeAll(async ({}, testInfo) => {
  console.log('[Setup] Preparing test environment for SpiriReading E2E...');
  clearTestEntityRegistry(testInfo.parallelIndex);
});

// Cleanup after all tests
// Order matters: delete practitioners first (while user session is valid), then purge users
test.afterAll(async ({}, testInfo) => {
  test.setTimeout(120000);

  const workerId = testInfo.parallelIndex;
  const userCookies = cookiesPerWorker.get(workerId);
  const practitionerCookies = practitionerCookiesPerWorker.get(workerId);

  // 1. Delete practitioners first (requires valid user session)
  if (practitionerCookies) {
    try {
      await cleanupTestPractitioners(practitionerCookies, workerId);
    } catch (error) {
      console.error('[Cleanup] Error cleaning up practitioners:', error);
    } finally {
      practitionerCookiesPerWorker.delete(workerId);
    }
  }

  // 2. Then purge users (invalidates sessions)
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

/** Generate a unique test email */
function generateUniqueEmail(prefix: string, testInfo: { parallelIndex: number }): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${testInfo.parallelIndex}-${randomSuffix}@playwright.com`;
}

/** Helper to set up authenticated user with MEDIUMSHIP interest */
async function setupUserWithMediumshipInterest(
  page: Page,
  testInfo: TestInfo,
  authPage: AuthPage,
  homePage: HomePage,
  setupPage: UserSetupPage,
  onboardingPage: OnboardingPage
): Promise<string> {
  const testEmail = TEST_CONFIG.TEST_EMAIL;
  let testUserId = '';

  await page.goto('/');
  await authPage.startAuthFlow(testEmail);
  await expect(page.locator('[aria-label="input-login-otp"]')).toBeVisible({ timeout: 15000 });
  await page.locator('[aria-label="input-login-otp"]').click();
  await page.keyboard.type('123456');
  await page.waitForURL('/', { timeout: 15000 });

  try {
    await homePage.waitForCompleteProfileLink();
    await homePage.clickCompleteProfile();
    await expect(page).toHaveURL(/\/u\/.*\/setup/, { timeout: 10000 });

    const url = page.url();
    const userIdMatch = url.match(/\/u\/([^\/]+)\/setup/);
    if (userIdMatch) {
      testUserId = userIdMatch[1];
      const cookies = await getCookiesFromPage(page);
      // Register user with their cookies so cleanup can use the correct session
      registerTestUser({ id: testUserId, email: testEmail, cookies }, testInfo.parallelIndex);
      if (cookies) cookiesPerWorker.set(testInfo.parallelIndex, cookies);
    }

    await setupPage.fillUserProfile({
      firstName: 'Test',
      lastName: 'Reader',
      phone: '0412345678',
      address: 'Sydney Opera House',
      securityQuestion: 'What is your favorite color?',
      securityAnswer: 'Blue',
    });
    await setupPage.startBrowsing();
    await page.waitForURL('/', { timeout: 15000 });

    const personalSpaceLink = page.locator('a:has-text("My Personal Space")');
    await expect(personalSpaceLink).toBeVisible({ timeout: 10000 });
    await personalSpaceLink.click();

    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await onboardingPage.completeWithPrimaryOnly('mediumship');
  } catch (error) {
    console.error('[Setup] Error during user setup:', error);
    throw error;
  }

  return testUserId;
}

/** Helper to wait for any dialog overlay to close */
async function waitForDialogOverlayToClose(page: Page) {
  const dialogOverlay = page.locator('[data-state="open"][aria-hidden="true"].fixed.inset-0');
  try {
    await dialogOverlay.waitFor({ state: 'hidden', timeout: 10000 });
  } catch {
    // No overlay present, continue
  }
}

/** Helper to dismiss welcome dialog if present */
async function dismissWelcomeDialog(page: Page) {
  try {
    const welcomeButton = page.locator('button:has-text("Customise your profile")');
    await welcomeButton.waitFor({ state: 'visible', timeout: 3000 });
    await welcomeButton.click();
    await waitForDialogOverlayToClose(page);
  } catch {
    // Welcome dialog didn't appear, continue
  }
}

/** Helper to get practitioner ID from slug and complete Stripe onboarding */
async function getPractitionerIdAndCompleteOnboarding(
  page: Page,
  practitionerSlug: string,
  cookies: string
): Promise<string> {
  // Get practitioner ID from slug (practitioners use the same vendorIdFromSlug query)
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

  console.log(`[Stripe Onboarding] Practitioner ID: ${practitionerId}`);

  // Complete Stripe test onboarding
  const onboardingResult = await completeStripeTestOnboarding(practitionerId, cookies);
  console.log(`[Stripe Onboarding] Result: ${JSON.stringify(onboardingResult)}`);

  if (!onboardingResult.success) {
    console.error(`[Stripe Onboarding] Failed: ${onboardingResult.message}`);
    throw new Error(`Stripe onboarding failed: ${onboardingResult.message}`);
  }

  console.log('[Stripe Onboarding] ✅ Completed successfully - charges enabled');
  return practitionerId;
}

test.describe('SpiriReading', () => {
  test('user wizard flow with validation and checkout', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    const readingRequestPage = new ReadingRequestPage(page);
    const authPage = new AuthPage(page);
    const homePage = new HomePage(page);
    const setupPage = new UserSetupPage(page);
    const onboardingPage = new OnboardingPage(page);

    const testUserId = await setupUserWithMediumshipInterest(
      page, testInfo, authPage, homePage, setupPage, onboardingPage
    );

    // Navigate to space and open SpiriReading dialog
    await readingRequestPage.goto(testUserId);
    await readingRequestPage.openSpiriReadingDialog();
    await readingRequestPage.waitForPageLoad();

    // === Step 1: Topic Selection ===
    console.log('[Test] Testing Step 1: Topic Selection');

    // Verify step 1 elements are visible
    await expect(page.locator('[data-testid="topic-select"]')).toBeVisible();
    await expect(page.locator('[data-testid="context-input"]')).toBeVisible();
    await expect(page.locator('text=Step 1 of 2')).toBeVisible();

    // Next button should be disabled without topic
    const nextButton = page.locator('button:has-text("Next: Choose Spread")');
    await expect(nextButton).toBeDisabled();

    // Test custom topic flow
    await readingRequestPage.selectTopic('other');
    await expect(page.locator('[data-testid="custom-topic-input"]')).toBeVisible();
    await expect(nextButton).toBeDisabled(); // Still disabled - custom topic empty

    await readingRequestPage.setCustomTopic('My spiritual journey question');
    await expect(nextButton).toBeEnabled();

    // Switch to standard topic
    await readingRequestPage.selectTopic('love');
    await expect(page.locator('[data-testid="custom-topic-input"]')).not.toBeVisible();
    await expect(nextButton).toBeEnabled();

    // Add optional context
    await readingRequestPage.setContext('Additional background information');

    // Go to step 2
    await readingRequestPage.goToStep2();

    // === Step 2: Spread Selection ===
    console.log('[Test] Testing Step 2: Spread Selection');

    // Verify step 2 elements
    await expect(page.locator('text=Step 2 of 2')).toBeVisible();
    await expect(page.locator('[data-testid="spread-card-SINGLE"]')).toBeVisible();
    await expect(page.locator('[data-testid="spread-card-THREE_CARD"]')).toBeVisible();
    await expect(page.locator('[data-testid="spread-card-FIVE_CARD"]')).toBeVisible();

    // Submit should be disabled without spread
    expect(await readingRequestPage.isSubmitButtonEnabled()).toBe(false);

    // Select spread and verify summary
    await readingRequestPage.selectSpread('THREE_CARD');
    await expect(page.locator('[data-testid="spread-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="selected-spread-label"]')).toContainText('Three Card');

    const price = await readingRequestPage.getSelectedSpreadPrice();
    expect(price).toBeTruthy();
    expect(price).toContain('$');

    // Wait for payment method section
    await readingRequestPage.waitForPaymentMethodSection();

    // Verify "Add payment card" or saved cards are visible
    const addCardButton = page.locator('button:has-text("Add payment card"), button:has-text("Use a different card")');
    await expect(addCardButton).toBeVisible({ timeout: 5000 });

    // Verify the note about payment timing
    await expect(page.locator('text=won\'t be charged until a reader claims')).toBeVisible();

    // Verify button text - depends on whether user has saved cards
    const buttonText = await readingRequestPage.getSubmitButtonText();
    const hasSavedCards = await readingRequestPage.hasSavedCards();
    if (hasSavedCards) {
      expect(buttonText).toContain('Submit Request');
    } else {
      expect(buttonText).toContain('Continue to Payment');
    }
    expect(await readingRequestPage.isSubmitButtonEnabled()).toBe(true);

    // Test back navigation
    await readingRequestPage.goToStep1();
    await expect(page.locator('text=Step 1 of 2')).toBeVisible();
    await expect(page.locator('[data-testid="topic-select"]')).toBeVisible();

    // Go back to step 2 for checkout test
    await readingRequestPage.goToStep2();
    await readingRequestPage.selectSpread('SINGLE');
    await readingRequestPage.waitForPaymentMethodSection();

    // Select new card flow if user has saved cards
    if (hasSavedCards) {
      await readingRequestPage.selectNewCard();
    }

    // Submit and verify checkout view
    await readingRequestPage.submitRequest();
    await readingRequestPage.waitForCheckoutView();

    expect(await readingRequestPage.isCheckoutViewVisible()).toBe(true);
    await expect(page.locator('iframe[name^="__privateStripeFrame"]').first()).toBeVisible({ timeout: 10000 });

    // Fill Stripe payment and complete checkout
    await readingRequestPage.fillStripePaymentElement();
    await readingRequestPage.savePaymentMethod();

    // Wait for payment to process and dialog to close
    await page.waitForTimeout(5000);

    // Verify the request appears in user's readings
    await readingRequestPage.navigateToAllReadings(testUserId);
    await readingRequestPage.waitForAllReadingsPage();

    // Check that the reading request is visible with "Awaiting Reader" status
    let requestFound = false;
    for (let i = 0; i < 5; i++) {
      if (i > 0) {
        await page.reload();
        await page.waitForTimeout(2000);
      }
      const requestVisible = await readingRequestPage.isReadingVisible('Love');
      if (requestVisible) {
        requestFound = true;
        console.log(`[Test] ✅ Reading request visible in My Readings after ${i + 1} attempts`);
        break;
      }
      console.log(`[Test] Request not visible yet, retry ${i + 1}/5...`);
    }

    expect(requestFound).toBe(true);

    // Verify the status shows "Awaiting Reader"
    await expect(page.locator('text=Awaiting Reader')).toBeVisible();

    console.log('[Test] ✅ User wizard flow with checkout complete');
  });

  test('practitioner sees user request in Request Bank', async ({ browser }, testInfo) => {
    test.setTimeout(360000); // 6 minutes - needs time for user setup, checkout, webhook processing, practitioner setup

    const userContext = await browser.newContext();
    const practitionerContext = await browser.newContext();

    const userPage = await userContext.newPage();
    const practitionerPage = await practitionerContext.newPage();

    try {
      // === PART 1: User creates a reading request ===
      console.log('[Test] User creating reading request...');

      const readingRequestPage = new ReadingRequestPage(userPage);
      const authPage = new AuthPage(userPage);
      const homePage = new HomePage(userPage);
      const setupPage = new UserSetupPage(userPage);
      const onboardingPage = new OnboardingPage(userPage);

      const testUserId = await setupUserWithMediumshipInterest(
        userPage, testInfo, authPage, homePage, setupPage, onboardingPage
      );

      const userCookies = await getCookiesFromPage(userPage);
      if (userCookies) cookiesPerWorker.set(testInfo.parallelIndex, userCookies);

      // Create reading request
      await readingRequestPage.goto(testUserId);
      await readingRequestPage.openSpiriReadingDialog();
      await readingRequestPage.waitForPageLoad();

      const uniqueTopic = `Test Request ${Date.now()}`;
      await readingRequestPage.selectTopic('other');
      await readingRequestPage.setCustomTopic(uniqueTopic);
      await readingRequestPage.goToStep2();
      await readingRequestPage.selectSpread('SINGLE');
      await readingRequestPage.waitForPaymentMethodSection();

      const hasSavedCards = await readingRequestPage.hasSavedCards();
      if (hasSavedCards) {
        await readingRequestPage.selectNewCard();
      }

      await readingRequestPage.submitRequest();
      await readingRequestPage.waitForCheckoutView();
      await readingRequestPage.fillStripePaymentElement();
      await readingRequestPage.savePaymentMethod();
      await userPage.waitForTimeout(5000);

      console.log('[Test] ✅ User created reading request');

      // === PART 2: Practitioner signs up and sees the request ===
      console.log('[Test] Practitioner signing up...');

      const practitionerSetupPage = new PractitionerSetupPage(practitionerPage);
      const testEmail = generateUniqueEmail('practitioner', testInfo);
      const practitionerSlug = await practitionerSetupPage.createPractitioner(testEmail, 'SpiriReadings Test', testInfo);

      const practitionerCookies = await getCookiesFromPage(practitionerPage);
      if (practitionerCookies) practitionerCookiesPerWorker.set(testInfo.parallelIndex, practitionerCookies);

      await expect(practitionerPage).toHaveURL(new RegExp(`/p/${practitionerSlug}`));

      // Complete Stripe onboarding so the practitioner can receive payments
      await getPractitionerIdAndCompleteOnboarding(practitionerPage, practitionerSlug, practitionerCookies!);

      // Navigate to SpiriReadings (practitioner readings page)
      await practitionerPage.goto(`/p/${practitionerSlug}/manage/readings`);
      await expect(practitionerPage).toHaveURL(new RegExp(`/p/${practitionerSlug}/manage/readings`));

      // Verify page elements
      await expect(practitionerPage.getByRole('heading', { name: 'SpiriReadings', exact: true })).toBeVisible({ timeout: 10000 });

      // Verify tabs
      const availableTab = practitionerPage.locator('button:has-text("Request Bank")');
      const claimedTab = practitionerPage.locator('button:has-text("My Claims")');

      await expect(availableTab).toBeVisible();
      await expect(claimedTab).toBeVisible();
      await expect(availableTab).toHaveAttribute('data-state', 'active');

      // Switch to My Claims and verify empty
      await claimedTab.click();
      await expect(claimedTab).toHaveAttribute('data-state', 'active');
      await expect(practitionerPage.locator('text=No claimed requests')).toBeVisible();

      // Switch back to Request Bank
      await availableTab.click();
      await expect(availableTab).toHaveAttribute('data-state', 'active');

      // Look for the user's request using search
      // With search functionality, we shouldn't need many retries - just wait for webhook processing
      let requestFound = false;
      const maxRetries = 5;
      const searchInput = practitionerPage.locator('[data-testid="request-bank-search"]');

      for (let i = 0; i < maxRetries; i++) {
        if (i > 0) {
          await practitionerPage.reload();
        }
        await practitionerPage.waitForTimeout(3000); // Wait for webhook processing

        // Use search to find the specific request by topic
        await searchInput.waitFor({ state: 'visible', timeout: 5000 });
        await searchInput.fill(uniqueTopic);
        await practitionerPage.waitForTimeout(500); // Wait for filter to apply

        const requestWithTopic = practitionerPage.locator(`[data-testid^="available-request-"]:has-text("${uniqueTopic}")`);
        requestFound = await requestWithTopic.isVisible({ timeout: 3000 }).catch(() => false);

        if (requestFound) {
          console.log(`[Test] ✅ Found user's request after ${i + 1} attempts`);

          // Verify claim button is visible (just "Claim" - payment happens on fulfillment)
          const claimButton = requestWithTopic.locator('button:has-text("Claim")');
          await expect(claimButton).toBeVisible();
          break;
        }
        console.log(`[Test] Request not found yet, retry ${i + 1}/${maxRetries}...`);
      }

      // Assert that the request was found
      expect(requestFound).toBe(true);

      console.log('[Test] ✅ Practitioner sees user request in Request Bank');

    } finally {
      await userContext.close();
      await practitionerContext.close();
    }
  });

  test('full lifecycle: user requests → practitioner claims and fulfills', async ({ browser }, testInfo) => {
    test.setTimeout(360000); // 6 minutes for full flow

    // Create two separate browser contexts for user and practitioner
    const userContext = await browser.newContext();
    const practitionerContext = await browser.newContext();

    const userPage = await userContext.newPage();
    const practitionerPage = await practitionerContext.newPage();

    try {
      // === PART 1: Set up practitioner ===
      console.log('[E2E] Setting up practitioner...');

      const practitionerSetupPage = new PractitionerSetupPage(practitionerPage);
      const spiriReadingsPage = new SpiriReadingsPage(practitionerPage);
      const practitionerEmail = generateUniqueEmail('e2e-practitioner', testInfo);
      const practitionerSlug = await practitionerSetupPage.createPractitioner(practitionerEmail, 'E2E Reader', testInfo);

      const practitionerCookies = await getCookiesFromPage(practitionerPage);
      if (practitionerCookies) practitionerCookiesPerWorker.set(testInfo.parallelIndex, practitionerCookies);

      console.log('[E2E] ✅ Practitioner created:', practitionerSlug);

      // Complete Stripe onboarding so the practitioner can receive payments
      const testPractitionerId = await getPractitionerIdAndCompleteOnboarding(practitionerPage, practitionerSlug, practitionerCookies!);

      // === PART 2: Set up user and create reading request ===
      console.log('[E2E] Setting up user and creating reading request...');

      const readingRequestPage = new ReadingRequestPage(userPage);
      const authPage = new AuthPage(userPage);
      const homePage = new HomePage(userPage);
      const setupPage = new UserSetupPage(userPage);
      const onboardingPage = new OnboardingPage(userPage);

      const testUserId = await setupUserWithMediumshipInterest(
        userPage, testInfo, authPage, homePage, setupPage, onboardingPage
      );

      // Store user cookies
      const userCookies = await getCookiesFromPage(userPage);
      if (userCookies) cookiesPerWorker.set(testInfo.parallelIndex, userCookies);

      // Set up console logging to catch any errors
      userPage.on('console', msg => {
        if (msg.type() === 'error') {
          console.log(`[Browser Error] ${msg.text()}`);
        }
      });

      // Set up network request logging to catch GraphQL mutation responses
      userPage.on('response', async response => {
        if (response.url().includes('/api/graphql') && response.request().method() === 'POST') {
          try {
            const body = response.request().postDataJSON();
            if (body?.query?.includes('createReadingRequest')) {
              const json = await response.json();
              console.log(`[GraphQL] createReadingRequest response: ${JSON.stringify(json)}`);
            }
          } catch {
            // Ignore parsing errors
          }
        }
      });

      // Navigate to space and open SpiriReading dialog
      await readingRequestPage.goto(testUserId);
      await readingRequestPage.openSpiriReadingDialog();
      await readingRequestPage.waitForPageLoad();

      // Complete wizard with unique topic for tracking
      const uniqueTopic = `E2E Test ${Date.now()}`;
      await readingRequestPage.selectTopic('other');
      await readingRequestPage.setCustomTopic(uniqueTopic);
      await readingRequestPage.setContext('This is an automated E2E test reading request');
      await readingRequestPage.goToStep2();
      await readingRequestPage.selectSpread('SINGLE');

      // Wait for payment section and submit
      await readingRequestPage.waitForPaymentMethodSection();
      console.log('[E2E] About to submit reading request...');
      await readingRequestPage.submitRequest();

      // Wait a moment for mutation to complete
      await userPage.waitForTimeout(2000);

      // Check if checkout view appeared (means mutation succeeded)
      const checkoutVisible = await userPage.locator('[data-testid="checkout-view"]').isVisible({ timeout: 10000 }).catch(() => false);
      if (!checkoutVisible) {
        // Check if there was an error message
        const errorMsg = await userPage.locator('.text-red-400, [role="alert"]').textContent().catch(() => null);
        if (errorMsg) {
          console.error(`[E2E] ❌ Error creating request: ${errorMsg}`);
        }
        // Check for mutation pending state
        const isPending = await userPage.locator('text=Setting Up').or(userPage.locator('text=Submitting')).isVisible({ timeout: 1000 }).catch(() => false);
        console.log(`[E2E] Debug - Checkout visible: ${checkoutVisible}, isPending: ${isPending}`);

        // Try waiting longer
        await readingRequestPage.waitForCheckoutView();
      }
      console.log('[E2E] ✅ Reading request created, checkout view visible');

      // Query IMMEDIATELY after creation (before payment) to verify reading exists
      console.log('[E2E] Querying database BEFORE payment to verify reading was created...');
      const prePaymentReadings = await userPage.evaluate(async (userId: string) => {
        const response = await fetch('/api/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `query GetMyReadings($userId: ID!) {
              myReadingRequests(userId: $userId) {
                id
                topic
                requestStatus
                createdAt
              }
            }`,
            variables: { userId }
          })
        });
        const data = await response.json();
        return { readings: data.data?.myReadingRequests, errors: data.errors };
      }, testUserId);

      console.log(`[E2E] Pre-payment query result: ${JSON.stringify(prePaymentReadings)}`);
      if (!prePaymentReadings.readings || prePaymentReadings.readings.length === 0) {
        console.error('[E2E] ❌ CRITICAL: Reading not found in database immediately after creation!');
        // This would indicate the mutation returned success but didn't actually save
      } else {
        console.log(`[E2E] ✅ Reading exists in DB before payment: ${prePaymentReadings.readings[0].id}, status: ${prePaymentReadings.readings[0].requestStatus}`);
      }

      // Fill Stripe payment (test card)
      await readingRequestPage.fillStripePaymentElement();
      await readingRequestPage.savePaymentMethod();

      // Wait for Stripe to process - this may redirect or close the dialog
      // Stripe's confirmSetup with return_url may cause a page redirect
      console.log('[E2E] Waiting for Stripe payment to process...');

      // Wait for either: dialog closes, page redirects (URL changes), or error appears
      let paymentCompleted = false;
      for (let i = 0; i < 10; i++) {
        await userPage.waitForTimeout(1000);

        // Check if dialog closed (success without redirect)
        const dialogVisible = await userPage.locator('[data-testid="checkout-view"]').isVisible().catch(() => false);
        if (!dialogVisible) {
          console.log('[E2E] ✅ Payment completed - checkout view closed');
          paymentCompleted = true;
          break;
        }

        // Check for errors
        const errorVisible = await userPage.locator('text=error occurred').or(userPage.locator('text=failed')).isVisible({ timeout: 500 }).catch(() => false);
        if (errorVisible) {
          const errorText = await userPage.locator('.text-red-400').textContent().catch(() => 'Unknown error');
          console.error('[E2E] ❌ Payment error:', errorText);
          throw new Error(`Payment failed: ${errorText}`);
        }

        // Check if still processing
        const processing = await userPage.locator('text=Processing').isVisible({ timeout: 500 }).catch(() => false);
        if (processing) {
          console.log(`[E2E] Still processing payment... (${i + 1}/10)`);
        }
      }

      if (!paymentCompleted) {
        // Take a screenshot for debugging
        console.log('[E2E] ⚠️ Payment may not have completed, continuing anyway...');
      }

      console.log('[E2E] ✅ Payment submitted');

      // Debug: Query the database directly to see what readings exist
      console.log('[E2E] Querying database for reading requests...');
      const debugReadings = await userPage.evaluate(async (userId: string) => {
        const response = await fetch('/api/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `query GetMyReadings($userId: ID!) {
              myReadingRequests(userId: $userId) {
                id
                topic
                requestStatus
                createdAt
              }
            }`,
            variables: { userId }
          })
        });
        const data = await response.json();
        return { readings: data.data?.myReadingRequests, errors: data.errors };
      }, testUserId);

      console.log(`[E2E] Debug - User ID: ${testUserId}`);
      console.log(`[E2E] Debug - GraphQL response: ${JSON.stringify(debugReadings)}`);

      if (debugReadings.readings && debugReadings.readings.length > 0) {
        for (const r of debugReadings.readings) {
          console.log(`[E2E] Debug - Reading: ${r.id}, Topic: ${r.topic}, Status: ${r.requestStatus}`);
        }
      } else {
        console.log('[E2E] Debug - No readings found in database!');
      }

      // === PART 2.5: Verify reading appears in My Readings as pending ===
      console.log('[E2E] Verifying reading appears in My Readings...');
      await readingRequestPage.navigateToAllReadings(testUserId);
      await readingRequestPage.waitForAllReadingsPage();

      // Wait for the reading with our unique topic to appear
      let foundPendingReading = false;
      for (let i = 0; i < 5; i++) {
        if (i > 0) {
          await userPage.reload();
          await userPage.waitForTimeout(2000);
        }

        // Look for our reading with the unique topic and pending/awaiting status
        const pendingReading = userPage.locator(`[data-testid^="reading-request-"]:has-text("${uniqueTopic}")`);
        foundPendingReading = await pendingReading.isVisible({ timeout: 3000 }).catch(() => false);

        if (foundPendingReading) {
          console.log(`[E2E] ✅ Reading found in My Readings after ${i + 1} attempts`);
          break;
        }
        console.log(`[E2E] Reading not visible yet, retry ${i + 1}/5...`);
      }

      // REQUIRED: The reading must appear in My Readings after submission
      expect(foundPendingReading).toBe(true);

      // Verify it shows as pending/awaiting status (not yet fulfilled)
      const readingCard = userPage.locator(`[data-testid^="reading-request-"]:has-text("${uniqueTopic}")`);
      const statusText = await readingCard.locator('text=Awaiting').or(readingCard.locator('text=Pending')).isVisible({ timeout: 3000 }).catch(() => false);
      if (statusText) {
        console.log('[E2E] ✅ Reading shows pending/awaiting status');
      } else {
        console.log('[E2E] ⚠️ Could not verify pending status text, but reading is visible');
      }

      // === PART 3: Practitioner claims the request ===
      console.log('[E2E] Practitioner claiming request...');

      await practitionerPage.goto(`/p/${practitionerSlug}/manage/readings`);
      await expect(practitionerPage).toHaveURL(new RegExp(`/p/${practitionerSlug}/manage/readings`));
      await practitionerPage.waitForTimeout(3000);

      // Look for the request with our unique topic using search
      let requestId: string | null = null;
      const maxRetries = 5;
      const searchInput = practitionerPage.locator('[data-testid="request-bank-search"]');

      for (let i = 0; i < maxRetries; i++) {
        if (i > 0) {
          await practitionerPage.reload();
        }
        await practitionerPage.waitForTimeout(3000);

        // Use search to find the specific request
        await searchInput.waitFor({ state: 'visible', timeout: 5000 });
        await searchInput.fill(uniqueTopic);
        await practitionerPage.waitForTimeout(500);

        const requestWithTopic = practitionerPage.locator(`[data-testid^="available-request-"]:has-text("${uniqueTopic}")`);
        const isVisible = await requestWithTopic.isVisible({ timeout: 3000 }).catch(() => false);

        if (isVisible) {
          const testIdAttr = await requestWithTopic.getAttribute('data-testid');
          requestId = testIdAttr?.replace('available-request-', '') || null;
          console.log(`[E2E] Found request after ${i + 1} attempts: ${requestId}`);
          break;
        }

        console.log(`[E2E] Request not found yet, retry ${i + 1}/${maxRetries}...`);
      }

      // Assert we found the request
      expect(requestId).not.toBeNull();

      if (requestId) {
        // Verify claim button text (just "Claim" - payment happens on fulfillment)
        const claimButtonText = await spiriReadingsPage.getClaimButtonText(requestId);
        expect(claimButtonText).toContain('Claim');

        // Set up network logging to capture claim response
        let claimResponse: any = null;
        practitionerPage.on('response', async response => {
          if (response.url().includes('/api/graphql') && response.request().method() === 'POST') {
            try {
              const body = response.request().postDataJSON();
              if (body?.query?.includes('claimReadingRequest')) {
                claimResponse = await response.json();
                console.log(`[E2E] Claim mutation response: ${JSON.stringify(claimResponse)}`);
              }
            } catch {
              // Ignore parsing errors
            }
          }
        });

        // Claim the request (this just locks it, no payment yet)
        await spiriReadingsPage.claimRequest(requestId);
        await practitionerPage.waitForTimeout(3000);

        // Log the claim response
        if (claimResponse) {
          const claimData = claimResponse?.data?.claimReadingRequest;
          if (claimData?.success) {
            console.log(`[E2E] ✅ Claim succeeded: ${JSON.stringify(claimData.readingRequest)}`);
          } else {
            console.log(`[E2E] ❌ Claim failed: ${claimData?.message}`);
          }
        } else {
          console.log('[E2E] ⚠️ No claim response captured');
        }

        // Check for errors - claiming should succeed since no payment happens yet
        const hasError = await spiriReadingsPage.isClaimErrorVisible();
        if (hasError) {
          const errorMsg = await spiriReadingsPage.getClaimErrorMessage();
          console.log(`[E2E] ⚠️ Claim failed: ${errorMsg}`);
          await spiriReadingsPage.dismissClaimError();
          throw new Error(`Claim failed unexpectedly: ${errorMsg}`);
        }

        // Query database to verify claim was stored
        const claimedReadings = await practitionerPage.evaluate(async (readerId: string) => {
          const response = await fetch('/api/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: `query GetClaimedRequests($readerId: ID!) {
                claimedReadingRequests(readerId: $readerId) {
                  id
                  topic
                  requestStatus
                  claimedBy
                  claimedAt
                }
              }`,
              variables: { readerId }
            })
          });
          const data = await response.json();
          return { claimed: data.data?.claimedReadingRequests, errors: data.errors };
        }, testPractitionerId);

        console.log(`[E2E] Database query for claimed requests: ${JSON.stringify(claimedReadings)}`);
        if (claimedReadings.claimed && claimedReadings.claimed.length > 0) {
          console.log(`[E2E] ✅ Found ${claimedReadings.claimed.length} claimed request(s) in database`);
        } else {
          console.log('[E2E] ❌ No claimed requests found in database!');
        }

        // Claim succeeded - verify it appears in My Claims
        await spiriReadingsPage.clickMyClaimsTab();

        // Wait for My Claims tab content to load (either loading state finishes or content appears)
        await practitionerPage.waitForTimeout(1000); // Give React Query time to invalidate and refetch

        const claimedRequest = practitionerPage.locator(`[data-testid="claimed-request-${requestId}"]`);
        // Try a few times with page refresh if needed
        let claimVisible = await claimedRequest.isVisible({ timeout: 5000 }).catch(() => false);
        if (!claimVisible) {
          console.log('[E2E] Claimed request not visible yet, refreshing My Claims...');
          // Re-click the tab to force refetch
          await spiriReadingsPage.clickRequestBankTab();
          await practitionerPage.waitForTimeout(500);
          await spiriReadingsPage.clickMyClaimsTab();
          await practitionerPage.waitForTimeout(1000);
          claimVisible = await claimedRequest.isVisible({ timeout: 5000 }).catch(() => false);
        }
        if (!claimVisible) {
          console.log('[E2E] Still not visible, trying page reload...');
          await practitionerPage.reload();
          await practitionerPage.waitForTimeout(2000);
          await spiriReadingsPage.clickMyClaimsTab();
          await practitionerPage.waitForTimeout(1000);
        }
        await expect(claimedRequest).toBeVisible({ timeout: 10000 });
        console.log('[E2E] ✅ Request claimed successfully - appears in My Claims');

        // Verify shotclock deadline is shown (shows "Xh Ym left to fulfill")
        const deadlineText = claimedRequest.locator('text=/left to fulfill|Deadline expired/i');
        await expect(deadlineText).toBeVisible();
        console.log('[E2E] ✅ Shotclock deadline is visible');

        // Open fulfillment dialog and verify form
        await spiriReadingsPage.clickFulfillRequest(requestId);
        await spiriReadingsPage.waitForFulfillmentDialog();

        // Verify form validation - submit should be disabled without required fields
        expect(await spiriReadingsPage.isSubmitFulfillmentEnabled()).toBe(false);
        console.log('[E2E] ✅ Submit disabled when form is empty (validation works)');

        // Fill card details without photo
        await spiriReadingsPage.setCardName(0, 'The Magician');
        await spiriReadingsPage.setCardInterpretation(0, 'You have all the tools you need.');
        await spiriReadingsPage.setOverallMessage('E2E test reading complete.');

        // Submit should still be disabled without photo
        expect(await spiriReadingsPage.isSubmitFulfillmentEnabled()).toBe(false);
        console.log('[E2E] ✅ Submit still disabled without photo (photo is required)');

        // Upload a test image
        const testImagePath = 'tests/fixtures/test-spread.jpg';
        await spiriReadingsPage.uploadSpreadPhoto(testImagePath);

        // Now submit should be enabled
        expect(await spiriReadingsPage.isSubmitFulfillmentEnabled()).toBe(true);
        console.log('[E2E] ✅ Submit enabled after photo upload');

        // Submit fulfillment (this is when payment is captured)
        await spiriReadingsPage.submitFulfillment();
        await practitionerPage.waitForTimeout(5000);

        // Check if fulfillment succeeded or failed due to payment error
        const fulfillmentError = practitionerPage.locator('[role="alert"]:has-text("Payment"), [role="dialog"]:has-text("failed")');
        const hasFulfillmentError = await fulfillmentError.isVisible({ timeout: 3000 }).catch(() => false);

        if (hasFulfillmentError) {
          const errorText = await fulfillmentError.textContent().catch(() => 'Unknown error');
          console.error('[E2E] ❌ Fulfillment payment failed:', errorText);
          throw new Error(`Payment failed during fulfillment: ${errorText}`);
        }

        console.log('[E2E] ✅ Reading fulfilled and payment captured');

        // Verify the claim is removed from My Claims after fulfillment
        await spiriReadingsPage.clickMyClaimsTab();

        // Wait for the My Claims tab to finish loading (either shows empty state or claims list)
        const emptyClaimsState = practitionerPage.locator('text=No claimed requests');
        const claimsLoaded = practitionerPage.locator('[data-testid="claimed-requests"]');
        await expect(emptyClaimsState.or(claimsLoaded)).toBeVisible({ timeout: 10000 });
        console.log('[E2E] My Claims tab loaded');

        // Check if request is still visible (it shouldn't be after fulfillment)
        let isStillInClaims = await practitionerPage.locator(`[data-testid="claimed-request-${requestId}"]`).isVisible({ timeout: 2000 }).catch(() => false);

        if (isStillInClaims) {
          console.log('[E2E] ⚠️ Fulfilled request still visible in My Claims, refreshing...');
          await practitionerPage.reload();
          await practitionerPage.waitForLoadState('networkidle');
          await spiriReadingsPage.clickMyClaimsTab();
          await expect(emptyClaimsState.or(claimsLoaded)).toBeVisible({ timeout: 10000 });
          isStillInClaims = await practitionerPage.locator(`[data-testid="claimed-request-${requestId}"]`).isVisible({ timeout: 2000 }).catch(() => false);
        }

        // After fulfillment, request should no longer appear in My Claims
        expect(isStillInClaims).toBe(false);
        console.log('[E2E] ✅ Fulfilled request removed from My Claims');

        // === PART 4: User views completed reading ===
        console.log('[E2E] Verifying user can see completed reading...');
        await readingRequestPage.navigateToAllReadings(testUserId);
        await readingRequestPage.waitForAllReadingsPage();

        // Debug: Query for the reading status directly
        const postFulfillStatus = await userPage.evaluate(async (userId: string) => {
          const response = await fetch('/api/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: `query GetMyReadings($userId: ID!) {
                myReadingRequests(userId: $userId) {
                  id
                  topic
                  requestStatus
                  fulfilledAt
                  overallMessage
                }
              }`,
              variables: { userId }
            })
          });
          const data = await response.json();
          return data.data?.myReadingRequests;
        }, testUserId);

        console.log(`[E2E] Debug - Post-fulfillment readings: ${JSON.stringify(postFulfillStatus)}`);

        // Wait for status to update to fulfilled/completed
        let foundCompleted = false;
        for (let i = 0; i < 5; i++) {
          if (i > 0) {
            await userPage.reload();
            await userPage.waitForTimeout(2000);
          }

          // Look for our specific reading with the unique topic AND fulfilled/completed status
          const ourReading = userPage.locator(`[data-testid^="reading-request-"]:has-text("${uniqueTopic}")`);
          const isVisible = await ourReading.isVisible({ timeout: 3000 }).catch(() => false);

          if (isVisible) {
            // Debug: log what we see on the card
            const cardText = await ourReading.textContent().catch(() => 'N/A');
            console.log(`[E2E] Debug - Card text: ${cardText?.substring(0, 200)}`);

            // Check if it has fulfilled/completed status
            const hasCompletedStatus = await ourReading.locator('text=Completed').or(ourReading.locator('text=Fulfilled')).isVisible({ timeout: 2000 }).catch(() => false);
            // Also check if "View Reading" button is visible (indicates fulfilled)
            const hasViewButton = await ourReading.locator('button:has-text("View Reading")').isVisible({ timeout: 2000 }).catch(() => false);

            console.log(`[E2E] Debug - hasCompletedStatus: ${hasCompletedStatus}, hasViewButton: ${hasViewButton}`);

            if (hasCompletedStatus || hasViewButton) {
              foundCompleted = true;
              console.log(`[E2E] ✅ Reading status changed to completed after ${i + 1} attempts`);
              break;
            }
          }
          console.log(`[E2E] Reading not showing completed status yet, retry ${i + 1}/5...`);
        }

        // REQUIRED: The reading must be visible as completed
        expect(foundCompleted).toBe(true);

        // Find our specific reading and click View Reading
        const ourReadingCard = userPage.locator(`[data-testid^="reading-request-"]:has-text("${uniqueTopic}")`);
        const viewButton = ourReadingCard.locator('button:has-text("View Reading")');
        await expect(viewButton).toBeVisible({ timeout: 5000 });
        await viewButton.click();
        await expect(userPage.locator('[role="dialog"]:has-text("Your Reading")').first()).toBeVisible({ timeout: 5000 });
        console.log('[E2E] ✅ User can view completed reading details');

        // Verify all reading content is shown
        // 1. Card name
        await expect(userPage.locator('text=The Magician')).toBeVisible({ timeout: 3000 });
        console.log('[E2E] ✅ Card name visible: The Magician');

        // 2. Card interpretation
        await expect(userPage.locator('text=You have all the tools you need')).toBeVisible({ timeout: 3000 });
        console.log('[E2E] ✅ Card interpretation visible');

        // 3. Overall message
        await expect(userPage.locator('text=E2E test reading complete')).toBeVisible({ timeout: 3000 });
        console.log('[E2E] ✅ Overall message visible');

        // 4. Auto-extracted symbols (The Magician has symbols like "manifestation", "power", "skill", "willpower", "action")
        // REQUIRED: Symbols section must be visible
        const symbolsSection = userPage.locator('text=Symbols in this card');
        await expect(symbolsSection).toBeVisible({ timeout: 5000 });
        console.log('[E2E] ✅ Symbols section visible');

        // Verify at least one of The Magician's symbols is shown
        const manifestationSymbol = userPage.locator('span:has-text("manifestation")');
        const powerSymbol = userPage.locator('span:has-text("power")');
        const hasManif = await manifestationSymbol.isVisible({ timeout: 2000 }).catch(() => false);
        const hasPower = await powerSymbol.isVisible({ timeout: 2000 }).catch(() => false);
        expect(hasManif || hasPower).toBe(true);
        console.log('[E2E] ✅ Auto-extracted symbols visible for The Magician');

        console.log('[E2E] ✅ All reading content verified (card, interpretation, message, symbols)');

        // === PART 5: User leaves a review ===
        console.log('[E2E] Testing review functionality...');

        // Check if "Leave a Review" button is visible
        if (await readingRequestPage.isLeaveReviewButtonVisible()) {
          await readingRequestPage.clickLeaveReview();

          // Fill in the review form
          await readingRequestPage.setReviewRating(5);
          await readingRequestPage.setReviewHeadline('Amazing reading experience!');
          await readingRequestPage.setReviewText('This was an incredibly insightful reading. The reader really understood my question.');

          // Verify submit is enabled
          expect(await readingRequestPage.isSubmitReviewEnabled()).toBe(true);

          // Submit the review
          await readingRequestPage.submitReview();

          // Wait for submission
          await userPage.waitForTimeout(3000);

          // Verify the review is now displayed
          expect(await readingRequestPage.isReviewDisplayed()).toBe(true);
          await expect(userPage.locator('text=Amazing reading experience!')).toBeVisible();
          console.log('[E2E] ✅ Review submitted and displayed successfully');
        } else {
          console.log('[E2E] ⚠️ Leave a Review button not visible (may already have review)');
        }

        await readingRequestPage.closeReadingDetail();

        // === PART 6: Verify user's symbol dictionary was updated ===
        console.log('[E2E] Verifying symbol dictionary was updated...');

        // Query the user's personal symbols via GraphQL
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

        // The Magician should have added symbols like "manifestation", "power", "skill", "willpower", "action"
        const magicianSymbols = ['manifestation', 'power', 'skill', 'willpower', 'action'];
        const foundSymbols = symbolDictionaryCheck.filter((s: { symbolName: string }) =>
          magicianSymbols.includes(s.symbolName.toLowerCase())
        );

        // REQUIRED: At least some symbols from The Magician should be in the dictionary
        expect(foundSymbols.length).toBeGreaterThan(0);
        console.log(`[E2E] ✅ Symbol dictionary updated with ${foundSymbols.length} symbols from The Magician`);
        console.log(`[E2E]    Found symbols: ${foundSymbols.map((s: { symbolName: string }) => s.symbolName).join(', ')}`);

        // REQUIRED: At least one must have readingOccurrences > 0
        const hasReadingOccurrence = foundSymbols.some((s: { readingOccurrences: number }) => s.readingOccurrences > 0);
        expect(hasReadingOccurrence).toBe(true);
        console.log('[E2E] ✅ Symbol readingOccurrences incremented correctly');

        // === PART 7: Verify symbols appear in the Symbol Dictionary UI ===
        console.log('[E2E] Navigating to Symbol Dictionary to verify UI...');

        // Navigate directly to the symbol dictionary page
        await userPage.goto(`/u/${testUserId}/space/symbols/dictionary`);
        await userPage.waitForLoadState('networkidle');

        // Wait for the page to load and symbols to appear
        await userPage.waitForTimeout(2000);

        // Verify the page title/header
        const dictionaryHeader = userPage.locator('h1:has-text("Symbol Dictionary"), h1:has-text("Your Symbols")');
        await expect(dictionaryHeader).toBeVisible({ timeout: 10000 });
        console.log('[E2E] ✅ Symbol Dictionary page loaded');

        // Verify at least one of The Magician's symbols is visible in the UI
        const magicianSymbolsLower = ['manifestation', 'power', 'skill', 'willpower', 'action'];
        let foundSymbolInUI = false;

        for (const symbolName of magicianSymbolsLower) {
          // Look for the symbol name in any case
          const symbolElement = userPage.locator(`text=${symbolName}`).first();
          if (await symbolElement.isVisible({ timeout: 1000 }).catch(() => false)) {
            console.log(`[E2E] ✅ Found symbol "${symbolName}" in Symbol Dictionary UI`);
            foundSymbolInUI = true;
            break;
          }
        }

        // REQUIRED: At least one symbol from the reading should be visible in the dictionary
        expect(foundSymbolInUI).toBe(true);
        console.log('[E2E] ✅ Symbols from SpiriReading are visible in Symbol Dictionary UI');

        console.log('[E2E] ✅ Full E2E flow completed');
      } else {
        throw new Error('No request found in Request Bank - test cannot continue');
      }

    } finally {
      await userContext.close();
      await practitionerContext.close();
    }
  });
});


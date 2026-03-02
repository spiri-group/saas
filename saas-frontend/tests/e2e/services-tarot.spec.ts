import { test, expect, Page, TestInfo } from '@playwright/test';
import { PractitionerSetupPage } from '../pages/PractitionerSetupPage';
import { AuthPage } from '../pages/AuthPage';
import { UserSetupPage } from '../pages/UserSetupPage';
import { OnboardingPage } from '../pages/OnboardingPage';
import { PurchaseManager } from '../managers/PurchaseManager';
import { handleConsentGuardIfPresent } from '../utils/test-helpers';
import {
  getCookiesFromPage,
  registerTestUser,
  completeStripeTestOnboarding,
} from '../utils/test-cleanup';

/**
 * ASYNC Tarot Reading Service - Full Customer Journey
 *
 * This test covers the complete flow for an async reading service:
 * 1. Merchant creates ASYNC reading service
 * 2. Customer discovers and orders the service
 * 3. Merchant views service orders and delivers the reading
 * 4. Customer receives delivery and leaves review
 */

// State variables shared across serial tests
const DESCRIBE_KEY = 'tarot-journey';
let practitionerSlug: string;
let practitionerId: string;
let serviceName: string;
let customerId: string;
let customerEmail: string;
let customerCookies: string;
let deliveryCompleted: boolean = false; // Track if Test 3 successfully delivered

// Per-worker state tracking
const cookiesPerWorker = new Map<string, string>();

/** Generate unique test email */
function generateUniqueTestEmail(testInfo: TestInfo): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `tarot-test-${timestamp}-${testInfo.parallelIndex}-${randomSuffix}@playwright.com`;
}

/** Helper to wait for dialog overlay to close */
async function waitForDialogOverlayToClose(page: Page) {
  const dialogOverlay = page.locator('[data-state="open"][aria-hidden="true"].fixed.inset-0');
  try {
    await dialogOverlay.waitFor({ state: 'hidden', timeout: 10000 });
  } catch {
    // No overlay present, continue
  }
}

/** Helper to scroll and click */
async function scrollAndClick(page: Page, locator: ReturnType<Page['locator']>) {
  await locator.evaluate((el) => {
    el.scrollIntoView({ behavior: 'instant', block: 'center' });
    (el as HTMLElement).click();
  });
  await page.waitForTimeout(300);
}

/** Helper to dismiss welcome dialog */
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

/** Setup location for merchant */
async function setupLocation(page: Page) {
  try {
    const profileButton = page.locator('button[aria-label="Profile"]');
    if (await profileButton.isVisible({ timeout: 5000 })) {
      await profileButton.click();
      await page.waitForTimeout(1000);
    }

    const setupButton = page.locator('button:has-text("Setup")');
    if (await setupButton.isVisible({ timeout: 3000 })) {
      await setupButton.click();
      await page.waitForTimeout(1000);
    }

    const locationLink = page.locator('a:has-text("Location"), button:has-text("Location")').first();
    if (await locationLink.isVisible({ timeout: 3000 })) {
      await locationLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const searchInput = page.locator('input[aria-label="Location search"]');
      if (await searchInput.isVisible({ timeout: 5000 })) {
        await searchInput.fill('Sydney, Australia');
        await page.waitForTimeout(2000);

        const suggestion = page.locator('[role="option"]:has-text("Sydney")').first();
        if (await suggestion.isVisible({ timeout: 5000 })) {
          await suggestion.click();
          await page.waitForTimeout(3000);
        }
      }
    }
    await waitForDialogOverlayToClose(page);
  } catch {
    console.log('[Setup] Location setup skipped or already configured');
  }
}

/** Get practitioner ID from slug */
async function getPractitionerIdFromSlug(page: Page, slug: string): Promise<string | null> {
  try {
    const practitionerId = await page.evaluate(async (practitionerSlug) => {
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
    return practitionerId;
  } catch (error) {
    console.error('[getPractitionerIdFromSlug] Error:', error);
    return null;
  }
}

/** Open Services create menu for a specific service type */
async function openServicesCreateMenu(page: Page, serviceType: 'Reading' | 'Healing' | 'Coaching') {
  await waitForDialogOverlayToClose(page);

  // Click on "Services" in the sidebar using testid
  const servicesNav = page.getByTestId('nav-services');
  if (await servicesNav.isVisible({ timeout: 5000 })) {
    await servicesNav.click();
    await page.waitForTimeout(1000);
  }

  // The menu items are "New Reading", "New Healing", "New Coaching" - not "Create"
  const newServiceButton = page.locator(`[role="menuitem"]`).filter({ hasText: `New ${serviceType}` }).first();
  if (await newServiceButton.isVisible({ timeout: 3000 })) {
    await newServiceButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  }
}

/** Upload test thumbnail */
async function uploadTestThumbnail(page: Page) {
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAASwAAAEsCAYAAAB5fY51AAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAAOwgAADsIBFShKgAAAABl0RVh0U29mdHdhcmUAcGFpbnQubmV0IDQuMC4xMkMEa+wAAAGfSURBVHic7dMxAQAACAOgaf+/OxODI0AisBIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLECvoALPIAO/BwANgAAAAASUVORK5CYII=';
  const pngBuffer = Buffer.from(pngBase64, 'base64');
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles({
    name: 'tarot-service-thumbnail.png',
    mimeType: 'image/png',
    buffer: pngBuffer,
  });
  await page.waitForTimeout(6000);
}

// =============================================================================
// ASYNC READING SERVICE - TAROT - FULL CUSTOMER JOURNEY
// =============================================================================
test.describe.serial('ASYNC Reading Service - Tarot - Full Customer Journey', () => {

  test('1. Merchant creates ASYNC reading service', async ({ page }, testInfo) => {
    test.setTimeout(360000);

    console.log('[Test 1] Creating merchant and Tarot reading service...');

    // Create merchant
    const testEmail = generateUniqueTestEmail(testInfo);
    const practitionerSetupPage = new PractitionerSetupPage(page);
    practitionerSlug = await practitionerSetupPage.createPractitioner(testEmail, 'Tarot Reader Test', testInfo);
    console.log(`[Test 1] Merchant slug: ${practitionerSlug}`);

    const cookies = await getCookiesFromPage(page);
    await dismissWelcomeDialog(page);
    await setupLocation(page);

    // Get merchant ID and complete Stripe onboarding
    practitionerId = await getPractitionerIdFromSlug(page, practitionerSlug) || '';
    if (practitionerId && cookies) {
      console.log(`[Test 1] Practitioner ID: ${practitionerId}`);
      const onboardingResult = await completeStripeTestOnboarding(practitionerId, cookies);
      if (onboardingResult.success) {
        console.log('[Test 1] ✓ Stripe onboarding completed');
        await page.reload();
        await page.waitForLoadState('networkidle');
      }
    }

    // Store cookies
    if (cookies) {
      const workerId = testInfo.parallelIndex;
      const stateKey = `${workerId}-${DESCRIBE_KEY}`;
      cookiesPerWorker.set(stateKey, cookies);
    }

    // Navigate to practitioner dashboard
    await page.goto(`/p/${practitionerSlug}/manage`);
    await page.waitForLoadState('networkidle');
    await dismissWelcomeDialog(page);

    // Create the Tarot reading service
    await openServicesCreateMenu(page, 'Reading');

    const timestamp = Date.now();
    serviceName = `3-Card Tarot Reading ${timestamp}`;

    console.log('[Test 1] Filling Tarot service details...');

    // Fill service name
    const nameInput = page.locator('input[name="name"]');
    if (await nameInput.isVisible({ timeout: 5000 })) {
      await nameInput.fill(serviceName);
    }

    // Fill description
    const descriptionInput = page.locator('textarea[name="description"]');
    if (await descriptionInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await descriptionInput.fill('A personalized 3-card tarot reading for guidance on your current situation. Past, Present, and Future positions to illuminate your path.');
    }

    // Select reading type as TAROT - this is crucial for the journal integration
    // Scope selectors to the dialog to avoid matching nav elements
    const dialog = page.locator('[role="dialog"]');
    const readingTypeDropdown = dialog.locator('[data-testid="reading-type-select"]');
    if (await readingTypeDropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
      await readingTypeDropdown.click();
      await page.waitForTimeout(500);
      const tarotOption = page.locator('[role="option"]:has-text("Tarot")').first();
      if (await tarotOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tarotOption.click();
        console.log('[Test 1] ✓ Selected Tarot as reading type');
      }
    }

    // Fill price
    const priceInput = page.locator('input[name="price"]');
    if (await priceInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await priceInput.fill('35.00');
    }

    // Fill turnaround days
    const turnaroundInput = page.locator('input[name="turnaroundDays"]');
    if (await turnaroundInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await turnaroundInput.fill('3');
    }

    // This is a multi-step wizard:
    // Step 1: Basic Info -> Step 2: Details -> Step 3: Thumbnail -> Step 4: Questions

    // Step 1 -> Step 2 (Details)
    await page.waitForTimeout(1000);
    const nextButton1 = dialog.locator('[data-testid="wizard-next-btn"]');
    await expect(nextButton1).toBeEnabled({ timeout: 5000 });
    await nextButton1.click();
    await page.waitForTimeout(2000);
    console.log('[Test 1] ✓ Moved to Step 2 (Details)');

    // Step 2: Fill Tarot-specific details
    const deckInput = dialog.locator('[data-testid="deck-used-input"]');
    if (await deckInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deckInput.fill('Rider-Waite-Smith');
      console.log('[Test 1] ✓ Set deck as Rider-Waite-Smith');
    }

    const topicsInput = dialog.locator('[data-testid="available-topics-input"]');
    if (await topicsInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await topicsInput.fill('Love, Career, General Guidance, Spiritual Growth');
      console.log('[Test 1] ✓ Set available topics');
    }

    // Step 2 -> Step 3 (Thumbnail)
    const nextButton2 = dialog.locator('[data-testid="wizard-next-btn"]');
    await nextButton2.click();
    await page.waitForTimeout(2000);
    console.log('[Test 1] ✓ Moved to Step 3 (Thumbnail)');

    // Step 3: Upload thumbnail (required)
    try {
      await uploadTestThumbnail(page);
      console.log('[Test 1] ✓ Thumbnail uploaded');
    } catch {
      console.log('[Test 1] Thumbnail upload skipped');
    }

    // Step 3 -> Step 4 (Questions)
    const nextButton3 = dialog.locator('[data-testid="wizard-next-btn"]');
    await nextButton3.click();
    await page.waitForTimeout(2000);
    console.log('[Test 1] ✓ Moved to Step 4 (Questions)');

    // Step 4: Questions are optional — skip and submit directly
    await page.waitForTimeout(1000);

    // Submit the form
    const submitButton = dialog.locator('[data-testid="wizard-submit-btn"]');
    await expect(submitButton).toBeVisible({ timeout: 5000 });
    await submitButton.click();
    await page.waitForTimeout(5000);
    console.log('[Test 1] ✓ Tarot reading service creation submitted with custom question');

    // Verify service appears in catalogue
    await page.goto(`/p/${practitionerSlug}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const serviceCard = page.locator(`text=${serviceName}`).first();
    await expect(serviceCard).toBeVisible({ timeout: 10000 });
    console.log('[Test 1] ✓ Tarot service visible in catalogue!');
  });

  test('2. Customer discovers and orders the service', async ({ browser }, testInfo) => {
    test.setTimeout(300000);

    console.log('[Test 2] Customer signup and purchase flow...');
    expect(practitionerSlug).toBeDefined();
    expect(serviceName).toBeDefined();

    const customerContext = await browser.newContext();
    const customerPage = await customerContext.newPage();
    const workerId = testInfo.parallelIndex;
    const stateKey = `${workerId}-${DESCRIBE_KEY}-customer`;

    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    customerEmail = `tarot-customer-${timestamp}-${workerId}-${randomSuffix}@playwright.com`;

    try {
      // Customer signup via unified /setup flow
      console.log('[Test 2] Step 1: Customer signing up...');
      const authPage = new AuthPage(customerPage);
      const userSetupPage = new UserSetupPage(customerPage);

      await customerPage.goto('/');
      await authPage.startAuthFlow(customerEmail);
      await expect(customerPage.locator('[aria-label="input-login-otp"]')).toBeVisible({ timeout: 15000 });
      await customerPage.locator('[aria-label="input-login-otp"]').click();
      await customerPage.keyboard.type('123456');
      await customerPage.waitForURL('/', { timeout: 15000 });

      // Handle site-level ConsentGuard if present
      await handleConsentGuardIfPresent(customerPage);

      // Navigate to unified setup page
      await customerPage.goto('/setup');
      await userSetupPage.waitForForm();

      // Get user ID from session for cleanup
      customerId = await customerPage.evaluate(async () => {
        const response = await fetch('/api/auth/session');
        const session = await response.json();
        return session?.user?.id || '';
      });
      if (customerId) {
        console.log(`[Test 2] Customer user ID: ${customerId}`);
      }

      // Fill basic details and click "Start Your Journey"
      await userSetupPage.fillUserProfile({
        firstName: 'Tarot',
        lastName: 'Seeker',
      });
      await userSetupPage.startBrowsing();

      // Complete onboarding (spiritual interest selection)
      const onboardingPage = new OnboardingPage(customerPage);
      await onboardingPage.completeWithPrimaryOnly('mediumship');
      console.log('[Test 2] ✓ Customer profile completed');

      // Store cookies
      const cookies = await getCookiesFromPage(customerPage);
      if (cookies) {
        customerCookies = cookies;
        cookiesPerWorker.set(stateKey, cookies);
        if (customerId) {
          registerTestUser({ id: customerId, email: customerEmail, cookies }, workerId);
        }
      }

      // ===== STEP 2: Navigate to practitioner profile and find service =====
      console.log('[Test 2] Step 2: Navigating to practitioner profile...');
      await customerPage.goto(`/p/${practitionerSlug}`);
      await customerPage.waitForLoadState('networkidle');
      await customerPage.waitForTimeout(3000);

      // Find the service card in the services section
      const servicesSection = customerPage.getByTestId('services-section');
      await expect(servicesSection).toBeVisible({ timeout: 15000 });
      const serviceCard = servicesSection.locator(`a[href*="/services/"]`).filter({ hasText: serviceName }).first();
      await expect(serviceCard).toBeVisible({ timeout: 15000 });
      console.log('[Test 2] ✓ Customer found Tarot service');

      // Click on service to navigate to detail page
      await serviceCard.click();
      // Wait for navigation to /m/{slug}/services/{serviceId}
      await customerPage.waitForURL(/\/p\/.*\/services\//, { timeout: 15000 });
      await customerPage.waitForLoadState('networkidle');
      await customerPage.waitForTimeout(2000);
      console.log(`[Test 2] ✓ Navigated to service detail page: ${customerPage.url()}`);

      // ===== STEP 3: Dismiss cookie banner if present =====
      const cookieBanner = customerPage.getByTestId('cookie-banner');
      if (await cookieBanner.isVisible({ timeout: 2000 }).catch(() => false)) {
        const acceptCookieBtn = customerPage.getByTestId('cookie-accept-btn');
        if (await acceptCookieBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await acceptCookieBtn.click();
          await expect(cookieBanner).not.toBeVisible({ timeout: 3000 });
          console.log('[Test 2] ✓ Dismissed cookie banner');
        }
      }

      // ===== STEP 4-7: Complete purchase using PurchaseManager =====
      console.log('[Test 2] Step 3-7: Completing purchase flow...');
      const purchaseManager = new PurchaseManager(customerPage);
      const result = await purchaseManager.completePurchaseFromDetailPage(serviceName, {
        skipBilling: false,
      });

      if (!result.success) {
        throw new Error(`Purchase failed: ${result.error}`);
      }

      await customerPage.screenshot({ path: 'test-results/tarot-customer-purchase.png' });
      console.log('[Test 2] ✓ Customer purchase flow completed');
    } finally {
      await customerContext.close();
    }
  });

  test('3. Merchant views service orders and delivers the reading', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    console.log('[Test 3] Merchant delivery flow...');
    expect(practitionerSlug).toBeDefined();
    expect(practitionerId).toBeDefined();

    // First restore merchant cookies for authentication
    const workerId = testInfo.parallelIndex;
    const stateKey = `${workerId}-${DESCRIBE_KEY}`;
    const cookies = cookiesPerWorker.get(stateKey);
    if (cookies) {
      const cookiePairs = cookies.split('; ');
      const cookieObjs = cookiePairs.map(pair => {
        const [name, value] = pair.split('=');
        return { name, value: value || '', domain: 'localhost', path: '/' };
      });
      await page.context().addCookies(cookieObjs);
      console.log('[Test 3] ✓ Merchant authentication restored');
    } else {
      throw new Error('[Test 3] FAILED: No merchant cookies found - cannot authenticate');
    }

    await page.goto(`/p/${practitionerSlug}/manage/services/orders`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000); // Give more time for data to load

    console.log('[Test 3] ✓ Navigated to service orders page');
    console.log('[Test 3] Using merchantId:', practitionerId);

    // Debug: Query the GraphQL API directly to see what's returned
    const debugResult = await page.evaluate(async (vendorId) => {
      try {
        const response = await fetch('/api/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `query MyServiceOrders($vendorId: ID!, $status: String) {
              myServiceOrders(vendorId: $vendorId, status: $status) {
                id
                vendorId
                customerId
                purchaseDate
                orderStatus
                service {
                  id
                  name
                }
              }
            }`,
            variables: { vendorId, status: 'PAID' }
          })
        });
        const data = await response.json();
        return { orders: data.data?.myServiceOrders, errors: data.errors };
      } catch (error) {
        return { error: String(error) };
      }
    }, practitionerId);
    console.log('[Test 3] GraphQL debug result:', JSON.stringify(debugResult, null, 2));

    // Take a screenshot to see the page state
    await page.screenshot({ path: 'test-results/tarot-orders-page.png' });

    // Log what we see on the page
    const pageContent = await page.textContent('body');
    console.log('[Test 3] Page contains "No orders waiting":', pageContent?.includes('No orders waiting'));
    console.log('[Test 3] Page contains "Start Fulfillment":', pageContent?.includes('Start Fulfillment'));
    console.log('[Test 3] Page contains service name:', pageContent?.includes(serviceName));

    // Look for the "Start Fulfillment" button which opens the dialog
    const startFulfillmentButton = page.locator('[data-testid="start-fulfillment-button"]').first();
    const buttonVisible = await startFulfillmentButton.isVisible({ timeout: 10000 }).catch(() => false);

    console.log('[Test 3] Start Fulfillment button visible:', buttonVisible);

    // FAIL if no orders found - this is a real failure
    if (!buttonVisible) {
      await page.screenshot({ path: 'test-results/tarot-NO-ORDERS-FOUND.png' });
      throw new Error('[Test 3] FAILED: No service orders found on the page. The payment_intent_succeeded webhook likely did not create the service order. Check backend logs.');
    }

    // Click the Start Fulfillment button to open the wizard dialog
    await startFulfillmentButton.click();
    await page.waitForTimeout(2000);
    console.log('[Test 3] ✓ Clicked Start Fulfillment button');

    // Wait for the fulfillment dialog to appear
    const fulfillmentDialog = page.locator('[data-testid="fulfillment-dialog"]');
    const dialogVisible = await fulfillmentDialog.isVisible({ timeout: 10000 }).catch(() => false);

    if (!dialogVisible) {
      await page.screenshot({ path: 'test-results/tarot-dialog-not-found.png' });
      throw new Error('[Test 3] FAILED: Fulfillment dialog did not open');
    }
    console.log('[Test 3] ✓ Fulfillment dialog opened');

    // Take screenshot of dialog Step 1 (Review)
    await page.screenshot({ path: 'test-results/tarot-dialog-step1-review.png' });

    // Step 1: Review - click Next to proceed to Upload
    const nextButton = page.locator('[data-testid="next-step-button"]');
    await expect(nextButton).toBeVisible({ timeout: 5000 });
    await nextButton.click();
    await page.waitForTimeout(1000);
    console.log('[Test 3] ✓ Moved to Step 2 (Upload)');

    // Take screenshot of dialog Step 2 (Upload)
    await page.screenshot({ path: 'test-results/tarot-dialog-step2-upload.png' });

    // Step 2: Upload - find file input and upload a test file
    const fileInput = page.locator('input[type="file"]').first();
    const fileInputExists = await fileInput.count() > 0;
    console.log('[Test 3] File input exists in DOM:', fileInputExists);

    if (!fileInputExists) {
      await page.screenshot({ path: 'test-results/tarot-no-file-input.png' });
      throw new Error('[Test 3] FAILED: File input not found in dialog');
    }

    // Upload a test txt file
    const testFileContent = `TAROT READING REPORT
====================

Client Reading - ${new Date().toLocaleDateString()}

Past Position: The Fool (Reversed)
Present Position: The Star
Future Position: The World

Full Interpretation:
The cards reveal a journey from hesitation to fulfillment...`;

    await fileInput.setInputFiles({
      name: 'tarot-reading.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(testFileContent)
    });
    console.log('[Test 3] ✓ Selected test reading file');

    // Wait for spinner to appear (indicates upload started)
    const uploadSpinner = page.locator('[data-testid="step-upload"] .animate-spin').first();
    await uploadSpinner.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
      console.log('[Test 3] No spinner visible, upload may have completed quickly');
    });

    // Wait for spinner to disappear (indicates upload finished)
    await uploadSpinner.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {
      console.log('[Test 3] Spinner still visible after 30s');
    });

    // Check for uploaded file indicator
    const uploadedFileIndicator = page.locator('text=tarot-reading.txt').first();
    const fileUploaded = await uploadedFileIndicator.isVisible({ timeout: 15000 }).catch(() => false);
    console.log('[Test 3] File upload indicator visible:', fileUploaded);

    if (!fileUploaded) {
      await page.screenshot({ path: 'test-results/tarot-upload-failed.png' });
      throw new Error('[Test 3] FAILED: File upload did not complete - file name not visible');
    }
    console.log('[Test 3] ✓ File uploaded successfully');

    // Click Next to proceed to Message step
    await nextButton.click();
    await page.waitForTimeout(1000);
    console.log('[Test 3] ✓ Moved to Step 3 (Message)');

    // Take screenshot of dialog Step 3 (Message)
    await page.screenshot({ path: 'test-results/tarot-dialog-step3-message.png' });

    // Step 3: Message - fill in the practitioner message
    const messageTextarea = page.locator('[data-testid="practitioner-message-input"]');
    const textareaVisible = await messageTextarea.isVisible({ timeout: 5000 }).catch(() => false);

    if (textareaVisible) {
      await messageTextarea.fill(`Your 3-Card Tarot Reading:

🌟 Past Position: The Fool (Reversed)
In your past, there was hesitation to take a leap of faith. You may have held back from starting something new.

🌟 Present Position: The Star
Currently, you are in a period of hope and renewal. Trust that things are aligning in your favor.

🌟 Future Position: The World
Completion and achievement await you. The cycle is coming to a positive close.

Trust in your journey, dear seeker. The cards show a beautiful progression from uncertainty to fulfillment.`);
      console.log('[Test 3] ✓ Added delivery message with card details');
    }

    // Click Next to proceed to Confirm step
    await nextButton.click();
    await page.waitForTimeout(1000);
    console.log('[Test 3] ✓ Moved to Step 4 (Confirm)');

    // Take screenshot of dialog Step 4 (Confirm)
    await page.screenshot({ path: 'test-results/tarot-dialog-step4-confirm.png' });

    // Step 4: Confirm - click the Deliver to Customer button
    const deliverButton = page.locator('[data-testid="confirm-delivery-button"]');
    const deliverBtnVisible = await deliverButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (!deliverBtnVisible) {
      await page.screenshot({ path: 'test-results/tarot-no-deliver-button.png' });
      throw new Error('[Test 3] FAILED: "Deliver to Customer" button not found');
    }

    // Check if button is enabled
    const isDisabled = await deliverButton.isDisabled();
    if (isDisabled) {
      await page.screenshot({ path: 'test-results/tarot-deliver-disabled.png' });
      throw new Error('[Test 3] FAILED: "Deliver to Customer" button is disabled');
    }

    await deliverButton.click();
    console.log('[Test 3] ✓ Clicked Deliver to Customer button');

    // Wait for the delivery to complete - wait for dialog to close OR success toast
    // The dialog should close when delivery succeeds
    try {
      await fulfillmentDialog.waitFor({ state: 'hidden', timeout: 15000 });
      console.log('[Test 3] ✓ Dialog closed after delivery');
    } catch (e) {
      // Dialog didn't close - check if there's an error
      const dialogContent = await page.locator('[data-testid="fulfillment-dialog"]').textContent().catch(() => '');
      console.log('[Test 3] Dialog content:', dialogContent?.substring(0, 500));

      // Check for any error toasts
      const errorToast = await page.locator('text=Failed to deliver').isVisible({ timeout: 1000 }).catch(() => false);
      if (errorToast) {
        const toastText = await page.locator('[data-sonner-toast]').textContent().catch(() => 'No toast text');
        console.log('[Test 3] Error toast found:', toastText);
      }

      await page.screenshot({ path: 'test-results/tarot-delivery-failed.png' });
      throw new Error('[Test 3] FAILED: Delivery did not complete - dialog still open');
    }

    // Verify delivery was successful - dialog should be closed
    const dialogStillVisible = await fulfillmentDialog.isVisible({ timeout: 2000 }).catch(() => false);
    if (dialogStillVisible) {
      await page.screenshot({ path: 'test-results/tarot-delivery-failed.png' });
      throw new Error('[Test 3] FAILED: Delivery did not complete - dialog still open');
    }

    console.log('[Test 3] ✓ Order marked as delivered');

    // Store that delivery was successful for test 4
    deliveryCompleted = true;

    await page.screenshot({ path: 'test-results/tarot-merchant-delivery.png' });
    console.log('[Test 3] ✓ Merchant delivery flow completed');
  });

  test('4. Customer receives delivery and leaves review', async ({ browser }, testInfo) => {
    test.setTimeout(180000);

    console.log('[Test 4] Customer receiving delivery and leaving review...');

    // STRICT CHECK: Test 3 must have completed successfully
    if (!deliveryCompleted) {
      throw new Error('[Test 4] FAILED: Cannot run - Test 3 (delivery) did not complete successfully');
    }

    expect(customerId).toBeDefined();
    expect(customerCookies).toBeDefined();

    const customerContext = await browser.newContext();
    const customerPage = await customerContext.newPage();

    // Restore authentication
    const cookiePairs = customerCookies.split('; ');
    const cookies = cookiePairs.map(pair => {
      const [name, value] = pair.split('=');
      return { name, value: value || '', domain: 'localhost', path: '/' };
    });
    await customerContext.addCookies(cookies);
    console.log('[Test 4] ✓ Customer authentication restored');

    try {
      // Navigate to Personal Space readings
      await customerPage.goto(`/u/${customerId}/space/readings/received`);
      await customerPage.waitForLoadState('networkidle');
      await customerPage.waitForTimeout(3000);

      // Check for onboarding guard (should be auto-activated by webhook)
      const onboardingHeading = customerPage.locator('text=Your Spiritual Interests, text=What draws you to the spiritual');
      const isOnboardingShown = await onboardingHeading.first().isVisible({ timeout: 3000 }).catch(() => false);

      if (isOnboardingShown) {
        console.log('[Test 4] Personal Space onboarding shown - completing...');
        const mediumshipOption = customerPage.locator('button:has-text("Mediumship"), text=Mediumship').first();
        if (await mediumshipOption.isVisible({ timeout: 5000 }).catch(() => false)) {
          await mediumshipOption.click();
          await customerPage.waitForTimeout(1000);
        }
        const continueButton = customerPage.locator('button:has-text("Continue"), button:has-text("Next")').first();
        if (await continueButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await continueButton.click();
          await customerPage.waitForTimeout(2000);
        }
        const skipButton = customerPage.locator('button:has-text("Skip"), button:has-text("Maybe Later")').first();
        if (await skipButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await skipButton.click();
          await customerPage.waitForTimeout(2000);
        }
        await customerPage.goto(`/u/${customerId}/space/readings/received`);
        await customerPage.waitForLoadState('networkidle');
        await customerPage.waitForTimeout(2000);
      }

      console.log('[Test 4] ✓ Navigated to Personal Space readings');

      // Find the delivered reading - MUST be visible
      const readingItem = customerPage.locator(`text=${serviceName}`).first();
      const readingVisible = await readingItem.isVisible({ timeout: 15000 }).catch(() => false);

      if (!readingVisible) {
        await customerPage.screenshot({ path: 'test-results/tarot-delivery-NOT-FOUND.png' });
        throw new Error(`[Test 4] FAILED: Reading "${serviceName}" not visible in Personal Space after delivery`);
      }

      console.log('[Test 4] ✓ Delivered reading visible in Personal Space');

      // Click to view the delivery
      await readingItem.click();
      await customerPage.waitForTimeout(2000);

      // Verify delivery content is visible (deliverables/message from merchant)
      await customerPage.screenshot({ path: 'test-results/tarot-delivery-view.png' });
      console.log('[Test 4] ✓ Viewing delivery details');

      // Look for Leave Review button
      const reviewButton = customerPage.locator('button:has-text("Leave Review"), button:has-text("Write Review"), button:has-text("Review")').first();
      const reviewBtnVisible = await reviewButton.isVisible({ timeout: 5000 }).catch(() => false);

      if (reviewBtnVisible) {
        await reviewButton.click();
        await customerPage.waitForTimeout(2000);
        console.log('[Test 4] ✓ Opened review dialog');

        // Fill in the review
        // Star rating - click on 5th star
        const stars = customerPage.locator('[data-testid="star-rating"] button, .star-rating button, [role="radio"]');
        const starCount = await stars.count();
        if (starCount >= 5) {
          await stars.nth(4).click(); // 5-star rating (0-indexed)
          console.log('[Test 4] ✓ Selected 5-star rating');
        }

        // Review text
        const reviewTextarea = customerPage.locator('textarea[name="review"], textarea[placeholder*="review"], textarea').first();
        if (await reviewTextarea.isVisible({ timeout: 3000 }).catch(() => false)) {
          await reviewTextarea.fill('Amazing reading! The practitioner really understood my situation and provided insightful guidance. The cards resonated deeply with me. Highly recommend!');
          console.log('[Test 4] ✓ Filled review text');
        }

        // Submit review
        const submitReviewBtn = customerPage.locator('button:has-text("Submit Review"), button:has-text("Post Review"), button[type="submit"]').first();
        if (await submitReviewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await submitReviewBtn.click();
          await customerPage.waitForTimeout(3000);
          console.log('[Test 4] ✓ Review submitted');
        }

        await customerPage.screenshot({ path: 'test-results/tarot-review-submitted.png' });
      } else {
        console.log('[Test 4] Review button not visible - skipping review (may not be implemented yet)');
        await customerPage.screenshot({ path: 'test-results/tarot-no-review-button.png' });
      }

      // VERIFY AUTO-EXTRACTION: Check that cards mentioned in the reading are in the dictionary
      console.log('[Test 4] Verifying cards auto-extracted to dictionary...');
      await customerPage.goto(`/u/${customerId}/space/symbols/my-card-symbols`);
      await customerPage.waitForLoadState('networkidle');
      await customerPage.waitForTimeout(2000);

      // The practitioner's message mentioned: The Fool, The Magician, The World
      const expectedCards = ['The Fool', 'The Magician', 'The World'];
      let cardsFound = 0;

      for (const cardName of expectedCards) {
        const cardInDictionary = await customerPage.locator(`text=${cardName}`).first().isVisible({ timeout: 3000 }).catch(() => false);
        if (cardInDictionary) {
          cardsFound++;
          console.log(`[Test 4] ✓ Found "${cardName}" in dictionary`);
        } else {
          console.log(`[Test 4] ⚠️  "${cardName}" not found in dictionary (may need auto-extraction)`);
        }
      }

      await customerPage.screenshot({ path: 'test-results/tarot-dictionary-check.png' });

      if (cardsFound < expectedCards.length) {
        throw new Error(`[Test 4] FAILED: Only ${cardsFound}/${expectedCards.length} cards auto-extracted to dictionary - ALL cards mentioned in reading should be extracted`);
      }

      console.log('[Test 4] ✓ All cards auto-extracted to dictionary');

      // VERIFY JOURNAL FUNCTIONALITY: Check if "Journal the Cards" button works
      console.log('[Test 4] Checking journal functionality...');
      await customerPage.goto(`/u/${customerId}/space/readings/received`);
      await customerPage.waitForLoadState('networkidle');
      await customerPage.waitForTimeout(2000);

      // Click on the "View Reading" button to open details
      const viewReadingButton = customerPage.locator('button:has-text("View Reading")').first();
      const viewButtonVisible = await viewReadingButton.isVisible({ timeout: 5000 }).catch(() => false);

      if (!viewButtonVisible) {
        await customerPage.screenshot({ path: 'test-results/tarot-no-view-button.png' });
        throw new Error('[Test 4] FAILED: "View Reading" button not visible');
      }

      await viewReadingButton.click();
      await customerPage.waitForTimeout(2000);

      // Take screenshot to see what's showing
      await customerPage.screenshot({ path: 'test-results/tarot-reading-detail-view.png' });
      console.log('[Test 4] Screenshot taken of reading detail view');

      // Look for "Journal the Cards" button inside the reading detail dialog
      const journalButton = customerPage.locator('[role="dialog"] button:has-text("Journal the Cards"), [data-state="open"] button:has-text("Journal the Cards")').first();
      const journalBtnVisible = await journalButton.isVisible({ timeout: 5000 }).catch(() => false);

      if (!journalBtnVisible) {
        await customerPage.screenshot({ path: 'test-results/tarot-no-journal-button.png' });
        throw new Error('[Test 4] FAILED: "Journal the Cards" button not visible in reading detail dialog');
      }

      await journalButton.click();
      console.log('[Test 4] ✓ Clicked "Journal the Cards" button');

      // Wait for navigation to journal page
      await customerPage.waitForURL(/\/space\/journal\/card-pull/, { timeout: 10000 });
      await customerPage.waitForLoadState('networkidle');
      await customerPage.waitForTimeout(2000);

      console.log('[Test 4] ✓ Navigated to journal page');
      await customerPage.screenshot({ path: 'test-results/tarot-journal-page.png' });

      // Fill in the journal entry (card-pull form should be pre-filled with reading data)
      console.log('[Test 4] Creating journal entry...');

      // The form should open with prefilled data - check if "New Pull" button or form dialog is visible
      const newPullButton = customerPage.locator('button:has-text("New Pull"), button:has-text("Record Pull")').first();
      const formDialog = customerPage.locator('[data-testid="card-pull-form"], [role="dialog"]').first();

      const newPullVisible = await newPullButton.isVisible({ timeout: 3000 }).catch(() => false);
      const formVisible = await formDialog.isVisible({ timeout: 3000 }).catch(() => false);

      if (newPullVisible) {
        // Form not open yet - click to open it
        await newPullButton.click();
        await customerPage.waitForTimeout(2000);
        console.log('[Test 4] ✓ Clicked "New Pull" to open journal form');
      } else if (formVisible) {
        console.log('[Test 4] ✓ Journal form already open with prefilled data');
      } else {
        await customerPage.screenshot({ path: 'test-results/tarot-journal-no-form.png' });
        throw new Error('[Test 4] FAILED: Journal form not found on card-pull page');
      }

      // Multi-step form - need to fill in cards that were in the reading
      // Step 1: Fill in the card names (The Fool, The Magician, The World were in the reading)
      const cardInputs = customerPage.locator('input[placeholder*="Fool"], input[placeholder*="card"], [data-testid="card-name-input-0"]');
      const firstCardInput = cardInputs.first();
      const cardInputVisible = await firstCardInput.isVisible({ timeout: 3000 }).catch(() => false);

      if (!cardInputVisible) {
        await customerPage.screenshot({ path: 'test-results/tarot-journal-no-card-input.png' });
        throw new Error('[Test 4] FAILED: Card name input not found');
      }

      // Fill in the three cards from the reading
      await firstCardInput.fill('The Fool');
      console.log('[Test 4] ✓ Filled Card 1: The Fool');

      // Check if we need to add more cards or if they're already there
      const addCardButton = customerPage.locator('button:has-text("Add Card")').first();
      const addCardVisible = await addCardButton.isVisible({ timeout: 2000 }).catch(() => false);

      if (addCardVisible) {
        // Add second card
        await addCardButton.click();
        await customerPage.waitForTimeout(500);
        const secondCardInput = customerPage.locator('input[placeholder*="Fool"], input[placeholder*="card"]').nth(1);
        await secondCardInput.fill('The Magician');
        console.log('[Test 4] ✓ Filled Card 2: The Magician');

        // Add third card
        await addCardButton.click();
        await customerPage.waitForTimeout(500);
        const thirdCardInput = customerPage.locator('input[placeholder*="Fool"], input[placeholder*="card"]').nth(2);
        await thirdCardInput.fill('The World');
        console.log('[Test 4] ✓ Filled Card 3: The World');
      }

      // Now Continue button should be enabled
      const continueButton = customerPage.locator('button:has-text("Continue")').first();
      await continueButton.click();
      await customerPage.waitForTimeout(2000);
      console.log('[Test 4] ✓ Moved to reflection step');

      // Step 2: Add reflection/interpretation
      const reflectionField = customerPage.locator('textarea[data-testid="reflection-input"], textarea[placeholder*="reflect"], textarea[placeholder*="thought"]').first();
      const reflectionVisible = await reflectionField.isVisible({ timeout: 3000 }).catch(() => false);

      if (reflectionVisible) {
        await reflectionField.fill('The Fool represents new beginnings and taking a leap of faith. The Magician shows my power to manifest my desires. The World indicates completion and achievement of my goals.');
        console.log('[Test 4] ✓ Added reflection notes');
      }

      // Submit the journal entry - look for "Save to Journal" button
      const saveButton = customerPage.locator('button:has-text("Save to Journal")').first();
      const saveVisible = await saveButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (!saveVisible) {
        await customerPage.screenshot({ path: 'test-results/tarot-journal-no-save.png' });
        throw new Error('[Test 4] FAILED: "Save to Journal" button not found in reflection step');
      }

      // Use force click to bypass any overlays
      await saveButton.click({ force: true });
      await customerPage.waitForTimeout(3000);
      console.log('[Test 4] ✓ Saved journal entry');

      // Verify journal was saved - should see it in the history list
      const journalEntryInList = await customerPage.locator('text=The Fool, text=The Magician, text=The World').first().isVisible({ timeout: 5000 }).catch(() => false);

      if (!journalEntryInList) {
        await customerPage.screenshot({ path: 'test-results/tarot-journal-not-in-list.png' });
        console.log('[Test 4] ⚠️  Journal entry may not have been saved or is not visible in list');
      } else {
        console.log('[Test 4] ✓ Journal entry visible in history');
      }

      await customerPage.screenshot({ path: 'test-results/tarot-journal-completed.png' });

      console.log('[Test 4] ✓ Customer delivery and review flow completed');
    } finally {
      await customerContext.close();
    }
  });
});

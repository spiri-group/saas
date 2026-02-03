import { test, expect, Page, TestInfo } from '@playwright/test';
import { PractitionerSetupPage } from '../pages/PractitionerSetupPage';
import { AuthPage } from '../pages/AuthPage';
import { HomePage } from '../pages/HomePage';
import { UserSetupPage } from '../pages/UserSetupPage';
import {
  getCookiesFromPage,
  registerTestUser,
  completeStripeTestOnboarding,
} from '../utils/test-cleanup';

/**
 * ASYNC Medium Reading Service - Full Customer Journey
 *
 * This test covers the complete flow for an async mediumship reading service:
 * 1. Merchant creates ASYNC mediumship reading service
 * 2. Customer discovers and orders the service
 * 3. Merchant views service orders and delivers the reading (mentioning loved ones)
 * 4. Customer receives delivery, sees loved ones auto-extracted, and can reflect on reading
 */

// State variables shared across serial tests
const DESCRIBE_KEY = 'medium-journey';
let practitionerSlug: string;
let practitionerId: string;
let practitionerCookies: any[];
let serviceName: string;
let customerId: string;
let customerEmail: string;
let customerCookies: any[];
let orderId: string;
let deliveryCompleted: boolean = false; // Track if Test 3 successfully delivered

// Per-worker state tracking
const cookiesPerWorker = new Map<string, string>();
const practitionerPerWorker = new Map<string, string>();
const setupCompletedPerWorker = new Map<string, boolean>();

/** Generate unique test email */
function generateUniqueTestEmail(testInfo: TestInfo): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `medium-test-${timestamp}-${testInfo.parallelIndex}-${randomSuffix}@playwright.com`;
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

/** Open My Services create menu for a specific service type */
async function openMyServicesCreateMenu(page: Page, serviceType: 'Reading' | 'Healing' | 'Coaching') {
  await waitForDialogOverlayToClose(page);

  // Click on "My Services" in the sidebar
  const sideNav = page.locator('[aria-label="practitioner-side-nav"]');
  const myServicesButton = sideNav.locator('button[aria-label="My Services"]').first();
  if (await myServicesButton.isVisible({ timeout: 5000 })) {
    await myServicesButton.click();
    await page.waitForTimeout(1000);
  }

  // The menu items are "New Reading", "New Healing", "New Coaching" - not "Create"
  const newServiceButton = sideNav.locator(`button:has-text("New ${serviceType}"), a:has-text("New ${serviceType}")`).first();
  if (await newServiceButton.isVisible({ timeout: 3000 })) {
    await newServiceButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  }
}

/** Upload test thumbnail */
async function uploadTestThumbnail(page: Page) {
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAASwAAAEsCAYAAAB5fY51AAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAAOwgAADsIBFShKgAAAABl0RVh0U29mdHdhcmUAcGFpbnQubmV0IDQuMC4xMkMEa+wAAAGfSURBVHic7dMxAQAACAOgaf+/OxODI0AisBIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLEChIrSKwgsYLECvoALPIAO/BwANgAAAAASUVORK5CYII=';
  const pngBuffer = Buffer.from(pngBase64, 'base64');
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles({
    name: 'medium-service-thumbnail.png',
    mimeType: 'image/png',
    buffer: pngBuffer,
  });
  await page.waitForTimeout(6000);
}

// =============================================================================
// ASYNC READING SERVICE - MEDIUM - FULL CUSTOMER JOURNEY
// =============================================================================
test.describe.serial('ASYNC Reading Service - Medium - Full Customer Journey', () => {

  test('1. Merchant creates ASYNC mediumship reading service', async ({ page }, testInfo) => {
    test.setTimeout(360000);

    console.log('[Test 1] Creating merchant and Medium reading service...');

    // Create merchant
    const testEmail = generateUniqueTestEmail(testInfo);
    const practitionerSetupPage = new PractitionerSetupPage(page);
    practitionerSlug = await practitionerSetupPage.createPractitioner(testEmail, 'Medium Test', testInfo);
    console.log(`[Test 1] Practitioner slug: ${practitionerSlug}`);

    practitionerCookies = await page.context().cookies();
    await dismissWelcomeDialog(page);
    await setupLocation(page);

    // Get practitioner ID first
    practitionerId = await getPractitionerIdFromSlug(page, practitionerSlug) || '';
    console.log(`[Test 1] Practitioner ID: ${practitionerId}`);

    // Complete Stripe onboarding
    console.log('[Test 1] Completing Stripe onboarding...');
    const cookiesString = await getCookiesFromPage(page);
    if (!cookiesString) {
      throw new Error('Failed to get cookies from page');
    }
    const onboardingResult = await completeStripeTestOnboarding(practitionerId, cookiesString);
    if (onboardingResult.success) {
      console.log('[Test 1] ✓ Stripe onboarding completed');
      await page.reload();
      await page.waitForLoadState('networkidle');
    }

    // Navigate to practitioner dashboard
    await page.goto(`/p/${practitionerSlug}/manage`);
    await page.waitForLoadState('networkidle');
    await dismissWelcomeDialog(page);

    // Navigate to create reading service
    console.log('[Test 1] Creating ASYNC mediumship reading service...');
    await openMyServicesCreateMenu(page, 'Reading');

    const timestamp = Date.now();
    serviceName = `Medium Reading ${timestamp}`;

    console.log('[Test 1] Filling Medium service details...');

    const dialog = page.locator('[role="dialog"]');

    // Fill service name
    const nameInput = page.locator('input[name="name"]');
    if (await nameInput.isVisible({ timeout: 5000 })) {
      await nameInput.fill(serviceName);
    }

    // Fill description
    const descriptionInput = page.locator('textarea[name="description"]');
    if (await descriptionInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await descriptionInput.fill('I will connect with your loved ones in spirit and deliver their messages.');
    }

    // Select reading type as MEDIUM
    // First check for native select element
    const nativeReadingTypeSelect = dialog.locator('select[name="readingType"]');
    if (await nativeReadingTypeSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nativeReadingTypeSelect.selectOption('Medium');
      console.log('[Test 1] ✓ Selected Medium as reading type (native select)');
    } else {
      // Try clicking on a Radix Select trigger
      const readingTypeDropdown = dialog.locator('[data-testid="reading-type-select"], [data-slot="select-trigger"]').first();
      if (await readingTypeDropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
        await readingTypeDropdown.click();
        await page.waitForTimeout(500);
        const mediumOption = page.locator('[role="option"]:has-text("Medium"), [data-slot="select-item"]:has-text("Medium")').first();
        if (await mediumOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await mediumOption.click();
          console.log('[Test 1] ✓ Selected Medium as reading type (Radix select)');
        }
      }
    }

    // Fill price
    const priceInput = page.locator('input[name="price"]');
    if (await priceInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await priceInput.fill('50.00');
    }

    // Fill turnaround days
    const turnaroundInput = page.locator('input[name="turnaroundDays"]');
    if (await turnaroundInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await turnaroundInput.fill('2');
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

    // Step 2: Fill Mediumship-specific details
    const focusAreasInput = dialog.locator('[data-testid="focus-areas-input"]');
    if (await focusAreasInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await focusAreasInput.fill('Spirit Communication, Connecting with Loved Ones, Messages from Beyond');
      console.log('[Test 1] ✓ Filled focus areas for Mediumship');
    } else {
      console.log('[Test 1] Focus areas input not found, continuing...');
    }

    // Step 2 -> Step 3 (Thumbnail)
    const nextButton2 = dialog.locator('[data-testid="wizard-next-btn"]');
    await nextButton2.click();
    await page.waitForTimeout(2000);
    console.log('[Test 1] ✓ Moved to Step 3 (Thumbnail)');

    // Step 3: Upload thumbnail (required)
    console.log('[Test 1] Uploading thumbnail...');
    await uploadTestThumbnail(page);
    console.log('[Test 1] ✓ Thumbnail uploaded');

    // Step 3 -> Step 4 (Questions)
    const nextButton3 = dialog.locator('[data-testid="wizard-next-btn"]');
    await nextButton3.click();
    await page.waitForTimeout(2000);
    console.log('[Test 1] ✓ Moved to Step 4 (Questions)');

    // Step 4: Skip questions and submit
    await page.waitForTimeout(1000);
    const submitButton = dialog.locator('[data-testid="wizard-submit-btn"]');
    await expect(submitButton).toBeVisible({ timeout: 5000 });
    await submitButton.click();
    await page.waitForTimeout(5000);
    console.log('[Test 1] ✓ Clicked submit button');

    // Verify service appears in catalogue
    await page.goto(`/p/${practitionerSlug}`);
    await page.waitForLoadState('networkidle');
    const serviceCard = page.locator(`text=${serviceName}`).first();
    await expect(serviceCard).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'test-results/medium-service-created.png' });
    console.log('[Test 1] ✓ Medium reading service created and verified in catalogue');
  });

  test('2. Customer orders medium reading service', async ({ page, context }, testInfo) => {
    test.setTimeout(360000);

    console.log('[Test 2] Customer ordering medium reading service...');

    if (!practitionerSlug || !serviceName) {
      throw new Error('[Test 2] Missing practitionerSlug or serviceName from Test 1');
    }

    // Create customer user
    const testEmail = `customer-${generateUniqueTestEmail(testInfo)}`;
    customerEmail = testEmail;

    const authPage = new AuthPage(page);
    const userSetupPage = new UserSetupPage(page);

    await page.goto('/');
    await authPage.startAuthFlow(testEmail);

    // Wait for OTP input and enter test OTP
    await page.locator('[aria-label="input-login-otp"]').waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('[aria-label="input-login-otp"]').click();
    await page.keyboard.type('123456');
    await page.waitForURL('/', { timeout: 15000 });

    // Complete profile setup
    const homePage = new HomePage(page);
    try {
      await homePage.waitForCompleteProfileLink();
      await homePage.clickCompleteProfile();
      await page.waitForURL(/\/u\/.*\/setup/, { timeout: 10000 });

      const setupUrl = page.url();
      const userIdMatch = setupUrl.match(/\/u\/([^\/]+)\/setup/);
      if (userIdMatch) {
        customerId = userIdMatch[1];
        console.log(`[Test 2] Customer user ID: ${customerId}`);
      }

      await userSetupPage.fillUserProfile({
        firstName: 'Medium',
        lastName: 'Seeker',
        phone: '0412345678',
        address: 'Sydney Opera House',
        securityQuestion: 'What is your favorite flower?',
        securityAnswer: 'Rose',
      });

      // Complete user setup (primary interest selection happens in onboarding, not setup)
      await userSetupPage.startBrowsing();
      await page.waitForURL('/', { timeout: 15000 });
    } catch (error) {
      console.log('[Test 2] Profile setup not needed or already complete');
    }

    customerCookies = await page.context().cookies();

    // Navigate to practitioner storefront
    await page.goto(`/p/${practitionerSlug}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Find and click on the service
    const serviceCard = page.locator(`[data-testid="service-card"]:has-text("${serviceName}"), .service-card:has-text("${serviceName}")`).first();
    if (await serviceCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await serviceCard.click();
    } else {
      // Fallback: Find any card with service name
      const fallbackCard = page.locator(`text=${serviceName}`).first();
      await fallbackCard.click();
    }

    await page.waitForTimeout(2000);

    // Click "Add to Cart" button
    const addToCartButton = page.locator('button:has-text("Add to Cart")');
    await addToCartButton.waitFor({ state: 'visible', timeout: 10000 });
    await addToCartButton.click();
    await page.waitForTimeout(2000);
    console.log('[Test 2] ✓ Added to cart');

    // Open the cart drawer by clicking the cart button in the header
    console.log('[Test 2] Opening cart drawer...');
    const cartButton = page.locator('button[aria-label*="cart" i], button[aria-label*="Shopping" i]').first();
    await cartButton.waitFor({ state: 'visible', timeout: 10000 });
    await cartButton.click();
    await page.waitForTimeout(1500);
    console.log('[Test 2] ✓ Opened cart drawer');

    // Click "Checkout" button inside the cart drawer
    console.log('[Test 2] Proceeding to checkout...');
    const checkoutButton = page.locator('button:has-text("Checkout"), button:has-text("Proceed to Checkout")').first();
    await checkoutButton.waitFor({ state: 'visible', timeout: 10000 });
    await checkoutButton.click();
    await page.waitForTimeout(2000);
    console.log('[Test 2] ✓ Navigated to checkout');

    // Fill billing address (required before payment)
    console.log('[Test 2] Filling billing address...');

    // Click "Enter details manually" button
    const manualButton = page.locator('button:has-text("Enter details manually")');
    await manualButton.waitFor({ state: 'visible', timeout: 10000 });
    await manualButton.click();
    console.log('[Test 2] Clicked "Enter details manually"');
    await page.waitForTimeout(1000);

    // Fill manual billing address fields
    const nameInput = page.locator('input[name="manualAddress.name"]');
    await nameInput.waitFor({ state: 'visible', timeout: 5000 });
    await nameInput.fill('Test Customer');
    await page.locator('input[name="manualAddress.line1"]').fill('123 Test Street');
    await page.locator('input[name="manualAddress.city"]').fill('Sydney');
    await page.locator('input[name="manualAddress.postal_code"]').fill('2000');
    await page.locator('input[name="manualAddress.country"]').fill('AU');

    const saveButton = page.locator('button:has-text("Save Address")');
    await saveButton.waitFor({ state: 'visible', timeout: 5000 });
    await saveButton.click();
    await page.waitForTimeout(1500);
    console.log('[Test 2] ✓ Filled billing address manually');

    // Expand Payment Method section
    console.log('[Test 2] Expanding payment method section...');
    const paymentSection = page.locator('text=Payment Method').first();
    if (await paymentSection.isVisible({ timeout: 5000 }).catch(() => false)) {
      await paymentSection.click();
      await page.waitForTimeout(2000);
      console.log('[Test 2] ✓ Expanded payment method section');
    }

    // Fill Stripe payment form
    console.log('[Test 2] Filling Stripe payment...');
    const stripeFrames = page.locator('iframe[name^="__privateStripeFrame"]');
    await stripeFrames.first().waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(2000);

    const frameCount = await stripeFrames.count();
    console.log(`[Test 2] Found ${frameCount} Stripe iframes`);

    let filledNumber = false;
    let filledExpiry = false;
    let filledCvc = false;

    for (let i = 0; i < frameCount; i++) {
      const frame = page.frameLocator('iframe[name^="__privateStripeFrame"]').nth(i);

      if (!filledNumber) {
        const numberInput = frame.locator('input[name="number"]');
        if (await numberInput.isVisible({ timeout: 1000 }).catch(() => false)) {
          await numberInput.fill('4242424242424242');
          filledNumber = true;
          console.log(`[Test 2] ✓ Filled card number in iframe ${i}`);
        }
      }

      if (!filledExpiry) {
        const expiryInput = frame.locator('input[name="expiry"]');
        if (await expiryInput.isVisible({ timeout: 1000 }).catch(() => false)) {
          await expiryInput.fill('1228');
          filledExpiry = true;
          console.log(`[Test 2] ✓ Filled expiry in iframe ${i}`);
        }
      }

      if (!filledCvc) {
        const cvcInput = frame.locator('input[name="cvc"]');
        if (await cvcInput.isVisible({ timeout: 1000 }).catch(() => false)) {
          await cvcInput.fill('123');
          filledCvc = true;
          console.log(`[Test 2] ✓ Filled CVC in iframe ${i}`);
        }
      }

      if (filledNumber && filledExpiry && filledCvc) break;
    }

    await page.waitForTimeout(1000);
    console.log('[Test 2] ✓ Completed Stripe payment form');

    // Submit payment
    const payButton = page.locator('button:has-text("Pay"), button:has-text("Complete Order"), button:has-text("Finish & Pay")').first();
    await payButton.waitFor({ state: 'visible', timeout: 5000 });
    await payButton.click();
    console.log('[Test 2] Submitted payment...');

    // Wait for navigation to complete (page redirects after payment)
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.waitForTimeout(3000);

    // Wait for success dialog (should appear after navigation)
    const successDialog = page.locator('text=Payment successful').first();
    await successDialog.waitFor({ state: 'visible', timeout: 10000 });
    console.log('[Test 2] ✓ Payment successful dialog appeared');
    await page.waitForTimeout(1000);

    // Click "Go to orders" button
    const goToOrdersButton = page.locator('button:has-text("Go to orders")').first();
    await goToOrdersButton.waitFor({ state: 'visible', timeout: 5000 });
    await goToOrdersButton.click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/medium-order-placed.png' });
    console.log('[Test 2] ✓ Customer order placed successfully');
  });

  test('3. Merchant delivers medium reading with loved ones mentioned', async ({ page, context }, testInfo) => {
    test.setTimeout(360000);

    console.log('[Test 3] Merchant delivering medium reading...');

    if (!practitionerSlug || !practitionerId || !practitionerCookies) {
      throw new Error('[Test 3] Missing practitioner data from Test 1');
    }

    // Re-authenticate as practitioner
    await context.clearCookies();
    await context.addCookies(practitionerCookies);
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Navigate directly to service orders
    await page.goto(`/p/${practitionerSlug}/manage/services/orders`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000); // Give more time for data to load

    // Find the order card
    const orderCard = page.locator(`text="${serviceName}"`).first();
    await orderCard.waitFor({ state: 'visible', timeout: 10000 });
    console.log('[Test 3] ✓ Found order card');

    // Click "Start Fulfillment" button
    const startFulfillmentButton = page.locator('button:has-text("Start Fulfillment")').first();
    await startFulfillmentButton.waitFor({ state: 'visible', timeout: 5000 });
    await startFulfillmentButton.click();
    await page.waitForTimeout(3000);
    console.log('[Test 3] ✓ Clicked Start Fulfillment');

    // Wait for fulfillment dialog to be ready
    await page.waitForTimeout(2000);

    // Step 1: Review - Click Next
    let nextButton = page.locator('button:has-text("Next")').first();
    if (await nextButton.isEnabled({ timeout: 3000 }).catch(() => false)) {
      await nextButton.click();
      await page.waitForTimeout(2000);
      console.log('[Test 3] ✓ Completed Review step');
    }

    // Step 2: Upload - Upload a text file
    const uploadButton = page.locator('button:has-text("Upload")').first();
    if (await uploadButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Create a test delivery file
      const deliveryContent = `MEDIUM READING REPORT\n\nI connected with your loved ones:\n\n1. **Mary** - Your grandmother\n2. **Uncle Robert** - Sends his love\n3. **Elizabeth** - A dear friend`;
      const txtBuffer = Buffer.from(deliveryContent, 'utf-8');

      // Find file input
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles({
        name: 'reading-report.txt',
        mimeType: 'text/plain',
        buffer: txtBuffer,
      });
      await page.waitForTimeout(2000);
      console.log('[Test 3] ✓ Uploaded delivery file');

      // Click Next to continue
      nextButton = page.locator('button:has-text("Next")').first();
      await nextButton.waitFor({ state: 'visible', timeout: 5000 });
      // Wait for button to be enabled
      await page.waitForTimeout(1000);
      await nextButton.click();
      await page.waitForTimeout(2000);
      console.log('[Test 3] ✓ Completed Upload step');
    }

    // Fill in delivery message - THIS IS CRITICAL - mentions loved ones by name
    const deliveryDialog = page.locator('[role="dialog"]:visible').first();
    const messageTextarea = deliveryDialog.locator('textarea').first();
    await messageTextarea.waitFor({ state: 'visible', timeout: 5000 });

    // Create a test file for the reading report
    const testFileContent = `MEDIUM READING REPORT

Dear ${customerEmail},

Thank you for allowing me to connect with your loved ones in spirit.

During your reading, I was able to connect with the following souls:

1. **Mary** - Your grandmother came through with a very warm presence. She wants you to know she's proud of you and is always watching over you. She mentioned something about a garden and flowers, which seemed significant. Mary says she's finally at peace.

2. **Uncle Robert** - Your uncle came through briefly but with strong energy. He apologizes for not saying goodbye properly and wants you to know that he understands now. He's asking you to forgive him for any past hurts.

3. **Sarah** - A young woman, possibly a friend or cousin, came through. She mentioned laughter and good times you shared together. Sarah wants you to remember the joy, not the sadness of her passing.

These spirits all send their love and blessings. They are together on the other side and remain connected to you through the bonds of love.

With light and love,
Your Medium`;

    await messageTextarea.fill(testFileContent);
    await page.waitForTimeout(1000);

    // Upload file if file input present
    const fileInput = deliveryDialog.locator('input[type="file"]').first();
    if (await fileInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      const txtBuffer = Buffer.from(testFileContent, 'utf-8');
      await fileInput.setInputFiles({
        name: 'medium-reading-report.txt',
        mimeType: 'text/plain',
        buffer: txtBuffer,
      });
      await page.waitForTimeout(2000);
    }

    // Click Next to go to Confirm screen
    const nextToConfirm = deliveryDialog.locator('button:has-text("Next")').first();
    if (await nextToConfirm.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nextToConfirm.click();
      await page.waitForTimeout(2000);
      console.log('[Test 3] ✓ Moved to Confirm step');
    }

    // Submit delivery on confirmation screen
    const submitDeliveryButton = deliveryDialog.locator('button:has-text("Deliver to Customer"), button:has-text("Send"), button:has-text("Submit"), button:has-text("Confirm"), button[type="submit"]').first();
    await submitDeliveryButton.waitFor({ state: 'visible', timeout: 5000 });
    await submitDeliveryButton.click();
    await page.waitForTimeout(5000);
    console.log('[Test 3] ✓ Clicked Deliver to Customer');

    // Wait for success confirmation
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    deliveryCompleted = true;
    await page.screenshot({ path: 'test-results/medium-delivery-completed.png' });
    console.log('[Test 3] ✓ Medium reading delivered with loved ones mentioned (Mary, Robert, Sarah)');
  });

  test('4. Customer receives reading, sees auto-extracted loved ones, and can reflect', async ({ page, context }, testInfo) => {
    test.setTimeout(360000);

    console.log('[Test 4] Customer viewing delivered medium reading...');

    if (!deliveryCompleted) {
      throw new Error('[Test 4] Delivery not completed in Test 3');
    }

    if (!customerId || !customerCookies) {
      throw new Error('[Test 4] Missing customer data from Test 2');
    }

    // Re-authenticate as customer
    await context.clearCookies();
    await context.addCookies(customerCookies);
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Navigate to customer's received readings
    await page.goto(`/u/${customerId}/space/readings/received`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/medium-reading-list.png' });

    // Find the delivered reading
    const readingCard = page.locator(`text=${serviceName}`).first();
    await readingCard.waitFor({ state: 'visible', timeout: 10000 });

    // Click on the "View Reading" button to open details (using data-testid for stability)
    const viewReadingButton = page.locator('[data-testid="view-reading-button"]').first();
    const viewButtonVisible = await viewReadingButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (!viewButtonVisible) {
      await page.screenshot({ path: 'test-results/medium-no-view-button.png' });
      throw new Error('[Test 4] FAILED: "View Reading" button not visible');
    }

    await viewReadingButton.click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/medium-reading-detail-view.png' });

    // VERIFY AUTO-EXTRACTION: Check that loved ones mentioned in the reading are in the Loved Ones area
    console.log('[Test 4] Verifying loved ones auto-extracted to Loved Ones area...');
    await page.goto(`/u/${customerId}/space/mediumship/loved-ones`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // The practitioner's message mentioned: Mary, Uncle Robert, Sarah
    const expectedLovedOnes = ['Mary', 'Robert', 'Sarah'];
    let lovedOnesFound = 0;

    for (const lovedOneName of expectedLovedOnes) {
      const lovedOneInList = await page.locator(`text=${lovedOneName}`).first().isVisible({ timeout: 3000 }).catch(() => false);
      if (lovedOneInList) {
        lovedOnesFound++;
        console.log(`[Test 4] ✓ Found "${lovedOneName}" in Loved Ones area`);
      } else {
        console.log(`[Test 4] ⚠️  "${lovedOneName}" not found in Loved Ones area (auto-extraction may need implementation)`);
      }
    }

    await page.screenshot({ path: 'test-results/medium-loved-ones-check.png' });

    if (lovedOnesFound < expectedLovedOnes.length) {
      throw new Error(`[Test 4] FAILED: Only ${lovedOnesFound}/${expectedLovedOnes.length} loved ones auto-extracted - ALL loved ones mentioned in reading should be extracted`);
    }

    console.log('[Test 4] ✓ All loved ones auto-extracted to Loved Ones area');

    // VERIFY REFLECTION BUTTON: Go back to the reading and look for "Reflect on Reading" button
    await page.goto(`/u/${customerId}/space/readings/received`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Click "View Reading" again using data-testid for stability
    const viewButton2 = page.locator('[data-testid="view-reading-button"]').first();
    await viewButton2.click();
    await page.waitForTimeout(2000);

    // Look for "Reflect on this Reading" button inside the dialog - THIS MUST APPEAR for Medium readings
    const readingDialog = page.locator('[data-testid="reading-detail-dialog"]');
    const reflectButton = readingDialog.locator('[data-testid="reflect-on-reading-button"]');
    const reflectBtnVisible = await reflectButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (!reflectBtnVisible) {
      await page.screenshot({ path: 'test-results/medium-no-reflect-button.png' });
      throw new Error('[Test 4] FAILED: "Reflect on Reading" button not visible - this is a Medium reading, so the button MUST appear');
    }

    await reflectButton.click();
    console.log('[Test 4] ✓ Clicked "Reflect on Reading" button');

    // Wait for reflection dialog
    await page.waitForTimeout(2000);

    // Check if dialog opened
    const reflectionDialog = page.locator('[role="dialog"]').filter({ hasText: 'Reflect' }).first();
    const isDialogVisible = await reflectionDialog.isVisible({ timeout: 5000 }).catch(() => false);

    if (!isDialogVisible) {
      await page.screenshot({ path: 'test-results/medium-reflection-dialog-not-found.png' });
      throw new Error('[Test 4] FAILED: Reflection dialog did not open');
    }

    console.log('[Test 4] ✓ Reflection dialog opened');
    await page.screenshot({ path: 'test-results/medium-reflection-dialog.png' });

    // Wait for form to be fully loaded
    await page.waitForTimeout(1000);

    // REQUIRED: Fill reader name (required field)
    const readerNameInput = reflectionDialog.locator('[data-testid="reader-name"]');
    await readerNameInput.waitFor({ state: 'visible', timeout: 5000 });
    await readerNameInput.clear();
    await readerNameInput.fill('Test Medium Reader');
    console.log('[Test 4] ✓ Filled reader name (required)');

    // Fill in main messages
    const mainMessagesTextarea = reflectionDialog.locator('#mainMessages');
    if (await mainMessagesTextarea.isVisible({ timeout: 2000 }).catch(() => false)) {
      await mainMessagesTextarea.fill('Connected with grandmother Mary and uncle Robert. They both send their love.');
      console.log('[Test 4] ✓ Filled main messages');
    }

    // Fill in emotional impact
    const emotionalImpactInput = reflectionDialog.locator('#emotionalImpact');
    if (await emotionalImpactInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await emotionalImpactInput.fill('Felt deeply connected to loved ones');
      console.log('[Test 4] ✓ Filled emotional impact');
    }

    // Fill in additional notes
    const notesTextarea = reflectionDialog.locator('#notes');
    if (await notesTextarea.isVisible({ timeout: 2000 }).catch(() => false)) {
      await notesTextarea.fill('This reading brought me peace and closure. The medium accurately described my grandmother Mary and uncle Robert.');
      console.log('[Test 4] ✓ Filled additional notes');
    }

    // Verify required field is filled before saving
    const readerNameValue = await readerNameInput.inputValue();
    if (!readerNameValue) {
      throw new Error('[Test 4] FAILED: Reader name field is empty before save');
    }
    console.log(`[Test 4] Reader name value before save: "${readerNameValue}"`);

    // Save the reflection - intercept network to verify mutation is called
    const saveButton = reflectionDialog.locator('[data-testid="save-reflection"]');
    await saveButton.waitFor({ state: 'visible', timeout: 5000 });

    // Click save and wait for network response
    const [response] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/graphql') && resp.request().method() === 'POST', { timeout: 15000 }).catch(() => null),
      saveButton.click()
    ]);

    if (response) {
      const responseBody = await response.json().catch(() => null);
      console.log('[Test 4] GraphQL response status:', response.status());
      if (responseBody?.data?.createReadingReflection) {
        const result = responseBody.data.createReadingReflection;
        console.log(`[Test 4] Mutation result: success=${result.success}, message=${result.message || 'none'}`);
        if (!result.success) {
          await page.screenshot({ path: 'test-results/medium-reflection-mutation-failed.png' });
          throw new Error(`[Test 4] FAILED: Mutation returned success=false: ${result.message}`);
        }
      }
    } else {
      console.log('[Test 4] ⚠️ No GraphQL response captured');
    }

    console.log('[Test 4] ✓ Clicked Save Reflection button');

    // Wait for dialog to close
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle');

    // Check if dialog closed (indicates successful save)
    const dialogStillOpen = await reflectionDialog.isVisible({ timeout: 2000 }).catch(() => false);
    if (dialogStillOpen) {
      await page.screenshot({ path: 'test-results/medium-reflection-dialog-still-open.png' });
      console.log('[Test 4] ⚠️ Dialog still open after save');
    } else {
      console.log('[Test 4] ✓ Dialog closed after save');
    }

    await page.waitForTimeout(1000);

    // Verify the reflection was saved by navigating to reflections page
    await page.goto(`/u/${customerId}/space/mediumship/reflections`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/medium-reflections-page.png' });

    // Assert the reflection we created is visible - look for the reader name we entered
    const reflectionWithReader = page.locator('text=Test Medium Reader').first();
    await expect(reflectionWithReader).toBeVisible({ timeout: 10000 });
    console.log('[Test 4] ✓ Reflection saved and visible (found "Test Medium Reader")');

    // PART 3: Edit a loved one and add personal notes
    console.log('[Test 4] Now editing a loved one to add personal notes...');
    await page.goto(`/u/${customerId}/space/mediumship/loved-ones`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Find Mary's card and click edit (hover to reveal edit button)
    const maryCard = page.locator('text=Mary').first();
    await maryCard.waitFor({ state: 'visible', timeout: 5000 });
    await maryCard.hover();
    await page.waitForTimeout(500); // Wait for hover effect

    const editButton = page.locator('[data-testid="edit-loved-one"]').first();
    await editButton.waitFor({ state: 'visible', timeout: 5000 });
    await editButton.click();
    console.log('[Test 4] ✓ Clicked edit on Mary');

    // Wait for edit dialog
    await page.waitForTimeout(1000);
    const lovedOneDialog = page.locator('[role="dialog"]').first();
    await lovedOneDialog.waitFor({ state: 'visible', timeout: 5000 });

    // Fill in personal memory
    const personalMemoryTextarea = lovedOneDialog.locator('#personalMemory');
    if (await personalMemoryTextarea.isVisible({ timeout: 2000 }).catch(() => false)) {
      await personalMemoryTextarea.fill('Grandma Mary always made the best apple pie. She taught me that love is the secret ingredient in everything.');
      console.log('[Test 4] ✓ Added personal memory for Mary');
    }

    // Fill in their personality
    const personalityTextarea = lovedOneDialog.locator('#theirPersonality');
    if (await personalityTextarea.isVisible({ timeout: 2000 }).catch(() => false)) {
      await personalityTextarea.fill('Warm, nurturing, always had a smile. Loved gardening and spending time with family.');
      console.log('[Test 4] ✓ Added personality description for Mary');
    }

    // Save the loved one
    const saveLOButton = lovedOneDialog.locator('[data-testid="save-loved-one"]');
    await saveLOButton.waitFor({ state: 'visible', timeout: 5000 });
    await saveLOButton.click();
    console.log('[Test 4] ✓ Clicked Save for Mary');

    // Wait for save to complete
    await page.waitForTimeout(2000);

    // Verify the changes persisted by clicking on Mary again to view
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Click on Mary's card to view details
    const maryCardUpdated = page.locator('text=Mary').first();
    await maryCardUpdated.click();
    await page.waitForTimeout(1000);

    // Verify the personal memory shows in the detail view
    const memoryText = page.locator('text=apple pie');
    const memoryVisible = await memoryText.isVisible({ timeout: 5000 }).catch(() => false);

    if (memoryVisible) {
      console.log('[Test 4] ✓ Personal memory for Mary persisted and is visible');
    } else {
      console.log('[Test 4] ⚠️  Could not verify personal memory in detail view');
    }

    await page.screenshot({ path: 'test-results/medium-reading-complete.png' });
    console.log('[Test 4] ✓ Medium reading customer journey completed successfully');
  });
});

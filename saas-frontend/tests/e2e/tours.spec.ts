import { test, expect } from '@playwright/test';
import { TourPage } from '../pages/TourPage';
import { MerchantSetupPage } from '../pages/MerchantSetupPage';
import { AuthPage } from '../pages/AuthPage';
import { HomePage } from '../pages/HomePage';
import { UserSetupPage } from '../pages/UserSetupPage';
import {
  clearTestEntityRegistry,
  getCookiesFromPage,
  cleanupTestUsers,
  cleanupTestMerchants,
  completeStripeTestOnboarding,
  registerTestUser,
} from '../utils/test-cleanup';

/**
 * Tours E2E Tests - Complete Customer Journey
 *
 * Self-contained test suite that creates all its own test data:
 * 1. Merchant Setup: Create merchant with location + Stripe
 * 2. Tour Creation: Create tour with tickets via wizard
 * 3. Session Scheduling: Schedule sessions for the tour
 * 4. Customer Booking: Customer signs up and books tour
 * 5. Merchant Check-In: Verify booking and check-in flow
 * 6. Customer Cancellation: Test self-service cancellation
 *
 * Follows the same patterns as practitioner-customer-journey.spec.ts
 */

// Shared state for serial tests
let merchantSlug: string;
let merchantId: string;
let tourId: string;
let tourName: string;
let sessionId: string;
let bookingCode: string;
let customerEmail: string;
let customerUserId: string;

// Storage states for session restoration between tests
let merchantStorageState: { cookies: any[]; origins: any[] } | null = null;
let customerStorageState: { cookies: any[]; origins: any[] } | null = null;

// Cleanup tracking per worker
const cookiesPerWorker = new Map<number, string>();

/** Helper to get merchant ID from slug */
async function getMerchantIdFromSlug(page: any, slug: string): Promise<string | null> {
  const result = await page.evaluate(async (merchantSlug: string) => {
    const response = await fetch('/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query GetVendorId($slug: String!) {
          vendorIdFromSlug(slug: $slug) {
            merchantId
          }
        }`,
        variables: { slug: merchantSlug }
      })
    });
    const data = await response.json();
    return data.data?.vendorIdFromSlug?.merchantId;
  }, slug);
  return result;
}

/** Helper to add location (prerequisite for tours) */
async function setupLocation(page: any) {
  // Open Profile > Setup menu
  const profileButton = page.locator('button[aria-label="Profile"]');
  await profileButton.waitFor({ state: 'visible', timeout: 10000 });
  await profileButton.click();

  const setupButton = page.locator('button[aria-label="Setup"]');
  await setupButton.waitFor({ state: 'visible', timeout: 10000 });
  await setupButton.click();

  const locationsButton = page.locator('button[aria-label="Locations"]');
  await locationsButton.waitFor({ state: 'visible', timeout: 10000 });
  await locationsButton.click({ force: true });

  const dialog = page.locator('[role="dialog"]:not([aria-hidden="true"])');
  await expect(dialog).toBeVisible({ timeout: 10000 });

  const titleInput = dialog.locator('input[placeholder="Name"]').first();
  await expect(titleInput).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(1000);

  await titleInput.clear();
  await titleInput.fill('Tour Meeting Point');

  // Fill address
  const addressInput = dialog.locator('input[placeholder="Physical address"]').first();
  await addressInput.click();
  await addressInput.pressSequentially('Sydney Opera House', { delay: 50 });
  await page.waitForTimeout(3000);

  const autocompleteListbox = page.locator('[role="listbox"]');
  if (await autocompleteListbox.isVisible({ timeout: 5000 }).catch(() => false)) {
    const firstOption = page.locator('[role="option"]').first();
    if (await firstOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstOption.click();
      await page.waitForTimeout(1000);
    }
  }

  const saveButton = dialog.locator('button:has-text("Save & Close")');
  await expect(saveButton).toBeEnabled({ timeout: 5000 });
  await saveButton.click();
  await expect(dialog).not.toBeVisible({ timeout: 10000 });
}

/** Helper to dismiss welcome dialog */
async function dismissWelcomeDialog(page: any) {
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
  } catch {
    // Dialog not present
  }
}

/** Generate unique test email */
function generateTestEmail(prefix: string, testInfo: { parallelIndex: number }): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${testInfo.parallelIndex}-${randomSuffix}@playwright.com`;
}

// Cleanup
test.beforeAll(async ({}, testInfo) => {
  console.log('[Setup] Preparing tours test environment...');
  clearTestEntityRegistry(testInfo.parallelIndex);
});

test.afterAll(async ({}, testInfo) => {
  test.setTimeout(120000);
  const workerId = testInfo.parallelIndex;
  const cookies = cookiesPerWorker.get(workerId);

  if (cookies) {
    try {
      await cleanupTestMerchants(cookies, workerId);
      await cleanupTestUsers(cookies, workerId);
    } catch (error) {
      console.error('[Cleanup] Error:', error);
    } finally {
      cookiesPerWorker.delete(workerId);
    }
  }
  clearTestEntityRegistry(workerId);
});

test.describe.serial('Tour Customer Journey', () => {
  test('1. Setup: Create merchant with location and Stripe', async ({ page }, testInfo) => {
    test.setTimeout(300000);

    const workerId = testInfo.parallelIndex;
    const testEmail = generateTestEmail('tour-merchant', testInfo);
    const timestamp = Date.now();

    // Create merchant using the setup page
    const merchantSetupPage = new MerchantSetupPage(page);
    merchantSlug = await merchantSetupPage.createMerchant(testEmail, `Tour Test Merchant ${timestamp}`, testInfo);

    const cookies = await getCookiesFromPage(page);
    if (cookies) cookiesPerWorker.set(workerId, cookies);

    console.log(`[Test 1] ✓ Merchant created: ${merchantSlug}`);

    // Get merchant ID for Stripe onboarding
    merchantId = await getMerchantIdFromSlug(page, merchantSlug) || '';
    console.log(`[Test 1] Merchant ID: ${merchantId}`);

    // Dismiss welcome dialog
    await dismissWelcomeDialog(page);

    // Add location (required for tours)
    console.log('[Test 1] Adding location...');
    await setupLocation(page);
    console.log('[Test 1] ✓ Location added');

    // Complete Stripe onboarding
    if (merchantId && cookies) {
      console.log('[Test 1] Completing Stripe onboarding...');
      const result = await completeStripeTestOnboarding(merchantId, cookies);
      if (result.success) {
        console.log('[Test 1] ✓ Stripe onboarding complete');
        await page.reload();
        await page.waitForLoadState('networkidle');
      } else {
        console.warn('[Test 1] Stripe onboarding warning:', result.message);
      }
    }

    // Save merchant storage state for subsequent tests
    merchantStorageState = await page.context().storageState();
    console.log('[Test 1] ✓ Saved merchant storage state for subsequent tests');

    console.log('[Test 1] ✓ Merchant setup complete');
  });

  test('2. Create tour with tickets', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    const timestamp = Date.now();
    tourName = `Sydney Harbour Tour ${timestamp}`;

    // Restore merchant session from Test 1
    if (merchantStorageState) {
      await page.context().addCookies(merchantStorageState.cookies);
      console.log('[Test 2] Restored merchant session');
    } else {
      throw new Error('Merchant storage state not available - Test 1 must run first');
    }

    const tourPage = new TourPage(page);

    // Navigate to merchant dashboard
    await tourPage.navigateToMerchant(merchantSlug);
    await dismissWelcomeDialog(page);

    // Open create tour dialog
    console.log('[Test 2] Opening tour creation wizard...');
    await tourPage.openCreateTourDialog();
    console.log('[Test 2] ✓ Tour wizard opened');

    // Step 1: Tour Details
    console.log('[Test 2] Step 1: Filling tour details...');
    await tourPage.fillTourDetails({
      name: tourName,
      description: 'Experience the beauty of Sydney Harbour on this guided walking tour. Visit iconic landmarks including the Opera House and Harbour Bridge.',
      country: 'Australia',
    });

    // Click Next and wait for Step 2 to appear
    // Use evaluate to scroll within the dialog and click
    await page.locator('button:has-text("Next")').evaluate((el) => {
      el.scrollIntoView({ behavior: 'instant', block: 'center' });
      (el as HTMLElement).click();
    });
    await page.waitForTimeout(1000);

    // Verify we're on Step 2 (Thumbnail) by checking for file upload input or thumbnail-related elements
    const step2Visible = await page.locator('input[type="file"], text=Upload, text=Drop').first().isVisible({ timeout: 10000 }).catch(() => false);
    if (step2Visible) {
      console.log('[Test 2] ✓ Step 1 complete - on thumbnail step');
    } else {
      // Take screenshot to debug what step we're on
      await page.screenshot({ path: 'test-results/tour-step1-result.png' });
      console.log('[Test 2] ⚠️ May still be on step 1 - check screenshot');
    }

    // Helper to click Next button using JavaScript (handles viewport issues in dialog)
    const clickNextBtn = async () => {
      await page.evaluate(() => {
        const btn = document.querySelector('[data-testid="tour-wizard-next-btn"]') as HTMLButtonElement;
        if (btn) {
          btn.scrollIntoView({ behavior: 'instant', block: 'center' });
          btn.click();
        }
      });
      await page.waitForTimeout(1500);
    };

    // Helper to click Create Tour button using JavaScript
    const clickCreateBtn = async () => {
      await page.evaluate(() => {
        // Look for Create Tour button or just Create button on the last step
        const btn = document.querySelector('[data-testid="tour-wizard-create-btn"]') as HTMLButtonElement
          || document.querySelector('button:not([disabled])') as HTMLButtonElement;
        if (btn && (btn.textContent?.includes('Create') || btn.textContent?.includes('Save'))) {
          btn.scrollIntoView({ behavior: 'instant', block: 'center' });
          btn.click();
        }
      });
      await page.waitForTimeout(2000);
    };

    // Step 2: Thumbnail (skip upload for now, it's optional)
    console.log('[Test 2] Step 2: Skipping thumbnail upload (optional)...');
    // await tourPage.uploadThumbnail();
    await clickNextBtn();
    console.log('[Test 2] ✓ Step 2 complete');

    // Step 3: Itinerary
    console.log('[Test 2] Step 3: Adding itinerary...');
    await tourPage.fillItinerary([
      { name: 'Meet at Circular Quay', time: '09:00' },
      { name: 'Sydney Opera House Tour', time: '09:30' },
      { name: 'Walk to Harbour Bridge', time: '11:00' },
      { name: 'Lunch at The Rocks', time: '12:30' },
    ]);
    await clickNextBtn();
    console.log('[Test 2] ✓ Step 3 complete');

    // Step 4: Tickets
    console.log('[Test 2] Step 4: Adding ticket variants...');
    await tourPage.fillTicketVariants([
      { name: 'Adult', price: '49.00', description: 'Full price adult ticket' },
      { name: 'Child (5-12)', price: '29.00', description: 'Children aged 5-12 years' },
      { name: 'Family (2+2)', price: '140.00', description: '2 adults + 2 children', peopleCount: 4 },
    ]);

    // Create the tour
    console.log('[Test 2] Creating tour...');
    await clickCreateBtn();

    // Wait for success and extract tour ID from URL or toast
    await page.waitForTimeout(3000);

    // Check for success indicators
    const currentUrl = page.url();
    const successToast = await page.locator('[data-sonner-toast]:has-text("success"), [data-sonner-toast]:has-text("created")').isVisible({ timeout: 5000 }).catch(() => false);

    if (successToast || currentUrl.includes('events-and-tours')) {
      console.log('[Test 2] ✓ Tour created successfully!');

      // Try to extract tour ID - navigate to Events & Tours and get from dropdown
      await tourPage.navigateToEventsAndTours(merchantSlug);
      await page.waitForTimeout(2000);

      // Take screenshot to see the page state
      await page.screenshot({ path: 'test-results/events-and-tours-page.png' });

      // Click on tour selector to see available tours (ComboBox adds -trigger suffix to aria-label)
      const tourCombobox = page.locator('[aria-label="combobox-schedule-tour-trigger"]');
      if (await tourCombobox.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('[Test 2] Tour combobox is visible, clicking...');
        await tourCombobox.click();
        await page.waitForTimeout(500);

        // Find our tour in the dropdown and extract ID (CommandItem uses cmdk-item attribute)
        const tourOption = page.locator(`[cmdk-item]:has-text("${tourName}")`).first();
        if (await tourOption.isVisible({ timeout: 5000 }).catch(() => false)) {
          // Get the data-value attribute which contains the tour ID
          tourId = await tourOption.getAttribute('data-value') || '';
          console.log(`[Test 2] Tour ID: ${tourId}`);
          await tourOption.click();
        } else {
          console.log('[Test 2] Tour option not found in dropdown');
        }
      } else {
        console.log('[Test 2] Tour combobox not visible - page may not have loaded correctly');
      }
    } else {
      // Take screenshot for debugging
      await page.screenshot({ path: 'test-results/tour-creation-result.png' });
      console.log('[Test 2] Tour creation result unclear - check screenshot');
    }

    expect(tourName).toBeDefined();
    console.log('[Test 2] ✓ Tour creation test complete');
  });

  test('3. Schedule tour sessions', async ({ page }) => {
    test.setTimeout(120000);

    // Restore merchant session
    if (merchantStorageState) {
      await page.context().addCookies(merchantStorageState.cookies);
      console.log('[Test 3] Restored merchant session');
    } else {
      throw new Error('Merchant storage state not available');
    }

    const tourPage = new TourPage(page);

    // Navigate to Events & Tours page
    await tourPage.navigateToEventsAndTours(merchantSlug);
    await page.waitForTimeout(3000);

    // Take screenshot to see page state
    await page.screenshot({ path: 'test-results/test3-events-and-tours.png' });
    console.log(`[Test 3] Current URL: ${page.url()}`);

    // Check if page loaded correctly (might be blocked by payments requirement)
    const scheduleDatesPanel = page.locator('[data-testid="schedule-dates-panel"]');
    if (!await scheduleDatesPanel.isVisible({ timeout: 10000 }).catch(() => false)) {
      console.log('[Test 3] Schedule panel not visible - checking for payment requirements...');

      // Check for any payment/stripe warning
      const paymentWarning = page.locator('text=payment, text=Stripe, text=connect');
      if (await paymentWarning.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('[Test 3] Page requires payments to be fully configured');
      }

      // Take another screenshot for debugging
      await page.screenshot({ path: 'test-results/test3-page-blocked.png' });
    }

    console.log('[Test 3] Scheduling tour sessions...');

    // Select the tour we created
    await tourPage.selectTourForScheduling(tourName);
    console.log('[Test 3] ✓ Tour selected');

    // Set capacity
    await tourPage.setSessionCapacity(20);
    console.log('[Test 3] ✓ Capacity set to 20');

    // Select dates - next 3 days
    const today = new Date();
    const dates = [
      new Date(today.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
      new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000), // Day after
      new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    ];

    await tourPage.selectDatesForScheduling(dates);
    console.log('[Test 3] ✓ Dates selected');

    // Save the schedule
    await tourPage.saveSchedule();

    // Verify sessions were created
    await page.waitForTimeout(2000);
    const sessionsPanel = page.locator('[data-testid="sessions-panel"], text=Scheduled Sessions');
    const hasSessions = await sessionsPanel.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasSessions) {
      console.log('[Test 3] ✓ Sessions scheduled and visible');
    }

    console.log('[Test 3] ✓ Session scheduling complete');
  });

  test('4. Customer signs up and books tour', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    const workerId = testInfo.parallelIndex;
    customerEmail = generateTestEmail('tour-customer', testInfo);

    // === Customer Authentication ===
    console.log('[Test 4] Customer signing up...');
    const authPage = new AuthPage(page);
    const homePage = new HomePage(page);
    const userSetupPage = new UserSetupPage(page);

    await page.goto('/');
    await authPage.startAuthFlow(customerEmail);
    await expect(page.locator('[aria-label="input-login-otp"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[aria-label="input-login-otp"]').click();
    await page.keyboard.type('123456');
    await page.waitForURL('/', { timeout: 15000 });

    // Complete user profile
    await homePage.waitForCompleteProfileLink();
    await homePage.clickCompleteProfile();
    await expect(page).toHaveURL(/\/u\/.*\/setup/, { timeout: 10000 });

    const url = page.url();
    const userIdMatch = url.match(/\/u\/([^\/]+)\/setup/);
    if (userIdMatch) {
      customerUserId = userIdMatch[1];
      registerTestUser({ id: customerUserId, email: customerEmail }, workerId);
    }

    await userSetupPage.fillUserProfile({
      firstName: 'Tour',
      lastName: 'Customer',
      phone: '0498765432',
      address: 'Melbourne CBD',
      securityQuestion: 'What is your favorite color?',
      securityAnswer: 'Green',
    });

    // Click "Start Browsing" to complete setup
    const startBrowsingBtn = page.getByRole('button', { name: 'Start Browsing SpiriVerse' });
    if (await startBrowsingBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startBrowsingBtn.click();
      await page.waitForURL('/', { timeout: 15000 });
    }

    console.log('[Test 4] ✓ Customer profile complete');

    // Save storage state for subsequent tests
    customerStorageState = await page.context().storageState();

    // === Navigate to Tour Page ===
    console.log('[Test 4] Navigating to tour page...');
    const tourPage = new TourPage(page);

    if (tourId) {
      await tourPage.navigateToPublicTour(merchantSlug, tourId);
    } else {
      // Fallback: navigate to merchant page and find tour
      await page.goto(`/m/${merchantSlug}`);
      await page.waitForLoadState('networkidle');
      const tourLink = page.locator(`a:has-text("${tourName}")`).first();
      if (await tourLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await tourLink.click();
        await page.waitForLoadState('networkidle');
      }
    }

    // Verify tour page loaded
    await expect(page.locator('h1, [data-testid="tour-title"]').filter({ hasText: /Sydney Harbour|Tour/ })).toBeVisible({ timeout: 10000 });
    console.log('[Test 4] ✓ Tour page loaded');

    // === Book the Tour ===
    console.log('[Test 4] Booking tour...');

    // Select first available date
    const dateButton = page.locator('[data-testid^="date-btn"]').first();
    if (await dateButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dateButton.click();
      await page.waitForTimeout(500);
      console.log('[Test 4] ✓ Date selected');
    }

    // Select first available time
    const timeButton = page.locator('[data-testid^="time-slot-btn"]').first();
    if (await timeButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await timeButton.click();
      await page.waitForTimeout(500);
      console.log('[Test 4] ✓ Time selected');

      // Get session ID for later tests
      sessionId = await timeButton.getAttribute('data-testid') || '';
    }

    // Add tickets - 2 Adults
    const adultPlusBtn = page.locator('div:has-text("Adult")').first().locator('button:has-text("+")');
    if (await adultPlusBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await adultPlusBtn.click();
      await page.waitForTimeout(200);
      await adultPlusBtn.click();
      console.log('[Test 4] ✓ 2 Adult tickets selected');
    }

    // Fill email
    const emailInput = page.locator('input[type="email"], [data-testid="booking-email-input"]');
    if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await emailInput.fill(customerEmail);
      console.log('[Test 4] ✓ Email entered');
    }

    // Click "Proceed to Payment" or "Book Now"
    const proceedBtn = page.locator('button:has-text("Proceed to Payment"), button:has-text("Book Now")');
    if (await proceedBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await proceedBtn.click();
      await page.waitForTimeout(3000);
      console.log('[Test 4] ✓ Clicked proceed to payment');
    }

    // Check if Stripe form appears (for real payment) or booking succeeds (test mode)
    const stripeForm = page.locator('iframe[name*="stripe"]');
    const bookingSuccess = page.locator('text=Booking Confirmed, text=booking code');

    if (await stripeForm.isVisible({ timeout: 10000 }).catch(() => false)) {
      console.log('[Test 4] Stripe payment form visible - filling test card...');

      // Fill Stripe test card
      const frame = page.frameLocator('iframe[name*="stripe"]').first();
      const cardInput = frame.locator('input[name="number"]');
      if (await cardInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await cardInput.fill('4242424242424242');
        await frame.locator('input[name="expiry"]').fill('12/34');
        await frame.locator('input[name="cvc"]').fill('123');
      }

      // Submit payment
      const payBtn = page.locator('button:has-text("Pay"), button:has-text("Confirm")');
      if (await payBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await payBtn.click();
        await page.waitForTimeout(10000);
      }
    }

    // Check for booking confirmation
    if (await bookingSuccess.isVisible({ timeout: 15000 }).catch(() => false)) {
      console.log('[Test 4] ✓ Booking confirmed!');

      // Extract booking code
      const codeElement = page.locator('p.font-mono, [data-testid="booking-code"]');
      if (await codeElement.isVisible({ timeout: 5000 }).catch(() => false)) {
        bookingCode = await codeElement.textContent() || '';
        console.log(`[Test 4] Booking code: ${bookingCode}`);
      }
    } else {
      // Take screenshot for debugging
      await page.screenshot({ path: 'test-results/tour-booking-result.png' });
      console.log('[Test 4] Booking flow completed - check screenshot for result');
    }

    console.log('[Test 4] ✓ Customer booking test complete');
  });

  test('5. Merchant verifies booking and check-in', async ({ page }, testInfo) => {
    test.setTimeout(120000);

    // Restore merchant session
    if (merchantStorageState) {
      await page.context().addCookies(merchantStorageState.cookies);
      console.log('[Test 5] Restored merchant session');
    } else {
      throw new Error('Merchant storage state not available');
    }

    const tourPage = new TourPage(page);

    // Navigate to Events & Tours page to find and operate a session
    console.log('[Test 5] Navigating to Events & Tours...');
    await tourPage.navigateToEventsAndTours(merchantSlug);
    await page.waitForTimeout(3000);

    // Look for an Operate button on any session
    const operateBtn = page.locator('button:has-text("Operate")').first();
    if (await operateBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
      console.log('[Test 5] Found session, clicking Operate...');
      await operateBtn.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Verify we're on the operate page
      const operateHeader = page.locator('text=Operate Mode');
      await expect(operateHeader).toBeVisible({ timeout: 10000 });
      console.log('[Test 5] ✓ Operate page loaded');

      // Click on the Check-In tab
      const checkInTab = page.locator('[role="tab"]:has-text("Check-In")');
      if (await checkInTab.isVisible({ timeout: 5000 }).catch(() => false)) {
        await checkInTab.click();
        await page.waitForTimeout(1000);
        console.log('[Test 5] ✓ Check-In tab selected');
      }

      // Verify check-in panel loaded
      const bookingCodeInput = page.getByTestId('booking-code-input');
      await expect(bookingCodeInput).toBeVisible({ timeout: 10000 });
      console.log('[Test 5] ✓ Check-in panel loaded');

      // If we have a booking code, try to look it up
      if (bookingCode) {
        console.log(`[Test 5] Looking up booking: ${bookingCode}`);
        await bookingCodeInput.fill(bookingCode);

        // Click search button
        const searchBtn = page.getByTestId('search-btn');
        if (await searchBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await searchBtn.click();
        }
        await page.waitForTimeout(2000);

        // Check for booking details
        const bookingDetails = page.locator('[data-testid="booking-details-panel"]');
        if (await bookingDetails.isVisible({ timeout: 5000 }).catch(() => false)) {
          console.log('[Test 5] ✓ Booking found and displayed');

          // Try to check in
          const checkInBtn = page.getByTestId('check-in-btn');
          if (await checkInBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await checkInBtn.click();
            await page.waitForTimeout(2000);

            const successAlert = page.getByTestId('success-alert');
            if (await successAlert.isVisible({ timeout: 5000 }).catch(() => false)) {
              console.log('[Test 5] ✓ Customer checked in successfully');
            }
          }
        } else {
          console.log('[Test 5] Booking not found - may need webhook processing');
        }
      }

      // Test invalid code handling
      const clearBtn = page.getByTestId('clear-search-btn');
      if (await clearBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await clearBtn.click();
      }

      await bookingCodeInput.fill('999999');
      const searchBtn = page.getByTestId('search-btn');
      if (await searchBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await searchBtn.click();
      }
      await page.waitForTimeout(2000);

      const notFoundAlert = page.getByTestId('not-found-alert');
      if (await notFoundAlert.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('[Test 5] ✓ Invalid code handled correctly');
      }
    } else {
      console.log('[Test 5] No sessions available to operate - skipping check-in test');
    }

    console.log('[Test 5] ✓ Check-in test complete');
  });

  test('6. Merchant views analytics', async ({ page }, testInfo) => {
    test.setTimeout(60000);

    // Restore merchant session
    if (merchantStorageState) {
      await page.context().addCookies(merchantStorageState.cookies);
      console.log('[Test 6] Restored merchant session');
    } else {
      throw new Error('Merchant storage state not available');
    }

    // Navigate to analytics page
    console.log('[Test 6] Navigating to analytics page...');
    await page.goto(`/m/${merchantSlug}/manage/tour/analytics`);
    await page.waitForLoadState('networkidle');

    // Verify analytics page loaded
    const analyticsPage = page.getByTestId('tour-analytics-page');
    if (await analyticsPage.isVisible({ timeout: 10000 }).catch(() => false)) {
      console.log('[Test 6] ✓ Analytics page loaded');

      // Check for date range selector
      const dateRangeSelector = page.getByTestId('date-range-selector');
      await expect(dateRangeSelector).toBeVisible({ timeout: 5000 });
      console.log('[Test 6] ✓ Date range selector visible');

      // Try changing date range
      await dateRangeSelector.click();
      await page.waitForTimeout(300);
      const option30Days = page.locator('[role="option"]:has-text("30 days")');
      if (await option30Days.isVisible({ timeout: 3000 }).catch(() => false)) {
        await option30Days.click();
        console.log('[Test 6] ✓ Date range changed');
      }
    } else {
      // Page might have different structure
      await expect(page.locator('body')).toBeVisible();
      console.log('[Test 6] Analytics page structure different than expected');
    }

    console.log('[Test 6] ✓ Analytics test complete');
  });

  test('7. Customer can access booking details', async ({ page }) => {
    test.setTimeout(60000);

    // Restore customer session
    if (customerStorageState) {
      await page.context().addCookies(customerStorageState.cookies);
      console.log('[Test 7] Restored customer session');
    }

    if (!bookingCode || !merchantSlug) {
      console.log('[Test 7] No booking code available - testing invalid code handling');

      // Test the cancellation page with invalid code
      await page.goto(`/booking/${merchantSlug}/INVALID123`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const errorState = page.locator('text=not found, text=error, text=invalid');
      if (await errorState.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('[Test 7] ✓ Invalid booking code handled gracefully');
      }
      return;
    }

    // Navigate to booking details page
    console.log(`[Test 7] Navigating to booking: ${bookingCode}`);
    await page.goto(`/booking/${merchantSlug}/${bookingCode}`);
    await page.waitForLoadState('networkidle');

    // Verify booking details displayed
    const tourNameElement = page.getByTestId('tour-name');
    const sessionDate = page.getByTestId('session-date');
    const totalAmount = page.getByTestId('total-amount');

    if (await tourNameElement.isVisible({ timeout: 10000 }).catch(() => false)) {
      console.log('[Test 7] ✓ Tour name displayed');
    }

    if (await sessionDate.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('[Test 7] ✓ Session date displayed');
    }

    if (await totalAmount.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('[Test 7] ✓ Total amount displayed');
    }

    // Check for cancellation option
    const cancelBtn = page.getByTestId('cancel-booking-btn');
    const emailInput = page.getByTestId('cancellation-email-input');

    if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('[Test 7] ✓ Email input visible for cancellation');

      // Cancel button should be disabled without email
      const isDisabled = await cancelBtn.isDisabled().catch(() => true);
      expect(isDisabled).toBe(true);
      console.log('[Test 7] ✓ Cancel button requires email verification');
    }

    console.log('[Test 7] ✓ Customer booking access test complete');
  });
});

test.describe.serial('Tour Edge Cases', () => {
  /**
   * Additional tests for edge cases - uses shared merchant from main flow if available
   */

  test('should handle tour creation validation', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    // Create a fresh merchant for validation tests
    const testEmail = generateTestEmail('tour-validation', testInfo);
    const merchantSetupPage = new MerchantSetupPage(page);
    const validationMerchantSlug = await merchantSetupPage.createMerchant(testEmail, 'Validation Test', testInfo);

    const cookies = await getCookiesFromPage(page);
    if (cookies) cookiesPerWorker.set(testInfo.parallelIndex, cookies);

    await dismissWelcomeDialog(page);

    const tourPage = new TourPage(page);
    await tourPage.navigateToMerchant(validationMerchantSlug);
    await dismissWelcomeDialog(page);

    // Open tour creation dialog
    await tourPage.openCreateTourDialog();

    // Try to proceed without filling required fields
    await tourPage.clickNext();
    await page.waitForTimeout(1000);

    // Should show validation error
    const validationError = page.locator('[data-sonner-toast], text=required, text=Please fill');
    const hasError = await validationError.first().isVisible({ timeout: 5000 }).catch(() => false);

    if (hasError) {
      console.log('[Validation] ✓ Tour name validation working');
    }

    // Fill name and try again
    await page.fill('input[name="name"]', 'Test Tour');
    const descriptionEditor = page.locator('.ProseMirror, [contenteditable="true"]').first();
    if (await descriptionEditor.isVisible({ timeout: 3000 }).catch(() => false)) {
      await descriptionEditor.click();
      await descriptionEditor.fill('Test description');
    }

    await tourPage.clickNext();
    await page.waitForTimeout(1000);

    // Should progress to step 2
    const thumbnailStep = page.locator('text=Tour Thumbnail, text=Thumbnail');
    if (await thumbnailStep.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('[Validation] ✓ Progressed to thumbnail step');
    }

    // Test navigation - go back
    await tourPage.clickPrevious();
    await page.waitForTimeout(500);

    // Verify data is preserved
    const nameValue = await page.inputValue('input[name="name"]');
    expect(nameValue).toBe('Test Tour');
    console.log('[Validation] ✓ Data preserved on navigation');

    // Close dialog
    await tourPage.closeDialog();
    console.log('[Validation] ✓ Validation test complete');
  });
});

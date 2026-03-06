import { test, expect, Page, TestInfo } from '@playwright/test';
import { PractitionerSetupPage } from '../pages/PractitionerSetupPage';
import { AuthPage } from '../pages/AuthPage';
import { UserSetupPage } from '../pages/UserSetupPage';
import { OnboardingPage } from '../pages/OnboardingPage';
import { handleConsentGuardIfPresent } from '../utils/test-helpers';
import {
  getCookiesFromPage,
  registerTestUser,
  completeStripeTestOnboarding,
} from '../utils/test-cleanup';
import { PurchaseManager, DialogManager, ServiceManager } from '../managers';

/**
 * ASYNC Reading Service - Astrology - Full Customer Journey
 *
 * Full e2e flow for astrology reading service:
 * 1. Merchant creates astrology reading service
 * 2. Customer purchases and fills birth chart
 * 3. Merchant delivers reading
 * 4. Customer receives and reflects in journal
 */

// Shared state for serial tests
const DESCRIBE_KEY = 'astrology-reading-journey';
let practitionerSlug: string;
let practitionerId: string;
let practitionerCookies: string;
let serviceName: string;
let customerId: string;
let customerEmail: string;
let customerCookies: string;
let purchaseCompleted: boolean = false;
let deliveryCompleted: boolean = false;

const cookiesPerWorker = new Map<string, string>();

/** Generate unique test email */
function generateUniqueTestEmail(testInfo: TestInfo, prefix: string): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${testInfo.parallelIndex}-${randomSuffix}@playwright.com`;
}

/** Helper to dismiss welcome dialog - uses DialogManager */
async function dismissWelcomeDialog(page: Page) {
  const dialogManager = new DialogManager(page);
  await dialogManager.dismissWelcomeDialog();
}

/** Get practitioner ID from slug */
async function getPractitionerIdFromSlug(page: Page, slug: string): Promise<string | null> {
  try {
    const result = await page.evaluate(async (practitionerSlug) => {
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
    return result;
  } catch (error) {
    console.error('[getPractitionerIdFromSlug] Error:', error);
    return null;
  }
}

/** Complete personal space onboarding */
async function completeOnboardingIfNeeded(page: Page) {
  const onboardingPage = new OnboardingPage(page);
  try {
    const onboardingHeading = page.locator('text=What speaks to your spirit');
    if (await onboardingHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('[Onboarding] Completing...');
      await onboardingPage.completeWithPrimaryOnly('mediumship');
      console.log('[Onboarding] Completed');
    }
  } catch {
    // Onboarding not shown
  }
}

test.describe.serial('ASYNC Reading Service - Astrology - Full Customer Journey', () => {
  test('1. Merchant creates astrology reading service', async ({ page }, testInfo) => {
    test.setTimeout(360000);

    console.log('[Test 1] Creating merchant and Astrology reading service...');

    const testEmail = generateUniqueTestEmail(testInfo, 'astro-merchant');
    const practitionerSetupPage = new PractitionerSetupPage(page);
    practitionerSlug = await practitionerSetupPage.createPractitioner(testEmail, 'Astrology Reader', testInfo, 'awaken');
    console.log(`[Test 1] Merchant slug: ${practitionerSlug}`);

    const cookies = await getCookiesFromPage(page);
    practitionerCookies = cookies || '';
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

    // Store cookies
    if (cookies) {
      const workerId = testInfo.parallelIndex;
      cookiesPerWorker.set(`${workerId}-${DESCRIBE_KEY}`, cookies);
    }

    // Navigate to practitioner dashboard
    await page.goto(`/p/${practitionerSlug}/manage`);
    await page.waitForLoadState('networkidle');
    await dismissWelcomeDialog(page);

    // Create astrology service using ServiceManager
    const serviceManager = new ServiceManager(page);
    const timestamp = Date.now();
    serviceName = `Birth Chart Reading ${timestamp}`;

    await serviceManager.createAstrologyService({
      name: serviceName,
      description: 'A comprehensive birth chart analysis revealing your life path, personality traits, and cosmic potential.',
      price: '45.00',
      turnaroundDays: '5',
      astrologyType: 'birth_chart',
      houseSystem: 'placidus',
      requiresBirthTime: true,
      questions: [
        'What is your birth date? (MM/DD/YYYY)',
        'What is your birth time? (If known)',
        'What city/country were you born in?',
      ],
    });

    console.log('[Test 1] ✓ Astrology reading service created');

    // Verify service appears on public profile
    await page.goto(`/p/${practitionerSlug}`);
    await page.waitForLoadState('networkidle');
    const serviceCard = page.locator(`text=${serviceName}`).first();
    await expect(serviceCard).toBeVisible({ timeout: 10000 });
    console.log('[Test 1] ✓ Service visible in catalogue');
  });

  test('2. Customer purchases service', async ({ browser }, testInfo) => {
    test.setTimeout(300000);

    console.log('[Test 2] Customer signup and purchase flow...');
    expect(practitionerSlug).toBeDefined();
    expect(serviceName).toBeDefined();

    const customerContext = await browser.newContext();
    const customerPage = await customerContext.newPage();

    try {
      customerEmail = generateUniqueTestEmail(testInfo, 'astro-customer');
      const authPage = new AuthPage(customerPage);
      const userSetupPage = new UserSetupPage(customerPage);

      // Customer signup via unified /setup flow
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
        firstName: 'Star',
        lastName: 'Seeker',
      });
      await userSetupPage.startBrowsing();
      console.log('[Test 2] ✓ Customer profile completed');

      // Complete onboarding (spiritual interest selection)
      await completeOnboardingIfNeeded(customerPage);

      customerCookies = await getCookiesFromPage(customerPage) || '';
      if (customerId) {
        registerTestUser({ id: customerId, email: customerEmail, cookies: customerCookies }, testInfo.parallelIndex);
      }

      // Navigate to merchant and find service
      await customerPage.goto(`/p/${practitionerSlug}`);
      await customerPage.waitForLoadState('networkidle');
      await customerPage.waitForTimeout(2000);

      // Find and click on the service using href-based locator
      const servicesSection = customerPage.getByTestId('services-section');
      await expect(servicesSection).toBeVisible({ timeout: 10000 });
      const serviceCard = servicesSection.locator(`a[href*="/services/"]`).filter({ hasText: serviceName }).first();
      await expect(serviceCard).toBeVisible({ timeout: 15000 });
      await serviceCard.click();
      await customerPage.waitForURL(/\/services\//, { timeout: 15000 });
      console.log('[Test 2] Navigated to service detail');

      // Dismiss cookie banner if present
      const cookieBanner = customerPage.getByTestId('cookie-banner');
      if (await cookieBanner.isVisible({ timeout: 2000 }).catch(() => false)) {
        const acceptCookieBtn = customerPage.getByTestId('cookie-accept-btn');
        if (await acceptCookieBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await acceptCookieBtn.click();
          await expect(cookieBanner).not.toBeVisible({ timeout: 3000 });
          console.log('[Test 2] ✓ Dismissed cookie banner');
        }
      }

      // Wait for page to fully load
      await customerPage.waitForTimeout(3000);

      // Birth chart gate should show for astrology readings when user has no birth chart
      const birthChartGateBtn = customerPage.getByTestId('setup-birth-chart-btn');
      await expect(birthChartGateBtn).toBeVisible({ timeout: 15000 });
      console.log('[Test 2] Birth chart gate shown - clicking to create birth chart');
      await customerPage.screenshot({ path: 'test-results/astro-birth-chart-gate.png' });

      // Click to navigate to birth chart setup
      await birthChartGateBtn.click();
      await customerPage.waitForURL(/\/space\/astrology\/birth-chart/, { timeout: 15000 });
      console.log('[Test 2] Navigated to birth chart setup');
      await customerPage.waitForTimeout(2000);

      // Fill birth date
      const birthDateInput = customerPage.locator('input[type="date"]').first();
      await expect(birthDateInput).toBeVisible({ timeout: 5000 });
      await birthDateInput.fill('1990-06-15');
      console.log('[Test 2] Filled birth date');

      // Select exact birth time precision
      const exactTimeOption = customerPage.locator('button:has-text("I know my exact birth time")').first();
      if (await exactTimeOption.isVisible({ timeout: 3000 }).catch(() => false)) {
        await exactTimeOption.click();
        await customerPage.waitForTimeout(500);
      }

      // Fill birth time
      const birthTimeInput = customerPage.locator('input[type="time"]').first();
      if (await birthTimeInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await birthTimeInput.fill('14:30');
        console.log('[Test 2] Filled birth time');
      }

      // Search for and select city
      const cityInput = customerPage.getByTestId('city-search-input');
      await expect(cityInput).toBeVisible({ timeout: 5000 });
      await cityInput.fill('Perth');
      await customerPage.waitForTimeout(2000);

      // City options are buttons in custom dropdown, not role="option"
      const perthOption = customerPage.locator('button:has-text("Perth")').first();
      await expect(perthOption).toBeVisible({ timeout: 5000 });
      await perthOption.click();
      console.log('[Test 2] Selected Perth as birth location');

      // Submit birth chart
      const saveBirthChartBtn = customerPage.locator('button:has-text("Calculate"), button:has-text("Save"), button[type="submit"]').first();
      await expect(saveBirthChartBtn).toBeVisible({ timeout: 5000 });
      await saveBirthChartBtn.click();
      await customerPage.waitForTimeout(5000);
      console.log('[Test 2] Birth chart submitted');

      await customerPage.screenshot({ path: 'test-results/astro-birth-chart-created.png' });
      console.log('[Test 2] ✓ Birth chart created');

      // Navigate back to the service page
      await customerPage.goto(`/p/${practitionerSlug}`);
      await customerPage.waitForLoadState('networkidle');

      // Find and click the service again using href-based locator
      const servicesSection2 = customerPage.getByTestId('services-section');
      await expect(servicesSection2).toBeVisible({ timeout: 10000 });
      const serviceCard2 = servicesSection2.locator(`a[href*="/services/"]`).filter({ hasText: serviceName }).first();
      await expect(serviceCard2).toBeVisible({ timeout: 15000 });
      await serviceCard2.click();
      await customerPage.waitForURL(/\/services\//, { timeout: 15000 });
      console.log('[Test 2] Returned to service detail');

      // Now Add to Cart should be available (birth chart exists)
      // Use PurchaseManager for the checkout flow
      const purchaseManager = new PurchaseManager(customerPage);
      await purchaseManager.addToCart();
      await purchaseManager.openCart();
      await purchaseManager.verifyItemInCart(serviceName);
      await purchaseManager.proceedToCheckout();
      await purchaseManager.completeCheckout({
        billing: {
          name: 'Star Seeker',
          line1: '123 Cosmos Lane',
          city: 'Perth',
          postalCode: '6000',
          country: 'AU',
        },
      });

      console.log('[Test 2] ✓ Payment successful');
      await customerPage.screenshot({ path: 'test-results/astro-payment-success.png' });

      purchaseCompleted = true;

    } finally {
      await customerContext.close();
    }
  });

  test('3. Merchant delivers astrology reading', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    console.log('[Test 3] ========== STARTING TEST 3 ==========');
    console.log('[Test 3] Merchant delivery flow...');
    console.log('[Test 3] merchantSlug:', practitionerSlug);
    console.log('[Test 3] merchantId:', practitionerId);
    console.log('[Test 3] purchaseCompleted:', purchaseCompleted);

    if (!purchaseCompleted) {
      throw new Error('[Test 3] FAILED: Test 2 (purchase) did not complete');
    }

    expect(practitionerSlug).toBeDefined();
    expect(practitionerId).toBeDefined();

    // Set up console listener early to capture all debug logs
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[FulfillmentDialog]') || text.includes('[Test')) {
        console.log('[Browser]', text);
      }
    });

    // Restore merchant cookies
    const workerId = testInfo.parallelIndex;
    const cookies = cookiesPerWorker.get(`${workerId}-${DESCRIBE_KEY}`) || practitionerCookies;
    if (cookies) {
      const cookiePairs = cookies.split('; ');
      const cookieObjs = cookiePairs.map(pair => {
        const [name, value] = pair.split('=');
        return { name, value: value || '', domain: 'localhost', path: '/' };
      });
      await page.context().addCookies(cookieObjs);
      console.log('[Test 3] Merchant authentication restored');
    }

    await page.goto(`/p/${practitionerSlug}/manage/services/orders`);
    await page.waitForTimeout(5000);

    // Find order and start fulfillment
    const startFulfillmentButton = page.locator('[data-testid="start-fulfillment-button"]').first();
    const buttonVisible = await startFulfillmentButton.isVisible({ timeout: 15000 }).catch(() => false);

    if (!buttonVisible) {
      await page.screenshot({ path: 'test-results/astro-NO-ORDERS.png' });
      throw new Error('[Test 3] FAILED: No orders found');
    }

    await startFulfillmentButton.click();
    await page.waitForTimeout(2000);

    const fulfillmentDialog = page.locator('[data-testid="fulfillment-dialog"]');
    await expect(fulfillmentDialog).toBeVisible({ timeout: 10000 });

    // Step 1: Review - Verify customer info and birth chart are visible
    await page.screenshot({ path: 'test-results/astro-fulfillment-review.png' });

    // Wait a bit for data to load
    await page.waitForTimeout(3000);

    // Check for customer name (from query or fallback to ID)
    const customerNameOrId = fulfillmentDialog.locator('text=Star').or(fulfillmentDialog.locator('text=Customer #')).first();
    const hasCustomerInfo = await customerNameOrId.isVisible({ timeout: 10000 }).catch(() => false);
    console.log('[Test 3] Customer info visible:', hasCustomerInfo);

    // Check for birth chart section
    const birthChartSection = fulfillmentDialog.locator('[data-testid="customer-birth-chart"]');
    const hasBirthChartSection = await birthChartSection.isVisible({ timeout: 5000 }).catch(() => false);
    console.log('[Test 3] Birth chart section visible:', hasBirthChartSection);

    if (!hasBirthChartSection) {
      // Log the dialog content for debugging
      const dialogContent = await fulfillmentDialog.innerHTML();
      console.log('[Test 3] Dialog HTML (truncated):', dialogContent.substring(0, 2000));
      await page.screenshot({ path: 'test-results/astro-no-birth-chart-section.png' });
      throw new Error('[Test 3] FAILED: Birth chart section not visible - check if isAstrologyReading is true');
    }
    console.log('[Test 3] ✓ Birth chart section visible in review');

    // Verify birth details are shown (date: 1990-06-15, location: Perth)
    const birthDate = fulfillmentDialog.locator('text=1990').or(fulfillmentDialog.locator('text=June')).or(fulfillmentDialog.locator('text=Jun')).first();
    const hasBirthDate = await birthDate.isVisible({ timeout: 5000 }).catch(() => false);
    console.log('[Test 3] Birth date visible:', hasBirthDate);

    const birthLocation = fulfillmentDialog.locator('text=Perth').first();
    const hasBirthLocation = await birthLocation.isVisible({ timeout: 5000 }).catch(() => false);
    console.log('[Test 3] Birth location visible:', hasBirthLocation);

    if (!hasBirthDate || !hasBirthLocation) {
      await page.screenshot({ path: 'test-results/astro-birth-chart-missing-details.png' });
      throw new Error('[Test 3] FAILED: Birth chart details (date/location) not visible in fulfillment review');
    }
    console.log('[Test 3] ✓ Birth chart details visible (date + location)');

    // Step 1: Review -> Next
    const nextButton = page.locator('[data-testid="next-step-button"]');
    await nextButton.click();
    await page.waitForTimeout(1000);

    // Step 2: Upload file
    const fileInput = page.locator('input[type="file"]').first();
    const testFileContent = `BIRTH CHART ANALYSIS
====================

Client: Star Seeker

SUN in Sagittarius
Your core essence radiates optimism and adventure.

MOON in Pisces
Your emotional nature is intuitive and compassionate.

RISING in Leo
You project confidence and warmth to the world.

Full chart analysis follows...`;

    await fileInput.setInputFiles({
      name: 'birth-chart-reading.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(testFileContent)
    });
    await page.waitForTimeout(5000);

    // Step 2 -> Step 3
    await nextButton.click();
    await page.waitForTimeout(1000);

    // Step 3: Message
    const messageTextarea = page.locator('[data-testid="practitioner-message-input"]');
    if (await messageTextarea.isVisible({ timeout: 3000 }).catch(() => false)) {
      await messageTextarea.fill('Your birth chart reveals a beautiful cosmic blueprint! I hope this reading brings clarity and guidance.');
    }

    // Step 3 -> Step 4
    await nextButton.click();
    await page.waitForTimeout(1000);

    // Step 4: Deliver
    const deliverButton = page.locator('[data-testid="confirm-delivery-button"]');
    await deliverButton.click();

    await fulfillmentDialog.waitFor({ state: 'hidden', timeout: 15000 });
    console.log('[Test 3] Delivery dialog closed');

    // Verify order status changed to DELIVERED
    await page.waitForTimeout(2000);

    // The order should now show in the "Delivered" tab or show "DELIVERED" status
    // Click on Delivered tab to see the order there
    const deliveredTab = page.locator('button:has-text("Delivered")').first();
    await expect(deliveredTab).toBeVisible({ timeout: 5000 });
    await deliveredTab.click();
    await page.waitForTimeout(2000);

    // The order should now be visible in the Delivered tab
    const deliveredOrder = page.locator(`text=${serviceName}`).first();
    await page.screenshot({ path: 'test-results/astro-delivery-status-check.png' });
    await expect(deliveredOrder).toBeVisible({ timeout: 10000 });
    console.log('[Test 3] ✓ Order moved to Delivered tab');

    deliveryCompleted = true;
  });

  test('4. Customer receives reading and reflects in journal', async ({ browser }) => {
    test.setTimeout(180000);

    console.log('[Test 4] Customer receiving and reflecting...');

    if (!deliveryCompleted) {
      throw new Error('[Test 4] FAILED: Test 3 (delivery) did not complete');
    }

    expect(customerId).toBeDefined();
    expect(customerCookies).toBeDefined();

    const customerContext = await browser.newContext();
    const customerPage = await customerContext.newPage();

    try {
      // Restore customer auth
      const cookiePairs = customerCookies.split('; ');
      const cookies = cookiePairs.map(pair => {
        const [name, value] = pair.split('=');
        return { name, value: value || '', domain: 'localhost', path: '/' };
      });
      await customerContext.addCookies(cookies);

      // Navigate to received readings
      await customerPage.goto(`/u/${customerId}/space/readings/received`);
      await customerPage.waitForTimeout(3000);
      await completeOnboardingIfNeeded(customerPage);
      await customerPage.goto(`/u/${customerId}/space/readings/received`);
      await customerPage.waitForTimeout(3000);

      // Find the delivered reading
      const readingItem = customerPage.locator(`text=${serviceName}`).first();
      await expect(readingItem).toBeVisible({ timeout: 15000 });
      console.log('[Test 4] ✓ Reading visible in Personal Space');

      // Click "View Reading" button to open the detail dialog
      const viewReadingButton = customerPage.getByTestId('view-reading-button').first();
      await expect(viewReadingButton).toBeVisible({ timeout: 10000 });
      await viewReadingButton.click();
      await customerPage.waitForTimeout(2000);
      console.log('[Test 4] Opened reading detail dialog');

      // Wait for detail dialog to open
      const detailDialog = customerPage.getByTestId('reading-detail-dialog');
      await expect(detailDialog).toBeVisible({ timeout: 10000 });
      await customerPage.screenshot({ path: 'test-results/astro-reading-detail.png' });
      console.log('[Test 4] ✓ Reading detail dialog opened');

      // Verify the reading content is accessible (practitioner's message or deliverables)
      const deliverableContent = detailDialog.locator('text=cosmic blueprint')
        .or(detailDialog.locator('text=clarity and guidance'))
        .or(detailDialog.locator('text=Your Reading'))
        .first();
      await expect(deliverableContent).toBeVisible({ timeout: 5000 });
      console.log('[Test 4] ✓ Reading content visible in dialog');

      // Click "Journal About This" button for astrology readings
      const journalButton = customerPage.getByTestId('journal-astrology-button');
      await expect(journalButton).toBeVisible({ timeout: 10000 });
      await journalButton.click();
      console.log('[Test 4] Clicked Journal About This button');

      // Should navigate to astrology journal
      await customerPage.waitForURL(/\/space\/astrology\/journal/, { timeout: 15000 });
      await customerPage.waitForTimeout(2000);
      await customerPage.screenshot({ path: 'test-results/astro-journal-page.png' });
      console.log('[Test 4] Navigated to astrology journal');

      // Try to use a transit prompt if available, otherwise click New Entry
      const usePromptBtn = customerPage.getByTestId('use-prompt-btn');
      const newEntryBtn = customerPage.getByTestId('new-entry-btn')
        .or(customerPage.getByTestId('first-entry-btn'))
        .first();

      const promptVisible = await usePromptBtn.isVisible({ timeout: 3000 }).catch(() => false);
      if (promptVisible) {
        await usePromptBtn.click();
        console.log('[Test 4] Used transit prompt to start journal entry');
      } else {
        await expect(newEntryBtn).toBeVisible({ timeout: 10000 });
        await newEntryBtn.click();
        console.log('[Test 4] Clicked New Entry button');
      }
      await customerPage.waitForTimeout(2000);

      // Fill in journal entry - find the main textarea
      const journalTextarea = customerPage.locator('textarea').first();
      await expect(journalTextarea).toBeVisible({ timeout: 5000 });
      await journalTextarea.fill('Just received my astrology reading! The insights about my chart were incredible. Feeling aligned with my cosmic path.');
      console.log('[Test 4] Filled journal entry');

      // Save the entry
      const saveBtn = customerPage.locator('button:has-text("Save")').first();
      await expect(saveBtn).toBeVisible({ timeout: 5000 });
      await saveBtn.click();
      await customerPage.waitForTimeout(3000);
      console.log('[Test 4] Saved journal entry');

      // Verify entry appears in journal list
      await customerPage.screenshot({ path: 'test-results/astro-journal-saved.png' });
      const journalEntry = customerPage.locator('text=cosmic path').or(customerPage.locator('text=astrology reading')).first();
      await expect(journalEntry).toBeVisible({ timeout: 10000 });
      console.log('[Test 4] ✓ Journal entry visible');

      await customerPage.screenshot({ path: 'test-results/astro-journey-complete.png' });
      console.log('[Test 4] ✓ Astrology reading service flow completed');

    } finally {
      await customerContext.close();
    }
  });
});

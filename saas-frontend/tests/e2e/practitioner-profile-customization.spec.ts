import { test, expect } from '@playwright/test';
import { PractitionerSetupPage } from '../pages/PractitionerSetupPage';
import { PractitionerProfilePage } from '../pages/PractitionerProfilePage';
import { AuthPage } from '../pages/AuthPage';
import { HomePage } from '../pages/HomePage';
import { UserSetupPage } from '../pages/UserSetupPage';
import { PurchaseManager } from '../managers/PurchaseManager';
import {
  clearTestEntityRegistry,
  getCookiesFromPage,
  cleanupTestUsers,
  cleanupTestPractitioners,
  executeGraphQL,
  registerTestUser,
  completeStripeTestOnboarding,
} from '../utils/test-cleanup';

// Helper to get practitioner ID from slug
async function getPractitionerIdFromSlug(cookies: string, slug: string): Promise<string> {
  const result = await executeGraphQL<{ vendorIdFromSlug: { merchantId: string } }>(
    `query GetVendorId($slug: String!) {
      vendorIdFromSlug(slug: $slug) {
        merchantId
      }
    }`,
    { slug },
    cookies
  );
  return result.vendorIdFromSlug.merchantId;
}

/**
 * Practitioner Profile Customization Tests
 *
 * Tests for the practitioner profile editing features:
 * 1. Bio & Headline editing
 * 2. Modalities & Specializations editing
 * 3. Tools Collection management
 * 4. Training & Credentials management
 * 5. Spiritual Journey & Approach editing
 */

// Store state per test worker for parallel execution safety
const cookiesPerWorker = new Map<number, string>();
const practitionerSlugPerWorker = new Map<number, string>();

test.beforeAll(async ({}, testInfo) => {
  console.log('[Setup] Preparing practitioner profile customization test environment...');
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
      practitionerSlugPerWorker.delete(workerId);
    }
  }
  clearTestEntityRegistry(workerId);
});

test.describe('Practitioner Profile Customization', () => {
  let practitionerSetupPage: PractitionerSetupPage;
  let practitionerProfilePage: PractitionerProfilePage;

  test.beforeEach(async ({ page }) => {
    practitionerSetupPage = new PractitionerSetupPage(page);
    practitionerProfilePage = new PractitionerProfilePage(page);
  });

  test('should create practitioner and edit bio & headline', async ({ page }, testInfo) => {
    test.setTimeout(180000); // 3 minutes for full flow

    const workerId = testInfo.parallelIndex;
    const timestamp = Date.now();
    const testEmail = `prac-profile-bio-${timestamp}-${workerId}@playwright.com`;
    const practitionerName = `Test Practitioner Bio ${timestamp}`;

    // Create a practitioner first
    const practitionerSlug = await practitionerSetupPage.createPractitioner(
      testEmail,
      practitionerName,
      testInfo
    );
    practitionerSlugPerWorker.set(workerId, practitionerSlug);

    // Store cookies for cleanup
    const cookies = await getCookiesFromPage(page);
    if (cookies) cookiesPerWorker.set(workerId, cookies);

    // Navigate to manage page
    await practitionerProfilePage.navigateToManage(practitionerSlug);

    // Open Bio & Headline dialog
    await practitionerProfilePage.openBioDialog();

    // Verify dialog is open
    await expect(page.locator('[data-testid="edit-practitioner-bio-dialog"]')).toBeVisible();

    // Edit bio and headline
    const newHeadline = 'Updated Intuitive Tarot Reader & Life Coach';
    const newBio = 'I have updated my bio to reflect my new journey. I now specialize in life coaching combined with intuitive readings to help clients achieve their full potential.';

    await practitionerProfilePage.editBioAndHeadline({
      headline: newHeadline,
      bio: newBio,
    });

    // Verify dialog closed (success)
    await expect(page.locator('[data-testid="edit-practitioner-bio-dialog"]')).not.toBeVisible({ timeout: 10000 });

    // Navigate to public profile and verify changes
    await page.goto(`/p/${practitionerSlug}`);
    await expect(page.getByText(newHeadline)).toBeVisible({ timeout: 10000 });
  });

  test('should edit modalities and specializations', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    const workerId = testInfo.parallelIndex;
    const timestamp = Date.now();
    const testEmail = `prac-profile-mod-${timestamp}-${workerId}@playwright.com`;
    const practitionerName = `Test Practitioner Modalities ${timestamp}`;

    // Create a practitioner
    const practitionerSlug = await practitionerSetupPage.createPractitioner(
      testEmail,
      practitionerName,
      testInfo
    );
    practitionerSlugPerWorker.set(workerId, practitionerSlug);

    const cookies = await getCookiesFromPage(page);
    if (cookies) cookiesPerWorker.set(workerId, cookies);

    // Navigate to manage page
    await practitionerProfilePage.navigateToManage(practitionerSlug);

    // Open Modalities dialog
    await practitionerProfilePage.openModalitiesDialog();

    // Verify dialog is open
    await expect(page.locator('[data-testid="edit-practitioner-modalities-dialog"]')).toBeVisible();

    // Add a new modality (ASTROLOGY) - should not be selected initially
    await practitionerProfilePage.toggleModality('ASTROLOGY');

    // Add a new specialization (SPIRITUAL_AWAKENING)
    await practitionerProfilePage.toggleSpecialization('SPIRITUAL_AWAKENING');

    // Save changes
    await practitionerProfilePage.saveModalities();

    // Verify dialog closed
    await expect(page.locator('[data-testid="edit-practitioner-modalities-dialog"]')).not.toBeVisible({ timeout: 10000 });

    // Re-open dialog and verify the new selections are persisted
    await practitionerProfilePage.openModalitiesDialog();
    expect(await practitionerProfilePage.isModalitySelected('ASTROLOGY')).toBe(true);
    expect(await practitionerProfilePage.isSpecializationSelected('SPIRITUAL_AWAKENING')).toBe(true);

    await practitionerProfilePage.closeDialog();
  });

  test('should add and manage tools collection', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    const workerId = testInfo.parallelIndex;
    const timestamp = Date.now();
    const testEmail = `prac-profile-tools-${timestamp}-${workerId}@playwright.com`;
    const practitionerName = `Test Practitioner Tools ${timestamp}`;

    // Create a practitioner
    const practitionerSlug = await practitionerSetupPage.createPractitioner(
      testEmail,
      practitionerName,
      testInfo
    );
    practitionerSlugPerWorker.set(workerId, practitionerSlug);

    const cookies = await getCookiesFromPage(page);
    if (cookies) cookiesPerWorker.set(workerId, cookies);

    // Navigate to manage page
    await practitionerProfilePage.navigateToManage(practitionerSlug);

    // Open Tools dialog
    await practitionerProfilePage.openToolsDialog();

    // Verify dialog is open with empty state
    await expect(page.locator('[data-testid="edit-practitioner-tools-dialog"]')).toBeVisible();
    await expect(page.locator('[data-testid="add-first-tool-btn"]')).toBeVisible();

    // Add first tool
    await practitionerProfilePage.addTool({
      name: 'Rider-Waite Tarot Deck',
      description: 'My primary deck for readings, gifted by my grandmother.',
    }, 0);

    // Add second tool
    await practitionerProfilePage.addTool({
      name: 'Clear Quartz Crystal',
      description: 'Used for clarity and amplification during readings.',
    }, 1);

    // Verify we have 2 tools
    expect(await practitionerProfilePage.getToolCount()).toBe(2);

    // Save changes
    await practitionerProfilePage.saveTools();

    // Verify dialog closed
    await expect(page.locator('[data-testid="edit-practitioner-tools-dialog"]')).not.toBeVisible({ timeout: 10000 });

    // Re-open and verify persistence
    await practitionerProfilePage.openToolsDialog();
    expect(await practitionerProfilePage.getToolCount()).toBe(2);

    // Remove one tool
    await practitionerProfilePage.removeTool(0);
    expect(await practitionerProfilePage.getToolCount()).toBe(1);

    // Save and verify
    await practitionerProfilePage.saveTools();
    await expect(page.locator('[data-testid="edit-practitioner-tools-dialog"]')).not.toBeVisible({ timeout: 10000 });

    await practitionerProfilePage.openToolsDialog();
    expect(await practitionerProfilePage.getToolCount()).toBe(1);
    await practitionerProfilePage.closeDialog();
  });

  test('should add and manage training credentials', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    const workerId = testInfo.parallelIndex;
    const timestamp = Date.now();
    const testEmail = `prac-profile-training-${timestamp}-${workerId}@playwright.com`;
    const practitionerName = `Test Practitioner Training ${timestamp}`;

    // Create a practitioner
    const practitionerSlug = await practitionerSetupPage.createPractitioner(
      testEmail,
      practitionerName,
      testInfo
    );
    practitionerSlugPerWorker.set(workerId, practitionerSlug);

    const cookies = await getCookiesFromPage(page);
    if (cookies) cookiesPerWorker.set(workerId, cookies);

    // Navigate to manage page
    await practitionerProfilePage.navigateToManage(practitionerSlug);

    // Open Training dialog
    await practitionerProfilePage.openTrainingDialog();

    // Verify dialog is open with empty state
    await expect(page.locator('[data-testid="edit-practitioner-training-dialog"]')).toBeVisible();
    await expect(page.locator('[data-testid="add-first-credential-btn"]')).toBeVisible();

    // Add first credential
    await practitionerProfilePage.addCredential({
      title: 'Certified Tarot Reader',
      institution: 'Tarot Certification Board',
      year: 2020,
      description: 'Professional certification in tarot reading.',
    }, 0);

    // Add second credential
    await practitionerProfilePage.addCredential({
      title: 'Reiki Master',
      institution: 'International Reiki Association',
      year: 2018,
    }, 1);

    // Verify we have 2 credentials
    expect(await practitionerProfilePage.getCredentialCount()).toBe(2);

    // Save changes
    await practitionerProfilePage.saveTraining();

    // Verify dialog closed
    await expect(page.locator('[data-testid="edit-practitioner-training-dialog"]')).not.toBeVisible({ timeout: 10000 });

    // Re-open and verify persistence
    await practitionerProfilePage.openTrainingDialog();
    expect(await practitionerProfilePage.getCredentialCount()).toBe(2);

    // Remove one credential
    await practitionerProfilePage.removeCredential(0);
    expect(await practitionerProfilePage.getCredentialCount()).toBe(1);

    // Save and verify
    await practitionerProfilePage.saveTraining();
    await expect(page.locator('[data-testid="edit-practitioner-training-dialog"]')).not.toBeVisible({ timeout: 10000 });

    await practitionerProfilePage.openTrainingDialog();
    expect(await practitionerProfilePage.getCredentialCount()).toBe(1);
    await practitionerProfilePage.closeDialog();
  });

  test('should edit spiritual journey and approach', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    const workerId = testInfo.parallelIndex;
    const timestamp = Date.now();
    const testEmail = `prac-profile-journey-${timestamp}-${workerId}@playwright.com`;
    const practitionerName = `Test Practitioner Journey ${timestamp}`;

    // Create a practitioner
    const practitionerSlug = await practitionerSetupPage.createPractitioner(
      testEmail,
      practitionerName,
      testInfo
    );
    practitionerSlugPerWorker.set(workerId, practitionerSlug);

    const cookies = await getCookiesFromPage(page);
    if (cookies) cookiesPerWorker.set(workerId, cookies);

    // Navigate to manage page
    await practitionerProfilePage.navigateToManage(practitionerSlug);

    // Open Journey dialog
    await practitionerProfilePage.openJourneyDialog();

    // Verify dialog is open
    await expect(page.locator('[data-testid="edit-practitioner-journey-dialog"]')).toBeVisible();

    // Edit journey and approach
    const newJourney = 'My spiritual journey began when I was a child, drawn to the mysteries of the universe. I discovered tarot at age 16 and have been practicing ever since, learning from masters around the world.';
    const newApproach = 'I approach each reading with deep compassion and an open heart. My style is gentle yet direct, providing clear guidance while respecting your free will and personal journey.';

    await practitionerProfilePage.editJourney({
      spiritualJourney: newJourney,
      approach: newApproach,
    });

    // Verify dialog closed (success)
    await expect(page.locator('[data-testid="edit-practitioner-journey-dialog"]')).not.toBeVisible({ timeout: 10000 });

    // Re-open dialog and verify changes are persisted
    await practitionerProfilePage.openJourneyDialog();
    await expect(page.locator('[data-testid="spiritual-journey-input"]')).toHaveValue(newJourney);
    await expect(page.locator('[data-testid="approach-input"]')).toHaveValue(newApproach);
    await practitionerProfilePage.closeDialog();
  });

  test('should validate bio minimum character requirement', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    const workerId = testInfo.parallelIndex;
    const timestamp = Date.now();
    const testEmail = `prac-profile-valid-${timestamp}-${workerId}@playwright.com`;
    const practitionerName = `Test Practitioner Validation ${timestamp}`;

    // Create a practitioner
    const practitionerSlug = await practitionerSetupPage.createPractitioner(
      testEmail,
      practitionerName,
      testInfo
    );
    practitionerSlugPerWorker.set(workerId, practitionerSlug);

    const cookies = await getCookiesFromPage(page);
    if (cookies) cookiesPerWorker.set(workerId, cookies);

    // Navigate to manage page
    await practitionerProfilePage.navigateToManage(practitionerSlug);

    // Open Bio & Headline dialog
    await practitionerProfilePage.openBioDialog();

    // Try to save with too short bio
    await page.locator('[data-testid="headline-input"]').fill('Valid Headline Here');
    await page.locator('[data-testid="bio-input"]').fill('Too short');
    await page.locator('[data-testid="save-bio-btn"]').click();

    // Should show validation error
    await expect(page.locator('text=Bio must be at least 50 characters')).toBeVisible({ timeout: 5000 });

    // Dialog should still be open
    await expect(page.locator('[data-testid="edit-practitioner-bio-dialog"]')).toBeVisible();

    await practitionerProfilePage.closeDialog();
  });

  test('should complete full pinned testimonials lifecycle: book -> deliver -> review -> pin', async ({ page }, testInfo) => {
    test.setTimeout(300000); // 5 minutes for full lifecycle

    const workerId = testInfo.parallelIndex;
    const timestamp = Date.now();
    const serviceName = `Test Tarot Reading ${timestamp}`;

    // === STEP 1: CREATE PRACTITIONER ===
    console.log('[Test] Step 1: Creating practitioner...');
    const practitionerEmail = `prac-lifecycle-${timestamp}-${workerId}@playwright.com`;
    const practitionerName = `Lifecycle Practitioner ${timestamp}`;

    const practitionerSlug = await practitionerSetupPage.createPractitioner(
      practitionerEmail,
      practitionerName,
      testInfo
    );
    practitionerSlugPerWorker.set(workerId, practitionerSlug);

    const practitionerCookies = await getCookiesFromPage(page);
    if (!practitionerCookies) throw new Error('Failed to get practitioner cookies');
    cookiesPerWorker.set(workerId, practitionerCookies);

    console.log(`[Test] Practitioner created: ${practitionerSlug}`);

    // Get practitioner ID and complete Stripe onboarding so they can accept payments
    const practitionerId = await getPractitionerIdFromSlug(practitionerCookies, practitionerSlug);
    console.log(`[Test] Practitioner ID: ${practitionerId}`);

    const stripeResult = await completeStripeTestOnboarding(practitionerId, practitionerCookies);
    if (!stripeResult.success || !stripeResult.chargesEnabled) {
      console.warn(`[Test] Stripe onboarding warning: ${stripeResult.message}`);
    }
    console.log(`[Test] Stripe onboarding complete - charges enabled: ${stripeResult.chargesEnabled}`);

    // === STEP 2: PRACTITIONER CREATES A READING SERVICE VIA UI ===
    console.log('[Test] Step 2: Creating reading service via UI...');

    // Navigate to service management
    await page.goto(`/p/${practitionerSlug}/manage/services`);
    await page.waitForLoadState('networkidle');

    // Click the Reading card to open the wizard
    const readingCard = page.locator('[data-testid="create-service-reading-card"]');
    await expect(readingCard).toBeVisible({ timeout: 10000 });
    await readingCard.click();

    // Wait for the dialog to open
    await page.waitForTimeout(1000);

    // === STEP 1 of wizard: Basic Info ===
    await page.locator('input[name="name"]').fill(serviceName);
    await page.locator('textarea[name="description"]').fill('A comprehensive 3-card tarot reading for guidance and clarity.');
    await page.locator('input[name="price"]').fill('25');
    await page.locator('[data-testid="wizard-next-btn"]').click();
    await page.waitForTimeout(500);

    // === STEP 2 of wizard: Details (optional, just click Next) ===
    await page.locator('[data-testid="wizard-next-btn"]').click();
    await page.waitForTimeout(500);

    // === STEP 3 of wizard: Thumbnail ===
    const thumbnailInput = page.locator('input[type="file"]').first();
    const testImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    await thumbnailInput.setInputFiles({
      name: 'test-thumbnail.png',
      mimeType: 'image/png',
      buffer: testImageBuffer
    });
    await page.waitForTimeout(2000);
    await page.locator('[data-testid="wizard-next-btn"]').click();
    await page.waitForTimeout(500);

    // === STEP 4 of wizard: Questions (optional, just submit) ===
    await page.locator('[data-testid="wizard-submit-btn"]').click();
    await page.waitForTimeout(3000);
    console.log(`[Test] Service created: ${serviceName}`);

    // === STEP 3: CREATE CUSTOMER USER ===
    console.log('[Test] Step 3: Creating customer user...');
    const customerEmail = `customer-lifecycle-${timestamp}-${workerId}@playwright.com`;

    const authPage = new AuthPage(page);
    const homePage = new HomePage(page);
    const userSetupPage = new UserSetupPage(page);

    // Clear cookies to login as new user
    await page.context().clearCookies();

    // Authenticate as customer
    await page.goto('/');
    await authPage.startAuthFlow(customerEmail);
    await expect(page.locator('[aria-label="input-login-otp"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[aria-label="input-login-otp"]').click();
    await page.keyboard.type('123456');
    await page.waitForURL('/', { timeout: 15000 });

    // Complete customer setup
    await homePage.waitForCompleteProfileLink();
    await homePage.clickCompleteProfile();
    await expect(page).toHaveURL(/\/u\/.*\/setup/, { timeout: 10000 });

    const customerUrl = page.url();
    const userIdMatch = customerUrl.match(/\/u\/([^\/]+)\/setup/);
    if (!userIdMatch) throw new Error('Could not extract user ID from URL');
    const customerUserId = userIdMatch[1];
    registerTestUser({ id: customerUserId, email: customerEmail }, workerId);
    console.log(`[Test] Customer user ID: ${customerUserId}`);

    await userSetupPage.fillUserProfile({
      firstName: 'Test',
      lastName: 'Customer',
      phone: '0498765432',
      address: 'Melbourne CBD',
      securityQuestion: 'What is your favorite color?',
      securityAnswer: 'Blue',
    });

    const startBrowsingBtn = page.getByRole('button', { name: 'Start Browsing SpiriVerse' });
    await expect(startBrowsingBtn).toBeVisible({ timeout: 5000 });
    await startBrowsingBtn.click();
    await page.waitForURL('/', { timeout: 30000 });

    // === STEP 4: CUSTOMER BROWSES TO PRACTITIONER AND PURCHASES SERVICE ===
    console.log('[Test] Step 4: Customer purchasing service...');

    await page.goto(`/p/${practitionerSlug}`);
    await page.waitForLoadState('networkidle');

    const serviceCard = page.locator(`[data-testid^="service-card-"], a:has-text("${serviceName}")`).first();
    await expect(serviceCard).toBeVisible({ timeout: 10000 });
    await serviceCard.click();
    await page.waitForLoadState('networkidle');

    const purchaseManager = new PurchaseManager(page);
    const purchaseResult = await purchaseManager.completePurchaseFromDetailPage(serviceName, {
      billing: {
        name: 'Test Customer',
        line1: '123 Test Street',
        city: 'Sydney',
        state: 'NSW',
        postalCode: '2000',
        country: 'AU',
      }
    });

    if (!purchaseResult.success) {
      throw new Error(`Purchase failed: ${purchaseResult.error}`);
    }
    console.log('[Test] Payment completed successfully');

    // === STEP 5: PRACTITIONER MARKS SERVICE AS DELIVERED VIA UI ===
    console.log('[Test] Step 5: Practitioner marking service as delivered...');

    // Clear cookies and login as practitioner
    await page.context().clearCookies();
    await page.goto('/');
    await authPage.startAuthFlow(practitionerEmail);
    await expect(page.locator('[aria-label="input-login-otp"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[aria-label="input-login-otp"]').click();
    await page.keyboard.type('123456');
    await page.waitForURL('/', { timeout: 15000 });

    // Wait for session to be fully established
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify we're logged in by checking for user avatar or similar indicator
    console.log(`[Test] After practitioner login, URL: ${page.url()}`);

    // Navigate to service orders
    await page.goto(`/p/${practitionerSlug}/manage/services/orders`);
    await page.waitForLoadState('networkidle');

    // Wait a bit for orders to sync from Stripe webhook
    await page.waitForTimeout(5000);

    // Debug: Query orders via GraphQL to see what is returned
    console.log(`[Test] Querying myServiceOrders for practitionerId: ${practitionerId}`);
    try {
      const ordersResult = await executeGraphQL<{ myServiceOrders: any[] }>(
        `query MyServiceOrders($vendorId: ID!) {
          myServiceOrders(vendorId: $vendorId) {
            id
            vendorId
            customerId
            orderStatus
            purchaseDate
            service {
              name
            }
          }
        }`,
        { vendorId: practitionerId },
        practitionerCookies
      );
      console.log(`[Test] GraphQL myServiceOrders result: ${JSON.stringify(ordersResult?.myServiceOrders || [], null, 2)}`);
    } catch (err) {
      console.log(`[Test] GraphQL query error: ${err}`);
    }

    // Refresh page to ensure orders are loaded
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Debug: Log current URL and page content
    console.log(`[Test] Current URL: ${page.url()}`);

    // Check if we see the "No orders" message vs having data
    const noOrdersMsg = page.getByText('No orders waiting for fulfillment');
    const orderCard = page.locator('[data-testid="start-fulfillment-button"]');
    const pageTitle = page.getByRole('heading', { name: 'Service Orders' });

    console.log(`[Test] Page title visible: ${await pageTitle.isVisible({ timeout: 2000 }).catch(() => false)}`);
    console.log(`[Test] 'No orders' message visible: ${await noOrdersMsg.isVisible({ timeout: 2000 }).catch(() => false)}`);
    console.log(`[Test] 'Start Fulfillment' button visible: ${await orderCard.first().isVisible({ timeout: 2000 }).catch(() => false)}`);

    // Check the tabs badge counts
    const toFulfillTab = page.getByRole('tab', { name: /To Fulfill/ });
    if (await toFulfillTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      const tabText = await toFulfillTab.textContent();
      console.log(`[Test] To Fulfill tab text: ${tabText}`);
    }

    // Wait for orders to load and find the "Start Fulfillment" button
    let fulfillmentBtn = page.locator('[data-testid="start-fulfillment-button"]').first();
    let attempts = 0;
    while (!(await fulfillmentBtn.isVisible({ timeout: 5000 }).catch(() => false)) && attempts < 5) {
      console.log(`[Test] Order not visible yet, refreshing (attempt ${attempts + 1}/5)...`);

      // Debug: Also log content inside the tab panel
      const tabContent = page.locator('[role="tabpanel"]').first();
      if (await tabContent.isVisible({ timeout: 1000 }).catch(() => false)) {
        const content = await tabContent.textContent();
        console.log(`[Test] Tab panel content: ${content?.slice(0, 200)}`);
      }

      await page.waitForTimeout(3000);
      await page.reload();
      await page.waitForLoadState('networkidle');
      attempts++;
    }

    await expect(fulfillmentBtn).toBeVisible({ timeout: 15000 });
    await fulfillmentBtn.click();

    // Wait for fulfillment dialog to open
    await page.waitForTimeout(1000);

    // Step 1: Review - click Next
    const nextBtn = page.locator('[data-testid="next-step-button"]');
    await expect(nextBtn).toBeVisible({ timeout: 10000 });
    await nextBtn.click();
    await page.waitForTimeout(500);

    // Step 2: Upload - upload a test file
    const fileInput = page.locator('input[type="file"]').first();
    const testFileBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    await fileInput.setInputFiles({
      name: 'reading-delivery.png',
      mimeType: 'image/png',
      buffer: testFileBuffer
    });
    await page.waitForTimeout(2000);

    // Click Next to go to message step
    await nextBtn.click();
    await page.waitForTimeout(500);

    // Step 3: Message - optionally add message, click Next
    const messageInput = page.locator('[data-testid="practitioner-message-input"]');
    if (await messageInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await messageInput.fill('Thank you for your order! Here is your reading.');
    }
    await nextBtn.click();
    await page.waitForTimeout(500);

    // Step 4: Confirm - click "Deliver to Customer"
    const deliverBtn = page.locator('[data-testid="confirm-delivery-button"]');
    await expect(deliverBtn).toBeVisible({ timeout: 10000 });
    await deliverBtn.click();

    await page.waitForTimeout(3000);
    console.log('[Test] Service marked as delivered');

    // === STEP 6: VERIFY CUSTOMER CAN SEE DELIVERED READING ===
    console.log('[Test] Step 6: Verifying customer can see delivered reading...');

    // Clear cookies and login as customer
    await page.context().clearCookies();
    await page.goto('/');
    await authPage.startAuthFlow(customerEmail);
    await expect(page.locator('[aria-label="input-login-otp"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[aria-label="input-login-otp"]').click();
    await page.keyboard.type('123456');
    await page.waitForURL('/', { timeout: 15000 });

    // Wait for session to be established
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Navigate to customer received readings
    await page.goto(`/u/${customerUserId}/space/readings/received`);
    await page.waitForLoadState('networkidle');

    // Find the delivered reading (test ID format: reading-purchased-service-{id})
    const deliveredReading = page.locator('[data-testid^="reading-purchased-service-"]').first();
    await expect(deliveredReading).toBeVisible({ timeout: 15000 });
    console.log('[Test] Customer can see delivered reading in their received page');

    // Verify it shows as "Delivered" status
    const deliveredBadge = deliveredReading.getByText('Delivered');
    await expect(deliveredBadge).toBeVisible({ timeout: 5000 });
    console.log('[Test] Reading shows Delivered status');

    // Click to view the reading details
    const viewReadingBtn = deliveredReading.locator('[data-testid="view-reading-button"]');
    await expect(viewReadingBtn).toBeVisible({ timeout: 5000 });
    await viewReadingBtn.click();

    // Verify the reading detail dialog opens
    const readingDetailDialog = page.locator('[data-testid="reading-detail-dialog"]');
    await expect(readingDetailDialog).toBeVisible({ timeout: 10000 });
    console.log('[Test] Customer can view reading details');

    // === STEP 7: CUSTOMER LEAVES A TESTIMONIAL ===
    console.log('[Test] Step 7: Customer leaving testimonial...');

    // Click "Leave a Testimonial" button
    const leaveTestimonialBtn = page.locator('[data-testid="leave-testimonial-btn"]');
    await expect(leaveTestimonialBtn).toBeVisible({ timeout: 5000 });
    await leaveTestimonialBtn.click();

    // Fill out the testimonial form
    // Select 5 stars
    const star5 = page.locator('[data-testid="testimonial-star-5"]');
    await expect(star5).toBeVisible({ timeout: 5000 });
    await star5.click();

    // Enter headline
    const headlineInput = page.locator('[data-testid="testimonial-headline-input"]');
    await headlineInput.fill('Amazing reading experience!');

    // Enter testimonial text
    const textInput = page.locator('[data-testid="testimonial-text-input"]');
    await textInput.fill('This practitioner provided incredible insights. The reading was detailed and resonated deeply with my situation. Highly recommended!');

    // Submit the testimonial
    const submitTestimonialBtn = page.locator('[data-testid="submit-testimonial-btn"]');
    await submitTestimonialBtn.click();

    // Wait for success (testimonial submitted message should appear)
    await page.waitForTimeout(3000);
    const testimonialSubmitted = page.getByText('Testimonial submitted');
    await expect(testimonialSubmitted).toBeVisible({ timeout: 10000 });
    console.log('[Test] Testimonial submitted successfully');

    // Close the dialog
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // === STEP 8: PRACTITIONER PINS THE TESTIMONIAL ===
    console.log('[Test] Step 8: Practitioner pinning testimonial...');

    // Clear cookies and login as practitioner
    await page.context().clearCookies();
    await page.goto('/');
    await authPage.startAuthFlow(practitionerEmail);
    await expect(page.locator('[aria-label="input-login-otp"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[aria-label="input-login-otp"]').click();
    await page.keyboard.type('123456');
    await page.waitForURL('/', { timeout: 15000 });

    // Wait for session to be established
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Navigate to practitioner profile management - pinned testimonials section
    await page.goto(`/p/${practitionerSlug}/manage/profile`);
    await page.waitForLoadState('networkidle');

    // Open pinned testimonials dialog
    const pinnedTestimonialsBtn = page.locator('[data-testid="edit-pinned-testimonials-btn"]');
    await expect(pinnedTestimonialsBtn).toBeVisible({ timeout: 10000 });
    await pinnedTestimonialsBtn.click();

    // Should show the pinned testimonials dialog
    const pinnedDialog = page.locator('[data-testid="pinned-testimonials-dialog"]');
    await expect(pinnedDialog).toBeVisible({ timeout: 10000 });
    console.log('[Test] Pinned testimonials dialog opened');

    // The newly submitted testimonial should be available to pin
    const pinnableReview = page.locator('[data-testid^="pinnable-review-"]').first();
    await expect(pinnableReview).toBeVisible({ timeout: 10000 });
    console.log('[Test] Testimonial available to pin');

    // Click to pin the testimonial
    await pinnableReview.click();
    await page.waitForTimeout(500);

    // Save pinned testimonials
    const savePinnedBtn = page.locator('[data-testid="save-pinned-btn"]');
    await savePinnedBtn.click();

    // Wait for save to complete and dialog to close
    await page.waitForTimeout(2000);
    await expect(pinnedDialog).not.toBeVisible({ timeout: 10000 });
    console.log('[Test] Testimonial pinned successfully');

    // === STEP 9: VERIFY PINNED TESTIMONIAL ON PUBLIC PROFILE ===
    console.log('[Test] Step 9: Verifying pinned testimonial on public profile...');

    // Navigate to public profile
    await page.goto(`/p/${practitionerSlug}`);
    await page.waitForLoadState('networkidle');

    // Should show pinned testimonials section
    const pinnedTestimonialsSection = page.locator('[data-testid="pinned-testimonials-section"]');
    await expect(pinnedTestimonialsSection).toBeVisible({ timeout: 10000 });
    console.log('[Test] Pinned testimonials section visible on public profile');

    // Verify the testimonial text is visible
    const testimonialOnProfile = page.getByText('Amazing reading experience!');
    await expect(testimonialOnProfile).toBeVisible({ timeout: 5000 });
    console.log('[Test] Pinned testimonial content visible on public profile');

    console.log('[Test] Full lifecycle test completed successfully!');
    console.log('[Test] Summary: Practitioner created service → Customer purchased → Practitioner delivered → Customer received → Customer left testimonial → Practitioner pinned testimonial → Testimonial visible on public profile');
  });
});

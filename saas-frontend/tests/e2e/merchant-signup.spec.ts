import { test, expect } from '@playwright/test';
import { AuthPage } from '../pages/AuthPage';
import { HomePage } from '../pages/HomePage';
import { UserSetupPage } from '../pages/UserSetupPage';
import { MerchantSetupPage } from '../pages/MerchantSetupPage';
import { TEST_CONFIG } from '../fixtures/test-config';
import {
  clearTestEntityRegistry,
  registerTestUser,
  registerTestMerchant,
  getCookiesFromPage,
  cleanupTestUsers,
  cleanupTestMerchants,
  getVendorIdFromSlug,
} from '../utils/test-cleanup';

// Store cookies per test worker to avoid race conditions
const cookiesPerWorker = new Map<number, string>();

/**
 * Merchant Signup Flow Tests
 * Tests the complete merchant registration journey:
 * 1. Email submission & OTP verification
 * 2. User profile completion
 * 3. Click "Continue as Merchant"
 * 4. Merchant profile setup with subscription
 *    - Name, slug, email, legal address
 *    - Religion selection (hierarchical picker)
 *    - Merchant type selection (hierarchical multi-picker)
 *    - Subscription plan selection
 *
 * Test Email Configuration:
 * - Uses randomly generated @playwright.com emails
 * - OTP emails are not sent (stubbed out in non-production)
 * - Any 6-digit OTP code works EXCEPT '000000'
 *
 * Parallel Execution:
 * - Tests in this file run IN PARALLEL - each test gets a unique merchantId from the server
 * - The merchantId is passed via URL query param (/m/setup?merchantId=xxx)
 * - This prevents any conflicts between parallel tests as each operates on a different merchant
 * - The cleanup utilities use per-worker isolation (Map<workerId, state>) for reliable cleanup
 */

// Cleanup before tests
test.beforeAll(async ({}, testInfo) => {
  console.log('[Setup] Preparing merchant test environment...');
  clearTestEntityRegistry(testInfo.parallelIndex);
});

// Cleanup after all tests
test.afterAll(async ({}, testInfo) => {
  // Increase timeout for cleanup operations
  test.setTimeout(120000); // 2 minutes for cleanup

  const workerId = testInfo.parallelIndex;
  const cookies = cookiesPerWorker.get(workerId);

  if (cookies) {
    try {
      // IMPORTANT: Clean up merchants BEFORE users, since merchant cleanup needs valid session
      await cleanupTestMerchants(cookies, workerId);
      await cleanupTestUsers(cookies, workerId);
    } catch (error) {
      console.error('[Cleanup] Error during cleanup:', error);
      // Don't throw - allow test suite to complete
    } finally {
      cookiesPerWorker.delete(workerId);
    }
  }
  clearTestEntityRegistry(workerId);
});

// Tests can now run in parallel - each merchant has unique ID in URL
// The merchantId is generated server-side and passed via URL query param
// This ensures no conflicts between parallel test executions
test.describe('Merchant Signup - Complete Flow', () => {
  let authPage: AuthPage;
  let homePage: HomePage;
  let userSetupPage: UserSetupPage;
  let merchantSetupPage: MerchantSetupPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    homePage = new HomePage(page);
    userSetupPage = new UserSetupPage(page);
    merchantSetupPage = new MerchantSetupPage(page);
    await page.goto('/');
  });

  test('should complete full merchant signup flow', async ({ page }, testInfo) => {
    // Set longer timeout for this complex flow
    test.setTimeout(120000); // 2 minutes

    const testEmail = TEST_CONFIG.TEST_EMAIL;

    // Step 1: Authenticate with OTP
    await authPage.startAuthFlow(testEmail);
    await expect(page.locator('[aria-label="input-login-otp"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[aria-label="input-login-otp"]').click();
    await page.keyboard.type('123456');
    await page.waitForURL('/', { timeout: 15000 });

    // Step 2: Navigate to user setup
    await homePage.waitForCompleteProfileLink();
    await homePage.clickCompleteProfile();
    await expect(page).toHaveURL(/\/u\/.*\/setup/, { timeout: 10000 });

    // Register user for cleanup
    const url = page.url();
    const userIdMatch = url.match(/\/u\/([^\/]+)\/setup/);
    if (userIdMatch) {
      const userId = userIdMatch[1];
      registerTestUser({
        id: userId,
        email: testEmail,
      }, testInfo.parallelIndex);

      // Capture cookies for cleanup per worker
      const cookies = await getCookiesFromPage(page);
      if (cookies) {
        cookiesPerWorker.set(testInfo.parallelIndex, cookies);
      }
    }

    // Step 3: Complete user profile
    const userData = {
      firstName: 'Test',
      lastName: 'Merchant',
      phone: '0412345678',
      address: 'Sydney Opera House',
      securityQuestion: 'What is your favorite color?',
      securityAnswer: 'Blue',
    };

    await userSetupPage.fillUserProfile(userData);

    // Step 4: Click "Continue as Merchant" instead of "Start browsing"
    await expect(page.locator('button:has-text("Continue as Merchant")')).toBeEnabled({
      timeout: 10000
    });
    await page.click('button:has-text("Continue as Merchant")');

    // Step 5: Verify on merchant setup page with merchantId query param
    await expect(page).toHaveURL(/\/m\/setup\?merchantId=/, { timeout: 15000 });
    const isOnMerchantSetup = await merchantSetupPage.isOnSetupPage();
    expect(isOnMerchantSetup).toBe(true);

    // Step 6: Fill merchant profile
    const timestamp = Date.now();
    const merchantData = {
      name: `Test Merchant ${timestamp}`,
      slug: `test-merchant-${timestamp}`,
      email: testEmail,
      country: 'AU',
      state: 'NSW',
    };

    // Wait for merchant setup page to fully load (options need to be fetched)
    await page.waitForTimeout(2000);

    // Fill basic info
    await page.fill('input[name="name"]', merchantData.name);

    // Wait for slug to be auto-generated and enabled
    const slugInput = page.locator('input[name="slug"]');
    await expect(slugInput).toBeEnabled({ timeout: 10000 });

    // Override slug to ensure uniqueness
    await slugInput.fill(merchantData.slug);

    // Fill business email (updated label from "Public email" to "Business Email")
    const emailInput = page.getByRole('textbox', { name: /business email/i });
    await emailInput.waitFor({ state: 'visible', timeout: 5000 });
    await emailInput.fill(merchantData.email);

    // Select country from ComboBox with search
    await page.click('[aria-label="country-picker-trigger"]');
    await page.waitForSelector('[aria-label="country-picker-search"]', { timeout: 5000 });
    // Type to search for country
    await page.fill('[aria-label="country-picker-search"]', 'Australia');
    await page.waitForTimeout(300);
    // Click on the result
    await page.click('[aria-label="country-picker-result"]');
    await page.waitForTimeout(500);

    // Fill state (optional field)
    await page.fill('input[name="state"]', merchantData.state);
    await page.waitForTimeout(500);

    // Select religion (Hierarchical Picker)
    // Wait for religion picker button to be enabled
    const religionButton = page.locator('[aria-label="religion-picker"]');
    await expect(religionButton).not.toBeDisabled({ timeout: 10000 });
    await religionButton.click();
    await page.waitForTimeout(500); // Wait for dialog to open

    // Wait for religion tree to appear
    await page.waitForSelector('[data-testid="religion-tree"]', { timeout: 10000 });

    // Click first religion option (should be "No Affiliation" if it exists)
    const firstReligion = page.locator('[role="treeitem"]').first();
    await firstReligion.waitFor({ state: 'visible', timeout: 5000 });
    await firstReligion.click();

    // Select at least one merchant type (Hierarchical Multi-Picker)
    await page.waitForTimeout(500);
    const merchantTypeButton = page.locator('[aria-label="merchant-type-picker"]');
    await expect(merchantTypeButton).toBeVisible({ timeout: 10000 });
    await expect(merchantTypeButton).not.toBeDisabled({ timeout: 10000 });

    // Click and wait for dialog to appear
    await merchantTypeButton.click();

    // Wait for dialog to be visible and stable
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10000 });

    // Wait for merchant type tree to appear inside the dialog
    const merchantTypeTree = page.locator('[data-testid="merchant-type-tree"]');
    await expect(merchantTypeTree).toBeVisible({ timeout: 10000 });

    // Wait for tree items to be loaded
    const firstMerchantType = page.locator('[data-testid="merchant-type-tree"] [role="treeitem"]').first();
    await firstMerchantType.waitFor({ state: 'visible', timeout: 5000 });

    // Click to select the first merchant type
    await firstMerchantType.click();

    // Verify selection was registered (check for checkmark or selection state)
    await page.waitForTimeout(500);

    // Close the dialog using the Close button (inside the dialog)
    const closeButton = page.locator('[role="dialog"] [aria-label="close-dialog"]');
    await expect(closeButton).toBeVisible({ timeout: 5000 });
    await closeButton.click();

    // Verify dialog is closed
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 });

    // Step 1 complete - click "Continue to Pricing" button
    const continueToPricingButton = page.getByRole('button', { name: /Continue to Pricing/i });
    await expect(continueToPricingButton).toBeVisible({ timeout: 5000 });
    await expect(continueToPricingButton).toBeEnabled({ timeout: 5000 });
    await continueToPricingButton.click();

    // Wait for step 2 to appear
    await page.waitForTimeout(1000);

    // Wait for subscription section to load (depends on country)
    // The subscription plans query depends on the currency derived from the country
    await page.waitForTimeout(3000);

    // Check if there's a loading state or error message
    const loadingText = page.locator('text=Loading pricing plan options');
    const noPlansText = page.locator('text=No plans available');

    // Wait a bit to see if plans load
    await page.waitForTimeout(2000);

    // Check what state we're in
    const isLoading = await loadingText.isVisible().catch(() => false);
    const noPlans = await noPlansText.isVisible().catch(() => false);

    if (isLoading) {
      console.log('⚠️  Subscription plans still loading after 5 seconds');
      // Wait a bit more
      await page.waitForTimeout(5000);
    }

    if (noPlans) {
      console.log('❌ No subscription plans available - check Stripe products');
      throw new Error('No subscription plans available. Check that Stripe products exist for currency AUD with vendor=SpiriGroup and bundle_id=Vendor_Plan');
    }

    // Wait for pricing plans to load
    // The base plan "Essentials" is automatically selected
    await expect(page.locator('[data-testid="merchant-subscription-section"]')).toBeVisible({ timeout: 15000 });

    // Verify the base plan is loaded and showing
    await expect(page.locator('[data-testid="base-plan-price"]')).toBeVisible({ timeout: 10000 });

    // Submit form - button text changed from "Finish and enter billing" to just "Finish"
    // since payment is no longer collected at signup
    const submitButton = page.getByRole('button', { name: /^Finish$/i });

    // Wait a bit for the debug logs to show form state
    await page.waitForTimeout(3000);

    // Now check if it's enabled
    await expect(submitButton).toBeEnabled({ timeout: 10000 });

    await submitButton.click();

    // No payment dialog - redirect directly to merchant profile page
    // Payment setup happens later when merchant starts receiving payouts
    await page.waitForURL(/\/m\/test-merchant-\d+/, { timeout: 30000 });

    // Extract merchant slug from URL for cleanup
    const merchantUrl = page.url();
    const merchantSlugMatch = merchantUrl.match(/\/m\/(test-merchant-\d+)/);

    if (merchantSlugMatch) {
      const merchantSlug = merchantSlugMatch[1];

      // Register merchant for cleanup with actual vendor ID
      const merchantCookies = await getCookiesFromPage(page);
      if (merchantCookies) {
        cookiesPerWorker.set(testInfo.parallelIndex, merchantCookies);
        const actualVendorId = await getVendorIdFromSlug(merchantSlug, merchantCookies);
        if (actualVendorId) {
          console.log(`[Test] Registering merchant for cleanup: vendorId=${actualVendorId}, slug=${merchantSlug}`);
          registerTestMerchant({ id: actualVendorId, slug: merchantSlug, email: testEmail, cookies: merchantCookies }, testInfo.parallelIndex);
        } else {
          console.error(`[Test] WARNING: Could not fetch actual vendor ID for slug ${merchantSlug}`);
          registerTestMerchant({ slug: merchantSlug, email: testEmail, cookies: merchantCookies }, testInfo.parallelIndex);
        }
      }
    }

    // Verify we're on the merchant profile page
    expect(page.url()).toMatch(/\/m\/test-merchant-\d+/);
  });

  test('should validate merchant name format', async ({ page }, testInfo) => {
    const testEmail = TEST_CONFIG.TEST_EMAIL;

    // Complete auth and user setup to get to merchant setup
    await authPage.startAuthFlow(testEmail);
    await expect(page.locator('[aria-label="input-login-otp"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[aria-label="input-login-otp"]').click();
    await page.keyboard.type('123456');
    await page.waitForURL('/', { timeout: 15000 });

    await homePage.waitForCompleteProfileLink();
    await homePage.clickCompleteProfile();
    await expect(page).toHaveURL(/\/u\/.*\/setup/, { timeout: 10000 });

    // Register user for cleanup
    const url = page.url();
    const userIdMatch = url.match(/\/u\/([^\/]+)\/setup/);
    if (userIdMatch) {
      const userId = userIdMatch[1];
      registerTestUser({
        id: userId,
        email: testEmail,
      }, testInfo.parallelIndex);
      const cookies = await getCookiesFromPage(page);
      if (cookies) {
        cookiesPerWorker.set(testInfo.parallelIndex, cookies);
      }
    }

    await userSetupPage.fillUserProfile({
      firstName: 'Test',
      lastName: 'User',
      phone: '0412345678',
      address: 'Sydney Opera House',
      securityQuestion: 'Favorite color?',
      securityAnswer: 'Blue',
    });

    await page.click('button:has-text("Continue as Merchant")');
    await expect(page).toHaveURL(/\/m\/setup\?merchantId=/, { timeout: 15000 });

    // Wait for merchant setup page to fully load (options need to be fetched)
    await page.waitForTimeout(2000);

    // Wait for merchant setup form to load
    const nameInput = page.locator('input[name="name"]');
    await expect(nameInput).toBeVisible({ timeout: 10000 });

    // Test invalid characters in merchant name
    await nameInput.fill('Test@#$%Merchant');

    // Wait for slug to be generated and enabled, then click it to blur name field
    const slugInput = page.locator('input[name="slug"]');
    await expect(slugInput).toBeEnabled({ timeout: 10000 });
    await slugInput.click();

    // Should show validation error
    const errorMessage = page.locator('text=/letters.*numbers/i');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should auto-generate slug from merchant name', async ({ page }, testInfo) => {
    const testEmail = TEST_CONFIG.TEST_EMAIL;

    // Complete auth and user setup
    await authPage.startAuthFlow(testEmail);
    await expect(page.locator('[aria-label="input-login-otp"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[aria-label="input-login-otp"]').click();
    await page.keyboard.type('123456');
    await page.waitForURL('/', { timeout: 15000 });

    await homePage.waitForCompleteProfileLink();
    await homePage.clickCompleteProfile();
    await expect(page).toHaveURL(/\/u\/.*\/setup/, { timeout: 10000 });

    // Register user for cleanup
    const url = page.url();
    const userIdMatch = url.match(/\/u\/([^\/]+)\/setup/);
    if (userIdMatch) {
      const userId = userIdMatch[1];
      registerTestUser({
        id: userId,
        email: testEmail,
      }, testInfo.parallelIndex);
      const cookies = await getCookiesFromPage(page);
      if (cookies) {
        cookiesPerWorker.set(testInfo.parallelIndex, cookies);
      }
    }

    await userSetupPage.fillUserProfile({
      firstName: 'Test',
      lastName: 'User',
      phone: '0412345678',
      address: 'Sydney Opera House',
      securityQuestion: 'Favorite color?',
      securityAnswer: 'Blue',
    });

    await page.click('button:has-text("Continue as Merchant")');
    await expect(page).toHaveURL(/\/m\/setup\?merchantId=/, { timeout: 15000 });

    // Wait for merchant setup page to fully load (options need to be fetched)
    await page.waitForTimeout(2000);

    // Wait for name input to be visible
    const nameInput = page.locator('input[name="name"]');
    await expect(nameInput).toBeVisible({ timeout: 10000 });

    // Fill merchant name
    await nameInput.fill('Mystic Readings & Tours');

    // Wait for slug field to appear
    const slugInput = page.locator('input[name="slug"]');
    await expect(slugInput).toBeVisible({ timeout: 5000 });

    // Wait for slug to be generated and input to be enabled (starts disabled during generation)
    await expect(slugInput).toBeEnabled({ timeout: 10000 });

    // Wait for the slug to have a non-empty value
    await expect(slugInput).not.toHaveValue('', { timeout: 1000 });

    // Slug should be auto-generated with correct format
    const slugValue = await slugInput.inputValue();
    expect(slugValue).toBeTruthy();
    expect(slugValue.toLowerCase()).toBe(slugValue);
    expect(slugValue).toMatch(/^[a-z0-9-]+$/);
  });

  test('should validate slug format (lowercase, numbers, hyphens)', async ({ page }, testInfo) => {
    const testEmail = TEST_CONFIG.TEST_EMAIL;

    // Complete auth and user setup
    await authPage.startAuthFlow(testEmail);
    await expect(page.locator('[aria-label="input-login-otp"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[aria-label="input-login-otp"]').click();
    await page.keyboard.type('123456');
    await page.waitForURL('/', { timeout: 15000 });

    await homePage.waitForCompleteProfileLink();
    await homePage.clickCompleteProfile();
    await expect(page).toHaveURL(/\/u\/.*\/setup/, { timeout: 10000 });

    // Register user for cleanup
    const url = page.url();
    const userIdMatch = url.match(/\/u\/([^\/]+)\/setup/);
    if (userIdMatch) {
      const userId = userIdMatch[1];
      registerTestUser({
        id: userId,
        email: testEmail,
      }, testInfo.parallelIndex);
      const cookies = await getCookiesFromPage(page);
      if (cookies) {
        cookiesPerWorker.set(testInfo.parallelIndex, cookies);
      }
    }

    await userSetupPage.fillUserProfile({
      firstName: 'Test',
      lastName: 'User',
      phone: '0412345678',
      address: 'Sydney Opera House',
      securityQuestion: 'Favorite color?',
      securityAnswer: 'Blue',
    });

    await page.click('button:has-text("Continue as Merchant")');
    await expect(page).toHaveURL(/\/m\/setup\?merchantId=/, { timeout: 15000 });

    // Wait for merchant setup page to fully load (options need to be fetched)
    await page.waitForTimeout(2000);

    // Fill in merchant name (this makes the slug field appear and auto-generates a slug)
    const nameInput = page.locator('input[name="name"]');
    await expect(nameInput).toBeVisible({ timeout: 10000 });
    await nameInput.fill('Test Merchant');

    // Wait for slug to be auto-generated and enabled
    const slugInput = page.locator('input[name="slug"]');
    await expect(slugInput).toBeVisible({ timeout: 5000 });
    await expect(slugInput).toBeEnabled({ timeout: 10000 });

    // Now override the auto-generated slug with an invalid format
    await slugInput.fill('Test Merchant Slug'); // Invalid: uppercase and spaces
    
    // Debug: Check slug value
    const slugValue = await slugInput.inputValue();
    console.log('Slug value after fill:', slugValue);

    // Try to continue to step 2 - this will trigger validation
    const continueButton = page.getByRole('button', { name: /Continue to Pricing/i });
    await expect(continueButton).toBeVisible({ timeout: 5000 });
    console.log('Clicking continue button...');
    await continueButton.click();

    // Wait for validation to process (async superRefine)
    await page.waitForTimeout(2000);

    // Debug: Check for any errors on page
    const allErrors = await page.locator('[class*="text-destructive"]').allTextContents();
    console.log('All error messages:', allErrors);

    // Check if form is still on same page (didn't submit)
    console.log('Current URL:', page.url());

    // Should show validation error message
    // The actual message is: "Please use only lowercase letters, numbers and hyphens for your Public URL."
    const errorMessage = page.locator('text=/lowercase letters, numbers and hyphens/i');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should require all required fields before enabling submit', async ({ page }, testInfo) => {
    const testEmail = TEST_CONFIG.TEST_EMAIL;

    // Complete auth and user setup
    await authPage.startAuthFlow(testEmail);
    await expect(page.locator('[aria-label="input-login-otp"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[aria-label="input-login-otp"]').click();
    await page.keyboard.type('123456');
    await page.waitForURL('/', { timeout: 15000 });

    await homePage.waitForCompleteProfileLink();
    await homePage.clickCompleteProfile();
    await expect(page).toHaveURL(/\/u\/.*\/setup/, { timeout: 10000 });

    // Register user for cleanup
    const url = page.url();
    const userIdMatch = url.match(/\/u\/([^\/]+)\/setup/);
    if (userIdMatch) {
      const userId = userIdMatch[1];
      registerTestUser({
        id: userId,
        email: testEmail,
      }, testInfo.parallelIndex);
      const cookies = await getCookiesFromPage(page);
      if (cookies) {
        cookiesPerWorker.set(testInfo.parallelIndex, cookies);
      }
    }

    await userSetupPage.fillUserProfile({
      firstName: 'Test',
      lastName: 'User',
      phone: '0412345678',
      address: 'Sydney Opera House',
      securityQuestion: 'Favorite color?',
      securityAnswer: 'Blue',
    });

    await page.click('button:has-text("Continue as Merchant")');
    await expect(page).toHaveURL(/\/m\/setup\?merchantId=/, { timeout: 15000 });

    // Wait for merchant setup page to fully load (options need to be fetched)
    await page.waitForTimeout(2000);

    // Wait for name input to be visible
    const nameInput = page.locator('input[name="name"]');
    await expect(nameInput).toBeVisible({ timeout: 10000 });

    // Continue button should be visible on step 1
    const continueButton = page.getByRole('button', { name: /Continue to Pricing/i });
    await expect(continueButton).toBeVisible({ timeout: 10000 });

    // Try to continue with empty form - this will trigger validation
    await continueButton.click();
    await page.waitForTimeout(500);

    // Should show validation errors for required fields
    // At minimum, we expect error messages to appear
    const errorMessages = page.locator('[class*="text-destructive"], [role="alert"]');
    await expect(errorMessages.first()).toBeVisible({ timeout: 5000 });
  });

  test('should show welcome dialog when merchant logs back in after signup', async ({ page }, testInfo) => {
    // Set longer timeout for this complex flow
    test.setTimeout(180000); // 3 minutes

    const timestamp = Date.now();
    const workerId = testInfo.parallelIndex;
    const testEmail = `merchant-welcome-${timestamp}-${workerId}@playwright.com`;

    // STEP 1: Complete full merchant signup
    console.log('[Test] Step 1: Signing up new merchant...');
    await authPage.startAuthFlow(testEmail);
    await expect(page.locator('[aria-label="input-login-otp"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[aria-label="input-login-otp"]').click();
    await page.keyboard.type('123456');
    await page.waitForURL('/', { timeout: 15000 });

    await homePage.waitForCompleteProfileLink();
    await homePage.clickCompleteProfile();
    await expect(page).toHaveURL(/\/u\/.*\/setup/, { timeout: 10000 });

    // Register user for cleanup
    const url = page.url();
    const userIdMatch = url.match(/\/u\/([^\/]+)\/setup/);
    if (userIdMatch) {
      const userId = userIdMatch[1];
      registerTestUser({
        id: userId,
        email: testEmail,
      }, workerId);

      const cookies = await getCookiesFromPage(page);
      if (cookies) {
        cookiesPerWorker.set(workerId, cookies);
      }
    }

    // Complete user profile
    await userSetupPage.fillUserProfile({
      firstName: 'Welcome',
      lastName: 'Test',
      phone: '0412345678',
      address: 'Sydney Opera House',
      securityQuestion: 'What is your favorite color?',
      securityAnswer: 'Blue',
    });

    await page.click('button:has-text("Continue as Merchant")');
    await expect(page).toHaveURL(/\/m\/setup\?merchantId=/, { timeout: 15000 });

    // Fill merchant profile
    const merchantData = {
      name: `Welcome Test ${timestamp}`,
      slug: `welcome-test-${timestamp}`,
      email: testEmail,
    };

    await page.waitForTimeout(2000);
    await page.fill('input[name="name"]', merchantData.name);

    const slugInput = page.locator('input[name="slug"]');
    await expect(slugInput).toBeEnabled({ timeout: 10000 });
    await slugInput.fill(merchantData.slug);

    const emailInput = page.getByRole('textbox', { name: /business email/i });
    await emailInput.waitFor({ state: 'visible', timeout: 5000 });
    await emailInput.fill(merchantData.email);

    // Select country
    await page.click('[aria-label="country-picker-trigger"]');
    await page.waitForSelector('[aria-label="country-picker-search"]', { timeout: 5000 });
    await page.fill('[aria-label="country-picker-search"]', 'Australia');
    await page.waitForTimeout(300);
    await page.click('[aria-label="country-picker-result"]');
    await page.waitForTimeout(500);

    await page.fill('input[name="state"]', 'NSW');
    await page.waitForTimeout(500);

    // Select religion
    const religionButton = page.locator('[aria-label="religion-picker"]');
    await expect(religionButton).not.toBeDisabled({ timeout: 10000 });
    await religionButton.click();
    await page.waitForTimeout(500);
    await page.waitForSelector('[data-testid="religion-tree"]', { timeout: 10000 });
    const firstReligion = page.locator('[role="treeitem"]').first();
    await firstReligion.waitFor({ state: 'visible', timeout: 5000 });
    await firstReligion.click();

    // Select merchant type
    await page.waitForTimeout(500);
    const merchantTypeButton = page.locator('[aria-label="merchant-type-picker"]');
    await expect(merchantTypeButton).toBeVisible({ timeout: 10000 });
    await merchantTypeButton.click();
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10000 });
    const firstMerchantType = page.locator('[data-testid="merchant-type-tree"] [role="treeitem"]').first();
    await firstMerchantType.waitFor({ state: 'visible', timeout: 5000 });
    await firstMerchantType.click();
    await page.waitForTimeout(500);
    const closeButton = page.locator('[role="dialog"] [aria-label="close-dialog"]');
    await closeButton.click();

    // Continue to pricing
    const continueToPricingButton = page.getByRole('button', { name: /Continue to Pricing/i });
    await expect(continueToPricingButton).toBeEnabled({ timeout: 5000 });
    await continueToPricingButton.click();

    await page.waitForTimeout(3000);
    await expect(page.locator('[data-testid="merchant-subscription-section"]')).toBeVisible({ timeout: 15000 });

    // Submit form - no payment collected at signup
    const submitButton = page.getByRole('button', { name: /^Finish$/i });
    await expect(submitButton).toBeEnabled({ timeout: 10000 });
    await submitButton.click();

    // No payment dialog - redirect directly to merchant profile page
    await page.waitForURL(new RegExp(`/m/${merchantData.slug}`), { timeout: 30000 });

    // Register merchant for cleanup with actual vendor ID
    const merchantCookies = await getCookiesFromPage(page);
    if (merchantCookies) {
      cookiesPerWorker.set(workerId, merchantCookies);
      const actualVendorId = await getVendorIdFromSlug(merchantData.slug, merchantCookies);
      if (actualVendorId) {
        console.log(`[Test] Registering merchant for cleanup: vendorId=${actualVendorId}, slug=${merchantData.slug}`);
        registerTestMerchant({ id: actualVendorId, slug: merchantData.slug, email: testEmail, cookies: merchantCookies }, workerId);
      } else {
        console.error(`[Test] WARNING: Could not fetch actual vendor ID for slug ${merchantData.slug}`);
        registerTestMerchant({ slug: merchantData.slug, email: testEmail, cookies: merchantCookies }, workerId);
      }
    }

    console.log('[Test] Step 1 complete: Merchant signed up');

    // STEP 2: Verify welcome dialog appears after signup
    console.log('[Test] Step 2: Verifying welcome dialog...');
    const welcomeDialog = page.locator('[role="dialog"]:has-text("Welcome")');
    await expect(welcomeDialog).toBeVisible({ timeout: 10000 });
    console.log('[Test] Step 2 complete: Welcome dialog visible');

    // Close welcome dialog if there's a button
    const dismissButton = page.locator('[role="dialog"] button').first();
    if (await dismissButton.isVisible()) {
      await dismissButton.click();
      await page.waitForTimeout(1000);
    }

    // STEP 3: Log out
    console.log('[Test] Step 3: Logging out...');
    const signOutButton = page.locator('button:has-text("Sign Out")');
    await expect(signOutButton).toBeVisible({ timeout: 10000 });
    await signOutButton.click();
    await page.waitForURL('/', { timeout: 15000 });
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 10000 });
    console.log('[Test] Step 3 complete: Logged out');

    // STEP 4: Log back in
    console.log('[Test] Step 4: Logging back in...');
    await authPage.startAuthFlow(testEmail);
    await expect(page.locator('[aria-label="input-login-otp"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[aria-label="input-login-otp"]').click();
    await page.keyboard.type('123456');
    await page.waitForURL('/', { timeout: 15000 });
    console.log('[Test] Step 4 complete: Logged back in');

    // STEP 5: Navigate to merchant page and verify welcome dialog appears again
    console.log('[Test] Step 5: Navigating to merchant page...');
    await page.goto(`/m/${merchantData.slug}`);
    await page.waitForLoadState('networkidle');

    // The welcome dialog should appear again
    const welcomeDialogAgain = page.locator('[role="dialog"]:has-text("Welcome")');
    await expect(welcomeDialogAgain).toBeVisible({ timeout: 15000 });

    console.log('[Test] ✅ Welcome dialog verified on re-login!');
  });
});

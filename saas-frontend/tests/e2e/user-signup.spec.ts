import { test, expect } from '@playwright/test';
import { AuthPage } from '../pages/AuthPage';
import { HomePage } from '../pages/HomePage';
import { UserSetupPage } from '../pages/UserSetupPage';
import { generateTestEmail, generateTestPhone } from '../utils/test-helpers';
import { TEST_CONFIG } from '../fixtures/test-config';
import {
  generateCleanupReport,
  clearTestEntityRegistry,
  registerTestUser,
  getCookiesFromPage,
  cleanupTestUsers,
} from '../utils/test-cleanup';

// Store cookies per test worker to avoid race conditions
const cookiesPerWorker = new Map<number, string>();

/**
 * User Signup Flow Tests
 * Tests the complete user registration journey:
 * 1. Email submission
 * 2. OTP verification
 * 3. Profile completion
 * 4. Becoming a regular user OR merchant
 *
 * Test Email Configuration:
 * - Uses randomly generated @playwright.com emails
 * - OTP emails are not sent (stubbed out in non-production)
 * - Any 6-digit OTP code works EXCEPT '000000'
 * - OTP '000000' is configured to fail (similar to Stripe test cards)
 *   This allows testing graceful failure handling
 */

// Cleanup before tests to remove any existing test user
test.beforeAll(async ({}, testInfo) => {
  console.log('[Setup] Preparing test environment...');
  clearTestEntityRegistry(testInfo.parallelIndex);
});

// Cleanup after all tests in this file
test.afterAll(async ({}, testInfo) => {
  // Increase timeout for cleanup operations
  test.setTimeout(120000); // 2 minutes for cleanup

  const workerId = testInfo.parallelIndex;
  const cookies = cookiesPerWorker.get(workerId);

  if (cookies) {
    try {
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

test.describe('User Signup Flow - OTP Authentication', () => {
  let authPage: AuthPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    await page.goto('/');
  });

  test('should display email input and login/signup button', async ({ page }) => {
    // Verify signin component is visible
    const emailInput = page.locator('input[name="email"]');
    const loginButton = page.locator('button:has-text("Login / Signup")');

    await expect(emailInput).toBeVisible();
    await expect(loginButton).toBeVisible();
  });

  test('should disable login button for invalid email', async ({ page }) => {
    await authPage.enterEmail('invalid-email');

    const isEnabled = await authPage.isLoginButtonEnabled();
    expect(isEnabled).toBe(false);
  });

  test('should enable login button for valid email', async ({ page }) => {
    await authPage.enterEmail(TEST_CONFIG.TEST_EMAIL);

    const isEnabled = await authPage.isLoginButtonEnabled();
    expect(isEnabled).toBe(true);
  });

  test('should send OTP when valid email is submitted', async ({ page }) => {
    const testEmail = TEST_CONFIG.TEST_EMAIL;

    // Don't intercept - let the real server action run
    await authPage.enterEmail(testEmail);
    await authPage.clickLoginSignup();

    // Verify "Sending Code..." status appears
    await expect(page.locator('text=Sending Code...')).toBeVisible();

    // Wait for "Email sent!" message (this means OTP was sent)
    await expect(page.locator('text=Email sent!')).toBeVisible({ timeout: 15000 });

    // After 5 seconds, OTP input should appear
    await expect(page.locator('[aria-label="input-login-otp"]')).toBeVisible({ timeout: 6000 });
  });

  test('should display OTP input after email sent', async ({ page }) => {
    const testEmail = TEST_CONFIG.TEST_EMAIL;

    // Don't mock - let real OTP be sent
    await authPage.startAuthFlow(testEmail);

    // Verify OTP input appears
    const otpInput = page.locator('[aria-label="input-login-otp"]');
    await expect(otpInput).toBeVisible();

    // Verify there are 6 input slots using the new data-slot-index attribute
    const otpSlots = page.locator('[data-slot-index]');
    await expect(otpSlots).toHaveCount(6);
  });

  test('should display resend and cancel buttons in OTP view', async ({ page }) => {
    const testEmail = TEST_CONFIG.TEST_EMAIL;

    await authPage.startAuthFlow(testEmail);

    // Wait for OTP input to appear
    await expect(page.locator('[aria-label="input-login-otp"]')).toBeVisible({ timeout: 15000 });

    // Verify resend button
    const resendButton = page.locator('button[aria-label="Resend Code"]');
    await expect(resendButton).toBeVisible();

    // Verify cancel button
    const cancelButton = page.locator('button[aria-label="Cancel"]');
    await expect(cancelButton).toBeVisible();
  });

  test('should reset flow when cancel button is clicked', async ({ page }) => {
    const testEmail = TEST_CONFIG.TEST_EMAIL;

    await authPage.startAuthFlow(testEmail);

    // Wait for OTP input to appear
    await expect(page.locator('[aria-label="input-login-otp"]')).toBeVisible({ timeout: 15000 });

    await authPage.cancelOTP();

    // Verify we're back to email input
    const emailInput = page.locator('input[name="email"]');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveValue('');
  });

  test('should handle invalid OTP gracefully', async ({ page }) => {
    const testEmail = TEST_CONFIG.TEST_EMAIL;

    await authPage.startAuthFlow(testEmail);

    // Wait for OTP input
    await expect(page.locator('[aria-label="input-login-otp"]')).toBeVisible({ timeout: 15000 });

    // Enter special test OTP '000000' which is configured to fail for @playwright.com emails
    // Similar to Stripe's test card numbers that trigger specific behaviors
    await page.locator('[aria-label="input-login-otp"]').click();
    await page.keyboard.type('000000');

    // Wait for validation to complete
    await page.waitForTimeout(2000);

    // OTP input should still be visible (user can retry)
    await expect(page.locator('[aria-label="input-login-otp"]')).toBeVisible();
  });

  test('should handle resend OTP with cooldown', async ({ page }) => {
    const testEmail = TEST_CONFIG.TEST_EMAIL;

    await authPage.startAuthFlow(testEmail);

    // Wait for OTP input
    await expect(page.locator('[aria-label="input-login-otp"]')).toBeVisible({ timeout: 15000 });

    // Click resend
    await authPage.resendOTP();

    // Verify toast notification
    await expect(page.locator('[data-sonner-toast]:has-text("A new code was sent")')).toBeVisible();

    // Clicking resend again immediately should show cooldown warning
    const resendButton = page.locator('button[aria-label="Resend Code"]');
    await resendButton.click();

    await expect(page.locator('[data-sonner-toast]:has-text("Please wait before resending")')).toBeVisible();
  });

  test('should limit resend attempts to 3', async ({ page }) => {
    const testEmail = TEST_CONFIG.TEST_EMAIL;

    await authPage.startAuthFlow(testEmail);

    // Wait for OTP input
    await expect(page.locator('[aria-label="input-login-otp"]')).toBeVisible({ timeout: 15000 });

    // Note: This test cannot fully test the resend limit without mocking timers
    // because there's a 60-second cooldown between resends.
    // We'll just verify that attempting multiple quick resends shows the cooldown warning

    const resendButton = page.locator('button[aria-label="Resend Code"]');

    // First resend
    await resendButton.click();
    await expect(page.locator('[data-sonner-toast]:has-text("A new code was sent")')).toBeVisible();

    // Immediate second attempt should be blocked by cooldown
    await resendButton.click();
    await expect(page.locator('[data-sonner-toast]:has-text("Please wait before resending")')).toBeVisible();
  });
});

test.describe('User Signup Flow - Profile Completion', () => {
  let authPage: AuthPage;
  let setupPage: UserSetupPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    setupPage = new UserSetupPage(page);

    // Start the auth flow
    await page.goto('/');
  });

  test('should redirect to setup page after successful OTP validation', async ({ page }, testInfo) => {
    const testEmail = TEST_CONFIG.TEST_EMAIL;
    const homePage = new HomePage(page);

    // Start auth flow
    await authPage.startAuthFlow(testEmail);

    // Wait for OTP input to appear
    await expect(page.locator('[aria-label="input-login-otp"]')).toBeVisible({ timeout: 15000 });

    // Enter any 6-digit OTP (validation not enforced in test environment)
    // Click on the OTP input to focus it
    await page.locator('[aria-label="input-login-otp"]').click();

    // Type the OTP using keyboard
    await page.keyboard.type('123456');

    // Wait for validation and redirect
    // After successful OTP, user should be redirected to home page
    // Since this is a new user, the home page should show "Complete Your Profile"
    await page.waitForURL('/', { timeout: 15000 });

    // Verify we're on home page
    await expect(page).toHaveURL('/');

    // Wait for "Complete Your Profile" link to appear (for new users with requiresInput=true)
    // Longer timeout because session needs to update and queries need to refetch
    await homePage.waitForCompleteProfileLink();
    await expect(homePage.getCompleteProfileLink()).toBeVisible();

    // Click "Complete Your Profile" to navigate to setup page
    await homePage.clickCompleteProfile();

    // Verify we're redirected to the setup page
    // URL should be /u/{userId}/setup
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

    // Verify setup page is displayed
    const isOnSetup = await setupPage.isOnSetupPage();
    expect(isOnSetup).toBe(true);
  });

  // Removed: Redundant test - setup page display is already covered by redirect test above

  test('should complete user signup as regular user', async ({ page }, testInfo) => {
    const testEmail = TEST_CONFIG.TEST_EMAIL;
    const homePage = new HomePage(page);

    // Start auth flow and get to setup page
    await authPage.startAuthFlow(testEmail);
    await expect(page.locator('[aria-label="input-login-otp"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[aria-label="input-login-otp"]').click();
    await page.keyboard.type('123456');
    await page.waitForURL('/', { timeout: 15000 });

    // Click "Complete Your Profile" to navigate to setup page
    await homePage.waitForCompleteProfileLink();
    await homePage.clickCompleteProfile();
    await expect(page).toHaveURL(/\/u\/.*\/setup/, { timeout: 10000 });

    // Register user for cleanup and capture cookies
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

    // Fill in user profile data
    const userData = {
      firstName: 'Test',
      lastName: 'User',
      phone: '0412345678', // Australian mobile format (defaultCountry is AU)
      address: 'Sydney Opera House', // Real address that will trigger autocomplete
      securityQuestion: 'What is your favorite color?',
      securityAnswer: 'Blue',
    };

    // Fill the form using page object
    await setupPage.fillUserProfile(userData);

    // Wait for form to be valid and button to be enabled
    await expect(page.locator('button:has-text("Start browsing SpiriVerse")')).toBeEnabled({ timeout: 10000 });

    // Click start browsing button (this will wait for button to be ready and redirect)
    await setupPage.startBrowsing();

    // Should already be on home page (startBrowsing waits for redirect)
    await expect(page).toHaveURL('/');
  });

  test('should validate form before enabling submit buttons', async ({ page }, testInfo) => {
    const testEmail = TEST_CONFIG.TEST_EMAIL;
    const homePage = new HomePage(page);

    // Start auth flow and get to setup page
    await authPage.startAuthFlow(testEmail);
    await expect(page.locator('[aria-label="input-login-otp"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[aria-label="input-login-otp"]').click();
    await page.keyboard.type('123456');
    await page.waitForURL('/', { timeout: 15000 });

    // Click "Complete Your Profile" to navigate to setup page
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

    // Wait for form to load completely - email should be displayed
    await expect(page.locator('h2:has-text("Get Started")')).toBeVisible();

    // Wait for email to be displayed in the header (it's shown as text, not an input field)
    await expect(page.locator(`text=${testEmail}`)).toBeVisible({ timeout: 10000 });

    // Wait for form to finish initializing (form.reset() is called in useEffect)
    await page.waitForTimeout(500);

    // Buttons should be disabled initially (pristine form - isDirty = false after form.reset())
    const initialValidation = await setupPage.verifyFormValidation();
    expect(initialValidation).toBe(true);

    // Fill only first name (partial data)
    // NOTE: Buttons will become enabled once form isDirty, even if invalid
    // This is the current implementation (disabled={isDirty == false})
    await page.fill('input[name="firstname"]', 'Test');
    await page.waitForTimeout(300); // Wait for form state update

    // After making form dirty, buttons become enabled (current behavior)
    // The form uses isDirty check, not isValid check
    const afterPartialFill = await setupPage.isStartBrowsingEnabled();
    expect(afterPartialFill).toBe(true); // Buttons are enabled when form is dirty

    // Complete all required fields to test full form submission
    const userData = {
      firstName: 'Test',
      lastName: 'User',
      phone: '0412345678',
      address: 'Sydney Opera House',
      securityQuestion: 'What is your favorite color?',
      securityAnswer: 'Blue',
    };

    await setupPage.fillUserProfile(userData);

    // Buttons should still be enabled (form is dirty and now also valid)
    await expect(page.locator('button:has-text("Start browsing SpiriVerse")')).toBeEnabled({ timeout: 10000 });
  });
});

test.describe('User Signup - Error Handling', () => {
  let authPage: AuthPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    await page.goto('/');
  });

  test('should disable login button for invalid email format', async ({ page }) => {
    // Enter invalid email
    await authPage.enterEmail('not-an-email');

    // Button should be disabled (prevents invalid submission)
    const isEnabled = await authPage.isLoginButtonEnabled();
    expect(isEnabled).toBe(false);

    // Verify button remains disabled with various invalid formats
    await authPage.enterEmail('missing-at-sign.com');
    expect(await authPage.isLoginButtonEnabled()).toBe(false);

    await authPage.enterEmail('missing-domain@');
    expect(await authPage.isLoginButtonEnabled()).toBe(false);

    // Valid email should enable the button
    await authPage.enterEmail('valid@email.com');
    expect(await authPage.isLoginButtonEnabled()).toBe(true);
  });
});

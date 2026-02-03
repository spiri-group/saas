import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Authentication Page Object Model
 * Handles OTP-based signup/login flow
 */
export class AuthPage extends BasePage {
  // Selectors
  private readonly selectors = {
    emailInput: 'input[name="email"]',
    loginSignupButton: 'button:has-text("Login / Signup")',
    otpInputGroup: '[aria-label="input-login-otp"]',
    otpSlot: (index: number) => `[aria-label="input-login-otp"] input:nth-child(${index + 1})`,
    resendButton: 'button[aria-label="Resend Code"]',
    cancelButton: 'button[aria-label="Cancel"]',
    sendingStatus: 'text=Sending Code...',
    emailSentStatus: 'text=Email sent!',
    validatingStatus: 'text=Validating...',
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Enter email address
   */
  async enterEmail(email: string) {
    await this.page.fill(this.selectors.emailInput, email);
  }

  /**
   * Click Login/Signup button
   */
  async clickLoginSignup() {
    await this.page.click(this.selectors.loginSignupButton);
  }

  /**
   * Start auth flow with email
   */
  async startAuthFlow(email: string) {
    await this.enterEmail(email);
    await this.clickLoginSignup();

    // Wait for email sent confirmation
    await this.page.waitForSelector(this.selectors.emailSentStatus, { timeout: 10000 });

    // Wait for OTP input to appear (5 seconds after email sent)
    await this.page.waitForSelector(this.selectors.otpInputGroup, { timeout: 10000 });
  }

  /**
   * Enter OTP code (6 digits)
   */
  async enterOTP(otp: string) {
    if (otp.length !== 6) {
      throw new Error('OTP must be 6 digits');
    }

    // Wait for OTP input to be visible
    await this.page.waitForSelector(this.selectors.otpInputGroup);

    // Type OTP - Playwright will handle the input distribution
    const firstSlot = this.page.locator(this.selectors.otpInputGroup).locator('input').first();
    await firstSlot.fill(otp);

    // Wait for validation
    await this.page.waitForSelector(this.selectors.validatingStatus, { timeout: 5000 });
  }

  /**
   * Complete full auth flow (for testing with known OTP)
   * In real tests, you'll need to intercept the OTP email or use a test OTP
   */
  async loginWithOTP(email: string, otp: string) {
    await this.startAuthFlow(email);
    await this.enterOTP(otp);

    // Wait for validation to complete and page to redirect
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Click resend OTP button
   */
  async resendOTP() {
    await this.page.click(this.selectors.resendButton);

    // Wait for toast notification
    await this.page.waitForSelector('[data-sonner-toast]:has-text("A new code was sent")', {
      timeout: 5000,
    });
  }

  /**
   * Cancel OTP flow
   */
  async cancelOTP() {
    await this.page.click(this.selectors.cancelButton);

    // Verify we're back to email input
    await this.page.waitForSelector(this.selectors.emailInput);
  }

  /**
   * Check if login/signup button is enabled
   */
  async isLoginButtonEnabled(): Promise<boolean> {
    const button = this.page.locator(this.selectors.loginSignupButton);
    return !(await button.isDisabled());
  }

  /**
   * Intercept OTP email for testing
   * This mocks the Twilio sendOTP function to return a known OTP
   */
  async interceptOTP(testOTP = '123456') {
    await this.page.route('**/api/sendOTP*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // Store the test OTP for later use
    await this.page.evaluate(
      (otp) => {
        (window as any).__TEST_OTP__ = otp;
      },
      testOTP
    );

    return testOTP;
  }

  /**
   * Mock successful OTP validation
   */
  async mockOTPValidation(email: string) {
    await this.page.route('**/api/auth/callback/credentials*', async (route) => {
      await route.fulfill({
        status: 200,
        headers: {
          'Set-Cookie': 'app.session-token=test-session-token; Path=/; HttpOnly; SameSite=Lax',
        },
        body: JSON.stringify({ url: `/u/${email}/setup` }),
      });
    });
  }
}

import { test as base, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Authentication fixture for Playwright tests
 * Handles login state management and session persistence
 */

export type AuthRole = 'customer' | 'merchant' | 'admin';

export interface AuthFixtures {
  authenticatedPage: any;
  loginAsCustomer: () => Promise<void>;
  loginAsMerchant: (merchantSlug?: string) => Promise<void>;
  loginAsAdmin: () => Promise<void>;
}

// Storage state paths for different user roles
const authDir = path.join(__dirname, '../.auth');
const customerAuthFile = path.join(authDir, 'customer.json');
const merchantAuthFile = path.join(authDir, 'merchant.json');
const adminAuthFile = path.join(authDir, 'admin.json');

// Ensure auth directory exists
if (!fs.existsSync(authDir)) {
  fs.mkdirSync(authDir, { recursive: true });
}

/**
 * Extended test with authentication fixtures
 */
export const test = base.extend<AuthFixtures>({
  /**
   * Login as a customer user
   */
  loginAsCustomer: async ({ page, context }, use) => {
    const login = async () => {
      // Check if we have saved auth state
      if (fs.existsSync(customerAuthFile)) {
        await context.addCookies(JSON.parse(fs.readFileSync(customerAuthFile, 'utf-8')).cookies);
        return;
      }

      // Perform login
      await page.goto('/');

      // TODO: Update these selectors based on your actual login form
      // This is a placeholder - you'll need to customize based on your NextAuth setup
      await page.click('[data-testid="login-button"]');
      await page.fill('[data-testid="email-input"]', process.env.TEST_CUSTOMER_EMAIL || 'test@customer.com');
      await page.fill('[data-testid="password-input"]', process.env.TEST_CUSTOMER_PASSWORD || 'testpass123');
      await page.click('[data-testid="submit-login"]');

      // Wait for successful login
      await page.waitForURL(/\/c\/.+/, { timeout: 10000 });

      // Save auth state
      const cookies = await context.cookies();
      fs.writeFileSync(customerAuthFile, JSON.stringify({ cookies }, null, 2));
    };

    await use(login);
  },

  /**
   * Login as a merchant user
   */
  loginAsMerchant: async ({ page, context }, use) => {
    const login = async (merchantSlug?: string) => {
      // Check if we have saved auth state
      if (fs.existsSync(merchantAuthFile)) {
        await context.addCookies(JSON.parse(fs.readFileSync(merchantAuthFile, 'utf-8')).cookies);
        return;
      }

      // Perform login
      await page.goto('/');

      // TODO: Update these selectors based on your actual login form
      await page.click('[data-testid="login-button"]');
      await page.fill('[data-testid="email-input"]', process.env.TEST_MERCHANT_EMAIL || 'merchant@test.com');
      await page.fill('[data-testid="password-input"]', process.env.TEST_MERCHANT_PASSWORD || 'merchantpass123');
      await page.click('[data-testid="submit-login"]');

      // Wait for successful login
      await page.waitForURL(/\/m\/.+/, { timeout: 10000 });

      // Save auth state
      const cookies = await context.cookies();
      fs.writeFileSync(merchantAuthFile, JSON.stringify({ cookies }, null, 2));
    };

    await use(login);
  },

  /**
   * Login as an admin user
   */
  loginAsAdmin: async ({ page, context }, use) => {
    const login = async () => {
      // Check if we have saved auth state
      if (fs.existsSync(adminAuthFile)) {
        await context.addCookies(JSON.parse(fs.readFileSync(adminAuthFile, 'utf-8')).cookies);
        return;
      }

      // Perform login
      await page.goto('/');

      // TODO: Update these selectors based on your actual login form
      await page.click('[data-testid="login-button"]');
      await page.fill('[data-testid="email-input"]', process.env.TEST_ADMIN_EMAIL || 'admin@spiriverse.com');
      await page.fill('[data-testid="password-input"]', process.env.TEST_ADMIN_PASSWORD || 'adminpass123');
      await page.click('[data-testid="submit-login"]');

      // Wait for successful login
      await page.waitForURL(/\/console/, { timeout: 10000 });

      // Save auth state
      const cookies = await context.cookies();
      fs.writeFileSync(adminAuthFile, JSON.stringify({ cookies }, null, 2));
    };

    await use(login);
  },

  /**
   * Pre-authenticated page (can be configured per test)
   */
  authenticatedPage: async ({ browser }, use) => {
    // This will be configured per test based on role needed
    await use(null);
  },
});

export { expect };

/**
 * Helper to clear all saved auth states
 */
export function clearAuthStates() {
  [customerAuthFile, merchantAuthFile, adminAuthFile].forEach(file => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  });
}

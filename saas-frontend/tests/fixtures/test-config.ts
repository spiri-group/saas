import { generateTestEmail } from '../utils/test-helpers';

/**
 * Test Configuration
 * Centralized config for test data
 */

export const TEST_CONFIG = {
  // Test user email (Playwright test user - no actual emails sent)
  // Use generateTestEmail() for unique emails per test
  get TEST_EMAIL() {
    return generateTestEmail('user');
  },

  // Test merchant prefix (for easy identification and cleanup)
  MERCHANT_PREFIX: 'TEST-',

  // Timeouts
  OTP_WAIT_TIME: 5000, // Time to wait for OTP input to appear
  VALIDATION_TIMEOUT: 10000,
  PAGE_LOAD_TIMEOUT: 30000,

  // OTP settings
  OTP_LENGTH: 6,
  OTP_RESEND_COOLDOWN: 60000, // 60 seconds
  OTP_MAX_RESENDS: 3,

  // Test data templates
  DEFAULT_USER_DATA: {
    firstName: 'Test',
    lastName: 'User',
    phone: '+61412345678',
    address: '123 Test St, Sydney NSW 2000, Australia',
    securityQuestion: 'What is your favorite color?',
    securityAnswer: 'Blue',
  },

  DEFAULT_MERCHANT_DATA: {
    religion: 'Spiritual',
    services: ['Tarot Reading'],
    country: 'AU',
    countryName: 'Australia',
    state: 'NSW',
  },

  // Product test defaults
  DEFAULT_PRODUCT_DATA: {
    name: 'Test Product',
    category: 'General',
    pricingStrategy: 'volume' as const,
    landedCost: 10.00,
    quantity: 100,
    price: 29.99,
  },

  // Cart test defaults
  DEFAULT_CART_ITEM: {
    descriptor: 'Test Cart Item',
    quantity: 1,
    price: { amount: 25.00, currency: 'USD' },
  },
};

/**
 * Generate unique merchant slug for testing
 */
export function generateTestMerchantSlug(description?: string): string {
  const timestamp = Date.now();
  const suffix = description ? `-${description}` : '';
  return `${TEST_CONFIG.MERCHANT_PREFIX}${timestamp}${suffix}`.toLowerCase();
}

/**
 * Generate unique merchant name for testing
 */
export function generateTestMerchantName(description?: string): string {
  const timestamp = Date.now();
  const suffix = description ? ` ${description}` : '';
  return `${TEST_CONFIG.MERCHANT_PREFIX}${timestamp}${suffix}`;
}

/**
 * Check if entity is a test entity (for cleanup)
 */
export function isTestEntity(slug: string): boolean {
  return slug.startsWith(TEST_CONFIG.MERCHANT_PREFIX.toLowerCase());
}

import { Page } from '@playwright/test';
import { gql } from '@/lib/services/gql';
import axios from 'axios';

/**
 * Test Cleanup Utilities
 * Handles cleanup of test data after tests complete
 */

// Use Next.js GraphQL proxy for test cleanup (it handles auth automatically)
// Always use the test server port (3002) regardless of env vars
// The env vars may point to the main dev server (3000), but tests run on 3002
const TEST_SERVER_PORT = process.env.TEST_SERVER_PORT || '3002';
const GRAPHQL_PROXY = `http://localhost:${TEST_SERVER_PORT}/api/graphql`;

/**
 * Call GraphQL via Next.js proxy with session cookies
 * The proxy will automatically handle auth using the session cookies from the browser
 * Exported as executeGraphQL for test files
 */
export async function gqlDirect<T>(
  query: string,
  variables?: Record<string, any>,
  cookies?: string // Cookie header string
): Promise<T> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add cookies if provided (format: "name1=value1; name2=value2")
    if (cookies) {
      headers['Cookie'] = cookies;
    }

    const response = await axios.post(
      GRAPHQL_PROXY,
      { query, variables },
      { headers }
    );

    if (response.status !== 200) {
      throw new Error(`Failed to fetch data: ${response.statusText}`);
    }

    const { data, errors } = response.data;

    if (errors && errors.length > 0) {
      throw new Error(`GraphQL errors: ${JSON.stringify(errors)}`);
    }

    return data as T;
  } catch (error) {
    console.error('[gqlDirect] Error:', error);
    throw error;
  }
}

/**
 * Fetch vendor ID from slug using GraphQL
 * This is useful when you need to get the actual vendor ID after creating a profile
 */
export async function getVendorIdFromSlug(slug: string, cookies: string): Promise<string | null> {
  try {
    const result = await gqlDirect<{ vendorIdFromSlug: { merchantId: string | null } }>(
      `query GetVendorId($slug: String!) {
        vendorIdFromSlug(slug: $slug) {
          merchantId
        }
      }`,
      { slug },
      cookies
    );
    return result.vendorIdFromSlug?.merchantId || null;
  } catch (error) {
    console.error('[getVendorIdFromSlug] Error:', error);
    return null;
  }
}

interface TestUser {
  id: string;
  email: string;
  cookies?: string; // Session cookies for purging this user
}

interface TestMerchant {
  id?: string;
  slug: string;
  name?: string;
  email?: string;
  cookies?: string; // Session cookies for purging this merchant
}

interface TestPractitioner {
  id?: string;
  slug: string;
  name?: string;
  email?: string;
  cookies?: string; // Session cookies for purging this practitioner
}

// Store created test entities for cleanup per worker to avoid race conditions in parallel tests
const testEntitiesPerWorker = new Map<number, {
  users: Set<TestUser>;
  merchants: Set<TestMerchant>;
  practitioners: Set<TestPractitioner>;
}>();

/**
 * Get or create test entities for a worker
 */
function getWorkerEntities(workerId: number = 0) {
  if (!testEntitiesPerWorker.has(workerId)) {
    testEntitiesPerWorker.set(workerId, {
      users: new Set<TestUser>(),
      merchants: new Set<TestMerchant>(),
      practitioners: new Set<TestPractitioner>(),
    });
  }
  return testEntitiesPerWorker.get(workerId)!;
}

/**
 * Register a test user for cleanup
 */
export function registerTestUser(user: TestUser, workerId: number = 0) {
  getWorkerEntities(workerId).users.add(user);
}

/**
 * Register a test merchant for cleanup
 */
export function registerTestMerchant(merchant: TestMerchant, workerId: number = 0) {
  getWorkerEntities(workerId).merchants.add(merchant);
}

/**
 * Register a test practitioner for cleanup
 */
export function registerTestPractitioner(practitioner: TestPractitioner, workerId: number = 0) {
  getWorkerEntities(workerId).practitioners.add(practitioner);
}

/**
 * Clean up test merchants
 */
export async function cleanupTestMerchants(auth?: string, workerId: number = 0) {
  const merchantsToCleanup = Array.from(getWorkerEntities(workerId).merchants);

  if (merchantsToCleanup.length === 0) {
    return;
  }

  if (!auth) {
    console.log('[Cleanup] No auth provided. Skipping merchant cleanup.');
    return;
  }

  console.log(`[Cleanup] Deleting ${merchantsToCleanup.length} test merchants:`);

  for (const merchant of merchantsToCleanup) {
    console.log(`  - ${merchant.slug}`);

    try {
      // If no ID provided, fetch it from the slug
      let vendorId = merchant.id;
      if (!vendorId) {
        console.log(`    Fetching vendor ID from slug: ${merchant.slug}`);
        const response = await gqlDirect<{ vendorIdFromSlug: { merchantId: string | null } }>(
          `query GetVendorId($slug: String!) {
            vendorIdFromSlug(slug: $slug) {
              merchantId
            }
          }`,
          { slug: merchant.slug },
          auth
        );
        vendorId = response.vendorIdFromSlug?.merchantId || undefined;

        if (!vendorId) {
          console.log(`    ⚠ Vendor not found with slug: ${merchant.slug}`);
          getWorkerEntities(workerId).merchants.delete(merchant);
          continue;
        }
      }

      await gqlDirect(
        `mutation PurgeVendor($vendorId: ID!) {
          purge_vendor(vendorId: $vendorId) {
            success
            message
          }
        }`,
        { vendorId },
        auth
      );
      console.log(`  ✓ Purged merchant: ${merchant.slug} (${vendorId})`);
      getWorkerEntities(workerId).merchants.delete(merchant);
    } catch (error) {
      console.error(`  ✗ Failed to delete merchant ${merchant.slug}:`, error);
    }
  }
}

/**
 * Clean up test practitioners
 * Practitioners use the same purge_vendor mutation as merchants (they share the same container)
 * NOTE: Each practitioner can have their own cookies for purging
 */
export async function cleanupTestPractitioners(fallbackAuth?: string, workerId: number = 0) {
  const practitionersToCleanup = Array.from(getWorkerEntities(workerId).practitioners);

  if (practitionersToCleanup.length === 0) {
    return;
  }

  console.log(`[Cleanup] Deleting ${practitionersToCleanup.length} test practitioners:`);

  for (const practitioner of practitionersToCleanup) {
    // Use practitioner's own cookies if available, otherwise fall back to provided auth
    const auth = practitioner.cookies || fallbackAuth;

    if (!auth) {
      console.log(`  ⚠ No cookies for ${practitioner.slug}, skipping...`);
      continue;
    }

    console.log(`  - ${practitioner.slug} (id: ${practitioner.id || 'not set'})`);

    try {
      // If no ID provided, fetch it from the slug
      let vendorId = practitioner.id;
      if (!vendorId) {
        console.log(`    Fetching practitioner ID from slug: ${practitioner.slug}`);
        const response = await gqlDirect<{ vendorIdFromSlug: { merchantId: string | null } }>(
          `query GetVendorId($slug: String!) {
            vendorIdFromSlug(slug: $slug) {
              merchantId
            }
          }`,
          { slug: practitioner.slug },
          auth
        );
        vendorId = response.vendorIdFromSlug?.merchantId || undefined;

        if (!vendorId) {
          console.log(`    ⚠ Practitioner not found with slug: ${practitioner.slug}`);
          getWorkerEntities(workerId).practitioners.delete(practitioner);
          continue;
        }
      }

      const result = await gqlDirect<{ purge_vendor: { success: boolean; message: string } }>(
        `mutation PurgeVendor($vendorId: ID!) {
          purge_vendor(vendorId: $vendorId) {
            success
            message
          }
        }`,
        { vendorId },
        auth
      );
      if (result.purge_vendor?.success) {
        console.log(`  ✓ Purged practitioner: ${practitioner.slug} (${vendorId})`);
      } else {
        console.log(`  ⚠ Purge returned: ${result.purge_vendor?.message || 'unknown'}`);
      }
      getWorkerEntities(workerId).practitioners.delete(practitioner);
    } catch (error: any) {
      const errorDetails = error.response?.data?.errors
        ? JSON.stringify(error.response.data.errors)
        : error.response?.data?.error
          ? error.response.data.error
          : error.message;
      console.error(`  ✗ Failed to delete practitioner ${practitioner.slug}: ${errorDetails}`);
    }
  }
}

/**
 * Clean up test users
 * NOTE: Users can only delete themselves, so each user needs their own session cookies
 * NOTE: Users may already be deleted if their associated vendor was purged (cascade delete)
 */
export async function cleanupTestUsers(fallbackCookies?: string, workerId: number = 0) {
  const usersToCleanup = Array.from(getWorkerEntities(workerId).users);

  if (usersToCleanup.length === 0) {
    return; // Silently return - no need to log when there's nothing to clean
  }

  console.log(`[Cleanup] Purging ${usersToCleanup.length} test user(s)...`);

  for (const user of usersToCleanup) {
    // Use user's own cookies if available, otherwise fall back to provided cookies
    const userCookies = user.cookies || fallbackCookies;

    if (!userCookies) {
      console.log(`[Cleanup] ⚠ No cookies for ${user.email}, skipping...`);
      getWorkerEntities(workerId).users.delete(user);
      continue;
    }

    try {
      const result = await gqlDirect<{ purge_user: { success: boolean; message: string } }>(
        `mutation PurgeUser($userId: ID!) {
          purge_user(userId: $userId) {
            success
            message
          }
        }`,
        { userId: user.id },
        userCookies
      );
      if (result.purge_user?.success) {
        console.log(`[Cleanup] ✓ Purged user: ${user.email}`);
      } else {
        // User may have already been deleted via vendor cascade
        console.log(`[Cleanup] ⚠ User ${user.email}: ${result.purge_user?.message || 'may already be deleted'}`);
      }
      getWorkerEntities(workerId).users.delete(user);
    } catch (error: any) {
      // 500 errors often mean the session is invalid because the user was already deleted
      // This is expected when vendor purge cascades to delete the user
      const status = error.response?.status;
      const isSessionError = error.response?.data?.error?.includes('Session references non-existent user') ||
                            error.message?.includes('500');

      if (status === 500 || isSessionError) {
        console.log(`[Cleanup] ✓ User ${user.email} already deleted (session invalid)`);
      } else {
        console.error(`[Cleanup] ✗ Failed to purge ${user.email}:`, error.message);
      }
      getWorkerEntities(workerId).users.delete(user);
    }
  }
}

/**
 * Clean up all test entities
 */
export async function cleanupAllTestData(auth?: string) {
  await cleanupTestMerchants(auth);
  await cleanupTestPractitioners(auth);
  await cleanupTestUsers(auth);
}

/**
 * Clear all registered test entities for a worker
 */
export function clearTestEntityRegistry(workerId: number = 0) {
  const entities = getWorkerEntities(workerId);
  entities.users.clear();
  entities.merchants.clear();
  entities.practitioners.clear();
}

/**
 * Get cookies from page session as a Cookie header string
 * Much simpler - just grab all cookies and let Next.js proxy handle auth!
 */
export async function getCookiesFromPage(page: Page): Promise<string | undefined> {
  const cookies = await page.context().cookies();

  if (cookies.length === 0) {
    return undefined;
  }

  // Convert cookies to "name1=value1; name2=value2" format for Cookie header
  const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

  return cookieHeader;
}

/**
 * Workaround: Mark entities with test prefix for easy identification
 * Use this pattern in tests: "TEST-{timestamp}-{description}"
 */
export function generateTestPrefix(): string {
  return `TEST-${Date.now()}`;
}

/**
 * Add a test location to a merchant via GraphQL
 * This is useful for tests that require a location to be set up before proceeding
 */
export async function addTestLocation(
  merchantId: string,
  cookies: string,
  locationName: string = 'Test Location'
): Promise<boolean> {
  try {
    const locationId = `loc-${Date.now()}`;
    await gqlDirect(
      `mutation UpdateMerchantLocations($merchantId: ID!, $locations: [MerchantLocationInput]!) {
        update_merchant_locations(merchantId: $merchantId, locations: $locations) {
          success
          message
        }
      }`,
      {
        merchantId,
        locations: [
          {
            id: locationId,
            title: locationName,
            address: {
              id: `addr-${Date.now()}`,
              formattedAddress: '1 Test Street, Sydney NSW 2000, Australia',
              components: {
                city: 'Sydney',
                country: 'AU',
                line1: '1 Test Street',
                postal_code: '2000',
                state: 'NSW',
              },
              point: {
                type: 'Point',
                coordinates: {
                  lng: 151.2093,
                  lat: -33.8688,
                },
              },
            },
            services: ['Testing'],
          },
        ],
      },
      cookies
    );
    console.log(`[Test Setup] ✓ Added location "${locationName}" to merchant ${merchantId}`);
    return true;
  } catch (error) {
    console.error('[Test Setup] Failed to add location:', error);
    return false;
  }
}

/**
 * Complete Stripe test onboarding for a merchant
 * This calls the GraphQL mutation that uses Stripe's test values to complete onboarding
 */
export async function completeStripeTestOnboarding(
  merchantId: string,
  cookies: string
): Promise<{ success: boolean; chargesEnabled: boolean; payoutsEnabled: boolean; message: string }> {
  try {
    console.log(`[Stripe Onboarding] Calling complete_stripe_test_onboarding for merchant: ${merchantId}`);

    const result = await gqlDirect<{
      complete_stripe_test_onboarding: {
        success: boolean;
        message: string;
        chargesEnabled: boolean;
        payoutsEnabled: boolean;
      };
    }>(
      `mutation CompleteStripeTestOnboarding($merchantId: ID!) {
        complete_stripe_test_onboarding(merchantId: $merchantId) {
          success
          message
          chargesEnabled
          payoutsEnabled
        }
      }`,
      { merchantId },
      cookies
    );

    const response = result.complete_stripe_test_onboarding;
    console.log(`[Stripe Onboarding] ${response.success ? '✓' : '✗'} ${response.message}`);
    console.log(`[Stripe Onboarding] Charges enabled: ${response.chargesEnabled}, Payouts enabled: ${response.payoutsEnabled}`);

    return {
      success: response.success,
      chargesEnabled: response.chargesEnabled,
      payoutsEnabled: response.payoutsEnabled,
      message: response.message,
    };
  } catch (error: any) {
    // Extract more detailed error info
    const errorDetails = error.response?.data?.errors
      ? JSON.stringify(error.response.data.errors)
      : error.response?.data?.error
        ? error.response.data.error
        : error.message;

    console.error('[Stripe Onboarding] Failed:', errorDetails);
    console.error('[Stripe Onboarding] Full error:', JSON.stringify({
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    }, null, 2));

    return {
      success: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      message: errorDetails,
    };
  }
}

/**
 * Add a test card to a merchant's Stripe customer account
 * This calls the GraphQL mutation that adds a Visa test card
 */
export async function addTestCard(
  merchantId: string,
  cookies: string
): Promise<{ success: boolean; card?: { id: string; last4: string; brand: string }; message: string }> {
  try {
    console.log(`[Test Card] Adding test card for merchant: ${merchantId}`);

    const result = await gqlDirect<{
      add_test_card: {
        success: boolean;
        message: string;
        card?: {
          id: string;
          last4: string;
          brand: string;
          exp_month: number;
          exp_year: number;
        };
      };
    }>(
      `mutation AddTestCard($merchantId: ID!) {
        add_test_card(merchantId: $merchantId) {
          success
          message
          card {
            id
            last4
            brand
            exp_month
            exp_year
          }
        }
      }`,
      { merchantId },
      cookies
    );

    const response = result.add_test_card;
    console.log(`[Test Card] ${response.success ? '✓' : '✗'} ${response.message}`);
    if (response.card) {
      console.log(`[Test Card] Card added: ${response.card.brand} ****${response.card.last4}`);
    }

    return {
      success: response.success,
      card: response.card,
      message: response.message,
    };
  } catch (error: any) {
    const errorDetails = error.response?.data?.errors
      ? JSON.stringify(error.response.data.errors)
      : error.response?.data?.error
        ? error.response.data.error
        : error.message;

    console.error('[Test Card] Failed:', errorDetails);
    return {
      success: false,
      message: errorDetails,
    };
  }
}

/**
 * Create a test cleanup report
 */
export function generateCleanupReport(workerId: number = 0): string {
  const merchants = Array.from(getWorkerEntities(workerId).merchants);
  const users = Array.from(getWorkerEntities(workerId).users);

  let report = '\n========== TEST CLEANUP REPORT ==========\n';

  if (merchants.length > 0) {
    report += '\nMerchants to cleanup:\n';
    merchants.forEach((m) => {
      report += `  - Slug: ${m.slug}, ID: ${m.id}, Name: ${m.name}\n`;
    });
  }

  if (users.length > 0) {
    report += '\nUsers to cleanup:\n';
    users.forEach((u) => {
      report += `  - Email: ${u.email}, ID: ${u.id}\n`;
    });
  }

  if (merchants.length === 0 && users.length === 0) {
    report += '\nNo test entities registered for cleanup.\n';
  }

  report += '\n=========================================\n';

  return report;
}

/**
 * Query test entities from database
 * Useful for verifying cleanup
 */
export async function queryTestEntities(auth: string) {
  try {
    // Query merchants with TEST prefix
    const { vendors } = await gql<{ vendors: any[] }>(
      `query GetTestVendors {
        vendors: me {
          vendors {
            id
            slug
            name
          }
        }
      }`,
      {},
      auth
    );

    const testMerchants = vendors.filter((v) => v.slug?.startsWith('TEST-') || v.slug?.startsWith('test-'));

    return {
      merchants: testMerchants,
    };
  } catch (error) {
    console.error('Failed to query test entities:', error);
    return {
      merchants: [],
    };
  }
}

/**
 * Export alias for gqlDirect as executeGraphQL for clearer naming in tests
 */
export { gqlDirect as executeGraphQL };

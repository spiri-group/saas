/**
 * Cleanup Script: Purge ALL test merchants and users from database
 *
 * Run with: npx ts-node tests/scripts/cleanup-all-test-data.ts
 * Or: yarn ts-node tests/scripts/cleanup-all-test-data.ts
 */

import axios from 'axios';

const GRAPHQL_ENDPOINT = process.env.GRAPHQL_ENDPOINT || 'http://localhost:7071/api/graphql';

async function gqlDirect<T>(query: string, variables?: Record<string, any>): Promise<T> {
  const response = await axios.post(
    GRAPHQL_ENDPOINT,
    { query, variables },
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (response.data.errors) {
    console.error('GraphQL errors:', response.data.errors);
    throw new Error(`GraphQL errors: ${JSON.stringify(response.data.errors)}`);
  }

  return response.data.data as T;
}

async function findTestMerchants(): Promise<Array<{ id: string; slug: string; name: string }>> {
  // Query to find all merchants with test slugs
  const result = await gqlDirect<{
    vendors: Array<{ id: string; slug: string; name: string }>;
  }>(`
    query FindTestMerchants {
      vendors(search: "test-merchant") {
        id
        slug
        name
      }
    }
  `);

  return result.vendors || [];
}

async function findTestUsers(): Promise<Array<{ id: string; email: string }>> {
  // This would require a custom query - for now we'll rely on purging merchants
  // which should cascade to related data
  console.log('Note: User cleanup requires direct database access or custom query');
  return [];
}

async function purgeMerchant(merchantId: string, merchantSlug: string): Promise<boolean> {
  try {
    const result = await gqlDirect<{
      purge_vendor: { code: string; success: boolean; message: string };
    }>(`
      mutation PurgeMerchant($merchantId: ID!) {
        purge_vendor(merchantId: $merchantId) {
          code
          success
          message
        }
      }
    `, { merchantId });

    if (result.purge_vendor?.success) {
      console.log(`  ✓ Purged merchant: ${merchantSlug} (${merchantId})`);
      return true;
    } else {
      console.log(`  ✗ Failed to purge ${merchantSlug}: ${result.purge_vendor?.message}`);
      return false;
    }
  } catch (error: any) {
    console.log(`  ✗ Error purging ${merchantSlug}: ${error.message}`);
    return false;
  }
}

async function purgeUser(userId: string, email: string): Promise<boolean> {
  try {
    const result = await gqlDirect<{
      purge_user: { code: string; success: boolean; message: string };
    }>(`
      mutation PurgeUser($userId: ID!) {
        purge_user(userId: $userId) {
          code
          success
          message
        }
      }
    `, { userId });

    if (result.purge_user?.success) {
      console.log(`  ✓ Purged user: ${email} (${userId})`);
      return true;
    } else {
      console.log(`  ✗ Failed to purge user ${email}: ${result.purge_user?.message}`);
      return false;
    }
  } catch (error: any) {
    console.log(`  ✗ Error purging user ${email}: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Test Data Cleanup Script');
  console.log('='.repeat(60));
  console.log(`GraphQL Endpoint: ${GRAPHQL_ENDPOINT}`);
  console.log('');

  // Find test merchants
  console.log('Finding test merchants...');
  let testMerchants: Array<{ id: string; slug: string; name: string }> = [];

  try {
    testMerchants = await findTestMerchants();
  } catch (error: any) {
    console.error('Error finding merchants:', error.message);
    console.log('Will try alternative approach...');
  }

  // Filter to only test merchants (slug starts with test-merchant- or contains playwright)
  const merchantsToDelete = testMerchants.filter(m =>
    m.slug?.startsWith('test-merchant-') ||
    m.slug?.includes('playwright') ||
    m.name?.includes('Test') ||
    m.slug?.startsWith('product-test-')
  );

  console.log(`Found ${merchantsToDelete.length} test merchants to purge`);
  console.log('');

  if (merchantsToDelete.length > 0) {
    console.log('Purging merchants...');
    let purged = 0;
    let failed = 0;

    for (const merchant of merchantsToDelete) {
      const success = await purgeMerchant(merchant.id, merchant.slug);
      if (success) purged++;
      else failed++;
    }

    console.log('');
    console.log(`Merchants purged: ${purged}, Failed: ${failed}`);
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('Cleanup complete!');
  console.log('='.repeat(60));
}

main().catch(console.error);

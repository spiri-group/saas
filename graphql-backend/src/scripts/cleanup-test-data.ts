/**
 * Cleanup Script: Purge ALL test merchants and users from Cosmos DB
 *
 * Run from graphql-backend folder:
 *   npx ts-node src/scripts/cleanup-test-data.ts
 */

import { CosmosClient } from "@azure/cosmos";
import * as dotenv from "dotenv";

// Load .env.local
dotenv.config({ path: '.env.local' });

// Get connection string from environment
const COSMOS_CONNECTION_STRING = process.env.COSMOS_CONNECTION_STRING;

if (!COSMOS_CONNECTION_STRING) {
  console.error('Error: COSMOS_CONNECTION_STRING not found in .env.local');
  process.exit(1);
}

function getCosmosClient(): CosmosClient {
  return new CosmosClient(COSMOS_CONNECTION_STRING!);
}

async function findTestVendors(client: CosmosClient): Promise<Array<{ id: string; slug: string; name: string }>> {
  const database = client.database("Core");
  const container = database.container("Main-Vendors");

  // Find all vendors with test slugs
  const querySpec = {
    query: `
      SELECT c.id, c.slug, c.name
      FROM c
      WHERE STARTSWITH(c.slug, "test-merchant-")
         OR STARTSWITH(c.slug, "product-test-")
         OR CONTAINS(c.slug, "playwright")
    `
  };

  const { resources } = await container.items.query(querySpec).fetchAll();
  return resources;
}

async function findTestUsers(client: CosmosClient): Promise<Array<{ id: string; email: string }>> {
  const database = client.database("Core");
  const container = database.container("Main-User");

  // Find all users with playwright test emails
  const querySpec = {
    query: `
      SELECT c.id, c.email
      FROM c
      WHERE CONTAINS(c.email, "@playwright.com")
         OR CONTAINS(c.email, "test-merchant")
    `
  };

  const { resources } = await container.items.query(querySpec).fetchAll();
  return resources;
}

async function purgeVendor(client: CosmosClient, vendorId: string, vendorSlug: string): Promise<boolean> {
  try {
    const database = client.database("Core");
    const container = database.container("Main-Vendors");

    // Vendor partition key is the vendor id itself
    await container.item(vendorId, vendorId).delete();
    console.log(`  ✓ Purged vendor: ${vendorSlug} (${vendorId})`);
    return true;
  } catch (error: any) {
    if (error.code === 404) {
      console.log(`  - Vendor already deleted: ${vendorSlug}`);
      return true;
    }
    console.log(`  ✗ Error purging vendor ${vendorSlug}: ${error.message}`);
    return false;
  }
}

async function purgeUser(client: CosmosClient, userId: string, email: string): Promise<boolean> {
  try {
    const database = client.database("Core");
    const container = database.container("Main-User");

    // User partition key is the user id
    await container.item(userId, userId).delete();
    console.log(`  ✓ Purged user: ${email} (${userId})`);
    return true;
  } catch (error: any) {
    if (error.code === 404) {
      console.log(`  - User already deleted: ${email}`);
      return true;
    }
    console.log(`  ✗ Error purging user ${email}: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Test Data Cleanup Script - Direct Cosmos DB');
  console.log('='.repeat(60));
  console.log('Using connection string from .env.local');
  console.log('');

  const client = getCosmosClient();

  // Find and purge test vendors
  console.log('Finding test vendors...');
  const testVendors = await findTestVendors(client);
  console.log(`Found ${testVendors.length} test vendors`);
  console.log('');

  if (testVendors.length > 0) {
    console.log('Purging vendors...');
    let purgedVendors = 0;
    let failedVendors = 0;

    for (const vendor of testVendors) {
      const success = await purgeVendor(client, vendor.id, vendor.slug || vendor.name);
      if (success) purgedVendors++;
      else failedVendors++;
    }

    console.log('');
    console.log(`Vendors purged: ${purgedVendors}, Failed: ${failedVendors}`);
  }

  console.log('');

  // Find and purge test users
  console.log('Finding test users...');
  const testUsers = await findTestUsers(client);
  console.log(`Found ${testUsers.length} test users`);
  console.log('');

  if (testUsers.length > 0) {
    console.log('Purging users...');
    let purgedUsers = 0;
    let failedUsers = 0;

    for (const user of testUsers) {
      const success = await purgeUser(client, user.id, user.email);
      if (success) purgedUsers++;
      else failedUsers++;
    }

    console.log('');
    console.log(`Users purged: ${purgedUsers}, Failed: ${failedUsers}`);
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('Cleanup complete!');
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

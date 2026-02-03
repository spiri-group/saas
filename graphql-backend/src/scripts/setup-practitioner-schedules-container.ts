/**
 * Setup Script: Create Main-PractitionerSchedules container in Cosmos DB
 *
 * Run from graphql-backend folder:
 *   npx ts-node src/scripts/setup-practitioner-schedules-container.ts
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

console.log('Connection string found, length:', COSMOS_CONNECTION_STRING.length);

async function main() {
  console.log('='.repeat(60));
  console.log('Setup Script: Main-PractitionerSchedules Container');
  console.log('='.repeat(60));
  console.log('');

  console.log('Creating Cosmos client...');
  const client = new CosmosClient(COSMOS_CONNECTION_STRING!);

  console.log('Getting database reference...');
  const database = client.database("Core");

  const containerName = "Main-PractitionerSchedules";
  const partitionKeyPath = "/practitionerId";

  // First, list existing containers to verify connection
  console.log('Listing existing containers...');
  try {
    const { resources: containers } = await database.containers.readAll().fetchAll();
    console.log(`Found ${containers.length} containers:`);
    containers.forEach(c => console.log(`  - ${c.id}`));
  } catch (listError: any) {
    console.error('Failed to list containers:', listError.message);
  }

  console.log(`Creating container "${containerName}" with partition key "${partitionKeyPath}"...`);

  try {
    const { container, statusCode } = await database.containers.createIfNotExists({
      id: containerName,
      partitionKey: { paths: [partitionKeyPath] }
    });

    console.log(`Response status code: ${statusCode}`);
    console.log(`✓ Container "${containerName}" is ready`);

    // Verify the container
    const { resource } = await container.read();
    console.log(`  - Partition Key: ${JSON.stringify(resource?.partitionKey)}`);

  } catch (error: any) {
    console.error(`✗ Error creating container:`);
    console.error(`  Message: ${error.message}`);
    console.error(`  Code: ${error.code}`);
    console.error(`  Stack: ${error.stack}`);
    throw error;
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('Setup complete!');
  console.log('='.repeat(60));
}

// Set a timeout for the whole script
const timeoutId = setTimeout(() => {
  console.error('Script timed out after 60 seconds');
  process.exit(1);
}, 60000);

main()
  .then(() => {
    clearTimeout(timeoutId);
    process.exit(0);
  })
  .catch(err => {
    clearTimeout(timeoutId);
    console.error('Fatal error:', err);
    process.exit(1);
  });

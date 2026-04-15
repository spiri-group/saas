/**
 * Cosmos DB Migration Script: Provisioned -> Serverless
 *
 * Copies all data from the old provisioned Cosmos account to the new serverless account.
 * Both accounts must exist and the new one must already have containers created (via Bicep deploy).
 *
 * Usage:
 *   export AZURE_CONFIG_DIR="E:/SpiriGroup/SpiriVerse/.azure"
 *   npx ts-node src/scripts/migrate-cosmos-serverless.ts <old-endpoint> <new-endpoint>
 *
 * Example (dev):
 *   npx ts-node src/scripts/migrate-cosmos-serverless.ts \
 *     https://cosmos-spiriverse-server-dev-002.documents.azure.com:443/ \
 *     https://cosmos-spiriverse-srvless-dev-002.documents.azure.com:443/
 *
 * Example (prod):
 *   npx ts-node src/scripts/migrate-cosmos-serverless.ts \
 *     https://cosmos-spiriverse-server-prd-002.documents.azure.com:443/ \
 *     https://cosmos-spiriverse-srvless-prd-002.documents.azure.com:443/
 */

import { CosmosClient, Container } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";

const DATABASE_NAME = "Core";
const BATCH_SIZE = 100;

async function getContainerNames(client: CosmosClient): Promise<string[]> {
  const { resources } = await client.database(DATABASE_NAME).containers.readAll().fetchAll();
  return resources.map(c => c.id);
}

async function copyContainer(
  sourceContainer: Container,
  targetContainer: Container,
  containerName: string
): Promise<{ copied: number; skipped: number; failed: number }> {
  const stats = { copied: 0, skipped: 0, failed: 0 };

  // Read all documents from source
  const { resources: documents } = await sourceContainer.items
    .query("SELECT * FROM c")
    .fetchAll();

  if (documents.length === 0) {
    console.log(`  ${containerName}: empty, skipping`);
    return stats;
  }

  console.log(`  ${containerName}: ${documents.length} documents to copy`);

  // Upsert in batches
  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const batch = documents.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(doc => targetContainer.items.upsert(doc))
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        stats.copied++;
      } else {
        stats.failed++;
        console.error(`    Failed to copy document: ${result.reason?.message || result.reason}`);
      }
    }

    // Progress indicator for large containers
    if (documents.length > BATCH_SIZE) {
      const progress = Math.min(i + BATCH_SIZE, documents.length);
      process.stdout.write(`    ${progress}/${documents.length}\r`);
    }
  }

  if (documents.length > BATCH_SIZE) {
    process.stdout.write("\n");
  }

  return stats;
}

async function migrate() {
  const [oldEndpoint, newEndpoint] = process.argv.slice(2);

  if (!oldEndpoint || !newEndpoint) {
    console.error("Usage: npx ts-node src/scripts/migrate-cosmos-serverless.ts <old-endpoint> <new-endpoint>");
    console.error("");
    console.error("Example (dev):");
    console.error("  npx ts-node src/scripts/migrate-cosmos-serverless.ts \\");
    console.error("    https://cosmos-spiriverse-server-dev-002.documents.azure.com:443/ \\");
    console.error("    https://cosmos-spiriverse-srvless-dev-002.documents.azure.com:443/");
    process.exit(1);
  }

  console.log("Cosmos DB Migration: Provisioned -> Serverless");
  console.log("==============================================");
  console.log(`Source: ${oldEndpoint}`);
  console.log(`Target: ${newEndpoint}`);
  console.log("");

  const credential = new DefaultAzureCredential();

  const sourceClient = new CosmosClient({ endpoint: oldEndpoint, aadCredentials: credential });
  const targetClient = new CosmosClient({ endpoint: newEndpoint, aadCredentials: credential });

  // Verify both databases exist
  try {
    await sourceClient.database(DATABASE_NAME).read();
    console.log(`Source database '${DATABASE_NAME}' found`);
  } catch {
    console.error(`Source database '${DATABASE_NAME}' not found at ${oldEndpoint}`);
    process.exit(1);
  }

  try {
    await targetClient.database(DATABASE_NAME).read();
    console.log(`Target database '${DATABASE_NAME}' found`);
  } catch {
    console.error(`Target database '${DATABASE_NAME}' not found at ${newEndpoint}`);
    console.error("Deploy the Bicep first to create the serverless account and containers.");
    process.exit(1);
  }

  const sourceContainers = await getContainerNames(sourceClient);
  const targetContainers = await getContainerNames(targetClient);

  console.log(`\nSource containers: ${sourceContainers.length}`);
  console.log(`Target containers: ${targetContainers.length}`);

  // Check for containers in source but not in target
  const missing = sourceContainers.filter(c => !targetContainers.includes(c));
  if (missing.length > 0) {
    console.warn(`\nWarning: these containers exist in source but not target (will be skipped):`);
    missing.forEach(c => console.warn(`  - ${c}`));
  }

  const containersToMigrate = sourceContainers.filter(c => targetContainers.includes(c));
  console.log(`\nMigrating ${containersToMigrate.length} containers...\n`);

  let totalCopied = 0;
  let totalFailed = 0;

  for (const containerName of containersToMigrate) {
    const source = sourceClient.database(DATABASE_NAME).container(containerName);
    const target = targetClient.database(DATABASE_NAME).container(containerName);

    const stats = await copyContainer(source, target, containerName);
    totalCopied += stats.copied;
    totalFailed += stats.failed;
  }

  console.log("\n==============================================");
  console.log(`Migration complete: ${totalCopied} documents copied, ${totalFailed} failed`);

  if (totalFailed > 0) {
    console.error("\nSome documents failed to copy. Review the errors above and re-run if needed.");
    process.exit(1);
  }

  console.log("\nNext steps:");
  console.log("  1. Restart the Function App to pick up the new Cosmos endpoint from Key Vault");
  console.log("  2. Verify the app is working correctly");
  console.log("  3. Keep the old account for 2 weeks as a safety net, then delete it");
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});

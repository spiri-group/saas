/**
 * Crystal Reference Database Seed Script
 *
 * Run with: npx ts-node src/scripts/seed-crystals.ts
 *
 * This script populates the System-SettingTrees container with crystal reference data.
 */

import { CosmosDataSource } from "../utils/database";
import { RecordStatus } from "../graphql/0_shared/types";
import { LogManager } from "../utils/functions";
import { vault } from "../services/vault";
import NodeCache from "node-cache";
import crystalSeedData from "../graphql/crystal-reference/seed-data";
import { CRYSTAL_REFERENCE_CONFIG_ID, CRYSTAL_REFERENCE_CONTAINER, crystal_reference_type } from "../graphql/crystal-reference/types";

const myCache = new NodeCache();

async function seedCrystals() {
  console.log("🔮 Starting Crystal Reference Database Seed...\n");

  const host = "https://localhost";
  const logger = new LogManager();
  const keyVault = new vault(host, logger, myCache);
  const cosmos = new CosmosDataSource(logger, keyVault);

  await cosmos.init(host);

  const now = new Date().toISOString();
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  console.log(`Found ${crystalSeedData.length} crystals to import\n`);

  for (const input of crystalSeedData) {
    try {
      const id = input.id || input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

      // Check if crystal already exists
      try {
        const existing = await cosmos.get_record(
          CRYSTAL_REFERENCE_CONTAINER,
          id,
          CRYSTAL_REFERENCE_CONFIG_ID
        );
        if (existing) {
          console.log(`⏭️  Skipped: ${input.name} (already exists)`);
          skipped++;
          continue;
        }
      } catch {
        // Crystal doesn't exist, we can create it
      }

      const crystal: crystal_reference_type = {
        id,
        configId: CRYSTAL_REFERENCE_CONFIG_ID,
        docType: "crystal",
        name: input.name,
        alternateNames: input.alternateNames || [],
        description: input.description,
        colors: input.colors,
        crystalSystem: input.crystalSystem,
        mohsHardness: input.mohsHardness,
        commonForms: input.commonForms,
        chakras: input.chakras,
        elements: input.elements,
        zodiacSigns: input.zodiacSigns,
        planetaryAssociation: input.planetaryAssociation,
        numerology: input.numerology,
        primaryProperties: input.primaryProperties,
        emotionalUses: input.emotionalUses || [],
        spiritualUses: input.spiritualUses || [],
        physicalAssociations: input.physicalAssociations || [],
        cleansingMethods: input.cleansingMethods,
        chargingMethods: input.chargingMethods,
        avoidMethods: input.avoidMethods || [],
        careNotes: input.careNotes,
        localities: input.localities,
        thumbnail: input.thumbnail,
        status: RecordStatus.ACTIVE,
        createdAt: now,
        updatedAt: now,
      };

      await cosmos.add_record(
        CRYSTAL_REFERENCE_CONTAINER,
        crystal,
        CRYSTAL_REFERENCE_CONFIG_ID,
        "SYSTEM"
      );

      console.log(`✅ Imported: ${input.name}`);
      imported++;
    } catch (error) {
      console.error(`❌ Failed: ${input.name} - ${error}`);
      failed++;
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("🔮 Crystal Seed Complete!");
  console.log("=".repeat(50));
  console.log(`✅ Imported: ${imported}`);
  console.log(`⏭️  Skipped:  ${skipped}`);
  console.log(`❌ Failed:   ${failed}`);
  console.log(`📊 Total:    ${crystalSeedData.length}`);
  console.log("=".repeat(50) + "\n");
}

// Run the seed
seedCrystals()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });

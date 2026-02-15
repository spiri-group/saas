/**
 * Migration: 033_add_astrology_reading_fees
 *
 * Adds astrology reading fee entries to the fee config documents:
 *   - reading-astro-snapshot:  basePrice = 800   ($8.00),  20% platform fee
 *   - reading-astro-focus:     basePrice = 1500  ($15.00), 20% platform fee
 *   - reading-astro-deep-dive: basePrice = 2500  ($25.00), 20% platform fee
 *
 * Updates all per-market documents and the legacy `spiriverse` document.
 * Only adds new keys if they don't already exist.
 */

import { Migration } from "../types";

const ASTROLOGY_FEES: Record<string, { basePrice: number; percent: number; fixed: number }> = {
    "reading-astro-snapshot": { basePrice: 800, percent: 20, fixed: 0 },
    "reading-astro-focus": { basePrice: 1500, percent: 20, fixed: 0 },
    "reading-astro-deep-dive": { basePrice: 2500, percent: 20, fixed: 0 },
};

const FEE_CONFIG_IDS = ["spiriverse", "spiriverse-AU", "spiriverse-UK", "spiriverse-US"];

export const migration: Migration = {
    id: "033_add_astrology_reading_fees",
    description: "Adds astrology reading fee entries (snapshot, focus, deep-dive) to fee config",

    async up(context) {
        for (const docId of FEE_CONFIG_IDS) {
            const results = await context.runQuery<any>(
                "System-Settings",
                "SELECT * FROM c WHERE c.id = @id AND c.docType = @docType",
                [
                    { name: "@id", value: docId },
                    { name: "@docType", value: "fees-config" },
                ]
            );

            if (results.length === 0) {
                context.log(`${docId} not found – skipping`);
                continue;
            }

            const doc = results[0];
            let changed = false;

            // Determine the currency from existing reading fees or fallback
            const existingReading = doc["reading-single"];
            const currency = existingReading?.currency || doc["service-booking"]?.currency || "AUD";

            for (const [feeKey, feeData] of Object.entries(ASTROLOGY_FEES)) {
                if (doc[feeKey]) {
                    context.log(`  ${docId}: "${feeKey}" already exists – skipping`);
                } else {
                    doc[feeKey] = {
                        basePrice: feeData.basePrice,
                        percent: feeData.percent,
                        fixed: feeData.fixed,
                        currency,
                    };
                    changed = true;
                    context.log(`  ${docId}: Added "${feeKey}" → basePrice=${feeData.basePrice}, ${feeData.percent}%`);
                }
            }

            if (!changed) {
                context.log(`${docId}: No changes needed`);
                continue;
            }

            await context.seedData({
                container: "System-Settings",
                partitionKeyField: "docType",
                records: [doc],
                upsert: true,
            });

            context.log(`${docId}: Updated successfully`);
        }
    },
};

/**
 * Migration: 031_add_reading_base_prices
 *
 * Adds `basePrice` field to reading fee entries so reading prices
 * are configurable from the fee manager instead of being hardcoded.
 *
 * - reading-single:     basePrice = 500  ($5.00)
 * - reading-three-card: basePrice = 1200 ($12.00)
 * - reading-five-card:  basePrice = 2000 ($20.00)
 *
 * Updates all per-market documents and the legacy `spiriverse` document.
 */

import { Migration } from "../types";

const READING_PRICES: Record<string, number> = {
    "reading-single": 500,
    "reading-three-card": 1200,
    "reading-five-card": 2000,
};

const FEE_CONFIG_IDS = ["spiriverse", "spiriverse-AU", "spiriverse-UK", "spiriverse-US"];

export const migration: Migration = {
    id: "031_add_reading_base_prices",
    description: "Adds basePrice to reading fee entries for configurable reading pricing",

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

            for (const [feeKey, basePrice] of Object.entries(READING_PRICES)) {
                if (doc[feeKey]) {
                    if (doc[feeKey].basePrice !== undefined) {
                        context.log(`  ${docId}: "${feeKey}" already has basePrice – skipping`);
                    } else {
                        doc[feeKey].basePrice = basePrice;
                        changed = true;
                        context.log(`  ${docId}: Added basePrice=${basePrice} to "${feeKey}"`);
                    }
                } else {
                    context.log(`  ${docId}: "${feeKey}" not found – skipping`);
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

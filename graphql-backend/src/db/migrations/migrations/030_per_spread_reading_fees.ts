/**
 * Migration: 030_per_spread_reading_fees
 *
 * Replaces the single `reading-request` fee key with per-spread-type keys:
 *   - reading-single     → 20% (Single Card readings)
 *   - reading-three-card → 20% (Three Card readings)
 *   - reading-five-card  → 20% (Five Card readings)
 *
 * Updates all per-market documents (spiriverse-AU, spiriverse-UK, spiriverse-US)
 * and the legacy `spiriverse` document.
 *
 * Only adds new keys if they don't already exist (merge pattern from 013).
 * Removes the old `reading-request` key from each document.
 */

import { Migration } from "../types";

const NEW_FEE_KEYS = ["reading-single", "reading-three-card", "reading-five-card"];

const FEE_CONFIG_IDS = ["spiriverse", "spiriverse-AU", "spiriverse-UK", "spiriverse-US"];

export const migration: Migration = {
    id: "030_per_spread_reading_fees",
    description: "Replaces reading-request fee with per-spread reading fees (single, three-card, five-card)",

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

            // Determine the currency from the old reading-request entry or fallback
            const oldEntry = doc["reading-request"];
            const currency = oldEntry?.currency || doc["service-booking"]?.currency || "AUD";
            const percent = oldEntry?.percent ?? 20;
            const fixed = oldEntry?.fixed ?? 0;

            // Add new per-spread fee keys (only if they don't already exist)
            for (const key of NEW_FEE_KEYS) {
                if (doc[key]) {
                    context.log(`  ${docId}: "${key}" already exists – skipping`);
                } else {
                    doc[key] = { percent, fixed, currency };
                    changed = true;
                    context.log(`  ${docId}: Added "${key}" → ${JSON.stringify(doc[key])}`);
                }
            }

            // Remove old reading-request key
            if (doc["reading-request"]) {
                delete doc["reading-request"];
                changed = true;
                context.log(`  ${docId}: Removed "reading-request"`);
            }

            if (!changed) {
                context.log(`${docId}: No changes needed`);
                continue;
            }

            // Upsert the updated document
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

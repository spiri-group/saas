/**
 * Migration: 013_seed_platform_fees
 *
 * Seeds the fee config document in System-Settings with platform fee entries
 * that were previously hardcoded in various resolvers/managers.
 *
 * New fee entries (only added if they don't already exist):
 *   - product-purchase-0:   5%  (items under $50, was hardcoded in utils/functions.ts)
 *   - product-purchase-50:  3.5% (items $50-$499, was hardcoded in utils/functions.ts)
 *   - product-purchase-500: 2%  (items $500+, was hardcoded in utils/functions.ts)
 *   - service-booking:      10% (was hardcoded in service/index.ts)
 *   - tour-booking:         8%  (experience coordination fee)
 *   - reading-request:      20% (was hardcoded in reading-request/manager.ts)
 *   - case-activity:        15% (investigation coordination fee)
 *   - platform-listing:     $1.00 flat (was hardcoded in 0_shared/index.ts)
 *   - platform-processing:  1%  (was hardcoded in 0_shared/index.ts)
 *
 * Percent is stored as a raw number (5 = 5%), matching the existing
 * getProductFeeRate / getTargetFeeConfig pattern which divides by 100.
 */

import { Migration } from "../types";

const FEE_ENTRIES: Record<string, { percent: number; fixed: number; currency: string }> = {
    "product-purchase-0":   { percent: 5,    fixed: 0,   currency: "AUD" }, // Items under $50
    "product-purchase-50":  { percent: 3.5,  fixed: 0,   currency: "AUD" }, // Items $50–$499
    "product-purchase-500": { percent: 2,    fixed: 0,   currency: "AUD" }, // Items $500+
    "service-booking":      { percent: 10,   fixed: 0,   currency: "AUD" },
    "tour-booking":         { percent: 8,    fixed: 0,   currency: "AUD" },
    "reading-request":      { percent: 20,   fixed: 0,   currency: "AUD" },
    "case-activity":        { percent: 15,   fixed: 0,   currency: "AUD" },
    "platform-listing":     { percent: 0,    fixed: 100, currency: "AUD" }, // $1.00 flat (100 cents)
    "platform-processing":  { percent: 1,    fixed: 0,   currency: "AUD" },
};

export const migration: Migration = {
    id: "013_seed_platform_fees",
    description: "Seeds platform fee entries into the spiriverse fee config document",

    async up(context) {
        // 1. Read the existing fee config document
        const results = await context.runQuery<any>(
            "System-Settings",
            "SELECT * FROM c WHERE c.id = @id AND c.docType = @docType",
            [
                { name: "@id", value: "spiriverse" },
                { name: "@docType", value: "fees-config" },
            ]
        );

        if (results.length === 0) {
            context.log("Fee config document not found – creating with all entries");
            await context.seedData({
                container: "System-Settings",
                partitionKeyField: "docType",
                records: [
                    {
                        id: "spiriverse",
                        docType: "fees-config",
                        ...FEE_ENTRIES,
                    },
                ],
                upsert: false,
            });
            return;
        }

        // 2. Merge new entries only if they don't already exist
        const existing = results[0];
        let added = 0;

        for (const [key, value] of Object.entries(FEE_ENTRIES)) {
            if (existing[key]) {
                context.log(`  "${key}" already exists – skipping`);
            } else {
                existing[key] = value;
                added++;
                context.log(`  Added "${key}": ${JSON.stringify(value)}`);
            }
        }

        if (added === 0) {
            context.log("All fee entries already exist – nothing to do");
            return;
        }

        // 3. Upsert the merged document back
        context.log(`Upserting fee config with ${added} new entries`);
        await context.seedData({
            container: "System-Settings",
            partitionKeyField: "docType",
            records: [existing],
            upsert: true,
        });
    },
};

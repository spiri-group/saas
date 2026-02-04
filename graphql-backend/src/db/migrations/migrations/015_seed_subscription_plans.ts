/**
 * Migration: 015_seed_subscription_plans
 *
 * Seeds subscription plan pricing into the System-Settings/spiriverse fee config
 * document so that plan prices can be managed via the Fee Manager UI.
 *
 * New fee entries (only added if they don't already exist):
 *   - subscription-spiriverse-core:    $15/mo (1500 cents)
 *   - subscription-spiriassts:         $10/mo (1000 cents)
 *   - subscription-tours-premium:      $10/mo (1000 cents)
 *   - subscription-shopkeeper-premium: $15/mo (1500 cents)
 *   - subscription-pro:                $10/mo (1000 cents)
 *
 * These use the same { percent, fixed, currency } structure as other fees.
 * percent=0, fixed=price in cents. The billing processor reads these values
 * so that price changes in the Fee Manager apply on the next billing cycle.
 */

import { Migration } from "../types";

const SUBSCRIPTION_ENTRIES: Record<string, { percent: number; fixed: number; currency: string }> = {
    "subscription-spiriverse-core":    { percent: 0, fixed: 1500, currency: "AUD" }, // $15/mo
    "subscription-spiriassts":         { percent: 0, fixed: 1000, currency: "AUD" }, // $10/mo
    "subscription-tours-premium":      { percent: 0, fixed: 1000, currency: "AUD" }, // $10/mo
    "subscription-shopkeeper-premium": { percent: 0, fixed: 1500, currency: "AUD" }, // $15/mo
    "subscription-pro":                { percent: 0, fixed: 1000, currency: "AUD" }, // $10/mo
};

export const migration: Migration = {
    id: "015_seed_subscription_plans",
    description: "Seeds subscription plan pricing into the spiriverse fee config document",

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
            context.log("Fee config document not found – creating with subscription entries");
            await context.seedData({
                container: "System-Settings",
                partitionKeyField: "docType",
                records: [
                    {
                        id: "spiriverse",
                        docType: "fees-config",
                        ...SUBSCRIPTION_ENTRIES,
                    },
                ],
                upsert: false,
            });
            return;
        }

        // 2. Merge new entries only if they don't already exist
        const existing = results[0];
        let added = 0;

        for (const [key, value] of Object.entries(SUBSCRIPTION_ENTRIES)) {
            if (existing[key]) {
                context.log(`  "${key}" already exists – skipping`);
            } else {
                existing[key] = value;
                added++;
                context.log(`  Added "${key}": ${JSON.stringify(value)}`);
            }
        }

        if (added === 0) {
            context.log("All subscription plan entries already exist – nothing to do");
            return;
        }

        // 3. Upsert the merged document back
        context.log(`Upserting fee config with ${added} new subscription entries`);
        await context.seedData({
            container: "System-Settings",
            partitionKeyField: "docType",
            records: [existing],
            upsert: true,
        });
    },
};

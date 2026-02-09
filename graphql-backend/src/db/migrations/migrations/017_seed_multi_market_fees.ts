/**
 * Migration: 017_seed_multi_market_fees
 *
 * Creates per-market fee config documents in System-Settings:
 *   - spiriverse-AU (AUD) — copy of existing spiriverse document
 *   - spiriverse-UK (GBP) — same rates, currency swapped to GBP
 *   - spiriverse-US (USD) — same rates, currency swapped to USD
 *
 * The original `spiriverse` document is left intact for backward compatibility
 * until payment resolvers are updated to consume the per-market documents.
 */

import { Migration } from "../types";

const MARKETS: { suffix: string; currency: string }[] = [
    { suffix: "AU", currency: "AUD" },
    { suffix: "UK", currency: "GBP" },
    { suffix: "US", currency: "USD" },
];

export const migration: Migration = {
    id: "017_seed_multi_market_fees",
    description: "Seeds per-market fee config documents (AU/UK/US) from existing spiriverse fees",

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
            context.log("No existing spiriverse fee config found – nothing to seed from");
            return;
        }

        const sourceDoc = results[0];
        context.log(`Found source fee config with keys: ${Object.keys(sourceDoc).filter(k => !k.startsWith("_") && k !== "id" && k !== "docType" && k !== "status").join(", ")}`);

        // 2. Extract fee entries (exclude Cosmos metadata and system fields)
        const feeEntries: Record<string, { percent: number; fixed: number; currency: string }> = {};
        for (const [key, value] of Object.entries(sourceDoc)) {
            if (
                key !== "id" &&
                key !== "docType" &&
                key !== "status" &&
                !key.startsWith("_") &&
                typeof value === "object" &&
                value !== null &&
                "percent" in value &&
                "currency" in value
            ) {
                feeEntries[key] = value as { percent: number; fixed: number; currency: string };
            }
        }

        // 3. Create per-market documents
        for (const market of MARKETS) {
            const docId = `spiriverse-${market.suffix}`;

            // Check if already exists
            const existing = await context.runQuery<any>(
                "System-Settings",
                "SELECT * FROM c WHERE c.id = @id AND c.docType = @docType",
                [
                    { name: "@id", value: docId },
                    { name: "@docType", value: "fees-config" },
                ]
            );

            if (existing.length > 0) {
                context.log(`${docId} already exists – skipping`);
                continue;
            }

            // Clone fee entries with the market's currency
            const marketFees: Record<string, { percent: number; fixed: number; currency: string }> = {};
            for (const [key, value] of Object.entries(feeEntries)) {
                marketFees[key] = {
                    percent: value.percent,
                    fixed: value.fixed,
                    currency: market.currency,
                };
            }

            await context.seedData({
                container: "System-Settings",
                partitionKeyField: "docType",
                records: [
                    {
                        id: docId,
                        docType: "fees-config",
                        ...marketFees,
                    },
                ],
                upsert: true,
            });

            context.log(`Created ${docId} with ${Object.keys(marketFees).length} fee entries (${market.currency})`);
        }

        context.log("Original spiriverse document left intact for backward compatibility");
    },
};

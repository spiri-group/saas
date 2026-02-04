/**
 * Migration: 014_fix_platform_fee_rates
 *
 * Fixes fee entries that were seeded with 0% (product-purchase tiers)
 * and adds missing entries (case-activity, tour-booking rate update).
 *
 * Updates applied unconditionally (overwrite existing values):
 *   - product-purchase-0:   0% → 5%   (items under $50)
 *   - product-purchase-50:  0% → 3.5% (items $50–$499)
 *   - product-purchase-500: 0% → 2%   (items $500+)
 *   - tour-booking:         5% → 8%   (experience coordination)
 *
 * Added if missing:
 *   - case-activity:        15% (investigation coordination)
 */

import { Migration } from "../types";

const FORCE_UPDATE_ENTRIES: Record<string, { percent: number; fixed: number; currency: string }> = {
    "product-purchase-0":   { percent: 5,   fixed: 0, currency: "AUD" },
    "product-purchase-50":  { percent: 3.5, fixed: 0, currency: "AUD" },
    "product-purchase-500": { percent: 2,   fixed: 0, currency: "AUD" },
    "tour-booking":         { percent: 8,   fixed: 0, currency: "AUD" },
};

const ADD_IF_MISSING_ENTRIES: Record<string, { percent: number; fixed: number; currency: string }> = {
    "case-activity": { percent: 15, fixed: 0, currency: "AUD" },
};

export const migration: Migration = {
    id: "014_fix_platform_fee_rates",
    description: "Fixes product-purchase tier rates (were 0%) and adds case-activity fee",

    async up(context) {
        const results = await context.runQuery<any>(
            "System-Settings",
            "SELECT * FROM c WHERE c.id = @id AND c.docType = @docType",
            [
                { name: "@id", value: "spiriverse" },
                { name: "@docType", value: "fees-config" },
            ]
        );

        if (results.length === 0) {
            context.log("Fee config document not found – nothing to fix");
            return;
        }

        const existing = results[0];
        let changes = 0;

        // Force-update entries (fix incorrect rates)
        for (const [key, value] of Object.entries(FORCE_UPDATE_ENTRIES)) {
            const current = existing[key];
            if (!current || current.percent !== value.percent) {
                const oldPercent = current?.percent ?? "missing";
                existing[key] = value;
                changes++;
                context.log(`  Updated "${key}": ${oldPercent}% → ${value.percent}%`);
            } else {
                context.log(`  "${key}" already correct (${value.percent}%) – skipping`);
            }
        }

        // Add-if-missing entries
        for (const [key, value] of Object.entries(ADD_IF_MISSING_ENTRIES)) {
            if (existing[key]) {
                context.log(`  "${key}" already exists – skipping`);
            } else {
                existing[key] = value;
                changes++;
                context.log(`  Added "${key}": ${JSON.stringify(value)}`);
            }
        }

        if (changes === 0) {
            context.log("All fee entries already correct – nothing to do");
            return;
        }

        context.log(`Upserting fee config with ${changes} changes`);
        await context.seedData({
            container: "System-Settings",
            partitionKeyField: "docType",
            records: [existing],
            upsert: true,
        });
    },
};

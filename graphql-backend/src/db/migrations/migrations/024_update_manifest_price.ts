/**
 * Migration: 024_update_manifest_price
 *
 * Safely updates the manifest tier pricing in the fees-config document. This
 * migration is idempotent and will add or update the two fee entries:
 *   - subscription-manifest-monthly  -> $39.00 (3900 cents)
 *   - subscription-manifest-annual   -> $374.00 (37400 cents)
 */

import { Migration } from "../types";

export const migration: Migration = {
    id: "024_update_manifest_price",
    description: "Update Manifest tier pricing to $39/mo and $374/yr",

    async up(context) {
        context.log("Reading fees-config document (spiriverse)");

        const results = await context.runQuery<any>(
            "System-Settings",
            "SELECT * FROM c WHERE c.id = @id AND c.docType = @docType",
            [
                { name: "@id", value: "spiriverse" },
                { name: "@docType", value: "fees-config" },
            ]
        );

        if (!results || results.length === 0) {
            context.log("fees-config document not found — creating a new one with manifest pricing");

            const doc = {
                id: "spiriverse",
                docType: "fees-config",
                // Keep other entries untouched; we only seed the manifest entries here
                "subscription-manifest-monthly": { percent: 0, fixed: 3900, currency: "AUD" },
                "subscription-manifest-annual": { percent: 0, fixed: 37400, currency: "AUD" },
            };

            await context.seedData({
                container: "System-Settings",
                partitionKeyField: "docType",
                records: [doc],
                upsert: true,
            });

            context.log("Created fees-config with manifest pricing");
            return;
        }

        const doc = results[0];

        const beforeMonthly = doc["subscription-manifest-monthly"];
        const beforeAnnual = doc["subscription-manifest-annual"];

        const desiredMonthly = { percent: 0, fixed: 3900, currency: "AUD" };
        const desiredAnnual = { percent: 0, fixed: 37400, currency: "AUD" };

        let changed = false;

        if (JSON.stringify(beforeMonthly) !== JSON.stringify(desiredMonthly)) {
            doc["subscription-manifest-monthly"] = desiredMonthly;
            changed = true;
            context.log("Updating subscription-manifest-monthly to 3900 cents");
        }

        if (JSON.stringify(beforeAnnual) !== JSON.stringify(desiredAnnual)) {
            doc["subscription-manifest-annual"] = desiredAnnual;
            changed = true;
            context.log("Updating subscription-manifest-annual to 37400 cents");
        }

        if (!changed) {
            context.log("Manifest pricing already correct — nothing to do");
            return;
        }

        await context.seedData({
            container: "System-Settings",
            partitionKeyField: "docType",
            records: [doc],
            upsert: true,
        });

        context.log("✓ Manifest pricing updated in fees-config");
    },
};

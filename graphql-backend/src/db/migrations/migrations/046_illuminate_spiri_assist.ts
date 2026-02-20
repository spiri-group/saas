/**
 * Migration: 046_illuminate_spiri_assist
 *
 * Enables hasSpiriAssist for the Illuminate tier.
 * Previously SpiriAssist was Manifest+ only; now it's Illuminate+.
 *
 * Changes:
 * - illuminate: hasSpiriAssist = false → true
 */

import { Migration } from "../types";

export const migration: Migration = {
    id: "046_illuminate_spiri_assist",
    description: "Enables hasSpiriAssist for Illuminate tier (was Manifest+ only, now Illuminate+)",

    async up(context) {
        context.log("Enabling hasSpiriAssist for Illuminate tier...");

        const tierResults = await context.runQuery<any>(
            "System-Settings",
            "SELECT * FROM c WHERE c.id = @id AND c.docType = @docType",
            [
                { name: "@id", value: "subscription-tier-definitions" },
                { name: "@docType", value: "subscription-config" },
            ]
        );

        if (tierResults.length === 0) {
            context.log("Tier definitions not found — cannot update hasSpiriAssist");
            return;
        }

        const doc = tierResults[0];
        const illuminateTier = doc.tiers?.illuminate;

        if (!illuminateTier) {
            context.log("Illuminate tier not found — skipping");
            return;
        }

        const existing = illuminateTier.features || {};
        if (existing.hasSpiriAssist === true) {
            context.log("illuminate.hasSpiriAssist already true — no changes needed");
            return;
        }

        existing.hasSpiriAssist = true;
        illuminateTier.features = existing;
        context.log("illuminate.hasSpiriAssist: false → true");

        await context.seedData({
            container: "System-Settings",
            partitionKeyField: "docType",
            records: [doc],
            upsert: true,
        });

        context.log("Migration 046 complete");
    },
};

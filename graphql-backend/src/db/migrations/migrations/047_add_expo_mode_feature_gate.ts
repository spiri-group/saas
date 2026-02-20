/**
 * Migration: 047_add_expo_mode_feature_gate
 *
 * Adds the hasExpoMode feature gate to subscription tier definitions.
 * Expo Mode is available to Illuminate+ practitioners (same tier as Payment Links, Live Assist).
 *
 * Changes:
 * - awaken: hasExpoMode = false
 * - illuminate: hasExpoMode = true
 * - manifest: hasExpoMode = true
 * - transcend: hasExpoMode = true
 */

import { Migration } from "../types";

const EXPO_MODE_GATES: Record<string, boolean> = {
    awaken: false,
    illuminate: true,
    manifest: true,
    transcend: true,
};

export const migration: Migration = {
    id: "047_add_expo_mode_feature_gate",
    description: "Adds hasExpoMode feature gate to all subscription tiers (illuminate+ = true)",

    async up(context) {
        context.log("Adding hasExpoMode feature gate to tier definitions...");

        const tierResults = await context.runQuery<any>(
            "System-Settings",
            "SELECT * FROM c WHERE c.id = @id AND c.docType = @docType",
            [
                { name: "@id", value: "subscription-tier-definitions" },
                { name: "@docType", value: "subscription-config" },
            ]
        );

        if (tierResults.length === 0) {
            context.log("Tier definitions not found — cannot add hasExpoMode gate");
            return;
        }

        const doc = tierResults[0];
        let changes = 0;

        for (const [tierKey, hasExpoMode] of Object.entries(EXPO_MODE_GATES)) {
            const tier = doc.tiers?.[tierKey];
            if (!tier) {
                context.log(`  Tier "${tierKey}" not found — skipping`);
                continue;
            }

            const existing = tier.features || {};
            if (existing.hasExpoMode === hasExpoMode) {
                context.log(`  ${tierKey}.hasExpoMode already set to ${hasExpoMode} — skipping`);
                continue;
            }

            existing.hasExpoMode = hasExpoMode;
            tier.features = existing;
            changes++;
            context.log(`  ${tierKey}.hasExpoMode: ${existing.hasExpoMode ?? "undefined"} → ${hasExpoMode}`);
        }

        if (changes > 0) {
            context.log(`Upserting tier definitions with ${changes} changes`);
            await context.seedData({
                container: "System-Settings",
                partitionKeyField: "docType",
                records: [doc],
                upsert: true,
            });
        } else {
            context.log("Tier definitions already have hasExpoMode gates");
        }

        context.log("Migration 047 complete");
    },
};

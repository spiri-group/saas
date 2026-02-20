/**
 * Migration: 043_add_live_assist_feature_gate
 *
 * Adds the hasLiveAssist feature gate to subscription tier definitions.
 * Live Assist is available to Illuminate+ practitioners (same tier that unlocks Payment Links).
 *
 * Changes:
 * - awaken: hasLiveAssist = false
 * - illuminate: hasLiveAssist = true
 * - manifest: hasLiveAssist = true
 * - transcend: hasLiveAssist = true
 */

import { Migration } from "../types";

const LIVE_ASSIST_GATES: Record<string, boolean> = {
    awaken: false,
    illuminate: true,
    manifest: true,
    transcend: true,
};

export const migration: Migration = {
    id: "043_add_live_assist_feature_gate",
    description: "Adds hasLiveAssist feature gate to all subscription tiers (illuminate+ = true)",

    async up(context) {
        context.log("Adding hasLiveAssist feature gate to tier definitions...");

        const tierResults = await context.runQuery<any>(
            "System-Settings",
            "SELECT * FROM c WHERE c.id = @id AND c.docType = @docType",
            [
                { name: "@id", value: "subscription-tier-definitions" },
                { name: "@docType", value: "subscription-config" },
            ]
        );

        if (tierResults.length === 0) {
            context.log("Tier definitions not found — cannot add hasLiveAssist gate");
            return;
        }

        const doc = tierResults[0];
        let changes = 0;

        for (const [tierKey, hasLiveAssist] of Object.entries(LIVE_ASSIST_GATES)) {
            const tier = doc.tiers?.[tierKey];
            if (!tier) {
                context.log(`  Tier "${tierKey}" not found — skipping`);
                continue;
            }

            const existing = tier.features || {};
            if (existing.hasLiveAssist === hasLiveAssist) {
                context.log(`  ${tierKey}.hasLiveAssist already set to ${hasLiveAssist} — skipping`);
                continue;
            }

            existing.hasLiveAssist = hasLiveAssist;
            tier.features = existing;
            changes++;
            context.log(`  ${tierKey}.hasLiveAssist: ${existing.hasLiveAssist ?? "undefined"} → ${hasLiveAssist}`);
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
            context.log("Tier definitions already have hasLiveAssist gates");
        }

        context.log("Migration 043 complete");
    },
};

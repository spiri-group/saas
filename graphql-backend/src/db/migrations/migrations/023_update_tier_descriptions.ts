/**
 * Migration: 023_update_tier_descriptions
 *
 * Updates the human-facing tier descriptions in the subscription-tier-definitions
 * document. This is a small, idempotent migration that only touches the
 * `description` fields for `awaken`, `manifest` and `transcend`.
 */

import { Migration } from "../types";

export const migration: Migration = {
    id: "023_update_tier_descriptions",
    description: "Update tier descriptions to concise, outcome-focused copy",

    async up(context) {
        context.log("Reading subscription-tier-definitions document");

        const results = await context.runQuery<any>(
            "System-Settings",
            "SELECT * FROM c WHERE c.id = @id AND c.docType = @docType",
            [
                { name: "@id", value: "subscription-tier-definitions" },
                { name: "@docType", value: "subscription-config" },
            ]
        );

        if (!results || results.length === 0) {
            context.log("subscription-tier-definitions document not found — skipping");
            return;
        }

        const doc = results[0];

        const before = {
            awaken: doc.tiers?.awaken?.description,
            manifest: doc.tiers?.manifest?.description,
            transcend: doc.tiers?.transcend?.description,
        };

        const after = {
            awaken: "For practitioners offering spiritual services and readings",
            manifest: "For merchants selling spiritual products with inventory management",
            transcend: "For established merchants seeking to grow",
        };

        // If descriptions already match, nothing to do
        if (
            before.awaken === after.awaken &&
            before.manifest === after.manifest &&
            before.transcend === after.transcend
        ) {
            context.log("Tier descriptions already up-to-date — nothing to do");
            return;
        }

        // Apply changes
        doc.tiers = doc.tiers || {};
        doc.tiers.awaken = doc.tiers.awaken || {};
        doc.tiers.manifest = doc.tiers.manifest || {};
        doc.tiers.transcend = doc.tiers.transcend || {};

        doc.tiers.awaken.description = after.awaken;
        doc.tiers.manifest.description = after.manifest;
        doc.tiers.transcend.description = after.transcend;

        context.log("Upserting updated subscription-tier-definitions document");

        await context.seedData({
            container: "System-Settings",
            partitionKeyField: "docType",
            records: [doc],
            upsert: true,
        });

        context.log("✓ Tier descriptions updated");
    },
};

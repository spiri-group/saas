/**
 * Migration: 025_update_transcend_description
 *
 * Updates only the `transcend` tier description to match the UI wording.
 */

import { Migration } from "../types";

export const migration: Migration = {
    id: "025_update_transcend_description",
    description: "Update Transcend description to match UI wording",

    async up(context) {
        context.log("Reading subscription-tier-definitions document (025)");

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

        const desired = "For established merchants seeking growth";

        const current = doc.tiers?.transcend?.description;
        if (current === desired) {
            context.log("Transcend description already up-to-date — nothing to do");
            return;
        }

        doc.tiers = doc.tiers || {};
        doc.tiers.transcend = doc.tiers.transcend || {};
        doc.tiers.transcend.description = desired;

        context.log("Upserting updated subscription-tier-definitions document (025)");

        await context.seedData({
            container: "System-Settings",
            partitionKeyField: "docType",
            records: [doc],
            upsert: true,
        });

        context.log("✓ Transcend description updated (025)");
    },
};

/**
 * Migration: 018_remove_case_fees_from_markets
 *
 * Removes case-related fee entries and the no-fees entry from all fee config
 * documents (per-market + legacy) to unify dev and prod environments.
 * Case fees will be re-added when SpiriAssist fees are finalised.
 */

import { Migration } from "../types";

const FEE_DOCS = ["spiriverse", "spiriverse-AU", "spiriverse-UK", "spiriverse-US"];

const KEYS_TO_REMOVE = [
    "case-activity",
    "case-invoice-line",
    "case-interaction",
    "case-offer-release",
    "case-offer-close",
    "case-create",
    "case-urgency-fee",
    "no-fees",
];

export const migration: Migration = {
    id: "018_remove_case_fees_from_markets",
    description: "Removes case-* and no-fees entries from all fee config documents to unify environments",

    async up(context) {
        for (const docId of FEE_DOCS) {
            const results = await context.runQuery<any>(
                "System-Settings",
                "SELECT * FROM c WHERE c.id = @id AND c.docType = @docType",
                [
                    { name: "@id", value: docId },
                    { name: "@docType", value: "fees-config" },
                ]
            );

            if (results.length === 0) {
                context.log(`${docId} not found – skipping`);
                continue;
            }

            const doc = results[0];
            const keysPresent = KEYS_TO_REMOVE.filter(k => k in doc);

            if (keysPresent.length === 0) {
                context.log(`${docId}: no matching keys to remove – skipping`);
                continue;
            }

            // Patch in batches of 9 (Cosmos limit)
            for (let i = 0; i < keysPresent.length; i += 9) {
                const batch = keysPresent.slice(i, i + 9);
                const ops = batch.map(key => ({ op: "remove", path: `/${key}` }));
                await context.patchItem("System-Settings", docId, "fees-config", ops);
            }

            context.log(`${docId}: removed ${keysPresent.length} entries (${keysPresent.join(", ")})`);
        }
    },
};

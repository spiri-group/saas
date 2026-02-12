/**
 * Migration: 026_rename_merchant_terms
 *
 * Renames "Merchant Terms of Service" to "SpiriVerse Partner Terms of Service"
 * so the title is appropriate for both merchants and practitioners.
 */

import { Migration } from "../types";

export const migration: Migration = {
    id: "026_rename_merchant_terms",
    description: "Rename Merchant Terms of Service to SpiriVerse Partner Terms of Service",

    async up(context) {
        const desired = "SpiriVerse Partner Terms of Service";

        const results = await context.runQuery<any>(
            "System-Settings",
            "SELECT * FROM c WHERE c.id = @id AND c.docType = @docType",
            [
                { name: "@id", value: "merchant-terms" },
                { name: "@docType", value: "legal-document" },
            ]
        );

        if (!results || results.length === 0) {
            context.log("merchant-terms document not found — skipping");
            return;
        }

        const doc = results[0];

        if (doc.title === desired) {
            context.log("Title already up-to-date — nothing to do");
            return;
        }

        context.log(`Renaming "${doc.title}" → "${desired}"`);

        await context.patchItem(
            "System-Settings",
            "merchant-terms",
            "legal-document",
            [{ op: "replace", path: "/title", value: desired }]
        );

        context.log("✓ Merchant terms renamed to SpiriVerse Partner Terms of Service");
    },
};

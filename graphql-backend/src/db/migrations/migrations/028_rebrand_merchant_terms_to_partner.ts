/**
 * Migration: 028_rebrand_merchant_terms_to_partner
 *
 * Updates the merchant-terms legal document to use "Partner" terminology:
 * - Title: "Partner Terms of Service"
 * - Removes inline markdown title (displayed by the UI already)
 * - Replaces "Merchant" → "Partner" throughout
 * - Replaces merchants@spiriverse.com → partners@spiriverse.com
 * - Updates the intro to define "Partner" broadly
 */

import { Migration } from "../types";

export const migration: Migration = {
    id: "028_rebrand_merchant_terms_to_partner",
    description: "Rebrand merchant-terms content to Partner terminology",

    async up(context) {
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
        let content: string = doc.content;

        // Remove the inline title heading (first line)
        content = content.replace(/^# .*\n+/, "");

        // Update intro paragraph: redefine "Merchant" as "Partner"
        content = content.replace(
            /These Merchant Terms of Service \("Merchant Terms"\) govern your use of the SpiriVerse platform \("Platform"\) as a merchant, vendor, or practitioner \("Merchant," "you," or "your"\)\./,
            'These Partner Terms of Service ("Partner Terms") govern your use of the SpiriVerse platform ("Platform") as a Partner ("you" or "your"). A "Partner" is any individual or business that lists services, products, or experiences on SpiriVerse.'
        );

        // Replace email
        content = content.replace(/merchants@spiriverse\.com/g, "partners@spiriverse.com");

        // Replace "your merchant account" before the bulk replace
        content = content.replace(/your merchant account/gi, "your partner account");

        // Replace defined term references
        content = content.replace(/Merchant Terms of Service/g, "Partner Terms of Service");
        content = content.replace(/Merchant Terms/g, "Partner Terms");
        content = content.replace(/Merchant Eligibility/g, "Partner Eligibility");

        // Replace remaining "Merchant" → "Partner" (the defined term)
        content = content.replace(/(?<!")Merchant(?!")/g, "Partner");

        // Replace lowercase "merchant" (e.g. "merchant account")
        content = content.replace(/\bmerchant\b/g, "partner");

        // Update title
        const newTitle = "Partner Terms of Service";

        context.log(`Updating title to "${newTitle}" and rebranding content (${content.length} chars)`);

        // Upsert the full document
        doc.title = newTitle;
        doc.content = content;
        doc.updatedAt = new Date().toISOString();
        doc.updatedBy = "migration-028";

        await context.seedData({
            container: "System-Settings",
            partitionKeyField: "docType",
            records: [doc],
            upsert: true,
        });

        context.log("✓ merchant-terms rebranded to Partner terminology");
    },
};

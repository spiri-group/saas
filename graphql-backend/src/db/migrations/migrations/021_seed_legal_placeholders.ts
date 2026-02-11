/**
 * Migration: 021_seed_legal_placeholders
 *
 * Seeds the initial global placeholders for legal documents.
 * These are referenced in document content as [KEY] and resolved
 * at display time.
 */

import { Migration } from "../types";

export const migration: Migration = {
    id: "021_seed_legal_placeholders",
    description: "Seeds initial global placeholders for legal documents (EFFECTIVE_DATE, LAST_UPDATED_DATE, COMPANY_ENTITY, etc.)",

    async up(context) {
        const now = new Date();
        const formattedDate = now.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });

        const placeholders: Record<string, string> = {
            EFFECTIVE_DATE: formattedDate,
            LAST_UPDATED_DATE: formattedDate,
            COMPANY_ENTITY: "SpiriVerse Pty Ltd",
            COMPANY_NAME: "SpiriVerse",
            SUPPORT_EMAIL: "support@spiriverse.com",
            PRIVACY_EMAIL: "privacy@spiriverse.com",
            LEGAL_EMAIL: "legal@spiriverse.com",
            DMCA_EMAIL: "dmca@spiriverse.com",
            WEBSITE_URL: "https://www.spiriverse.com",
        };

        const record = {
            id: "legal-placeholders",
            docType: "legal-config",
            placeholders,
            updatedAt: now.toISOString(),
            updatedBy: "system",
        };

        context.log("Seeding global legal placeholders...");

        await context.seedData({
            container: "System-Settings",
            partitionKeyField: "docType",
            records: [record],
            upsert: false, // Don't overwrite if already set via console
        });

        context.log(`Seeded ${Object.keys(placeholders).length} global placeholders`);
    },
};

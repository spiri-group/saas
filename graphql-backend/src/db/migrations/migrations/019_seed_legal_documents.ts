/**
 * Migration: 019_seed_legal_documents
 *
 * Seeds the initial set of legal documents into System-Settings
 * with docType "legal-document". Documents are read from the
 * docs/legal/ directory at the project root.
 *
 * Documents seeded:
 *   - terms-of-service
 *   - privacy-policy
 *   - cookie-policy
 *   - merchant-terms
 *   - refund-policy
 *   - acceptable-use-policy
 *   - spiritual-services-disclaimer
 *   - payment-terms
 *   - intellectual-property-policy
 */

import { Migration } from "../types";
import * as fs from "fs";
import * as path from "path";

interface LegalDocSeed {
    id: string;
    documentType: string;
    title: string;
    filename: string;
    market: string;
}

const LEGAL_DOCUMENTS: LegalDocSeed[] = [
    {
        id: "terms-of-service",
        documentType: "terms-of-service",
        title: "Terms of Service",
        filename: "terms-of-service.md",
        market: "global",
    },
    {
        id: "privacy-policy",
        documentType: "privacy-policy",
        title: "Privacy Policy",
        filename: "privacy-policy.md",
        market: "global",
    },
    {
        id: "cookie-policy",
        documentType: "cookie-policy",
        title: "Cookie Policy",
        filename: "cookie-policy.md",
        market: "global",
    },
    {
        id: "merchant-terms",
        documentType: "merchant-terms",
        title: "Merchant Terms of Service",
        filename: "merchant-terms.md",
        market: "global",
    },
    {
        id: "refund-policy",
        documentType: "refund-policy",
        title: "Refund & Returns Policy",
        filename: "refund-policy.md",
        market: "global",
    },
    {
        id: "acceptable-use-policy",
        documentType: "acceptable-use-policy",
        title: "Acceptable Use Policy",
        filename: "acceptable-use-policy.md",
        market: "global",
    },
    {
        id: "spiritual-services-disclaimer",
        documentType: "spiritual-services-disclaimer",
        title: "Spiritual Services Disclaimer",
        filename: "spiritual-services-disclaimer.md",
        market: "global",
    },
    {
        id: "payment-terms",
        documentType: "payment-terms",
        title: "Payment & Fee Terms",
        filename: "payment-terms.md",
        market: "global",
    },
    {
        id: "intellectual-property-policy",
        documentType: "intellectual-property-policy",
        title: "Intellectual Property & DMCA Policy",
        filename: "intellectual-property-policy.md",
        market: "global",
    },
];

export const migration: Migration = {
    id: "019_seed_legal_documents",
    description: "Seeds initial legal documents (Terms, Privacy, Cookie, Merchant, Refund, AUP, Disclaimer, Payment, IP) into System-Settings",

    async up(context) {
        // Resolve docs/legal directory relative to this migration file
        // Migration is at: graphql-backend/src/db/migrations/migrations/
        // Docs are at: docs/legal/
        const docsDir = path.resolve(__dirname, "../../../../../docs/legal");

        if (!fs.existsSync(docsDir)) {
            context.log(`WARNING: docs/legal directory not found at ${docsDir}`);
            context.log("Legal documents will not be seeded. You can add them manually through the admin console.");
            return;
        }

        const now = new Date().toISOString();
        const records = [];

        for (const doc of LEGAL_DOCUMENTS) {
            const filePath = path.join(docsDir, doc.filename);

            if (!fs.existsSync(filePath)) {
                context.log(`WARNING: ${doc.filename} not found - skipping`);
                continue;
            }

            const content = fs.readFileSync(filePath, "utf-8");

            records.push({
                id: doc.id,
                docType: "legal-document",
                documentType: doc.documentType,
                title: doc.title,
                content,
                market: doc.market,
                version: 1,
                isPublished: true,
                effectiveDate: now,
                createdAt: now,
                updatedAt: now,
                updatedBy: "system",
            });

            context.log(`Prepared: ${doc.title} (${content.length} chars)`);
        }

        if (records.length === 0) {
            context.log("No legal documents found to seed");
            return;
        }

        context.log(`Seeding ${records.length} legal documents...`);

        await context.seedData({
            container: "System-Settings",
            partitionKeyField: "docType",
            records,
            upsert: false, // Don't overwrite if they already exist
        });

        context.log(`Successfully seeded ${records.length} legal documents`);
    },
};

/**
 * Migration: 037_genericize_base_documents
 *
 * Strips country-specific sections from all 9 base legal documents,
 * preparing them for the country supplement architecture.
 *
 * Changes:
 * - Replaces "Australia, the United Kingdom, and the United States" →
 *   "all jurisdictions in which SpiriVerse operates"
 * - Replaces per-country subsections (e.g. "### 12.1 Australia") with a
 *   generic note deferring to the applicable Country Supplement
 * - Removes inline country-specific references (governing law, age
 *   requirements, etc.)
 * - Version snapshots are created before each update
 */

import { Migration, MigrationContext } from "../types";

interface LegalDoc {
    id: string;
    docType: string;
    documentType: string;
    title: string;
    content: string;
    market: string;
    version: number;
    isPublished: boolean;
    effectiveDate: string;
    changeSummary?: string;
    createdAt?: string;
    updatedAt?: string;
    updatedBy?: string;
    placeholders?: Record<string, string>;
    status?: string;
    [key: string]: any;
}

// ─────────────────────────────────────────────────────
// Version snapshot + update helper (same pattern as 036)
// ─────────────────────────────────────────────────────

async function versionAndUpdate(
    context: MigrationContext,
    doc: LegalDoc,
    newContent: string,
    changeSummary: string
): Promise<void> {
    const now = new Date().toISOString();
    const currentVersion = doc.version || 1;
    const newVersion = currentVersion + 1;

    // Step 1: Create version snapshot of the current state
    const versionSnapshot: Record<string, any> = {
        id: `${doc.id}-v${currentVersion}`,
        docType: "legal-document-version",
        documentId: doc.id,
        version: currentVersion,
        title: doc.title,
        content: doc.content,
        market: doc.market,
        isPublished: doc.isPublished,
        effectiveDate: doc.effectiveDate,
        changeSummary: changeSummary,
        createdAt: doc.createdAt || now,
        supersededAt: now,
        supersededBy: "migration-037",
        status: "ACTIVE",
    };
    if (doc.placeholders) {
        versionSnapshot.placeholders = doc.placeholders;
    }

    await context.seedData({
        container: "System-Settings",
        partitionKeyField: "docType",
        records: [versionSnapshot as any],
        upsert: true,
    });

    context.log(`  → Snapshot created: ${versionSnapshot.id}`);

    // Step 2: Write the updated document
    const updatedDoc: Record<string, any> = { ...doc };
    updatedDoc.content = newContent;
    updatedDoc.version = newVersion;
    updatedDoc.changeSummary = changeSummary;
    updatedDoc.effectiveDate = now;
    updatedDoc.updatedAt = now;
    updatedDoc.updatedBy = "migration-037";

    await context.seedData({
        container: "System-Settings",
        partitionKeyField: "docType",
        records: [updatedDoc as any],
        upsert: true,
    });

    context.log(`  → Updated to v${newVersion}`);
}

// ─────────────────────────────────────────────────────
// Generic replacements applied to ALL documents
// ─────────────────────────────────────────────────────

function applyGenericReplacements(content: string): string {
    // Replace the "Australia, the United Kingdom, and the United States" phrase
    content = content.replace(
        /Australia,?\s+the United Kingdom,?\s+and the United States/gi,
        "all jurisdictions in which SpiriVerse operates"
    );

    // Also handle variations like "Australia, United Kingdom, and United States"
    content = content.replace(
        /Australia,?\s+United Kingdom,?\s+and\s+United States/gi,
        "all jurisdictions in which SpiriVerse operates"
    );

    // Replace "AU, UK, and US" shorthand references
    content = content.replace(
        /\bAU,?\s+UK,?\s+and\s+US\b/g,
        "all applicable markets"
    );

    return content;
}

// ─────────────────────────────────────────────────────
// Per-document country section handlers
// ─────────────────────────────────────────────────────

const COUNTRY_SUPPLEMENT_NOTE =
    "Country-specific legal requirements are set out in the applicable Country Supplement.";

function handleTermsOfService(content: string): string {
    // Replace per-country governing law sections (e.g. ### 12.1 Australia ... ### 12.2 United Kingdom ... ### 12.3 United States)
    content = content.replace(
        /### \d+\.\d+ Australia\b[\s\S]*?(?=### \d+\.\d+ United Kingdom)/,
        ""
    );
    content = content.replace(
        /### \d+\.\d+ United Kingdom\b[\s\S]*?(?=### \d+\.\d+ United States)/,
        ""
    );
    content = content.replace(
        /### \d+\.\d+ United States\b[\s\S]*?(?=\n---|\n## \d+|$)/,
        `${COUNTRY_SUPPLEMENT_NOTE}\n\n`
    );

    // Replace per-country age requirements if present
    content = content.replace(
        /You must be at least \d+ years old in Australia,?\s+\d+ in the United Kingdom,?\s+and \d+ in the United States[^.]*\./gi,
        "You must meet the minimum age requirement applicable in your jurisdiction."
    );

    return content;
}

function handlePrivacyPolicy(content: string): string {
    // Replace per-country privacy sections (e.g. ### 13. Australia ... ### 14. United Kingdom ... ### 15. United States)
    // These typically have section numbers, match the pattern broadly
    content = content.replace(
        /## \d+\. (?:Your Rights Under )?Australian Privacy (?:Law|Act)[\s\S]*?(?=## \d+\. (?:Your Rights Under )?(?:UK|United Kingdom))/i,
        ""
    );
    content = content.replace(
        /## \d+\. (?:Your Rights Under )?(?:UK|United Kingdom)\s+(?:GDPR|Privacy|Data Protection)[\s\S]*?(?=## \d+\. (?:Your Rights Under )?(?:US|United States|California))/i,
        ""
    );
    content = content.replace(
        /## \d+\. (?:Your Rights Under )?(?:US|United States|California)\s+(?:Privacy|State|CCPA)[\s\S]*?(?=\n---|\n## \d+|$)/i,
        `## Country-Specific Privacy Rights\n\n${COUNTRY_SUPPLEMENT_NOTE}\n\n`
    );

    return content;
}

function handleCookiePolicy(content: string): string {
    // Replace per-country cookie law sections
    content = content.replace(
        /## \d+\.\s*(?:Country-Specific|Jurisdiction-Specific)\s+Cookie\s+(?:Requirements|Laws|Regulations)[\s\S]*?(?=\n---|\n## \d+|$)/i,
        `## Country-Specific Cookie Requirements\n\n${COUNTRY_SUPPLEMENT_NOTE}\n\n`
    );

    // Handle inline country references like "Under UK PECR..." or "Under Australian..."
    content = content.replace(
        /### \d+\.\d+\s+(?:Australia|United Kingdom|UK|United States|US)\b[\s\S]*?(?=### \d+\.\d+|\n---|\n## \d+|$)/gi,
        ""
    );

    return content;
}

function handleMerchantTerms(content: string): string {
    // Replace per-country governing law and jurisdiction sections
    content = content.replace(
        /### \d+\.\d+\s+(?:Governing Law|Jurisdiction)\s*[-–—]?\s*Australia\b[\s\S]*?(?=### \d+\.\d+)/i,
        ""
    );
    content = content.replace(
        /### \d+\.\d+\s+(?:Governing Law|Jurisdiction)\s*[-–—]?\s*(?:United Kingdom|UK)\b[\s\S]*?(?=### \d+\.\d+)/i,
        ""
    );
    content = content.replace(
        /### \d+\.\d+\s+(?:Governing Law|Jurisdiction)\s*[-–—]?\s*(?:United States|US)\b[\s\S]*?(?=\n---|\n## \d+|$)/i,
        `${COUNTRY_SUPPLEMENT_NOTE}\n\n`
    );

    return content;
}

function handleRefundPolicy(content: string): string {
    // Replace per-country consumer protection sections
    content = content.replace(
        /## \d+\.\s*(?:Country-Specific|Jurisdiction-Specific)\s+(?:Consumer\s+)?(?:Rights|Protections?)[\s\S]*?(?=\n---|\n## \d+|$)/i,
        `## Country-Specific Consumer Rights\n\n${COUNTRY_SUPPLEMENT_NOTE}\n\n`
    );

    // Handle inline AU/UK/US subsections
    content = content.replace(
        /### \d+\.\d+\s+(?:Australia|Australian Consumer Law)\b[\s\S]*?(?=### \d+\.\d+|\n---|\n## \d+|$)/i,
        ""
    );
    content = content.replace(
        /### \d+\.\d+\s+(?:United Kingdom|UK Consumer Rights)\b[\s\S]*?(?=### \d+\.\d+|\n---|\n## \d+|$)/i,
        ""
    );
    content = content.replace(
        /### \d+\.\d+\s+(?:United States|US Consumer)\b[\s\S]*?(?=### \d+\.\d+|\n---|\n## \d+|$)/i,
        ""
    );

    return content;
}

function handleAcceptableUsePolicy(content: string): string {
    // Replace per-country legal references
    content = content.replace(
        /## \d+\.\s*(?:Country-Specific|Jurisdiction-Specific)\s+(?:Legal\s+)?(?:Requirements|Provisions|Compliance)[\s\S]*?(?=\n---|\n## \d+|$)/i,
        `## Country-Specific Legal Requirements\n\n${COUNTRY_SUPPLEMENT_NOTE}\n\n`
    );

    return content;
}

function handleSpiritualServicesDisclaimer(content: string): string {
    // Replace per-country sections about health practitioner regulations
    content = content.replace(
        /## \d+\.\s*(?:Country-Specific|Jurisdiction-Specific)\s+(?:Regulations?|Requirements?|Disclaimers?)[\s\S]*?(?=\n---|\n## \d+|$)/i,
        `## Country-Specific Regulations\n\n${COUNTRY_SUPPLEMENT_NOTE}\n\n`
    );

    return content;
}

function handlePaymentTerms(content: string): string {
    // Replace per-country tax/currency sections (e.g. ### 11.1 Australia (AUD/GST) ...)
    content = content.replace(
        /### \d+\.\d+\s+Australia\s*\([\s\S]*?(?=### \d+\.\d+)/i,
        ""
    );
    content = content.replace(
        /### \d+\.\d+\s+(?:United Kingdom|UK)\s*\([\s\S]*?(?=### \d+\.\d+)/i,
        ""
    );
    content = content.replace(
        /### \d+\.\d+\s+(?:United States|US)\s*\([\s\S]*?(?=\n---|\n## \d+|$)/i,
        `${COUNTRY_SUPPLEMENT_NOTE}\n\n`
    );

    // Also handle a consolidated "Currency and Tax" section
    content = content.replace(
        /## \d+\.\s*(?:Country-Specific|Jurisdiction-Specific)\s+(?:Currency|Tax|Payment)[\s\S]*?(?=\n---|\n## \d+|$)/i,
        `## Country-Specific Currency and Tax\n\n${COUNTRY_SUPPLEMENT_NOTE}\n\n`
    );

    return content;
}

function handleIntellectualPropertyPolicy(content: string): string {
    // Replace per-country copyright sections
    content = content.replace(
        /## \d+\.\s*(?:Country-Specific|Jurisdiction-Specific)\s+(?:Copyright|IP)\s+(?:Laws?|Provisions?|Procedures?)[\s\S]*?(?=\n---|\n## \d+|$)/i,
        `## Country-Specific Copyright Law\n\n${COUNTRY_SUPPLEMENT_NOTE}\n\n`
    );

    // Handle inline references like "### 8. US DMCA" / "### 9. UK CDPA" / "### 10. AU Copyright Act"
    content = content.replace(
        /### \d+\.\s*(?:US\s+DMCA|United States\s+DMCA)[\s\S]*?(?=### \d+\.|\n---|\n## \d+|$)/i,
        ""
    );
    content = content.replace(
        /### \d+\.\s*(?:UK\s+CDPA|United Kingdom\s+Copyright)[\s\S]*?(?=### \d+\.|\n---|\n## \d+|$)/i,
        ""
    );
    content = content.replace(
        /### \d+\.\s*(?:AU\s+Copyright|Australian\s+Copyright)[\s\S]*?(?=### \d+\.|\n---|\n## \d+|$)/i,
        ""
    );

    return content;
}

// ─────────────────────────────────────────────────────
// Main migration
// ─────────────────────────────────────────────────────

const handlers: Record<string, (content: string) => string> = {
    "terms-of-service": handleTermsOfService,
    "privacy-policy": handlePrivacyPolicy,
    "cookie-policy": handleCookiePolicy,
    "merchant-terms": handleMerchantTerms,
    "refund-policy": handleRefundPolicy,
    "acceptable-use-policy": handleAcceptableUsePolicy,
    "spiritual-services-disclaimer": handleSpiritualServicesDisclaimer,
    "payment-terms": handlePaymentTerms,
    "intellectual-property-policy": handleIntellectualPropertyPolicy,
};

export const migration: Migration = {
    id: "037_genericize_base_documents",
    description:
        "Strip country-specific sections from all 9 base legal documents. Per-country content will be moved to country supplement documents in migration 038.",

    async up(context: MigrationContext) {
        const allDocs = await context.runQuery<LegalDoc>(
            "System-Settings",
            "SELECT * FROM c WHERE c.docType = 'legal-document' AND c.market = 'global'"
        );

        if (!allDocs || allDocs.length === 0) {
            context.log("No global legal documents found — skipping");
            return;
        }

        context.log(`Found ${allDocs.length} global legal documents to process\n`);

        for (const doc of allDocs) {
            const handler = handlers[doc.id];
            if (!handler) {
                context.log(`Skipping: ${doc.id} (no handler)\n`);
                continue;
            }

            context.log(`Processing: ${doc.id} (v${doc.version || 1})`);

            // Apply generic replacements first, then document-specific handler
            let newContent = applyGenericReplacements(doc.content);
            newContent = handler(newContent);

            // Check if content actually changed
            if (newContent === doc.content) {
                context.log("  → No changes needed — skipping\n");
                continue;
            }

            await versionAndUpdate(
                context,
                doc,
                newContent,
                "Genericized: removed country-specific sections for country supplement architecture"
            );
            context.log("");
        }

        context.log(
            "✓ Base documents genericized — ready for country supplements"
        );
    },
};

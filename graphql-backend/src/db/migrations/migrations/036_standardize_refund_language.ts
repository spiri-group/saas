/**
 * Migration: 036_standardize_refund_language
 *
 * Standardises refund language across all legal documents:
 * - Replaces prescriptive refund definitions with a standard paragraph
 *   deferring all refund matters to the Partner
 * - Keeps operational mechanics (dispute escalation, auto-refund,
 *   chargebacks, platform fee non-refundability)
 * - Removes prescriptive refund tiers and timelines
 *
 * Standard refund principle:
 *   All refunds shall be governed exclusively by the refund policy
 *   established and maintained by the applicable Partner. SpiriVerse
 *   shall have no responsibility, obligation, or liability for
 *   processing, approving, denying, or issuing any refunds.
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

const STANDARD_REFUND_PARAGRAPH =
    'All refunds shall be governed exclusively by the refund policy established and maintained by the applicable Partner ("Partner"). Any request for a refund, dispute, or inquiry relating to a refund must be submitted directly to the Partner in accordance with the Partner\'s stated refund policy. SpiriVerse shall have no responsibility, obligation, or liability for processing, approving, denying, or issuing any refunds. By engaging in any transaction facilitated through SpiriVerse, you acknowledge and agree that refund matters are solely between you and the Partner.';

// ─────────────────────────────────────────────────────
// Version snapshot + update helper
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
        supersededBy: "migration-036",
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
    updatedDoc.updatedBy = "migration-036";

    await context.seedData({
        container: "System-Settings",
        partitionKeyField: "docType",
        records: [updatedDoc as any],
        upsert: true,
    });

    context.log(`  → Updated to v${newVersion}`);
}

// ─────────────────────────────────────────────────────
// Document-specific handlers
// ─────────────────────────────────────────────────────

function handleTermsOfService(content: string): {
    content: string;
    changeSummary: string;
} {
    // ── Section 8.4: Refunds for Physical Products ──
    // Replace prescriptive per-country refund rules with standard paragraph
    content = content.replace(
        /### 8\.4 Refunds for Physical Products\r?\n\r?\n- \*\*\(a\)\*\* Refund and return policies for physical products are set by the Partner, subject to the minimum requirements of applicable consumer protection law\.\r?\n- \*\*\(b\)\*\* Under Australian Consumer Law[\s\S]*?- \*\*\(e\)\*\* Nothing in these Terms limits or excludes any statutory consumer rights that cannot be limited or excluded by law\./,
        `### 8.4 Refunds for Physical Products\n\n${STANDARD_REFUND_PARAGRAPH}\n\nNothing in these Terms limits or excludes any statutory consumer rights that cannot be limited or excluded by law.`
    );

    // ── Section 8.5: Refunds for Digital Content ──
    // Replace prescriptive rules with standard paragraph
    content = content.replace(
        /### 8\.5 Refunds for Digital Content and Asynchronous Deliverables\r?\n\r?\n- \*\*\(a\)\*\* Due to the nature of digital content[\s\S]*?- \*\*\(c\)\*\* Refund requests are reviewed on a case-by-case basis\. SpiriVerse may mediate disputes between Buyers and Partners\./,
        `### 8.5 Refunds for Digital Content and Asynchronous Deliverables\n\n${STANDARD_REFUND_PARAGRAPH}`
    );

    return {
        content,
        changeSummary:
            "Standardised refund language: replaced prescriptive refund definitions in Sections 8.4 and 8.5 with standard refund paragraph deferring all refund matters to the Partner.",
    };
}

function handleRefundPolicy(content: string): {
    content: string;
    changeSummary: string;
} {
    // ── Section 1: General Refund Principles ──
    // Replace with standard paragraph
    content = content.replace(
        /## 1\. General Refund Principles\r?\n\r?\nSpiriVerse facilitates transactions between buyers and independent partners\. Each partner may set their own refund terms within the framework established by this policy\. The following principles apply to all transactions:\r?\n\r?\n- \*\*Partner-specific policies are displayed at checkout\.\*\*[\s\S]*?- \*\*Refund eligibility depends on the type of purchase\.\*\*[^\n]*\n/,
        `## 1. General Refund Principles\n\n${STANDARD_REFUND_PARAGRAPH}\n\nNothing in this policy limits or excludes any statutory rights you may have under applicable consumer protection laws.\n`
    );

    // ── Section 2: Physical Product Returns ──
    // Replace prescriptive return eligibility, conditions, OOAK, backorder, shipping, evidence
    content = content.replace(
        /## 2\. Physical Product Returns\r?\n\r?\nPhysical products sold on SpiriVerse include[\s\S]*?(?=\r?\n---\r?\n\r?\n## 3\.)/,
        `## 2. Physical Product Returns\n\nRefund and return policies for physical products are established by each Partner and displayed on the product listing. All refund and return requests for physical products must be directed to the Partner in accordance with their stated policy.\n`
    );

    // ── Section 3: Service Cancellations ──
    // Replace prescriptive sync/async rules with simplified deferral
    content = content.replace(
        /## 3\. Service Cancellations\r?\n\r?\nSpiriVerse hosts two categories of services[\s\S]*?(?=---\r?\n\r?\n## 4\.)/,
        `## 3. Service Cancellations\n\nCancellation and refund policies for services are established by each Partner and displayed on the service listing at checkout.\n\n${STANDARD_REFUND_PARAGRAPH}\n\n**Confirmation workflow:** After you book a service, the Partner must confirm the booking. If the Partner does not confirm or declines the booking, you will receive a full refund automatically.\n\n**Cancellation by the Partner:** If the Partner cancels a confirmed booking, you will receive a full refund.\n\n**Platform Fees:** SpiriVerse Platform Fees are non-refundable in all cases, regardless of whether a refund is issued to the buyer.\n\n`
    );

    // ── Section 4.2: Cancellation by You (events) ──
    // Replace prescriptive tiers (7 days, 48 hours) with deferral to organiser
    content = content.replace(
        /### 4\.2 Cancellation by You\r?\n\r?\n- \*\*More than 7 days before the event:\*\*[\s\S]*?- Organisers may set more generous refund terms, which will be displayed on the event listing\./,
        `### 4.2 Cancellation by You\n\nCancellation and refund terms for events are governed by the event organiser's refund policy, which is displayed on the event listing at the time of purchase. All refund requests must be directed to the organiser in accordance with their stated policy.`
    );

    // ── Section 5: Digital Content ──
    // Replace prescriptive rules with deferral to partner
    content = content.replace(
        /## 5\. Digital Content\r?\n\r?\nDigital content on SpiriVerse includes[\s\S]*?(?=\r?\n---\r?\n\r?\n## 6\.)/,
        `## 5. Digital Content\n\nRefund policies for digital content (including videos, podcasts, guided meditations, courses, downloadable files, and livestream recordings) are established by each Partner and displayed on the content listing. All refund requests for digital content must be directed to the Partner in accordance with their stated policy.\n`
    );

    return {
        content,
        changeSummary:
            "Standardised refund language: replaced prescriptive refund definitions, tiers, and timelines with standard refund paragraph deferring all refund matters to the Partner. Kept operational mechanics (dispute escalation, auto-refund, chargebacks, platform fee non-refundability).",
    };
}

function handlePaymentTerms(content: string): {
    content: string;
    changeSummary: string;
} {
    // ── Section 8 Refund Policy ──
    // Replace "SpiriVerse facilitates refund processing" with standard paragraph
    content = content.replace(
        /### Refund Policy\r?\n\r?\nPartners are expected to maintain their own refund policies in compliance with local consumer protection laws\. SpiriVerse facilitates refund processing through the following methods:/,
        `### Refund Policy\n\n${STANDARD_REFUND_PARAGRAPH}\n\nWhere a refund is processed through the Platform, the following methods may be available:`
    );

    return {
        content,
        changeSummary:
            "Standardised refund language: replaced refund facilitation statement with standard refund paragraph deferring all refund matters to the Partner. Kept refund methods table, chargeback handling, and platform fee non-refundability.",
    };
}

function handleMerchantTerms(content: string): {
    content: string;
    changeSummary: string;
} {
    // ── Section 15.1: Partner Refund Policies ──
    // Add standard paragraph language
    content = content.replace(
        /### 15\.1 Partner Refund Policies\r?\n\r?\nYou must configure a refund policy for your Listings\. Your refund policy is displayed to Customers before purchase and forms part of the transaction agreement between you and the Customer\./,
        `### 15.1 Partner Refund Policies\n\nYou must configure a refund policy for your Listings. Your refund policy is displayed to Customers before purchase and forms part of the transaction agreement between you and the Customer. All refunds shall be governed exclusively by the refund policy you establish and maintain. You are solely responsible for processing, approving, denying, or issuing any refunds in accordance with your stated policy and applicable law.`
    );

    return {
        content,
        changeSummary:
            "Standardised refund language: reinforced that Partners are solely responsible for all refund matters in Section 15.1.",
    };
}

// ─────────────────────────────────────────────────────
// Main migration
// ─────────────────────────────────────────────────────

export const migration: Migration = {
    id: "036_standardize_refund_language",
    description:
        "Standardise refund language across legal documents: replace prescriptive refund definitions with standard paragraph deferring all refund matters to the Partner. Keep operational mechanics (dispute escalation, auto-refund, chargebacks, platform fees).",

    async up(context: MigrationContext) {
        const allDocs = await context.runQuery<LegalDoc>(
            "System-Settings",
            "SELECT * FROM c WHERE c.docType = 'legal-document'"
        );

        if (!allDocs || allDocs.length === 0) {
            context.log("No legal documents found — skipping");
            return;
        }

        context.log(`Found ${allDocs.length} legal documents to process\n`);

        const handlers: Record<
            string,
            (c: string) => { content: string; changeSummary: string }
        > = {
            "terms-of-service": handleTermsOfService,
            "refund-policy": handleRefundPolicy,
            "payment-terms": handlePaymentTerms,
            "merchant-terms": handleMerchantTerms,
        };

        for (const doc of allDocs) {
            const handler = handlers[doc.id];
            if (!handler) {
                context.log(`Skipping: ${doc.id} (no refund changes needed)\n`);
                continue;
            }

            context.log(`Processing: ${doc.id} (v${doc.version || 1})`);

            const result = handler(doc.content);

            // Check if content actually changed
            if (result.content === doc.content) {
                context.log("  → No changes needed — skipping\n");
                continue;
            }

            await versionAndUpdate(
                context,
                doc,
                result.content,
                result.changeSummary
            );
            context.log("");
        }

        context.log(
            "✓ Refund language standardised across legal documents"
        );
    },
};

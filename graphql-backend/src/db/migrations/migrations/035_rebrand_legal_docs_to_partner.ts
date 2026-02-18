/**
 * Migration: 035_rebrand_legal_docs_to_partner
 *
 * Updates ALL legal documents to standardise on "Partner" terminology:
 * - Replaces Vendor/Merchant/Practitioner/Seller with Partner across all docs
 * - Adds Partner definition to each document where the term appears
 * - Updates Terms of Service Section 8.2 refund framework (partner-defined policies)
 * - Makes platform fees non-refundable as a blanket rule across all docs
 * - Creates version snapshots so updates appear as v2 in the console
 */

import { Migration, MigrationContext } from "../types";

const PARTNER_DEFINITION =
    'A "Partner" is any individual or business that lists services, products, or experiences on SpiriVerse.';

const DEFAULT_CHANGE_SUMMARY =
    "Standardised terminology: replaced all Vendor/Merchant/Practitioner references with Partner. Added Partner definition. Made platform fees non-refundable in all cases.";

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
// Generic terminology replacement
// ─────────────────────────────────────────────────────

function applyPartnerReplacements(content: string): string {
    // ── Compound phrases first (before individual word replacements) ──

    // Slash compounds
    content = content.replace(/Vendors\/Practitioners/g, "Partners");
    content = content.replace(/Vendor\/Practitioner/g, "Partner");

    // "Vendors and Practitioners" / "Vendor and Practitioner"
    content = content.replace(/Vendors and Practitioners/g, "Partners");
    content = content.replace(/Vendor and Practitioner/g, "Partner");

    // "Vendors or Practitioners" / "Vendor or Practitioner"
    content = content.replace(/Vendors or Practitioners/g, "Partners");
    content = content.replace(/Vendor or Practitioner/g, "Partner");

    // Possessive compound
    content = content.replace(/Vendor's or Practitioner's/g, "Partner's");

    // Lowercase compounds with "and"
    content = content.replace(/vendors and practitioners/g, "partners");
    content = content.replace(/vendor and practitioner/g, "partner");
    content = content.replace(/vendors or practitioners/g, "partners");
    content = content.replace(/vendor or practitioner/g, "partner");

    // Comma-separated lists
    content = content.replace(
        /buyers, vendors, practitioners/gi,
        (m) => (m[0] === "B" ? "Buyers and Partners" : "buyers and partners")
    );
    content = content.replace(
        /users, vendors, and practitioners/gi,
        (m) => (m[0] === "U" ? "Users and Partners" : "users and partners")
    );
    content = content.replace(
        /vendors, practitioners, and spiritual services/gi,
        "partners and spiritual services"
    );
    content = content.replace(
        /vendors, practitioners, event hosts, content creators/gi,
        "partners, event hosts, content creators"
    );
    content = content.replace(
        /merchant, vendor, or practitioner/gi,
        "partner"
    );

    // ── Individual capitalized terms ──

    content = content.replace(/\bVendors\b/g, "Partners");
    content = content.replace(/\bVendor\b/g, "Partner");
    content = content.replace(/\bPractitioners\b/g, "Partners");
    content = content.replace(/\bPractitioner\b/g, "Partner");
    content = content.replace(/\bMerchants\b/g, "Partners");
    content = content.replace(/\bMerchant\b/g, "Partner");

    // ── Individual lowercase terms ──

    content = content.replace(/\bvendors\b/g, "partners");
    content = content.replace(/\bvendor\b/g, "partner");
    content = content.replace(/\bpractitioners\b/g, "partners");
    content = content.replace(/\bpractitioner\b/g, "partner");
    content = content.replace(/\bmerchants\b/g, "partners");
    content = content.replace(/\bmerchant\b/g, "partner");
    content = content.replace(/\bsellers\b/g, "partners");
    content = content.replace(/\bseller\b/g, "partner");

    // ── Clean up double-Partner artefacts ──

    content = content.replace(/Partners and Partners/g, "Partners");
    content = content.replace(/partners and partners/g, "partners");
    content = content.replace(/Partner and Partner/g, "Partner");
    content = content.replace(/partner and partner/g, "partner");
    content = content.replace(/Partner or Partner/g, "Partner");
    content = content.replace(/partner or partner/g, "partner");
    content = content.replace(/Partner's or Partner's/g, "Partner's");

    // Clean up "buyers, \*\*partners, partners\*\*" from bold markup
    content = content.replace(
        /buyers, \*\*partners, partners\*\*/gi,
        "buyers and **partners**"
    );
    content = content.replace(
        /buyers and \*\*partners, partners\*\*/gi,
        "buyers and **partners**"
    );

    return content;
}

// ─────────────────────────────────────────────────────
// Version snapshot + update helper
// ─────────────────────────────────────────────────────

async function versionAndUpdate(
    context: MigrationContext,
    doc: LegalDoc,
    newContent: string,
    changeSummary: string,
    newTitle?: string
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
        supersededBy: "migration-035",
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
    updatedDoc.title = newTitle || doc.title;
    updatedDoc.content = newContent;
    updatedDoc.version = newVersion;
    updatedDoc.changeSummary = changeSummary;
    updatedDoc.effectiveDate = now;
    updatedDoc.updatedAt = now;
    updatedDoc.updatedBy = "migration-035";

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
    // ── Section 1: Definitions ──

    // Replace "Merchant Subscription" definition
    content = content.replace(
        /\*\*"Merchant Subscription"\*\* means the recurring subscription plan that (?:Vendors and Practitioners|Partners) purchase to operate a storefront or practice on the Platform\./,
        `**"Partner Subscription"** means the recurring subscription plan that Partners purchase to operate a storefront or practice on the Platform.`
    );

    // Replace "Practitioner" definition with "Partner" definition
    content = content.replace(
        /\*\*"Practitioner"\*\* means a User who offers synchronous services \(such as tarot readings, astrology consultations, reiki sessions, coaching, or energy healing\) or asynchronous deliverables \(such as written readings or oracle messages\) through the Platform\./,
        `**"Partner"** means any individual or business that lists services, products, or experiences on SpiriVerse, including but not limited to those selling physical products, offering synchronous services (such as tarot readings, astrology consultations, reiki sessions, coaching, or energy healing), or providing asynchronous deliverables (such as written readings or oracle messages).`
    );

    // Remove "Vendor" definition entirely
    content = content.replace(
        /\r?\n\r?\n\*\*"Vendor"\*\* means a User who sells physical products through the Platform, including but not limited to crystals, tarot decks, candles, jewelry, and spiritual tools\./,
        ""
    );

    // Update "User" definition
    content = content.replace(
        /\*\*"User"\*\* means any individual or entity that accesses or uses the Platform in any capacity, including Buyers, (?:Vendors, and Practitioners|Partners)\./,
        `**"User"** means any individual or entity that accesses or uses the Platform in any capacity, including Buyers and Partners.`
    );

    // ── Table of Contents ──
    content = content.replace(
        /7\. \[Vendor and Practitioner Terms\]/,
        "7. [Partner Terms]"
    );
    content = content.replace(
        /#7-vendor-and-practitioner-terms/,
        "#7-partner-terms"
    );

    // ── Section headers ──
    content = content.replace(
        /## 5\.2 Vendor and Practitioner Conduct/,
        "## 5.2 Partner Conduct"
    );
    content = content.replace(
        /### 5\.2 Vendor and Practitioner Conduct/,
        "### 5.2 Partner Conduct"
    );
    content = content.replace(
        /## 7\. Vendor and Practitioner Terms/,
        "## 7. Partner Terms"
    );
    content = content.replace(
        /### 7\.2 Merchant Subscriptions/,
        "### 7.2 Partner Subscriptions"
    );
    content = content.replace(
        /## 14\.2 Vendor and Practitioner IP/,
        "## 14.2 Partner IP"
    );
    content = content.replace(
        /### 14\.2 Vendor and Practitioner IP/,
        "### 14.2 Partner IP"
    );
    content = content.replace(
        /## 18\.2 Vendor and Practitioner Indemnification/,
        "## 18.2 Partner Indemnification"
    );
    content = content.replace(
        /### 18\.2 Vendor and Practitioner Indemnification/,
        "### 18.2 Partner Indemnification"
    );

    // ── Section 8.2: Cancellation by Buyer ──
    // Replace the prescriptive tiers with partner-defined policy
    content = content.replace(
        /### 8\.2 Cancellation by Buyer\r?\n\r?\n- \*\*\(a\)\*\*[\s\S]+?(?=### 8\.3)/,
        `### 8.2 Cancellation by Buyer\r\n\r\n- **(a)** Buyers may cancel a booking subject to the cancellation and refund policy set by the Partner, which must be clearly stated in the listing at the time of publication.\r\n- **(b)** Partners define their own refund and cancellation policies at listing time. SpiriVerse expects all Partners to honour their stated policies. Failure to comply with a stated refund or cancellation policy may result in account warnings, listing removal, or account suspension.\r\n- **(c)** Platform Fees are non-refundable in all cases, regardless of whether a refund is issued to the Buyer.\r\n\r\n`
    );

    // ── Section 8.3(a): Partner cancellation — platform fees NOT refunded ──
    content = content.replace(
        /If a (?:Vendor or Practitioner|Partner) cancels a confirmed booking, the Buyer will receive a full refund, including any Platform Fees\./,
        "If a Partner cancels a confirmed booking, the Buyer will receive a full refund of the product or service amount. Platform Fees remain non-refundable."
    );

    return {
        content,
        changeSummary:
            "Replaced all Vendor/Merchant/Practitioner terminology with Partner. Consolidated definitions in Section 1. Rewrote Section 8.2 to partner-defined refund policies. Made platform fees non-refundable in all cases (Sections 8.2, 8.3).",
    };
}

function handleRefundPolicy(content: string): {
    content: string;
    changeSummary: string;
} {
    // ── Intro: replace "independent merchants (referred to as ...)" ──
    content = content.replace(
        /independent merchants \(referred to as "practitioners" or "sellers"\)/,
        `independent partners (each, a "Partner"). ${PARTNER_DEFINITION}`
    );
    // Also handle smart quotes variant
    content = content.replace(
        /independent merchants \(referred to as \u201cpractitioners\u201d or \u201csellers\u201d\)/,
        `independent partners (each, a "Partner"). ${PARTNER_DEFINITION}`
    );

    // ── ToC: Merchant Obligations → Partner Obligations ──
    content = content.replace(
        /9\. \[Merchant Obligations\]/,
        "9. [Partner Obligations]"
    );
    content = content.replace(
        /#9-merchant-obligations/,
        "#9-partner-obligations"
    );

    // ── Section 9 heading ──
    content = content.replace(
        /## 9\. Merchant Obligations/,
        "## 9. Partner Obligations"
    );

    // ── Section 3.3: Replace prescriptive tiers with partner-defined policy ──
    content = content.replace(
        /### 3\.3 Cancellation Policy Tiers\r?\n\r?\nEach practitioner selects a cancellation policy for their services\. The applicable tier is displayed on the service listing and at checkout\.\r?\n\r?\n#### Flexible[\s\S]*?(?=\r?\n---)/,
        `### 3.3 Cancellation and Refund Policies\r\n\r\nEach Partner defines their own cancellation and refund policy for their services. The applicable policy is displayed on the service listing and at checkout before you complete your booking.\r\n\r\nSpiriVerse requires all Partners to honour their stated cancellation and refund policies. If a Partner fails to do so, you may escalate the matter through our dispute process (see [Section 10](#10-dispute-escalation)).\r\n\r\n**Note:** Cancellation policies apply to voluntary cancellations by the buyer. If the service was not delivered as described, was of unacceptable quality, or the Partner failed to show up, you are entitled to a full refund regardless of the stated cancellation policy.\r\n\r\n**Platform Fees:** SpiriVerse Platform Fees are non-refundable in all cases, regardless of whether a refund is issued to the buyer.`
    );

    // ── Section 13.4: Add explicit platform fee non-refund language ──
    content = content.replace(
        /SpiriVerse is not responsible for refunds related to third-party services \(such as payment processing fees\) that may not be recoverable\. Where a refund is issued, non-refundable third-party fees may be deducted if disclosed at the time of purchase\./,
        `**Platform Fees are non-refundable in all cases**, regardless of whether a refund is issued to the buyer. SpiriVerse is not responsible for refunds related to third-party services (such as payment processing fees) that may not be recoverable.`
    );

    return {
        content,
        changeSummary:
            "Replaced all Merchant/Practitioner/Seller terminology with Partner. Added Partner definition. Replaced prescriptive cancellation tiers with partner-defined policies. Made platform fees explicitly non-refundable in all cases.",
    };
}

function handlePaymentTerms(content: string): {
    content: string;
    changeSummary: string;
} {
    // ── Intro: Add Partner definition ──
    content = content.replace(
        /merchants \("Merchants"\), collectively referred to as "Users"\./,
        `partners ("Partners"), collectively referred to as "Users". ${PARTNER_DEFINITION}`
    );
    // Also handle if already partially rebranded
    content = content.replace(
        /partners \("Partners"\), collectively referred to as "Users"\./,
        `partners ("Partners"), collectively referred to as "Users". ${PARTNER_DEFINITION}`
    );

    // ── ToC updates ──
    content = content.replace(
        /6\. \[Merchant Subscription Billing\]/,
        "6. [Partner Subscription Billing]"
    );
    content = content.replace(
        /#6-merchant-subscription-billing/,
        "#6-partner-subscription-billing"
    );

    // ── Section 6 heading ──
    content = content.replace(
        /## 6\. Merchant Subscription Billing/,
        "## 6. Partner Subscription Billing"
    );

    // ── Section 8: Platform Fee Handling on Refunds ──
    content = content.replace(
        /### Platform Fee Handling on Refunds\r?\n\r?\n- When a full refund is issued, the (?:\*\*)?Customer fee portion is refunded(?:\*\*)? to the Customer\.\r?\n- The (?:\*\*)?(?:Merchant|Partner) fee portion may or may not be refunded(?:\*\*)? to the (?:Merchant|Partner) depending on the circumstances and at SpiriVerse's discretion\.\r?\n- (?:\*\*)?Stripe's processing fees are generally non-refundable(?:\*\*)?, consistent with Stripe's terms\./,
        `### Platform Fee Handling on Refunds\r\n\r\n- **Platform Fees (both Customer and Partner portions) are non-refundable in all cases.** When a refund is issued, the product or service amount is returned to the Customer, but Platform Fees are retained by SpiriVerse.\r\n- Stripe's processing fees are generally non-refundable, consistent with Stripe's terms.`
    );

    // Fallback: if the exact match didn't work, try a simpler replacement
    if (
        content.includes("Customer fee portion is refunded") ||
        content.includes("Merchant fee portion may or may not")
    ) {
        content = content.replace(
            /When a full refund is issued, the (?:\*\*)?Customer fee portion is refunded(?:\*\*)? to the Customer\./,
            "**Platform Fees (both Customer and Partner portions) are non-refundable in all cases.** When a refund is issued, the product or service amount is returned to the Customer, but Platform Fees are retained by SpiriVerse."
        );
        content = content.replace(
            /\r?\n- The (?:\*\*)?(?:Merchant|Partner) fee portion may or may not be refunded(?:\*\*)? to the (?:Merchant|Partner) depending on the circumstances and at SpiriVerse's discretion\./,
            ""
        );
    }

    return {
        content,
        changeSummary:
            "Replaced all Merchant terminology with Partner. Added Partner definition. Made platform fees (both Customer and Partner portions) non-refundable in all cases.",
    };
}

function handleMerchantTerms(content: string): {
    content: string;
    changeSummary: string;
} {
    // This doc may already have Partner terminology from migration 028.
    // Ensure the Partner definition is present in the intro.
    if (!content.includes(PARTNER_DEFINITION)) {
        // Try to add after the existing intro
        content = content.replace(
            /These Partner Terms of Service \("Partner Terms"\) govern your use of the SpiriVerse platform \("Platform"\) as a Partner \("you" or "your"\)\./,
            `These Partner Terms of Service ("Partner Terms") govern your use of the SpiriVerse platform ("Platform") as a Partner ("you" or "your"). ${PARTNER_DEFINITION}`
        );
    }

    // ── Section 15.3(d): Platform fees non-refundable ──
    content = content.replace(
        /Platform Fees on refunded transactions may be non-refundable \(as specified in your fee schedule\)\./,
        "Platform Fees on refunded transactions are non-refundable in all cases."
    );

    // Also handle without parenthetical
    content = content.replace(
        /Platform Fees on refunded transactions may be non-refundable/g,
        "Platform Fees on refunded transactions are non-refundable in all cases"
    );

    // ── Email addresses ──
    content = content.replace(
        /merchants@spiriverse\.com/g,
        "partners@spiriverse.com"
    );

    // ── Section headers (if not already rebranded by 028) ──
    content = content.replace(
        /## 2\. Merchant Eligibility and Onboarding/,
        "## 2. Partner Eligibility and Onboarding"
    );
    content = content.replace(
        /#2-merchant-eligibility-and-onboarding/,
        "#2-partner-eligibility-and-onboarding"
    );
    content = content.replace(
        /## 12\. Practitioner Verification/,
        "## 12. Partner Verification"
    );
    content = content.replace(
        /#12-practitioner-verification/,
        "#12-partner-verification"
    );

    return {
        content,
        changeSummary:
            "Ensured consistent Partner terminology throughout. Added Partner definition. Made platform fees explicitly non-refundable in all cases.",
    };
}

function handleAcceptableUsePolicy(content: string): {
    content: string;
    changeSummary: string;
} {
    // Add Partner definition after the scope statement (after generic replacements)
    // We'll insert it after the first mention of "partners" in the scope section
    if (!content.includes(PARTNER_DEFINITION)) {
        content = content.replace(
            /It applies to all users---partners, event hosts, content creators, and community members---across all regions in which SpiriVerse operates/,
            `It applies to all users---partners, event hosts, content creators, and community members---across all regions in which SpiriVerse operates. ${PARTNER_DEFINITION}`
        );
        // Fallback: try without the em-dash variant
        if (!content.includes(PARTNER_DEFINITION)) {
            content = content.replace(
                /It applies to all users/,
                `It applies to all users. ${PARTNER_DEFINITION}\r\n\r\nIt applies to all users`
            );
        }
    }

    // Section headers
    content = content.replace(
        /## 9\. Practitioner Obligations/,
        "## 9. Partner Obligations"
    );

    return {
        content,
        changeSummary:
            "Replaced all Vendor/Practitioner terminology with Partner. Added Partner definition.",
    };
}

function handleSpiritualServicesDisclaimer(content: string): {
    content: string;
    changeSummary: string;
} {
    // Section headers
    content = content.replace(
        /## 3\. Practitioner Independence/,
        "## 3. Partner Independence"
    );
    content = content.replace(
        /### 3\.1 Independent Contractor Status/,
        "### 3.1 Independent Contractor Status"
    );
    content = content.replace(
        /## 14\. Practitioner Obligations/,
        "## 14. Partner Obligations"
    );

    // Add Partner definition near the independence section
    if (!content.includes(PARTNER_DEFINITION)) {
        content = content.replace(
            /All partners offering services through the SpiriVerse platform are \*\*independent contractors\*\*\./,
            `All Partners offering services through the SpiriVerse platform are **independent contractors**. ${PARTNER_DEFINITION}`
        );
        // Fallback for pre-replacement text
        if (!content.includes(PARTNER_DEFINITION)) {
            content = content.replace(
                /All practitioners offering services through the SpiriVerse platform are \*\*independent contractors\*\*\./,
                `All Partners offering services through the SpiriVerse platform are **independent contractors**. ${PARTNER_DEFINITION}`
            );
        }
    }

    // Update closing paragraph
    content = content.replace(
        /Users, Practitioners, and SpiriVerse alike/,
        "Users, Partners, and SpiriVerse alike"
    );
    content = content.replace(
        /Users, Partners, and SpiriVerse alike/,
        "Users, Partners, and SpiriVerse alike"
    );

    return {
        content,
        changeSummary:
            "Replaced all Practitioner terminology with Partner. Added Partner definition.",
    };
}

function handlePrivacyPolicy(content: string): {
    content: string;
    changeSummary: string;
} {
    // ── Section 3: Definitions — consolidate Vendor+Practitioner → Partner ──
    content = content.replace(
        /- \*\*"Vendor"\*\* \(also "Merchant"\) means any business entity or individual that lists products or services for sale on the Platform\.\r?\n- \*\*"Practitioner"\*\* means any individual who offers spiritual services, readings, or consultations through the Platform\./,
        `- **"Partner"** means any individual or business that lists services, products, or experiences on SpiriVerse, including those offering products for sale and those providing spiritual services, readings, or consultations.`
    );

    // ── Section headers ──
    content = content.replace(
        /### 4\.2 Vendor and Merchant Data/,
        "### 4.2 Partner Data"
    );
    content = content.replace(
        /### 4\.3 Practitioner Data/,
        "### 4.3 Partner Service Data"
    );

    // ── Table headers in 4.2 ──
    content = content.replace(
        /When you register as a vendor or merchant/i,
        "When you register as a partner"
    );
    content = content.replace(
        /When you register as a practitioner/i,
        "When you register as a partner offering services"
    );

    // ── Retention table ──
    content = content.replace(
        /Vendor and merchant data/,
        "Partner data"
    );
    content = content.replace(
        /Duration of vendor relationship plus 7 years/i,
        "Duration of partner relationship plus 7 years"
    );
    content = content.replace(
        /Practitioner credentials/,
        "Partner credentials"
    );
    content = content.replace(
        /Duration of practitioner relationship plus 2 years/i,
        "Duration of partner relationship plus 2 years"
    );

    return {
        content,
        changeSummary:
            "Replaced all Vendor/Merchant/Practitioner terminology with Partner. Consolidated definitions in Section 3.",
    };
}

function handleIntellectualPropertyPolicy(content: string): {
    content: string;
    changeSummary: string;
} {
    // Add Partner definition in opening
    if (!content.includes(PARTNER_DEFINITION)) {
        content = content.replace(
            /This Policy applies to all users, including buyers, (?:vendors, practitioners|partners), and visitors/i,
            `This Policy applies to all users, including buyers, partners, and visitors`
        );
        // Insert definition after first sentence
        content = content.replace(
            /\(collectively, "Users"\) across all jurisdictions/,
            `(collectively, "Users"). ${PARTNER_DEFINITION}\r\n\r\nThis Policy applies across all jurisdictions`
        );
    }

    // ── Section headers ──
    content = content.replace(/## 3\. Merchant Content/, "## 3. Partner Content");
    content = content.replace(
        /## 4\. Practitioner Content/,
        "## 4. Partner Digital Content"
    );

    // ToC
    content = content.replace(
        /3\. \[Merchant Content\]/,
        "3. [Partner Content]"
    );
    content = content.replace(
        /#3-merchant-content/,
        "#3-partner-content"
    );
    content = content.replace(
        /4\. \[Practitioner Content\]/,
        "4. [Partner Digital Content]"
    );
    content = content.replace(
        /#4-practitioner-content/,
        "#4-partner-digital-content"
    );

    return {
        content,
        changeSummary:
            "Replaced all Vendor/Merchant/Practitioner terminology with Partner. Added Partner definition. Renamed content sections.",
    };
}

function handleCookiePolicy(content: string): {
    content: string;
    changeSummary: string;
} {
    // Only 1 mention: "practitioners" in sv_market cookie description
    // Generic replacement will handle it
    return {
        content,
        changeSummary:
            "Updated terminology: replaced practitioner references with partner.",
    };
}

// ─────────────────────────────────────────────────────
// Main migration
// ─────────────────────────────────────────────────────

export const migration: Migration = {
    id: "035_rebrand_legal_docs_to_partner",
    description:
        "Rebrand all legal documents: Vendor/Merchant/Practitioner → Partner. Update refund framework and platform fee policy. Creates v2 with audit trail.",

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
            "acceptable-use-policy": handleAcceptableUsePolicy,
            "spiritual-services-disclaimer": handleSpiritualServicesDisclaimer,
            "privacy-policy": handlePrivacyPolicy,
            "intellectual-property-policy": handleIntellectualPropertyPolicy,
            "cookie-policy": handleCookiePolicy,
        };

        for (const doc of allDocs) {
            context.log(`Processing: ${doc.id} (v${doc.version || 1})`);

            let content = doc.content;
            let changeSummary = DEFAULT_CHANGE_SUMMARY;

            // 1. Apply document-specific pre-processing
            const handler = handlers[doc.id];
            if (handler) {
                const result = handler(content);
                content = result.content;
                changeSummary = result.changeSummary;
            }

            // 2. Apply generic Partner replacements
            content = applyPartnerReplacements(content);

            // 3. Final cleanup
            content = content.replace(/Partners and Partners/g, "Partners");
            content = content.replace(/partners and partners/g, "partners");
            content = content.replace(/Partner and Partner/g, "Partner");
            content = content.replace(/partner and partner/g, "partner");
            content = content.replace(/Partner or Partner/g, "Partner");
            content = content.replace(/partner or partner/g, "partner");

            // Check if content actually changed
            if (content === doc.content) {
                context.log("  → No changes needed — skipping\n");
                continue;
            }

            await versionAndUpdate(context, doc, content, changeSummary);
            context.log("");
        }

        context.log("✓ All legal documents updated to Partner terminology");
    },
};

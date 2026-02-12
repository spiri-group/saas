/**
 * Migration: 022_subscription_tiers
 *
 * Replaces the old multi-plan subscription model with a 3-tier system:
 *   - Awaken ($16/mo, $154/yr) — practitioner profiles
 *   - Manifest ($39/mo, $374/yr) — merchant profiles
 *   - Transcend ($59/mo, $566/yr) — merchant profiles (premium)
 *
 * Changes:
 * 1. Seeds new tier pricing into System-Settings/spiriverse fees-config
 * 2. Removes old plan-based subscription fee entries
 * 3. Seeds tier definition document (feature gates per tier)
 * 4. Seeds 8 billing email templates
 */

import { Migration } from "../types";
import { v4 as uuid } from "uuid";

// ─── New tier pricing ─────────────────────────────────────────
const NEW_TIER_ENTRIES: Record<string, { percent: number; fixed: number; currency: string }> = {
    "subscription-awaken-monthly":    { percent: 0, fixed: 1600,  currency: "AUD" },
    "subscription-awaken-annual":     { percent: 0, fixed: 15400, currency: "AUD" },
    "subscription-manifest-monthly":  { percent: 0, fixed: 3900,  currency: "AUD" },
    "subscription-manifest-annual":   { percent: 0, fixed: 37400, currency: "AUD" },
    "subscription-transcend-monthly": { percent: 0, fixed: 5900,  currency: "AUD" },
    "subscription-transcend-annual":  { percent: 0, fixed: 56600, currency: "AUD" },
};

// ─── Old plan entries to remove ───────────────────────────────
const OLD_PLAN_KEYS = [
    "subscription-spiriverse-core",
    "subscription-spiriassts",
    "subscription-tours-premium",
    "subscription-shopkeeper-premium",
    "subscription-pro",
];

// ─── Tier definitions ─────────────────────────────────────────
const TIER_DEFINITIONS = {
    id: "subscription-tier-definitions",
    docType: "subscription-config",
    tiers: {
        awaken: {
            name: "Awaken",
            description: "For practitioners offering spiritual services and readings",
            profileType: "practitioner",
            features: {
                canCreateMerchantProfile: false,
                maxProducts: 0,
                canHostPractitioners: false,
                hasInventoryAutomation: false,
                hasShippingAutomation: false,
            },
        },
        manifest: {
            name: "Manifest",
            description: "For merchants selling spiritual products with inventory management",
            profileType: "merchant",
            features: {
                canCreateMerchantProfile: true,
                maxProducts: 15,
                canHostPractitioners: false,
                hasInventoryAutomation: false,
                hasShippingAutomation: false,
            },
        },
        transcend: {
            name: "Transcend",
            description: "For established merchants seeking to grow",
            profileType: "merchant",
            features: {
                canCreateMerchantProfile: true,
                maxProducts: null, // unlimited
                canHostPractitioners: true,
                hasInventoryAutomation: true,
                hasShippingAutomation: true,
            },
        },
    },
};

// ─── Email template helpers (same pattern as 005) ─────────────

const now = new Date().toISOString();

const p = (text: string) =>
    `<p class="editor-paragraph" dir="ltr"><span style="white-space: pre-wrap;">${text}</span></p>`;

const BRAND_PALETTE = [
    { id: "brand-purple", label: "Brand Purple", color: "#6b21a8" },
    { id: "brand-white", label: "White", color: "#ffffff" },
    { id: "brand-dark", label: "Dark", color: "#1e293b" },
    { id: "brand-success", label: "Success Green", color: "#16a34a" },
    { id: "brand-info", label: "Info Blue", color: "#2563eb" },
    { id: "brand-warning", label: "Warm Amber", color: "#d97706" },
    { id: "brand-light-bg", label: "Light Background", color: "#f8fafc" },
    { id: "brand-border", label: "Border Gray", color: "#e2e8f0" },
];

const baseDefaults = {
    titleAlign: "left" as const,
    titleSize: "large" as const,
    subtitleAlign: "left" as const,
    subtitleSize: "medium" as const,
    descriptionAlign: "justify" as const,
    isQuote: false,
    socialIconSize: 32,
    socialAlign: "center" as const,
};

function makeTemplate(
    id: string,
    subject: string,
    category: string,
    blocks: any[],
    variables: { key: string; label: string }[] = []
) {
    return {
        id,
        docType: "email-template",
        subject,
        category,
        blocks,
        palette: BRAND_PALETTE,
        variables,
        headerId: "default-header",
        footerId: "default-footer",
        createdAt: now,
        updatedAt: now,
    };
}

// ─── Billing email templates ──────────────────────────────────

const BILLING_EMAIL_TEMPLATES = [
    makeTemplate(
        "subscription-payment-failed-first",
        "Payment failed for {{ vendor.name }}",
        "subscription",
        [
            {
                id: uuid(), blockType: "text", ...baseDefaults,
                label: "Heading", title: "Payment Issue", titleAlign: "center", titleSize: "xlarge",
            },
            {
                id: uuid(), blockType: "text", ...baseDefaults,
                label: "Body",
                description: [
                    "Hi {{ vendor.contactName }},",
                    "We were unable to process your subscription payment of {{ payment.amount }} for {{ vendor.name }}. This can happen if your card has expired or has insufficient funds.",
                    "We\u2019ll try again soon. In the meantime, you can update your payment method from your dashboard.",
                ].map(p).join(""),
            },
            {
                id: uuid(), blockType: "button", ...baseDefaults,
                label: "CTA", title: "Update Payment Method",
                url: "{{ dashboardUrl }}", buttonColor: "#6b21a8", buttonTextColor: "#ffffff",
            },
        ],
        [
            { key: "vendor.name", label: "Vendor Name" },
            { key: "vendor.contactName", label: "Contact Name" },
            { key: "payment.amount", label: "Payment Amount" },
            { key: "dashboardUrl", label: "Dashboard URL" },
        ]
    ),
    makeTemplate(
        "subscription-payment-failed-second",
        "Second payment attempt failed for {{ vendor.name }}",
        "subscription",
        [
            {
                id: uuid(), blockType: "text", ...baseDefaults,
                label: "Heading", title: "Payment Still Failing", titleAlign: "center", titleSize: "xlarge",
            },
            {
                id: uuid(), blockType: "text", ...baseDefaults,
                label: "Body",
                description: [
                    "Hi {{ vendor.contactName }},",
                    "This is our second attempt to process your subscription payment of {{ payment.amount }} for {{ vendor.name }}, and it has failed again.",
                    "If payment is not successful on the next attempt, your account will be suspended and payouts will be paused. Please update your payment method as soon as possible.",
                ].map(p).join(""),
            },
            {
                id: uuid(), blockType: "button", ...baseDefaults,
                label: "CTA", title: "Update Payment Method",
                url: "{{ dashboardUrl }}", buttonColor: "#6b21a8", buttonTextColor: "#ffffff",
            },
        ],
        [
            { key: "vendor.name", label: "Vendor Name" },
            { key: "vendor.contactName", label: "Contact Name" },
            { key: "payment.amount", label: "Payment Amount" },
            { key: "dashboardUrl", label: "Dashboard URL" },
        ]
    ),
    makeTemplate(
        "subscription-payment-failed-final",
        "Account suspended: {{ vendor.name }}",
        "subscription",
        [
            {
                id: uuid(), blockType: "text", ...baseDefaults,
                label: "Heading", title: "Account Suspended", titleAlign: "center", titleSize: "xlarge",
            },
            {
                id: uuid(), blockType: "text", ...baseDefaults,
                label: "Body",
                description: [
                    "Hi {{ vendor.contactName }},",
                    "After three unsuccessful payment attempts, your account {{ vendor.name }} has been suspended and payouts have been paused.",
                    "To reactivate your account, please update your payment method and retry the payment from your dashboard.",
                ].map(p).join(""),
            },
            {
                id: uuid(), blockType: "button", ...baseDefaults,
                label: "CTA", title: "Reactivate Account",
                url: "{{ dashboardUrl }}", buttonColor: "#6b21a8", buttonTextColor: "#ffffff",
            },
        ],
        [
            { key: "vendor.name", label: "Vendor Name" },
            { key: "vendor.contactName", label: "Contact Name" },
            { key: "dashboardUrl", label: "Dashboard URL" },
        ]
    ),
    makeTemplate(
        "subscription-account-suspended",
        "Your account {{ vendor.name }} has been suspended",
        "subscription",
        [
            {
                id: uuid(), blockType: "text", ...baseDefaults,
                label: "Heading", title: "Account Suspended", titleAlign: "center", titleSize: "xlarge",
            },
            {
                id: uuid(), blockType: "text", ...baseDefaults,
                label: "Body",
                description: [
                    "Hi {{ vendor.contactName }},",
                    "Your account {{ vendor.name }} has been suspended due to outstanding subscription payments. While suspended, your payouts are paused and your storefront is not visible to customers.",
                    "To restore your account, please update your payment method and settle the outstanding balance.",
                ].map(p).join(""),
            },
            {
                id: uuid(), blockType: "button", ...baseDefaults,
                label: "CTA", title: "Restore Account",
                url: "{{ dashboardUrl }}", buttonColor: "#6b21a8", buttonTextColor: "#ffffff",
            },
        ],
        [
            { key: "vendor.name", label: "Vendor Name" },
            { key: "vendor.contactName", label: "Contact Name" },
            { key: "dashboardUrl", label: "Dashboard URL" },
        ]
    ),
    makeTemplate(
        "subscription-payment-succeeded",
        "Payment received for {{ vendor.name }}",
        "subscription",
        [
            {
                id: uuid(), blockType: "text", ...baseDefaults,
                label: "Heading", title: "Payment Successful", titleAlign: "center", titleSize: "xlarge",
            },
            {
                id: uuid(), blockType: "text", ...baseDefaults,
                label: "Body",
                description: [
                    "Hi {{ vendor.contactName }},",
                    "Your subscription payment of {{ payment.amount }} for {{ vendor.name }} has been successfully processed.",
                    "Your next billing date is {{ payment.nextBillingDate }}. Thank you for being part of SpiriVerse!",
                ].map(p).join(""),
            },
        ],
        [
            { key: "vendor.name", label: "Vendor Name" },
            { key: "vendor.contactName", label: "Contact Name" },
            { key: "payment.amount", label: "Payment Amount" },
            { key: "payment.nextBillingDate", label: "Next Billing Date" },
        ]
    ),
    makeTemplate(
        "subscription-welcome",
        "Welcome to SpiriVerse, {{ vendor.name }}!",
        "subscription",
        [
            {
                id: uuid(), blockType: "text", ...baseDefaults,
                label: "Heading", title: "Welcome to SpiriVerse!", titleAlign: "center", titleSize: "xlarge",
            },
            {
                id: uuid(), blockType: "text", ...baseDefaults,
                label: "Body",
                description: [
                    "Hi {{ vendor.contactName }},",
                    "Welcome to the {{ subscription.tierName }} plan! Your subscription for {{ vendor.name }} is now active.",
                    "You won\u2019t be charged until your profile earns {{ subscription.threshold }} through payouts. Once that threshold is reached, your {{ subscription.interval }} billing of {{ subscription.price }} will begin automatically.",
                ].map(p).join(""),
            },
            {
                id: uuid(), blockType: "button", ...baseDefaults,
                label: "CTA", title: "Go to Dashboard",
                url: "{{ dashboardUrl }}", buttonColor: "#6b21a8", buttonTextColor: "#ffffff",
            },
        ],
        [
            { key: "vendor.name", label: "Vendor Name" },
            { key: "vendor.contactName", label: "Contact Name" },
            { key: "subscription.tierName", label: "Tier Name" },
            { key: "subscription.threshold", label: "Billing Threshold" },
            { key: "subscription.interval", label: "Billing Interval" },
            { key: "subscription.price", label: "Subscription Price" },
            { key: "dashboardUrl", label: "Dashboard URL" },
        ]
    ),
    makeTemplate(
        "subscription-downgrade-reminder",
        "Your {{ vendor.name }} plan will downgrade soon",
        "subscription",
        [
            {
                id: uuid(), blockType: "text", ...baseDefaults,
                label: "Heading", title: "Upcoming Plan Change", titleAlign: "center", titleSize: "xlarge",
            },
            {
                id: uuid(), blockType: "text", ...baseDefaults,
                label: "Body",
                description: [
                    "Hi {{ vendor.contactName }},",
                    "Just a reminder that your {{ vendor.name }} plan will be downgraded from {{ downgrade.fromTier }} to {{ downgrade.toTier }} on {{ downgrade.effectiveDate }}.",
                    "If you\u2019d like to keep your current plan, you can cancel the downgrade from your dashboard before that date.",
                ].map(p).join(""),
            },
            {
                id: uuid(), blockType: "button", ...baseDefaults,
                label: "CTA", title: "Manage Subscription",
                url: "{{ dashboardUrl }}", buttonColor: "#6b21a8", buttonTextColor: "#ffffff",
            },
        ],
        [
            { key: "vendor.name", label: "Vendor Name" },
            { key: "vendor.contactName", label: "Contact Name" },
            { key: "downgrade.fromTier", label: "Current Tier" },
            { key: "downgrade.toTier", label: "Target Tier" },
            { key: "downgrade.effectiveDate", label: "Effective Date" },
            { key: "dashboardUrl", label: "Dashboard URL" },
        ]
    ),
    makeTemplate(
        "subscription-downgrade-effective",
        "Your {{ vendor.name }} plan has been downgraded",
        "subscription",
        [
            {
                id: uuid(), blockType: "text", ...baseDefaults,
                label: "Heading", title: "Plan Downgraded", titleAlign: "center", titleSize: "xlarge",
            },
            {
                id: uuid(), blockType: "text", ...baseDefaults,
                label: "Body",
                description: [
                    "Hi {{ vendor.contactName }},",
                    "Your {{ vendor.name }} plan has been downgraded from {{ downgrade.fromTier }} to {{ downgrade.toTier }} effective today.",
                    "Your new {{ subscription.interval }} billing amount is {{ subscription.price }}. Some features may no longer be available under the {{ downgrade.toTier }} plan.",
                ].map(p).join(""),
            },
            {
                id: uuid(), blockType: "button", ...baseDefaults,
                label: "CTA", title: "View Plan Details",
                url: "{{ dashboardUrl }}", buttonColor: "#6b21a8", buttonTextColor: "#ffffff",
            },
        ],
        [
            { key: "vendor.name", label: "Vendor Name" },
            { key: "vendor.contactName", label: "Contact Name" },
            { key: "downgrade.fromTier", label: "Previous Tier" },
            { key: "downgrade.toTier", label: "New Tier" },
            { key: "subscription.interval", label: "Billing Interval" },
            { key: "subscription.price", label: "New Price" },
            { key: "dashboardUrl", label: "Dashboard URL" },
        ]
    ),
];

// ─── Migration ────────────────────────────────────────────────

export const migration: Migration = {
    id: "022_subscription_tiers",
    description: "Replaces multi-plan subscription model with Awaken/Manifest/Transcend tier system",

    async up(context) {
        // 1. Update fee config: add new tier pricing, remove old plan entries
        context.log("Updating fee config with tier pricing...");

        const results = await context.runQuery<any>(
            "System-Settings",
            "SELECT * FROM c WHERE c.id = @id AND c.docType = @docType",
            [
                { name: "@id", value: "spiriverse" },
                { name: "@docType", value: "fees-config" },
            ]
        );

        if (results.length === 0) {
            context.log("Fee config document not found - creating with tier entries");
            await context.seedData({
                container: "System-Settings",
                partitionKeyField: "docType",
                records: [
                    {
                        id: "spiriverse",
                        docType: "fees-config",
                        ...NEW_TIER_ENTRIES,
                    },
                ],
                upsert: false,
            });
        } else {
            const existing = results[0];
            let changes = 0;

            // Add new tier entries
            for (const [key, value] of Object.entries(NEW_TIER_ENTRIES)) {
                if (existing[key]) {
                    context.log(`  "${key}" already exists - skipping`);
                } else {
                    existing[key] = value;
                    changes++;
                    context.log(`  Added "${key}": ${JSON.stringify(value)}`);
                }
            }

            // Remove old plan entries
            for (const key of OLD_PLAN_KEYS) {
                if (existing[key]) {
                    delete existing[key];
                    changes++;
                    context.log(`  Removed old entry "${key}"`);
                }
            }

            if (changes > 0) {
                context.log(`Upserting fee config with ${changes} changes`);
                await context.seedData({
                    container: "System-Settings",
                    partitionKeyField: "docType",
                    records: [existing],
                    upsert: true,
                });
            } else {
                context.log("Fee config already up to date");
            }
        }

        // 2. Seed tier definition document
        context.log("Seeding tier definitions...");
        await context.seedData({
            container: "System-Settings",
            partitionKeyField: "docType",
            records: [TIER_DEFINITIONS],
            upsert: true,
        });

        // 3. Seed billing email templates
        context.log("Seeding billing email templates...");
        await context.seedData({
            container: "System-Settings",
            partitionKeyField: "docType",
            records: BILLING_EMAIL_TEMPLATES,
            upsert: false,
        });

        context.log("Migration 022 complete");
    },
};

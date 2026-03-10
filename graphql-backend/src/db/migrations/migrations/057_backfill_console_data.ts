/**
 * Migration: 057_backfill_console_data
 *
 * Fixes console manager data issues:
 * 1. Backfills `name` field on all email templates (required by GraphQL schema)
 * 2. Adds `kind` and `label` to legacy flat choice configs (helpRequestCategory, unit)
 * 3. Seeds hierarchical choice configs that were created via UI in dev but missing in prod
 */

import { Migration } from "../types";

// Human-readable names for email templates (derived from IDs)
const EMAIL_TEMPLATE_NAMES: Record<string, string> = {
    "payment-link-request": "Payment Link Request",
    "payment-link-paid-customer": "Payment Link Paid (Customer)",
    "payment-link-paid-vendor": "Payment Link Paid (Vendor)",
    "live-assist-confirmation": "Live Assist Confirmation",
    "live-assist-reading-complete": "Live Assist Reading Complete",
    "live-assist-released": "Live Assist Released",
    "expo-sale-receipt": "Expo Sale Receipt",
    "expo-sale-vendor-notification": "Expo Sale Vendor Notification",
    "expo-summary": "Expo Summary",
    "JOURNEY_PURCHASED_PRACTITIONER": "Journey Purchased (Practitioner)",
    "JOURNEY_PURCHASED_CUSTOMER": "Journey Purchased (Customer)",
    "subscription-account-suspended": "Account Suspended",
    "booking-cancelled-customer": "Booking Cancelled (Customer)",
    "booking-cancelled-practitioner": "Booking Cancelled (Practitioner)",
    "booking-confirmed-customer": "Booking Confirmed (Customer)",
    "booking-pending-practitioner": "Booking Pending (Practitioner)",
    "booking-reminder-1h": "Booking Reminder (1 Hour)",
    "case-application-accepted": "Case Application Accepted",
    "case-created": "Case Created",
    "subscription-downgrade-effective": "Subscription Downgrade Effective",
    "subscription-downgrade-reminder": "Subscription Downgrade Reminder",
    "merchant-welcome-message": "Merchant Welcome Message",
    "merchant-request": "Merchant Request",
    "merchant-signup": "Merchant Signup",
    "order-confirmation": "Order Confirmation",
    "order-shipped": "Order Shipped",
    "subscription-payment-failed-final": "Payment Failed (Final)",
    "subscription-payment-failed-first": "Payment Failed (First)",
    "subscription-payment-failed-second": "Payment Failed (Second)",
    "subscription-payment-succeeded": "Payment Succeeded",
    "product-purchase-success": "Product Purchase Success",
    "refund-approved": "Refund Approved",
    "refund-processed": "Refund Processed",
    "subscription-welcome": "Subscription Welcome",
    "tour-booking-created-customer": "Tour Booking Created (Customer)",
    "tour-reminder-24h": "Tour Reminder (24 Hours)",
    "verification-code": "Verification Code",
};

// Hierarchical choice configs to seed (these exist in dev but not prod)
const HIERARCHICAL_CHOICE_CONFIGS = [
    { id: "product-categories", kind: "HIERARCHICAL", label: "Product Categories" },
    { id: "religions", kind: "HIERARCHICAL", label: "Religions" },
    { id: "merchant-types", kind: "HIERARCHICAL", label: "Merchant Types" },
];

// Flat choice configs to seed (these exist in dev but not prod)
const FLAT_CHOICE_CONFIGS = [
    { id: "help-request-category", kind: "FLAT", label: "Help Request Category" },
    { id: "supported-countries", kind: "FLAT", label: "Supported Countries" },
    { id: "case-status", kind: "FLAT", label: "Case Status" },
    { id: "timeframe", kind: "FLAT", label: "Timeframe" },
    { id: "order-status", kind: "FLAT", label: "Order Status" },
    { id: "merchant-services", kind: "FLAT", label: "Merchant Services" },
    { id: "languages", kind: "FLAT", label: "Languages" },
    { id: "visibility", kind: "FLAT", label: "Visibility" },
];

export const migration: Migration = {
    id: "057_backfill_console_data",
    description: "Backfills email template names, fixes choice config fields, seeds missing configs",

    async up(context) {
        // 1. Backfill `name` on email templates
        context.log("Step 1: Backfilling name field on email templates...");
        const templates = await context.runQuery<any>(
            "System-Settings",
            "SELECT * FROM c WHERE c.docType = 'email-template'"
        );

        let templateCount = 0;
        for (const template of templates) {
            if (template.name) continue; // Already has a name

            const name = EMAIL_TEMPLATE_NAMES[template.id]
                || template.id.replace(/[-_]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());

            await context.patchItem(
                "System-Settings",
                template.id,
                "email-template",
                [{ op: "set", path: "/name", value: name }]
            );
            templateCount++;
        }
        context.log(`  Patched ${templateCount} email templates with name field`);

        // 2. Fix legacy flat choice configs (helpRequestCategory, unit)
        context.log("Step 2: Adding kind/label to legacy flat choice configs...");
        const legacyConfigs = [
            { id: "helpRequestCategory", kind: "FLAT", label: "Help Request Category" },
            { id: "unit", kind: "FLAT", label: "Unit" },
        ];

        for (const config of legacyConfigs) {
            try {
                const existing = await context.runQuery<any>(
                    "System-Settings",
                    "SELECT * FROM c WHERE c.id = @id AND c.docType = 'choice-config'",
                    [{ name: "@id", value: config.id }]
                );

                if (existing.length > 0 && !existing[0].kind) {
                    await context.patchItem(
                        "System-Settings",
                        config.id,
                        "choice-config",
                        [
                            { op: "set", path: "/kind", value: config.kind },
                            { op: "set", path: "/label", value: config.label },
                            { op: "set", path: "/createdAt", value: existing[0].createdAt || new Date().toISOString() },
                            { op: "set", path: "/updatedAt", value: new Date().toISOString() },
                        ]
                    );
                    context.log(`  Patched ${config.id} with kind=${config.kind}, label=${config.label}`);
                } else {
                    context.log(`  ${config.id} already has kind or doesn't exist — skipping`);
                }
            } catch (error) {
                context.log(`  Warning: Could not patch ${config.id}: ${error}`);
            }
        }

        // 3. Seed hierarchical choice configs (if missing)
        context.log("Step 3: Seeding hierarchical choice configs...");
        const now = new Date().toISOString();

        for (const config of HIERARCHICAL_CHOICE_CONFIGS) {
            const existing = await context.runQuery<any>(
                "System-Settings",
                "SELECT * FROM c WHERE c.id = @id AND c.docType = 'choice-config'",
                [{ name: "@id", value: config.id }]
            );

            if (existing.length > 0) {
                // Ensure it has kind/label
                if (!existing[0].kind) {
                    await context.patchItem(
                        "System-Settings",
                        config.id,
                        "choice-config",
                        [
                            { op: "set", path: "/kind", value: config.kind },
                            { op: "set", path: "/label", value: config.label },
                            { op: "set", path: "/updatedAt", value: now },
                        ]
                    );
                    context.log(`  Patched existing ${config.id} with kind/label`);
                } else {
                    context.log(`  ${config.id} already exists with kind — skipping`);
                }
                continue;
            }

            await context.seedData({
                container: "System-Settings",
                partitionKeyField: "docType",
                records: [{
                    id: config.id,
                    docType: "choice-config",
                    kind: config.kind,
                    label: config.label,
                    createdAt: now,
                    updatedAt: now,
                }],
            });
            context.log(`  Seeded ${config.id} (${config.kind})`);
        }

        // 4. Seed flat choice configs (if missing)
        context.log("Step 4: Seeding flat choice configs...");
        for (const config of FLAT_CHOICE_CONFIGS) {
            const existing = await context.runQuery<any>(
                "System-Settings",
                "SELECT * FROM c WHERE c.id = @id AND c.docType = 'choice-config'",
                [{ name: "@id", value: config.id }]
            );

            if (existing.length > 0) {
                if (!existing[0].kind) {
                    await context.patchItem(
                        "System-Settings",
                        config.id,
                        "choice-config",
                        [
                            { op: "set", path: "/kind", value: config.kind },
                            { op: "set", path: "/label", value: config.label },
                            { op: "set", path: "/updatedAt", value: now },
                        ]
                    );
                    context.log(`  Patched existing ${config.id} with kind/label`);
                } else {
                    context.log(`  ${config.id} already exists — skipping`);
                }
                continue;
            }

            await context.seedData({
                container: "System-Settings",
                partitionKeyField: "docType",
                records: [{
                    id: config.id,
                    docType: "choice-config",
                    kind: config.kind,
                    label: config.label,
                    options: [],
                    createdAt: now,
                    updatedAt: now,
                }],
            });
            context.log(`  Seeded ${config.id} (${config.kind})`);
        }

        context.log("Migration complete");
    },
};

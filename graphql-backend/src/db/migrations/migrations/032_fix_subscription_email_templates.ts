/**
 * Migration: 032_fix_subscription_email_templates
 *
 * Fixes 8 subscription email templates seeded by migration 022 that are
 * missing required GraphQL fields (name, html, isActive, updatedBy) and
 * have data in the wrong format (blocks/palette arrays instead of
 * serialized html JSON string, variables as {key,label} instead of string[]).
 *
 * This causes "Cannot return null for non-nullable field EmailTemplate.name"
 * errors in both dev and prod, breaking the entire email templates page.
 */

import { Migration } from "../types";

const TEMPLATE_NAMES: Record<string, string> = {
    "subscription-payment-failed-first": "Payment Failed - First Notice",
    "subscription-payment-failed-second": "Payment Failed - Second Notice",
    "subscription-payment-failed-final": "Payment Failed - Final Notice",
    "subscription-account-suspended": "Account Suspended",
    "subscription-payment-succeeded": "Payment Succeeded",
    "subscription-welcome": "Subscription Welcome",
    "subscription-downgrade-reminder": "Downgrade Reminder",
    "subscription-downgrade-effective": "Downgrade Effective",
};

function buildLayout(blocks: any[]): any {
    if (blocks.length === 2) {
        return {
            type: "two-stacked",
            slots: {
                top: blocks[0].id,
                bottom: blocks[1].id,
            },
            dividers: [],
            padding: { top: 20, bottom: 20, left: 20, right: 20 },
        };
    }
    // Default to three-stacked for 3 blocks
    return {
        type: "three-stacked",
        slots: {
            top: blocks[0].id,
            middle: blocks[1].id,
            bottom: blocks[2].id,
        },
        dividers: [],
        padding: { top: 20, bottom: 20, left: 20, right: 20 },
    };
}

export const migration: Migration = {
    id: "032_fix_subscription_email_templates",
    description:
        "Fixes subscription email templates missing name/html/isActive fields from migration 022",

    async up(context) {
        const templateIds = Object.keys(TEMPLATE_NAMES);

        for (const templateId of templateIds) {
            const results = await context.runQuery<any>(
                "System-Settings",
                "SELECT * FROM c WHERE c.id = @id AND c.docType = @docType",
                [
                    { name: "@id", value: templateId },
                    { name: "@docType", value: "email-template" },
                ]
            );

            if (results.length === 0) {
                context.log(`${templateId}: not found – skipping`);
                continue;
            }

            const doc = results[0];

            // Skip if already fixed (has name and html)
            if (doc.name && doc.html) {
                context.log(`${templateId}: already has name + html – skipping`);
                continue;
            }

            // Transform blocks + palette → html JSON string
            const blocks = doc.blocks || [];
            const palette = doc.palette || [];

            if (blocks.length === 0) {
                context.log(`${templateId}: no blocks found – skipping`);
                continue;
            }

            const emailStructure = {
                contentBlocks: blocks,
                layout: buildLayout(blocks),
                colorPalette: palette,
            };

            const html =
                "<!-- Email Structure -->\n" +
                JSON.stringify(emailStructure, null, 2);

            // Transform variables from [{key, label}] to string[]
            const variables = Array.isArray(doc.variables)
                ? doc.variables.map((v: any) =>
                      typeof v === "string" ? v : v.key
                  )
                : [];

            // Build fixed document
            const fixed = {
                ...doc,
                name: TEMPLATE_NAMES[templateId],
                html,
                variables,
                isActive: true,
                updatedBy: doc.updatedBy || "system-migration",
                updatedAt: new Date().toISOString(),
            };

            // Remove raw blocks/palette (now in html)
            delete fixed.blocks;
            delete fixed.palette;

            // Remove Cosmos metadata before upsert
            delete fixed._rid;
            delete fixed._self;
            delete fixed._etag;
            delete fixed._attachments;
            delete fixed._ts;

            await context.seedData({
                container: "System-Settings",
                partitionKeyField: "docType",
                records: [fixed],
                upsert: true,
            });

            context.log(
                `${templateId}: Fixed → name="${fixed.name}", html=${html.length} chars, ${variables.length} vars`
            );
        }
    },
};

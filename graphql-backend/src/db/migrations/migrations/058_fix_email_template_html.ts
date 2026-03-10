/**
 * Migration: 058_fix_email_template_html
 *
 * Fixes email templates that were seeded with `blocks`/`palette` fields
 * but missing the `html` field required by the GraphQL schema.
 *
 * Migrations 042, 045, 049, 052, 053, 056 all used a `makeTemplate()` helper
 * that stored blocks and palette as separate fields instead of wrapping them
 * in the `<!-- Email Structure -->` JSON format that the frontend editor expects.
 *
 * This migration:
 * 1. Converts `blocks` + `palette` into the proper `html` field
 * 2. Normalises `variables` from [{key,label}] objects to plain strings
 * 3. Ensures `name`, `isActive`, `updatedBy` are set on all templates
 */

import { Migration } from "../types";

// Slot maps for layout types (matches the frontend editor)
const SLOT_MAPS: Record<string, string[]> = {
    "single-full": ["main"],
    "two-stacked": ["top", "bottom"],
    "three-stacked": ["top", "middle", "bottom"],
    "four-grid": ["top-left", "top-right", "bottom-left", "bottom-right"],
    "hero-two-column": ["hero", "left", "right"],
    "hero-three-column": ["hero", "left", "center", "right"],
};

// Human-readable names for template IDs
const TEMPLATE_NAMES: Record<string, string> = {
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
};

/**
 * Convert blocks + palette into the `<!-- Email Structure -->` format
 * that the frontend editor expects in the `html` field.
 */
function createStructure(blocks: any[], palette: any[]): string {
    const layoutType = "single-full";
    const slotNames = SLOT_MAPS[layoutType];
    const slots: Record<string, string> = {};
    blocks.forEach((block: any, i: number) => {
        if (i < slotNames.length) {
            slots[slotNames[i]] = block.id;
        }
    });

    const structure = {
        contentBlocks: blocks,
        layout: {
            type: layoutType,
            slots,
            dividers: [],
            padding: { top: 20, bottom: 20, left: 20, right: 20 },
        },
        colorPalette: palette,
    };
    return `<!-- Email Structure -->\n${JSON.stringify(structure, null, 2)}`;
}

/**
 * Normalise variables from [{key, label}] objects to plain string array.
 */
function normaliseVariables(variables: any): string[] {
    if (!variables || !Array.isArray(variables)) return [];
    return variables.map((v: any) => {
        if (typeof v === "string") return v;
        if (v && typeof v === "object" && v.key) return v.key;
        return String(v);
    });
}

export const migration: Migration = {
    id: "058_fix_email_template_html",
    description: "Converts blocks-based email templates to proper html format with all required fields",

    async up(context) {
        const now = new Date().toISOString();

        // Fetch all email templates
        const templates = await context.runQuery<any>(
            "System-Settings",
            "SELECT * FROM c WHERE c.docType = 'email-template'"
        );

        context.log(`Found ${templates.length} email templates total`);

        let fixedCount = 0;

        for (const template of templates) {
            const patches: { op: string; path: string; value: any }[] = [];

            // Fix 1: Convert blocks to html if html is missing
            if (!template.html && template.blocks && Array.isArray(template.blocks)) {
                const palette = template.palette || [];
                const html = createStructure(template.blocks, palette);
                patches.push({ op: "set", path: "/html", value: html });
                context.log(`  ${template.id}: generating html from ${template.blocks.length} blocks`);
            }

            // Fix 2: Ensure name exists
            if (!template.name) {
                const name = TEMPLATE_NAMES[template.id]
                    || template.id.replace(/[-_]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
                patches.push({ op: "set", path: "/name", value: name });
            }

            // Fix 3: Normalise variables from [{key,label}] to [string]
            if (template.variables && Array.isArray(template.variables) && template.variables.length > 0) {
                const first = template.variables[0];
                if (typeof first === "object" && first !== null && first.key) {
                    const normalised = normaliseVariables(template.variables);
                    patches.push({ op: "set", path: "/variables", value: normalised });
                }
            }

            // Fix 4: Ensure isActive exists
            if (template.isActive === undefined || template.isActive === null) {
                patches.push({ op: "set", path: "/isActive", value: true });
            }

            // Fix 5: Ensure updatedBy exists
            if (!template.updatedBy) {
                patches.push({ op: "set", path: "/updatedBy", value: "system-migration" });
            }

            if (patches.length > 0) {
                patches.push({ op: "set", path: "/updatedAt", value: now });

                await context.patchItem(
                    "System-Settings",
                    template.id,
                    "email-template",
                    patches
                );
                fixedCount++;
                context.log(`  ${template.id}: applied ${patches.length} patches`);
            }
        }

        context.log(`Fixed ${fixedCount} of ${templates.length} email templates`);
    },
};

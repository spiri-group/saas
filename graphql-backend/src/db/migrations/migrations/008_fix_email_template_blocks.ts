/**
 * Migration: 008_fix_email_template_blocks
 *
 * Re-seeds email templates with correct block structure matching
 * the editor's Zod schema output (UUID IDs, all defaults, rich text HTML, dividers array).
 */

import { Migration } from "../types";
import { migration as migration005 } from "./005_seed_email_templates";

export const migration: Migration = {
    id: "008_fix_email_template_blocks",
    description: "Re-seeds email templates with correct block structure matching editor output",

    async up(context) {
        context.log("Re-seeding templates with correct block structure...");
        await migration005.up(context);
    }
};

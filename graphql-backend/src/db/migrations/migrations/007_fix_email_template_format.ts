/**
 * Migration: 007_fix_email_template_format
 *
 * Re-seeds email templates with correct HTML format.
 * The html field needs the <!-- Email Structure --> prefix for the editor to parse it.
 */

import { Migration } from "../types";
import { migration as migration005 } from "./005_seed_email_templates";

export const migration: Migration = {
    id: "007_fix_email_template_format",
    description: "Re-seeds email templates with correct <!-- Email Structure --> prefix in html field",

    async up(context) {
        context.log("Re-seeding templates with correct format...");
        await migration005.up(context);
    }
};

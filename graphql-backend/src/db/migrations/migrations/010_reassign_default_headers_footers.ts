/**
 * Migration: 010_reassign_default_headers_footers
 *
 * Re-seeds templates pointing to whichever header/footer is currently
 * marked as default. This allows old seeded headers/footers to be deleted.
 */

import { Migration } from "../types";
import { migration as migration005 } from "./005_seed_email_templates";

export const migration: Migration = {
    id: "010_reassign_default_headers_footers",
    description: "Re-seeds templates pointing to current default header/footer",

    async up(context) {
        context.log("Re-seeding templates with current default header/footer...");
        await migration005.up(context);
    },
};

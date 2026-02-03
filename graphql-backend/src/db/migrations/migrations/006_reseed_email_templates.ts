/**
 * Migration: 006_reseed_email_templates
 *
 * Re-seeds all email templates with upsert to ensure consistent format.
 * This overwrites any existing templates that may have been manually created
 * prior to migration 005.
 */

import { Migration } from "../types";

// Import templates from 005
import { migration as migration005 } from "./005_seed_email_templates";

export const migration: Migration = {
    id: "006_reseed_email_templates",
    description: "Re-seeds all email templates with upsert to ensure consistent format",

    async up(context) {
        context.log("Re-seeding all email templates with upsert enabled...");
        // Just call the same logic from 005 - it now has upsert: true
        await migration005.up(context);
    }
};

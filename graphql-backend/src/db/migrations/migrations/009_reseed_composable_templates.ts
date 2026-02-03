/**
 * Migration: 009_reseed_composable_templates
 *
 * Re-seeds email templates with properly composable block structure.
 * Each template now has separate heading, body, and CTA blocks
 * so they can be independently edited and rearranged.
 */

import { Migration } from "../types";
import { migration as migration005 } from "./005_seed_email_templates";

export const migration: Migration = {
    id: "009_reseed_composable_templates",
    description: "Re-seeds email templates with composable heading/body/cta blocks",

    async up(context) {
        context.log("Re-seeding templates with composable block structure...");
        await migration005.up(context);
    }
};

/**
 * Migration: 011_reseed_warmer_copy
 *
 * Re-seeds email templates with warmer, more informative copy.
 */

import { Migration } from "../types";
import { migration as migration005 } from "./005_seed_email_templates";

export const migration: Migration = {
    id: "011_reseed_warmer_copy",
    description: "Re-seeds email templates with warmer, more informative copy",

    async up(context) {
        context.log("Re-seeding templates with updated copy...");
        await migration005.up(context);
    },
};

/**
 * Migration: 012_reseed_enhanced_templates
 *
 * Re-seeds email templates with enhanced block types:
 *   - Hero banners with embedded CTA buttons
 *   - Info cards for structured key/value data
 *   - Font controls (monospace verification code)
 *   - Global color palette on every template
 */

import { Migration } from "../types";
import { migration as migration005 } from "./005_seed_email_templates";

export const migration: Migration = {
    id: "012_reseed_enhanced_templates",
    description: "Re-seeds email templates with hero buttons, info cards, font controls, and color palette",

    async up(context) {
        context.log("Re-seeding templates with enhanced block types...");
        await migration005.up(context);
    },
};

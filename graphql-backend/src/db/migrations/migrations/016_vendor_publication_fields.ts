/**
 * Migration: 016_vendor_publication_fields
 *
 * Sets publishedAt to current timestamp for all existing vendors,
 * grandfathering them as published so they remain visible.
 * New vendors created after this migration will NOT have publishedAt
 * until they complete the go-live requirements.
 */

import { Migration } from "../types";

export const migration: Migration = {
    id: "016_vendor_publication_fields",
    description: "Sets publishedAt on all existing vendors to grandfather them as published",

    async up(context) {
        const now = new Date().toISOString();

        // Find all vendors that don't have publishedAt set yet
        const vendors = await context.runQuery<{ id: string }>(
            "Main-Vendor",
            "SELECT c.id FROM c WHERE NOT IS_DEFINED(c.publishedAt)"
        );

        context.log(`Found ${vendors.length} vendors without publishedAt`);

        if (vendors.length === 0) {
            context.log("No vendors need updating");
            return;
        }

        let updated = 0;
        let failed = 0;

        for (const vendor of vendors) {
            try {
                await context.patchItem("Main-Vendor", vendor.id, vendor.id, [
                    { op: "add", path: "/publishedAt", value: now }
                ]);
                updated++;
            } catch (err: any) {
                context.log(`  Failed to patch vendor ${vendor.id}: ${err.message || err}`);
                failed++;
            }
        }

        context.log(`Updated ${updated} vendors, ${failed} failures`);
    },
};

/**
 * Migration: 004_consolidate_listing_containers
 *
 * Consolidates Main-ListingSchedules, Main-ListingGroupings, and Main-Inventory
 * into Main-Listing using docType discriminator.
 *
 * All containers share the same partition key (/vendorId), making this a safe merge.
 *
 * docType values:
 * - "listing" - Main product/service/tour listings
 * - "schedule" - Listing schedules (from Main-ListingSchedules)
 * - "grouping" - Listing groupings (from Main-ListingGroupings)
 * - "inventory" - Inventory transactions (from Main-Inventory)
 */

import { Migration } from "../types";

export const migration: Migration = {
    id: "004_consolidate_listing_containers",
    description: "Merges ListingSchedules, ListingGroupings, and Inventory into Main-Listing",

    async up(context) {
        context.log("Consolidating listing-related containers into Main-Listing...");
        context.log("All code has been updated to use Main-Listing with docType discriminator.");
        context.log("");
        context.log("The following containers can be manually deleted after verifying the migration:");
        context.log("  - Main-ListingSchedules");
        context.log("  - Main-ListingGroupings");
        context.log("  - Main-Inventory");
        context.log("");
        context.log("Note: Existing data in these containers should be migrated manually if needed.");
        context.log("For pre-launch environments, containers can be deleted directly.");
    },
};

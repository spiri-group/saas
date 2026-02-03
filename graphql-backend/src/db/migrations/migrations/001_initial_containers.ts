/**
 * Migration: 001_initial_containers
 *
 * Creates all core containers for the SpiriVerse platform.
 * These definitions are based on the dev environment as of Feb 2026.
 */

import { Migration, ContainerDefinition } from "../types";

/**
 * All containers with their partition keys
 * Source of truth: dev environment (cosmos-spiriverse-server-dev-002)
 */
const CONTAINERS: ContainerDefinition[] = [
    // User & Vendor core entities
    { name: "Main-User", partitionKeyPath: "/id" },
    { name: "Main-Vendor", partitionKeyPath: "/id" },
    { name: "Main-VendorSettings", partitionKeyPath: "/vendorId" },
    { name: "Main-PersonalSpace", partitionKeyPath: "/userId" },

    // Listings & Inventory
    { name: "Main-Listing", partitionKeyPath: "/vendorId" },
    // Note: Main-ListingGroupings, Main-ListingSchedules, Main-Inventory merged into Main-Listing (migration 004)

    // Orders & Commerce
    { name: "Main-Orders", partitionKeyPath: "/orderId" },
    { name: "Main-ShoppingCart", partitionKeyPath: "/id" },
    { name: "Main-Bookings", partitionKeyPath: "/type" },

    // Cases & Offers (marketplace)
    { name: "Main-Cases", partitionKeyPath: "/id" },
    { name: "Main-CaseOffers", partitionKeyPath: "/caseId" },
    { name: "Main-CaseInteraction", partitionKeyPath: "/caseRef/id" },

    // Messaging & Communication
    { name: "Main-Message", partitionKeyPath: "/topicRef/partition" },
    { name: "Main-Comments", partitionKeyPath: "/forObject/partition" },

    // Social features
    { name: "Main-SocialPost", partitionKeyPath: "/vendorId" },
    { name: "Main-Follow", partitionKeyPath: "/targetId" },
    { name: "Main-Gallery", partitionKeyPath: "/vendorId" },
    // Note: Main-Reported merged into Main-Comments (migration 003)

    // Scheduling
    { name: "Main-PractitionerSchedules", partitionKeyPath: "/practitionerId" },

    // Features & Relationships
    { name: "Main-FeaturingRelationship", partitionKeyPath: "/merchantId" },

    // Tours
    { name: "Tour-Session", partitionKeyPath: "/forObject/partition" },

    // System containers
    { name: "System-Settings", partitionKeyPath: "/docType" },
    { name: "System-SettingTrees", partitionKeyPath: "/configId" },
];

export const migration: Migration = {
    id: "001_initial_containers",
    description: "Creates all core containers for the SpiriVerse platform",

    async up(context) {
        context.log(`Creating ${CONTAINERS.length} containers...`);

        let created = 0;
        let existed = 0;

        for (const container of CONTAINERS) {
            const result = await context.createContainer(container);
            if (result.created) created++;
            if (result.existed) existed++;
        }

        context.log(`Summary: ${created} created, ${existed} already existed`);
    },

    async down(context) {
        // Note: We don't delete containers in down() as that would destroy data
        // This is intentionally a no-op
        context.log("Down migration for containers is a no-op (data safety)");
    },
};

/**
 * Migration: 048_create_expo_mode_container
 *
 * Creates a single container for the Expo Mode feature:
 *   - Main-ExpoMode: Stores expo docs, item docs, and sale docs
 *     using /partitionKey as the generic partition key.
 *
 * Doc types (via `docType` field):
 *   - "expo"       → partitionKey = vendorId
 *   - "expo-item"  → partitionKey = expoId
 *   - "expo-sale"  → partitionKey = expoId
 */

import { Migration } from "../types";

export const migration: Migration = {
    id: "048_create_expo_mode_container",
    description: "Creates Main-ExpoMode container for expos, items, and sales",

    async up(context) {
        context.log("Creating Main-ExpoMode container...");
        const result = await context.createContainer({
            name: "Main-ExpoMode",
            partitionKeyPath: "/partitionKey",
        });
        if (result.created) {
            context.log("Main-ExpoMode container created");
        } else {
            context.log("Main-ExpoMode container already exists");
        }

        context.log("Migration 048 complete");
    },
};

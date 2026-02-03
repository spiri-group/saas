/**
 * Migration: 002_seed_system_data
 *
 * Previously seeded System-Choice and Main-Preferences containers.
 * These containers were never queried in the codebase, so they have been removed.
 * All choice data is fetched from System-Settings instead.
 *
 * This migration is now a no-op for historical tracking purposes.
 */

import { Migration } from "../types";

export const migration: Migration = {
    id: "002_seed_system_data",
    description: "Originally seeded System-Choice and Main-Preferences (now removed - unused containers)",

    async up(context) {
        context.log("System-Choice and Main-Preferences were never queried in the codebase.");
        context.log("All choice data is fetched from System-Settings.");
        context.log("This migration is now a no-op.");
    },
};

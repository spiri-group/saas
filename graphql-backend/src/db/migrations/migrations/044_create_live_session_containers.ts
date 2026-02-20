/**
 * Migration: 044_create_live_assist_container
 *
 * Creates a single container for the Live Assist feature:
 *   - Main-LiveAssist: Stores both session docs and queue entry docs
 *     using /partitionKey as the generic partition key.
 *
 * Doc types (via `docType` field):
 *   - "live-session"     → partitionKey = vendorId
 *   - "live-queue-entry" → partitionKey = sessionId
 */

import { Migration } from "../types";

export const migration: Migration = {
    id: "044_create_live_session_containers",
    description: "Creates Main-LiveAssist container for sessions + queue entries",

    async up(context) {
        context.log("Creating Main-LiveAssist container...");
        const result = await context.createContainer({
            name: "Main-LiveAssist",
            partitionKeyPath: "/partitionKey",
        });
        if (result.created) {
            context.log("Main-LiveAssist container created");
        } else {
            context.log("Main-LiveAssist container already exists");
        }

        context.log("Migration 044 complete");
    },
};

/**
 * Migration: 041_create_payment_links_container
 *
 * Creates the Main-PaymentLinks container for storing payment link documents.
 * Partition key is /createdBy (userId) because payment links span vendor profiles.
 * A user viewing their payment links from either dashboard queries by their userId.
 */

import { Migration } from "../types";

export const migration: Migration = {
    id: "041_create_payment_links_container",
    description: "Creates Main-PaymentLinks container (partitioned by /createdBy userId)",

    async up(context) {
        context.log("Creating Main-PaymentLinks container...");

        const result = await context.createContainer({
            name: "Main-PaymentLinks",
            partitionKeyPath: "/createdBy",
        });

        if (result.created) {
            context.log("Main-PaymentLinks container created");
        } else {
            context.log("Main-PaymentLinks container already exists");
        }

        context.log("Migration 041 complete");
    },
};

/**
 * Migration: 051_seed_help_request_categories
 *
 * Seeds the helpRequestCategory flat choice config into System-Settings.
 * This is used by the SpiriAssist help request form to categorise cases.
 *
 * Document format follows the existing flat choice pattern (e.g. unit, etc.)
 * stored in System-Settings with partition key docType = "choice-config".
 */

import { Migration } from "../types";

export const migration: Migration = {
    id: "051_seed_help_request_categories",
    description: "Seeds helpRequestCategory flat choice config for SpiriAssist case form",

    async up(context) {
        context.log("Seeding helpRequestCategory choice config...");

        const existing = await context.runQuery(
            "System-Settings",
            'SELECT * FROM c WHERE c.id = @id AND c.docType = @docType',
            [
                { name: "@id", value: "helpRequestCategory" },
                { name: "@docType", value: "choice-config" },
            ]
        );

        if (existing.length > 0) {
            context.log("helpRequestCategory already exists — skipping");
            return;
        }

        await context.seedData({
            container: "System-Settings",
            partitionKeyField: "docType",
            records: [
                {
                    id: "helpRequestCategory",
                    docType: "choice-config",
                    options: [
                        {
                            id: "HAUNTING",
                            localizations: [{ locale: "EN", value: "Haunting or Unexplained Activity" }],
                            status: "ACTIVE",
                        },
                        {
                            id: "SPIRIT_ATTACHMENT",
                            localizations: [{ locale: "EN", value: "Spirit Attachment" }],
                            status: "ACTIVE",
                        },
                        {
                            id: "ENERGY_DISTURBANCE",
                            localizations: [{ locale: "EN", value: "Energy Disturbance or Negative Presence" }],
                            status: "ACTIVE",
                        },
                        {
                            id: "PROPERTY_CLEANSING",
                            localizations: [{ locale: "EN", value: "Property Cleansing or Blessing" }],
                            status: "ACTIVE",
                        },
                        {
                            id: "COMMUNICATION",
                            localizations: [{ locale: "EN", value: "Spirit Communication Request" }],
                            status: "ACTIVE",
                        },
                        {
                            id: "PROTECTION",
                            localizations: [{ locale: "EN", value: "Spiritual Protection or Shielding" }],
                            status: "ACTIVE",
                        },
                        {
                            id: "OTHER",
                            localizations: [{ locale: "EN", value: "Other" }],
                            status: "ACTIVE",
                        },
                    ],
                },
            ],
        });

        context.log("helpRequestCategory seeded with 7 categories");
    },
};

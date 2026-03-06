/**
 * Migration: 054_seed_unit_choice_config
 *
 * Seeds the unit flat choice config into System-Settings.
 * Used by SpiriAssist case creation form for the "started from" duration unit
 * (e.g. "3 Months ago").
 *
 * Document format follows the existing flat choice pattern
 * stored in System-Settings with partition key docType = "choice-config".
 */

import { Migration } from "../types";

export const migration: Migration = {
    id: "054_seed_unit_choice_config",
    description: "Seeds unit flat choice config for duration fields (Day, Week, Month, Year)",

    async up(context) {
        context.log("Seeding unit choice config...");

        const existing = await context.runQuery(
            "System-Settings",
            'SELECT * FROM c WHERE c.id = @id AND c.docType = @docType',
            [
                { name: "@id", value: "unit" },
                { name: "@docType", value: "choice-config" },
            ]
        );

        if (existing.length > 0) {
            context.log("unit choice config already exists — skipping");
            return;
        }

        await context.seedData({
            container: "System-Settings",
            partitionKeyField: "docType",
            records: [
                {
                    id: "unit",
                    docType: "choice-config",
                    options: [
                        {
                            id: "DAY",
                            localizations: [{ locale: "EN", value: "Day" }],
                            status: "ACTIVE",
                        },
                        {
                            id: "WEEK",
                            localizations: [{ locale: "EN", value: "Week" }],
                            status: "ACTIVE",
                        },
                        {
                            id: "MONTH",
                            localizations: [{ locale: "EN", value: "Month" }],
                            status: "ACTIVE",
                        },
                        {
                            id: "YEAR",
                            localizations: [{ locale: "EN", value: "Year" }],
                            status: "ACTIVE",
                        },
                    ],
                },
            ],
        });

        context.log("unit choice config seeded with 4 options (Day, Week, Month, Year)");
    },
};

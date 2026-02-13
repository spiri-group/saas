/**
 * Migration: 029_update_tier_feature_gates
 *
 * Updates subscription tier definitions with corrected values and new feature gates:
 *
 * Corrections:
 *   - Manifest maxProducts: 15 → 10
 *   - Manifest hasInventoryAutomation: false → true
 *
 * New feature gates added to all tiers:
 *   - canCreateEvents: Manifest+
 *   - canCreateTours: Transcend only
 *   - hasSpiriAssist: Manifest+
 *   - hasBackorders: Transcend only
 */

import { Migration } from "../types";

const UPDATED_TIER_FEATURES = {
    awaken: {
        canCreateMerchantProfile: false,
        maxProducts: 0,
        canHostPractitioners: false,
        hasInventoryAutomation: false,
        hasShippingAutomation: false,
        canCreateEvents: false,
        canCreateTours: false,
        hasSpiriAssist: false,
        hasBackorders: false,
    },
    manifest: {
        canCreateMerchantProfile: true,
        maxProducts: 10,
        canHostPractitioners: false,
        hasInventoryAutomation: true,
        hasShippingAutomation: false,
        canCreateEvents: true,
        canCreateTours: false,
        hasSpiriAssist: true,
        hasBackorders: false,
    },
    transcend: {
        canCreateMerchantProfile: true,
        maxProducts: null,
        canHostPractitioners: true,
        hasInventoryAutomation: true,
        hasShippingAutomation: true,
        canCreateEvents: true,
        canCreateTours: true,
        hasSpiriAssist: true,
        hasBackorders: true,
    },
};

export const migration: Migration = {
    id: "029_update_tier_feature_gates",
    description: "Updates tier definitions with corrected Manifest values and 4 new feature gates (events, tours, SpiriAssist, backorders)",

    async up(context) {
        context.log("Fetching existing tier definitions...");

        const results = await context.runQuery<any>(
            "System-Settings",
            "SELECT * FROM c WHERE c.id = @id AND c.docType = @docType",
            [
                { name: "@id", value: "subscription-tier-definitions" },
                { name: "@docType", value: "subscription-config" },
            ]
        );

        if (results.length === 0) {
            context.log("Tier definitions document not found — seeding from scratch");
            await context.seedData({
                container: "System-Settings",
                partitionKeyField: "docType",
                records: [
                    {
                        id: "subscription-tier-definitions",
                        docType: "subscription-config",
                        tiers: {
                            awaken: {
                                name: "Awaken",
                                description: "For practitioners offering spiritual services and readings",
                                profileType: "practitioner",
                                features: UPDATED_TIER_FEATURES.awaken,
                            },
                            manifest: {
                                name: "Manifest",
                                description: "For merchants selling spiritual products with inventory management",
                                profileType: "merchant",
                                features: UPDATED_TIER_FEATURES.manifest,
                            },
                            transcend: {
                                name: "Transcend",
                                description: "For established merchants seeking to grow",
                                profileType: "merchant",
                                features: UPDATED_TIER_FEATURES.transcend,
                            },
                        },
                    },
                ],
                upsert: true,
            });
            return;
        }

        const doc = results[0];
        let changes = 0;

        for (const [tierKey, newFeatures] of Object.entries(UPDATED_TIER_FEATURES)) {
            const tier = doc.tiers?.[tierKey];
            if (!tier) {
                context.log(`  Tier "${tierKey}" missing in document — skipping`);
                continue;
            }

            const existing = tier.features || {};
            for (const [featureKey, newValue] of Object.entries(newFeatures)) {
                if (existing[featureKey] !== newValue) {
                    context.log(`  ${tierKey}.${featureKey}: ${existing[featureKey]} → ${newValue}`);
                    existing[featureKey] = newValue;
                    changes++;
                }
            }
            tier.features = existing;
        }

        if (changes > 0) {
            context.log(`Upserting tier definitions with ${changes} changes`);
            await context.seedData({
                container: "System-Settings",
                partitionKeyField: "docType",
                records: [doc],
                upsert: true,
            });
        } else {
            context.log("Tier definitions already up to date");
        }

        context.log("Migration 029 complete");
    },
};

/**
 * Migration: 040_add_illuminate_tier
 *
 * Adds the Illuminate subscription tier ($29/mo, $278/yr) for practitioners.
 * Illuminate sits between Awaken and Manifest — its key differentiator is Payment Links.
 *
 * Changes:
 * 1. Adds illuminate pricing to fee config (System-Settings, id=spiriverse, docType=fees-config)
 * 2. Adds illuminate tier to tier definitions and adds hasPaymentLinks gate to all tiers
 */

import { Migration } from "../types";

const ILLUMINATE_FEE_ENTRIES: Record<string, { percent: number; fixed: number; currency: string }> = {
    "subscription-illuminate-monthly": { percent: 0, fixed: 2900, currency: "AUD" },
    "subscription-illuminate-annual": { percent: 0, fixed: 27800, currency: "AUD" },
};

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
        hasPaymentLinks: false,
    },
    illuminate: {
        canCreateMerchantProfile: false,
        maxProducts: 0,
        canHostPractitioners: false,
        hasInventoryAutomation: false,
        hasShippingAutomation: false,
        canCreateEvents: false,
        canCreateTours: false,
        hasSpiriAssist: false,
        hasBackorders: false,
        hasPaymentLinks: true,
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
        hasPaymentLinks: true,
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
        hasPaymentLinks: true,
    },
};

export const migration: Migration = {
    id: "040_add_illuminate_tier",
    description: "Adds Illuminate tier ($29/mo) for practitioners with Payment Links, and adds hasPaymentLinks gate to all tiers",

    async up(context) {
        // 1. Add illuminate pricing to fee config
        context.log("Adding Illuminate pricing to fee config...");

        const feeResults = await context.runQuery<any>(
            "System-Settings",
            "SELECT * FROM c WHERE c.id = @id AND c.docType = @docType",
            [
                { name: "@id", value: "spiriverse" },
                { name: "@docType", value: "fees-config" },
            ]
        );

        if (feeResults.length === 0) {
            context.log("Fee config not found — cannot add illuminate pricing");
        } else {
            const feeDoc = feeResults[0];
            let changes = 0;

            for (const [key, value] of Object.entries(ILLUMINATE_FEE_ENTRIES)) {
                if (feeDoc[key]) {
                    context.log(`  "${key}" already exists — skipping`);
                } else {
                    feeDoc[key] = value;
                    changes++;
                    context.log(`  Added "${key}": ${JSON.stringify(value)}`);
                }
            }

            if (changes > 0) {
                await context.seedData({
                    container: "System-Settings",
                    partitionKeyField: "docType",
                    records: [feeDoc],
                    upsert: true,
                });
                context.log(`Fee config updated with ${changes} new entries`);
            } else {
                context.log("Fee config already has illuminate pricing");
            }
        }

        // 2. Update tier definitions: add illuminate tier + hasPaymentLinks to all tiers
        context.log("Updating tier definitions...");

        const tierResults = await context.runQuery<any>(
            "System-Settings",
            "SELECT * FROM c WHERE c.id = @id AND c.docType = @docType",
            [
                { name: "@id", value: "subscription-tier-definitions" },
                { name: "@docType", value: "subscription-config" },
            ]
        );

        if (tierResults.length === 0) {
            context.log("Tier definitions not found — seeding from scratch");
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
                            illuminate: {
                                name: "Illuminate",
                                description: "Send payment links and collect payments from clients",
                                profileType: "practitioner",
                                features: UPDATED_TIER_FEATURES.illuminate,
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
        } else {
            const doc = tierResults[0];
            let changes = 0;

            // Add illuminate tier if missing
            if (!doc.tiers.illuminate) {
                doc.tiers.illuminate = {
                    name: "Illuminate",
                    description: "Send payment links and collect payments from clients",
                    profileType: "practitioner",
                    features: UPDATED_TIER_FEATURES.illuminate,
                };
                changes++;
                context.log("  Added illuminate tier definition");
            }

            // Update features on all tiers (adds hasPaymentLinks where missing)
            for (const [tierKey, newFeatures] of Object.entries(UPDATED_TIER_FEATURES)) {
                const tier = doc.tiers?.[tierKey];
                if (!tier) continue;

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
        }

        context.log("Migration 040 complete");
    },
};

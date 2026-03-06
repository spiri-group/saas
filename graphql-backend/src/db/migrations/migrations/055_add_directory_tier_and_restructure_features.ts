/**
 * Migration: 055_add_directory_tier_and_restructure_features
 *
 * Adds the Directory subscription tier ($9/mo, $86/yr) as the new entry-level tier.
 * Restructures all tier feature gates to match the updated pricing table:
 *
 * - Directory ($9): Directory listing, SpiriAssist, Gallery
 * - Awaken ($19): + Accept payments, Video updates, Sell services, SpiriReadings
 * - Illuminate ($29): + Payment links, Events, Live Assist, Expo Mode, Tour listing
 * - Manifest ($39): + Merchant profile, 20 products, Inventory sync, Host practitioners, Tour operation
 * - Transcend ($59): + Refund automation, Shipping, POS, Backorders, Unlimited products
 *
 * Changes:
 * 1. Adds directory pricing to fee config
 * 2. Adds directory tier definition and restructures all tier features
 */

import { Migration } from "../types";

const DIRECTORY_FEE_ENTRIES: Record<string, { percent: number; fixed: number; currency: string }> = {
    "subscription-directory-monthly": { percent: 0, fixed: 900, currency: "AUD" },
    "subscription-directory-annual": { percent: 0, fixed: 8600, currency: "AUD" },
};

const UPDATED_TIER_FEATURES = {
    directory: {
        // Core
        hasDirectory: true,
        hasSpiriAssist: true,
        hasGallery: true,
        // Practitioner
        canAcceptPayments: false,
        hasVideoUpdates: false,
        canSellServices: false,
        hasSpiriReadings: false,
        // Growth
        hasPaymentLinks: false,
        canCreateEvents: false,
        hasLiveAssist: false,
        hasExpoMode: false,
        canListTours: false,
        // Merchant
        canCreateMerchantProfile: false,
        maxProducts: 0,
        hasInventoryAutomation: false,
        canHostPractitioners: false,
        canOperateTours: false,
        // Enterprise
        hasRefundAutomation: false,
        hasShippingAutomation: false,
        hasPOS: false,
        hasBackorders: false,
    },
    awaken: {
        hasDirectory: true,
        hasSpiriAssist: true,
        hasGallery: true,
        canAcceptPayments: true,
        hasVideoUpdates: true,
        canSellServices: true,
        hasSpiriReadings: true,
        hasPaymentLinks: false,
        canCreateEvents: false,
        hasLiveAssist: false,
        hasExpoMode: false,
        canListTours: false,
        canCreateMerchantProfile: false,
        maxProducts: 0,
        hasInventoryAutomation: false,
        canHostPractitioners: false,
        canOperateTours: false,
        hasRefundAutomation: false,
        hasShippingAutomation: false,
        hasPOS: false,
        hasBackorders: false,
    },
    illuminate: {
        hasDirectory: true,
        hasSpiriAssist: true,
        hasGallery: true,
        canAcceptPayments: true,
        hasVideoUpdates: true,
        canSellServices: true,
        hasSpiriReadings: true,
        hasPaymentLinks: true,
        canCreateEvents: true,
        hasLiveAssist: true,
        hasExpoMode: true,
        canListTours: true,
        canCreateMerchantProfile: false,
        maxProducts: 0,
        hasInventoryAutomation: false,
        canHostPractitioners: false,
        canOperateTours: false,
        hasRefundAutomation: false,
        hasShippingAutomation: false,
        hasPOS: false,
        hasBackorders: false,
    },
    manifest: {
        hasDirectory: true,
        hasSpiriAssist: true,
        hasGallery: true,
        canAcceptPayments: true,
        hasVideoUpdates: true,
        canSellServices: true,
        hasSpiriReadings: true,
        hasPaymentLinks: true,
        canCreateEvents: true,
        hasLiveAssist: true,
        hasExpoMode: true,
        canListTours: true,
        canCreateMerchantProfile: true,
        maxProducts: 20,
        hasInventoryAutomation: true,
        canHostPractitioners: true,
        canOperateTours: true,
        hasRefundAutomation: false,
        hasShippingAutomation: false,
        hasPOS: false,
        hasBackorders: false,
    },
    transcend: {
        hasDirectory: true,
        hasSpiriAssist: true,
        hasGallery: true,
        canAcceptPayments: true,
        hasVideoUpdates: true,
        canSellServices: true,
        hasSpiriReadings: true,
        hasPaymentLinks: true,
        canCreateEvents: true,
        hasLiveAssist: true,
        hasExpoMode: true,
        canListTours: true,
        canCreateMerchantProfile: true,
        maxProducts: null,
        hasInventoryAutomation: true,
        canHostPractitioners: true,
        canOperateTours: true,
        hasRefundAutomation: true,
        hasShippingAutomation: true,
        hasPOS: true,
        hasBackorders: true,
    },
};

export const migration: Migration = {
    id: "055_add_directory_tier_and_restructure_features",
    description: "Adds Directory tier ($9/mo) and restructures all tier feature gates to match updated pricing table",

    async up(context) {
        // 1. Add directory pricing to fee config
        context.log("Adding Directory pricing to fee config...");

        const feeResults = await context.runQuery<any>(
            "System-Settings",
            "SELECT * FROM c WHERE c.id = @id AND c.docType = @docType",
            [
                { name: "@id", value: "spiriverse" },
                { name: "@docType", value: "fees-config" },
            ]
        );

        if (feeResults.length === 0) {
            context.log("Fee config not found — cannot add directory pricing");
        } else {
            const feeDoc = feeResults[0];
            let changes = 0;

            for (const [key, value] of Object.entries(DIRECTORY_FEE_ENTRIES)) {
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
                context.log("Fee config already has directory pricing");
            }
        }

        // 2. Update tier definitions: add directory tier + restructure all features
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
                            directory: {
                                name: "Directory",
                                description: "Get listed in the SpiriVerse directory with your gallery and SpiriAssist",
                                profileType: "practitioner",
                                features: UPDATED_TIER_FEATURES.directory,
                            },
                            awaken: {
                                name: "Awaken",
                                description: "Accept payments and sell services with availability scheduling",
                                profileType: "practitioner",
                                features: UPDATED_TIER_FEATURES.awaken,
                            },
                            illuminate: {
                                name: "Illuminate",
                                description: "Payment links, ticketed events, live assist, expo mode, and tour selling",
                                profileType: "practitioner",
                                features: UPDATED_TIER_FEATURES.illuminate,
                            },
                            manifest: {
                                name: "Manifest",
                                description: "Full merchant storefront with products, inventory, and tour operation",
                                profileType: "merchant",
                                features: UPDATED_TIER_FEATURES.manifest,
                            },
                            transcend: {
                                name: "Transcend",
                                description: "Everything included — shipping, POS, refund automation, and unlimited products",
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

            // Add directory tier
            if (!doc.tiers.directory) {
                doc.tiers.directory = {
                    name: "Directory",
                    description: "Get listed in the SpiriVerse directory with your gallery and SpiriAssist",
                    profileType: "practitioner",
                    features: UPDATED_TIER_FEATURES.directory,
                };
                context.log("  Added directory tier definition");
            }

            // Update all tier features and descriptions
            const tierMeta: Record<string, { description: string }> = {
                directory: { description: "Get listed in the SpiriVerse directory with your gallery and SpiriAssist" },
                awaken: { description: "Accept payments and sell services with availability scheduling" },
                illuminate: { description: "Payment links, ticketed events, live assist, expo mode, and tour selling" },
                manifest: { description: "Full merchant storefront with products, inventory, and tour operation" },
                transcend: { description: "Everything included — shipping, POS, refund automation, and unlimited products" },
            };

            for (const [tierKey, newFeatures] of Object.entries(UPDATED_TIER_FEATURES)) {
                if (!doc.tiers[tierKey]) continue;
                doc.tiers[tierKey].features = newFeatures;
                if (tierMeta[tierKey]) {
                    doc.tiers[tierKey].description = tierMeta[tierKey].description;
                }
                context.log(`  Updated ${tierKey} features and description`);
            }

            // Remove old feature keys that no longer exist
            for (const tierKey of Object.keys(doc.tiers)) {
                const features = doc.tiers[tierKey]?.features;
                if (features) {
                    delete features.canCreateTours;
                }
            }

            await context.seedData({
                container: "System-Settings",
                partitionKeyField: "docType",
                records: [doc],
                upsert: true,
            });
            context.log("Tier definitions updated");
        }

        context.log("Migration 055 complete");
    },
};

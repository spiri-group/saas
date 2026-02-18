/**
 * Migration: 034_add_spiritual_interests_to_categories
 *
 * Patches product-category nodes in System-SettingTrees with `spiritualInterests`
 * metadata so entire category branches map to user spiritual interests.
 * Level-2 children inherit from their parent unless explicitly overridden.
 */

import { Migration } from "../types";

// Mapping: category label (exact match) -> spiritual interests
// Level 1 branches
const LEVEL_1_MAPPINGS: Record<string, string[]> = {
    "Crystals & Gemstones": ["CRYSTALS", "ENERGY"],
    "Divination & Occult": ["MEDIUMSHIP"],
    "Ritual, Magic & Ceremony": ["WITCHCRAFT"],
    "Energy & Healing Tools": ["ENERGY"],
    "Spiritual Home & Sacred Space": ["ENERGY", "WITCHCRAFT"],
    "Wellness, Meditation & Mindfulness": ["ENERGY", "MEDIUMSHIP"],
    "Religious & Devotional Traditions": ["FAITH"],
    "Paranormal & Supernatural": ["PARANORMAL"],
    "Cultural & Folk Practices": ["WITCHCRAFT"],
};

// Level 2 overrides (label -> interests)
// These replace the parent mapping entirely for that child node
const LEVEL_2_OVERRIDES: Record<string, string[]> = {
    "Occult Texts": ["WITCHCRAFT"],
    "Herbs & Smudging": ["WITCHCRAFT", "HERBALISM"],
    "World Religions": ["FAITH"],
    "Metaphysics & Occult": ["WITCHCRAFT", "MEDIUMSHIP"],
    "Paranormal Studies": ["PARANORMAL"],
    "Mindfulness & Self-Development": ["ENERGY", "MEDIUMSHIP"],
    "Amulets & Talismans": ["WITCHCRAFT", "ENERGY"],
    "Crystal Jewelry": ["CRYSTALS"],
    "Mala & Prayer Beads": ["FAITH"],
};

export const migration: Migration = {
    id: "034_add_spiritual_interests_to_categories",
    description: "Adds spiritualInterests metadata to product-category nodes for contextual shopping",

    async up(context) {
        // 1. Query all category nodes for product-categories config
        const allNodes = await context.runQuery<any>(
            "System-SettingTrees",
            "SELECT * FROM c WHERE c.configId = 'product-categories' AND c.type = 'category' AND c.status = 'ACTIVE'"
        );

        if (allNodes.length === 0) {
            context.log("No product-category nodes found - skipping");
            return;
        }

        context.log(`Found ${allNodes.length} category nodes`);

        // Build a map of id -> node for parent lookups
        const nodeById = new Map<string, any>();
        for (const node of allNodes) {
            nodeById.set(node.id, node);
        }

        let patched = 0;

        for (const node of allNodes) {
            let interests: string[] | undefined;

            if (node.level === 1) {
                // Level 1: direct label lookup
                interests = LEVEL_1_MAPPINGS[node.label];
            } else if (node.level === 2) {
                // Level 2: check for explicit override first
                interests = LEVEL_2_OVERRIDES[node.label];

                // If no override, inherit from parent
                if (!interests && node.parentRef?.id) {
                    const parent = nodeById.get(node.parentRef.id);
                    if (parent) {
                        interests = LEVEL_1_MAPPINGS[parent.label];
                    }
                }
            }

            if (!interests || interests.length === 0) continue;

            // Merge into existing metadata (preserve other fields like refund_rate)
            const existingMetadata = node.metadata || {};

            // Skip if already set to the same value
            const existing = existingMetadata.spiritualInterests;
            if (Array.isArray(existing) && JSON.stringify(existing.sort()) === JSON.stringify([...interests].sort())) {
                context.log(`  "${node.label}" already has correct spiritualInterests - skipping`);
                continue;
            }

            const updatedMetadata = {
                ...existingMetadata,
                spiritualInterests: interests,
            };

            // Patch the node's metadata field
            await context.patchItem(
                "System-SettingTrees",
                node.id,
                node.configId,  // partition key is configId
                [{ op: "set", path: "/metadata", value: updatedMetadata }]
            );

            context.log(`  Patched "${node.label}" (level ${node.level}) with [${interests.join(", ")}]`);
            patched++;
        }

        context.log(`Patched ${patched} category nodes with spiritualInterests`);
    },
};

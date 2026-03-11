/**
 * Migration: 060_seed_tree_nodes
 *
 * Seeds hierarchical choice config tree nodes (product-categories, religions,
 * merchant-types) into System-SettingTrees. These nodes were created via the
 * console UI on dev but never migrated to prod.
 *
 * Data exported from dev environment on 2026-03-09.
 */

import { Migration } from "../types";
import * as fs from "fs";
import * as path from "path";

export const migration: Migration = {
    id: "060_seed_tree_nodes",
    description: "Seeds hierarchical choice config tree nodes (product-categories, religions, merchant-types)",

    async up(context) {
        // Load tree node data from JSON file
        const dataPath = path.join(__dirname, "..", "data", "tree-nodes.json");
        const rawData = fs.readFileSync(dataPath, "utf-8");
        const treeData: Record<string, any[]> = JSON.parse(rawData);

        const configIds = ["product-categories", "religions", "merchant-types"];

        for (const configId of configIds) {
            const nodes = treeData[configId] || [];
            if (nodes.length === 0) {
                context.log(`  ${configId}: no nodes to seed`);
                continue;
            }

            // Check how many nodes already exist in this config
            const existing = await context.runQuery<any>(
                "System-SettingTrees",
                "SELECT c.id FROM c WHERE c.configId = @configId",
                [{ name: "@configId", value: configId }]
            );

            if (existing.length >= nodes.length) {
                context.log(`  ${configId}: already has ${existing.length} nodes (expected ${nodes.length}) — skipping`);
                continue;
            }

            context.log(`  ${configId}: seeding ${nodes.length} nodes (${existing.length} already exist)...`);

            const result = await context.seedData({
                container: "System-SettingTrees",
                partitionKeyField: "configId",
                records: nodes,
                upsert: false,
            });

            context.log(`  ${configId}: ${result.inserted} inserted, ${result.skipped} skipped`);
        }
    },
};

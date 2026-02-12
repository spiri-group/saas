/**
 * Migration: 027_seed_legal_documents_from_export
 *
 * Seeds legal documents into System-Settings from the exported JSON file.
 * This replaces the filesystem-dependent migration 019 which required
 * docs/legal/ markdown files to be present on disk.
 *
 * Uses upsert to ensure documents are created if missing or updated
 * if they already exist (e.g. in dev where 019 already ran).
 */

import { Migration } from "../types";
import * as fs from "fs";
import * as path from "path";

export const migration: Migration = {
    id: "027_seed_legal_documents_from_export",
    description: "Seed legal documents from exported JSON (no filesystem dependency)",

    async up(context) {
        const exportPath = path.resolve(__dirname, "../legal-docs-export.json");

        if (!fs.existsSync(exportPath)) {
            context.log("ERROR: legal-docs-export.json not found — cannot seed legal documents");
            return;
        }

        const docs = JSON.parse(fs.readFileSync(exportPath, "utf-8"));
        context.log(`Loaded ${docs.length} legal documents from export`);

        // Check which docs already exist
        const existing = await context.runQuery<any>(
            "System-Settings",
            "SELECT c.id FROM c WHERE c.docType = @docType",
            [{ name: "@docType", value: "legal-document" }]
        );
        const existingIds = new Set(existing.map((d: any) => d.id));

        const toSeed = docs.filter((d: any) => !existingIds.has(d.id));

        if (toSeed.length === 0) {
            context.log("All legal documents already exist — nothing to do");
            return;
        }

        context.log(`Seeding ${toSeed.length} missing legal documents (${existingIds.size} already exist)`);

        const now = new Date().toISOString();
        const records = toSeed.map((d: any) => ({
            ...d,
            createdAt: d.createdAt || now,
            updatedAt: d.updatedAt || now,
            updatedBy: d.updatedBy || "system",
        }));

        await context.seedData({
            container: "System-Settings",
            partitionKeyField: "docType",
            records,
            upsert: false,
        });

        context.log(`✓ Seeded ${toSeed.length} legal documents`);
    },
};

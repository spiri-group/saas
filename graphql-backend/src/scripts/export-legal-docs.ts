/**
 * Export Legal Documents from Cosmos DB
 *
 * Pulls all live legal documents from the database and saves them
 * as individual markdown files for review. Reusable — run whenever
 * the partner has edited documents directly in Cosmos.
 *
 * Run from graphql-backend folder:
 *   npx ts-node src/scripts/export-legal-docs.ts --env=prd
 *   npx ts-node src/scripts/export-legal-docs.ts --env=dev
 *
 * Uses DefaultAzureCredential + Key Vault (same auth as migrations).
 * Falls back to COSMOS_CONNECTION_STRING env var if set.
 */

import { CosmosClient } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";
import * as fs from "fs";
import * as path from "path";

const ENV_CONFIG = {
    dev: {
        keyVaultName: "kv-spv-server-dev-002",
    },
    prd: {
        keyVaultName: "kv-spv-server-prd-002",
    },
};

const OUTPUT_DIR = path.join(__dirname, "legal-export");

interface LegalDoc {
    id: string;
    docType: string;
    documentType: string;
    title: string;
    content: string;
    market: string;
    version: number;
    isPublished: boolean;
    effectiveDate: string;
    changeSummary?: string;
    createdAt?: string;
    updatedAt?: string;
    updatedBy?: string;
    placeholders?: Record<string, string>;
    [key: string]: any;
}

function parseEnv(): keyof typeof ENV_CONFIG {
    const envArg = process.argv.find((a) => a.startsWith("--env="));
    if (!envArg) {
        console.error("Usage: npx ts-node src/scripts/export-legal-docs.ts --env=prd");
        process.exit(1);
    }
    const env = envArg.split("=")[1] as keyof typeof ENV_CONFIG;
    if (!ENV_CONFIG[env]) {
        console.error(`Unknown environment: ${env}. Use --env=dev or --env=prd`);
        process.exit(1);
    }
    return env;
}

async function getCosmosClient(env: keyof typeof ENV_CONFIG): Promise<CosmosClient> {
    // Allow connection string override
    const connectionString = process.env.COSMOS_CONNECTION_STRING;
    if (connectionString) {
        console.log("Using COSMOS_CONNECTION_STRING from environment\n");
        return new CosmosClient(connectionString);
    }

    // Use DefaultAzureCredential + Key Vault (same as migration runner)
    const credential = new DefaultAzureCredential();
    const config = ENV_CONFIG[env];
    const keyVaultUrl = `https://${config.keyVaultName}.vault.azure.net`;

    console.log(`Connecting via Key Vault: ${config.keyVaultName}`);
    const secretClient = new SecretClient(keyVaultUrl, credential);
    const endpointSecret = await secretClient.getSecret("cosmos-endpoint");
    const endpoint = endpointSecret.value;

    if (!endpoint) {
        throw new Error("Could not retrieve cosmos-endpoint from Key Vault");
    }

    console.log(`Cosmos endpoint: ${endpoint}\n`);
    return new CosmosClient({ endpoint, aadCredentials: credential });
}

async function main() {
    const env = parseEnv();

    console.log("=".repeat(60));
    console.log(`Legal Document Export — ${env.toUpperCase()}`);
    console.log("=".repeat(60));
    console.log("");

    const client = await getCosmosClient(env);
    const database = client.database("Core");
    const container = database.container("System-Settings");

    // Pull all legal documents
    const { resources: docs } = await container.items
        .query<LegalDoc>({
            query: "SELECT * FROM c WHERE c.docType = 'legal-document' AND c.status = 'ACTIVE'",
        })
        .fetchAll();

    if (!docs || docs.length === 0) {
        console.log("No legal documents found.");
        return;
    }

    console.log(`Found ${docs.length} legal documents\n`);

    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Also build a summary JSON with metadata (no content — just for quick reference)
    const summary: Array<{
        id: string;
        title: string;
        version: number;
        isPublished: boolean;
        market: string;
        effectiveDate: string;
        updatedAt?: string;
        updatedBy?: string;
        changeSummary?: string;
    }> = [];

    for (const doc of docs) {
        // Save content as markdown
        const mdPath = path.join(OUTPUT_DIR, `${doc.id}.md`);
        const header = [
            `<!-- id: ${doc.id} -->`,
            `<!-- title: ${doc.title} -->`,
            `<!-- version: ${doc.version} -->`,
            `<!-- market: ${doc.market} -->`,
            `<!-- isPublished: ${doc.isPublished} -->`,
            `<!-- effectiveDate: ${doc.effectiveDate} -->`,
            `<!-- updatedAt: ${doc.updatedAt || "N/A"} -->`,
            `<!-- updatedBy: ${doc.updatedBy || "N/A"} -->`,
            `<!-- changeSummary: ${doc.changeSummary || "N/A"} -->`,
            "",
        ].join("\n");

        fs.writeFileSync(mdPath, header + doc.content, "utf-8");
        console.log(`  ✓ ${doc.id} (v${doc.version}) → ${mdPath}`);

        // Save full JSON (including content) for migration reference
        const jsonPath = path.join(OUTPUT_DIR, `${doc.id}.json`);
        fs.writeFileSync(jsonPath, JSON.stringify(doc, null, 2), "utf-8");

        summary.push({
            id: doc.id,
            title: doc.title,
            version: doc.version,
            isPublished: doc.isPublished,
            market: doc.market,
            effectiveDate: doc.effectiveDate,
            updatedAt: doc.updatedAt,
            updatedBy: doc.updatedBy,
            changeSummary: doc.changeSummary,
        });
    }

    // Save summary
    const summaryPath = path.join(OUTPUT_DIR, "_summary.json");
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), "utf-8");

    console.log("");
    console.log(`Summary saved to ${summaryPath}`);
    console.log("");
    console.log("=".repeat(60));
    console.log("Export complete!");
    console.log(`Files saved to: ${OUTPUT_DIR}`);
    console.log("=".repeat(60));
}

main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});

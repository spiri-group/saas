/**
 * Cosmos DB Migration Runner
 *
 * Executes migrations in order and tracks applied migrations
 * in a System-Migrations container to prevent re-runs.
 *
 * Uses ARM SDK for container creation (control plane) and
 * Cosmos SDK for data operations (data plane).
 */

import { CosmosClient, Database, Container } from "@azure/cosmos";
import { CosmosDBManagementClient } from "@azure/arm-cosmosdb";
import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";
import { DateTime } from "luxon";
import { v4 as uuid } from "uuid";
import {
    Migration,
    MigrationContext,
    MigrationResult,
    MigrationRunnerOptions,
    AppliedMigration,
    ContainerDefinition,
    IndexingPolicy,
    SeedData,
} from "./types";

const MIGRATIONS_CONTAINER = "System-Migrations";
const MIGRATIONS_PARTITION = "migrations";
const DATABASE_NAME = "Core";

// Environment-specific configuration
const ENV_CONFIG = {
    dev: {
        subscriptionId: "c5a9c98c-b86f-479d-a8f8-3b0f1f1d4a46",
        resourceGroup: "rg-spiriverse-server-dev-002",
        accountName: "cosmos-spiriverse-server-dev-002",
    },
    prd: {
        subscriptionId: "8e4b9f1a-ed40-400b-b895-5cfe4ffb6dff",
        resourceGroup: "rg-spiriverse-server-prd-002",
        accountName: "cosmos-spiriverse-server-prd-002",
    },
};

export class MigrationRunner {
    private client: CosmosClient | null = null;
    private armClient: CosmosDBManagementClient | null = null;
    private database: Database | null = null;
    private options: MigrationRunnerOptions;
    private logs: string[] = [];
    private envConfig: typeof ENV_CONFIG.dev | null = null;

    constructor(options: MigrationRunnerOptions) {
        this.options = options;
        this.envConfig = ENV_CONFIG[options.environment as keyof typeof ENV_CONFIG] || ENV_CONFIG.dev;
    }

    private log(message: string): void {
        const timestamp = DateTime.now().toFormat("HH:mm:ss");
        const formatted = `[${timestamp}] ${message}`;
        this.logs.push(formatted);
        if (this.options.verbose) {
            console.log(formatted);
        }
    }

    async initialize(): Promise<void> {
        this.log(`Initializing connection for environment: ${this.options.environment}`);

        // Check for connection string override (for local development)
        // Set COSMOS_CONNECTION_STRING env var to bypass AAD auth
        const connectionString = process.env.COSMOS_CONNECTION_STRING;

        if (connectionString) {
            this.log("Using connection string from COSMOS_CONNECTION_STRING env var");
            this.client = new CosmosClient(connectionString);
            this.database = this.client.database(DATABASE_NAME);
            this.log("Connected successfully");
            return;
        }

        // Use Key Vault + AAD authentication (for CI/CD and Azure environments)
        const credential = new DefaultAzureCredential();

        // Initialize ARM client for container management (control plane)
        this.armClient = new CosmosDBManagementClient(credential, this.envConfig!.subscriptionId);

        // Get Key Vault URL based on environment
        // Naming convention: kv-spv-server-{env}-002
        const keyVaultName = this.options.environment === "prd"
            ? "kv-spv-server-prd-002"
            : "kv-spv-server-dev-002";
        const keyVaultUrl = `https://${keyVaultName}.vault.azure.net`;

        this.log(`Connecting to Key Vault: ${keyVaultName}`);
        const secretClient = new SecretClient(keyVaultUrl, credential);

        // Get Cosmos endpoint from Key Vault
        const endpointSecret = await secretClient.getSecret("cosmos-endpoint");
        const endpoint = endpointSecret.value;

        if (!endpoint) {
            throw new Error("Could not retrieve cosmos-endpoint from Key Vault");
        }

        this.log(`Connecting to Cosmos DB: ${endpoint}`);
        this.client = new CosmosClient({
            endpoint,
            aadCredentials: credential,
        });

        this.database = this.client.database(DATABASE_NAME);
        this.log("Connected successfully");
    }

    private async ensureMigrationsContainer(): Promise<Container> {
        if (!this.database) throw new Error("Database not initialized");
        if (!this.armClient || !this.envConfig) throw new Error("ARM client not initialized");

        // Check if container exists using ARM
        try {
            await this.armClient.sqlResources.getSqlContainer(
                this.envConfig.resourceGroup,
                this.envConfig.accountName,
                DATABASE_NAME,
                MIGRATIONS_CONTAINER
            );
        } catch (error: any) {
            if (error.statusCode === 404) {
                // Container doesn't exist, create it via ARM
                await this.armClient.sqlResources.beginCreateUpdateSqlContainerAndWait(
                    this.envConfig.resourceGroup,
                    this.envConfig.accountName,
                    DATABASE_NAME,
                    MIGRATIONS_CONTAINER,
                    {
                        resource: {
                            id: MIGRATIONS_CONTAINER,
                            partitionKey: { paths: ["/partition"], kind: "Hash" },
                        },
                    }
                );
            } else {
                throw error;
            }
        }

        return this.database.container(MIGRATIONS_CONTAINER);
    }

    async getAppliedMigrations(): Promise<string[]> {
        const container = await this.ensureMigrationsContainer();

        const { resources } = await container.items
            .query<AppliedMigration>({
                query: "SELECT c.migrationId FROM c WHERE c.partition = @partition AND c.status = 'ACTIVE'",
                parameters: [{ name: "@partition", value: MIGRATIONS_PARTITION }],
            })
            .fetchAll();

        return resources.map((r) => r.migrationId);
    }

    private async recordMigration(
        migration: Migration,
        durationMs: number
    ): Promise<void> {
        if (this.options.dryRun) return;

        const container = await this.ensureMigrationsContainer();

        const record: AppliedMigration = {
            id: uuid(),
            partition: MIGRATIONS_PARTITION,
            migrationId: migration.id,
            description: migration.description,
            appliedAt: DateTime.now().toISO()!,
            appliedBy: `migration-runner-${this.options.environment}`,
            environment: this.options.environment,
            durationMs,
            status: "ACTIVE",
        };

        await container.items.create(record);
    }

    private createContext(): MigrationContext {
        const self = this;
        const database = this.database!;
        const armClient = this.armClient!;
        const envConfig = this.envConfig!;

        return {
            async createContainer(
                definition: ContainerDefinition
            ): Promise<{ created: boolean; existed: boolean }> {
                self.log(`  Creating container: ${definition.name}`);

                if (self.options.dryRun) {
                    self.log(`  [DRY RUN] Would create container ${definition.name}`);
                    return { created: false, existed: false };
                }

                try {
                    // Use ARM SDK for container creation (control plane)
                    // This works with AAD authentication properly
                    const containerResource = {
                        resource: {
                            id: definition.name,
                            partitionKey: {
                                paths: [definition.partitionKeyPath],
                                kind: definition.partitionKeyKind || "Hash",
                            },
                            indexingPolicy: definition.indexingPolicy ? {
                                indexingMode: definition.indexingPolicy.indexingMode,
                                automatic: definition.indexingPolicy.automatic,
                                includedPaths: definition.indexingPolicy.includedPaths,
                                excludedPaths: definition.indexingPolicy.excludedPaths,
                                compositeIndexes: definition.indexingPolicy.compositeIndexes,
                            } : undefined,
                            defaultTtl: definition.defaultTtl,
                        },
                    };

                    // Check if container exists first
                    try {
                        await armClient.sqlResources.getSqlContainer(
                            envConfig.resourceGroup,
                            envConfig.accountName,
                            DATABASE_NAME,
                            definition.name
                        );
                        self.log(`  Container ${definition.name}: ALREADY EXISTS`);
                        return { created: false, existed: true };
                    } catch (error: any) {
                        if (error.statusCode !== 404) {
                            throw error;
                        }
                        // Container doesn't exist, create it
                    }

                    await armClient.sqlResources.beginCreateUpdateSqlContainerAndWait(
                        envConfig.resourceGroup,
                        envConfig.accountName,
                        DATABASE_NAME,
                        definition.name,
                        containerResource
                    );

                    self.log(`  Container ${definition.name}: CREATED`);
                    return { created: true, existed: false };
                } catch (error: any) {
                    self.log(`  ERROR creating container ${definition.name}: ${error.message}`);
                    throw error;
                }
            },

            async updateIndexingPolicy(
                containerName: string,
                policy: IndexingPolicy
            ): Promise<void> {
                self.log(`  Updating indexing policy for: ${containerName}`);

                if (self.options.dryRun) {
                    self.log(`  [DRY RUN] Would update indexing policy for ${containerName}`);
                    return;
                }

                const container = database.container(containerName);
                const { resource: containerDef } = await container.read();

                if (!containerDef) {
                    throw new Error(`Container ${containerName} not found`);
                }

                // Cast to any to avoid strict type checking on IndexingPolicy
                // The SDK types are more complex than our simplified interface
                await container.replace({
                    ...containerDef,
                    indexingPolicy: policy as any,
                });

                self.log(`  Indexing policy updated for ${containerName}`);
            },

            async seedData(
                data: SeedData
            ): Promise<{ inserted: number; skipped: number }> {
                self.log(`  Seeding ${data.records.length} records into ${data.container}`);

                if (self.options.dryRun) {
                    self.log(`  [DRY RUN] Would seed ${data.records.length} records`);
                    return { inserted: 0, skipped: data.records.length };
                }

                const container = database.container(data.container);
                let inserted = 0;
                let skipped = 0;

                for (const record of data.records) {
                    const partitionValue = record[data.partitionKeyField];
                    const now = DateTime.now().toISO();

                    if (data.upsert) {
                        // Upsert mode: replace if exists, create if not
                        await container.items.upsert({
                            ...record,
                            status: "ACTIVE",
                            createdDate: now,
                            createdBy: "migration-system",
                        });
                        inserted++;
                    } else {
                        // Default mode: skip if exists
                        try {
                            // Check if record exists
                            const { statusCode } = await container
                                .item(record.id, partitionValue)
                                .read();

                            if (statusCode === 200) {
                                skipped++;
                                continue;
                            }
                        } catch {
                            // Record doesn't exist, we'll create it
                        }

                        try {
                            await container.items.create({
                                ...record,
                                status: "ACTIVE",
                                createdDate: now,
                                createdBy: "migration-system",
                            });
                            inserted++;
                        } catch (error: any) {
                            if (error.code === 409) {
                                // Conflict - record already exists
                                skipped++;
                            } else {
                                throw error;
                            }
                        }
                    }
                }

                self.log(`  Seeded: ${inserted} inserted, ${skipped} skipped`);
                return { inserted, skipped };
            },

            async runQuery<T = any>(
                containerName: string,
                query: string,
                parameters?: { name: string; value: any }[]
            ): Promise<T[]> {
                self.log(`  Running query on ${containerName}`);

                const container = database.container(containerName);
                const { resources } = await container.items
                    .query<T>({ query, parameters: parameters || [] })
                    .fetchAll();

                return resources;
            },

            async patchItem(
                containerName: string,
                id: string,
                partitionKey: string | string[],
                operations: { op: string; path: string; value?: any }[]
            ): Promise<void> {
                if (self.options.dryRun) {
                    self.log(`  [DRY RUN] Would patch item ${id} in ${containerName}`);
                    return;
                }

                const container = database.container(containerName);
                await container.item(id, partitionKey).patch(operations as any);
            },

            getEnvironment(): string {
                return self.options.environment;
            },

            log(message: string): void {
                self.log(`  ${message}`);
            },
        };
    }

    async runMigrations(migrations: Migration[]): Promise<MigrationResult[]> {
        const results: MigrationResult[] = [];

        // Sort migrations by ID to ensure correct order
        const sortedMigrations = [...migrations].sort((a, b) =>
            a.id.localeCompare(b.id)
        );

        // Get already applied migrations
        const appliedIds = await this.getAppliedMigrations();
        this.log(`Found ${appliedIds.length} already applied migrations`);

        // Filter to pending migrations
        const pendingMigrations = sortedMigrations.filter(
            (m) => !appliedIds.includes(m.id)
        );

        if (pendingMigrations.length === 0) {
            this.log("No pending migrations to run");
            return results;
        }

        this.log(`Running ${pendingMigrations.length} pending migrations...`);

        const context = this.createContext();

        for (const migration of pendingMigrations) {
            this.log(`\nMigration: ${migration.id}`);
            this.log(`Description: ${migration.description}`);

            const startTime = Date.now();

            try {
                await migration.up(context);
                const durationMs = Date.now() - startTime;

                await this.recordMigration(migration, durationMs);

                this.log(`Completed in ${durationMs}ms`);

                results.push({
                    migrationId: migration.id,
                    success: true,
                    durationMs,
                });
            } catch (error: any) {
                const durationMs = Date.now() - startTime;
                this.log(`FAILED after ${durationMs}ms: ${error.message}`);

                results.push({
                    migrationId: migration.id,
                    success: false,
                    durationMs,
                    error: error.message,
                });

                // Stop on first failure
                break;
            }
        }

        return results;
    }

    async getStatus(migrations: Migration[]): Promise<{
        applied: string[];
        pending: string[];
    }> {
        const appliedIds = await this.getAppliedMigrations();
        const allIds = migrations.map((m) => m.id).sort();

        return {
            applied: allIds.filter((id) => appliedIds.includes(id)),
            pending: allIds.filter((id) => !appliedIds.includes(id)),
        };
    }

    getLogs(): string[] {
        return this.logs;
    }
}

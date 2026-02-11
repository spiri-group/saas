/**
 * Cosmos DB Migration System Types
 *
 * This migration system handles:
 * - Container creation with partition keys
 * - Indexing policy updates
 * - Seed data insertion
 * - Tracking applied migrations to prevent re-runs
 */

export interface ContainerDefinition {
    name: string;
    partitionKeyPath: string;
    partitionKeyKind?: 'Hash' | 'MultiHash';
    indexingPolicy?: IndexingPolicy;
    defaultTtl?: number;  // Time-to-live in seconds, -1 = off but enabled
}

export interface IndexingPolicy {
    indexingMode: 'consistent' | 'lazy' | 'none';
    automatic: boolean;
    includedPaths: { path: string }[];
    excludedPaths: { path: string }[];
    compositeIndexes?: { path: string; order: 'ascending' | 'descending' }[][];
    // Note: spatialIndexes omitted - use Cosmos SDK types directly if needed
}

export interface SeedRecord {
    id: string;
    [key: string]: any;
}

export interface SeedData {
    container: string;
    partitionKeyField: string;
    records: SeedRecord[];
    upsert?: boolean;  // If true, overwrites existing records instead of skipping
}

export interface MigrationContext {
    /**
     * Create a container if it doesn't exist
     */
    createContainer(definition: ContainerDefinition): Promise<{ created: boolean; existed: boolean }>;

    /**
     * Update indexing policy for an existing container
     */
    updateIndexingPolicy(containerName: string, policy: IndexingPolicy): Promise<void>;

    /**
     * Insert seed data (skips if record already exists)
     */
    seedData(data: SeedData): Promise<{ inserted: number; skipped: number }>;

    /**
     * Run a raw query (for data migrations)
     */
    runQuery<T = any>(containerName: string, query: string, parameters?: { name: string; value: any }[]): Promise<T[]>;

    /**
     * Patch a single item (partial update for data migrations)
     */
    patchItem(containerName: string, id: string, partitionKey: string | string[], operations: { op: string; path: string; value?: any }[]): Promise<void>;

    /**
     * Get current environment name
     */
    getEnvironment(): string;

    /**
     * Log a message to the migration output
     */
    log(message: string): void;
}

export interface Migration {
    /**
     * Unique identifier for this migration (e.g., "001_initial_containers")
     * Must be unique and should sort alphabetically in order of execution
     */
    id: string;

    /**
     * Human-readable description of what this migration does
     */
    description: string;

    /**
     * The migration function to execute
     * Should be idempotent - safe to run multiple times
     */
    up(context: MigrationContext): Promise<void>;

    /**
     * Optional rollback function (not always possible with Cosmos DB)
     */
    down?(context: MigrationContext): Promise<void>;
}

export interface AppliedMigration {
    id: string;
    partition: string;  // Always "migrations"
    migrationId: string;
    description: string;
    appliedAt: string;
    appliedBy: string;
    environment: string;
    durationMs: number;
    status: 'ACTIVE';
}

export interface MigrationResult {
    migrationId: string;
    success: boolean;
    durationMs: number;
    error?: string;
}

export interface MigrationRunnerOptions {
    environment: string;
    dryRun?: boolean;
    verbose?: boolean;
}

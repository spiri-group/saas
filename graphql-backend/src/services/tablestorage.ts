import { LogManager } from "../utils/functions";
import { vault } from "./vault";
import { AzureNamedKeyCredential, TableClient, TableEntity } from "@azure/data-tables";

export class TableStorageDataSource {
    private credential: AzureNamedKeyCredential;
    private tableClients: Map<string, TableClient> = new Map();
    private vault: vault;
    private logger: LogManager;
    private storageUrl: string;
    private initialized = false;

    constructor(log: LogManager, keyVault: vault) {
        this.logger = log;
        this.vault = keyVault;
    }

    async init() {
        if (this.initialized) return;

        const storageName = await this.vault.get('storage-name');
        const storageKey = await this.vault.get('storage-key');
        this.storageUrl = `https://${storageName}.table.core.windows.net`;
        this.credential = new AzureNamedKeyCredential(storageName, storageKey);
        this.initialized = true;
    }

    /**
     * Get or create a TableClient for the specified table
     */
    private async getTableClient(tableName: string): Promise<TableClient> {
        if (!this.initialized) {
            await this.init();
        }

        if (!this.tableClients.has(tableName)) {
            const client = new TableClient(this.storageUrl, tableName, this.credential);

            // Create table if it doesn't exist
            try {
                await client.createTable();
                this.logger.logMessage(`Created table ${tableName}`);
            } catch (error: any) {
                // Table already exists - that's fine (409 Conflict)
                if (error.statusCode !== 409) {
                    throw error;
                }
            }

            this.tableClients.set(tableName, client);
        }

        return this.tableClients.get(tableName)!;
    }

    /**
     * Get a single entity by partition key and row key
     */
    async getEntity<T>(tableName: string, partitionKey: string, rowKey: string): Promise<(T & TableEntity) | null> {
        const client = await this.getTableClient(tableName);
        try {
            const entity = await client.getEntity(partitionKey, rowKey);
            return entity as T & TableEntity;
        } catch (error: any) {
            if (error.statusCode === 404) {
                return null;
            }
            throw error;
        }
    }

    /**
     * Create a new entity
     */
    async createEntity<T extends TableEntity>(tableName: string, entity: T): Promise<void> {
        const client = await this.getTableClient(tableName);
        await client.createEntity(entity);
    }

    /**
     * Update an entity (merge mode - only updates specified fields)
     */
    async updateEntity<T extends TableEntity>(tableName: string, entity: T): Promise<void> {
        const client = await this.getTableClient(tableName);
        await client.updateEntity(entity, "Merge");
    }

    /**
     * Replace an entity entirely
     */
    async replaceEntity<T extends TableEntity>(tableName: string, entity: T): Promise<void> {
        const client = await this.getTableClient(tableName);
        await client.updateEntity(entity, "Replace");
    }

    /**
     * Delete an entity
     */
    async deleteEntity(tableName: string, partitionKey: string, rowKey: string): Promise<void> {
        const client = await this.getTableClient(tableName);
        await client.deleteEntity(partitionKey, rowKey);
    }

    /**
     * Query entities with optional OData filter
     */
    async queryEntities<T>(tableName: string, filter?: string): Promise<(T & TableEntity)[]> {
        const client = await this.getTableClient(tableName);
        const entities: (T & TableEntity)[] = [];

        const queryOptions = filter ? { queryOptions: { filter } } : undefined;

        for await (const entity of client.listEntities(queryOptions)) {
            entities.push(entity as T & TableEntity);
        }

        return entities;
    }

    /**
     * Query entities with a callback for streaming large result sets
     */
    async queryEntitiesStreaming<T>(
        tableName: string,
        filter: string | undefined,
        callback: (entity: T & TableEntity) => void
    ): Promise<number> {
        const client = await this.getTableClient(tableName);
        let count = 0;

        const queryOptions = filter ? { queryOptions: { filter } } : undefined;

        for await (const entity of client.listEntities(queryOptions)) {
            callback(entity as T & TableEntity);
            count++;
        }

        return count;
    }
}

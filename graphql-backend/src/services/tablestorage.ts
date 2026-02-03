import { LogManager } from "../utils/functions";
import { vault } from "./vault";

import { AzureNamedKeyCredential, TableClient } from "@azure/data-tables";

export class TableStorageDataSource {
    private credential: AzureNamedKeyCredential;
    private serviceClient : TableClient;
    private vault: vault;
    private logger: LogManager;

    constructor(log: LogManager, keyVault: vault) {
        this.logger = log;
        this.vault = keyVault;
    }

    async init(name: string) {
        const storage_name = await this.vault.get('storage-name');
        const url = `https://${storage_name}.table.core.windows.net`;
        this.credential = new AzureNamedKeyCredential(
            storage_name, await this.vault.get('storage-key'));
        this.serviceClient = new TableClient(url, name, this.credential);
    }

    async getRow<T>(table: string, partitionKey: string, rowKey: string) {
        // Removed verbose logging - only log errors
        const entity = await this.serviceClient.getEntity(partitionKey, rowKey);
        return entity as T | null;
    }

    async createRow<T extends { partitionKey: string; rowKey: string; }>(entity: T) {
        // Only log creation (useful for debugging new users/sessions)
        this.logger.logMessage(`Creating row ${entity.rowKey} in table`);
        await this.serviceClient.createEntity(entity);
    }

    async queryEntities<T>(filter: string) {
        // Removed verbose logging - only log for debugging complex queries
        const entities: T[] = [];
        for await (const entity of this.serviceClient.listEntities({ queryOptions: { filter } })) {
            entities.push(entity as T);
        }
        return entities;
    }

    async deleteEntity(partitionKey: string, rowKey: string) {
        // Only log deletions (important for audit trail)
        this.logger.logMessage(`Deleting entity ${rowKey} from partition ${partitionKey}`);
        await this.serviceClient.deleteEntity(partitionKey, rowKey);
    }

}
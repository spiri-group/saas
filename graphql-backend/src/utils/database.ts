import { CosmosClient, ItemDefinition, PatchOperation, SqlQuerySpec } from "@azure/cosmos";
import { GraphQLError } from "graphql";
import { LogManager, flatten, generate_human_friendly_id, isNullOrWhiteSpace, mergeDeep, trimObj } from "./functions";
import { DateTime } from "luxon"
import { v4 as uuid } from "uuid"

import { DefaultAzureCredential, ManagedIdentityCredential } from "@azure/identity";
import { vault } from "../services/vault";

export enum RecordStatus {
    ACTIVE = "ACTIVE", INACTIVE = "INACTIVE", DELETED = "DELETED"
}

export class CosmosDataSource {
    private dbConnection : CosmosClient | null;
    private logger : LogManager
    private vault : vault

    constructor(log: LogManager, vault: vault) {
        this.logger = log;
        this.vault = vault;
    }

    async init(host: string) {
        if (!this.dbConnection) {
            this.dbConnection = await this.initializeDBConnection(host);
        }
    }
    
    async initializeDBConnection(host: string) {
        // set up our database details, instantiate our connection,
        // and return that database connection

        var endpoint = await this.vault.get("cosmos-endpoint");
        if (endpoint == undefined) throw "Cosmos :: Cannot connect to database, missing connection string"
        // Removed verbose "Endpoint successfully obtained" log - only log errors

        let credential = null;
        if (host.includes("azure")) {
            // Removed verbose "Got managed identity" log
            credential = new ManagedIdentityCredential();
        } else {
            // Removed verbose "Got default credential" log
            credential = new DefaultAzureCredential();
        }

        var cms = new CosmosClient({
            endpoint: endpoint,
            aadCredentials: credential
        });
        // Removed verbose "Successfully connected" log - only log errors
        return cms;

    }

    // Cache for available container names (fetched once from Azure)
    private availableContainers: string[] | null = null;

    // Known containers that can be auto-created if they don't exist
    // Maps container name to partition key path
    private static AUTO_CREATE_CONTAINERS: Record<string, string> = {
        "Main-PractitionerSchedules": "/practitionerId",
        "Main-PlatformAlert": "/id"
    };

    private async getAvailableContainers(): Promise<string[]> {
        if (this.availableContainers) {
            return this.availableContainers;
        }

        try {
            const conn = await this.dbConnection;
            if (conn == null) return [];

            const database = conn.database("Core");
            const { resources } = await database.containers.readAll().fetchAll();
            this.availableContainers = resources.map(c => c.id);
            return this.availableContainers;
        } catch {
            return [];
        }
    }

    async get_container (container_name: string) {
        try {
            const conn = await this.dbConnection;
            if (conn == null) throw "This must be initialised first";

            const database = conn.database("Core");
            const container = database.container(container_name);
            try { await container.read() } catch (ex) {
                // Check if this is a known container that we can auto-create
                const partitionKeyPath = CosmosDataSource.AUTO_CREATE_CONTAINERS[container_name];
                if (partitionKeyPath) {
                    this.logger?.logMessage?.(`Container "${container_name}" not found, auto-creating with partition key "${partitionKeyPath}"...`);
                    try {
                        await database.containers.createIfNotExists({
                            id: container_name,
                            partitionKey: { paths: [partitionKeyPath] }
                        });
                        this.logger?.logMessage?.(`Container "${container_name}" created successfully`);
                        // Clear the container cache so it's refreshed
                        this.availableContainers = null;
                        return database.container(container_name);
                    } catch (createEx: any) {
                        this.logger?.logMessage?.(`Failed to auto-create container "${container_name}": ${createEx.message}`);
                        // Fall through to the error handling below
                    }
                }

                // Fetch available containers from Azure for helpful suggestions
                const availableContainers = await this.getAvailableContainers();

                // Find similar container names
                const searchTerm = container_name.toLowerCase().replace('main-', '').replace('system-', '');
                const suggestions = availableContainers
                    .filter(name =>
                        name.toLowerCase().includes(searchTerm) ||
                        searchTerm.includes(name.toLowerCase().replace('main-', '').replace('system-', ''))
                    )
                    .slice(0, 3);

                const suggestionMsg = suggestions.length > 0
                    ? ` Did you mean: ${suggestions.join(', ')}?`
                    : availableContainers.length > 0
                        ? ` Available containers: ${availableContainers.join(', ')}`
                        : '';

                throw `Could not access container "${container_name}".${suggestionMsg}`
            }
            return container;
        } catch (err) {
            throw (`Error getting container ${container_name} with ${err}`);
        }
    }
    
    async run_query<T = any>(
        container_name: string,
        querySpec: SqlQuerySpec,
        ignoreStatus?: boolean
        ): Promise<T[]> {
        // capture the exact spec we’re going to send
        let finalSpec: SqlQuerySpec = querySpec;
        try {
            if (!ignoreStatus) finalSpec = addStatusConstraint(querySpec);

            const container = await this.get_container(container_name);
            const { resources /*, headers*/ } = await container.items
            .query<T>(finalSpec /*, { populateQueryMetrics: true } */)
            .fetchAll();

            return resources;
        } catch (err: any) {
            // pull a few useful bits if present
            const activityId = err?.activityId ?? err?.headers?.["x-ms-activity-id"];
            const subStatus  = err?.subStatusCode ?? err?.headers?.["x-ms-substatus"];
            const code       = err?.code ?? err?.statusCode ?? err?.status;
            const message    = (err?.message || String(err)).trim();

            const logBlock = [
            `Cosmos query failed`,
            `  Container : ${container_name}`,
            `  Code/Sub  : ${code ?? "?"}${subStatus ? "/" + subStatus : ""}`,
            `  Activity  : ${activityId ?? "(none)"}`,
            `  Message   : ${message}`,
            `  Final SQL : ${compactSql(finalSpec.query)}`,
            `  Params    : ${
                finalSpec.parameters?.length
                ? finalSpec.parameters.map(p => `${p.name}=${JSON.stringify(p.value)}`).join(", ")
                : "(none)"
            }`,
            ].join("\n");

            this.logger?.logMessage?.(logBlock);

            // Rethrow something clean but with a reference
            throw new Error(
            `Query failed (${code ?? "unknown"}${subStatus ? "/" + subStatus : ""}).` +
            (activityId ? ` Ref: ${activityId}.` : "")
            );
        }
    }

    async get_scalar<T extends Record<string, any>>(
        container_name: string,
        container_partition_column: string | string[],
        fieldsRequired: string | string[], // <-- Accepts both string and string[]
        id: string,
        partitionValue: string | string[]
    ): Promise<T | null> {
        try {
            const container = await this.get_container(container_name);
    
            // Handle multiple partition keys
            const partitionColumns = Array.isArray(container_partition_column)
                ? container_partition_column
                : [container_partition_column];
    
            const partitionValues = Array.isArray(partitionValue) ? partitionValue : [partitionValue];
    
            if (partitionColumns.length !== partitionValues.length) {
                throw new Error(`Partition key mismatch: Expected ${partitionColumns.length}, got ${partitionValues.length}`);
            }
    
            // Construct WHERE clause dynamically for multiple partitions
            const partitionConditions = partitionColumns
                .map((col, index) => `c.${col} = @partition${index}`)
                .join(" AND ");
    
            // Construct query parameters
            const parameters = [
                { name: "@id", value: id },
                ...partitionValues.map((val, index) => ({ name: `@partition${index}`, value: val }))
            ];
    
            // Ensure fieldsRequired is always treated as an array
            const fields = Array.isArray(fieldsRequired) ? fieldsRequired : [fieldsRequired];
    
            const fieldsQuery = fields.map(field => `c.${field}`).join(", ");
    
            const querySpec = {
                query: `SELECT ${fieldsQuery} FROM c WHERE c.id = @id AND ${partitionConditions}`,
                parameters
            };
    
            const items = (await container.items.query<T>(querySpec).fetchAll()).resources;
            if (items.length === 0) return null;

            return items[0]; // Return as object
        } catch (ex) {
            console.error(`Error in get_scalar for container "${container_name}": ${ex}`);
            throw new Error(`Failed to fetch scalar value: ${ex}`);
        }
    }

    /**
     * Same as get_scalar but throws an error if the record is not found.
     * Use this when the record MUST exist (avoids null check at call sites).
     */
    async get_scalar_required<T extends Record<string, any>>(
        container_name: string,
        container_partition_column: string | string[],
        fieldsRequired: string | string[],
        id: string,
        partitionValue: string | string[],
        entityDescription?: string // e.g., "User", "Vendor", "Listing" for better error messages
    ): Promise<T> {
        const result = await this.get_scalar<T>(container_name, container_partition_column, fieldsRequired, id, partitionValue);
        if (result === null) {
            const entity = entityDescription || container_name.replace("Main-", "");
            throw new Error(`${entity} not found: ${id}`);
        }
        return result;
    }

    async get_all<T>(container_name: string, partitionValue?: string | string[]) {
        try {
            const container = await this.get_container(container_name)
            if (partitionValue == null) {
                return (await container.items.readAll().fetchAll()).resources.filter(x => x.status == RecordStatus.ACTIVE).map(s => s as T);
            } else {
                return (await container.items.readAll({ partitionKey: partitionValue }).fetchAll()).resources.filter(x => x.status == RecordStatus.ACTIVE).map(s => s as T);
            }
        } catch (err) {
            throw (`Error getting all records from container ${container_name} with ${err}`);
        }
    }
    
    async get_record<T>(container_name: string, id: string, partitionValue: string | string[]) {
        try {
            const container = await this.get_container(container_name)
            const dbItem = await container.item(id, partitionValue);
            const response = await dbItem.read();
            var dbItemContent : T = response.resource
            if (dbItemContent == null) {
                throw `Could not find record in ${container_name} with (id: ${id}, partition: ${flatten(partitionValue)})`
            }
            // Attach ETag to the returned object for optimistic concurrency
            (dbItemContent as any)._etag = response.etag;
            return dbItemContent
        } catch (err) {
            throw (`Error getting record ${id} from container ${container_name} with ${err}`);
        }
    }

    async get_record_by_doctype<T>(container_name: string, id: string, partitionValue: string | string[], docType: string): Promise<T | null> {
        try {
            const container = await this.get_container(container_name)
            const dbItem = await container.item(id, partitionValue);
            var dbItemContent : T = (await dbItem.read()).resource
            
            if (dbItemContent == null) {
                return null;
            }

            // Verify this record has the expected docType
            const recordWithDocType = dbItemContent as any;
            if (recordWithDocType.docType !== docType) {
                return null;
            }

            return dbItemContent;
        } catch (err) {
            if (err.code === 404) {
                return null;
            }
            throw (`Error getting record ${id} with docType ${docType} from container ${container_name} with ${err}`);
        }
    }
    
    async add_record<T extends ItemDefinition>(container_name: string, record: any, partitionValue: string | string[], performedById: string) {
        try {
            const container = await this.get_container(container_name)
            record["status"] = RecordStatus.ACTIVE;
            record.createdDate = DateTime.now().toISO(),
            record.createdBy = performedById
            var resp = await container.items.create(trimObj(record));
            const dbItem = await container.item(resp.item.id, partitionValue);
            var dbItemContent : T = (await dbItem.read()).resource
            return dbItemContent
        } catch (err) {
            throw (`Error adding record to container ${container_name} with ${err}`);
        }
    }
    
    async delete_record(container_name: string, id: string, partitionValue: string | string[], performedById:string) {
        try {
            await this.update_status(container_name, id, partitionValue, RecordStatus.DELETED, performedById)
        } catch (err) {
            throw (`Error deleting record ${id} from container ${container_name} with ${err}`);
        }
    }
    
    async purge_record(container_name: string, id: string, partitionValue: string | string[]) {
        try {
            const container = await this.get_container(container_name)
            const dbItem = await container.item(id, partitionValue);
            await dbItem.delete();
        } catch (error) {
            if (error.code == 404) {
                throw new GraphQLError(`Cannot find (${id}, ${partitionValue}) in container ${container_name}`, {
                    extensions: { code: 'BAD_REQUEST'},
                  });
            } else {
                throw new GraphQLError(error.message, {
                    extensions: { code: 'BAD_REQUEST'},
                  });
            }
        }
    }
    
    async update_status<T>(container_name: string, id: string, partitionValue: string | string[], newStatus: RecordStatus, performedById: string) {
        try {
            const container = await this.get_container(container_name)
            const operations : PatchOperation[] =
            [
                { op: "replace", path: '/status', value: newStatus },
                { op: "set", path: '/modifiedBy', value: performedById},
                { op: "set", path: '/modifiedDate', value: DateTime.now().toISO() }
            ];
            await container.item(id, partitionValue).patch(operations)
            return await this.get_record<T>(container_name, id, partitionValue);
        } catch (err) {
            throw (`Error updating status of record ${id} in container ${container_name} with ${err}`);
        }
    }
    
    async record_exists(container_name: string, id: string, partitionValue: string | string[]) {
        try {
            const container = await this.get_container(container_name)
            const { statusCode } = await container.item(id, partitionValue).read();
            if (statusCode === 404) {
                return false;
            } else if (statusCode == 200) {
                return true;
            } else {
                throw new GraphQLError(`Got a status code ${statusCode} when asking for record (${id}, ${partitionValue})`, {
                    extensions: { code: 'BAD_REQUEST'},
                  });
            }
        } catch (err) {
            throw (`Error checking existence of record ${id} in container ${container_name} with ${err}`);
        }
    }

    async patch_record(container_name: string, id: string, partitionValue: string | string[], patchOps: PatchOperation[], performedById: string, etag?: string) {
        try {
            const container = await this.get_container(container_name)
            const patchOperations: PatchOperation[] = [
                { op: "set", path: '/modifiedBy', value: performedById },
                { op: "set", path: '/modifiedDate', value: DateTime.now().toISO() },
                ...patchOps
            ];

            const batchSize = 9; // This is an artifical limit by Microsoft on doing partial document updates in cosmos
            const totalOperations = patchOperations.length;

            const requestOptions = etag ? { accessCondition: { type: "IfMatch", condition: etag } } : {};

            for (let i = 0; i < totalOperations; i += batchSize) {
                const batch = patchOperations.slice(i, i + batchSize);
                await container.item(id, partitionValue).patch(batch, requestOptions);
            }
        } catch (err: any) {
            // HTTP 412 Precondition Failed means ETag mismatch (document was modified)
            if (err.code === 412 || err.statusCode === 412) {
                throw new GraphQLError('The document has been modified by another request. Please retry your operation.', {
                    extensions: { code: 'PRECONDITION_FAILED' }
                });
            }
            throw (`Error patching record ${id} in ${container_name} with ${err}`)
        }
    }
    
    async update_record(container_name: string, id:string, partition: string | string[], newObject: any, performedById: string) {
        try {
            const container = await this.get_container(container_name);
            const dbRecord = await this.get_record<any>(container_name, id, partition)
            const new_dbRecord = mergeDeep(dbRecord, newObject)
            new_dbRecord.modifiedDate = DateTime.now().toISO()
            new_dbRecord.modifiedBy = performedById
            await container.item(id, partition).replace(new_dbRecord) 
        } catch (err) {
            throw (`Error updating record ${id} in container ${container_name} with ${err}`);
        }
    }

    async upsert_record<T extends ItemDefinition>(container_name: string, id: string, record: any, partitionValue?: string | string[]) {
        try {
            const container = await this.get_container(container_name);
            
            // Ensure the record has the proper ID and partition
            record.id = id;
            if (partitionValue && !Array.isArray(partitionValue)) {
                // If single partition value, make sure it's set in the record
                // This assumes the partition key field name matches the container setup
                // You may need to adjust this based on your partition key configuration
            }
            
            // Set timestamps if creating new
            const now = DateTime.now().toISO();
            if (!record.createdAt && !record.createdDate) {
                record.createdAt = now;
            }
            record.updatedAt = now;
            
            // Ensure status is set
            if (!record.status) {
                record.status = RecordStatus.ACTIVE;
            }
            
            // Use upsert operation (create or replace)
            const response = await container.items.upsert(trimObj(record));
            return response.resource as unknown as T;
        } catch (err) {
            throw (`Error upserting record ${id} in container ${container_name} with ${err}`);
        }
    }

    async generate_unique_code(prefix: string, existing_codes_func: () => Promise<string[]>) {
        const existingCodes = await existing_codes_func()

        var code = "";
        var maxDigits = 24;
        var attempts = 0;
        var maxAttempts = 500;

        while (isNullOrWhiteSpace(code) || existingCodes.includes(code) && attempts < maxAttempts) {
            code = generate_human_friendly_id(prefix, maxDigits);
            maxDigits += 1; // opens the search space to wider for the uniqueness
            attempts++;
        }

        if (attempts == maxAttempts) {
            return uuid()
        }

        return code;
    }

}

/** Extracts alias from "FROM container alias". Defaults to "c". */
function detectAlias(query: string, fallback = "c"): string {
  const m = query.match(/\bfrom\s+([a-zA-Z_][\w]*)\b/i);
  if (!m) return fallback;
  const candidate = m[1];
  // guard against keywords just in case
  const kw = new Set(["where", "order", "group", "join", "offset", "limit", "by"]);
  return kw.has(candidate.toLowerCase()) ? fallback : candidate;
}

/** Adds "<alias>.status = @status" constraint if not already present */
function addStatusConstraint(spec: SqlQuerySpec): SqlQuerySpec {
  const alias = detectAlias(spec.query, "c");

  // If query already mentions "<alias>.status", skip
  if (new RegExp(`\\b${alias}\\.status\\b`, "i").test(spec.query)) {
    return spec;
  }

  const orderIdx = spec.query.search(/\border\s+by\b/i);
  const tail = orderIdx >= 0 ? spec.query.slice(orderIdx) : "";
  const head = orderIdx >= 0 ? spec.query.slice(0, orderIdx).trimEnd() : spec.query.trimEnd();

  const hasWhere = /\bwhere\b/i.test(head);
  const injected = hasWhere
    ? `${head} AND ${alias}.status = @status`
    : `${head} WHERE ${alias}.status = @status`;

  const parameters = [...(spec.parameters ?? [])];
  if (!parameters.some(p => p.name === "@status")) {
    parameters.push({ name: "@status", value: RecordStatus.ACTIVE });
  }

  return { query: `${injected}${tail ? " " + tail : ""}`, parameters };
}

function compactSql(q: string) {
  return q.replace(/\s+/g, " ").trim();
}

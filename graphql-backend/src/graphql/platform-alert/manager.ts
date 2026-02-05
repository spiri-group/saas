import { TableEntity } from "@azure/data-tables";
import { DateTime } from "luxon";
import { v4 as uuidv4 } from "uuid";
import { TableStorageDataSource } from "../../services/tablestorage";
import { platform_alert_type, AlertStatus, AlertSeverity, AlertType } from "./types";

const TABLE_NAME = "PlatformAlerts";

// Table Storage entity type
interface AlertEntity extends TableEntity {
    partitionKey: string;  // YYYY-MM format
    rowKey: string;        // invertedTimestamp_id for newest-first ordering
    id: string;
    code: string;
    alertType: string;
    severity: string;
    alertStatus: string;
    title: string;
    message: string;
    customerId?: string;
    customerEmail?: string;
    merchantId?: string;
    contextJson: string;   // JSON string for nested context object
    sourceJson: string;    // JSON string for nested source object
    assigneeId?: string;
    resolutionNotes?: string;
    resolvedAt?: string;
    dismissedAt?: string;
    createdDate: string;
    updatedDate?: string;
}

/**
 * Generate inverted timestamp for newest-first ordering
 * Table Storage sorts RowKey ascending, so we invert the timestamp
 */
function invertedTimestamp(date: DateTime): string {
    const maxTimestamp = 9999999999999;
    const inverted = maxTimestamp - date.toMillis();
    return inverted.toString().padStart(13, '0');
}

/**
 * Get partition key from date (YYYY-MM format)
 */
function getPartitionKey(date: DateTime): string {
    return date.toFormat('yyyy-MM');
}

/**
 * Convert entity to platform_alert_type
 */
function entityToAlert(entity: AlertEntity): platform_alert_type {
    return {
        id: entity.id,
        code: entity.code,
        alertType: entity.alertType as AlertType,
        severity: entity.severity as AlertSeverity,
        alertStatus: entity.alertStatus as AlertStatus,
        title: entity.title,
        message: entity.message,
        customerId: entity.customerId,
        customerEmail: entity.customerEmail,
        merchantId: entity.merchantId,
        context: JSON.parse(entity.contextJson || '{}'),
        source: JSON.parse(entity.sourceJson || '{}'),
        assigneeId: entity.assigneeId,
        resolutionNotes: entity.resolutionNotes,
        resolvedAt: entity.resolvedAt,
        dismissedAt: entity.dismissedAt,
        createdDate: entity.createdDate,
        updatedDate: entity.updatedDate,
        ref: {
            id: entity.id,
            partition: entity.id,
            container: TABLE_NAME
        }
    };
}

/**
 * Convert platform_alert_type to entity
 */
function alertToEntity(alert: platform_alert_type): AlertEntity {
    const createdDate = DateTime.fromISO(alert.createdDate);
    return {
        partitionKey: getPartitionKey(createdDate),
        rowKey: `${invertedTimestamp(createdDate)}_${alert.id}`,
        id: alert.id,
        code: alert.code,
        alertType: alert.alertType,
        severity: alert.severity,
        alertStatus: alert.alertStatus,
        title: alert.title,
        message: alert.message,
        customerId: alert.customerId,
        customerEmail: alert.customerEmail,
        merchantId: alert.merchantId,
        contextJson: JSON.stringify(alert.context || {}),
        sourceJson: JSON.stringify(alert.source || {}),
        assigneeId: alert.assigneeId,
        resolutionNotes: alert.resolutionNotes,
        resolvedAt: alert.resolvedAt,
        dismissedAt: alert.dismissedAt,
        createdDate: alert.createdDate,
        updatedDate: alert.updatedDate
    };
}

/**
 * Platform Alert Manager - thin layer over TableStorageDataSource
 */
export const PlatformAlertManager = {
    /**
     * Generate unique alert code (ALT-XXXXXX)
     */
    generateCode(): string {
        const random = Math.floor(Math.random() * 900000) + 100000;
        return `ALT-${random}`;
    },

    /**
     * Create a new alert
     */
    async create(tableStorage: TableStorageDataSource, input: {
        alertType: string;
        severity: string;
        title: string;
        message: string;
        customerId?: string;
        customerEmail?: string;
        merchantId?: string;
        context?: platform_alert_type['context'];
        source: platform_alert_type['source'];
    }): Promise<platform_alert_type> {
        const now = DateTime.now();
        const alertId = uuidv4();
        const code = this.generateCode();

        const alert: platform_alert_type = {
            id: alertId,
            code,
            alertType: input.alertType as AlertType,
            severity: input.severity as AlertSeverity,
            alertStatus: AlertStatus.NEW,
            title: input.title,
            message: input.message,
            customerId: input.customerId,
            customerEmail: input.customerEmail,
            merchantId: input.merchantId,
            context: input.context || {},
            source: input.source,
            createdDate: now.toISO()!,
            ref: {
                id: alertId,
                partition: alertId,
                container: TABLE_NAME
            }
        };

        const entity = alertToEntity(alert);
        await tableStorage.createEntity(TABLE_NAME, entity);

        return alert;
    },

    /**
     * Get a single alert by ID
     */
    async getById(tableStorage: TableStorageDataSource, id: string): Promise<platform_alert_type | null> {
        // Search across all partitions for the ID
        const filter = `id eq '${id}'`;
        const entities = await tableStorage.queryEntities<AlertEntity>(TABLE_NAME, filter);

        if (entities.length > 0) {
            return entityToAlert(entities[0]);
        }

        return null;
    },

    /**
     * Query alerts with filters
     */
    async query(tableStorage: TableStorageDataSource, options: {
        alertStatuses?: string[];
        severities?: string[];
        alertTypes?: string[];
        searchTerm?: string;
        dateFrom?: string;
        dateTo?: string;
        limit?: number;
        offset?: number;
    }): Promise<{ alerts: platform_alert_type[]; totalCount: number; hasMore: boolean }> {
        const limit = options.limit || 50;
        const offset = options.offset || 0;

        // Build partition key filter for date range
        const filters: string[] = [];

        if (options.dateFrom) {
            const fromDate = DateTime.fromISO(options.dateFrom);
            filters.push(`PartitionKey ge '${getPartitionKey(fromDate)}'`);
        }

        if (options.dateTo) {
            const toDate = DateTime.fromISO(options.dateTo);
            filters.push(`PartitionKey le '${getPartitionKey(toDate)}'`);
        }

        const filter = filters.length > 0 ? filters.join(' and ') : undefined;

        // Fetch all matching entities
        const allEntities = await tableStorage.queryEntities<AlertEntity>(TABLE_NAME, filter);

        // Apply in-memory filters
        let filtered = allEntities;

        if (options.alertStatuses && options.alertStatuses.length > 0) {
            filtered = filtered.filter(e => options.alertStatuses!.includes(e.alertStatus));
        }

        if (options.severities && options.severities.length > 0) {
            filtered = filtered.filter(e => options.severities!.includes(e.severity));
        }

        if (options.alertTypes && options.alertTypes.length > 0) {
            filtered = filtered.filter(e => options.alertTypes!.includes(e.alertType));
        }

        if (options.searchTerm) {
            const term = options.searchTerm.toLowerCase();
            filtered = filtered.filter(e =>
                e.code.toLowerCase().includes(term) ||
                e.title.toLowerCase().includes(term) ||
                e.message.toLowerCase().includes(term)
            );
        }

        // Date range filtering (more precise than partition key)
        if (options.dateFrom) {
            filtered = filtered.filter(e => e.createdDate >= options.dateFrom!);
        }
        if (options.dateTo) {
            filtered = filtered.filter(e => e.createdDate <= options.dateTo!);
        }

        const totalCount = filtered.length;

        // Already sorted by rowKey (inverted timestamp = newest first)
        const paginated = filtered.slice(offset, offset + limit);

        return {
            alerts: paginated.map(e => entityToAlert(e)),
            totalCount,
            hasMore: offset + paginated.length < totalCount
        };
    },

    /**
     * Get stats for dashboard
     */
    async getStats(tableStorage: TableStorageDataSource): Promise<{
        total: number;
        byStatus: Record<string, number>;
        bySeverity: Record<string, number>;
    }> {
        const byStatus: Record<string, number> = {};
        const bySeverity: Record<string, number> = {};
        let total = 0;

        const entities = await tableStorage.queryEntities<AlertEntity>(TABLE_NAME);

        for (const entity of entities) {
            total++;
            byStatus[entity.alertStatus] = (byStatus[entity.alertStatus] || 0) + 1;
            bySeverity[entity.severity] = (bySeverity[entity.severity] || 0) + 1;
        }

        return { total, byStatus, bySeverity };
    },

    /**
     * Update alert status
     */
    async updateStatus(
        tableStorage: TableStorageDataSource,
        id: string,
        alertStatus: string,
        resolutionNotes?: string
    ): Promise<platform_alert_type | null> {
        const alert = await this.getById(tableStorage, id);
        if (!alert) return null;

        const now = DateTime.now().toISO()!;
        const createdDate = DateTime.fromISO(alert.createdDate);
        const partitionKey = getPartitionKey(createdDate);
        const rowKey = `${invertedTimestamp(createdDate)}_${id}`;

        const updates: Partial<AlertEntity> = {
            partitionKey,
            rowKey,
            alertStatus,
            updatedDate: now
        };

        if (resolutionNotes) {
            updates.resolutionNotes = resolutionNotes;
        }

        if (alertStatus === AlertStatus.RESOLVED) {
            updates.resolvedAt = now;
        }

        if (alertStatus === AlertStatus.DISMISSED) {
            updates.dismissedAt = now;
        }

        await tableStorage.updateEntity(TABLE_NAME, updates as AlertEntity);

        return this.getById(tableStorage, id);
    },

    /**
     * Assign alert to user
     */
    async assign(
        tableStorage: TableStorageDataSource,
        id: string,
        assigneeId?: string
    ): Promise<platform_alert_type | null> {
        const alert = await this.getById(tableStorage, id);
        if (!alert) return null;

        const now = DateTime.now().toISO()!;
        const createdDate = DateTime.fromISO(alert.createdDate);
        const partitionKey = getPartitionKey(createdDate);
        const rowKey = `${invertedTimestamp(createdDate)}_${id}`;

        await tableStorage.updateEntity(TABLE_NAME, {
            partitionKey,
            rowKey,
            assigneeId: assigneeId || undefined,
            updatedDate: now
        } as AlertEntity);

        return this.getById(tableStorage, id);
    },

    /**
     * Dismiss alert
     */
    async dismiss(
        tableStorage: TableStorageDataSource,
        id: string,
        resolutionNotes?: string
    ): Promise<platform_alert_type | null> {
        return this.updateStatus(tableStorage, id, AlertStatus.DISMISSED, resolutionNotes);
    }
};

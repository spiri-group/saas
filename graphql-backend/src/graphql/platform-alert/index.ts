import { v4 as uuidv4 } from 'uuid'
import { serverContext } from "../../services/azFunction"
import { platform_alert_type, AlertStatus, AlertSeverity, AlertType } from "./types"
import { DateTime } from "luxon"
import { PatchOperation } from "@azure/cosmos"
import { DataAction } from '../../services/signalR'
import { user_type } from '../user/types'
import { vendor_type } from '../vendor/types'

const CONTAINER = "Main-PlatformAlert"
const SIGNALR_GROUP = "console-alerts"

const resolvers = {
    Query: {
        platformAlert: async (_: any, args: { id: string }, context: serverContext) => {
            try {
                const alert = await context.dataSources.cosmos.get_record<platform_alert_type>(
                    CONTAINER,
                    args.id,
                    args.id
                )
                return alert
            } catch {
                return null
            }
        },

        platformAlerts: async (_: any, args: {
            alertStatuses?: string[]
            severities?: string[]
            alertTypes?: string[]
            searchTerm?: string
            dateFrom?: string
            dateTo?: string
            limit?: number
            offset?: number
        }, context: serverContext) => {
            const limit = args.limit || 50
            const offset = args.offset || 0

            let whereConditions: string[] = []
            let parameters: { name: string, value: any }[] = []

            // Filter by alert status
            if (args.alertStatuses && args.alertStatuses.length > 0) {
                whereConditions.push("ARRAY_CONTAINS(@alertStatuses, c.alertStatus)")
                parameters.push({ name: "@alertStatuses", value: args.alertStatuses })
            }

            // Filter by severity
            if (args.severities && args.severities.length > 0) {
                whereConditions.push("ARRAY_CONTAINS(@severities, c.severity)")
                parameters.push({ name: "@severities", value: args.severities })
            }

            // Filter by alert type
            if (args.alertTypes && args.alertTypes.length > 0) {
                whereConditions.push("ARRAY_CONTAINS(@alertTypes, c.alertType)")
                parameters.push({ name: "@alertTypes", value: args.alertTypes })
            }

            // Search by code, title, or message
            if (args.searchTerm) {
                whereConditions.push("(CONTAINS(LOWER(c.code), LOWER(@searchTerm)) OR CONTAINS(LOWER(c.title), LOWER(@searchTerm)) OR CONTAINS(LOWER(c.message), LOWER(@searchTerm)))")
                parameters.push({ name: "@searchTerm", value: args.searchTerm })
            }

            // Date range
            if (args.dateFrom) {
                whereConditions.push("c.createdDate >= @dateFrom")
                parameters.push({ name: "@dateFrom", value: args.dateFrom })
            }
            if (args.dateTo) {
                whereConditions.push("c.createdDate <= @dateTo")
                parameters.push({ name: "@dateTo", value: args.dateTo })
            }

            const whereClause = whereConditions.length > 0
                ? `WHERE ${whereConditions.join(" AND ")}`
                : ""

            // Get paginated results
            const querySpec = {
                query: `SELECT * FROM c ${whereClause} ORDER BY c.createdDate DESC OFFSET @offset LIMIT @limit`,
                parameters: [
                    ...parameters,
                    { name: "@offset", value: offset },
                    { name: "@limit", value: limit }
                ]
            }

            const alerts = await context.dataSources.cosmos.run_query<platform_alert_type>(CONTAINER, querySpec, true)

            // Get total count
            const countQuery = {
                query: `SELECT VALUE COUNT(1) FROM c ${whereClause}`,
                parameters
            }
            const countResult = await context.dataSources.cosmos.run_query<number>(CONTAINER, countQuery, true)
            const totalCount = countResult[0] || 0

            return {
                alerts,
                totalCount,
                hasMore: offset + alerts.length < totalCount
            }
        },

        platformAlertStats: async (_: any, _args: any, context: serverContext) => {
            // Get counts by status
            const statusQuery = {
                query: `SELECT c.alertStatus, COUNT(1) as count FROM c GROUP BY c.alertStatus`,
                parameters: []
            }
            const statusResults = await context.dataSources.cosmos.run_query<{ alertStatus: string, count: number }>(CONTAINER, statusQuery, true)

            // Get counts by severity
            const severityQuery = {
                query: `SELECT c.severity, COUNT(1) as count FROM c GROUP BY c.severity`,
                parameters: []
            }
            const severityResults = await context.dataSources.cosmos.run_query<{ severity: string, count: number }>(CONTAINER, severityQuery, true)

            // Calculate total
            const total = statusResults.reduce((acc, r) => acc + r.count, 0)

            // Map status counts
            const byStatus = {
                new: statusResults.find(r => r.alertStatus === AlertStatus.NEW)?.count || 0,
                investigating: statusResults.find(r => r.alertStatus === AlertStatus.INVESTIGATING)?.count || 0,
                awaitingResponse: statusResults.find(r => r.alertStatus === AlertStatus.AWAITING_RESPONSE)?.count || 0,
                resolved: statusResults.find(r => r.alertStatus === AlertStatus.RESOLVED)?.count || 0,
                dismissed: statusResults.find(r => r.alertStatus === AlertStatus.DISMISSED)?.count || 0
            }

            // Map severity counts
            const bySeverity = {
                low: severityResults.find(r => r.severity === AlertSeverity.LOW)?.count || 0,
                medium: severityResults.find(r => r.severity === AlertSeverity.MEDIUM)?.count || 0,
                high: severityResults.find(r => r.severity === AlertSeverity.HIGH)?.count || 0,
                critical: severityResults.find(r => r.severity === AlertSeverity.CRITICAL)?.count || 0
            }

            return {
                total,
                byStatus,
                bySeverity
            }
        }
    },

    Mutation: {
        createPlatformAlert: async (_: any, args: {
            input: {
                alertType: string
                severity: string
                title: string
                message: string
                customerId?: string
                customerEmail?: string
                merchantId?: string
                context?: {
                    orderId?: string
                    setupIntentId?: string
                    errorMessage?: string
                    url?: string
                    stackTrace?: string
                    userAgent?: string
                    additionalData?: Record<string, unknown>
                }
                source: {
                    component: string
                    environment: string
                    version?: string
                }
            }
        }, context: serverContext) => {
            const alertId = uuidv4()
            const now = DateTime.now().toISO()

            // Generate human-readable code
            const code = await context.dataSources.cosmos.generate_unique_code(
                "ALT",
                async () => {
                    const existingCodes = await context.dataSources.cosmos.run_query<string>(CONTAINER, {
                        query: `SELECT VALUE c.code FROM c`,
                        parameters: []
                    }, true)
                    return existingCodes
                }
            )

            const alert: platform_alert_type = {
                id: alertId,
                code,
                alertType: args.input.alertType as AlertType,
                severity: args.input.severity as AlertSeverity,
                alertStatus: AlertStatus.NEW,
                title: args.input.title,
                message: args.input.message,
                customerId: args.input.customerId,
                customerEmail: args.input.customerEmail,
                merchantId: args.input.merchantId,
                context: args.input.context || {},
                source: args.input.source,
                createdDate: now,
                ref: {
                    id: alertId,
                    partition: alertId,
                    container: CONTAINER
                }
            }

            await context.dataSources.cosmos.add_record(CONTAINER, alert, alertId, context.userId || "SYSTEM")

            // Send real-time notification to console
            context.signalR.addDataMessage(
                "platformAlert",
                { id: alertId, alertType: alert.alertType, severity: alert.severity },
                { action: DataAction.UPSERT, group: SIGNALR_GROUP }
            )

            // Send notification for high/critical alerts
            if (alert.severity === AlertSeverity.HIGH || alert.severity === AlertSeverity.CRITICAL) {
                context.signalR.addNotificationMessage(
                    `${alert.severity} Alert: ${alert.title}`,
                    { group: SIGNALR_GROUP, status: alert.severity === AlertSeverity.CRITICAL ? "error" : "warn" }
                )
            }

            return {
                code: "200",
                success: true,
                message: `Alert ${code} created successfully`,
                alert: await context.dataSources.cosmos.get_record<platform_alert_type>(CONTAINER, alertId, alertId)
            }
        },

        updatePlatformAlertStatus: async (_: any, args: {
            id: string
            alertStatus: string
            resolutionNotes?: string
        }, context: serverContext) => {
            const now = DateTime.now().toISO()

            const patchOps: PatchOperation[] = [
                { op: "set", path: "/alertStatus", value: args.alertStatus },
                { op: "set", path: "/updatedDate", value: now }
            ]

            if (args.resolutionNotes) {
                patchOps.push({ op: "set", path: "/resolutionNotes", value: args.resolutionNotes })
            }

            if (args.alertStatus === AlertStatus.RESOLVED) {
                patchOps.push({ op: "set", path: "/resolvedAt", value: now })
            }

            if (args.alertStatus === AlertStatus.DISMISSED) {
                patchOps.push({ op: "set", path: "/dismissedAt", value: now })
            }

            await context.dataSources.cosmos.patch_record(CONTAINER, args.id, args.id, patchOps, context.userId || "SYSTEM")

            // Send real-time update
            context.signalR.addDataMessage(
                "platformAlert",
                { id: args.id, alertStatus: args.alertStatus },
                { action: DataAction.UPSERT, group: SIGNALR_GROUP }
            )

            return {
                code: "200",
                success: true,
                message: `Alert status updated to ${args.alertStatus}`,
                alert: await context.dataSources.cosmos.get_record<platform_alert_type>(CONTAINER, args.id, args.id)
            }
        },

        assignPlatformAlert: async (_: any, args: {
            id: string
            assigneeId?: string
        }, context: serverContext) => {
            const now = DateTime.now().toISO()

            const patchOps: PatchOperation[] = [
                { op: "set", path: "/updatedDate", value: now }
            ]

            if (args.assigneeId) {
                patchOps.push({ op: "set", path: "/assigneeId", value: args.assigneeId })
            } else {
                patchOps.push({ op: "remove", path: "/assigneeId" })
            }

            await context.dataSources.cosmos.patch_record(CONTAINER, args.id, args.id, patchOps, context.userId || "SYSTEM")

            // Send real-time update
            context.signalR.addDataMessage(
                "platformAlert",
                { id: args.id, assigneeId: args.assigneeId },
                { action: DataAction.UPSERT, group: SIGNALR_GROUP }
            )

            // Notify the assignee
            if (args.assigneeId) {
                const alert = await context.dataSources.cosmos.get_record<platform_alert_type>(CONTAINER, args.id, args.id)
                context.signalR.addNotificationMessage(
                    `You have been assigned to alert ${alert.code}`,
                    { userId: args.assigneeId, status: "info" }
                )
            }

            return {
                code: "200",
                success: true,
                message: args.assigneeId ? "Alert assigned successfully" : "Alert unassigned successfully",
                alert: await context.dataSources.cosmos.get_record<platform_alert_type>(CONTAINER, args.id, args.id)
            }
        },

        dismissPlatformAlert: async (_: any, args: {
            id: string
            resolutionNotes?: string
        }, context: serverContext) => {
            const now = DateTime.now().toISO()

            const patchOps: PatchOperation[] = [
                { op: "set", path: "/alertStatus", value: AlertStatus.DISMISSED },
                { op: "set", path: "/dismissedAt", value: now },
                { op: "set", path: "/updatedDate", value: now }
            ]

            if (args.resolutionNotes) {
                patchOps.push({ op: "set", path: "/resolutionNotes", value: args.resolutionNotes })
            }

            await context.dataSources.cosmos.patch_record(CONTAINER, args.id, args.id, patchOps, context.userId || "SYSTEM")

            // Send real-time update
            context.signalR.addDataMessage(
                "platformAlert",
                { id: args.id, alertStatus: AlertStatus.DISMISSED },
                { action: DataAction.UPSERT, group: SIGNALR_GROUP }
            )

            return {
                code: "200",
                success: true,
                message: "Alert dismissed successfully",
                alert: await context.dataSources.cosmos.get_record<platform_alert_type>(CONTAINER, args.id, args.id)
            }
        }
    },

    PlatformAlert: {
        ref: (parent: platform_alert_type) => {
            return {
                id: parent.id,
                partition: parent.id,
                container: CONTAINER
            }
        },

        customer: async (parent: platform_alert_type, _: any, context: serverContext) => {
            if (!parent.customerId) return null
            try {
                return await context.dataSources.cosmos.get_record<user_type>("Main-User", parent.customerId, parent.customerId)
            } catch {
                return null
            }
        },

        merchant: async (parent: platform_alert_type, _: any, context: serverContext) => {
            if (!parent.merchantId) return null
            try {
                return await context.dataSources.cosmos.get_record<vendor_type>("Main-Vendor", parent.merchantId, parent.merchantId)
            } catch {
                return null
            }
        },

        assignee: async (parent: platform_alert_type, _: any, context: serverContext) => {
            if (!parent.assigneeId) return null
            try {
                return await context.dataSources.cosmos.get_record<user_type>("Main-User", parent.assigneeId, parent.assigneeId)
            } catch {
                return null
            }
        }
    }
}

export { resolvers }

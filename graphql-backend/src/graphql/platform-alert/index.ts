import { serverContext } from "../../services/azFunction"
import { platform_alert_type, AlertStatus, AlertSeverity } from "./types"
import { PlatformAlertManager } from "./manager"
import { DataAction } from '../../services/signalR'
import { user_type } from '../user/types'
import { vendor_type } from '../vendor/types'

const SIGNALR_GROUP = "console-alerts"

const resolvers = {
    Query: {
        platformAlert: async (_: any, args: { id: string }, context: serverContext) => {
            try {
                return await PlatformAlertManager.getById(context.dataSources.tableStorage, args.id)
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
            const result = await PlatformAlertManager.query(context.dataSources.tableStorage, {
                alertStatuses: args.alertStatuses,
                severities: args.severities,
                alertTypes: args.alertTypes,
                searchTerm: args.searchTerm,
                dateFrom: args.dateFrom,
                dateTo: args.dateTo,
                limit: args.limit,
                offset: args.offset
            })

            // Batch-load related entities to avoid N+1 queries
            const customerIds = [...new Set(result.alerts.map(a => a.customerId).filter(Boolean))] as string[]
            const merchantIds = [...new Set(result.alerts.map(a => a.merchantId).filter(Boolean))] as string[]
            const assigneeIds = [...new Set(result.alerts.map(a => a.assigneeId).filter(Boolean))] as string[]

            // Fetch all related entities in parallel
            const [customers, merchants, assignees] = await Promise.all([
                customerIds.length > 0
                    ? context.dataSources.cosmos.run_query<user_type>(
                        "Main-User",
                        { query: `SELECT * FROM c WHERE ARRAY_CONTAINS(@ids, c.id)`, parameters: [{ name: "@ids", value: customerIds }] },
                        true
                    )
                    : [],
                merchantIds.length > 0
                    ? context.dataSources.cosmos.run_query<vendor_type>(
                        "Main-Vendor",
                        { query: `SELECT * FROM c WHERE ARRAY_CONTAINS(@ids, c.id)`, parameters: [{ name: "@ids", value: merchantIds }] },
                        true
                    )
                    : [],
                assigneeIds.length > 0
                    ? context.dataSources.cosmos.run_query<user_type>(
                        "Main-User",
                        { query: `SELECT * FROM c WHERE ARRAY_CONTAINS(@ids, c.id)`, parameters: [{ name: "@ids", value: assigneeIds }] },
                        true
                    )
                    : []
            ])

            // Create lookup maps
            const customerMap = new Map(customers.map(c => [c.id, c] as [string, user_type]))
            const merchantMap = new Map(merchants.map(m => [m.id, m] as [string, vendor_type]))
            const assigneeMap = new Map(assignees.map(a => [a.id, a] as [string, user_type]))

            // Attach related entities to alerts
            const enrichedAlerts = result.alerts.map(alert => ({
                ...alert,
                _customer: alert.customerId ? customerMap.get(alert.customerId) : null,
                _merchant: alert.merchantId ? merchantMap.get(alert.merchantId) : null,
                _assignee: alert.assigneeId ? assigneeMap.get(alert.assigneeId) : null
            }))

            return {
                alerts: enrichedAlerts,
                totalCount: result.totalCount,
                hasMore: result.hasMore
            }
        },

        platformAlertStats: async (_: any, _args: any, context: serverContext) => {
            const stats = await PlatformAlertManager.getStats(context.dataSources.tableStorage)

            return {
                total: stats.total,
                byStatus: {
                    new: stats.byStatus[AlertStatus.NEW] || 0,
                    investigating: stats.byStatus[AlertStatus.INVESTIGATING] || 0,
                    awaitingResponse: stats.byStatus[AlertStatus.AWAITING_RESPONSE] || 0,
                    resolved: stats.byStatus[AlertStatus.RESOLVED] || 0,
                    dismissed: stats.byStatus[AlertStatus.DISMISSED] || 0
                },
                bySeverity: {
                    low: stats.bySeverity[AlertSeverity.LOW] || 0,
                    medium: stats.bySeverity[AlertSeverity.MEDIUM] || 0,
                    high: stats.bySeverity[AlertSeverity.HIGH] || 0,
                    critical: stats.bySeverity[AlertSeverity.CRITICAL] || 0
                }
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
            const alert = await PlatformAlertManager.create(context.dataSources.tableStorage, args.input)

            // Send real-time notification to console
            context.signalR.addDataMessage(
                "platformAlert",
                { id: alert.id, alertType: alert.alertType, severity: alert.severity },
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
                message: `Alert ${alert.code} created successfully`,
                alert
            }
        },

        updatePlatformAlertStatus: async (_: any, args: {
            id: string
            alertStatus: string
            resolutionNotes?: string
        }, context: serverContext) => {
            const alert = await PlatformAlertManager.updateStatus(
                context.dataSources.tableStorage,
                args.id,
                args.alertStatus,
                args.resolutionNotes
            )

            if (!alert) {
                return {
                    code: "404",
                    success: false,
                    message: "Alert not found",
                    alert: null
                }
            }

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
                alert
            }
        },

        assignPlatformAlert: async (_: any, args: {
            id: string
            assigneeId?: string
        }, context: serverContext) => {
            const alert = await PlatformAlertManager.assign(
                context.dataSources.tableStorage,
                args.id,
                args.assigneeId
            )

            if (!alert) {
                return {
                    code: "404",
                    success: false,
                    message: "Alert not found",
                    alert: null
                }
            }

            // Send real-time update
            context.signalR.addDataMessage(
                "platformAlert",
                { id: args.id, assigneeId: args.assigneeId },
                { action: DataAction.UPSERT, group: SIGNALR_GROUP }
            )

            // Notify the assignee
            if (args.assigneeId) {
                context.signalR.addNotificationMessage(
                    `You have been assigned to alert ${alert.code}`,
                    { userId: args.assigneeId, status: "info" }
                )
            }

            return {
                code: "200",
                success: true,
                message: args.assigneeId ? "Alert assigned successfully" : "Alert unassigned successfully",
                alert
            }
        },

        dismissPlatformAlert: async (_: any, args: {
            id: string
            resolutionNotes?: string
        }, context: serverContext) => {
            const alert = await PlatformAlertManager.dismiss(
                context.dataSources.tableStorage,
                args.id,
                args.resolutionNotes
            )

            if (!alert) {
                return {
                    code: "404",
                    success: false,
                    message: "Alert not found",
                    alert: null
                }
            }

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
                alert
            }
        }
    },

    PlatformAlert: {
        ref: (parent: platform_alert_type) => {
            return {
                id: parent.id,
                partition: parent.id,
                container: "PlatformAlerts"
            }
        },

        // Use pre-fetched data from batch load, fallback to individual query for single alert fetches
        customer: async (parent: platform_alert_type & { _customer?: user_type }, _: any, context: serverContext) => {
            if (parent._customer !== undefined) return parent._customer
            if (!parent.customerId) return null
            try {
                return await context.dataSources.cosmos.get_record<user_type>("Main-User", parent.customerId, parent.customerId)
            } catch {
                return null
            }
        },

        merchant: async (parent: platform_alert_type & { _merchant?: vendor_type }, _: any, context: serverContext) => {
            if (parent._merchant !== undefined) return parent._merchant
            if (!parent.merchantId) return null
            try {
                return await context.dataSources.cosmos.get_record<vendor_type>("Main-Vendor", parent.merchantId, parent.merchantId)
            } catch {
                return null
            }
        },

        assignee: async (parent: platform_alert_type & { _assignee?: user_type }, _: any, context: serverContext) => {
            if (parent._assignee !== undefined) return parent._assignee
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

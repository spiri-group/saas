import { v4 as uuidv4 } from 'uuid'
import { DateTime } from "luxon"
import { CosmosDataSource } from "../../utils/database"
import { platform_alert_type, AlertType, AlertSeverity, AlertStatus } from "./types"

const CONTAINER = "Main-PlatformAlert"

export interface CreateAlertParams {
    alertType: AlertType
    severity: AlertSeverity
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

/**
 * Helper function to create platform alerts from backend services (webhooks, etc.)
 * This allows creating alerts without going through GraphQL
 */
export async function createPlatformAlertDirect(
    cosmos: CosmosDataSource,
    params: CreateAlertParams
): Promise<platform_alert_type | null> {
    try {
        const alertId = uuidv4()
        const now = DateTime.now().toISO()

        // Generate human-readable code
        const code = await cosmos.generate_unique_code(
            "ALT",
            async () => {
                const existingCodes = await cosmos.run_query<string>(CONTAINER, {
                    query: `SELECT VALUE c.code FROM c`,
                    parameters: []
                }, true)
                return existingCodes
            }
        )

        const alert: platform_alert_type = {
            id: alertId,
            code,
            alertType: params.alertType,
            severity: params.severity,
            alertStatus: AlertStatus.NEW,
            title: params.title,
            message: params.message,
            customerId: params.customerId,
            customerEmail: params.customerEmail,
            merchantId: params.merchantId,
            context: params.context || {},
            source: params.source,
            createdDate: now,
            ref: {
                id: alertId,
                partition: alertId,
                container: CONTAINER
            }
        }

        await cosmos.add_record(CONTAINER, alert, alertId, "SYSTEM")

        return alert
    } catch (error) {
        // Don't throw - alert creation should not break the calling code
        console.error('[PlatformAlert] Failed to create alert:', error)
        return null
    }
}

// Re-export types for convenience
export { AlertType, AlertSeverity, AlertStatus }

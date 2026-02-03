//#region PlatformAlert

import { recordref_type } from "../0_shared/types"

export type platform_alert_type = {
    id: string
    code: string  // Human-readable code like "ALT-001234"
    alertType: AlertType
    severity: AlertSeverity
    alertStatus: AlertStatus  // NOT 'status' - that's reserved for soft-delete
    title: string
    message: string

    // Affected parties
    customerId?: string
    customerEmail?: string
    merchantId?: string

    // Context - flexible object for different alert types
    context: alert_context_type

    // Source information
    source: alert_source_type

    // Workflow
    assigneeId?: string
    resolutionNotes?: string
    resolvedAt?: string
    dismissedAt?: string

    // Standard fields
    createdDate: string
    updatedDate?: string
    ref: recordref_type
}

export type alert_context_type = {
    orderId?: string
    setupIntentId?: string
    errorMessage?: string
    url?: string
    stackTrace?: string
    userAgent?: string
    additionalData?: Record<string, unknown>
}

export type alert_source_type = {
    component: string     // e.g., "ResolveStripeSuccess"
    environment: string   // e.g., "production", "staging"
    version?: string
}

export const enum AlertType {
    PAYMENT_TIMEOUT = "PAYMENT_TIMEOUT",
    WEBHOOK_FAILURE = "WEBHOOK_FAILURE",
    ORDER_ERROR = "ORDER_ERROR",
    FRONTEND_ERROR = "FRONTEND_ERROR",
    BACKEND_ERROR = "BACKEND_ERROR",
    INTEGRATION_ERROR = "INTEGRATION_ERROR"
}

export const enum AlertSeverity {
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH",
    CRITICAL = "CRITICAL"
}

export const enum AlertStatus {
    NEW = "NEW",
    INVESTIGATING = "INVESTIGATING",
    AWAITING_RESPONSE = "AWAITING_RESPONSE",
    RESOLVED = "RESOLVED",
    DISMISSED = "DISMISSED"
}

export type platform_alert_stats_type = {
    total: number
    byStatus: {
        new: number
        investigating: number
        awaitingResponse: number
        resolved: number
        dismissed: number
    }
    bySeverity: {
        low: number
        medium: number
        high: number
        critical: number
    }
}

export type platform_alert_response_type = {
    code: string
    success: boolean
    message: string
    alert?: platform_alert_type
}

export type platform_alerts_response_type = {
    code: string
    success: boolean
    message: string
    alerts: platform_alert_type[]
    totalCount: number
    hasMore: boolean
}

//#endregion

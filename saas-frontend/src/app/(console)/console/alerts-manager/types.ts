import { recordref_type } from "@/utils/spiriverse";

export type AlertType =
    | 'PAYMENT_TIMEOUT'
    | 'WEBHOOK_FAILURE'
    | 'ORDER_ERROR'
    | 'FRONTEND_ERROR'
    | 'BACKEND_ERROR'
    | 'INTEGRATION_ERROR';

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AlertStatus = 'NEW' | 'INVESTIGATING' | 'AWAITING_RESPONSE' | 'RESOLVED' | 'DISMISSED';

export interface AlertContext {
    orderId?: string;
    setupIntentId?: string;
    errorMessage?: string;
    url?: string;
    stackTrace?: string;
    userAgent?: string;
    additionalData?: Record<string, unknown>;
}

export interface AlertSource {
    component: string;
    environment: string;
    version?: string;
}

export interface PlatformAlert {
    id: string;
    code: string;
    alertType: AlertType;
    severity: AlertSeverity;
    alertStatus: AlertStatus;
    title: string;
    message: string;
    customerId?: string;
    customerEmail?: string;
    merchantId?: string;
    customer?: {
        id: string;
        firstname: string;
        lastname: string;
        email: string;
    };
    merchant?: {
        id: string;
        name: string;
    };
    context?: AlertContext;
    source: AlertSource;
    assigneeId?: string;
    assignee?: {
        id: string;
        firstname: string;
        lastname: string;
        email: string;
    };
    resolutionNotes?: string;
    resolvedAt?: string;
    dismissedAt?: string;
    createdDate: string;
    updatedDate?: string;
    ref: recordref_type;
}

export interface PlatformAlertStats {
    total: number;
    byStatus: {
        new: number;
        investigating: number;
        awaitingResponse: number;
        resolved: number;
        dismissed: number;
    };
    bySeverity: {
        low: number;
        medium: number;
        high: number;
        critical: number;
    };
}

export interface PlatformAlertsResponse {
    alerts: PlatformAlert[];
    totalCount: number;
    hasMore: boolean;
}

export interface AlertFilters {
    alertStatuses?: AlertStatus[];
    severities?: AlertSeverity[];
    alertTypes?: AlertType[];
    searchTerm?: string;
    dateFrom?: string;
    dateTo?: string;
}

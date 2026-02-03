'use client';

import { useMutation } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export type AlertType =
    | 'PAYMENT_TIMEOUT'
    | 'WEBHOOK_FAILURE'
    | 'ORDER_ERROR'
    | 'FRONTEND_ERROR'
    | 'BACKEND_ERROR'
    | 'INTEGRATION_ERROR';

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface AlertContext {
    orderId?: string;
    setupIntentId?: string;
    errorMessage?: string;
    url?: string;
    stackTrace?: string;
    userAgent?: string;
    additionalData?: Record<string, unknown>;
}

interface AlertSource {
    component: string;
    environment: string;
    version?: string;
}

export interface CreatePlatformAlertInput {
    alertType: AlertType;
    severity: AlertSeverity;
    title: string;
    message: string;
    customerId?: string;
    customerEmail?: string;
    merchantId?: string;
    context?: AlertContext;
    source: AlertSource;
}

interface PlatformAlert {
    id: string;
    code: string;
    alertType: string;
    severity: string;
    alertStatus: string;
    title: string;
    message: string;
    createdDate: string;
}

interface CreatePlatformAlertResponse {
    code: string;
    success: boolean;
    message: string;
    alert?: PlatformAlert;
}

const useCreatePlatformAlert = () => {
    return useMutation({
        mutationFn: async (input: CreatePlatformAlertInput) => {
            const response = await gql<{
                createPlatformAlert: CreatePlatformAlertResponse;
            }>(`
                mutation CreatePlatformAlert($input: CreatePlatformAlertInput!) {
                    createPlatformAlert(input: $input) {
                        code
                        success
                        message
                        alert {
                            id
                            code
                            alertType
                            severity
                            alertStatus
                            title
                            message
                            createdDate
                        }
                    }
                }
            `, { input });
            return response.createPlatformAlert;
        },
        onError: (error) => {
            // Log error but don't throw - alert creation should not block user flow
            console.error('[UseCreatePlatformAlert] Failed to create alert:', error);
        },
    });
};

export default useCreatePlatformAlert;

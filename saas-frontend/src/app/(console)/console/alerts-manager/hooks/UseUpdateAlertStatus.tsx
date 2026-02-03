'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { PlatformAlert, AlertStatus } from '../types';

interface UpdateAlertStatusInput {
    id: string;
    alertStatus: AlertStatus;
    resolutionNotes?: string;
}

interface UpdateAlertStatusResponse {
    code: string;
    success: boolean;
    message: string;
    alert?: PlatformAlert;
}

const useUpdateAlertStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: UpdateAlertStatusInput) => {
            const response = await gql<{
                updatePlatformAlertStatus: UpdateAlertStatusResponse;
            }>(`
                mutation UpdatePlatformAlertStatus(
                    $id: ID!
                    $alertStatus: AlertStatusEnum!
                    $resolutionNotes: String
                ) {
                    updatePlatformAlertStatus(
                        id: $id
                        alertStatus: $alertStatus
                        resolutionNotes: $resolutionNotes
                    ) {
                        code
                        success
                        message
                        alert {
                            id
                            code
                            alertStatus
                            resolutionNotes
                            resolvedAt
                            dismissedAt
                            updatedDate
                        }
                    }
                }
            `, input);
            return response.updatePlatformAlertStatus;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['platform-alerts'] });
            queryClient.invalidateQueries({ queryKey: ['platform-alert-stats'] });
        },
    });
};

export default useUpdateAlertStatus;

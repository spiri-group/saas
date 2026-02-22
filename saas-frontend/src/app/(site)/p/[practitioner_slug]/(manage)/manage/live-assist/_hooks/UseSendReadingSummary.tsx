'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export type SendReadingSummaryInput = {
    entryId: string;
    sessionId: string;
    practitionerNote?: string;
    recommendation?: {
        message: string;
        recommendedServiceId?: string;
        recommendedProductId?: string;
        recommendedProductVendorId?: string;
    };
};

export const useSendReadingSummary = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (input: SendReadingSummaryInput) => {
            const response = await gql<{
                sendReadingSummary: {
                    code: string;
                    success: boolean;
                    message: string;
                    entry: any;
                };
            }>(`
                mutation SendReadingSummary($input: SendReadingSummaryInput!) {
                    sendReadingSummary(input: $input) {
                        code
                        success
                        message
                        entry {
                            id
                            entryStatus
                            practitionerNote
                            recommendation {
                                message
                                recommendedServiceName
                                recommendedProductName
                            }
                        }
                    }
                }
            `, { input });
            return response.sendReadingSummary;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['live-queue', variables.sessionId] });
        },
    });
};

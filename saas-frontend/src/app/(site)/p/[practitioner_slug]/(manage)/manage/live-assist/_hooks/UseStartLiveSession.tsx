'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export type LiveRecommendationInput = {
    message: string;
    recommendedServiceId?: string;
    recommendedProductId?: string;
    recommendedProductVendorId?: string;
};

export type StartLiveSessionInput = {
    vendorId: string;
    sessionTitle?: string;
    pricingMode: string;
    customPrice?: { amount: number; currency: string };
    serviceId?: string;
    defaultCta?: LiveRecommendationInput;
};

export const useStartLiveSession = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: StartLiveSessionInput) => {
            const response = await gql<{
                startLiveSession: {
                    code: string;
                    success: boolean;
                    message: string;
                    session: any;
                    shareUrl: string | null;
                };
            }>(`
                mutation StartLiveSession($input: StartLiveSessionInput!) {
                    startLiveSession(input: $input) {
                        code
                        success
                        message
                        session {
                            id
                            vendorId
                            code
                            sessionTitle
                            sessionStatus
                            pricingMode
                            customPrice {
                                amount
                                currency
                            }
                            serviceName
                            servicePrice {
                                amount
                                currency
                            }
                            defaultCta {
                                message
                                recommendedServiceId
                                recommendedServiceName
                                recommendedProductId
                                recommendedProductName
                            }
                            totalJoined
                            totalCompleted
                            totalRevenue
                            startedAt
                            createdDate
                        }
                        shareUrl
                    }
                }
            `, { input });
            return response.startLiveSession;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['live-sessions', variables.vendorId] });
        },
    });
};

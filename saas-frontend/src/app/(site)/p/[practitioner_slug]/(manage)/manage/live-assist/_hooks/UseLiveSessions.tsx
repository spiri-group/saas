'use client';

import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export type LiveSessionData = {
    id: string;
    vendorId: string;
    code: string;
    sessionTitle: string | null;
    sessionStatus: string;
    pricingMode: string;
    customPrice: { amount: number; currency: string } | null;
    serviceId: string | null;
    serviceName: string | null;
    servicePrice: { amount: number; currency: string } | null;
    totalJoined: number;
    totalCompleted: number;
    totalRevenue: number;
    startedAt: string;
    pausedAt: string | null;
    endedAt: string | null;
    createdDate: string;
};

export const useLiveSessions = (vendorId: string) => {
    return useQuery({
        queryKey: ['live-sessions', vendorId],
        queryFn: async () => {
            const response = await gql<{
                liveSessions: LiveSessionData[];
            }>(`
                query LiveSessions($vendorId: ID!) {
                    liveSessions(vendorId: $vendorId) {
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
                        serviceId
                        serviceName
                        servicePrice {
                            amount
                            currency
                        }
                        totalJoined
                        totalCompleted
                        totalRevenue
                        startedAt
                        pausedAt
                        endedAt
                        createdDate
                    }
                }
            `, { vendorId });
            return response.liveSessions;
        },
        enabled: !!vendorId,
    });
};

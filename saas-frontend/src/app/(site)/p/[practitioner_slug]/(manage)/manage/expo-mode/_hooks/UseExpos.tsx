'use client';

import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export type ExpoData = {
    id: string;
    vendorId: string;
    code: string;
    expoName: string;
    expoStatus: string;
    totalSales: number;
    totalRevenue: number;
    totalItemsSold: number;
    totalCustomers: number;
    createdAt: string;
    goLiveAt: string | null;
    pausedAt: string | null;
    endedAt: string | null;
};

export const useExpos = (vendorId: string) => {
    return useQuery({
        queryKey: ['expos', vendorId],
        queryFn: async () => {
            const response = await gql<{
                expos: ExpoData[];
            }>(`
                query Expos($vendorId: ID!) {
                    expos(vendorId: $vendorId) {
                        id
                        vendorId
                        code
                        expoName
                        expoStatus
                        totalSales
                        totalRevenue
                        totalItemsSold
                        totalCustomers
                        createdAt
                        goLiveAt
                        pausedAt
                        endedAt
                    }
                }
            `, { vendorId });
            return response.expos;
        },
        enabled: !!vendorId,
    });
};

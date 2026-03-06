'use client';

import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { useRealTimeQueryList } from '@/components/utils/RealTime/useRealTimeQueryList';
import { ExpoData } from '../../../_hooks/UseExpos';

export const useExpo = (expoId: string, vendorId: string) => {
    return useQuery({
        queryKey: ['expo', expoId],
        queryFn: async () => {
            const response = await gql<{
                expo: ExpoData;
            }>(`
                query Expo($expoId: ID!, $vendorId: ID!) {
                    expo(expoId: $expoId, vendorId: $vendorId) {
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
            `, { expoId, vendorId });
            return response.expo;
        },
        enabled: !!expoId && !!vendorId,
    });
};

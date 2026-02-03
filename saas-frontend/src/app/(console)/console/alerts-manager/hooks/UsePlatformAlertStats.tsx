'use client';

import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { PlatformAlertStats } from '../types';

const usePlatformAlertStats = () => {
    return useQuery({
        queryKey: ['platform-alert-stats'],
        queryFn: async () => {
            const response = await gql<{
                platformAlertStats: PlatformAlertStats;
            }>(`
                query PlatformAlertStats {
                    platformAlertStats {
                        total
                        byStatus {
                            new
                            investigating
                            awaitingResponse
                            resolved
                            dismissed
                        }
                        bySeverity {
                            low
                            medium
                            high
                            critical
                        }
                    }
                }
            `, {});
            return response.platformAlertStats;
        },
        refetchInterval: 30000, // Refetch every 30 seconds
    });
};

export default usePlatformAlertStats;

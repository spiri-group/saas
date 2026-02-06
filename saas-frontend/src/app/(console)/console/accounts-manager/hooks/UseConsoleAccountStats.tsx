'use client';

import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { ConsoleAccountStats } from '../types';

const useConsoleAccountStats = () => {
    return useQuery({
        queryKey: ['console-account-stats'],
        queryFn: async () => {
            const response = await gql<{
                consoleAccountStats: ConsoleAccountStats;
            }>(`
                query ConsoleAccountStats {
                    consoleAccountStats {
                        vendors {
                            total
                            merchants
                            practitioners
                            published
                            billingActive
                            billingFailed
                            billingBlocked
                            waived
                        }
                        customers {
                            total
                            withOrders
                        }
                        funnel {
                            stage
                            count
                        }
                        revenue {
                            mrr
                            totalCollected
                            currency
                        }
                        recentActivity {
                            vendorsToday
                            vendorsThisWeek
                            vendorsThisMonth
                            customersToday
                            customersThisWeek
                            customersThisMonth
                        }
                    }
                }
            `, {});
            return response.consoleAccountStats;
        },
        refetchInterval: 30000,
    });
};

export default useConsoleAccountStats;

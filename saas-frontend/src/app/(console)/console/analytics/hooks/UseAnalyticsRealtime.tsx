import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { ConsoleAnalyticsRealtime } from '../types';

export default function useAnalyticsRealtime() {
    return useQuery({
        queryKey: ['console-analytics-realtime'],
        queryFn: async () => {
            const response = await gql<{
                consoleAnalyticsRealtime: ConsoleAnalyticsRealtime;
            }>(`
                query ConsoleAnalyticsRealtime {
                    consoleAnalyticsRealtime {
                        activeVisitors
                        currentPages {
                            url
                            visitors
                        }
                    }
                }
            `);
            return response.consoleAnalyticsRealtime;
        },
        refetchInterval: 30000,
    });
}

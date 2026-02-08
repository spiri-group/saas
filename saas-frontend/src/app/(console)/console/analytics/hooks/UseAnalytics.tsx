import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { ConsoleAnalyticsDashboard } from '../types';

export default function useAnalytics(startDate: string, endDate: string) {
    return useQuery({
        queryKey: ['console-analytics', startDate, endDate],
        queryFn: async () => {
            const response = await gql<{
                consoleAnalytics: ConsoleAnalyticsDashboard;
            }>(`
                query ConsoleAnalytics($startDate: String!, $endDate: String!) {
                    consoleAnalytics(startDate: $startDate, endDate: $endDate) {
                        summary {
                            totalPageviews
                            uniqueVisitors
                            avgSessionDuration
                            bounceRate
                            avgScrollDepth
                            avgTimeOnPage
                        }
                        dailyCounts {
                            date
                            pageviews
                            uniqueVisitors
                        }
                        topPages {
                            url
                            views
                            uniqueVisitors
                            avgTimeOnPage
                            avgScrollDepth
                        }
                        topReferrers {
                            referrer
                            views
                            uniqueVisitors
                        }
                        browsers {
                            name
                            count
                            percentage
                        }
                        operatingSystems {
                            name
                            count
                            percentage
                        }
                        devices {
                            name
                            count
                            percentage
                        }
                        countries {
                            name
                            count
                            percentage
                        }
                    }
                }
            `, { startDate, endDate });
            return response.consoleAnalytics;
        },
        enabled: !!startDate && !!endDate,
        refetchInterval: 120000, // Auto-refresh every 2 minutes
    });
}

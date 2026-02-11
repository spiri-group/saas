'use client';

import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { PlatformAlertsResponse, AlertFilters } from '../types';

interface UsePlatformAlertsOptions extends AlertFilters {
    limit?: number;
    offset?: number;
}

const usePlatformAlerts = (options: UsePlatformAlertsOptions = {}) => {
    const { limit = 50, offset = 0, alertStatuses, severities, alertTypes, searchTerm, dateFrom, dateTo } = options;

    return useQuery({
        queryKey: ['platform-alerts', { limit, offset, alertStatuses, severities, alertTypes, searchTerm, dateFrom, dateTo }],
        queryFn: async () => {
            const response = await gql<{
                platformAlerts: PlatformAlertsResponse;
            }>(`
                query PlatformAlerts(
                    $alertStatuses: [AlertStatusEnum]
                    $severities: [AlertSeverityEnum]
                    $alertTypes: [AlertTypeEnum]
                    $searchTerm: String
                    $dateFrom: DateTime
                    $dateTo: DateTime
                    $limit: Int
                    $offset: Int
                ) {
                    platformAlerts(
                        alertStatuses: $alertStatuses
                        severities: $severities
                        alertTypes: $alertTypes
                        searchTerm: $searchTerm
                        dateFrom: $dateFrom
                        dateTo: $dateTo
                        limit: $limit
                        offset: $offset
                    ) {
                        alerts {
                            id
                            code
                            alertType
                            severity
                            alertStatus
                            title
                            message
                            customerId
                            customerEmail
                            merchantId
                            customer {
                                id
                                firstname
                                lastname
                                email
                            }
                            merchant {
                                id
                                name
                            }
                            context {
                                orderId
                                setupIntentId
                                errorMessage
                                url
                                stackTrace
                                userAgent
                            }
                            source {
                                component
                                environment
                                version
                            }
                            assigneeId
                            assignee {
                                id
                                firstname
                                lastname
                                email
                            }
                            resolutionNotes
                            resolvedAt
                            dismissedAt
                            createdDate
                            updatedDate
                            ref {
                                id
                                partition
                                container
                            }
                        }
                        totalCount
                        hasMore
                    }
                }
            `, {
                alertStatuses,
                severities,
                alertTypes,
                searchTerm,
                dateFrom,
                dateTo,
                limit,
                offset
            });
            return response.platformAlerts;
        },
        refetchInterval: 60000, // Refetch every 60 seconds (SignalR provides real-time updates)
        staleTime: 30000, // Consider data fresh for 30 seconds
    });
};

export default usePlatformAlerts;

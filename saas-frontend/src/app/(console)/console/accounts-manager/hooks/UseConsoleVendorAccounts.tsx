'use client';

import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { ConsoleVendorAccountsResponse, VendorAccountFilters } from '../types';

interface UseConsoleVendorAccountsOptions extends VendorAccountFilters {
    limit?: number;
    offset?: number;
}

const useConsoleVendorAccounts = (options: UseConsoleVendorAccountsOptions = {}) => {
    const { limit = 50, offset = 0, search, docTypes, lifecycleStages } = options;

    return useQuery({
        queryKey: ['console-vendor-accounts', { limit, offset, search, docTypes, lifecycleStages }],
        queryFn: async () => {
            const response = await gql<{
                consoleVendorAccounts: ConsoleVendorAccountsResponse;
            }>(`
                query ConsoleVendorAccounts(
                    $search: String
                    $docTypes: [VendorDocType]
                    $lifecycleStages: [String]
                    $limit: Int
                    $offset: Int
                ) {
                    consoleVendorAccounts(
                        search: $search
                        docTypes: $docTypes
                        lifecycleStages: $lifecycleStages
                        limit: $limit
                        offset: $offset
                    ) {
                        vendors {
                            id
                            name
                            slug
                            docType
                            lifecycleStage
                            publishedAt
                            createdDate
                            subscription {
                                plans {
                                    name
                                    price {
                                        amount
                                        currency
                                    }
                                }
                                next_billing_date
                                billing_interval
                                payment_status
                                card_status
                                payouts_blocked
                                last_payment_date
                                payment_retry_count
                                discountPercent
                                waived
                                waivedUntil
                                overrideNotes
                            }
                            stripe {
                                customerId
                                accountId
                            }
                        }
                        totalCount
                        hasMore
                    }
                }
            `, {
                search,
                docTypes,
                lifecycleStages,
                limit,
                offset
            });
            return response.consoleVendorAccounts;
        },
        refetchInterval: 30000,
    });
};

export default useConsoleVendorAccounts;

'use client';

import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { ConsoleCustomerAccountsResponse, CustomerAccountFilters } from '../types';

interface UseConsoleCustomerAccountsOptions extends CustomerAccountFilters {
    limit?: number;
    offset?: number;
}

const useConsoleCustomerAccounts = (options: UseConsoleCustomerAccountsOptions = {}) => {
    const { limit = 50, offset = 0, search } = options;

    return useQuery({
        queryKey: ['console-customer-accounts', { limit, offset, search }],
        queryFn: async () => {
            const response = await gql<{
                consoleCustomerAccounts: ConsoleCustomerAccountsResponse;
            }>(`
                query ConsoleCustomerAccounts(
                    $search: String
                    $limit: Int
                    $offset: Int
                ) {
                    consoleCustomerAccounts(
                        search: $search
                        limit: $limit
                        offset: $offset
                    ) {
                        customers {
                            id
                            firstname
                            lastname
                            email
                            spiritualInterests
                            vendorCount
                            orderCount
                            createdDate
                        }
                        totalCount
                        hasMore
                    }
                }
            `, {
                search,
                limit,
                offset
            });
            return response.consoleCustomerAccounts;
        },
        refetchInterval: 30000,
    });
};

export default useConsoleCustomerAccounts;

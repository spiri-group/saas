'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { MutationResponse } from '../types';

export const usePurgeCustomerAccount = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId, confirmEmail }: { userId: string; confirmEmail: string }) => {
            const response = await gql<{
                purgeCustomerAccount: MutationResponse;
            }>(`
                mutation PurgeCustomerAccount($userId: String!, $confirmEmail: String!) {
                    purgeCustomerAccount(userId: $userId, confirmEmail: $confirmEmail) {
                        code
                        success
                        message
                    }
                }
            `, { userId, confirmEmail });
            return response.purgeCustomerAccount;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['console-customer-accounts'] });
            queryClient.invalidateQueries({ queryKey: ['console-account-stats'] });
        },
    });
};

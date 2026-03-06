'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export const useResendPaymentLink = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ linkId, resetExpiration }: { linkId: string; resetExpiration?: boolean }) => {
            const response = await gql<{
                resendPaymentLink: {
                    code: string;
                    success: boolean;
                    message: string;
                };
            }>(`
                mutation ResendPaymentLink($linkId: ID!, $resetExpiration: Boolean) {
                    resendPaymentLink(linkId: $linkId, resetExpiration: $resetExpiration) {
                        code
                        success
                        message
                    }
                }
            `, { linkId, resetExpiration });
            return response.resendPaymentLink;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payment-links'] });
        },
    });
};

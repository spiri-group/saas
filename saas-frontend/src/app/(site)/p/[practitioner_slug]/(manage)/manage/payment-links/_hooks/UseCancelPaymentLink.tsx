'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export const useCancelPaymentLink = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (linkId: string) => {
            const response = await gql<{
                cancelPaymentLink: {
                    code: string;
                    success: boolean;
                    message: string;
                };
            }>(`
                mutation CancelPaymentLink($linkId: ID!) {
                    cancelPaymentLink(linkId: $linkId) {
                        code
                        success
                        message
                    }
                }
            `, { linkId });
            return response.cancelPaymentLink;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payment-links'] });
        },
    });
};

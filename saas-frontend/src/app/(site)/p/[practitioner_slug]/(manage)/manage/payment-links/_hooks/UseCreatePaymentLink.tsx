'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export type CreatePaymentLinkInput = {
    customerEmail: string;
    customerName?: string;
    items: {
        vendorId: string;
        itemType: string;
        customDescription?: string;
        sourceId?: string;
        amount: {
            amount: number;
            currency: string;
        };
    }[];
    expirationHours?: number;
};

export const useCreatePaymentLink = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: CreatePaymentLinkInput) => {
            const response = await gql<{
                createPaymentLink: {
                    code: string;
                    success: boolean;
                    message: string;
                    paymentLink: any;
                    paymentUrl: string;
                };
            }>(`
                mutation CreatePaymentLink($input: CreatePaymentLinkInput!) {
                    createPaymentLink(input: $input) {
                        code
                        success
                        message
                        paymentLink {
                            id
                            linkStatus
                            customerEmail
                            totalAmount {
                                amount
                                currency
                            }
                            sentAt
                            expiresAt
                        }
                        paymentUrl
                    }
                }
            `, { input });
            return response.createPaymentLink;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payment-links'] });
        },
    });
};

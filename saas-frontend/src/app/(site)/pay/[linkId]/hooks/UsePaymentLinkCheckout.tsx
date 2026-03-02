'use client';

import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export type PaymentLinkCheckoutData = {
    id: string;
    customerEmail: string;
    customerName?: string;
    items: {
        id: string;
        vendorId: string;
        vendorName: string;
        itemType: string;
        customDescription?: string;
        sourceId?: string;
        sourceName?: string;
        amount: {
            amount: number;
            currency: string;
        };
    }[];
    totalAmount: {
        amount: number;
        currency: string;
    };
    linkStatus: string;
    expiresAt: string;
    viewedAt?: string;
    paidAt?: string;
    stripePaymentIntentSecret?: string;
    vendorNames: string[];
};

export const usePaymentLinkCheckout = (linkId: string) => {
    return useQuery({
        queryKey: ['payment-link-checkout', linkId],
        queryFn: async () => {
            const response = await gql<{
                paymentLinkCheckout: PaymentLinkCheckoutData;
            }>(`
                query PaymentLinkCheckout($linkId: ID!) {
                    paymentLinkCheckout(linkId: $linkId) {
                        id
                        customerEmail
                        customerName
                        items {
                            id
                            vendorId
                            vendorName
                            itemType
                            customDescription
                            sourceId
                            sourceName
                            amount {
                                amount
                                currency
                            }
                        }
                        totalAmount {
                            amount
                            currency
                        }
                        linkStatus
                        expiresAt
                        viewedAt
                        paidAt
                        stripePaymentIntentSecret
                        vendorNames
                    }
                }
            `, { linkId });
            return response.paymentLinkCheckout;
        },
        enabled: !!linkId,
        retry: false,
    });
};

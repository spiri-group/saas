'use client';

import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export type PaymentLinkItem = {
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
};

export type PaymentLink = {
    id: string;
    createdBy: string;
    customerEmail: string;
    customerName?: string;
    items: PaymentLinkItem[];
    totalAmount: {
        amount: number;
        currency: string;
    };
    linkStatus: string;
    expiresAt: string;
    expirationHours: number;
    sentAt: string;
    viewedAt?: string;
    paidAt?: string;
    bookingIds?: string[];
    createdDate: string;
    modifiedDate?: string;
};

export const usePaymentLinks = (linkStatus?: string) => {
    return useQuery({
        queryKey: ['payment-links', linkStatus],
        queryFn: async () => {
            const response = await gql<{
                paymentLinks: PaymentLink[];
            }>(`
                query PaymentLinks($linkStatus: String) {
                    paymentLinks(linkStatus: $linkStatus) {
                        id
                        createdBy
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
                        expirationHours
                        sentAt
                        viewedAt
                        paidAt
                        bookingIds
                        createdDate
                        modifiedDate
                    }
                }
            `, { linkStatus: linkStatus || null });
            return response.paymentLinks;
        },
    });
};

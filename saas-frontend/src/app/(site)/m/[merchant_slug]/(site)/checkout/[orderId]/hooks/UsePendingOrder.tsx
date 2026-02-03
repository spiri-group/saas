'use client';

import { gql } from "@/lib/services/gql";
import { useQuery } from "@tanstack/react-query";

type PendingOrder = {
    id: string;
    customerEmail: string;
    status: string;
    createdDate: string;
    checkoutLinkExpiresAt?: string;
    target: string;
    lines: Array<{
        id: string;
        descriptor: string;
        quantity: number;
        price: {
            amount: number;
            currency: string;
        };
        subtotal: {
            amount: number;
            currency: string;
        };
        image?: {
            url: string;
        };
        forObject?: {
            id: string;
            partition: string[];
            container: string;
        };
    }>;
    paymentSummary?: {
        currency: string;
        due: {
            total: {
                amount: number;
                currency: string;
            };
        };
    };
};

const UsePendingOrder = (orderId: string) => {
    return useQuery({
        queryKey: ['pending-order', orderId],
        queryFn: async () => {
            const response = await gql<{
                orderCheckout: PendingOrder;
            }>(`
                query GetPendingOrder($orderId: ID!) {
                    orderCheckout(orderId: $orderId) {
                        id
                        customerEmail
                        status
                        createdDate
                        checkoutLinkExpiresAt
                        target
                        lines {
                            id
                            descriptor
                            quantity
                            price {
                                amount
                                currency
                            }
                            subtotal {
                                amount
                                currency
                            }
                            image {
                                url
                            }
                            forObject {
                                id
                                partition
                                container
                            }
                        }
                        paymentSummary {
                            currency
                            due {
                                total {
                                    amount
                                    currency
                                }
                            }
                        }
                    }
                }
            `, {
                orderId
            });

            return response.orderCheckout;
        },
        enabled: !!orderId,
        retry: false
    });
};

export default UsePendingOrder;
export type { PendingOrder };

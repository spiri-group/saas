'use client';

import { gql } from "@/lib/services/gql";
import { useQuery } from "@tanstack/react-query";

type PendingServiceOrder = {
    id: string;
    customerEmail: string;
    status: string;
    purchaseDate: string;
    checkoutLinkExpiresAt?: string;
    service: {
        id: string;
        name: string;
        description: string;
        category: string;
        thumbnail?: {
            image: {
                media: {
                    url: string;
                };
            };
        };
        vendor: {
            id: string;
            name: string;
            slug: string;
        };
    };
    questionnaireResponses?: Array<{
        questionId: string;
        question: string;
        answer: string;
    }>;
    price: {
        amount: number;
        currency: string;
    };
};

const UsePendingServiceOrder = (orderId: string) => {
    return useQuery({
        queryKey: ['pending-service-order', orderId],
        queryFn: async () => {
            const response = await gql<{
                serviceCheckoutOrder: PendingServiceOrder;
            }>(`
                query GetPendingServiceOrder($orderId: ID!) {
                    serviceCheckoutOrder(orderId: $orderId) {
                        id
                        customerEmail
                        status
                        purchaseDate
                        checkoutLinkExpiresAt
                        service {
                            id
                            name
                            description
                            category
                            thumbnail {
                                image {
                                    media {
                                        url
                                    }
                                }
                            }
                            vendor {
                                id
                                name
                                slug
                            }
                        }
                        questionnaireResponses {
                            questionId
                            question
                            answer
                        }
                        price {
                            amount
                            currency
                        }
                    }
                }
            `, {
                orderId
            });

            return response.serviceCheckoutOrder;
        },
        enabled: !!orderId,
        retry: false
    });
};

export default UsePendingServiceOrder;
export type { PendingServiceOrder };

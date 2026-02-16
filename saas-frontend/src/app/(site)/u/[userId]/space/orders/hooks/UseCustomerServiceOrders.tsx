'use client';

import { gql } from "@/lib/services/gql";
import { useQuery } from "@tanstack/react-query";

type ServiceOrder = {
    id: string;
    purchaseDate: string;
    status: string;
    service: {
        id: string;
        name: string;
        category: string;
        thumbnail?: {
            image: {
                media: {
                    url: string;
                };
            };
        };
    };
    deliverables?: {
        files: Array<{
            id: string;
            name: string;
            type: string;
        }>;
        deliveredAt?: string;
    };
};

const UseCustomerServiceOrders = (customerId: string, status?: string) => {
    return useQuery({
        queryKey: ['customer-service-orders', customerId, status],
        queryFn: async () => {
            const response = await gql<{
                customerServiceOrders: ServiceOrder[];
            }>(`
                query GetCustomerServiceOrders($customerId: ID!, $status: String) {
                    customerServiceOrders(customerId: $customerId, status: $status) {
                        id
                        purchaseDate
                        status
                        service {
                            id
                            name
                            category
                            thumbnail {
                                image {
                                    media {
                                        url
                                    }
                                }
                            }
                        }
                        deliverables {
                            files {
                                id
                                name
                                type
                            }
                            deliveredAt
                        }
                    }
                }
            `, {
                customerId,
                status: status || null
            });

            return response.customerServiceOrders;
        },
        enabled: !!customerId
    });
};

export default UseCustomerServiceOrders;
export type { ServiceOrder };

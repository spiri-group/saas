'use client';

import { gql } from "@/lib/services/gql";
import { useQuery } from "@tanstack/react-query";

type QuestionResponse = {
    questionId: string;
    question: string;
    answer: string;
};

type DeliverableFile = {
    id: string;
    name: string;
    type: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
    signedUrl?: string;
};

type ServiceOrder = {
    id: string;
    purchaseDate: string;
    status: string;
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
    questionnaireResponses?: QuestionResponse[];
    deliverables?: {
        files: DeliverableFile[];
        message?: string;
        deliveredAt?: string;
    };
};

const UseServiceOrder = (orderId: string) => {
    return useQuery({
        queryKey: ['service-order', orderId],
        queryFn: async () => {
            const response = await gql<{
                serviceOrderById: ServiceOrder;
            }>(`
                query GetServiceOrder($orderId: ID!) {
                    serviceOrderById(orderId: $orderId) {
                        id
                        purchaseDate
                        status
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
                        deliverables {
                            files {
                                id
                                name
                                type
                                mimeType
                                size
                                uploadedAt
                                signedUrl
                            }
                            message
                            deliveredAt
                        }
                    }
                }
            `, {
                orderId
            });

            return response.serviceOrderById;
        },
        enabled: !!orderId
    });
};

export default UseServiceOrder;
export type { ServiceOrder, DeliverableFile };

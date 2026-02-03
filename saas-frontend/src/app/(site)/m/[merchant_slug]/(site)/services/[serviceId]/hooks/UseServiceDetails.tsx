'use client';

import { gql } from "@/lib/services/gql";
import { useQuery } from "@tanstack/react-query";

type ServiceDeliveryFormat = {
    format: string;
    description?: string;
};

type ServiceQuestion = {
    id: string;
    question: string;
    type: "TEXT" | "TEXTAREA" | "SELECT" | "MULTISELECT";
    required: boolean;
    options?: string[];
};

type ServicePricing = {
    type: "FIXED" | "PACKAGE" | "HOURLY";
    fixedPrice?: {
        amount: number;
        currency: string;
    };
    packages?: Array<{
        name: string;
        description?: string;
        price: {
            amount: number;
            currency: string;
        };
        sessions?: number;
    }>;
    hourlyRate?: {
        amount: number;
        currency: string;
    };
};

type ServiceAddOn = {
    id: string;
    name: string;
    description?: string;
    price: {
        amount: number;
        currency: string;
    };
};

type ReadingOptions = {
    readingType?: string;
    includePullCardSummary?: boolean;
    includeVoiceNote?: boolean;
    deckUsed?: string;
    availableTopics?: string;
    astrologyReadingTypes?: string[];
    houseSystem?: string;
    requiresBirthTime?: boolean;
    focusAreas?: string;
    customReadingDetails?: string;
};

type HealingOptions = {
    modalities?: string[];
    sessionLength?: number;
    preparationInstructions?: string;
};

type CoachingOptions = {
    specialties?: string[];
    sessionLength?: number;
    programLength?: number;
};

export type Service = {
    id: string;
    slug: string;
    vendorId: string;
    vendor: {
        id: string;
        name: string;
        slug: string;
    };
    name: string;
    description: string;
    terms?: string;
    faq?: Array<{
        id: string;
        title: string;
        description: string;
    }>;
    thumbnail?: {
        image: {
            media: {
                url: string;
                name: string;
            };
        };
        title: {
            content: string;
        };
    };
    category: "READING" | "HEALING" | "COACHING";
    deliveryMode: "SYNC" | "ASYNC";
    bookingType: "ASAP" | "SCHEDULED";
    pricing: ServicePricing;
    turnaroundDays?: number;
    deliveryFormats?: ServiceDeliveryFormat[];
    addOns?: ServiceAddOn[];
    questionnaire?: ServiceQuestion[];
    readingOptions?: ReadingOptions;
    healingOptions?: HealingOptions;
    coachingOptions?: CoachingOptions;
};

const UseServiceDetails = (merchantId: string, serviceSlug: string) => {
    return useQuery({
        queryKey: ['service-details', merchantId, serviceSlug],
        queryFn: async () => {
            const response = await gql<{
                service: Service;
            }>(`
                query GetServiceDetails($vendorId: ID!, $slug: String!) {
                    service(vendorId: $vendorId, slug: $slug) {
                        id
                        slug
                        vendorId
                        vendor {
                            id
                            name
                            slug
                        }
                        name
                        description
                        terms
                        faq {
                            id
                            title
                            description
                        }
                        thumbnail {
                            image {
                                media {
                                    url
                                    name
                                }
                            }
                            title {
                                content
                            }
                        }
                        category
                        deliveryMode
                        bookingType
                        pricing {
                            type
                            fixedPrice {
                                amount
                                currency
                            }
                            packages {
                                name
                                description
                                price {
                                    amount
                                    currency
                                }
                                sessions
                            }
                            hourlyRate {
                                amount
                                currency
                            }
                        }
                        turnaroundDays
                        deliveryFormats {
                            format
                            description
                        }
                        addOns {
                            id
                            name
                            description
                            price {
                                amount
                                currency
                            }
                        }
                        questionnaire {
                            id
                            question
                            type
                            required
                            options
                        }
                        readingOptions {
                            readingType
                            includePullCardSummary
                            includeVoiceNote
                            deckUsed
                            availableTopics
                            astrologyReadingTypes
                            houseSystem
                            requiresBirthTime
                            focusAreas
                            customReadingDetails
                        }
                        healingOptions {
                            modalities
                            sessionLength
                            preparationInstructions
                        }
                        coachingOptions {
                            specialties
                            sessionLength
                            programLength
                        }
                    }
                }
            `, {
                vendorId: merchantId,
                slug: serviceSlug
            });

            return response.service;
        },
        enabled: !!merchantId && !!serviceSlug
    });
};

export default UseServiceDetails;

import { useQuery } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";

export type FeaturingRelationship = {
    id: string;
    merchantId: string;
    practitionerId: string;
    merchantName: string;
    merchantSlug: string;
    merchantLogo?: string;
    practitionerName: string;
    practitionerSlug: string;
    practitionerHeadline?: string;
    practitionerAvatar?: string;
    featuringType: "FULL_PROFILE" | "SELECTED_SERVICES";
    featuredServiceIds?: string[];
    merchantRevenueShareBps: number;
    practitionerRevenueShareBps: number;
    storeSchedule?: {
        scheduleMode: "PRACTITIONER_DEFAULT" | "STORE_SPECIFIC";
        timezone: string;
        weekdays?: {
            day: number;
            dayName: string;
            enabled: boolean;
            timeSlots: { start: string; end: string }[];
        }[];
    };
    deliveryContext?: {
        inStore: boolean;
        online: boolean;
    };
    servicePriceOverrides?: {
        serviceId: string;
        serviceName: string;
        overrideType: "FIXED" | "HOURLY";
        fixedPrice?: { amount: number; currency: string };
        ratePerHour?: { amount: number; currency: string };
    }[];
    displayOrder?: number;
};

export type FeaturedPractitioner = {
    id: string;
    practitionerId: string;
    practitionerName: string;
    practitionerSlug: string;
    practitionerHeadline?: string;
    practitionerAvatar?: string;
    practitionerModalities?: string[];
    practitionerRating?: {
        average: number;
        total_count: number;
    };
    featuringType: "FULL_PROFILE" | "SELECTED_SERVICES";
    featuredServiceIds?: string[];
    storeSchedule?: FeaturingRelationship["storeSchedule"];
    deliveryContext?: FeaturingRelationship["deliveryContext"];
    servicePriceOverrides?: FeaturingRelationship["servicePriceOverrides"];
    displayOrder?: number;
};

export type FeaturedService = {
    id: string;
    name: string;
    description?: string;
    price: {
        amount: number;
        currency: string;
    };
    thumbnail?: {
        url: string;
    };
    practitionerId: string;
    practitionerName: string;
    practitionerSlug: string;
    practitionerAvatar?: string;
    featuringRelationshipId: string;
};

type FeaturedPractitionerResponse = {
    relationship: FeaturingRelationship;
    practitioner: {
        id: string;
        name: string;
        slug: string;
        logo?: {
            url: string;
        };
        practitioner?: {
            headline?: string;
            modalities?: string[];
        };
        rating?: {
            average: number;
            total_count: number;
        };
    };
    services: {
        id: string;
        name: string;
        description?: string;
        thumbnail?: {
            image?: {
                media?: {
                    url: string;
                };
            };
        };
        price?: {
            amount: number;
            currency: string;
        };
    }[];
};

type FeaturedServiceResponse = {
    relationship: FeaturingRelationship;
    service: {
        id: string;
        name: string;
        description?: string;
        thumbnail?: {
            image?: {
                media?: {
                    url: string;
                };
            };
        };
        price?: {
            amount: number;
            currency: string;
        };
    };
    practitioner: {
        id: string;
        name: string;
        slug: string;
        logo?: {
            url: string;
        };
    };
};

export const useFeaturedPractitioners = (merchantId?: string) => {
    return useQuery({
        queryKey: ["featured-practitioners", merchantId],
        queryFn: async () => {
            const response = await gql<{
                featuredPractitioners: FeaturedPractitionerResponse[];
            }>(`
                query GetFeaturedPractitioners($merchantId: ID!) {
                    featuredPractitioners(merchantId: $merchantId) {
                        relationship {
                            id
                            practitionerId
                            practitionerName
                            practitionerSlug
                            practitionerHeadline
                            practitionerAvatar
                            featuringType
                            featuredServiceIds
                            storeSchedule {
                                scheduleMode
                                timezone
                                weekdays {
                                    day
                                    dayName
                                    enabled
                                    timeSlots {
                                        start
                                        end
                                    }
                                }
                            }
                            deliveryContext {
                                inStore
                                online
                            }
                            servicePriceOverrides {
                                serviceId
                                serviceName
                                overrideType
                                fixedPrice {
                                    amount
                                    currency
                                }
                                ratePerHour {
                                    amount
                                    currency
                                }
                            }
                            displayOrder
                        }
                        practitioner {
                            id
                            name
                            slug
                            logo {
                                url
                            }
                            practitioner {
                                headline
                                modalities
                            }
                            rating {
                                average
                                total_count
                            }
                        }
                        services {
                            id
                            name
                        }
                    }
                }
            `, { merchantId });

            // Transform nested structure to flat structure for easier consumption
            return response.featuredPractitioners.map((fp): FeaturedPractitioner => ({
                id: fp.relationship.id,
                practitionerId: fp.relationship.practitionerId,
                practitionerName: fp.practitioner.name || fp.relationship.practitionerName,
                practitionerSlug: fp.practitioner.slug || fp.relationship.practitionerSlug,
                practitionerHeadline: fp.practitioner.practitioner?.headline || fp.relationship.practitionerHeadline,
                practitionerAvatar: fp.practitioner.logo?.url || fp.relationship.practitionerAvatar,
                practitionerModalities: fp.practitioner.practitioner?.modalities,
                practitionerRating: fp.practitioner.rating,
                featuringType: fp.relationship.featuringType,
                featuredServiceIds: fp.relationship.featuredServiceIds,
                storeSchedule: fp.relationship.storeSchedule,
                deliveryContext: fp.relationship.deliveryContext,
                servicePriceOverrides: fp.relationship.servicePriceOverrides,
                displayOrder: fp.relationship.displayOrder,
            }));
        },
        enabled: !!merchantId,
    });
};

export const useFeaturedServices = (merchantId?: string) => {
    return useQuery({
        queryKey: ["featured-services", merchantId],
        queryFn: async () => {
            const response = await gql<{
                featuredServices: FeaturedServiceResponse[];
            }>(`
                query GetFeaturedServices($merchantId: ID!) {
                    featuredServices(merchantId: $merchantId) {
                        relationship {
                            id
                        }
                        service {
                            id
                            name
                            description
                            thumbnail {
                                image {
                                    media {
                                        url
                                    }
                                }
                            }
                            price {
                                amount
                                currency
                            }
                        }
                        practitioner {
                            id
                            name
                            slug
                            logo {
                                url
                            }
                        }
                    }
                }
            `, { merchantId });

            // Transform nested structure to flat structure
            return response.featuredServices.map((fs): FeaturedService => ({
                id: fs.service.id,
                name: fs.service.name,
                description: fs.service.description,
                price: fs.service.price || { amount: 0, currency: "USD" },
                thumbnail: fs.service.thumbnail?.image?.media ? { url: fs.service.thumbnail.image.media.url } : undefined,
                practitionerId: fs.practitioner.id,
                practitionerName: fs.practitioner.name,
                practitionerSlug: fs.practitioner.slug,
                practitionerAvatar: fs.practitioner.logo?.url,
                featuringRelationshipId: fs.relationship.id,
            }));
        },
        enabled: !!merchantId,
    });
};

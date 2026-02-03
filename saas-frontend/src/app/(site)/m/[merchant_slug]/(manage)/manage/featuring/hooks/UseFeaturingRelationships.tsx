import { useQuery } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";

export type FeaturingTimeSlot = {
    start: string;
    end: string;
};

export type FeaturingScheduleWeekday = {
    day: number;
    dayName: string;
    enabled: boolean;
    timeSlots: FeaturingTimeSlot[];
};

export type FeaturingSchedule = {
    scheduleMode: "PRACTITIONER_DEFAULT" | "STORE_SPECIFIC";
    timezone: string;
    weekdays?: FeaturingScheduleWeekday[];
    dateOverrides?: {
        date: string;
        type: "BLOCKED" | "CUSTOM";
        timeSlots?: FeaturingTimeSlot[];
        reason?: string;
    }[];
    bufferMinutes?: number;
    advanceBookingDays?: number;
};

export type FeaturingDeliveryContext = {
    inStore: boolean;
    online: boolean;
    storeLocation?: {
        id: string;
        formattedAddress: string;
    };
};

export type FeaturingServicePriceOverride = {
    serviceId: string;
    serviceName: string;
    overrideType: "FIXED" | "HOURLY";
    fixedPrice?: { amount: number; currency: string };
    ratePerHour?: { amount: number; currency: string };
};

export type FeaturingRelationship = {
    id: string;
    merchantId: string;
    practitionerId: string;
    merchantName: string;
    merchantSlug: string;
    practitionerName: string;
    practitionerSlug: string;
    practitionerHeadline?: string;
    practitionerAvatar?: string;
    featuringType: "FULL_PROFILE" | "SELECTED_SERVICES";
    featuredServiceIds?: string[];
    merchantRevenueShareBps: number;
    practitionerRevenueShareBps: number;
    requestStatus: "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "TERMINATED";
    requestedAt: string;
    respondedAt?: string;
    terminatedAt?: string;
    terminatedBy?: "MERCHANT" | "PRACTITIONER";
    requestMessage?: string;
    responseMessage?: string;
    storeSchedule?: FeaturingSchedule;
    deliveryContext?: FeaturingDeliveryContext;
    servicePriceOverrides?: FeaturingServicePriceOverride[];
    displayOrder?: number;
    highlighted?: boolean;
    createdAt: string;
    updatedAt: string;
};

export const useFeaturingRelationships = (merchantId: string) => {
    return useQuery({
        queryKey: ["merchant-featuring-relationships", merchantId],
        queryFn: async () => {
            const response = await gql<{
                merchantFeaturingRelationships: FeaturingRelationship[];
            }>(`
                query GetMerchantFeaturingRelationships($merchantId: ID!) {
                    merchantFeaturingRelationships(merchantId: $merchantId) {
                        id
                        merchantId
                        practitionerId
                        merchantName
                        merchantSlug
                        practitionerName
                        practitionerSlug
                        practitionerHeadline
                        practitionerAvatar
                        featuringType
                        featuredServiceIds
                        merchantRevenueShareBps
                        practitionerRevenueShareBps
                        requestStatus
                        requestedAt
                        respondedAt
                        terminatedAt
                        terminatedBy
                        requestMessage
                        responseMessage
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
                            bufferMinutes
                            advanceBookingDays
                        }
                        deliveryContext {
                            inStore
                            online
                            storeLocation {
                                id
                                formattedAddress
                            }
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
                        highlighted
                        createdAt
                        updatedAt
                    }
                }
            `, { merchantId });
            return response.merchantFeaturingRelationships;
        },
        enabled: !!merchantId,
    });
};

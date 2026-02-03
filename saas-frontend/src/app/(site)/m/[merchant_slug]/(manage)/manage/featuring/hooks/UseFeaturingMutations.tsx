import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";
import { FeaturingRelationship, FeaturingSchedule, FeaturingServicePriceOverride } from "./UseFeaturingRelationships";

type FeaturingRequestResponse = {
    code: string;
    success: boolean;
    message: string;
    relationship?: FeaturingRelationship;
};

type CreateFeaturingRequestInput = {
    practitionerId: string;
    featuringType: "FULL_PROFILE" | "SELECTED_SERVICES";
    featuredServiceIds?: string[];
    merchantRevenueShareBps: number;
    requestMessage?: string;
};

export const useCreateFeaturingRequest = (merchantId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: CreateFeaturingRequestInput) => {
            const response = await gql<{
                createFeaturingRequest: FeaturingRequestResponse;
            }>(`
                mutation CreateFeaturingRequest($input: CreateFeaturingRequestInput!) {
                    createFeaturingRequest(input: $input) {
                        code
                        success
                        message
                        relationship {
                            id
                            merchantId
                            practitionerId
                            merchantName
                            practitionerName
                            practitionerSlug
                            featuringType
                            merchantRevenueShareBps
                            practitionerRevenueShareBps
                            requestStatus
                            requestedAt
                        }
                    }
                }
            `, { input });
            return response.createFeaturingRequest;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["merchant-featuring-relationships", merchantId],
            });
        },
    });
};

export const useTerminateFeaturingRelationship = (merchantId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: { relationshipId: string; reason?: string }) => {
            const response = await gql<{
                terminateFeaturingRelationship: FeaturingRequestResponse;
            }>(`
                mutation TerminateFeaturingRelationship($relationshipId: ID!, $reason: String) {
                    terminateFeaturingRelationship(relationshipId: $relationshipId, reason: $reason) {
                        code
                        success
                        message
                        relationship {
                            id
                            requestStatus
                            terminatedAt
                            terminatedBy
                        }
                    }
                }
            `, params);
            return response.terminateFeaturingRelationship;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["merchant-featuring-relationships", merchantId],
            });
        },
    });
};

export const useUpdateFeaturingRelationship = (merchantId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: {
            relationshipId: string;
            featuredServiceIds?: string[];
            displayOrder?: number;
            highlighted?: boolean;
        }) => {
            const response = await gql<{
                updateFeaturingRelationship: FeaturingRequestResponse;
            }>(`
                mutation UpdateFeaturingRelationship($input: UpdateFeaturingRelationshipInput!) {
                    updateFeaturingRelationship(input: $input) {
                        code
                        success
                        message
                        relationship {
                            id
                            featuredServiceIds
                            displayOrder
                            highlighted
                            updatedAt
                        }
                    }
                }
            `, { input });
            return response.updateFeaturingRelationship;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["merchant-featuring-relationships", merchantId],
            });
        },
    });
};

export const useConfigureFeaturingSchedule = (merchantId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: { relationshipId: string; storeSchedule: FeaturingSchedule }) => {
            const response = await gql<{
                configureFeaturingSchedule: FeaturingRequestResponse;
            }>(`
                mutation ConfigureFeaturingSchedule($input: ConfigureFeaturingScheduleInput!) {
                    configureFeaturingSchedule(input: $input) {
                        code
                        success
                        message
                        relationship {
                            id
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
                            updatedAt
                        }
                    }
                }
            `, { input });
            return response.configureFeaturingSchedule;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["merchant-featuring-relationships", merchantId],
            });
        },
    });
};

export const useConfigureFeaturingPricing = (merchantId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: { relationshipId: string; servicePriceOverrides: FeaturingServicePriceOverride[] }) => {
            const response = await gql<{
                configureFeaturingPricing: FeaturingRequestResponse;
            }>(`
                mutation ConfigureFeaturingPricing($input: ConfigureFeaturingPricingInput!) {
                    configureFeaturingPricing(input: $input) {
                        code
                        success
                        message
                        relationship {
                            id
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
                            updatedAt
                        }
                    }
                }
            `, { input });
            return response.configureFeaturingPricing;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["merchant-featuring-relationships", merchantId],
            });
        },
    });
};

export const useConfigureFeaturingDelivery = (merchantId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: { relationshipId: string; deliveryContext: { inStore: boolean; online: boolean; storeLocationId?: string } }) => {
            const response = await gql<{
                configureFeaturingDelivery: FeaturingRequestResponse;
            }>(`
                mutation ConfigureFeaturingDelivery($input: ConfigureFeaturingDeliveryInput!) {
                    configureFeaturingDelivery(input: $input) {
                        code
                        success
                        message
                        relationship {
                            id
                            deliveryContext {
                                inStore
                                online
                            }
                            updatedAt
                        }
                    }
                }
            `, { input });
            return response.configureFeaturingDelivery;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["merchant-featuring-relationships", merchantId],
            });
        },
    });
};

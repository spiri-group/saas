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
    displayOrder?: number;
    createdAt: string;
    updatedAt: string;
};

export const usePractitionerFeaturingRelationships = (practitionerId: string) => {
    return useQuery({
        queryKey: ["practitioner-featuring-relationships", practitionerId],
        queryFn: async () => {
            const response = await gql<{
                practitionerFeaturingRelationships: FeaturingRelationship[];
            }>(`
                query GetPractitionerFeaturingRelationships($practitionerId: ID!) {
                    practitionerFeaturingRelationships(practitionerId: $practitionerId) {
                        id
                        merchantId
                        practitionerId
                        merchantName
                        merchantSlug
                        merchantLogo
                        practitionerName
                        practitionerSlug
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
                        displayOrder
                        createdAt
                        updatedAt
                    }
                }
            `, { practitionerId });
            return response.practitionerFeaturingRelationships;
        },
        enabled: !!practitionerId,
    });
};

export const usePendingFeaturingRequests = (practitionerId: string) => {
    return useQuery({
        queryKey: ["pending-featuring-requests", practitionerId],
        queryFn: async () => {
            const response = await gql<{
                pendingFeaturingRequests: FeaturingRelationship[];
            }>(`
                query GetPendingFeaturingRequests($practitionerId: ID!) {
                    pendingFeaturingRequests(practitionerId: $practitionerId) {
                        id
                        merchantId
                        practitionerId
                        merchantName
                        merchantSlug
                        merchantLogo
                        featuringType
                        featuredServiceIds
                        merchantRevenueShareBps
                        practitionerRevenueShareBps
                        requestStatus
                        requestedAt
                        requestMessage
                        createdAt
                    }
                }
            `, { practitionerId });
            return response.pendingFeaturingRequests;
        },
        enabled: !!practitionerId,
    });
};

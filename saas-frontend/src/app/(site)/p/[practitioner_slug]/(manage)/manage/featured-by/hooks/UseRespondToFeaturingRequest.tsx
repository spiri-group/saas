import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";
import { FeaturingRelationship } from "./UsePractitionerFeaturingRelationships";

type FeaturingRequestResponse = {
    code: string;
    success: boolean;
    message: string;
    relationship?: FeaturingRelationship;
};

type RespondToFeaturingRequestInput = {
    relationshipId: string;
    accept: boolean;
    responseMessage?: string;
};

export const useRespondToFeaturingRequest = (practitionerId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: RespondToFeaturingRequestInput) => {
            const response = await gql<{
                respondToFeaturingRequest: FeaturingRequestResponse;
            }>(`
                mutation RespondToFeaturingRequest($input: RespondFeaturingRequestInput!) {
                    respondToFeaturingRequest(input: $input) {
                        code
                        success
                        message
                        relationship {
                            id
                            requestStatus
                            respondedAt
                            responseMessage
                        }
                    }
                }
            `, { input });
            return response.respondToFeaturingRequest;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["practitioner-featuring-relationships", practitionerId],
            });
            queryClient.invalidateQueries({
                queryKey: ["pending-featuring-requests", practitionerId],
            });
        },
    });
};

export const useTerminateFeaturingRelationship = (practitionerId: string) => {
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
                queryKey: ["practitioner-featuring-relationships", practitionerId],
            });
        },
    });
};

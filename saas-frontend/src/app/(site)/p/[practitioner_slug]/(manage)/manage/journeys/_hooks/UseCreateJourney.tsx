import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

type CreateJourneyInput = {
    name: string;
    description: string;
    thumbnail?: any;
    journeyStructure: string;
    modalities?: string[];
    intention?: string;
    difficulty?: string;
    spiritualInterests?: string[];
    recommendedCrystals?: string[];
    recommendedTools?: string[];
    pricing: {
        collectionPrice: { amount: number; currency: string };
        singleTrackPrice?: { amount: number; currency: string };
        allowSingleTrackPurchase: boolean;
    };
};

type UpdateJourneyInput = CreateJourneyInput & {
    id: string;
    isLive?: boolean;
};

const useCreateJourney = (practitionerId: string) => {
    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: async (input: CreateJourneyInput) => {
            const response = await gql<{
                create_journey: {
                    code: string;
                    success: boolean;
                    message: string;
                    journey: any;
                };
            }>(`
                mutation CreateJourney($vendorId: ID!, $input: CreateJourneyInput!) {
                    create_journey(vendorId: $vendorId, input: $input) {
                        code
                        success
                        message
                        journey {
                            id
                            name
                            slug
                        }
                    }
                }
            `, { vendorId: practitionerId, input });

            return response.create_journey;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['practitioner-journeys', practitionerId] });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async (input: UpdateJourneyInput) => {
            const response = await gql<{
                update_journey: {
                    code: string;
                    success: boolean;
                    message: string;
                    journey: any;
                };
            }>(`
                mutation UpdateJourney($vendorId: ID!, $input: UpdateJourneyInput!) {
                    update_journey(vendorId: $vendorId, input: $input) {
                        code
                        success
                        message
                        journey {
                            id
                            name
                            slug
                            isLive
                        }
                    }
                }
            `, { vendorId: practitionerId, input });

            return response.update_journey;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['practitioner-journeys', practitionerId] });
        },
    });

    return { createMutation, updateMutation };
};

export default useCreateJourney;

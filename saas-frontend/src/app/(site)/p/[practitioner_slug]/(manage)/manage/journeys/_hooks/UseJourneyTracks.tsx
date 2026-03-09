import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export type JourneyTrack = {
    id: string;
    journeyId: string;
    vendorId: string;
    trackNumber: number;
    title: string;
    description?: string;
    intention?: string;
    durationSeconds: number;
    audioFile?: {
        name: string;
        url: string;
        urlRelative: string;
        type: string;
        code: string;
        sizeBytes?: number;
        durationSeconds?: number;
    };
    previewDurationSeconds?: number;
    integrationPrompts?: string[];
    recommendedCrystals?: string[];
    linkedProductIds?: string[];
    linkedProducts?: {
        id: string;
        name: string;
        vendorId: string;
        thumbnail?: { image?: { media?: { url?: string } } };
        skus?: { id: string; price: { amount: number; currency: string }; qty: string }[];
        ref?: { id: string; partition: string[]; container: string };
    }[];
    releaseDate?: string;
};

export const useJourneyTracks = (journeyId: string, vendorId: string) => {
    return useQuery({
        queryKey: ['journey-tracks', journeyId, vendorId],
        queryFn: async () => {
            const response = await gql<{
                journeyTracks: JourneyTrack[];
            }>(`
                query GetJourneyTracks($journeyId: ID!, $vendorId: ID!) {
                    journeyTracks(journeyId: $journeyId, vendorId: $vendorId) {
                        id
                        journeyId
                        vendorId
                        trackNumber
                        title
                        description
                        intention
                        durationSeconds
                        audioFile {
                            name
                            url
                            urlRelative
                            type
                            code
                            sizeBytes
                            durationSeconds
                        }
                        previewDurationSeconds
                        integrationPrompts
                        recommendedCrystals
                        linkedProductIds
                        linkedProducts {
                            id
                            name
                            vendorId
                            thumbnail { image { media { url } } }
                            skus { id price { amount currency } qty }
                            ref { id partition container }
                        }
                        releaseDate
                    }
                }
            `, { journeyId, vendorId });

            return response.journeyTracks || [];
        },
        enabled: !!journeyId && !!vendorId,
    });
};

export const useUpsertTrack = (vendorId: string, journeyId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: {
            id?: string;
            trackNumber: number;
            title: string;
            description?: string;
            intention?: string;
            durationSeconds: number;
            audioFile: any;
            previewDurationSeconds?: number;
            integrationPrompts?: string[];
            recommendedCrystals?: string[];
            linkedProductIds?: string[];
            releaseDate?: string;
        }) => {
            const response = await gql<{
                upsert_journey_track: {
                    code: string;
                    success: boolean;
                    message: string;
                    track: JourneyTrack;
                };
            }>(`
                mutation UpsertJourneyTrack($vendorId: ID!, $journeyId: ID!, $input: JourneyTrackInput!) {
                    upsert_journey_track(vendorId: $vendorId, journeyId: $journeyId, input: $input) {
                        code
                        success
                        message
                        track {
                            id
                            trackNumber
                            title
                            durationSeconds
                        }
                    }
                }
            `, { vendorId, journeyId, input });

            return response.upsert_journey_track;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['journey-tracks', journeyId, vendorId] });
            queryClient.invalidateQueries({ queryKey: ['practitioner-journeys', vendorId] });
        },
    });
};

export const useDeleteTrack = (vendorId: string, journeyId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (trackId: string) => {
            const response = await gql<{
                delete_journey_track: {
                    code: string;
                    success: boolean;
                    message: string;
                };
            }>(`
                mutation DeleteJourneyTrack($vendorId: ID!, $journeyId: ID!, $trackId: ID!) {
                    delete_journey_track(vendorId: $vendorId, journeyId: $journeyId, trackId: $trackId) {
                        code
                        success
                        message
                    }
                }
            `, { vendorId, journeyId, trackId });

            return response.delete_journey_track;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['journey-tracks', journeyId, vendorId] });
            queryClient.invalidateQueries({ queryKey: ['practitioner-journeys', vendorId] });
        },
    });
};

export const useReorderTracks = (vendorId: string, journeyId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (trackIds: string[]) => {
            const response = await gql<{
                reorder_journey_tracks: {
                    code: string;
                    success: boolean;
                    message: string;
                };
            }>(`
                mutation ReorderJourneyTracks($vendorId: ID!, $journeyId: ID!, $trackIds: [ID!]!) {
                    reorder_journey_tracks(vendorId: $vendorId, journeyId: $journeyId, trackIds: $trackIds) {
                        code
                        success
                        message
                    }
                }
            `, { vendorId, journeyId, trackIds });

            return response.reorder_journey_tracks;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['journey-tracks', journeyId, vendorId] });
            queryClient.invalidateQueries({ queryKey: ['practitioner-journeys', vendorId] });
        },
    });
};

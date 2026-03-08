import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export type JourneyListItem = {
    id: string;
    name: string;
    slug: string;
    description?: string;
    isLive: boolean;
    journeyStructure: string;
    trackCount: number;
    totalDurationSeconds: number;
    difficulty?: string;
    intention?: string;
    modalities?: string[];
    recommendedTools?: string[];
    pricing: {
        collectionPrice: {
            amount: number;
            currency: string;
        };
        singleTrackPrice?: {
            amount: number;
            currency: string;
        };
        allowSingleTrackPurchase: boolean;
    };
    thumbnail?: {
        image?: {
            media?: {
                url: string;
            };
            zoom?: number;
            objectFit?: string;
        };
        stamp?: {
            text: string;
            enabled: boolean;
            bgColor: string;
            textColor: string;
        };
        bgColor?: string;
    };
    tracks?: {
        id: string;
        trackNumber: number;
        title: string;
        durationSeconds: number;
        intention?: string;
    }[];
};

const useJourneys = (practitionerId: string) => {
    return useQuery({
        queryKey: ['practitioner-journeys', practitionerId],
        queryFn: async () => {
            const response = await gql<{
                catalogue: {
                    listings: JourneyListItem[];
                };
            }>(`
                query GetPractitionerJourneys($vendorId: ID!, $types: [String]) {
                    catalogue(vendorId: $vendorId, types: $types, includeDrafts: true) {
                        listings {
                            id
                            name
                            slug
                            description
                            isLive
                            journeyStructure
                            trackCount
                            totalDurationSeconds
                            difficulty
                            intention
                            modalities
                            recommendedTools
                            pricing {
                                collectionPrice {
                                    amount
                                    currency
                                }
                                singleTrackPrice {
                                    amount
                                    currency
                                }
                                allowSingleTrackPurchase
                            }
                            thumbnail {
                                image {
                                    media {
                                        url
                                    }
                                    zoom
                                    objectFit
                                }
                                stamp {
                                    text
                                    enabled
                                    bgColor
                                    textColor
                                }
                                bgColor
                            }
                        }
                    }
                }
            `, { vendorId: practitionerId, types: ["JOURNEY"] });

            return response.catalogue?.listings || [];
        },
        enabled: !!practitionerId,
    });
};

export default useJourneys;

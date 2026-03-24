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
        allowRental: boolean;
        rentalPrice?: {
            amount: number;
            currency: string;
        };
        rentalDurationDays?: number;
    };
    termsDocumentId?: string;
    thumbnail?: {
        image?: {
            media?: {
                url: string;
            };
            zoom?: number;
            objectFit?: string;
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
                journeys: JourneyListItem[];
            }>(`
                query GetPractitionerJourneys($vendorId: ID!, $includeDrafts: Boolean) {
                    journeys(vendorId: $vendorId, includeDrafts: $includeDrafts) {
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
                        termsDocumentId
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
                            allowRental
                            rentalPrice {
                                amount
                                currency
                            }
                            rentalDurationDays
                        }
                        thumbnail {
                            image {
                                media {
                                    url
                                }
                                zoom
                                objectFit
                            }
                            bgColor
                        }
                    }
                }
            `, { vendorId: practitionerId, includeDrafts: true });

            return response.journeys || [];
        },
        enabled: !!practitionerId,
    });
};

export default useJourneys;

'use client';

import { gql } from "@/lib/services/gql";
import { useQuery } from "@tanstack/react-query";

export type JourneyTrackType = {
    id: string;
    trackNumber: number;
    title: string;
    description?: string;
    intention?: string;
    durationSeconds: number;
    previewDurationSeconds?: number;
    integrationPrompts?: string[];
    recommendedCrystals?: string[];
    linkedProducts?: {
        id: string;
        name: string;
        vendorId: string;
        thumbnail?: { image?: { media?: { url?: string } } };
        skus?: { id: string; price: { amount: number; currency: string }; qty: string }[];
        ref?: { id: string; partition: string[]; container: string };
    }[];
    audioFile?: {
        url: string;
        name: string;
    };
};

export type JourneyType = {
    id: string;
    vendorId: string;
    name: string;
    slug?: string;
    description: string;
    thumbnail?: {
        image?: {
            media?: {
                url: string;
                name?: string;
            };
            zoom?: number;
            objectFit?: string;
        };
        bgColor?: string;
    };
    isLive?: boolean;
    journeyStructure: string;
    modalities?: string[];
    intention?: string;
    totalDurationSeconds: number;
    trackCount: number;
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
    recommendedCrystals?: string[];
    recommendedTools?: string[];
    difficulty?: string;
    spiritualInterests?: string[];
    tracks?: JourneyTrackType[];
    vendor?: {
        id: string;
        name: string;
        slug: string;
    };
    ref?: {
        id: string;
        partition: string[];
        container: string;
    };
};

export const KEY = "journey-details";

export const queryFn = async (merchantId: string, journeyId: string) => {

    const resp = await gql<{
        journey: JourneyType
    }>(
        `query get_journey($id: ID!, $vendorId: ID!){
            journey(id: $id, vendorId: $vendorId) {
                id
                vendorId
                name
                slug
                description
                thumbnail {
                    image {
                        media {
                            url
                            name
                        }
                        zoom
                        objectFit
                    }
                    bgColor
                }
                isLive
                journeyStructure
                modalities
                intention
                totalDurationSeconds
                trackCount
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
                recommendedCrystals
                recommendedTools
                difficulty
                spiritualInterests
                tracks {
                    id
                    trackNumber
                    title
                    description
                    intention
                    durationSeconds
                    previewDurationSeconds
                    integrationPrompts
                    recommendedCrystals
                    linkedProducts {
                        id
                        name
                        vendorId
                        thumbnail { image { media { url } } }
                        skus { id price { amount currency } qty }
                        ref { id partition container }
                    }
                    audioFile {
                        url
                        name
                    }
                }
                vendor {
                    id
                    name
                    slug
                }
                ref {
                    id
                    partition
                    container
                }
            }
        }`,
        {
            id: journeyId,
            vendorId: merchantId
        }
    )
    return resp.journey;
}

const UseJourneyDetails = (merchantId: string, journeyId: string) => {
    return useQuery({
        queryKey: [KEY, merchantId, journeyId],
        queryFn: () => queryFn(merchantId, journeyId)
    });
}

export default UseJourneyDetails;

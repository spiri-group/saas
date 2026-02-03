import { useQuery } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";

export type DiscoveredPractitioner = {
    id: string;
    name: string;
    slug: string;
    logo?: {
        url: string;
    };
    practitioner?: {
        headline?: string;
        modalities?: string[];
        specializations?: string[];
    };
    rating?: {
        average: number;
        total_count: number;
    };
    serviceCount: number;
    priceRange?: {
        min?: { amount: number; currency: string };
        max?: { amount: number; currency: string };
    };
};

type DiscoveredPractitionerEntry = {
    practitioner: {
        id: string;
        name: string;
        slug: string;
        logo?: { url: string };
        practitioner?: {
            headline?: string;
            modalities?: string[];
            specializations?: string[];
        };
        rating?: {
            average: number;
            total_count: number;
        };
    };
    serviceCount: number;
    priceRange?: {
        min?: { amount: number; currency: string };
        max?: { amount: number; currency: string };
    };
};

export type PractitionerDiscoveryResponse = {
    practitioners: DiscoveredPractitioner[];
    totalCount: number;
    hasMore: boolean;
};

export const useDiscoverPractitioners = (
    merchantId: string,
    options?: {
        modalities?: string[];
        specializations?: string[];
        search?: string;
        limit?: number;
        offset?: number;
    }
) => {
    return useQuery({
        queryKey: [
            "discover-practitioners",
            merchantId,
            options?.modalities,
            options?.specializations,
            options?.search,
            options?.limit,
            options?.offset,
        ],
        queryFn: async () => {
            const response = await gql<{
                discoverPractitioners: {
                    practitioners: DiscoveredPractitionerEntry[];
                    totalCount: number;
                    hasMore: boolean;
                };
            }>(`
                query DiscoverPractitioners(
                    $merchantId: ID!
                    $modalities: [String]
                    $specializations: [String]
                    $search: String
                    $limit: Int
                    $offset: Int
                ) {
                    discoverPractitioners(
                        merchantId: $merchantId
                        modalities: $modalities
                        specializations: $specializations
                        search: $search
                        limit: $limit
                        offset: $offset
                    ) {
                        practitioners {
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
                                    specializations
                                }
                                rating {
                                    average
                                    total_count
                                }
                            }
                            serviceCount
                            priceRange {
                                min {
                                    amount
                                    currency
                                }
                                max {
                                    amount
                                    currency
                                }
                            }
                        }
                        totalCount
                        hasMore
                    }
                }
            `, {
                merchantId,
                modalities: options?.modalities,
                specializations: options?.specializations,
                search: options?.search,
                limit: options?.limit ?? 20,
                offset: options?.offset ?? 0,
            });

            // Flatten the enriched response to match DiscoveredPractitioner type
            const data = response.discoverPractitioners;
            return {
                practitioners: data.practitioners.map((entry): DiscoveredPractitioner => ({
                    ...entry.practitioner,
                    serviceCount: entry.serviceCount,
                    priceRange: entry.priceRange,
                })),
                totalCount: data.totalCount,
                hasMore: data.hasMore,
            };
        },
        enabled: !!merchantId,
    });
};

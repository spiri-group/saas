'use client';

import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export type TierFeatures = {
    canCreateMerchantProfile: boolean;
    maxProducts: number | null;
    canHostPractitioners: boolean;
    hasInventoryAutomation: boolean;
    hasShippingAutomation: boolean;
    canCreateEvents: boolean;
    canCreateTours: boolean;
    hasSpiriAssist: boolean;
    hasBackorders: boolean;
    hasPaymentLinks: boolean;
    hasLiveAssist: boolean;
    hasExpoMode: boolean;
};

export type SubscriptionTierDefinition = {
    tier: string;
    name: string;
    description: string;
    profileType: string;
    features: TierFeatures;
    monthlyPrice: number;
    annualPrice: number;
    currency: string;
};

export const useSubscriptionTiers = (profileType?: string) => {
    return useQuery({
        queryKey: ['subscription-tiers', profileType],
        queryFn: async () => {
            const response = await gql<{
                subscriptionTiers: SubscriptionTierDefinition[];
            }>(`
                query SubscriptionTiers($profileType: String) {
                    subscriptionTiers(profileType: $profileType) {
                        tier
                        name
                        description
                        profileType
                        features {
                            canCreateMerchantProfile
                            maxProducts
                            canHostPractitioners
                            hasInventoryAutomation
                            hasShippingAutomation
                            canCreateEvents
                            canCreateTours
                            hasSpiriAssist
                            hasBackorders
                            hasPaymentLinks
                            hasLiveAssist
                            hasExpoMode
                        }
                        monthlyPrice
                        annualPrice
                        currency
                    }
                }
            `, { profileType });
            return response.subscriptionTiers;
        },
    });
};

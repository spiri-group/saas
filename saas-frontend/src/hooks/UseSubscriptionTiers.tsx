'use client';

import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export type TierFeatures = {
    // Core (Directory+)
    hasDirectory: boolean;
    hasSpiriAssist: boolean;
    hasGallery: boolean;
    // Practitioner (Awaken+)
    canAcceptPayments: boolean;
    hasVideoUpdates: boolean;
    canSellServices: boolean;
    hasSpiriReadings: boolean;
    // Growth (Illuminate+)
    hasPaymentLinks: boolean;
    canCreateEvents: boolean;
    hasLiveAssist: boolean;
    hasExpoMode: boolean;
    canListTours: boolean;
    // Merchant (Manifest+)
    canCreateMerchantProfile: boolean;
    maxProducts: number | null;
    hasInventoryAutomation: boolean;
    canHostPractitioners: boolean;
    canOperateTours: boolean;
    // Enterprise (Transcend)
    hasRefundAutomation: boolean;
    hasShippingAutomation: boolean;
    hasPOS: boolean;
    hasBackorders: boolean;
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
                            hasDirectory
                            hasSpiriAssist
                            hasGallery
                            canAcceptPayments
                            hasVideoUpdates
                            canSellServices
                            hasSpiriReadings
                            hasPaymentLinks
                            canCreateEvents
                            hasLiveAssist
                            hasExpoMode
                            canListTours
                            canCreateMerchantProfile
                            maxProducts
                            hasInventoryAutomation
                            canHostPractitioners
                            canOperateTours
                            hasRefundAutomation
                            hasShippingAutomation
                            hasPOS
                            hasBackorders
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

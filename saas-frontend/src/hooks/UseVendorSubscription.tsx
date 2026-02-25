'use client';

import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { TierFeatures } from './UseSubscriptionTiers';

export type VendorSubscriptionDetail = {
    subscriptionTier: string;
    billingInterval: string;
    billingStatus: string;
    cumulativePayouts: number;
    subscriptionCostThreshold: number;
    firstBillingTriggeredAt?: string;
    lastBilledAt?: string;
    subscriptionExpiresAt?: string;
    failedPaymentAttempts: number;
    nextRetryAt?: string;
    lastPaymentAttemptAt?: string;
    pendingDowngradeTo?: string;
    downgradeEffectiveAt?: string;
    cardStatus: string;
    paymentStatus: string;
    billingHistory: {
        id: string;
        date: string;
        amount: number;
        currency: string;
        billingStatus: string;
        stripePaymentIntentId?: string;
        error?: string;
        period_start: string;
        period_end: string;
    }[];
    firstPayoutReceived?: boolean;
    payoutsBlocked?: boolean;
    stripePaymentMethodId?: string;
    tierFeatures: TierFeatures;
    discountPercent?: number;
    waived?: boolean;
    waivedUntil?: string;
    overrideNotes?: string;
    // Trial billing model
    billingModel?: string;
    trialStartedAt?: string;
    trialEndsAt?: string;
};

export const useVendorSubscription = (vendorId: string) => {
    return useQuery({
        queryKey: ['vendor-subscription', vendorId],
        queryFn: async () => {
            const response = await gql<{
                vendorSubscription: VendorSubscriptionDetail;
            }>(`
                query VendorSubscription($vendorId: ID!) {
                    vendorSubscription(vendorId: $vendorId) {
                        subscriptionTier
                        billingInterval
                        billingStatus
                        cumulativePayouts
                        subscriptionCostThreshold
                        firstBillingTriggeredAt
                        lastBilledAt
                        subscriptionExpiresAt
                        failedPaymentAttempts
                        nextRetryAt
                        lastPaymentAttemptAt
                        pendingDowngradeTo
                        downgradeEffectiveAt
                        cardStatus
                        paymentStatus
                        billingHistory {
                            id
                            date
                            amount
                            currency
                            billingStatus
                            stripePaymentIntentId
                            error
                            period_start
                            period_end
                        }
                        firstPayoutReceived
                        payoutsBlocked
                        stripePaymentMethodId
                        tierFeatures {
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
                        discountPercent
                        waived
                        waivedUntil
                        overrideNotes
                        billingModel
                        trialStartedAt
                        trialEndsAt
                    }
                }
            `, { vendorId });
            return response.vendorSubscription;
        },
        enabled: !!vendorId,
    });
};

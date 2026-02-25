'use client';

import { useMemo } from 'react';
import { useVendorSubscription } from './UseVendorSubscription';

export type TrialStatus = {
    isOnTrial: boolean;
    isTrialExpired: boolean;
    hasCard: boolean;
    daysRemaining: number;
    totalDays: number;
    bannerStage: 'none' | 'subtle' | 'warning' | 'urgent';
    trialEndsAt: Date | null;
    subscriptionTier: string;
    billingInterval: string;
    isLoading: boolean;
};

export function useTrialStatus(vendorId: string): TrialStatus {
    const { data: subscription, isLoading } = useVendorSubscription(vendorId);

    return useMemo(() => {
        if (!subscription) {
            return {
                isOnTrial: false,
                isTrialExpired: false,
                hasCard: false,
                daysRemaining: 0,
                totalDays: 14,
                bannerStage: 'none' as const,
                trialEndsAt: null,
                subscriptionTier: '',
                billingInterval: '',
                isLoading,
            };
        }

        const isOnTrial = subscription.billingModel === 'trial' && subscription.billingStatus === 'trial';
        const isTrialExpired = subscription.billingModel === 'trial' && subscription.billingStatus === 'suspended';
        const hasCard = subscription.cardStatus === 'saved';
        const trialEndsAt = subscription.trialEndsAt ? new Date(subscription.trialEndsAt) : null;

        let daysRemaining = 0;
        if (trialEndsAt && isOnTrial) {
            const now = new Date();
            const diffMs = trialEndsAt.getTime() - now.getTime();
            daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        }

        let bannerStage: 'none' | 'subtle' | 'warning' | 'urgent' = 'none';
        if (isOnTrial && !hasCard) {
            if (daysRemaining <= 2) {
                bannerStage = 'urgent';
            } else if (daysRemaining <= 6) {
                bannerStage = 'warning';
            } else {
                bannerStage = 'subtle';
            }
        }

        return {
            isOnTrial,
            isTrialExpired,
            hasCard,
            daysRemaining,
            totalDays: 14,
            bannerStage,
            trialEndsAt,
            subscriptionTier: subscription.subscriptionTier,
            billingInterval: subscription.billingInterval,
            isLoading,
        };
    }, [subscription, isLoading]);
}

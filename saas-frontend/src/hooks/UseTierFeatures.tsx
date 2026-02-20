'use client';

import { useVendorSubscription, VendorSubscriptionDetail } from './UseVendorSubscription';
import { TierFeatures } from './UseSubscriptionTiers';

const DEFAULT_FEATURES: TierFeatures = {
    canCreateMerchantProfile: false,
    maxProducts: 0,
    canHostPractitioners: false,
    hasInventoryAutomation: false,
    hasShippingAutomation: false,
    canCreateEvents: false,
    canCreateTours: false,
    hasSpiriAssist: false,
    hasBackorders: false,
    hasPaymentLinks: false,
    hasLiveAssist: false,
};

export type TierFeaturesResult = {
    features: TierFeatures;
    tier: string | undefined;
    billingStatus: string | undefined;
    isLoading: boolean;
    isSuspended: boolean;
    subscription: VendorSubscriptionDetail | undefined;
};

export const useTierFeatures = (vendorId: string): TierFeaturesResult => {
    const { data: subscription, isLoading } = useVendorSubscription(vendorId);

    const features = subscription?.tierFeatures ?? DEFAULT_FEATURES;
    const tier = subscription?.subscriptionTier;
    const billingStatus = subscription?.billingStatus;
    const isSuspended = billingStatus === 'suspended';

    return {
        features,
        tier,
        billingStatus,
        isLoading,
        isSuspended,
        subscription,
    };
};

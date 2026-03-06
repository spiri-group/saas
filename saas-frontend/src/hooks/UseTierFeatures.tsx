'use client';

import { useVendorSubscription, VendorSubscriptionDetail } from './UseVendorSubscription';
import { TierFeatures } from './UseSubscriptionTiers';

const DEFAULT_FEATURES: TierFeatures = {
    // Core
    hasDirectory: false,
    hasSpiriAssist: false,
    hasGallery: false,
    // Practitioner
    canAcceptPayments: false,
    hasVideoUpdates: false,
    canSellServices: false,
    hasSpiriReadings: false,
    // Growth
    hasPaymentLinks: false,
    canCreateEvents: false,
    hasLiveAssist: false,
    hasExpoMode: false,
    canListTours: false,
    // Merchant
    canCreateMerchantProfile: false,
    maxProducts: 0,
    hasInventoryAutomation: false,
    canHostPractitioners: false,
    canOperateTours: false,
    // Enterprise
    hasRefundAutomation: false,
    hasShippingAutomation: false,
    hasPOS: false,
    hasBackorders: false,
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

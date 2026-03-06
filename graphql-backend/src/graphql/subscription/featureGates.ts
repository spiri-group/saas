import { subscription_tier } from "../vendor/types";

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
    maxProducts: number | null; // null = unlimited
    hasInventoryAutomation: boolean;
    canHostPractitioners: boolean;
    canOperateTours: boolean;

    // Enterprise (Transcend)
    hasRefundAutomation: boolean;
    hasShippingAutomation: boolean;
    hasPOS: boolean;
    hasBackorders: boolean;
};

const TIER_FEATURES: Record<subscription_tier, TierFeatures> = {
    directory: {
        // Core
        hasDirectory: true,
        hasSpiriAssist: true,
        hasGallery: true,
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
    },
    awaken: {
        // Core
        hasDirectory: true,
        hasSpiriAssist: true,
        hasGallery: true,
        // Practitioner
        canAcceptPayments: true,
        hasVideoUpdates: true,
        canSellServices: true,
        hasSpiriReadings: true,
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
    },
    illuminate: {
        // Core
        hasDirectory: true,
        hasSpiriAssist: true,
        hasGallery: true,
        // Practitioner
        canAcceptPayments: true,
        hasVideoUpdates: true,
        canSellServices: true,
        hasSpiriReadings: true,
        // Growth
        hasPaymentLinks: true,
        canCreateEvents: true,
        hasLiveAssist: true,
        hasExpoMode: true,
        canListTours: true,
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
    },
    manifest: {
        // Core
        hasDirectory: true,
        hasSpiriAssist: true,
        hasGallery: true,
        // Practitioner
        canAcceptPayments: true,
        hasVideoUpdates: true,
        canSellServices: true,
        hasSpiriReadings: true,
        // Growth
        hasPaymentLinks: true,
        canCreateEvents: true,
        hasLiveAssist: true,
        hasExpoMode: true,
        canListTours: true,
        // Merchant
        canCreateMerchantProfile: true,
        maxProducts: 20,
        hasInventoryAutomation: true,
        canHostPractitioners: true,
        canOperateTours: true,
        // Enterprise
        hasRefundAutomation: false,
        hasShippingAutomation: false,
        hasPOS: false,
        hasBackorders: false,
    },
    transcend: {
        // Core
        hasDirectory: true,
        hasSpiriAssist: true,
        hasGallery: true,
        // Practitioner
        canAcceptPayments: true,
        hasVideoUpdates: true,
        canSellServices: true,
        hasSpiriReadings: true,
        // Growth
        hasPaymentLinks: true,
        canCreateEvents: true,
        hasLiveAssist: true,
        hasExpoMode: true,
        canListTours: true,
        // Merchant
        canCreateMerchantProfile: true,
        maxProducts: null,
        hasInventoryAutomation: true,
        canHostPractitioners: true,
        canOperateTours: true,
        // Enterprise
        hasRefundAutomation: true,
        hasShippingAutomation: true,
        hasPOS: true,
        hasBackorders: true,
    },
};

const TIER_ORDER: subscription_tier[] = ['directory', 'awaken', 'illuminate', 'manifest', 'transcend'];

export function getTierFeatures(tier: subscription_tier): TierFeatures {
    return TIER_FEATURES[tier];
}

type FeeConfigEntry = { percent: number; fixed: number; currency: string };

export function getTierPrice(
    tier: subscription_tier,
    interval: 'monthly' | 'annual',
    feeConfig: Record<string, FeeConfigEntry> | null
): number {
    if (!feeConfig) return 0;
    const key = `subscription-${tier}-${interval}`;
    const entry = feeConfig[key];
    return entry?.fixed ?? 0;
}

export function getTierFeeKey(tier: subscription_tier, interval: 'monthly' | 'annual'): string {
    return `subscription-${tier}-${interval}`;
}

export function canUpgrade(from: subscription_tier, to: subscription_tier): boolean {
    return TIER_ORDER.indexOf(to) > TIER_ORDER.indexOf(from);
}

export function canDowngrade(from: subscription_tier, to: subscription_tier): boolean {
    return TIER_ORDER.indexOf(to) < TIER_ORDER.indexOf(from);
}

export function getTierOrder(tier: subscription_tier): number {
    return TIER_ORDER.indexOf(tier);
}

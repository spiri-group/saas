import { subscription_tier } from "../vendor/types";

export type TierFeatures = {
    canCreateMerchantProfile: boolean;
    maxProducts: number | null; // null = unlimited
    canHostPractitioners: boolean;
    hasInventoryAutomation: boolean;
    hasShippingAutomation: boolean;
};

const TIER_FEATURES: Record<subscription_tier, TierFeatures> = {
    awaken: {
        canCreateMerchantProfile: false,
        maxProducts: 0,
        canHostPractitioners: false,
        hasInventoryAutomation: false,
        hasShippingAutomation: false,
    },
    manifest: {
        canCreateMerchantProfile: true,
        maxProducts: 15,
        canHostPractitioners: false,
        hasInventoryAutomation: false,
        hasShippingAutomation: false,
    },
    transcend: {
        canCreateMerchantProfile: true,
        maxProducts: null,
        canHostPractitioners: true,
        hasInventoryAutomation: true,
        hasShippingAutomation: true,
    },
};

const TIER_ORDER: subscription_tier[] = ['awaken', 'manifest', 'transcend'];

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

'use client';

import { useSubscriptionTiers } from '@/hooks/UseSubscriptionTiers';
import TierCard from './TierCard';

type TierSelectorProps = {
    profileType: 'practitioner' | 'merchant';
    selectedTier?: string;
    selectedInterval?: 'monthly' | 'annual';
    onTierChange: (tier: string) => void;
    onIntervalChange: (interval: 'monthly' | 'annual') => void;
};

export default function TierSelector({
    profileType,
    selectedTier,
    selectedInterval = 'monthly',
    onTierChange,
    onIntervalChange,
}: TierSelectorProps) {
    const { data: tiers, isLoading } = useSubscriptionTiers(profileType);

    if (isLoading) {
        return (
            <div data-testid="tier-selector-loading" className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
            </div>
        );
    }

    if (!tiers || tiers.length === 0) {
        return null;
    }

    // Auto-select for practitioner (only Awaken available)
    if (profileType === 'practitioner' && tiers.length === 1 && !selectedTier) {
        onTierChange(tiers[0].tier);
    }

    return (
        <div data-testid="tier-selector" className="space-y-6">
            {/* Billing interval toggle */}
            <div className="flex items-center justify-center gap-3" data-testid="tier-interval-toggle">
                <button
                    type="button"
                    data-testid="tier-interval-monthly"
                    onClick={() => onIntervalChange('monthly')}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        selectedInterval === 'monthly'
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                >
                    Monthly
                </button>
                <button
                    type="button"
                    data-testid="tier-interval-annual"
                    onClick={() => onIntervalChange('annual')}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        selectedInterval === 'annual'
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                >
                    Annual
                    <span className="ml-1 text-xs text-green-400">(Save up to 20%)</span>
                </button>
            </div>

            {/* Tier cards */}
            <div
                data-testid="tier-cards-grid"
                className={`grid gap-6 ${
                    tiers.length === 1 ? 'max-w-2xl mx-auto' : tiers.length === 2 ? 'grid-cols-1 md:grid-cols-2 max-w-5xl mx-auto' : 'grid-cols-1 md:grid-cols-3 max-w-7xl mx-auto'
                }`}
            >
                {tiers.map((tier) => (
                    <TierCard
                        key={tier.tier}
                        tier={tier}
                        billingInterval={selectedInterval}
                        selected={selectedTier === tier.tier}
                        onSelect={onTierChange}
                        badge={tier.tier === 'manifest' ? 'Most Popular' : undefined}
                        disabled={profileType === 'practitioner' && tier.tier !== 'awaken'}
                    />
                ))}
            </div>

            {/* Card capture messaging */}
            <p data-testid="tier-billing-note" className="text-center text-xs text-slate-400">
                You won&apos;t be charged until your profile earns enough through payouts to cover the subscription cost.
            </p>
        </div>
    );
}

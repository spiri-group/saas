'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SubscriptionTierDefinition } from '@/hooks/UseSubscriptionTiers';

type TierCardProps = {
    tier: SubscriptionTierDefinition;
    billingInterval: 'monthly' | 'annual';
    selected: boolean;
    onSelect: (tier: string) => void;
    badge?: string;
    disabled?: boolean;
};

const FEATURE_LABELS: Record<string, string> = {
    canCreateMerchantProfile: 'Merchant storefront',
    maxProducts: 'Product listings',
    canHostPractitioners: 'Host practitioners',
    hasInventoryAutomation: 'Inventory automation',
    hasShippingAutomation: 'Shipping automation',
};

function formatPrice(cents: number): string {
    return `$${(cents / 100).toFixed(0)}`;
}

function formatFeatureValue(key: string, value: boolean | number | null): string {
    if (key === 'maxProducts') {
        if (value === null) return 'Unlimited';
        if (value === 0) return 'None';
        return `Up to ${value}`;
    }
    return value ? 'Included' : 'Not included';
}

export default function TierCard({ tier, billingInterval, selected, onSelect, badge, disabled }: TierCardProps) {
    const price = billingInterval === 'monthly' ? tier.monthlyPrice : tier.annualPrice;
    const monthlySavings = billingInterval === 'annual'
        ? tier.monthlyPrice * 12 - tier.annualPrice
        : 0;

    return (
        <button
            type="button"
            data-testid={`tier-card-${tier.tier}`}
            onClick={() => !disabled && onSelect(tier.tier)}
            disabled={disabled}
            className={cn(
                'relative flex flex-col rounded-xl border-2 p-6 text-left transition-all',
                selected
                    ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-500',
                disabled && 'cursor-not-allowed opacity-50'
            )}
        >
            {badge && (
                <span
                    data-testid={`tier-badge-${tier.tier}`}
                    className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-purple-600 px-3 py-0.5 text-xs font-semibold text-white"
                >
                    {badge}
                </span>
            )}

            <div className="mb-4">
                <h3
                    data-testid={`tier-name-${tier.tier}`}
                    className="text-lg font-bold text-white"
                >
                    {tier.name}
                </h3>
                <p className="mt-1 text-sm text-slate-400">{tier.description}</p>
            </div>

            <div className="mb-6" data-testid={`tier-price-${tier.tier}`}>
                <span className="text-3xl font-bold text-white">{formatPrice(price)}</span>
                <span className="text-sm text-slate-400">
                    /{billingInterval === 'monthly' ? 'month' : 'year'}
                </span>
                {billingInterval === 'annual' && monthlySavings > 0 && (
                    <p className="mt-1 text-xs text-green-400" data-testid={`tier-savings-${tier.tier}`}>
                        Save {formatPrice(monthlySavings)}/year
                    </p>
                )}
            </div>

            <ul className="space-y-2 flex-1">
                {Object.entries(FEATURE_LABELS).map(([key, label]) => {
                    const value = tier.features[key as keyof typeof tier.features];
                    const included = key === 'maxProducts' ? (value as number | null) !== 0 : !!value;

                    return (
                        <li
                            key={key}
                            data-testid={`tier-feature-${tier.tier}-${key}`}
                            className={cn(
                                'flex items-center gap-2 text-sm',
                                included ? 'text-slate-200' : 'text-slate-500'
                            )}
                        >
                            <Check
                                className={cn(
                                    'h-4 w-4 flex-shrink-0',
                                    included ? 'text-green-400' : 'text-slate-600'
                                )}
                            />
                            <span>{label}: {formatFeatureValue(key, value as boolean | number | null)}</span>
                        </li>
                    );
                })}
            </ul>

            {selected && (
                <div
                    data-testid={`tier-selected-${tier.tier}`}
                    className="mt-4 flex items-center justify-center gap-1 rounded-lg bg-purple-600 py-2 text-sm font-medium text-white"
                >
                    <Check className="h-4 w-4" />
                    Selected
                </div>
            )}
        </button>
    );
}

"use client";

const TIER_DESCRIPTIONS: Record<string, string> = {
    awaken: 'Get discovered and start earning',
    illuminate: 'Send payment links and collect payments from clients',
    manifest: 'Start selling alongside your services',
    transcend: 'Remove the limits and grow your way',
};

const TIER_BULLETS: Record<string, string[]> = {
    awaken: [
        'Get listed and found by seekers',
        'Fill your calendar with bookings',
        'Accept payments instantly',
        'Reach globally via SpiriReadings',
        'Build a following with video',
    ],
    illuminate: [
        'Everything in Awaken, plus:',
        'Send payment links via email',
        'Expo Mode for fairs and markets',
        'Live Assist for streaming shows',
        'Include services or custom amounts',
        'Track payment status in real time',
    ],
    manifest: [
        'Everything in Illuminate, plus:',
        'Open your online shop with up to 10 products',
        'Payment links with products and services',
        'Live Assist for streaming shows',
        'Run and sell ticketed events',
        'Stock stays in sync automatically',
        'Paranormal and spiritual investigations with SpiriAssist',
    ],
    transcend: [
        'Everything in Manifest, plus:',
        'List your full catalogue, unlimited',
        'Bring practitioners into your space',
        'Host and sell guided tours',
        'Never miss a sale with backorders',
        'Ship faster with auto labels',
    ],
};
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


function formatPrice(cents: number): string {
    return `$${(cents / 100).toFixed(0)}`;
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
                'relative flex flex-col rounded-xl border-2 p-6 text-left transition-all h-full cursor-pointer',
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
                <p className="mt-1 text-sm text-slate-400">{TIER_DESCRIPTIONS[tier.tier] || tier.description}</p>
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
                {TIER_BULLETS[tier.tier]?.map((bullet, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-200">
                        <Check className="h-4 w-4 flex-shrink-0 text-green-400 mt-0.5" />
                        <span>{bullet}</span>
                    </li>
                ))}
            </ul>

            <div
                data-testid={`tier-selected-${tier.tier}`}
                className={`mt-4 -mx-6 -mb-6 flex items-center justify-center gap-1 rounded-b-[10px] py-3 text-sm font-medium ${
                    selected ? 'bg-purple-600 text-white' : 'bg-transparent text-transparent'
                }`}
            >
                <Check className="h-4 w-4" />
                Selected
            </div>
        </button>
    );
}

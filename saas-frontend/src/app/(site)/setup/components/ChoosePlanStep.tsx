'use client';

import { useState } from 'react';
import { UseFormReturn, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { useSubscriptionTiers } from '@/hooks/UseSubscriptionTiers';
import TierCard from '@/components/subscription/TierCard';
import { ArrowLeft, BookOpen, Check, Sparkles, Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OnboardingFormValues } from '../hooks/useOnboardingForm';

type Path = 'directory' | 'practitioner' | 'merchant' | null;

const ALL_PLAN_TIERS = ['awaken', 'illuminate', 'manifest', 'transcend'];

type PathOption = {
    id: Path & string;
    label: string;
    description: string;
    icon: typeof BookOpen;
    tiers: string[];
    /** Tiers to show but greyed out (not selectable) */
    grayscaleTiers?: string[];
    showPrice?: boolean;
    /** Tier to use for "from $..." pricing on the path card */
    fromPriceTier?: string;
    /** Inline feature labels shown on the card */
    features?: string[];
};

const PATH_OPTIONS: PathOption[] = [
    {
        id: 'directory',
        label: 'List me on the directory',
        description: 'Get found by seekers looking for spiritual guidance',
        icon: BookOpen,
        tiers: ['directory'],
        showPrice: true,
        features: ['Directory listing', 'SpiriAssist', 'Photo gallery'],
    },
    {
        id: 'practitioner',
        label: 'I\u2019m a practitioner',
        description: 'Offer services, accept bookings, and grow your practice',
        icon: Sparkles,
        tiers: ['awaken', 'illuminate', 'manifest'],
        grayscaleTiers: ['transcend'],
        fromPriceTier: 'awaken',
    },
    {
        id: 'merchant',
        label: 'I\u2019m a merchant',
        description: 'Selling products, hosting tours & events, running your store',
        icon: Store,
        tiers: ['illuminate', 'manifest', 'transcend'],
        grayscaleTiers: ['awaken'],
        fromPriceTier: 'illuminate',
    },
];

type Props = {
    form: UseFormReturn<OnboardingFormValues>;
    onSelect: (tier: string) => void;
};

export default function ChoosePlanStep({ form, onSelect }: Props) {
    const { data: tiers, isLoading } = useSubscriptionTiers();
    const selectedTier = useWatch({ control: form.control, name: 'subscription.tier' });
    const selectedInterval = useWatch({ control: form.control, name: 'subscription.billingInterval' }) || 'monthly';
    const [path, setPath] = useState<Path>(null);

    const handleTierChange = (tier: string) => {
        form.setValue('subscription.tier', tier, { shouldValidate: true });
    };

    const handleIntervalChange = (interval: 'monthly' | 'annual') => {
        form.setValue('subscription.billingInterval', interval, { shouldValidate: true });
    };

    const handlePathSelect = (selected: Path) => {
        if (!selected) return;
        const option = PATH_OPTIONS.find(o => o.id === selected);
        if (!option) return;

        // Directory has only one tier — auto-select and go straight to next step
        if (selected === 'directory') {
            form.setValue('subscription.tier', 'directory', { shouldValidate: true });
            onSelect('directory');
            return;
        } else {
            // Clear any previously selected tier that doesn't belong to the new path
            if (selectedTier && !option.tiers.includes(selectedTier)) {
                form.setValue('subscription.tier', '', { shouldValidate: true });
            }
        }
        setPath(selected);
    };

    const handleBackToPath = () => {
        setPath(null);
        form.setValue('subscription.tier', '', { shouldValidate: true });
    };

    const handleContinue = () => {
        if (selectedTier) {
            onSelect(selectedTier);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
            </div>
        );
    }

    if (!tiers || tiers.length === 0) return null;

    // ── Stage 1: Choose your path ──────────────────────────────────
    if (!path) {
        return (
            <div className="flex-1 flex flex-col space-y-5 md:space-y-8 px-4 py-5 md:p-8 min-h-0 overflow-y-auto" data-testid="choose-plan-step">
                <div className="text-center">
                    <h1 className="font-light text-2xl md:text-3xl text-white mb-2">How will you use SpiriVerse?</h1>
                    <p className="text-slate-300">
                        Pick what best describes you. You can always change your plan later.
                    </p>
                </div>

                <div className="grid gap-4 max-w-2xl mx-auto w-full">
                    {PATH_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        const directoryTier = option.showPrice ? tiers.find(t => t.tier === 'directory') : null;
                        const directoryPriceLabel = directoryTier ? `$${(directoryTier.monthlyPrice / 100).toFixed(0)}/month` : null;
                        const fromTier = option.fromPriceTier ? tiers.find(t => t.tier === option.fromPriceTier) : null;
                        const fromPriceLabel = fromTier ? `from $${(fromTier.monthlyPrice / 100).toFixed(0)}/month` : null;
                        const priceLabel = directoryPriceLabel || fromPriceLabel;
                        return (
                            <button
                                key={option.id}
                                type="button"
                                data-testid={`path-option-${option.id}`}
                                onClick={() => handlePathSelect(option.id)}
                                className={cn(
                                    'group flex items-center gap-3 md:gap-5 rounded-xl border-2 p-4 md:p-6 text-left transition-all cursor-pointer',
                                    'border-slate-700 bg-slate-800/50 hover:border-purple-500/60 hover:bg-purple-500/5',
                                )}
                            >
                                <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-xl bg-purple-600/20 text-purple-400 group-hover:bg-purple-600/30 transition-colors">
                                    <Icon className="w-5 h-5 md:w-6 md:h-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base md:text-lg font-semibold text-white">{option.label}</h3>
                                    <p className="text-xs md:text-sm text-slate-400 mt-0.5">{option.description}</p>
                                    {option.features && (
                                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                                            {option.features.map((feature) => (
                                                <span key={feature} className="flex items-center gap-1 text-xs text-slate-300">
                                                    <Check className="h-3 w-3 text-green-400 flex-shrink-0" />
                                                    {feature}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {priceLabel && (
                                    <div className="flex-shrink-0 text-right">
                                        <span className="text-sm md:text-lg font-bold text-white">{priceLabel}</span>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

            </div>
        );
    }

    // ── Stage 2: Choose your plan within the selected path ─────────

    const currentOption = PATH_OPTIONS.find(o => o.id === path)!;
    const visibleTiers = tiers
        .filter(t => ALL_PLAN_TIERS.includes(t.tier))
        .sort((a, b) => ALL_PLAN_TIERS.indexOf(a.tier) - ALL_PLAN_TIERS.indexOf(b.tier));
    const grayscaleTiers = currentOption.grayscaleTiers || [];

    return (
        <div className="flex-1 flex flex-col space-y-3 md:space-y-4 px-4 py-4 md:px-8 md:py-5 min-h-0 overflow-y-auto" data-testid="choose-plan-step">
            {/* Header row — title + interval toggle inline */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                    <h1 className="font-light text-2xl md:text-3xl text-white">Choose Your Plan</h1>
                    <p className="text-sm text-slate-300 mt-0.5">
                        {path === 'directory'
                            ? 'Get listed and let seekers find you.'
                            : 'Pick the plan that fits your goals.'
                        }
                    </p>
                </div>

                {/* Billing interval toggle */}
                <div className="flex items-center gap-2 flex-shrink-0" data-testid="plan-interval-toggle">
                    <button
                        type="button"
                        data-testid="plan-interval-monthly"
                        onClick={() => handleIntervalChange('monthly')}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                            selectedInterval === 'monthly'
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                    >
                        Monthly
                    </button>
                    <button
                        type="button"
                        data-testid="plan-interval-annual"
                        onClick={() => handleIntervalChange('annual')}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                            selectedInterval === 'annual'
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                    >
                        Annual
                        <span className="ml-1 text-xs text-green-400">(Save 20%)</span>
                    </button>
                </div>
            </div>

            {/* Tier cards */}
            <div
                data-testid="plan-cards-grid"
                className="grid gap-3 md:gap-4 mx-auto w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-4 max-w-6xl"
            >
                {visibleTiers.map((tier) => {
                    const isGrayscale = grayscaleTiers.includes(tier.tier);
                    return (
                        <div
                            key={tier.tier}
                            className={cn(
                                'transition-all',
                                isGrayscale && 'grayscale opacity-50 hover:grayscale-0 hover:opacity-100 cursor-pointer',
                            )}
                        >
                            <TierCard
                                tier={tier}
                                billingInterval={selectedInterval}
                                selected={selectedTier === tier.tier}
                                onSelect={handleTierChange}
                                disabled={isGrayscale}
                            />
                        </div>
                    );
                })}
            </div>

            {/* Footer — trial note + navigation inline */}
            <div className="flex items-center gap-3 max-w-6xl mx-auto w-full">
                <Button
                    type="button"
                    variant="outline"
                    data-testid="plan-back-btn"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    onClick={handleBackToPath}
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Change path
                </Button>
                <p className="flex-1 text-center text-xs text-slate-400">
                    Free trial starts today — no charge until it ends.
                </p>
                <Button
                    type="button"
                    data-testid="plan-continue-btn"
                    className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
                    disabled={!selectedTier}
                    onClick={handleContinue}
                >
                    Continue
                </Button>
            </div>
        </div>
    );
}

'use client';

import { useState } from 'react';
import { UseFormReturn, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { useSubscriptionTiers } from '@/hooks/UseSubscriptionTiers';
import TierCard from '@/components/subscription/TierCard';
import { ArrowLeft, BookOpen, Sparkles, Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OnboardingFormValues } from '../hooks/useOnboardingForm';

type Path = 'directory' | 'practitioner' | 'merchant' | null;

type PathOption = { id: Path & string; label: string; description: string; icon: typeof BookOpen; tiers: string[]; showPrice?: boolean };

const PATH_OPTIONS: PathOption[] = [
    {
        id: 'directory',
        label: 'List me on the directory',
        description: 'Get found by seekers looking for spiritual guidance',
        icon: BookOpen,
        tiers: ['directory'],
        showPrice: true,
    },
    {
        id: 'practitioner',
        label: 'I\u2019m a practitioner',
        description: 'Offer services, accept bookings, and grow your practice',
        icon: Sparkles,
        tiers: ['awaken', 'illuminate'],
    },
    {
        id: 'merchant',
        label: 'I\u2019m a merchant',
        description: 'Sell products, host practitioners, and run your store',
        icon: Store,
        tiers: ['manifest', 'transcend'],
    },
];

type Props = {
    form: UseFormReturn<OnboardingFormValues>;
    onSelect: (tier: string) => void;
    onBack: () => void;
};

export default function ChoosePlanStep({ form, onSelect, onBack }: Props) {
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
            <div className="flex-1 flex flex-col space-y-8 p-8 min-h-0 overflow-y-auto" data-testid="choose-plan-step">
                <div className="text-center">
                    <h1 className="font-light text-3xl text-white mb-3">How will you use SpiriVerse?</h1>
                    <p className="text-slate-300">
                        Pick what best describes you. You can always change your plan later.
                    </p>
                </div>

                <div className="grid gap-4 max-w-2xl mx-auto w-full">
                    {PATH_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        const directoryTier = option.showPrice ? tiers.find(t => t.tier === 'directory') : null;
                        const priceLabel = directoryTier ? `$${(directoryTier.monthlyPrice / 100).toFixed(0)}/month` : null;
                        return (
                            <button
                                key={option.id}
                                type="button"
                                data-testid={`path-option-${option.id}`}
                                onClick={() => handlePathSelect(option.id)}
                                className={cn(
                                    'group flex items-center gap-5 rounded-xl border-2 p-6 text-left transition-all cursor-pointer',
                                    'border-slate-700 bg-slate-800/50 hover:border-purple-500/60 hover:bg-purple-500/5',
                                )}
                            >
                                <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-purple-600/20 text-purple-400 group-hover:bg-purple-600/30 transition-colors">
                                    <Icon className="w-6 h-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-semibold text-white">{option.label}</h3>
                                    <p className="text-sm text-slate-400 mt-0.5">{option.description}</p>
                                </div>
                                {priceLabel && (
                                    <div className="flex-shrink-0 text-right">
                                        <span className="text-lg font-bold text-white">{priceLabel}</span>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Navigation */}
                <div className="flex gap-3 max-w-md mx-auto w-full">
                    <Button
                        type="button"
                        variant="outline"
                        data-testid="plan-back-btn"
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        onClick={onBack}
                    >
                        Back
                    </Button>
                </div>
            </div>
        );
    }

    // ── Stage 2: Choose your plan within the selected path ─────────

    const currentOption = PATH_OPTIONS.find(o => o.id === path)!;
    const filteredTiers = tiers.filter(t => currentOption.tiers.includes(t.tier));

    return (
        <div className="flex-1 flex flex-col space-y-8 p-8 min-h-0 overflow-y-auto" data-testid="choose-plan-step">
            <div className="text-center">
                <h1 className="font-light text-3xl text-white mb-3">Choose Your Plan</h1>
                <p className="text-slate-300">
                    {path === 'directory'
                        ? 'Get listed and let seekers find you. You won\u2019t be charged until after your first payout.'
                        : 'Pick the plan that fits your goals. You won\u2019t be charged until after your first payout.'
                    }
                </p>
            </div>

            {/* Billing interval toggle */}
            <div className="flex items-center justify-center gap-3" data-testid="plan-interval-toggle">
                <button
                    type="button"
                    data-testid="plan-interval-monthly"
                    onClick={() => handleIntervalChange('monthly')}
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
                    data-testid="plan-interval-annual"
                    onClick={() => handleIntervalChange('annual')}
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
                data-testid="plan-cards-grid"
                className={cn(
                    'grid gap-4 mx-auto w-full',
                    filteredTiers.length === 1 && 'max-w-md',
                    filteredTiers.length === 2 && 'grid-cols-1 md:grid-cols-2 max-w-3xl',
                )}
            >
                {filteredTiers.map((tier) => (
                    <TierCard
                        key={tier.tier}
                        tier={tier}
                        billingInterval={selectedInterval}
                        selected={selectedTier === tier.tier}
                        onSelect={handleTierChange}
                        badge={
                            tier.tier === 'directory' ? 'Get Listed'
                                : tier.tier === 'awaken' ? 'Starter'
                                    : tier.tier === 'illuminate' ? 'Growth'
                                        : tier.tier === 'manifest' ? 'Most Popular'
                                            : tier.tier === 'transcend' ? 'Everything'
                                                : undefined
                        }
                    />
                ))}
            </div>

            <p className="text-center text-sm text-slate-300">
                You won&apos;t be charged until your profile earns enough through payouts to cover the subscription cost.
            </p>

            {/* Navigation */}
            <div className="flex gap-3 max-w-md mx-auto w-full">
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
                <Button
                    type="button"
                    data-testid="plan-continue-btn"
                    className="flex-1 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
                    disabled={!selectedTier}
                    onClick={handleContinue}
                >
                    Continue
                </Button>
            </div>
        </div>
    );
}

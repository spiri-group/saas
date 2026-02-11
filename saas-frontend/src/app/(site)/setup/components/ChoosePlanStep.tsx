'use client';

import { UseFormReturn, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { useSubscriptionTiers } from '@/hooks/UseSubscriptionTiers';
import TierCard from '@/components/subscription/TierCard';
import type { OnboardingFormValues } from '../hooks/useOnboardingForm';

type Props = {
    form: UseFormReturn<OnboardingFormValues>;
    onSelect: (tier: string) => void;
    onBack: () => void;
};

export default function ChoosePlanStep({ form, onSelect, onBack }: Props) {
    const { data: tiers, isLoading } = useSubscriptionTiers();
    const selectedTier = useWatch({ control: form.control, name: 'subscription.tier' });
    const selectedInterval = useWatch({ control: form.control, name: 'subscription.billingInterval' }) || 'monthly';

    const handleTierChange = (tier: string) => {
        form.setValue('subscription.tier', tier, { shouldValidate: true });
    };

    const handleIntervalChange = (interval: 'monthly' | 'annual') => {
        form.setValue('subscription.billingInterval', interval, { shouldValidate: true });
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

    return (
        <div className="flex flex-col space-y-8 p-8" data-testid="choose-plan-step">
            <div className="text-center">
                <h1 className="font-light text-3xl text-white mb-3">Choose Your Plan</h1>
                <p className="text-slate-300">
                    Pick the plan that fits your goals. You won&apos;t be charged until after your first payout.
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
                className={`grid gap-4 ${
                    tiers.length === 1 ? 'max-w-md mx-auto' : tiers.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'
                }`}
            >
                {tiers.map((tier) => (
                    <TierCard
                        key={tier.tier}
                        tier={tier}
                        billingInterval={selectedInterval}
                        selected={selectedTier === tier.tier}
                        onSelect={handleTierChange}
                        badge={
                            tier.tier === 'awaken' ? 'Practitioner'
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
                    onClick={onBack}
                >
                    Back
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

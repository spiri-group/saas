'use client';

import { useState } from 'react';
import { ArrowUpCircle, Check, X } from 'lucide-react';
import { useUpgradeVendorSubscription } from '@/hooks/UseUpgradeVendorSubscription';
import { useSubscriptionTiers, SubscriptionTierDefinition } from '@/hooks/UseSubscriptionTiers';
import { useTierFeatures } from '@/hooks/UseTierFeatures';
import { toast } from 'sonner';

type UpgradeModalProps = {
    vendorId: string;
    onClose: () => void;
    onSuccess?: () => void;
};

const TIER_ORDER = ['awaken', 'illuminate', 'manifest', 'transcend'];

function formatPrice(cents: number): string {
    return `$${(cents / 100).toFixed(0)}`;
}

export default function UpgradeModal({ vendorId, onClose, onSuccess }: UpgradeModalProps) {
    const { tier: currentTier, subscription } = useTierFeatures(vendorId);
    const { data: tiers } = useSubscriptionTiers();
    const upgradeMutation = useUpgradeVendorSubscription(vendorId);
    const [selectedInterval, setSelectedInterval] = useState<'monthly' | 'annual'>(
        (subscription?.billingInterval as 'monthly' | 'annual') || 'monthly'
    );

    const currentTierIndex = TIER_ORDER.indexOf(currentTier || '');
    const upgradableTiers = tiers?.filter(t => TIER_ORDER.indexOf(t.tier) > currentTierIndex) || [];

    const handleUpgrade = async (targetTier: string) => {
        try {
            const result = await upgradeMutation.mutateAsync({
                targetTier,
                targetInterval: selectedInterval,
            });
            if (result.success) {
                toast.success(`Upgraded to ${result.newTier || targetTier}!`);
                onSuccess?.();
                onClose();
            } else {
                toast.error(result.message || 'Upgrade failed');
            }
        } catch {
            toast.error('Something went wrong. Please try again.');
        }
    };

    return (
        <div
            data-testid="upgrade-modal-overlay"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                data-testid="upgrade-modal"
                className="relative mx-4 max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-2xl"
            >
                <button
                    type="button"
                    data-testid="upgrade-modal-close"
                    onClick={onClose}
                    className="absolute right-4 top-4 text-slate-400 hover:text-white"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="mb-6 flex items-center gap-3">
                    <div className="rounded-full bg-purple-500/20 p-3">
                        <ArrowUpCircle className="h-8 w-8 text-purple-400" />
                    </div>
                    <div>
                        <h2 data-testid="upgrade-modal-title" className="text-xl font-bold text-white">
                            Upgrade Your Plan
                        </h2>
                        <p className="text-sm text-slate-400">
                            Unlock more features for your store
                        </p>
                    </div>
                </div>

                {/* Billing interval toggle */}
                <div className="mb-6 flex items-center justify-center gap-3" data-testid="upgrade-interval-toggle">
                    <button
                        type="button"
                        onClick={() => setSelectedInterval('monthly')}
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
                        onClick={() => setSelectedInterval('annual')}
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

                {/* Upgrade tier cards */}
                <div className={`grid gap-4 ${
                    upgradableTiers.length === 1 ? 'max-w-md mx-auto' :
                    upgradableTiers.length === 3 ? 'md:grid-cols-3' :
                    'md:grid-cols-2'
                }`}>
                    {upgradableTiers.map((tier) => (
                        <UpgradeTierOption
                            key={tier.tier}
                            tier={tier}
                            billingInterval={selectedInterval}
                            isPending={upgradeMutation.isPending}
                            onUpgrade={() => handleUpgrade(tier.tier)}
                        />
                    ))}
                </div>

                {upgradableTiers.length === 0 && (
                    <p data-testid="upgrade-modal-no-tiers" className="text-center text-slate-400 py-8">
                        You&apos;re already on the highest tier.
                    </p>
                )}
            </div>
        </div>
    );
}

function UpgradeTierOption({
    tier,
    billingInterval,
    isPending,
    onUpgrade,
}: {
    tier: SubscriptionTierDefinition;
    billingInterval: 'monthly' | 'annual';
    isPending: boolean;
    onUpgrade: () => void;
}) {
    const price = billingInterval === 'monthly' ? tier.monthlyPrice : tier.annualPrice;

    return (
        <div
            data-testid={`upgrade-tier-${tier.tier}`}
            className="flex flex-col rounded-xl border border-slate-700 bg-slate-800/50 p-6"
        >
            <h3 className="text-lg font-bold text-white">{tier.name}</h3>
            <p className="mt-1 text-sm text-slate-400">{tier.description}</p>

            <div className="mt-4 mb-4">
                <span className="text-3xl font-bold text-white">{formatPrice(price)}</span>
                <span className="text-sm text-slate-400">
                    /{billingInterval === 'monthly' ? 'month' : 'year'}
                </span>
            </div>

            <ul className="mb-6 flex-1 space-y-1.5">
                {Object.entries(tier.features).map(([key, value]) => {
                    const included = key === 'maxProducts' ? value !== 0 : !!value;
                    if (!included) return null;
                    return (
                        <li key={key} className="flex items-center gap-2 text-sm text-slate-200">
                            <Check className="h-4 w-4 flex-shrink-0 text-green-400" />
                            <span>{getFeatureLabel(key, value)}</span>
                        </li>
                    );
                })}
            </ul>

            <button
                type="button"
                data-testid={`upgrade-btn-${tier.tier}`}
                onClick={onUpgrade}
                disabled={isPending}
                className="w-full rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
                {isPending ? 'Upgrading...' : `Upgrade to ${tier.name}`}
            </button>
        </div>
    );
}

function getFeatureLabel(key: string, value: boolean | number | null): string {
    const labels: Record<string, string> = {
        canCreateMerchantProfile: 'Merchant storefront',
        maxProducts: value === null ? 'Unlimited products' : `Up to ${value} products`,
        canHostPractitioners: 'Host practitioners',
        hasInventoryAutomation: 'Inventory automation',
        hasShippingAutomation: 'Shipping automation',
        canCreateEvents: 'Ticketed events',
        canCreateTours: 'Guided tours',
        hasSpiriAssist: 'SpiriAssist investigations',
        hasBackorders: 'Backorder support',
        hasPaymentLinks: 'Payment links',
        hasLiveAssist: 'Live Assist sessions',
        hasExpoMode: 'Expo Mode',
    };
    return labels[key] || key;
}

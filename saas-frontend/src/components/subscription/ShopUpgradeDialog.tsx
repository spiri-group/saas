'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store, Sparkles, LoaderIcon } from 'lucide-react';
import { useSubscriptionTiers } from '@/hooks/UseSubscriptionTiers';
import { useUpgradeVendorSubscription } from '@/hooks/UseUpgradeVendorSubscription';
import { toast } from 'sonner';

type ShopUpgradeDialogProps = {
    vendorId: string;
    currentTier: string;
    onClose: () => void;
};

const TIER_OUTCOMES: Record<string, string[]> = {
    manifest: [
        'Your own online storefront',
        'Manage products & orders',
        'Integrated checkout',
    ],
    transcend: [
        'Unlimited products',
        'Host practitioners',
        'Automated shipping',
    ],
};

const SHOP_TIERS = ['manifest', 'transcend'] as const;

export default function ShopUpgradeDialog({ vendorId, currentTier, onClose }: ShopUpgradeDialogProps) {
    const router = useRouter();
    const [selectedTier, setSelectedTier] = useState<string>('manifest');
    const [interval, setInterval] = useState<'monthly' | 'annual'>('monthly');
    const { data: tiers, isLoading: tiersLoading } = useSubscriptionTiers('merchant');
    const upgradeMutation = useUpgradeVendorSubscription(vendorId);

    const availableTiers = tiers?.filter(t => SHOP_TIERS.includes(t.tier as typeof SHOP_TIERS[number])) || [];
    const selectedTierDef = availableTiers.find(t => t.tier === selectedTier);

    const formatPrice = (cents: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: selectedTierDef?.currency || 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(cents / 100);
    };

    const handleUpgrade = async () => {
        try {
            await upgradeMutation.mutateAsync({
                targetTier: selectedTier,
                targetInterval: interval,
            });
            const tierName = selectedTierDef?.name || selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1);
            toast.success(`Upgraded to ${tierName}! Setting up your shop...`);
            onClose();
            router.push(`/setup?tier=${selectedTier}&interval=${interval}`);
        } catch {
            toast.error('Failed to upgrade. Please try again.');
        }
    };

    return (
        <div data-testid="shop-upgrade-modal" className="p-2">
            <div className="mb-5 flex items-center gap-3">
                <div className="rounded-full bg-amber-500/20 p-3">
                    <Store className="h-8 w-8 text-amber-400" />
                </div>
                <div>
                    <h2 data-testid="shop-upgrade-title" className="text-xl font-bold">
                        Start Selling on SpiriVerse
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Choose the plan that fits your business
                    </p>
                </div>
            </div>

            {/* Billing interval toggle */}
            <div className="mb-4">
                <div
                    className="flex rounded-lg border p-1"
                    data-testid="shop-upgrade-interval-toggle"
                >
                    <button
                        type="button"
                        data-testid="shop-upgrade-monthly-btn"
                        onClick={() => setInterval('monthly')}
                        className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                            interval === 'monthly'
                                ? 'bg-amber-600 text-white'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        Monthly
                    </button>
                    <button
                        type="button"
                        data-testid="shop-upgrade-annual-btn"
                        onClick={() => setInterval('annual')}
                        className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                            interval === 'annual'
                                ? 'bg-amber-600 text-white'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        Annual
                    </button>
                </div>
            </div>

            {/* Tier cards */}
            {tiersLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                    <LoaderIcon className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading plans...</span>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3 mb-5" data-testid="shop-upgrade-tier-cards">
                    {availableTiers.map((tier) => {
                        const isSelected = tier.tier === selectedTier;
                        const tierPrice = interval === 'monthly' ? tier.monthlyPrice : tier.annualPrice;
                        return (
                            <button
                                key={tier.tier}
                                type="button"
                                data-testid={`shop-upgrade-tier-${tier.tier}`}
                                onClick={() => setSelectedTier(tier.tier)}
                                className={`relative rounded-xl border-2 p-4 text-left transition-colors ${
                                    isSelected
                                        ? 'border-amber-500 bg-amber-500/10'
                                        : 'border-white/10 hover:border-white/20'
                                }`}
                            >
                                <div className="space-y-2.5">
                                    <div className="flex items-baseline justify-between gap-2">
                                        <p className={`text-sm font-semibold ${
                                            isSelected ? 'text-amber-300' : 'text-white/90'
                                        }`}>
                                            {tier.name}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-lg font-bold">{formatPrice(tierPrice)}</span>
                                        <span className="text-muted-foreground text-xs">
                                            /{interval === 'monthly' ? 'mo' : 'yr'}
                                        </span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {(TIER_OUTCOMES[tier.tier] || []).map((outcome, i) => (
                                            <p key={i} className="text-xs leading-relaxed text-muted-foreground">
                                                <span className="inline-block mr-1 text-amber-400/70">&#x2022;</span>
                                                {outcome}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Currency note */}
            {!tiersLoading && selectedTierDef && (
                <p className="text-[11px] text-muted-foreground/60 text-center mb-4">
                    {selectedTierDef.currency}, taxes included
                </p>
            )}

            <div className="flex gap-3">
                <button
                    type="button"
                    data-testid="shop-upgrade-cancel-btn"
                    onClick={onClose}
                    className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                    Not Now
                </button>
                <button
                    type="button"
                    data-testid="shop-upgrade-confirm-btn"
                    onClick={handleUpgrade}
                    disabled={upgradeMutation.isPending || tiersLoading}
                    className="flex-1 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {upgradeMutation.isPending ? (
                        <span className="flex items-center justify-center gap-2">
                            <LoaderIcon className="h-4 w-4 animate-spin" />
                            Upgrading...
                        </span>
                    ) : (
                        'Upgrade & Open Shop'
                    )}
                </button>
            </div>
        </div>
    );
}

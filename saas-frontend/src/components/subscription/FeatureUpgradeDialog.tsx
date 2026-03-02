'use client';

import { useState } from 'react';
import { Sparkles, LoaderIcon } from 'lucide-react';
import { useSubscriptionTiers } from '@/hooks/UseSubscriptionTiers';
import { useUpgradeVendorSubscription } from '@/hooks/UseUpgradeVendorSubscription';
import { toast } from 'sonner';

type FeatureUpgradeDialogProps = {
    vendorId: string;
    featureName: string;
    benefits: string[];
    targetTier: string;
    targetTierName: string;
    onClose: () => void;
};

export default function FeatureUpgradeDialog({
    vendorId,
    featureName,
    benefits,
    targetTier,
    targetTierName,
    onClose,
}: FeatureUpgradeDialogProps) {
    const [interval, setInterval] = useState<'monthly' | 'annual'>('monthly');
    const { data: tiers, isLoading: tiersLoading } = useSubscriptionTiers('practitioner');
    const upgradeMutation = useUpgradeVendorSubscription(vendorId);

    const tierDef = tiers?.find(t => t.tier === targetTier);
    const price = tierDef
        ? interval === 'monthly'
            ? tierDef.monthlyPrice
            : tierDef.annualPrice
        : null;
    const currency = tierDef?.currency || 'USD';

    const formatPrice = (cents: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(cents / 100);
    };

    const handleUpgrade = async () => {
        try {
            await upgradeMutation.mutateAsync({
                targetTier,
                targetInterval: interval,
            });
            toast.success(`Upgraded to ${targetTierName}! ${featureName} is now available.`);
            onClose();
        } catch {
            toast.error('Failed to upgrade. Please try again.');
        }
    };

    return (
        <div data-testid="feature-upgrade-modal" className="p-2">
            <div className="mb-5 flex items-center gap-3">
                <div className="rounded-full bg-purple-500/20 p-3">
                    <Sparkles className="h-8 w-8 text-purple-400" />
                </div>
                <div>
                    <h2 data-testid="feature-upgrade-title" className="text-xl font-bold">
                        Unlock {featureName}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Upgrade to {targetTierName} to access this feature
                    </p>
                </div>
            </div>

            <div className="mb-6 space-y-2.5" data-testid="feature-upgrade-benefits">
                {benefits.map((benefit, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-sm">
                        <Sparkles className="h-3.5 w-3.5 text-purple-400 flex-shrink-0" />
                        <span className="text-muted-foreground">{benefit}</span>
                    </div>
                ))}
            </div>

            {/* Billing interval toggle */}
            <div className="mb-5">
                <div
                    className="flex rounded-lg border p-1"
                    data-testid="feature-upgrade-interval-toggle"
                >
                    <button
                        type="button"
                        data-testid="feature-upgrade-monthly-btn"
                        onClick={() => setInterval('monthly')}
                        className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                            interval === 'monthly'
                                ? 'bg-purple-600 text-white'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        Monthly
                    </button>
                    <button
                        type="button"
                        data-testid="feature-upgrade-annual-btn"
                        onClick={() => setInterval('annual')}
                        className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                            interval === 'annual'
                                ? 'bg-purple-600 text-white'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        Annual
                    </button>
                </div>

                {/* Price display */}
                <div className="mt-3 text-center" data-testid="feature-upgrade-price">
                    {tiersLoading ? (
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                            <LoaderIcon className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Loading pricing...</span>
                        </div>
                    ) : price != null ? (
                        <div>
                            <span className="text-2xl font-bold">{formatPrice(price)}</span>
                            <span className="text-muted-foreground text-sm">
                                /{interval === 'monthly' ? 'mo' : 'yr'}
                            </span>
                        </div>
                    ) : null}
                </div>
            </div>

            <div className="flex gap-3">
                <button
                    type="button"
                    data-testid="feature-upgrade-cancel-btn"
                    onClick={onClose}
                    className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                    Not Now
                </button>
                <button
                    type="button"
                    data-testid="feature-upgrade-confirm-btn"
                    onClick={handleUpgrade}
                    disabled={upgradeMutation.isPending || tiersLoading}
                    className="flex-1 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {upgradeMutation.isPending ? (
                        <span className="flex items-center justify-center gap-2">
                            <LoaderIcon className="h-4 w-4 animate-spin" />
                            Upgrading...
                        </span>
                    ) : (
                        `Upgrade to ${targetTierName}`
                    )}
                </button>
            </div>
        </div>
    );
}

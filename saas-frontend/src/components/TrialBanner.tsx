'use client';

import { CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTrialStatus } from '@/hooks/useTrialStatus';

type TrialBannerProps = {
    vendorId: string;
};

export default function TrialBanner({ vendorId }: TrialBannerProps) {
    const { bannerStage, daysRemaining, isLoading } = useTrialStatus(vendorId);

    if (isLoading || bannerStage === 'none') return null;

    const openCardDialog = () => {
        window.dispatchEvent(
            new CustomEvent('open-nav-external', {
                detail: { path: ['settings'], dialogId: 'add-card' },
            })
        );
    };

    if (bannerStage === 'subtle') {
        return (
            <div
                data-testid="trial-banner-subtle"
                className="w-full bg-indigo-600/80 border-b border-indigo-500/30 px-4 py-2.5 flex items-center justify-between gap-3"
            >
                <p className="text-sm text-indigo-100">
                    Add a payment method to keep your account active after your free trial
                </p>
                <Button
                    data-testid="trial-banner-add-card-btn"
                    size="sm"
                    variant="secondary"
                    className="shrink-0 bg-white/15 hover:bg-white/25 text-white border-0"
                    onClick={openCardDialog}
                >
                    <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                    Add Card
                </Button>
            </div>
        );
    }

    if (bannerStage === 'warning') {
        return (
            <div
                data-testid="trial-banner-warning"
                className="w-full bg-amber-600/90 border-b border-amber-500/40 px-4 py-3 flex items-center justify-between gap-3"
            >
                <p className="text-sm font-medium text-amber-50">
                    Your trial ends in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} &mdash; add a payment method to avoid interruption
                </p>
                <Button
                    data-testid="trial-banner-add-card-btn"
                    size="sm"
                    className="shrink-0 bg-white hover:bg-amber-50 text-amber-800 border-0"
                    onClick={openCardDialog}
                >
                    <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                    Add Card Now
                </Button>
            </div>
        );
    }

    // urgent
    return (
        <div
            data-testid="trial-banner-urgent"
            className="w-full bg-red-600 border-b border-red-500/50 px-4 py-3.5 flex items-center justify-between gap-3"
        >
            <p className="text-sm font-semibold text-white">
                {daysRemaining <= 0
                    ? 'Your trial has expired! Add a card to keep access'
                    : `Your trial expires ${daysRemaining === 1 ? 'tomorrow' : 'today'}! Add a card to keep access`}
            </p>
            <Button
                data-testid="trial-banner-add-card-btn"
                size="sm"
                className="shrink-0 bg-white hover:bg-red-50 text-red-700 border-0 font-semibold"
                onClick={openCardDialog}
            >
                <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                Add Card Immediately
            </Button>
        </div>
    );
}

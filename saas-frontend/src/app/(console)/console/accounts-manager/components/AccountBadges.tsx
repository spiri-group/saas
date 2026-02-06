'use client';

import { VendorLifecycleStage, VendorDocType } from '../types';
import { cn } from '@/lib/utils';

interface LifecycleStageBadgeProps {
    stage: VendorLifecycleStage;
    className?: string;
}

export const LifecycleStageBadge = ({ stage, className }: LifecycleStageBadgeProps) => {
    const stageConfig: Record<VendorLifecycleStage, { label: string; className: string }> = {
        CREATED: { label: 'Created', className: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
        STRIPE_ONBOARDING: { label: 'Stripe Onboarding', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
        FIRST_PAYOUT: { label: 'First Payout', className: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
        CARD_ADDED: { label: 'Card Added', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
        PUBLISHED: { label: 'Published', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
        BILLING_ACTIVE: { label: 'Billing Active', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
        BILLING_FAILED: { label: 'Billing Failed', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
        BILLING_BLOCKED: { label: 'Billing Blocked', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
    };

    const config = stageConfig[stage];

    return (
        <span
            data-testid={`lifecycle-badge-${stage.toLowerCase()}`}
            className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                config.className,
                className
            )}
        >
            {config.label}
        </span>
    );
};

interface DocTypeBadgeProps {
    docType: VendorDocType;
    className?: string;
}

export const DocTypeBadge = ({ docType, className }: DocTypeBadgeProps) => {
    const config = docType === 'MERCHANT'
        ? { label: 'Merchant', className: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' }
        : { label: 'Practitioner', className: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };

    return (
        <span
            data-testid={`doctype-badge-${docType.toLowerCase()}`}
            className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                config.className,
                className
            )}
        >
            {config.label}
        </span>
    );
};

interface BillingOverrideBadgeProps {
    waived?: boolean;
    waivedUntil?: string;
    discountPercent?: number;
    className?: string;
}

export const BillingOverrideBadge = ({ waived, discountPercent, className }: BillingOverrideBadgeProps) => {
    if (waived) {
        return (
            <span
                data-testid="billing-override-waived"
                className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-amber-500/20 text-amber-400 border-amber-500/30',
                    className
                )}
            >
                Waived
            </span>
        );
    }

    if (discountPercent && discountPercent > 0) {
        return (
            <span
                data-testid="billing-override-discount"
                className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-amber-500/20 text-amber-400 border-amber-500/30',
                    className
                )}
            >
                {discountPercent}% off
            </span>
        );
    }

    return null;
};

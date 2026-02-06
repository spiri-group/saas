'use client';

import { LifecycleFunnelEntry, VendorLifecycleStage } from '../types';

const STAGE_COLORS: Record<VendorLifecycleStage, { bg: string; text: string }> = {
    CREATED: { bg: 'bg-slate-500', text: 'text-slate-400' },
    STRIPE_ONBOARDING: { bg: 'bg-blue-500', text: 'text-blue-400' },
    FIRST_PAYOUT: { bg: 'bg-cyan-500', text: 'text-cyan-400' },
    CARD_ADDED: { bg: 'bg-teal-500', text: 'text-teal-400' },
    PUBLISHED: { bg: 'bg-green-500', text: 'text-green-400' },
    BILLING_ACTIVE: { bg: 'bg-emerald-500', text: 'text-emerald-400' },
    BILLING_FAILED: { bg: 'bg-orange-500', text: 'text-orange-400' },
    BILLING_BLOCKED: { bg: 'bg-red-500', text: 'text-red-400' },
};

const STAGE_LABELS: Record<VendorLifecycleStage, string> = {
    CREATED: 'Created',
    STRIPE_ONBOARDING: 'Stripe Onboarding',
    FIRST_PAYOUT: 'First Payout',
    CARD_ADDED: 'Card Added',
    PUBLISHED: 'Published',
    BILLING_ACTIVE: 'Billing Active',
    BILLING_FAILED: 'Billing Failed',
    BILLING_BLOCKED: 'Billing Blocked',
};

interface OnboardingFunnelProps {
    entries: LifecycleFunnelEntry[];
}

export default function OnboardingFunnel({ entries }: OnboardingFunnelProps) {
    const total = entries.reduce((sum, e) => sum + e.count, 0);
    if (total === 0) return null;

    return (
        <div className="space-y-3" data-testid="onboarding-funnel">
            {/* Funnel bar */}
            <div className="flex h-8 rounded-lg overflow-hidden bg-slate-800">
                {entries.map((entry) => {
                    if (entry.count === 0) return null;
                    const pct = (entry.count / total) * 100;
                    const colors = STAGE_COLORS[entry.stage as VendorLifecycleStage];
                    return (
                        <div
                            key={entry.stage}
                            className={`${colors?.bg || 'bg-slate-600'} flex items-center justify-center text-xs font-medium text-white transition-all`}
                            style={{ width: `${pct}%`, minWidth: pct > 3 ? undefined : '12px' }}
                            title={`${STAGE_LABELS[entry.stage as VendorLifecycleStage] || entry.stage}: ${entry.count} (${pct.toFixed(1)}%)`}
                            data-testid={`funnel-segment-${entry.stage}`}
                        >
                            {pct >= 8 && entry.count}
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1">
                {entries.map((entry) => {
                    const colors = STAGE_COLORS[entry.stage as VendorLifecycleStage];
                    const pct = total > 0 ? ((entry.count / total) * 100).toFixed(1) : '0';
                    return (
                        <div key={entry.stage} className="flex items-center space-x-1.5 text-xs">
                            <div className={`h-2.5 w-2.5 rounded-sm ${colors?.bg || 'bg-slate-600'}`} />
                            <span className={colors?.text || 'text-slate-400'}>
                                {STAGE_LABELS[entry.stage as VendorLifecycleStage] || entry.stage}
                            </span>
                            <span className="text-slate-500">
                                {entry.count} ({pct}%)
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

'use client';

import { useState } from 'react';
import { useTierFeatures } from '@/hooks/UseTierFeatures';
import { useCancelVendorDowngrade } from '@/hooks/UseDowngradeVendorSubscription';
import { useRetryVendorPayment } from '@/hooks/UseRetryVendorPayment';
import UpgradeModal from './UpgradeModal';
import DowngradeModal from './DowngradeModal';
import { toast } from 'sonner';
import {
    ArrowUpCircle,
    ArrowDownCircle,
    CreditCard,
    AlertTriangle,
    Check,
    Clock,
    XCircle,
    RefreshCw,
    ChevronRight,
} from 'lucide-react';

type SubscriptionManagementProps = {
    vendorId: string;
    profileType: 'merchant' | 'practitioner';
};

const TIER_DISPLAY: Record<string, string> = {
    awaken: 'Awaken',
    manifest: 'Manifest',
    transcend: 'Transcend',
};

const STATUS_CONFIG: Record<string, { icon: typeof Check; color: string; label: string }> = {
    active: { icon: Check, color: 'text-green-400', label: 'Active' },
    pendingFirstBilling: { icon: Clock, color: 'text-amber-400', label: 'Pending First Billing' },
    suspended: { icon: XCircle, color: 'text-red-400', label: 'Suspended' },
    cancelled: { icon: XCircle, color: 'text-slate-400', label: 'Cancelled' },
};

function formatPrice(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(dateStr?: string): string {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

export default function SubscriptionManagement({ vendorId, profileType }: SubscriptionManagementProps) {
    const { subscription, tier, billingStatus, isSuspended, isLoading } = useTierFeatures(vendorId);
    const cancelDowngrade = useCancelVendorDowngrade(vendorId);
    const retryPayment = useRetryVendorPayment(vendorId);
    const [showUpgrade, setShowUpgrade] = useState(false);
    const [showDowngrade, setShowDowngrade] = useState(false);

    if (isLoading) {
        return (
            <div data-testid="subscription-management-loading" className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
            </div>
        );
    }

    if (!subscription) {
        return (
            <div data-testid="subscription-management-empty" className="text-center text-slate-400 py-12">
                No subscription found for this profile.
            </div>
        );
    }

    const statusConfig = STATUS_CONFIG[billingStatus || 'pendingFirstBilling'] || STATUS_CONFIG.pendingFirstBilling;
    const StatusIcon = statusConfig.icon;
    const isPendingFirstBilling = billingStatus === 'pendingFirstBilling';
    const payoutProgress = isPendingFirstBilling && subscription.subscriptionCostThreshold > 0
        ? Math.min(100, (subscription.cumulativePayouts / subscription.subscriptionCostThreshold) * 100)
        : null;

    const canUpgrade = profileType === 'merchant' && tier !== 'transcend';
    const canDowngrade = profileType === 'merchant' && tier === 'transcend';

    const handleCancelDowngrade = async () => {
        try {
            const result = await cancelDowngrade.mutateAsync();
            if (result.success) {
                toast.success('Pending downgrade cancelled');
            } else {
                toast.error(result.message || 'Failed to cancel downgrade');
            }
        } catch {
            toast.error('Something went wrong');
        }
    };

    const handleRetryPayment = async () => {
        try {
            const result = await retryPayment.mutateAsync();
            if (result.success) {
                if (result.paymentSucceeded) {
                    toast.success('Payment successful!');
                } else {
                    toast.error('Payment failed. Please update your payment method.');
                }
            } else {
                toast.error(result.message || 'Retry failed');
            }
        } catch {
            toast.error('Something went wrong');
        }
    };

    return (
        <div data-testid="subscription-management" className="space-y-6">
            {/* Suspended banner */}
            {isSuspended && (
                <div data-testid="subscription-suspended-banner" className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-400" />
                        <div>
                            <p className="font-medium text-red-300">Account Suspended</p>
                            <p className="text-sm text-red-300/70">
                                Your subscription payment has failed multiple times. Payouts are paused until payment is resolved.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        data-testid="retry-payment-banner-btn"
                        onClick={handleRetryPayment}
                        disabled={retryPayment.isPending}
                        className="mt-3 flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${retryPayment.isPending ? 'animate-spin' : ''}`} />
                        {retryPayment.isPending ? 'Retrying...' : 'Retry Payment'}
                    </button>
                </div>
            )}

            {/* Pending downgrade banner */}
            {subscription.pendingDowngradeTo && (
                <div data-testid="subscription-downgrade-banner" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <ArrowDownCircle className="h-5 w-5 text-amber-400" />
                            <p className="text-sm text-amber-300">
                                Downgrading to {TIER_DISPLAY[subscription.pendingDowngradeTo]} on{' '}
                                {formatDate(subscription.downgradeEffectiveAt)}
                            </p>
                        </div>
                        <button
                            type="button"
                            data-testid="cancel-downgrade-btn"
                            onClick={handleCancelDowngrade}
                            disabled={cancelDowngrade.isPending}
                            className="text-sm font-medium text-amber-300 hover:text-amber-200 disabled:opacity-50"
                        >
                            {cancelDowngrade.isPending ? 'Cancelling...' : 'Cancel Downgrade'}
                        </button>
                    </div>
                </div>
            )}

            {/* Current plan card */}
            <div data-testid="subscription-current-plan" className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-white">
                            {TIER_DISPLAY[tier || ''] || tier} Plan
                        </h3>
                        <div className="mt-1 flex items-center gap-2">
                            <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
                            <span className={`text-sm ${statusConfig.color}`}>{statusConfig.label}</span>
                            <span className="text-sm text-slate-500">
                                {subscription.billingInterval === 'annual' ? 'Annual billing' : 'Monthly billing'}
                            </span>
                        </div>
                        {subscription.waived && (
                            <p className="mt-1 text-xs text-green-400">
                                Subscription waived{subscription.waivedUntil ? ` until ${formatDate(subscription.waivedUntil)}` : ''}
                            </p>
                        )}
                        {(subscription.discountPercent ?? 0) > 0 && (
                            <p className="mt-1 text-xs text-green-400">
                                {subscription.discountPercent}% discount applied
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {canUpgrade && (
                            <button
                                type="button"
                                data-testid="upgrade-plan-btn"
                                onClick={() => setShowUpgrade(true)}
                                className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
                            >
                                <ArrowUpCircle className="h-4 w-4" />
                                Upgrade
                            </button>
                        )}
                        {canDowngrade && !subscription.pendingDowngradeTo && (
                            <button
                                type="button"
                                data-testid="downgrade-plan-btn"
                                onClick={() => setShowDowngrade(true)}
                                className="flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700"
                            >
                                <ArrowDownCircle className="h-4 w-4" />
                                Downgrade
                            </button>
                        )}
                    </div>
                </div>

                {/* Payout progress for pending first billing */}
                {payoutProgress !== null && (
                    <div data-testid="subscription-payout-progress" className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-slate-400">Payouts toward first billing</span>
                            <span className="text-sm text-slate-300">
                                {formatPrice(subscription.cumulativePayouts)} / {formatPrice(subscription.subscriptionCostThreshold)}
                            </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-purple-500 transition-all"
                                style={{ width: `${payoutProgress}%` }}
                            />
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                            Your first subscription charge happens once your payouts reach this threshold.
                        </p>
                    </div>
                )}

                {/* Next billing info */}
                {billingStatus === 'active' && subscription.subscriptionExpiresAt && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
                        <Clock className="h-4 w-4" />
                        <span>Next billing: {formatDate(subscription.subscriptionExpiresAt)}</span>
                    </div>
                )}

                {/* Failed payment info */}
                {subscription.failedPaymentAttempts > 0 && !isSuspended && (
                    <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-400" />
                                <span className="text-sm text-amber-300">
                                    Payment failed ({subscription.failedPaymentAttempts}/3 attempts)
                                </span>
                            </div>
                            <button
                                type="button"
                                data-testid="retry-payment-btn"
                                onClick={handleRetryPayment}
                                disabled={retryPayment.isPending}
                                className="text-sm font-medium text-amber-300 hover:text-amber-200 disabled:opacity-50"
                            >
                                {retryPayment.isPending ? 'Retrying...' : 'Retry Now'}
                            </button>
                        </div>
                        {subscription.nextRetryAt && (
                            <p className="mt-1 text-xs text-slate-500">
                                Next automatic retry: {formatDate(subscription.nextRetryAt)}
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Payment method */}
            <div data-testid="subscription-payment-method" className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-slate-400" />
                        <div>
                            <h4 className="font-medium text-white">Payment Method</h4>
                            <p className="text-sm text-slate-400">
                                {subscription.cardStatus === 'saved'
                                    ? 'Card on file'
                                    : 'No payment method saved'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        data-testid="manage-payment-method-btn"
                        onClick={() => {
                            const event = new CustomEvent("open-nav-external", {
                                detail: {
                                    path: ["Payment Cards"],
                                    action: { type: "dialog", dialog: "Payment Cards" }
                                }
                            });
                            window.dispatchEvent(event);
                        }}
                        className="flex items-center gap-1 text-sm font-medium text-purple-400 hover:text-purple-300"
                    >
                        Manage
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Billing history */}
            {subscription.billingHistory && subscription.billingHistory.length > 0 && (
                <div data-testid="subscription-billing-history" className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
                    <h4 className="mb-4 font-medium text-white">Billing History</h4>
                    <div className="space-y-3">
                        {subscription.billingHistory.map((entry) => (
                            <div
                                key={entry.id}
                                data-testid={`billing-entry-${entry.id}`}
                                className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-800/30 px-4 py-3"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`h-2 w-2 rounded-full ${
                                        entry.billingStatus === 'paid' ? 'bg-green-400' :
                                        entry.billingStatus === 'failed' ? 'bg-red-400' :
                                        'bg-amber-400'
                                    }`} />
                                    <div>
                                        <p className="text-sm text-white">
                                            {formatDate(entry.date)}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {formatDate(entry.period_start)} - {formatDate(entry.period_end)}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-white">
                                        {formatPrice(entry.amount)} {entry.currency}
                                    </p>
                                    <p className={`text-xs ${
                                        entry.billingStatus === 'paid' ? 'text-green-400' :
                                        entry.billingStatus === 'failed' ? 'text-red-400' :
                                        'text-amber-400'
                                    }`}>
                                        {entry.billingStatus}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modals */}
            {showUpgrade && (
                <UpgradeModal
                    vendorId={vendorId}
                    onClose={() => setShowUpgrade(false)}
                />
            )}
            {showDowngrade && (
                <DowngradeModal
                    vendorId={vendorId}
                    targetTier="manifest"
                    onClose={() => setShowDowngrade(false)}
                />
            )}
        </div>
    );
}

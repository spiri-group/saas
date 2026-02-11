'use client';

import { useState, useEffect } from 'react';
import { ConsoleVendorAccount } from '../types';
import { LifecycleStageBadge, DocTypeBadge, BillingOverrideBadge } from './AccountBadges';
import useUpdateSubscriptionOverride from '../hooks/UseUpdateSubscriptionOverride';
import { useUnblockPayouts, useForcePublish, useResetBillingRetry } from '../hooks/UseVendorQuickActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { X, Building2, CreditCard, Calendar, Loader2, DollarSign, ExternalLink, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface VendorDetailPanelProps {
    vendor: ConsoleVendorAccount;
    onClose: () => void;
}

export default function VendorDetailPanel({ vendor, onClose }: VendorDetailPanelProps) {
    const sub = vendor.subscription;
    const updateOverride = useUpdateSubscriptionOverride();
    const unblockPayouts = useUnblockPayouts();
    const forcePublish = useForcePublish();
    const resetBillingRetry = useResetBillingRetry();

    const [waived, setWaived] = useState(sub?.waived || false);
    const [waivedUntil, setWaivedUntil] = useState(sub?.waivedUntil || '');
    const [discountPercent, setDiscountPercent] = useState(sub?.discountPercent || 0);
    const [overrideNotes, setOverrideNotes] = useState(sub?.overrideNotes || '');

    // Reset form when vendor changes
    useEffect(() => {
        setWaived(vendor.subscription?.waived || false);
        setWaivedUntil(vendor.subscription?.waivedUntil || '');
        setDiscountPercent(vendor.subscription?.discountPercent || 0);
        setOverrideNotes(vendor.subscription?.overrideNotes || '');
    }, [vendor.id, vendor.subscription?.waived, vendor.subscription?.waivedUntil, vendor.subscription?.discountPercent, vendor.subscription?.overrideNotes]);

    const handleSaveOverride = async () => {
        await updateOverride.mutateAsync({
            vendorId: vendor.id,
            input: {
                waived,
                waivedUntil: waivedUntil || null,
                discountPercent: discountPercent || null,
                overrideNotes: overrideNotes || null,
            }
        });
    };

    const hasOverrideChanges =
        waived !== (sub?.waived || false) ||
        waivedUntil !== (sub?.waivedUntil || '') ||
        discountPercent !== (sub?.discountPercent || 0) ||
        overrideNotes !== (sub?.overrideNotes || '');

    const billingHistory = sub?.billing_history?.slice(-5).reverse() || [];

    const stripeAccountId = vendor.stripe?.accountId;
    const stripeCustomerId = vendor.stripe?.customerId;
    const showUnblockPayouts = sub?.payouts_blocked === true;
    const showForcePublish = !vendor.publishedAt;
    const showResetBilling = sub?.payment_status === 'failed';

    return (
        <div className="h-full flex flex-col bg-slate-900 border-l border-slate-800" data-testid="vendor-detail-panel">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
                <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-sm font-medium text-white">{vendor.name}</h2>
                        <p className="text-xs text-slate-400">{vendor.slug}</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white" data-testid="close-vendor-detail">
                    <X className="h-4 w-4" />
                </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Overview */}
                <div className="space-y-3">
                    <h3 className="text-sm font-medium text-white">Overview</h3>
                    <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                        {vendor.docType && <DocTypeBadge docType={vendor.docType} />}
                        <LifecycleStageBadge stage={vendor.lifecycleStage} />
                        <BillingOverrideBadge
                            waived={sub?.waived}
                            waivedUntil={sub?.waivedUntil}
                            discountPercent={sub?.discountPercent}
                        />
                    </div>
                    <div className="bg-slate-800 p-3 rounded-lg space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">ID:</span>
                            <span className="text-white font-mono text-xs">{vendor.id}</span>
                        </div>
                        {vendor.createdDate && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">Created:</span>
                                <span className="text-white">
                                    {formatDistanceToNow(new Date(vendor.createdDate), { addSuffix: true })}
                                </span>
                            </div>
                        )}
                        {vendor.publishedAt && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">Published:</span>
                                <span className="text-white">
                                    {formatDistanceToNow(new Date(vendor.publishedAt), { addSuffix: true })}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Stripe Links */}
                {(stripeAccountId || stripeCustomerId) && (
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-white flex items-center">
                            <ExternalLink className="h-4 w-4 mr-2 text-slate-400" />
                            Stripe Dashboard
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {stripeAccountId && (
                                <a
                                    href={`https://dashboard.stripe.com/connect/accounts/${stripeAccountId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    data-testid="stripe-account-link"
                                >
                                    <Button variant="outline" size="sm" className="border-slate-700 hover:bg-slate-800 text-xs">
                                        <ExternalLink className="h-3 w-3 mr-1.5" />
                                        Connected Account
                                    </Button>
                                </a>
                            )}
                            {stripeCustomerId && (
                                <a
                                    href={`https://dashboard.stripe.com/customers/${stripeCustomerId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    data-testid="stripe-customer-link"
                                >
                                    <Button variant="outline" size="sm" className="border-slate-700 hover:bg-slate-800 text-xs">
                                        <ExternalLink className="h-3 w-3 mr-1.5" />
                                        Customer
                                    </Button>
                                </a>
                            )}
                        </div>
                    </div>
                )}

                {/* Billing */}
                <div className="space-y-3">
                    <h3 className="text-sm font-medium text-white flex items-center">
                        <CreditCard className="h-4 w-4 mr-2 text-slate-400" />
                        Billing
                    </h3>
                    <div className="bg-slate-800 p-3 rounded-lg space-y-2">
                        {sub?.plans && sub.plans.length > 0 && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">Plan:</span>
                                <span className="text-white">{sub.plans.map(p => p.name).join(', ')}</span>
                            </div>
                        )}
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">Payment Status:</span>
                            <span className={`text-sm font-medium ${
                                sub?.payment_status === 'success' ? 'text-green-400' :
                                sub?.payment_status === 'failed' ? 'text-red-400' :
                                'text-slate-400'
                            }`}>
                                {sub?.payment_status || 'N/A'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">Card Status:</span>
                            <span className="text-white">{sub?.card_status || 'N/A'}</span>
                        </div>
                        {sub?.next_billing_date && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">Next Billing:</span>
                                <span className="text-white">{sub.next_billing_date}</span>
                            </div>
                        )}
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">Interval:</span>
                            <span className="text-white">{sub?.billing_interval || 'monthly'}</span>
                        </div>
                        {sub?.payouts_blocked && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">Payouts:</span>
                                <span className="text-red-400 font-medium">Blocked</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Billing History */}
                {billingHistory.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-white flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-slate-400" />
                            Recent Billing History
                        </h3>
                        <div className="space-y-2">
                            {billingHistory.map((record) => (
                                <div key={record.id} className="bg-slate-800 p-3 rounded-lg flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-slate-400">{record.period_start} - {record.period_end}</p>
                                        <p className={`text-sm font-medium ${record.billingStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                            {record.billingStatus === 'success' ? 'Paid' : 'Failed'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-white font-medium">
                                            {(record.amount / 100).toFixed(2)} {record.currency.toUpperCase()}
                                        </p>
                                        {record.error && (
                                            <p className="text-xs text-red-400 max-w-[200px] truncate">{record.error}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Quick Actions */}
                {(showUnblockPayouts || showForcePublish || showResetBilling) && (
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-white flex items-center">
                            <Zap className="h-4 w-4 mr-2 text-amber-400" />
                            Quick Actions
                        </h3>
                        <div className="space-y-2">
                            {showUnblockPayouts && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
                                    onClick={() => unblockPayouts.mutate(vendor.id)}
                                    disabled={unblockPayouts.isPending}
                                    data-testid="unblock-payouts-btn"
                                >
                                    {unblockPayouts.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Unblocking...
                                        </>
                                    ) : (
                                        'Unblock Payouts'
                                    )}
                                </Button>
                            )}
                            {showForcePublish && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full border-green-500/30 text-green-400 hover:bg-green-500/10"
                                    onClick={() => forcePublish.mutate(vendor.id)}
                                    disabled={forcePublish.isPending}
                                    data-testid="force-publish-btn"
                                >
                                    {forcePublish.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Publishing...
                                        </>
                                    ) : (
                                        'Force Publish'
                                    )}
                                </Button>
                            )}
                            {showResetBilling && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                                    onClick={() => resetBillingRetry.mutate(vendor.id)}
                                    disabled={resetBillingRetry.isPending}
                                    data-testid="reset-billing-btn"
                                >
                                    {resetBillingRetry.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Resetting...
                                        </>
                                    ) : (
                                        'Reset Billing Retry'
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {/* Subscription Override */}
                <div className="space-y-3">
                    <h3 className="text-sm font-medium text-white flex items-center">
                        <DollarSign className="h-4 w-4 mr-2 text-amber-400" />
                        Subscription Override
                    </h3>
                    <div className="bg-slate-800 p-4 rounded-lg space-y-4">
                        {/* Waived Toggle */}
                        <div className="flex items-center justify-between">
                            <Label htmlFor="waived-toggle" className="text-sm text-slate-300">
                                Waive Billing
                            </Label>
                            <Switch
                                id="waived-toggle"
                                data-testid="waived-toggle"
                                checked={waived}
                                onCheckedChange={setWaived}
                            />
                        </div>

                        {/* Waived Until */}
                        {waived && (
                            <div className="space-y-1.5">
                                <Label htmlFor="waived-until" className="text-xs text-slate-400">
                                    Waived Until (leave empty for indefinite)
                                </Label>
                                <Input
                                    id="waived-until"
                                    data-testid="waived-until-input"
                                    type="date"
                                    value={waivedUntil}
                                    onChange={(e) => setWaivedUntil(e.target.value)}
                                    className="bg-slate-700 border-slate-600"
                                />
                            </div>
                        )}

                        {/* Discount Percent */}
                        {!waived && (
                            <div className="space-y-1.5">
                                <Label htmlFor="discount-percent" className="text-xs text-slate-400">
                                    Discount (%)
                                </Label>
                                <Input
                                    id="discount-percent"
                                    data-testid="discount-percent-input"
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={discountPercent}
                                    onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                                    className="bg-slate-700 border-slate-600"
                                />
                            </div>
                        )}

                        {/* Notes */}
                        <div className="space-y-1.5">
                            <Label htmlFor="override-notes" className="text-xs text-slate-400">
                                Admin Notes
                            </Label>
                            <Textarea
                                id="override-notes"
                                data-testid="override-notes-input"
                                value={overrideNotes}
                                onChange={(e) => setOverrideNotes(e.target.value)}
                                placeholder="Reason for override..."
                                className="bg-slate-700 border-slate-600 min-h-[80px]"
                            />
                        </div>

                        {/* Save Button */}
                        <Button
                            data-testid="save-override-btn"
                            onClick={handleSaveOverride}
                            disabled={updateOverride.isPending || !hasOverrideChanges}
                            className="w-full"
                        >
                            {updateOverride.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Override'
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

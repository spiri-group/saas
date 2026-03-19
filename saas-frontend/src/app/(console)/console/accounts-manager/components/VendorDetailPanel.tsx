'use client';

import { useState, useEffect } from 'react';
import { ConsoleVendorAccount } from '../types';
import { LifecycleStageBadge, DocTypeBadge, BillingOverrideBadge } from './AccountBadges';
import useUpdateSubscriptionOverride from '../hooks/UseUpdateSubscriptionOverride';
import { useUnblockPayouts, useResetBillingRetry, usePurgeVendorAccount, useBlockVendorAccount, useUnblockVendorAccount } from '../hooks/UseVendorQuickActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { X, Building2, CreditCard, Calendar, Loader2, DollarSign, ExternalLink, Zap, Eye, ShieldBan, ShieldCheck, Trash2, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import AccountNotes from './AccountNotes';

interface VendorDetailPanelProps {
    vendor: ConsoleVendorAccount;
    onClose: () => void;
}

export default function VendorDetailPanel({ vendor, onClose }: VendorDetailPanelProps) {
    const sub = vendor.subscription;
    const updateOverride = useUpdateSubscriptionOverride();
    const unblockPayouts = useUnblockPayouts();
    const resetBillingRetry = useResetBillingRetry();
    const purgeVendor = usePurgeVendorAccount();
    const blockVendor = useBlockVendorAccount();
    const unblockVendor = useUnblockVendorAccount();

    const [isImpersonating, setIsImpersonating] = useState(false);
    const [showPurgeDialog, setShowPurgeDialog] = useState(false);
    const [purgeConfirmName, setPurgeConfirmName] = useState('');
    const [showBlockDialog, setShowBlockDialog] = useState(false);
    const [blockReason, setBlockReason] = useState('');

    const handleViewAs = async () => {
        if (!vendor.ownerEmail) return;
        setIsImpersonating(true);
        try {
            const res = await fetch('/api/console/impersonate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: vendor.ownerEmail }),
            });
            if (res.ok) {
                window.open('/', '_blank');
            }
        } finally {
            setIsImpersonating(false);
        }
    };

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

    const handlePurge = async () => {
        try {
            const result = await purgeVendor.mutateAsync({
                vendorId: vendor.id,
                confirmName: purgeConfirmName,
            });
            if (result.success) {
                toast.success(result.message);
                setShowPurgeDialog(false);
                setPurgeConfirmName('');
                onClose();
            } else {
                toast.error(result.message);
            }
        } catch {
            toast.error('Failed to purge vendor account');
        }
    };

    const handleBlock = async () => {
        try {
            const result = await blockVendor.mutateAsync({
                vendorId: vendor.id,
                reason: blockReason || undefined,
            });
            if (result.success) {
                toast.success(result.message);
                setShowBlockDialog(false);
                setBlockReason('');
            } else {
                toast.error(result.message);
            }
        } catch {
            toast.error('Failed to block vendor account');
        }
    };

    const handleUnblock = async () => {
        try {
            const result = await unblockVendor.mutateAsync(vendor.id);
            if (result.success) {
                toast.success(result.message);
            } else {
                toast.error(result.message);
            }
        } catch {
            toast.error('Failed to unblock vendor account');
        }
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
                {/* Account Blocked Banner */}
                {vendor.accountBlocked && (
                    <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3 space-y-2" data-testid="account-blocked-banner">
                        <div className="flex items-center space-x-2">
                            <ShieldBan className="h-4 w-4 text-red-400" />
                            <span className="text-sm font-medium text-red-400">Account Blocked</span>
                        </div>
                        {vendor.accountBlockedAt && (
                            <p className="text-xs text-red-400/70">
                                Blocked {formatDistanceToNow(new Date(vendor.accountBlockedAt), { addSuffix: true })}
                            </p>
                        )}
                        {vendor.accountBlockedReason && (
                            <p className="text-xs text-red-400/70">
                                Reason: {vendor.accountBlockedReason}
                            </p>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-green-500/30 text-green-400 hover:bg-green-500/10"
                            onClick={handleUnblock}
                            disabled={unblockVendor.isPending}
                            data-testid="unblock-vendor-btn"
                        >
                            {unblockVendor.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Unblocking...
                                </>
                            ) : (
                                <>
                                    <ShieldCheck className="mr-2 h-4 w-4" />
                                    Unblock Account
                                </>
                            )}
                        </Button>
                    </div>
                )}

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

                {/* Quick Notes */}
                <AccountNotes
                    accountId={vendor.id}
                    accountType="vendor"
                    notes={vendor.adminNotes || []}
                />

                {/* View As */}
                {vendor.ownerEmail && (
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-white flex items-center">
                            <Eye className="h-4 w-4 mr-2 text-indigo-400" />
                            Impersonate
                        </h3>
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
                            onClick={handleViewAs}
                            disabled={isImpersonating}
                            data-testid="view-as-vendor-btn"
                        >
                            {isImpersonating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Opening...
                                </>
                            ) : (
                                <>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View As {vendor.ownerEmail}
                                </>
                            )}
                        </Button>
                    </div>
                )}

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
                {(showUnblockPayouts || showResetBilling) && (
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

                {/* Danger Zone */}
                <div className="space-y-3">
                    <h3 className="text-sm font-medium text-red-400 flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Danger Zone
                    </h3>
                    <div className="border border-red-500/20 rounded-lg p-4 space-y-3">
                        {/* Block / Unblock Account */}
                        {!vendor.accountBlocked && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                                onClick={() => setShowBlockDialog(true)}
                                data-testid="block-vendor-btn"
                            >
                                <ShieldBan className="mr-2 h-4 w-4" />
                                Block Account
                            </Button>
                        )}

                        {/* Purge Account */}
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
                            onClick={() => setShowPurgeDialog(true)}
                            data-testid="purge-vendor-btn"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Purge Account
                        </Button>
                    </div>
                </div>
            </div>

            {/* Purge Confirmation Dialog */}
            <Dialog open={showPurgeDialog} onOpenChange={setShowPurgeDialog} data-testid="purge-vendor-dialog">
                <DialogContent className="sm:max-w-md max-w-[95vw]" data-testid="purge-vendor-dialog-content">
                    <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2 text-red-400">
                            <Trash2 className="h-5 w-5" />
                            <span>Purge Vendor Account</span>
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            This will permanently delete all data for <span className="font-semibold text-white">{vendor.name}</span>. This action cannot be undone. All listings, bookings, orders, gallery items, social posts, and Stripe accounts will be removed.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-sm text-slate-300">
                                Type the vendor name to confirm
                            </Label>
                            <Input
                                data-testid="purge-confirm-name-input"
                                value={purgeConfirmName}
                                onChange={(e) => setPurgeConfirmName(e.target.value)}
                                placeholder={vendor.name}
                                dark
                            />
                        </div>
                        <div className="flex flex-col space-y-2">
                            <Button
                                data-testid="purge-confirm-btn"
                                onClick={handlePurge}
                                disabled={purgeConfirmName !== vendor.name || purgeVendor.isPending}
                                className="w-full bg-red-600 hover:bg-red-700 text-white"
                            >
                                {purgeVendor.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Purging...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Permanently Delete All Data
                                    </>
                                )}
                            </Button>
                            <Button
                                data-testid="purge-cancel-btn"
                                variant="outline"
                                onClick={() => {
                                    setShowPurgeDialog(false);
                                    setPurgeConfirmName('');
                                }}
                                className="w-full"
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Block Account Dialog */}
            <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog} data-testid="block-vendor-dialog">
                <DialogContent className="sm:max-w-md max-w-[95vw]" data-testid="block-vendor-dialog-content">
                    <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2 text-orange-400">
                            <ShieldBan className="h-5 w-5" />
                            <span>Block Vendor Account</span>
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Blocking <span className="font-semibold text-white">{vendor.name}</span> will unpublish them from the marketplace and pause their Stripe payouts. They will not be able to receive new orders.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-sm text-slate-300">
                                Reason (optional)
                            </Label>
                            <Textarea
                                data-testid="block-reason-input"
                                value={blockReason}
                                onChange={(e) => setBlockReason(e.target.value)}
                                placeholder="Why is this account being blocked?"
                                className="min-h-[80px]"
                                dark
                            />
                        </div>
                        <div className="flex flex-col space-y-2">
                            <Button
                                data-testid="block-confirm-btn"
                                onClick={handleBlock}
                                disabled={blockVendor.isPending}
                                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                            >
                                {blockVendor.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Blocking...
                                    </>
                                ) : (
                                    <>
                                        <ShieldBan className="mr-2 h-4 w-4" />
                                        Block Account
                                    </>
                                )}
                            </Button>
                            <Button
                                data-testid="block-cancel-btn"
                                variant="outline"
                                onClick={() => {
                                    setShowBlockDialog(false);
                                    setBlockReason('');
                                }}
                                className="w-full"
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

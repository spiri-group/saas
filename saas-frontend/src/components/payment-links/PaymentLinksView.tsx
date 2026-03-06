'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Send, Copy, XCircle, RefreshCw } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { usePaymentLinks, PaymentLink } from '@/app/(site)/p/[practitioner_slug]/(manage)/manage/payment-links/_hooks/UsePaymentLinks';
import { useCancelPaymentLink } from '@/app/(site)/p/[practitioner_slug]/(manage)/manage/payment-links/_hooks/UseCancelPaymentLink';
import { useResendPaymentLink } from '@/app/(site)/p/[practitioner_slug]/(manage)/manage/payment-links/_hooks/UseResendPaymentLink';
import CreatePaymentLinkDialog from './CreatePaymentLinkDialog';
import { toast } from 'sonner';

const STATUS_FILTERS = ['All', 'SENT', 'VIEWED', 'PAID', 'EXPIRED', 'CANCELLED'] as const;

const STATUS_DISPLAY: Record<string, string> = {
    SENT: 'Sent',
    VIEWED: 'Viewed',
    PAID: 'Paid',
    EXPIRED: 'Expired',
    CANCELLED: 'Cancelled',
};

const STATUS_COLORS: Record<string, string> = {
    SENT: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    VIEWED: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    PAID: 'bg-green-500/20 text-green-400 border-green-500/30',
    EXPIRED: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    CANCELLED: 'bg-red-500/20 text-red-400 border-red-500/30',
};

function formatAmount(cents: number, currency: string): string {
    return `$${(cents / 100).toFixed(2)} ${currency}`;
}

function formatDate(isoDate: string): string {
    return new Date(isoDate).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

type Props = {
    vendors: { id: string; name: string; currency?: string }[];
    hasPaymentLinks: boolean;
    upgradeUrl?: string;
};

export default function PaymentLinksView({ vendors, hasPaymentLinks, upgradeUrl }: Props) {
    const [statusFilter, setStatusFilter] = useState<string>('All');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);

    const queryStatus = statusFilter === 'All' ? undefined : statusFilter;
    const { data: links, isLoading } = usePaymentLinks(queryStatus);
    const cancelMutation = useCancelPaymentLink();
    const resendMutation = useResendPaymentLink();

    const handleCopyUrl = (linkId: string) => {
        const url = `${window.location.origin}/pay/${linkId}`;
        navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard');
    };

    const handleCancel = async (linkId: string) => {
        try {
            await cancelMutation.mutateAsync(linkId);
            toast.success('Payment link cancelled');
            setCancelConfirmId(null);
        } catch (err: any) {
            toast.error(err.message || 'Failed to cancel');
        }
    };

    const handleResend = async (linkId: string) => {
        try {
            await resendMutation.mutateAsync({ linkId, resetExpiration: true });
            toast.success('Payment link resent');
        } catch (err: any) {
            toast.error(err.message || 'Failed to resend');
        }
    };

    // Feature gate: show upgrade prompt if tier lacks hasPaymentLinks
    if (!hasPaymentLinks) {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center" data-testid="payment-links-upgrade">
                <Send className="h-12 w-12 text-slate-500 mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">Payment Links</h2>
                <p className="text-slate-400 mb-6 max-w-md">
                    Send payment links via email and collect payments from clients at expos, events, or remotely.
                    Upgrade to Illuminate or higher to unlock this feature.
                </p>
                {upgradeUrl && (
                    <a href={upgradeUrl}>
                        <Button className="bg-purple-600 hover:bg-purple-700" data-testid="payment-links-upgrade-btn">
                            Upgrade Plan
                        </Button>
                    </a>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6" data-testid="payment-links-view">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white" data-testid="payment-links-heading">Payment Links</h1>
                    <p className="text-sm text-slate-400 mt-1">Send payment requests to your clients via email</p>
                </div>
                <Button
                    data-testid="create-payment-link-btn"
                    onClick={() => setDialogOpen(true)}
                    className="bg-purple-600 hover:bg-purple-700"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Payment Link
                </Button>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 flex-wrap" data-testid="payment-links-filters">
                {STATUS_FILTERS.map(filter => (
                    <button
                        key={filter}
                        data-testid={`payment-links-filter-${filter.toLowerCase()}`}
                        onClick={() => setStatusFilter(filter)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                            statusFilter === filter
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                    >
                        {filter === 'All' ? 'All' : STATUS_DISPLAY[filter] || filter}
                    </button>
                ))}
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12" data-testid="payment-links-loading">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
                </div>
            ) : !links || links.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center" data-testid="payment-links-empty">
                    <Send className="h-10 w-10 text-slate-500 mb-3" />
                    <p className="text-slate-400">No payment links yet</p>
                    <p className="text-sm text-slate-500 mt-1">Create your first payment link to get started</p>
                </div>
            ) : (
                <div className="space-y-3" data-testid="payment-links-list">
                    {links.map((link: PaymentLink) => (
                        <div
                            key={link.id}
                            data-testid={`payment-link-row-${link.id}`}
                            className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border border-slate-700 bg-slate-800/50"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium text-white truncate" data-testid={`payment-link-email-${link.id}`}>
                                        {link.customerEmail}
                                    </span>
                                    {link.customerName && (
                                        <span className="text-xs text-slate-400">({link.customerName})</span>
                                    )}
                                    <Badge
                                        data-testid={`payment-link-status-${link.id}`}
                                        className={`text-xs ${STATUS_COLORS[link.linkStatus] || STATUS_COLORS.SENT}`}
                                    >
                                        {STATUS_DISPLAY[link.linkStatus] || link.linkStatus}
                                    </Badge>
                                </div>
                                <div className="text-xs text-slate-400 space-x-3">
                                    <span>
                                        {link.items.map(i => i.customDescription || i.sourceName || 'Payment').join(', ')}
                                    </span>
                                    <span>Sent {formatDate(link.sentAt)}</span>
                                    {link.paidAt && <span>Paid {formatDate(link.paidAt)}</span>}
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-white whitespace-nowrap" data-testid={`payment-link-amount-${link.id}`}>
                                    {formatAmount(link.totalAmount.amount, link.totalAmount.currency)}
                                </span>

                                <div className="flex gap-1.5">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        data-testid={`payment-link-copy-${link.id}`}
                                        onClick={() => handleCopyUrl(link.id)}
                                        className="h-8 text-xs px-2.5"
                                    >
                                        <Copy className="h-3.5 w-3.5 mr-1.5" />
                                        Copy
                                    </Button>
                                    {(link.linkStatus === 'SENT' || link.linkStatus === 'VIEWED' || link.linkStatus === 'EXPIRED') && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            data-testid={`payment-link-resend-${link.id}`}
                                            onClick={() => handleResend(link.id)}
                                            disabled={resendMutation.isPending}
                                            className="h-8 text-xs px-2.5"
                                        >
                                            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                                            {resendMutation.isPending ? 'Sending...' : 'Resend'}
                                        </Button>
                                    )}
                                    {(link.linkStatus === 'SENT' || link.linkStatus === 'VIEWED') && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            data-testid={`payment-link-cancel-${link.id}`}
                                            onClick={() => setCancelConfirmId(link.id)}
                                            disabled={cancelMutation.isPending}
                                            className="h-8 text-xs px-2.5 text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
                                        >
                                            <XCircle className="h-3.5 w-3.5 mr-1.5" />
                                            Cancel
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <CreatePaymentLinkDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                vendors={vendors}
            />

            {/* Cancel confirmation */}
            <AlertDialog open={!!cancelConfirmId} onOpenChange={(open) => !open && setCancelConfirmId(null)}>
                <AlertDialogContent data-testid="cancel-payment-link-confirm">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel this payment link?</AlertDialogTitle>
                        <AlertDialogDescription>
                            The customer will no longer be able to pay using this link. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel data-testid="cancel-payment-link-no">Keep Active</AlertDialogCancel>
                        <AlertDialogAction
                            data-testid="cancel-payment-link-yes"
                            onClick={() => cancelConfirmId && handleCancel(cancelConfirmId)}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {cancelMutation.isPending ? 'Cancelling...' : 'Yes, Cancel Link'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

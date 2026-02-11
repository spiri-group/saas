'use client';

import { useState } from 'react';
import { ArrowDownCircle, AlertTriangle, X } from 'lucide-react';
import { useRequestVendorDowngrade } from '@/hooks/UseDowngradeVendorSubscription';
import { useTierFeatures } from '@/hooks/UseTierFeatures';
import { toast } from 'sonner';

type DowngradeModalProps = {
    vendorId: string;
    targetTier: string;
    onClose: () => void;
    onSuccess?: () => void;
};

const TIER_DISPLAY: Record<string, string> = {
    awaken: 'Awaken',
    manifest: 'Manifest',
    transcend: 'Transcend',
};

export default function DowngradeModal({ vendorId, targetTier, onClose, onSuccess }: DowngradeModalProps) {
    const { tier: currentTier } = useTierFeatures(vendorId);
    const downgradeMutation = useRequestVendorDowngrade(vendorId);
    const [confirmed, setConfirmed] = useState(false);

    const handleDowngrade = async () => {
        try {
            const result = await downgradeMutation.mutateAsync({ targetTier });
            if (result.success) {
                const effectiveDate = result.effectiveAt
                    ? new Date(result.effectiveAt).toLocaleDateString()
                    : 'end of billing period';
                toast.success(`Downgrade scheduled for ${effectiveDate}`);
                onSuccess?.();
                onClose();
            } else {
                toast.error(result.message || 'Downgrade request failed');
            }
        } catch {
            toast.error('Something went wrong. Please try again.');
        }
    };

    return (
        <div
            data-testid="downgrade-modal-overlay"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                data-testid="downgrade-modal"
                className="relative mx-4 max-w-md w-full rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-2xl"
            >
                <button
                    type="button"
                    data-testid="downgrade-modal-close"
                    onClick={onClose}
                    className="absolute right-4 top-4 text-slate-400 hover:text-white"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="mb-6 flex items-center gap-3">
                    <div className="rounded-full bg-amber-500/20 p-3">
                        <ArrowDownCircle className="h-8 w-8 text-amber-400" />
                    </div>
                    <div>
                        <h2 data-testid="downgrade-modal-title" className="text-xl font-bold text-white">
                            Downgrade Plan
                        </h2>
                        <p className="text-sm text-slate-400">
                            {TIER_DISPLAY[currentTier || '']} to {TIER_DISPLAY[targetTier]}
                        </p>
                    </div>
                </div>

                <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
                        <div className="text-sm text-slate-300">
                            <p className="mb-2 font-medium text-amber-300">What happens when you downgrade:</p>
                            <ul className="list-disc space-y-1 pl-4">
                                <li>The downgrade takes effect at the end of your current billing period</li>
                                <li>You&apos;ll keep your current features until then</li>
                                {targetTier === 'manifest' && (
                                    <>
                                        <li>Products beyond 15 will be hidden (not deleted)</li>
                                        <li>Practitioner hosting will be disabled</li>
                                        <li>Inventory and shipping automation will be disabled</li>
                                    </>
                                )}
                            </ul>
                        </div>
                    </div>
                </div>

                <label className="mb-6 flex items-center gap-3 cursor-pointer" data-testid="downgrade-confirm-checkbox">
                    <input
                        type="checkbox"
                        checked={confirmed}
                        onChange={(e) => setConfirmed(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-slate-300">
                        I understand the changes and want to proceed
                    </span>
                </label>

                <div className="flex gap-3">
                    <button
                        type="button"
                        data-testid="downgrade-cancel-btn"
                        onClick={onClose}
                        className="flex-1 rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800"
                    >
                        Keep Current Plan
                    </button>
                    <button
                        type="button"
                        data-testid="downgrade-confirm-btn"
                        onClick={handleDowngrade}
                        disabled={!confirmed || downgradeMutation.isPending}
                        className="flex-1 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                    >
                        {downgradeMutation.isPending ? 'Processing...' : 'Downgrade'}
                    </button>
                </div>
            </div>
        </div>
    );
}

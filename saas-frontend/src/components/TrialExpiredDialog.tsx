'use client';

import { useCallback } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ShieldAlert } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import AddCardForm from '@/app/(site)/m/_components/Cards/components/AddCardForm';

type TrialExpiredDialogProps = {
    vendorId: string;
};

export default function TrialExpiredDialog({ vendorId }: TrialExpiredDialogProps) {
    const { isTrialExpired, subscriptionTier, isLoading } = useTrialStatus(vendorId);
    const queryClient = useQueryClient();

    const handleCardSuccess = useCallback(() => {
        // Invalidate subscription query — status will change from suspended → active
        // once the billing processor runs, or the UI will at least show card is saved
        queryClient.invalidateQueries({ queryKey: ['vendor-subscription', vendorId] });
    }, [queryClient, vendorId]);

    if (isLoading || !isTrialExpired) return null;

    const tierName = subscriptionTier
        ? subscriptionTier.charAt(0).toUpperCase() + subscriptionTier.slice(1)
        : 'Your';

    return (
        <DialogPrimitive.Root open={true}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
                <DialogPrimitive.Content
                    data-testid="trial-expired-dialog"
                    className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-2xl"
                    onPointerDownOutside={(e) => e.preventDefault()}
                    onEscapeKeyDown={(e) => e.preventDefault()}
                    onInteractOutside={(e) => e.preventDefault()}
                >
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className="h-14 w-14 rounded-full bg-red-500/15 flex items-center justify-center mb-4">
                            <ShieldAlert className="h-7 w-7 text-red-400" />
                        </div>
                        <DialogPrimitive.Title className="text-xl font-semibold text-white mb-2">
                            Your free trial has ended
                        </DialogPrimitive.Title>
                        <DialogPrimitive.Description className="text-sm text-slate-400 leading-relaxed">
                            To continue using SpiriVerse, please add a payment method.
                            Your {tierName} subscription will begin immediately.
                        </DialogPrimitive.Description>
                    </div>

                    <AddCardForm
                        merchantId={vendorId}
                        onSuccess={handleCardSuccess}
                        onCancel={() => {
                            // Cannot cancel — dialog is unescapable
                        }}
                    />
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}

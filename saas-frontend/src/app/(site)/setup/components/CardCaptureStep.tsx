'use client';

import { useState, useEffect } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { CreditCard, LoaderIcon, ShieldCheck, ArrowRight } from 'lucide-react';
import { useCreateCardSetupIntent } from '@/app/(site)/m/_components/Cards/hooks/UseCardSetupIntent';

let stripePromise: Promise<Stripe | null> | null = null;
const getStripe = () => {
    if (!stripePromise) {
        const key = process.env.NEXT_PUBLIC_stripe_token ?? '';
        stripePromise = loadStripe(key);
    }
    return stripePromise;
};

type CardCaptureStepProps = {
    vendorId: string;
    onComplete: () => void;
    onSkip: () => void;
};

function CardCaptureForm({
    clientSecret,
    vendorId,
    onComplete,
    onSkip,
}: {
    clientSecret: string;
    vendorId: string;
    onComplete: () => void;
    onSkip: () => void;
}) {
    const stripe = useStripe();
    const elements = useElements();
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!stripe || !elements) return;

        setIsProcessing(true);
        setError(null);

        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
            setError('Card element not found');
            setIsProcessing(false);
            return;
        }

        const { error: setupError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
            payment_method: { card: cardElement },
        });

        if (setupError) {
            setError(setupError.message || 'Failed to add card');
            setIsProcessing(false);
            return;
        }

        if (setupIntent?.status === 'succeeded') {
            onComplete();
        } else {
            setError('Card setup did not complete successfully');
        }
        setIsProcessing(false);
    };

    return (
        <div className="space-y-5">
            <div className="p-4 border border-white/15 rounded-lg bg-white/[0.08]">
                <CardElement
                    options={{
                        style: {
                            base: {
                                fontSize: '16px',
                                color: '#e2e8f0',
                                '::placeholder': { color: '#64748b' },
                            },
                            invalid: { color: '#ef4444' },
                        },
                        hidePostalCode: false,
                    }}
                />
            </div>

            {error && (
                <div className="text-sm text-red-400 bg-red-900/30 p-3 rounded-md">{error}</div>
            )}

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                <button
                    type="button"
                    onClick={onSkip}
                    disabled={isProcessing}
                    className="text-sm text-slate-400 hover:text-slate-200 underline underline-offset-2 py-2"
                    data-testid="card-capture-skip-btn"
                >
                    Skip for now
                </button>
                <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!stripe || isProcessing}
                    data-testid="card-capture-submit-btn"
                    className="h-12 sm:h-9 text-base sm:text-sm"
                >
                    {isProcessing ? (
                        <>
                            <LoaderIcon className="h-4 w-4 animate-spin mr-2" />
                            Verifying...
                        </>
                    ) : (
                        <>
                            <CreditCard className="h-4 w-4 mr-2" />
                            Add Card &amp; Continue
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}

export default function CardCaptureStep({ vendorId, onComplete, onSkip }: CardCaptureStepProps) {
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [initError, setInitError] = useState<string | null>(null);
    const createSetupIntent = useCreateCardSetupIntent();

    // Initialize setup intent on mount
    useEffect(() => {
        const init = async () => {
            try {
                const result = await createSetupIntent.mutateAsync(vendorId);
                if (result.success && result.clientSecret) {
                    setClientSecret(result.clientSecret);
                } else {
                    setInitError(result.message || 'Failed to initialize card setup');
                }
            } catch (err: any) {
                setInitError(err.message || 'Failed to initialize card setup');
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, [vendorId]);

    return (
        <div className="flex-1 flex flex-col p-4 sm:p-6 md:p-8 overflow-y-auto">
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="h-5 w-5 text-indigo-400" />
                    <h2 className="text-lg sm:text-xl font-semibold text-white">Secure your account</h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Add a card to verify your identity. We&apos;ll place a temporary $5 hold that&apos;s
                    automatically released &mdash; you won&apos;t be charged until your 14-day free trial ends.
                </p>
            </div>

            <div className="flex-1">
                {isLoading && (
                    <div className="flex items-center justify-center py-12">
                        <LoaderIcon className="h-6 w-6 animate-spin text-slate-400" />
                        <span className="ml-2 text-slate-400">Preparing card form...</span>
                    </div>
                )}

                {initError && (
                    <div className="space-y-4">
                        <div className="text-sm text-red-400 bg-red-900/30 p-3 rounded-md">{initError}</div>
                        <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
                            <button
                                onClick={onSkip}
                                className="text-sm text-slate-400 hover:text-slate-200 underline underline-offset-2 py-2"
                            >
                                Skip for now
                            </button>
                            <Button variant="outline" onClick={onComplete} className="h-12 sm:h-9 text-base sm:text-sm border-white/20 text-slate-300 hover:bg-white/10 hover:text-white">
                                <ArrowRight className="h-4 w-4 mr-2" />
                                Continue
                            </Button>
                        </div>
                    </div>
                )}

                {clientSecret && (
                    <Elements
                        stripe={getStripe()}
                        options={{
                            clientSecret,
                            appearance: {
                                theme: 'night',
                                variables: { colorPrimary: '#6366f1' },
                            },
                        }}
                    >
                        <CardCaptureForm
                            clientSecret={clientSecret}
                            vendorId={vendorId}
                            onComplete={onComplete}
                            onSkip={onSkip}
                        />
                    </Elements>
                )}
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Secured by Stripe. Your card details are never stored on our servers.</span>
            </div>
        </div>
    );
}

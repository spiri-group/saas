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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="p-4 border border-slate-300 rounded-lg bg-white">
                <CardElement
                    options={{
                        style: {
                            base: {
                                fontSize: '16px',
                                color: '#1e293b',
                                '::placeholder': { color: '#94a3b8' },
                            },
                            invalid: { color: '#ef4444' },
                        },
                        hidePostalCode: false,
                    }}
                />
            </div>

            {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>
            )}

            <div className="flex items-center justify-between pt-2">
                <button
                    type="button"
                    onClick={onSkip}
                    disabled={isProcessing}
                    className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2"
                    data-testid="card-capture-skip-btn"
                >
                    Skip for now
                </button>
                <Button
                    type="submit"
                    disabled={!stripe || isProcessing}
                    data-testid="card-capture-submit-btn"
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
        </form>
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
        <div className="flex-1 flex flex-col p-6 sm:p-8 overflow-y-auto">
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="h-5 w-5 text-indigo-600" />
                    <h2 className="text-xl font-semibold text-slate-900">Secure your account</h2>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                    Add a card to verify your identity. We&apos;ll place a temporary $5 hold that&apos;s
                    automatically released &mdash; you won&apos;t be charged until your 14-day free trial ends.
                </p>
            </div>

            <div className="flex-1">
                {isLoading && (
                    <div className="flex items-center justify-center py-12">
                        <LoaderIcon className="h-6 w-6 animate-spin text-slate-400" />
                        <span className="ml-2 text-slate-500">Preparing card form...</span>
                    </div>
                )}

                {initError && (
                    <div className="space-y-4">
                        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{initError}</div>
                        <div className="flex justify-between">
                            <button
                                onClick={onSkip}
                                className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2"
                            >
                                Skip for now
                            </button>
                            <Button variant="outline" onClick={onComplete}>
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
                                theme: 'stripe',
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

            <div className="mt-6 flex items-center gap-2 text-xs text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Secured by Stripe. Your card details are never stored on our servers.</span>
            </div>
        </div>
    );
}

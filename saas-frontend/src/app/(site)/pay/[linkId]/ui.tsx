'use client';

import React, { useState } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock, ShieldCheck, Sparkles } from 'lucide-react';
import { usePaymentLinkCheckout } from './hooks/UsePaymentLinkCheckout';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_stripe_token ?? '');

function formatAmount(cents: number, currency: string): string {
    return `$${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

function formatDate(isoDate: string): string {
    return new Date(isoDate).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// ─── Checkout Form (inside Elements provider) ─────────────────

function CheckoutForm({ amount, currency, linkId }: { amount: number; currency: string; linkId: string }) {
    const stripe = useStripe();
    const elements = useElements();
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        setIsProcessing(true);
        setErrorMessage(null);

        const result = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/pay/${linkId}/success`,
            },
        });

        if (result.error) {
            setErrorMessage(result.error.message || 'Payment failed. Please try again.');
            setIsProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <PaymentElement options={{ terms: { card: 'never' } }} />
            {errorMessage && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm" data-testid="payment-error">
                    {errorMessage}
                </div>
            )}
            <Button
                type="submit"
                data-testid="payment-submit-btn"
                disabled={!stripe || isProcessing}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 text-base"
            >
                {isProcessing ? 'Processing...' : `Pay ${formatAmount(amount, currency)}`}
            </Button>
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                Secured by Stripe
            </div>
        </form>
    );
}

// ─── Branding ────────────────────────────────────────────────

function SpiriVerseBrand() {
    return (
        <div className="flex items-center justify-center gap-2 text-slate-500 mb-4">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-medium tracking-wide uppercase">SpiriVerse</span>
        </div>
    );
}

// ─── Main UI ──────────────────────────────────────────────────

type Props = {
    linkId: string;
};

export default function PaymentLinkUI({ linkId }: Props) {
    const { data: checkout, isLoading, error } = usePaymentLinkCheckout(linkId);

    // Loading
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen" data-testid="payment-link-loading">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4" />
                    <p className="text-slate-400">Loading payment details...</p>
                </div>
            </div>
        );
    }

    // Not found / error
    if (error || !checkout) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4" data-testid="payment-link-error">
                <div className="max-w-md w-full">
                <SpiriVerseBrand />
                <Card className="bg-slate-900 border-slate-700">
                    <CardContent className="p-6">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <AlertCircle className="w-12 h-12 text-red-400" />
                            <div>
                                <h2 className="text-lg font-semibold text-white mb-2">Payment Link Not Found</h2>
                                <p className="text-sm text-slate-400">
                                    This payment link may have expired, been cancelled, or is invalid.
                                    Please contact the sender for a new link.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                </div>
            </div>
        );
    }

    // Expired
    if (checkout.linkStatus === 'EXPIRED') {
        return (
            <div className="flex items-center justify-center min-h-screen p-4" data-testid="payment-link-expired">
                <div className="max-w-md w-full">
                <SpiriVerseBrand />
                <Card className="bg-slate-900 border-slate-700">
                    <CardContent className="p-6">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <Clock className="w-12 h-12 text-slate-400" />
                            <div>
                                <h2 className="text-lg font-semibold text-white mb-2">Payment Link Expired</h2>
                                <p className="text-sm text-slate-400">
                                    This payment link expired on {formatDate(checkout.expiresAt)}.
                                    Please contact {checkout.vendorNames[0] || 'the sender'} for a new link.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                </div>
            </div>
        );
    }

    // Already paid
    if (checkout.linkStatus === 'PAID') {
        return (
            <div className="flex items-center justify-center min-h-screen p-4" data-testid="payment-link-paid">
                <div className="max-w-md w-full">
                <SpiriVerseBrand />
                <Card className="bg-slate-900 border-slate-700">
                    <CardContent className="p-6">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <CheckCircle className="w-12 h-12 text-green-400" />
                            <div>
                                <h2 className="text-lg font-semibold text-white mb-2">Already Paid</h2>
                                <p className="text-sm text-slate-400">
                                    This payment of {formatAmount(checkout.totalAmount.amount, checkout.totalAmount.currency)} was completed
                                    {checkout.paidAt ? ` on ${formatDate(checkout.paidAt)}` : ''}.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                </div>
            </div>
        );
    }

    // Ready to pay (VIEWED status)
    const isSingleVendor = checkout.vendorNames.length === 1;

    return (
        <div className="flex items-center justify-center min-h-screen p-4" data-testid="payment-link-checkout">
            <div className="w-full max-w-lg space-y-6">
                {/* SpiriVerse branding */}
                <SpiriVerseBrand />

                {/* Header */}
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white" data-testid="payment-link-title">Payment Request</h1>
                    <p className="text-sm text-slate-400 mt-1">
                        from {checkout.vendorNames.join(' & ')}
                    </p>
                </div>

                {/* Items */}
                <Card className="bg-slate-900 border-slate-700">
                    <CardContent className="p-5 space-y-3">
                        {checkout.items.map((item, idx) => (
                            <div
                                key={item.id}
                                data-testid={`checkout-item-${idx}`}
                                className="flex items-center justify-between py-2"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white font-medium truncate">
                                        {item.customDescription || item.sourceName || 'Payment'}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {!isSingleVendor && (
                                            <span className="text-xs text-slate-400">{item.vendorName}</span>
                                        )}
                                        {item.itemType !== 'CUSTOM' && (
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                                {item.itemType === 'SERVICE' ? 'Service' : 'Product'}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <span className="text-sm font-medium text-white ml-4">
                                    {formatAmount(item.amount.amount, item.amount.currency)}
                                </span>
                            </div>
                        ))}

                        <div className="border-t border-slate-700 pt-3 mt-3 flex items-center justify-between">
                            <span className="text-sm font-semibold text-white">Total</span>
                            <span className="text-lg font-bold text-white" data-testid="checkout-total">
                                {formatAmount(checkout.totalAmount.amount, checkout.totalAmount.currency)}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Stripe Payment */}
                {checkout.stripePaymentIntentSecret ? (
                    <Card className="bg-slate-900 border-slate-700">
                        <CardContent className="p-5">
                            <Elements
                                stripe={stripePromise}
                                options={{
                                    clientSecret: checkout.stripePaymentIntentSecret,
                                    appearance: {
                                        theme: 'night',
                                        variables: {
                                            colorPrimary: '#7c3aed',
                                        },
                                    },
                                }}
                            >
                                <CheckoutForm
                                    amount={checkout.totalAmount.amount}
                                    currency={checkout.totalAmount.currency}
                                    linkId={linkId}
                                />
                            </Elements>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="text-center text-sm text-slate-400">
                        Unable to initialize payment. Please try refreshing the page.
                    </div>
                )}

                {/* Expiration notice */}
                <p className="text-center text-xs text-slate-500">
                    This link expires {formatDate(checkout.expiresAt)}
                </p>
            </div>
        </div>
    );
}

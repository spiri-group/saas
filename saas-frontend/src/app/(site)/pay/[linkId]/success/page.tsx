'use client';

import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Sparkles } from 'lucide-react';
import { usePaymentLinkCheckout } from '../hooks/UsePaymentLinkCheckout';
import { useParams } from 'next/navigation';

function formatAmount(cents: number, currency: string): string {
    return `$${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

export default function PaymentLinkSuccessPage() {
    const params = useParams();
    const linkId = params.linkId as string;
    const { data: checkout } = usePaymentLinkCheckout(linkId);

    return (
        <div className="flex items-center justify-center min-h-screen p-4" data-testid="payment-link-success">
            <div className="w-full max-w-md space-y-4">
                {/* SpiriVerse branding */}
                <div className="flex items-center justify-center gap-2 text-slate-500">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-xs font-medium tracking-wide uppercase">SpiriVerse</span>
                </div>

                <Card className="bg-slate-900 border-slate-700">
                    <CardContent className="p-8">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <CheckCircle className="w-16 h-16 text-green-400" />
                            <div>
                                <h2 className="text-xl font-bold text-white mb-2" data-testid="success-heading">
                                    Payment Successful
                                </h2>
                                {checkout ? (
                                    <p className="text-sm text-slate-400">
                                        Your payment of {formatAmount(checkout.totalAmount.amount, checkout.totalAmount.currency)} to {checkout.vendorNames.join(' & ')} has been processed.
                                        You&apos;ll receive a confirmation email shortly.
                                    </p>
                                ) : (
                                    <p className="text-sm text-slate-400">
                                        Your payment has been processed successfully. You&apos;ll receive a confirmation email shortly.
                                    </p>
                                )}
                            </div>
                            <div className="text-xs text-slate-500 mt-4">
                                Thank you! You can safely close this page.
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

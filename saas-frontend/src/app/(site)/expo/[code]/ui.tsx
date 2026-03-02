'use client';

import React, { useState, useEffect } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger
} from '@/components/ui/drawer';
import {
    Store, ShoppingCart, Plus, Minus, CheckCircle, AlertCircle, Pause,
    ShieldCheck, Sparkles, X
} from 'lucide-react';
import { useExpoByCode } from './hooks/UseExpoByCode';
import { useExpoPublicItems, ExpoPublicItemData } from './hooks/UseExpoPublicItems';
import { useCreateExpoCheckout } from './hooks/UseCreateExpoCheckout';
import { useSignalRConnection } from '@/components/utils/SignalRProvider';
import { useQueryClient } from '@tanstack/react-query';

const stripePromiseCache = new Map<string, ReturnType<typeof loadStripe>>();

function getStripePromise(stripeAccountId?: string) {
    const key = stripeAccountId || '__platform__';
    if (!stripePromiseCache.has(key)) {
        stripePromiseCache.set(key, loadStripe(
            process.env.NEXT_PUBLIC_stripe_token ?? '',
            stripeAccountId ? { stripeAccount: stripeAccountId } : undefined
        ));
    }
    return stripePromiseCache.get(key)!;
}

type CartItem = {
    itemId: string;
    itemName: string;
    quantity: number;
    price: { amount: number; currency: string };
};

function formatAmount(cents: number, currency?: string): string {
    return `$${(cents / 100).toFixed(2)}`;
}

// ─── Checkout Form (inside Elements provider) ─────────────────

function CheckoutForm({ amount, currency, expoCode }: { amount: number; currency: string; expoCode: string }) {
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
                return_url: `${window.location.origin}/expo/${expoCode}?success=true`,
            },
        });

        if (result.error) {
            setErrorMessage(result.error.message || 'Payment failed. Please try again.');
            setIsProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4" data-testid="checkout-form">
            <PaymentElement options={{ terms: { card: 'never' } }} />
            {errorMessage && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm" data-testid="payment-error">
                    <AlertCircle className="h-4 w-4 inline mr-2" />
                    {errorMessage}
                </div>
            )}
            <Button
                type="submit"
                disabled={!stripe || isProcessing}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 text-base"
                data-testid="pay-btn"
            >
                {isProcessing ? 'Processing...' : `Pay ${formatAmount(amount, currency)}`}
            </Button>
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                Your payment is processed securely by Stripe
            </div>
        </form>
    );
}

// ─── Main UI ──────────────────────────────────────────────────

type Props = {
    code: string;
};

type ViewState = 'catalog' | 'checkout' | 'success';

export default function ExpoCustomerUI({ code }: Props) {
    const { data: expo, isLoading: expoLoading } = useExpoByCode(code);
    const { data: items } = useExpoPublicItems(expo?.id);
    const checkoutMutation = useCreateExpoCheckout();
    const queryClient = useQueryClient();
    const signalR = useSignalRConnection();

    const [cart, setCart] = useState<CartItem[]>([]);
    const [cartOpen, setCartOpen] = useState(false);
    const [viewState, setViewState] = useState<ViewState>('catalog');
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [stripeAccountId, setStripeAccountId] = useState<string | undefined>(undefined);
    const [saleNumber, setSaleNumber] = useState<number | null>(null);
    const [saleSummary, setSaleSummary] = useState<any>(null);

    // Check for success redirect
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('success') === 'true') {
            setViewState('success');
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    // Listen for expo status changes via SignalR
    useEffect(() => {
        if (!signalR?.connection || !expo?.id) return;

        const handler = (message: any) => {
            if (message.type === 'data' && message.action === 'upsert') {
                // Expo status change
                queryClient.invalidateQueries({ queryKey: ['expo-by-code', code] });
            }
        };

        signalR.connection.on('expo', handler);
        signalR.joinGroup(`expo-${expo.id}`).catch(console.error);

        return () => {
            if (signalR?.connection) {
                signalR.connection.off('expo', handler);
                signalR.leaveGroup(`expo-${expo.id}`).catch(console.error);
            }
        };
    }, [signalR?.connection, expo?.id, code, queryClient]);

    const cartTotal = cart.reduce((sum, item) => sum + item.price.amount * item.quantity, 0);
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    const addToCart = (item: ExpoPublicItemData) => {
        setCart(prev => {
            const existing = prev.find(c => c.itemId === item.id);
            if (existing) {
                // Check stock
                if (item.trackInventory && item.quantityAvailable != null && existing.quantity >= item.quantityAvailable) return prev;
                return prev.map(c => c.itemId === item.id ? { ...c, quantity: c.quantity + 1 } : c);
            }
            return [...prev, { itemId: item.id, itemName: item.itemName, quantity: 1, price: item.price }];
        });
    };

    const updateCartQty = (itemId: string, delta: number) => {
        setCart(prev => {
            return prev.map(c => {
                if (c.itemId !== itemId) return c;
                const newQty = c.quantity + delta;
                return { ...c, quantity: Math.max(0, newQty) };
            }).filter(c => c.quantity > 0);
        });
    };

    const handleCheckout = async () => {
        if (!expo || cart.length === 0) return;

        try {
            const result = await checkoutMutation.mutateAsync({
                expoId: expo.id,
                items: cart.map(c => ({ itemId: c.itemId, quantity: c.quantity })),
                customerName: customerName.trim() || undefined,
                customerEmail: customerEmail.trim() || undefined,
            });

            setClientSecret(result.clientSecret);
            setStripeAccountId(result.stripeAccountId);
            setSaleNumber(result.sale.saleNumber);
            setSaleSummary(result.sale);
            setCartOpen(false);
            setViewState('checkout');
        } catch {
            // Error handled by mutation
        }
    };

    // ─── Loading ─────────────────────────────────────────────────

    if (expoLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
            </div>
        );
    }

    // ─── Not Found ───────────────────────────────────────────────

    if (!expo) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
                <div className="text-center" data-testid="expo-not-found">
                    <Store className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-white mb-2">Expo Not Found</h2>
                    <p className="text-slate-400">This expo link is not valid.</p>
                </div>
            </div>
        );
    }

    // ─── Ended ───────────────────────────────────────────────────

    if (expo.expoStatus === 'ENDED') {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
                <div className="text-center" data-testid="expo-ended">
                    <Store className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-white mb-2">Expo Has Ended</h2>
                    <p className="text-slate-400">This expo has ended. Thank you for visiting!</p>
                </div>
            </div>
        );
    }

    // ─── Paused ──────────────────────────────────────────────────

    if (expo.expoStatus === 'PAUSED') {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
                <div className="text-center" data-testid="expo-paused">
                    <Pause className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-white mb-2">On a Break</h2>
                    <p className="text-slate-400">This booth is on a break. Check back soon!</p>
                    <p className="text-sm text-slate-500 mt-2">{expo.vendorName} &middot; {expo.expoName}</p>
                </div>
            </div>
        );
    }

    // ─── Setup (not yet live) ────────────────────────────────────

    if (expo.expoStatus === 'SETUP') {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
                <div className="text-center" data-testid="expo-setup">
                    <Store className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-white mb-2">Coming Soon</h2>
                    <p className="text-slate-400">This booth is still being set up. Check back shortly!</p>
                    <p className="text-sm text-slate-500 mt-2">{expo.vendorName} &middot; {expo.expoName}</p>
                </div>
            </div>
        );
    }

    // ─── Success ─────────────────────────────────────────────────

    if (viewState === 'success') {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
                <div className="text-center max-w-sm" data-testid="checkout-success">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">
                        {saleNumber ? `Order #${saleNumber} Confirmed!` : 'Order Confirmed!'}
                    </h2>
                    {saleSummary && (
                        <div className="text-sm text-slate-400 mb-4 space-y-1">
                            {saleSummary.items.map((item: any, idx: number) => (
                                <p key={idx}>{item.quantity}x {item.itemName}</p>
                            ))}
                            <p className="font-medium text-white mt-2">
                                Total: {formatAmount(saleSummary.subtotal.amount)}
                            </p>
                        </div>
                    )}
                    {customerEmail && (
                        <p className="text-sm text-slate-400 mb-4">
                            You&apos;ll receive a confirmation email.
                        </p>
                    )}
                    <Button
                        onClick={() => {
                            setViewState('catalog');
                            setCart([]);
                            setClientSecret(null);
                            setStripeAccountId(undefined);
                            setSaleSummary(null);
                        }}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                        data-testid="continue-shopping-btn"
                    >
                        Continue Shopping
                    </Button>
                    <div className="mt-6">
                        <SpiriVerseBrand />
                    </div>
                </div>
            </div>
        );
    }

    // ─── Checkout ────────────────────────────────────────────────

    if (viewState === 'checkout' && clientSecret) {
        return (
            <div className="min-h-screen bg-slate-950 p-4 sm:p-6">
                <div className="max-w-md mx-auto">
                    <SpiriVerseBrand />

                    {/* Header */}
                    <div className="text-center mb-6">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="mb-4"
                            onClick={() => { setViewState('catalog'); setClientSecret(null); setStripeAccountId(undefined); }}
                            data-testid="back-to-catalog-btn"
                        >
                            &larr; Back to catalog
                        </Button>
                        <h1 className="text-xl font-bold text-white">Checkout</h1>
                        <p className="text-sm text-slate-400">{expo.vendorName} &middot; {expo.expoName}</p>
                    </div>

                    {/* Order Summary */}
                    <Card className="mb-6 bg-slate-900 border-slate-700">
                        <CardContent className="p-4">
                            <h3 className="text-sm font-medium text-slate-400 mb-3">Order Summary</h3>
                            {cart.map(item => (
                                <div key={item.itemId} className="flex justify-between text-sm py-1">
                                    <span className="text-white">{item.quantity}x {item.itemName}</span>
                                    <span className="text-white">{formatAmount(item.price.amount * item.quantity)}</span>
                                </div>
                            ))}
                            <div className="border-t border-slate-700 mt-3 pt-3 flex justify-between font-medium">
                                <span className="text-white">Total</span>
                                <span className="text-white">{formatAmount(cartTotal)}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Customer Info */}
                    <div className="space-y-3 mb-6">
                        <div className="space-y-1">
                            <Label htmlFor="customer-name" className="text-sm text-slate-400">Name (optional)</Label>
                            <Input
                                id="customer-name"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                placeholder="Your name"
                                className="bg-slate-900 border-slate-700"
                                data-testid="customer-name-input"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="customer-email" className="text-sm text-slate-400">Email (optional, for receipt)</Label>
                            <Input
                                id="customer-email"
                                type="email"
                                value={customerEmail}
                                onChange={(e) => setCustomerEmail(e.target.value)}
                                placeholder="your@email.com"
                                className="bg-slate-900 border-slate-700"
                                data-testid="customer-email-input"
                            />
                        </div>
                    </div>

                    {/* Stripe Payment */}
                    <Elements
                        stripe={getStripePromise(stripeAccountId)}
                        options={{
                            clientSecret,
                            appearance: {
                                theme: 'night',
                                variables: {
                                    colorPrimary: '#9333ea',
                                    colorBackground: '#0f172a',
                                    colorText: '#e2e8f0',
                                    borderRadius: '8px',
                                },
                            },
                        }}
                    >
                        <CheckoutForm
                            amount={cartTotal}
                            currency={cart[0]?.price.currency || 'AUD'}
                            expoCode={code}
                        />
                    </Elements>
                </div>
            </div>
        );
    }

    // ─── Live - Catalog ──────────────────────────────────────────

    return (
        <div className="min-h-screen bg-slate-950 pb-24" data-testid="expo-catalog">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-4 py-3">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                        {expo.vendorLogo && (
                            <img
                                src={expo.vendorLogo}
                                alt={expo.vendorName}
                                className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                            />
                        )}
                        <div className="min-w-0">
                            <p className="font-medium text-white text-sm truncate">{expo.vendorName}</p>
                            <p className="text-xs text-slate-400 truncate">{expo.expoName}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Live</Badge>
                    </div>
                </div>
            </div>

            {/* Catalog Grid */}
            <div className="max-w-2xl mx-auto px-4 py-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {(items || []).map(item => {
                        const soldOut = item.trackInventory && item.quantityAvailable != null && item.quantityAvailable <= 0;
                        const cartQty = cart.find(c => c.itemId === item.id)?.quantity || 0;

                        return (
                            <Card
                                key={item.id}
                                className={`bg-slate-900 border-slate-700 overflow-hidden ${soldOut ? 'opacity-60' : ''}`}
                                data-testid={`public-item-${item.id}`}
                            >
                                {item.itemImage && (
                                    <div className="aspect-square bg-slate-800">
                                        <img
                                            src={item.itemImage}
                                            alt={item.itemName}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                )}
                                <CardContent className="p-3">
                                    <p className="font-medium text-white text-sm line-clamp-2">{item.itemName}</p>
                                    {item.itemDescription && (
                                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{item.itemDescription}</p>
                                    )}
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="font-semibold text-white text-sm">{formatAmount(item.price.amount)}</span>
                                        {item.trackInventory && item.quantityAvailable != null && !soldOut && (
                                            <span className="text-xs text-slate-500">{item.quantityAvailable} left</span>
                                        )}
                                    </div>
                                    {soldOut ? (
                                        <Badge className="mt-2 w-full justify-center bg-red-500/20 text-red-400 border-red-500/30">
                                            SOLD OUT
                                        </Badge>
                                    ) : cartQty > 0 ? (
                                        <div className="flex items-center justify-between mt-2">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => updateCartQty(item.id, -1)}
                                                className="h-8 w-8 p-0"
                                                data-testid={`item-minus-${item.id}`}
                                            >
                                                <Minus className="h-4 w-4" />
                                            </Button>
                                            <span className="text-white font-medium">{cartQty}</span>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => addToCart(item)}
                                                className="h-8 w-8 p-0"
                                                disabled={item.trackInventory && item.quantityAvailable != null && cartQty >= item.quantityAvailable}
                                                data-testid={`item-plus-${item.id}`}
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            size="sm"
                                            className="w-full mt-2 bg-purple-600 hover:bg-purple-700 text-white text-xs"
                                            onClick={() => addToCart(item)}
                                            data-testid={`add-to-cart-${item.id}`}
                                        >
                                            <Plus className="h-3 w-3 mr-1" />
                                            Add to Cart
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {(!items || items.length === 0) && (
                    <div className="text-center py-16 text-slate-400">
                        <Store className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No items available yet</p>
                    </div>
                )}
            </div>

            {/* Floating Cart Button */}
            {cartCount > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/95 backdrop-blur border-t border-slate-800">
                    <div className="max-w-2xl mx-auto">
                        <Drawer open={cartOpen} onOpenChange={setCartOpen}>
                            <DrawerTrigger asChild>
                                <Button
                                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 text-base"
                                    data-testid="view-cart-btn"
                                >
                                    <ShoppingCart className="h-5 w-5 mr-2" />
                                    View Cart ({cartCount}) &middot; {formatAmount(cartTotal)}
                                </Button>
                            </DrawerTrigger>
                            <DrawerContent dark className="max-h-[80vh]" data-testid="cart-sheet">
                                <DrawerHeader>
                                    <DrawerTitle className="text-white">Your Cart</DrawerTitle>
                                </DrawerHeader>
                                <div className="mt-4 space-y-3 overflow-y-auto max-h-[40vh]">
                                    {cart.map(item => (
                                        <div key={item.itemId} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg" data-testid={`cart-item-${item.itemId}`}>
                                            <div>
                                                <p className="text-sm text-white">{item.itemName}</p>
                                                <p className="text-xs text-slate-400">{formatAmount(item.price.amount)} each</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => updateCartQty(item.itemId, -1)}
                                                    className="h-8 w-8 p-0"
                                                    data-testid={`cart-minus-${item.itemId}`}
                                                >
                                                    <Minus className="h-4 w-4" />
                                                </Button>
                                                <span className="text-white font-medium w-4 text-center">{item.quantity}</span>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => {
                                                        const catalogItem = items?.find(i => i.id === item.itemId);
                                                        if (catalogItem) addToCart(catalogItem);
                                                    }}
                                                    className="h-8 w-8 p-0"
                                                    data-testid={`cart-plus-${item.itemId}`}
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                                <span className="text-white font-medium w-16 text-right">
                                                    {formatAmount(item.price.amount * item.quantity)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="border-t border-slate-700 mt-4 pt-4">
                                    <div className="flex justify-between text-lg font-semibold text-white mb-4">
                                        <span>Total</span>
                                        <span>{formatAmount(cartTotal)}</span>
                                    </div>
                                    <Button
                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 text-base"
                                        onClick={handleCheckout}
                                        disabled={checkoutMutation.isPending}
                                        data-testid="checkout-btn"
                                    >
                                        {checkoutMutation.isPending ? 'Preparing checkout...' : 'Checkout'}
                                    </Button>
                                    {checkoutMutation.isError && (
                                        <p className="text-sm text-red-400 mt-2 text-center" data-testid="checkout-error">
                                            {(checkoutMutation.error as any)?.message || 'Something went wrong. Please try again.'}
                                        </p>
                                    )}
                                </div>
                            </DrawerContent>
                        </Drawer>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="text-center py-4">
                <SpiriVerseBrand />
            </div>
        </div>
    );
}

function SpiriVerseBrand() {
    return (
        <div className="flex items-center justify-center gap-2 text-slate-500">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-medium tracking-wide uppercase">SpiriVerse</span>
        </div>
    );
}

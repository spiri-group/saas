'use client'

import React from "react";
import Image from "next/image";
import { Panel, PanelContent, PanelHeader, PanelTitle, PanelDescription } from "@/components/ux/Panel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import CurrencySpan from "@/components/ux/CurrencySpan";
import useMerchantTheme from "@/app/(site)/m/_hooks/UseMerchantTheme";
import MerchantFontLoader from "@/app/(site)/m/_components/MerchantFontLoader";
import UsePendingOrder from "./hooks/UsePendingOrder";
import { Clock, AlertCircle, CheckCircle, ShieldCheck, Package } from "lucide-react";

type BLProps = {
    merchantId: string;
    orderId: string;
}

type Props = BLProps & {}

const useBL = (props: BLProps) => {
    const vendorBranding = useMerchantTheme(props.merchantId);
    const order = UsePendingOrder(props.orderId);

    const isExpired = order.data?.checkoutLinkExpiresAt
        ? new Date(order.data.checkoutLinkExpiresAt) < new Date()
        : false;

    return {
        vendorBranding: vendorBranding.data,
        order: order.data,
        isLoading: order.isLoading,
        isExpired,
        error: order.error as Error | null
    };
};

const UI: React.FC<Props> = (props) => {
    const bl = useBL(props);

    if (bl.isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p>Loading checkout...</p>
                </div>
            </div>
        );
    }

    if (bl.error || !bl.order) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <Card className="max-w-md w-full">
                    <CardContent className="p-6">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <AlertCircle className="w-12 h-12 text-destructive" />
                            <div>
                                <h2 className="text-lg font-semibold mb-2">Checkout Link Not Found</h2>
                                <p className="text-sm text-muted-foreground">
                                    This payment link may have expired or is invalid. Please contact the merchant for a new link.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!bl.vendorBranding) return null;

    const fontConfig = bl.vendorBranding.vendor.font ? {
        brand: bl.vendorBranding.vendor.font.brand?.family || 'clean',
        default: bl.vendorBranding.vendor.font.default?.family || 'clean',
        headings: bl.vendorBranding.vendor.font.headings?.family || 'clean',
        accent: bl.vendorBranding.vendor.font.accent?.family || 'clean'
    } : undefined;

    if (bl.isExpired) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <Card className="max-w-md w-full">
                    <CardContent className="p-6">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <Clock className="w-12 h-12 text-orange-500" />
                            <div>
                                <h2 className="text-lg font-semibold mb-2">Checkout Link Expired</h2>
                                <p className="text-sm text-muted-foreground mb-4">
                                    This payment link expired on {new Date(bl.order.checkoutLinkExpiresAt!).toLocaleString()}.
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Please contact <strong>{bl.vendorBranding.vendor.name}</strong> for a new payment link.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (bl.order.status !== "PENDING_PAYMENT") {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <Card className="max-w-md w-full">
                    <CardContent className="p-6">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <CheckCircle className="w-12 h-12 text-green-500" />
                            <div>
                                <h2 className="text-lg font-semibold mb-2">Already Paid</h2>
                                <p className="text-sm text-muted-foreground">
                                    This order has already been paid for. Check your email for confirmation and next steps.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const totalAmount = bl.order.paymentSummary?.due?.total ||
        (bl.order.lines.length > 0 ? bl.order.lines[0].subtotal : { amount: 0, currency: 'USD' });

    return (
        <div className="flex flex-col space-y-2 ml-2 mr-2"
            style={{
                background: 'rgb(var(--merchant-background, 248, 250, 252))',
                backgroundImage: 'var(--merchant-background-image, linear-gradient(to bottom, #f8fafc, #f1f5f9, #e2e8f0))',
                minHeight: '100vh'
            }}>
            <MerchantFontLoader fonts={fontConfig} />

            <div className="max-w-4xl mx-auto lg:max-w-none w-full mt-8 px-4">
                <Panel
                    style={{
                        backgroundColor: `rgba(var(--merchant-panel), var(--merchant-panel-transparency, 1))`,
                        color: `rgb(var(--merchant-panel-primary-foreground))`,
                        borderColor: `rgb(var(--merchant-primary), 0.2)`,
                        boxShadow: `var(--shadow-merchant-lg)`
                    }}>
                    <PanelHeader>
                        <PanelTitle className="text-merchant-headings-foreground">Complete Your Payment</PanelTitle>
                        <PanelDescription className="flex items-center gap-2">
                            <span className="text-merchant-default-foreground/70">From</span>
                            <span className="text-merchant-default-foreground font-bold">{bl.vendorBranding.vendor.name}</span>
                        </PanelDescription>
                    </PanelHeader>

                    <PanelContent className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Package className="w-5 h-5" />
                                            Order Items
                                        </CardTitle>
                                        <CardDescription>
                                            {bl.order.lines.length} item{bl.order.lines.length !== 1 ? 's' : ''}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {bl.order.lines.map((line) => (
                                            <div key={line.id} className="flex items-start gap-3 pb-4 border-b last:border-b-0 last:pb-0">
                                                {line.image?.url && (
                                                    <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                                                        <Image
                                                            src={line.image.url}
                                                            alt={line.descriptor}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-medium text-sm truncate">{line.descriptor}</h4>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        Quantity: {line.quantity}
                                                    </p>
                                                    <p className="text-sm font-semibold mt-2">
                                                        <CurrencySpan value={line.subtotal} withAnimation={false} />
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>

                                <Alert>
                                    <ShieldCheck className="h-4 w-4" />
                                    <AlertDescription className="text-sm">
                                        Your payment is secured by Stripe. After payment, you&apos;ll receive a confirmation email at <strong>{bl.order.customerEmail}</strong>
                                    </AlertDescription>
                                </Alert>
                            </div>

                            <div className="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Payment Summary</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Items</span>
                                                <span>{bl.order.lines.length}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Customer</span>
                                                <span className="truncate ml-2">{bl.order.customerEmail}</span>
                                            </div>
                                        </div>

                                        <Separator />

                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold">Total</span>
                                            <span className="text-2xl font-bold text-merchant-primary">
                                                <CurrencySpan value={totalAmount} withAnimation={false} />
                                            </span>
                                        </div>

                                        <Button className="w-full" size="lg">
                                            Pay Now
                                        </Button>

                                        {bl.order.checkoutLinkExpiresAt && (
                                            <p className="text-xs text-muted-foreground text-center">
                                                This link expires on {new Date(bl.order.checkoutLinkExpiresAt).toLocaleString()}
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </PanelContent>
                </Panel>
            </div>
        </div>
    );
};

export default UI;

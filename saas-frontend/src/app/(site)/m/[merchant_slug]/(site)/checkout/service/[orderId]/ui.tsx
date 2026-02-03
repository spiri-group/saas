'use client'

import React from "react";
import Image from "next/image";
import { Panel, PanelContent, PanelHeader, PanelTitle, PanelDescription } from "@/components/ux/Panel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import CurrencySpan from "@/components/ux/CurrencySpan";
import useMerchantTheme from "@/app/(site)/m/_hooks/UseMerchantTheme";
import MerchantFontLoader from "@/app/(site)/m/_components/MerchantFontLoader";
import UsePendingServiceOrder from "./hooks/UsePendingServiceOrder";
import { Clock, AlertCircle, CheckCircle, ShieldCheck } from "lucide-react";

type BLProps = {
    merchantId: string;
    orderId: string;
}

type Props = BLProps & {}

const useBL = (props: BLProps) => {
    const vendorBranding = useMerchantTheme(props.merchantId);
    const order = UsePendingServiceOrder(props.orderId);

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
                                    This payment link may have expired or is invalid. Please contact the service provider for a new link.
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

    const getCategoryBadge = (category: string) => {
        switch (category) {
            case "READING":
                return <Badge variant="outline" className="bg-purple-500/10 text-purple-300 border-purple-500/30">Reading</Badge>;
            case "HEALING":
                return <Badge variant="outline" className="bg-green-500/10 text-green-300 border-green-500/30">Healing</Badge>;
            case "COACHING":
                return <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-500/30">Coaching</Badge>;
            default:
                return <Badge variant="outline">{category}</Badge>;
        }
    };

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
                                    Please contact <strong>{bl.order.service.vendor.name}</strong> for a new payment link.
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
                                    This service has already been paid for. Check your email for confirmation and next steps.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

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
                        <PanelTitle className="text-merchant-headings-foreground">Complete Your Service Payment</PanelTitle>
                        <PanelDescription className="flex items-center gap-2">
                            <span className="text-merchant-default-foreground/70">From</span>
                            <span className="text-merchant-default-foreground font-bold">{bl.order.service.vendor.name}</span>
                        </PanelDescription>
                    </PanelHeader>

                    <PanelContent className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                {bl.order.service.thumbnail?.image?.media?.url && (
                                                    <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                                                        <Image
                                                            src={bl.order.service.thumbnail.image.media.url}
                                                            alt={bl.order.service.name}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                )}
                                                <div>
                                                    <CardTitle>{bl.order.service.name}</CardTitle>
                                                    <CardDescription className="mt-1">
                                                        {getCategoryBadge(bl.order.service.category)}
                                                    </CardDescription>
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground whitespace-pre-line">
                                            {bl.order.service.description}
                                        </p>
                                    </CardContent>
                                </Card>

                                {bl.order.questionnaireResponses && bl.order.questionnaireResponses.length > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base">Your Responses</CardTitle>
                                            <CardDescription>Information provided by the practitioner</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            {bl.order.questionnaireResponses.map((response, idx, arr) => (
                                                <div key={response.questionId} className="space-y-1">
                                                    <div className="text-sm font-medium">{response.question}</div>
                                                    <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                                                        {response.answer}
                                                    </div>
                                                    {idx < arr.length - 1 && <Separator className="mt-2" />}
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                )}

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
                                                <span className="text-muted-foreground">Service</span>
                                                <span>{bl.order.service.name}</span>
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
                                                <CurrencySpan value={bl.order.price} withAnimation={false} />
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

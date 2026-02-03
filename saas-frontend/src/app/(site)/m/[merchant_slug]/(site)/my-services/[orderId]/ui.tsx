'use client'

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Panel, PanelContent, PanelHeader, PanelTitle, PanelDescription } from "@/components/ux/Panel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import useMerchantTheme from "@/app/(site)/m/_hooks/UseMerchantTheme";
import MerchantFontLoader from "@/app/(site)/m/_components/MerchantFontLoader";
import UseServiceOrder from "./hooks/UseServiceOrder";
import { Download, FileText, Clock, CheckCircle, AlertCircle, Package, ArrowLeft, Video, Music, FileImage } from "lucide-react";

type BLProps = {
    merchantId: string;
    orderId: string;
}

type Props = BLProps & {}

const useBL = (props: BLProps) => {
    const vendorBranding = useMerchantTheme(props.merchantId);
    const order = UseServiceOrder(props.orderId);

    return {
        vendorBranding: vendorBranding.data,
        order: order.data,
        isLoading: order.isLoading
    };
};

const UI: React.FC<Props> = (props) => {
    const bl = useBL(props);

    if (!bl.vendorBranding) return null;
    if (bl.isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p>Loading service details...</p>
                </div>
            </div>
        );
    }

    if (!bl.order) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-lg">Service not found</p>
            </div>
        );
    }

    const fontConfig = bl.vendorBranding.vendor.font ? {
        brand: bl.vendorBranding.vendor.font.brand?.family || 'clean',
        default: bl.vendorBranding.vendor.font.default?.family || 'clean',
        headings: bl.vendorBranding.vendor.font.headings?.family || 'clean',
        accent: bl.vendorBranding.vendor.font.accent?.family || 'clean'
    } : undefined;

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "PAID":
                return <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
            case "IN_PROGRESS":
                return <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30"><Package className="w-3 h-3 mr-1" />In Progress</Badge>;
            case "DELIVERED":
                return <Badge className="bg-green-500/20 text-green-300 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />Delivered</Badge>;
            default:
                return <Badge className="bg-gray-500/20 text-gray-300 border-gray-500/30"><AlertCircle className="w-3 h-3 mr-1" />{status}</Badge>;
        }
    };

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

    const getFileIcon = (mimeType: string) => {
        if (mimeType.startsWith('video/')) return <Video className="w-5 h-5 text-blue-500" />;
        if (mimeType.startsWith('audio/')) return <Music className="w-5 h-5 text-purple-500" />;
        if (mimeType.startsWith('image/')) return <FileImage className="w-5 h-5 text-green-500" />;
        return <FileText className="w-5 h-5 text-gray-500" />;
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <div className="flex flex-col space-y-2 ml-2 mr-2"
            style={{
                background: 'rgb(var(--merchant-background, 248, 250, 252))',
                backgroundImage: 'var(--merchant-background-image, linear-gradient(to bottom, #f8fafc, #f1f5f9, #e2e8f0))',
                minHeight: '100vh'
            }}>
            <MerchantFontLoader fonts={fontConfig} />

            <Panel className="mt-2"
                style={{
                    backgroundColor: `rgba(var(--merchant-panel), var(--merchant-panel-transparency, 1))`,
                    color: `rgb(var(--merchant-panel-primary-foreground))`,
                    borderColor: `rgb(var(--merchant-primary), 0.2)`,
                    boxShadow: `var(--shadow-merchant-lg)`
                }}>
                <PanelHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <Button variant="ghost" size="sm" asChild>
                            <Link href={`/m/${bl.order.service.vendor.slug}/my-services`}>
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to My Services
                            </Link>
                        </Button>
                    </div>
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <PanelTitle className="text-merchant-headings-foreground mb-2">
                                {bl.order.service.name}
                            </PanelTitle>
                            <PanelDescription className="flex items-center gap-2">
                                <span className="text-merchant-default-foreground/70">From</span>
                                <span className="text-merchant-default-foreground font-bold">{bl.order.service.vendor.name}</span>
                                <span className="text-merchant-default-foreground/70">•</span>
                                <span className="text-merchant-default-foreground/70">
                                    Ordered {new Date(bl.order.purchaseDate).toLocaleDateString()}
                                </span>
                            </PanelDescription>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            {getStatusBadge(bl.order.status)}
                            {getCategoryBadge(bl.order.service.category)}
                        </div>
                    </div>
                </PanelHeader>

                <PanelContent className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            {bl.order.service.thumbnail && (
                                <div className="relative w-full h-64 rounded-lg overflow-hidden">
                                    <Image
                                        src={bl.order.service.thumbnail.image.media.url}
                                        alt={bl.order.service.name}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            )}

                            <Card>
                                <CardHeader>
                                    <CardTitle>About This Service</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="whitespace-pre-line text-muted-foreground">
                                        {bl.order.service.description}
                                    </p>
                                </CardContent>
                            </Card>

                            {bl.order.questionnaireResponses && bl.order.questionnaireResponses.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Your Questionnaire Responses</CardTitle>
                                        <CardDescription>Information you provided when ordering</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {bl.order.questionnaireResponses.map((response, idx, arr) => (
                                            <div key={response.questionId} className="space-y-1">
                                                <div className="font-medium text-sm">{response.question}</div>
                                                <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                                                    {response.answer}
                                                </div>
                                                {idx < arr.length - 1 && <Separator className="mt-4" />}
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            )}

                            {bl.order.status === "DELIVERED" && bl.order.deliverables && (
                                <Card className="border-green-500/20">
                                    <CardHeader>
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                            <CardTitle>Your Delivery</CardTitle>
                                        </div>
                                        <CardDescription>
                                            Delivered {bl.order.deliverables.deliveredAt ? new Date(bl.order.deliverables.deliveredAt).toLocaleDateString() : 'Recently'}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {bl.order.deliverables.message && (
                                            <div className="bg-muted p-4 rounded-lg">
                                                <p className="text-sm font-medium mb-2">Message from your practitioner:</p>
                                                <p className="text-sm text-muted-foreground whitespace-pre-line">
                                                    {bl.order.deliverables.message}
                                                </p>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <h4 className="text-sm font-medium">Deliverable Files</h4>
                                            {bl.order.deliverables.files.map((file) => (
                                                <div
                                                    key={file.id}
                                                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {getFileIcon(file.mimeType)}
                                                        <div>
                                                            <div className="font-medium text-sm">{file.name}</div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {formatFileSize(file.size)} • Uploaded {new Date(file.uploadedAt).toLocaleDateString()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {file.signedUrl && (
                                                        <Button size="sm" asChild>
                                                            <a href={file.signedUrl} download target="_blank" rel="noopener noreferrer">
                                                                <Download className="w-4 h-4 mr-2" />
                                                                Download
                                                            </a>
                                                        </Button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        <div className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Order Status</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                            <span className="text-sm">Order Placed</span>
                                        </div>
                                        <div className="ml-1 border-l-2 border-dashed border-gray-300 h-4"></div>

                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${bl.order.status === "IN_PROGRESS" || bl.order.status === "DELIVERED" ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                            <span className="text-sm">In Progress</span>
                                        </div>
                                        <div className="ml-1 border-l-2 border-dashed border-gray-300 h-4"></div>

                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${bl.order.status === "DELIVERED" ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                            <span className="text-sm">Delivered</span>
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Order ID:</span>
                                            <span className="font-mono">{bl.order.id.slice(0, 8)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Purchase Date:</span>
                                            <span>{new Date(bl.order.purchaseDate).toLocaleDateString()}</span>
                                        </div>
                                        {bl.order.deliverables?.deliveredAt && (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Delivered:</span>
                                                <span>{new Date(bl.order.deliverables.deliveredAt).toLocaleDateString()}</span>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {bl.order.status !== "DELIVERED" && (
                                <Card className="border-blue-500/20">
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            <Clock className="w-5 h-5 text-blue-500 mt-0.5" />
                                            <div className="text-sm">
                                                <p className="font-medium mb-1">What&apos;s Next?</p>
                                                <p className="text-muted-foreground">
                                                    Your practitioner is working on your service. You&apos;ll receive an email notification when it&apos;s ready.
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>
                </PanelContent>
            </Panel>
        </div>
    );
};

export default UI;

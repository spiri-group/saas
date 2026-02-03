'use client'

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Panel, PanelContent, PanelHeader, PanelTitle } from "@/components/ux/Panel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import useMerchantTheme from "@/app/(site)/m/_hooks/UseMerchantTheme";
import MerchantFontLoader from "@/app/(site)/m/_components/MerchantFontLoader";
import UseCustomerServiceOrders from "./hooks/UseCustomerServiceOrders";
import { FileText, Clock, CheckCircle, AlertCircle, Package } from "lucide-react";

type BLProps = {
    merchantId: string;
    customerId: string;
}

type Props = BLProps & {}

const useBL = (props: BLProps) => {
    const vendorBranding = useMerchantTheme(props.merchantId);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");

    const orders = UseCustomerServiceOrders(
        props.customerId,
        statusFilter === "all" ? undefined : statusFilter
    );

    const filteredOrders = React.useMemo(() => {
        if (!orders.data) return [];
        if (categoryFilter === "all") return orders.data;
        return orders.data.filter(order => order.service.category === categoryFilter);
    }, [orders.data, categoryFilter]);

    return {
        vendorBranding: vendorBranding.data,
        orders: filteredOrders,
        isLoading: orders.isLoading,
        filters: {
            status: {
                value: statusFilter,
                set: setStatusFilter
            },
            category: {
                value: categoryFilter,
                set: setCategoryFilter
            }
        }
    };
};

const UI: React.FC<Props> = (props) => {
    const bl = useBL(props);

    if (!bl.vendorBranding) return null;

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

    const groupedOrders = {
        pending: bl.orders.filter(o => o.status === "PAID"),
        inProgress: bl.orders.filter(o => o.status === "IN_PROGRESS"),
        delivered: bl.orders.filter(o => o.status === "DELIVERED")
    };

    const merchantSlug = bl.vendorBranding.vendor.slug;

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
                    <PanelTitle className="text-merchant-headings-foreground">My Services</PanelTitle>
                </PanelHeader>

                <PanelContent className="space-y-4">
                    <div className="flex gap-3">
                        <Select value={bl.filters.category.value} onValueChange={bl.filters.category.set}>
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Filter by category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                <SelectItem value="READING">Readings</SelectItem>
                                <SelectItem value="HEALING">Healings</SelectItem>
                                <SelectItem value="COACHING">Coaching</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Tabs defaultValue="pending" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="pending">
                                Pending ({groupedOrders.pending.length})
                            </TabsTrigger>
                            <TabsTrigger value="inProgress">
                                In Progress ({groupedOrders.inProgress.length})
                            </TabsTrigger>
                            <TabsTrigger value="delivered">
                                Delivered ({groupedOrders.delivered.length})
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="pending" className="space-y-3 mt-4">
                            {groupedOrders.pending.length === 0 ? (
                                <Card>
                                    <CardContent className="p-6 text-center text-muted-foreground">
                                        No pending services
                                    </CardContent>
                                </Card>
                            ) : (
                                groupedOrders.pending.map((order) => (
                                    <Card key={order.id} className="hover:border-merchant-primary/40 transition-colors">
                                        <CardHeader>
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    {order.service.thumbnail?.image?.media?.url && (
                                                        <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                                                            <Image
                                                                src={order.service.thumbnail.image.media.url}
                                                                alt={order.service.name}
                                                                fill
                                                                className="object-cover"
                                                            />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <CardTitle className="text-lg">{order.service.name}</CardTitle>
                                                        <CardDescription>
                                                            Ordered {new Date(order.purchaseDate).toLocaleDateString()}
                                                        </CardDescription>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    {getStatusBadge(order.status)}
                                                    {getCategoryBadge(order.service.category)}
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground mb-3">
                                                Your practitioner is preparing your service. You&apos;ll be notified when it&apos;s ready.
                                            </p>
                                            <Button variant="outline" asChild>
                                                <Link href={`/m/${merchantSlug}/my-services/${order.id}`}>
                                                    View Details
                                                </Link>
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </TabsContent>

                        <TabsContent value="inProgress" className="space-y-3 mt-4">
                            {groupedOrders.inProgress.length === 0 ? (
                                <Card>
                                    <CardContent className="p-6 text-center text-muted-foreground">
                                        No services in progress
                                    </CardContent>
                                </Card>
                            ) : (
                                groupedOrders.inProgress.map((order) => (
                                    <Card key={order.id} className="hover:border-merchant-primary/40 transition-colors">
                                        <CardHeader>
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    {order.service.thumbnail?.image?.media?.url && (
                                                        <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                                                            <Image
                                                                src={order.service.thumbnail.image.media.url}
                                                                alt={order.service.name}
                                                                fill
                                                                className="object-cover"
                                                            />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <CardTitle className="text-lg">{order.service.name}</CardTitle>
                                                        <CardDescription>
                                                            Ordered {new Date(order.purchaseDate).toLocaleDateString()}
                                                        </CardDescription>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    {getStatusBadge(order.status)}
                                                    {getCategoryBadge(order.service.category)}
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground mb-3">
                                                Your practitioner is working on your service. Check back soon for updates.
                                            </p>
                                            <Button variant="outline" asChild>
                                                <Link href={`/m/${merchantSlug}/my-services/${order.id}`}>
                                                    View Details
                                                </Link>
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </TabsContent>

                        <TabsContent value="delivered" className="space-y-3 mt-4">
                            {groupedOrders.delivered.length === 0 ? (
                                <Card>
                                    <CardContent className="p-6 text-center text-muted-foreground">
                                        No delivered services yet
                                    </CardContent>
                                </Card>
                            ) : (
                                groupedOrders.delivered.map((order) => (
                                    <Card key={order.id} className="hover:border-merchant-primary/40 transition-colors border-green-500/20">
                                        <CardHeader>
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    {order.service.thumbnail?.image?.media?.url && (
                                                        <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                                                            <Image
                                                                src={order.service.thumbnail.image.media.url}
                                                                alt={order.service.name}
                                                                fill
                                                                className="object-cover"
                                                            />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <CardTitle className="text-lg">{order.service.name}</CardTitle>
                                                        <CardDescription>
                                                            Delivered {order.deliverables?.deliveredAt ? new Date(order.deliverables.deliveredAt).toLocaleDateString() : 'Recently'}
                                                        </CardDescription>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    {getStatusBadge(order.status)}
                                                    {getCategoryBadge(order.service.category)}
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex items-center gap-2 text-sm text-green-600 mb-3">
                                                <FileText className="w-4 h-4" />
                                                <span>
                                                    {order.deliverables?.files?.length || 0} file{order.deliverables?.files && order.deliverables.files.length !== 1 ? 's' : ''} ready to download
                                                </span>
                                            </div>
                                            <Button asChild>
                                                <Link href={`/m/${merchantSlug}/my-services/${order.id}`}>
                                                    View & Download
                                                </Link>
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </TabsContent>
                    </Tabs>
                </PanelContent>
            </Panel>
        </div>
    );
};

export default UI;

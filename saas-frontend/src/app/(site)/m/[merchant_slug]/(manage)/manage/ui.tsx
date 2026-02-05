'use client';

import React from "react";
import UIContainer from "@/components/uicontainer";
import WelcomeHeader from "./_components/WelcomeHeader";
import StatsCards from "./_components/StatsCards";
import NeedsAttention, { AttentionItem } from "./_components/NeedsAttention";
import RecentOrders from "./_components/RecentOrders";
import GoLiveChecklist from "./_components/GoLiveChecklist";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, ShoppingCart, MapPin, Plus } from "lucide-react";

// Hooks
import { UseInventoryOverview } from "./inventory/_hooks/UseInventoryOverview";
import UseOrders from "@/app/(site)/m/_components/Order/hooks/UseOrders";
import useMerchantShipments from "./customers/shipments/_hooks/useMerchantShipments";
import useMerchantRefunds from "./customers/refunds/_hooks/useMerchantRefunds";
import { DateTime } from "luxon";

// Create Listing Button Component
const CreateListingButton: React.FC<{
    label: string;
    description: string;
    icon: React.ReactNode;
    dialogId: string;
    dialogClassName?: string;
}> = ({ label, description, icon, dialogId, dialogClassName }) => {
    const handleClick = () => {
        const event = new CustomEvent("open-nav-external", {
            detail: {
                path: [label],
                action: {
                    type: "dialog",
                    dialog: dialogId,
                    className: dialogClassName
                }
            }
        });
        window.dispatchEvent(event);
    };

    return (
        <Card
            className="bg-slate-800/50 border-slate-700 transition-all hover:border-orange-500/50 cursor-pointer group"
            onClick={handleClick}
            data-testid={`create-listing-${label.toLowerCase().replace(' ', '-')}-card`}
        >
            <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/20 text-orange-400">
                        {icon}
                    </div>
                    <div className="flex-1">
                        <CardTitle className="text-base text-white">{label}</CardTitle>
                        <CardDescription className="text-xs text-slate-400">{description}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full bg-transparent border-orange-500/30 text-orange-400 hover:bg-orange-500/20 hover:text-orange-300"
                    data-testid={`create-listing-${label.toLowerCase().replace(' ', '-')}-btn`}
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Create {label}
                </Button>
            </CardContent>
        </Card>
    );
};

// My Listings Section Component
const MyListingsSection: React.FC = () => {
    return (
        <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
                <ShoppingBag className="w-5 h-5 text-orange-400" />
                <h2 className="text-lg font-semibold text-white">My Listings</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CreateListingButton
                    label="Product"
                    description="Physical or digital products for sale"
                    icon={<ShoppingCart className="w-5 h-5" />}
                    dialogId="Create Product"
                />
                <CreateListingButton
                    label="Tour"
                    description="Guided experiences and spiritual journeys"
                    icon={<MapPin className="w-5 h-5" />}
                    dialogId="Create Tour"
                    dialogClassName="w-[870px] h-[700px]"
                />
            </div>
        </div>
    );
};

interface Props {
    merchantId: string;
    merchantSlug: string;
    merchantName: string;
    me: { id: string };
}

const useDashboardData = (merchantId: string) => {
    // Inventory overview
    const inventoryOverview = UseInventoryOverview(merchantId, "default");

    // Orders for this merchant
    const orders = UseOrders(undefined, undefined, undefined, merchantId);

    // Unfinalized shipments (ready to ship)
    const shipments = useMerchantShipments(merchantId);

    // Pending refunds
    const refunds = useMerchantRefunds(merchantId, ["PENDING"]);

    // Calculate orders stats
    const getOrdersStats = () => {
        const allOrders = orders.data || [];

        // Pending = PAID status (paid but not shipped yet)
        const pendingOrders = allOrders.filter(o => o.paid_status === 'PAID');

        // This month's orders
        const startOfMonth = DateTime.now().startOf('month');
        const monthlyOrders = allOrders.filter(o => {
            if (!o.createdDate) return false;
            return DateTime.fromISO(o.createdDate) >= startOfMonth;
        });

        return {
            pending: pendingOrders.length,
            monthly: monthlyOrders.length
        };
    };

    // Get attention items
    const getAttentionItems = (): AttentionItem[] => {
        const items: AttentionItem[] = [];

        // Orders ready to ship (PAID orders with unfinalized shipments)
        const shipmentsCount = shipments.data?.length || 0;
        if (shipmentsCount > 0) {
            items.push({
                id: 'orders_to_ship',
                type: 'orders_to_ship',
                count: shipmentsCount,
                message: `${shipmentsCount} order${shipmentsCount !== 1 ? 's' : ''} ready to ship`,
                href: `/m/${merchantId}/manage/customers/shipments`
            });
        }

        // Pending refunds
        const refundsCount = refunds.data?.length || 0;
        if (refundsCount > 0) {
            items.push({
                id: 'refunds_pending',
                type: 'refunds_pending',
                count: refundsCount,
                message: `${refundsCount} refund request${refundsCount !== 1 ? 's' : ''} pending`,
                href: `/m/${merchantId}/manage/customers/refunds`
            });
        }

        // Low stock items
        const lowStockCount = inventoryOverview.data?.low_stock_items || 0;
        if (lowStockCount > 0) {
            items.push({
                id: 'low_stock',
                type: 'low_stock',
                count: lowStockCount,
                message: `${lowStockCount} item${lowStockCount !== 1 ? 's' : ''} running low`,
                href: `/m/${merchantId}/manage/inventory/alerts`
            });
        }

        return items;
    };

    const isLoading = inventoryOverview.isLoading || orders.isLoading;

    return {
        inventoryOverview,
        orders,
        shipments,
        refunds,
        ordersStats: getOrdersStats(),
        attentionItems: getAttentionItems(),
        isLoading
    };
};

const UI: React.FC<Props> = ({ merchantId, merchantSlug, merchantName, me }) => {
    const data = useDashboardData(merchantId);

    // Fix attention item hrefs to use slug instead of merchantId
    const attentionItemsWithSlug = data.attentionItems.map(item => ({
        ...item,
        href: item.href.replace(merchantId, merchantSlug)
    }));

    const totalProducts = data.inventoryOverview.data?.total_products || 0;
    const isNewMerchant = totalProducts === 0;

    return (
        <UIContainer me={me}>
            <div className="h-screen-minus-nav p-4 md:p-6 overflow-auto">
                <WelcomeHeader merchantName={merchantName} />

                {/* Go Live Checklist - shown until vendor is published */}
                <GoLiveChecklist merchantId={merchantId} />

                {/* My Listings - top for new merchants */}
                {isNewMerchant && <MyListingsSection />}

                {/* Dashboard Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {/* Stats Cards - span 2 */}
                    <div className="md:col-span-2">
                        <StatsCards
                            merchantSlug={merchantSlug}
                            pendingOrdersCount={data.ordersStats.pending}
                            monthlyOrdersCount={data.ordersStats.monthly}
                            lowStockCount={data.inventoryOverview.data?.low_stock_items || 0}
                            outOfStockCount={data.inventoryOverview.data?.out_of_stock_items || 0}
                            isLoading={data.isLoading}
                        />
                    </div>

                    {/* Needs Attention */}
                    <NeedsAttention
                        items={attentionItemsWithSlug}
                        isLoading={data.shipments.isLoading || data.refunds.isLoading}
                    />
                </div>

                {/* Recent Orders - full width */}
                <RecentOrders
                    orders={data.orders.data || []}
                    merchantSlug={merchantSlug}
                    isLoading={data.orders.isLoading}
                />

                {/* My Listings - below orders for established merchants */}
                {!isNewMerchant && <MyListingsSection />}
            </div>
        </UIContainer>
    );
};

export default UI;

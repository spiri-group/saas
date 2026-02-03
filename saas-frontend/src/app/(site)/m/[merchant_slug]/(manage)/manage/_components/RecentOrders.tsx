'use client';

import React from "react";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, ArrowRight } from "lucide-react";
import Link from "next/link";
import { order_type } from "@/utils/spiriverse";
import { DateTime } from "luxon";
import CurrencySpan from "@/components/ux/CurrencySpan";

interface RecentOrdersProps {
    orders: order_type[];
    merchantSlug: string;
    isLoading?: boolean;
}

const getStatusBadge = (paidStatus: string | undefined) => {
    switch (paidStatus) {
        case 'PAID':
            return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">Pending</Badge>;
        case 'SHIPPED':
            return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">Shipped</Badge>;
        case 'DELIVERED':
            return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">Delivered</Badge>;
        case 'REFUNDED':
            return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30 text-xs">Refunded</Badge>;
        default:
            return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30 text-xs">{paidStatus || 'Unknown'}</Badge>;
    }
};

const getOrderTotal = (order: order_type): { amount: number; currency: string } => {
    if (!order.lines || order.lines.length === 0) {
        return { amount: 0, currency: 'AUD' };
    }
    const total = order.lines.reduce((sum, line) => {
        return sum + (line.price?.amount || 0) * (line.quantity || 1);
    }, 0);
    return {
        amount: total,
        currency: order.lines[0]?.price?.currency || 'AUD'
    };
};

const formatCustomerName = (email: string | undefined): string => {
    if (!email) return 'Customer';
    const namePart = email.split('@')[0];
    return namePart.charAt(0).toUpperCase() + namePart.slice(1);
};

const RecentOrders: React.FC<RecentOrdersProps> = ({ orders, merchantSlug, isLoading }) => {
    const recentOrders = orders.slice(0, 5);

    if (isLoading) {
        return (
            <div
                className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50"
                data-testid="recent-orders"
            >
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-blue-400" />
                        <span className="font-medium text-white">Recent Orders</span>
                    </div>
                </div>
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                            <div className="space-y-2">
                                <div className="h-4 bg-slate-700/50 rounded animate-pulse w-24" />
                                <div className="h-3 bg-slate-700/50 rounded animate-pulse w-16" />
                            </div>
                            <div className="h-5 bg-slate-700/50 rounded animate-pulse w-16" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (recentOrders.length === 0) {
        return (
            <div
                className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50"
                data-testid="recent-orders"
            >
                <div className="flex items-center gap-2 mb-3">
                    <ShoppingBag className="w-5 h-5 text-blue-400" />
                    <span className="font-medium text-white">Recent Orders</span>
                </div>
                <p className="text-slate-400 text-sm">
                    No orders yet. Orders will appear here once customers make purchases.
                </p>
            </div>
        );
    }

    return (
        <div
            className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50"
            data-testid="recent-orders"
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-blue-400" />
                    <span className="font-medium text-white">Recent Orders</span>
                </div>
                <Link
                    href={`/m/${merchantSlug}/manage/customers/history`}
                    className="text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1"
                >
                    View all
                    <ArrowRight className="w-3 h-3" />
                </Link>
            </div>
            <div className="space-y-2">
                {recentOrders.map((order) => {
                    const total = getOrderTotal(order);
                    const orderDate = order.createdDate
                        ? DateTime.fromISO(order.createdDate).toRelative()
                        : '';

                    return (
                        <Link
                            key={order.id}
                            href={`/m/${merchantSlug}/manage/customers/history`}
                            className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-700/50 transition-colors"
                            data-testid={`order-row-${order.id}`}
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-white text-sm">
                                        #{order.code || order.id.slice(-6)}
                                    </span>
                                    <span className="text-slate-400 text-sm truncate">
                                        {formatCustomerName(order.customerEmail)}
                                    </span>
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5">
                                    {orderDate}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-white text-sm">
                                    <CurrencySpan value={total} />
                                </span>
                                {getStatusBadge(order.paid_status)}
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};

export default RecentOrders;

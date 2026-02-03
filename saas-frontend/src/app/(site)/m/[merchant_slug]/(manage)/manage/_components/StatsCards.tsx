'use client';

import React from "react";
import { ShoppingBag, Package, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface StatsCardsProps {
    merchantSlug: string;
    pendingOrdersCount: number;
    monthlyOrdersCount: number;
    lowStockCount: number;
    outOfStockCount: number;
    isLoading?: boolean;
}

const StatsCards: React.FC<StatsCardsProps> = ({
    merchantSlug,
    pendingOrdersCount,
    monthlyOrdersCount,
    lowStockCount,
    outOfStockCount,
    isLoading
}) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="stats-cards">
            {/* Orders Card */}
            <Link href={`/m/${merchantSlug}/manage/customers/history`}>
                <div
                    className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:border-slate-600 transition-colors cursor-pointer"
                    data-testid="orders-stats-card"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <ShoppingBag className="w-5 h-5 text-blue-400" />
                        <span className="font-medium text-white">Orders</span>
                    </div>
                    {isLoading ? (
                        <div className="space-y-2">
                            <div className="h-6 bg-slate-700/50 rounded animate-pulse w-24" />
                            <div className="h-4 bg-slate-700/50 rounded animate-pulse w-20" />
                        </div>
                    ) : (
                        <>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-white">{pendingOrdersCount}</span>
                                <span className="text-sm text-slate-400">pending</span>
                            </div>
                            <div className="text-sm text-slate-500 mt-1">
                                {monthlyOrdersCount} this month
                            </div>
                        </>
                    )}
                </div>
            </Link>

            {/* Inventory Card */}
            <Link href={`/m/${merchantSlug}/manage/inventory`}>
                <div
                    className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:border-slate-600 transition-colors cursor-pointer"
                    data-testid="inventory-stats-card"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <Package className="w-5 h-5 text-amber-400" />
                        <span className="font-medium text-white">Inventory</span>
                    </div>
                    {isLoading ? (
                        <div className="space-y-2">
                            <div className="h-6 bg-slate-700/50 rounded animate-pulse w-24" />
                            <div className="h-4 bg-slate-700/50 rounded animate-pulse w-20" />
                        </div>
                    ) : (
                        <>
                            <div className="flex items-baseline gap-2">
                                {lowStockCount > 0 && (
                                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                                )}
                                <span className="text-3xl font-bold text-white">{lowStockCount}</span>
                                <span className="text-sm text-slate-400">low stock</span>
                            </div>
                            <div className="text-sm text-slate-500 mt-1">
                                {outOfStockCount} out of stock
                            </div>
                        </>
                    )}
                </div>
            </Link>
        </div>
    );
};

export default StatsCards;

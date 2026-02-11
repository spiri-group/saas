'use client';

import React from "react";
import { AlertCircle, Package, RotateCcw, AlertTriangle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export interface AttentionItem {
    id: string;
    type: 'orders_to_ship' | 'refunds_pending' | 'low_stock';
    count: number;
    message: string;
    href: string;
}

interface NeedsAttentionProps {
    items: AttentionItem[];
    isLoading?: boolean;
}

const NeedsAttention: React.FC<NeedsAttentionProps> = ({ items, isLoading }) => {
    const getIcon = (type: AttentionItem['type']) => {
        switch (type) {
            case 'orders_to_ship':
                return <Package className="w-4 h-4 text-orange-400" />;
            case 'refunds_pending':
                return <RotateCcw className="w-4 h-4 text-orange-400" />;
            case 'low_stock':
                return <AlertTriangle className="w-4 h-4 text-red-400" />;
            default:
                return <AlertCircle className="w-4 h-4 text-slate-400" />;
        }
    };

    const filteredItems = items.filter(item => item.count > 0);

    if (isLoading) {
        return (
            <div
                className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 h-full"
                data-testid="needs-attention"
            >
                <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-5 h-5 text-orange-400" />
                    <span className="font-medium text-white">Needs Attention</span>
                </div>
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-5 bg-slate-700/50 rounded animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (filteredItems.length === 0) {
        return (
            <div
                className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 h-full"
                data-testid="needs-attention"
            >
                <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="font-medium text-white">All Caught Up</span>
                </div>
                <p className="text-slate-400 text-sm">
                    Nothing needs your attention right now.
                </p>
            </div>
        );
    }

    return (
        <div
            className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 h-full"
            data-testid="needs-attention"
        >
            <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-orange-400" />
                <span className="font-medium text-white">Needs Attention</span>
            </div>
            <ul className="space-y-2">
                {filteredItems.map((item) => (
                    <li key={item.id}>
                        <Link
                            href={item.href}
                            className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors py-1"
                            data-testid={`attention-item-${item.type}`}
                        >
                            {getIcon(item.type)}
                            <span>{item.message}</span>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default NeedsAttention;

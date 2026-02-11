'use client';

import React from "react";
import { AlertCircle, Calendar, Sparkles, HeartHandshake, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { AttentionItem } from "../_hooks/usePractitionerDashboardData";

interface NeedsAttentionProps {
    items: AttentionItem[];
    isLoading?: boolean;
}

const NeedsAttention: React.FC<NeedsAttentionProps> = ({ items, isLoading }) => {
    const getIcon = (type: AttentionItem['type']) => {
        switch (type) {
            case 'pending_bookings':
                return <Calendar className="w-4 h-4 text-purple-400" />;
            case 'new_orders':
                return <Sparkles className="w-4 h-4 text-amber-400" />;
            case 'partnership_requests':
                return <HeartHandshake className="w-4 h-4 text-pink-400" />;
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
                    <AlertCircle className="w-5 h-5 text-purple-400" />
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
                <AlertCircle className="w-5 h-5 text-purple-400" />
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

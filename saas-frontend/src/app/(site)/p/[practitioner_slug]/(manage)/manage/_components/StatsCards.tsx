'use client';

import React from "react";
import { Calendar, ShoppingBag, Star } from "lucide-react";
import Link from "next/link";

interface StatsCardsProps {
    slug: string;
    upcomingCount: number;
    pendingBookingsCount: number;
    inProgressOrdersCount: number;
    newOrdersCount: number;
    testimonialsCount: number;
    avgRating: number;
    isLoading?: boolean;
}

const StatsCards: React.FC<StatsCardsProps> = ({
    slug,
    upcomingCount,
    pendingBookingsCount,
    inProgressOrdersCount,
    newOrdersCount,
    testimonialsCount,
    avgRating,
    isLoading,
}) => {
    const renderStars = (rating: number) => {
        const rounded = Math.round(rating * 2) / 2;
        return (
            <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                            i <= rounded
                                ? 'text-amber-400 fill-amber-400'
                                : i - 0.5 <= rounded
                                    ? 'text-amber-400 fill-amber-400/50'
                                    : 'text-slate-600'
                        }`}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="stats-cards">
            {/* Bookings Card */}
            <Link href={`/p/${slug}/manage/bookings`}>
                <div
                    className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:border-slate-600 transition-colors cursor-pointer"
                    data-testid="bookings-stats-card"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-5 h-5 text-purple-400" />
                        <span className="font-medium text-white">Bookings</span>
                    </div>
                    {isLoading ? (
                        <div className="space-y-2">
                            <div className="h-6 bg-slate-700/50 rounded animate-pulse w-24" />
                            <div className="h-4 bg-slate-700/50 rounded animate-pulse w-20" />
                        </div>
                    ) : (
                        <>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-white">{upcomingCount}</span>
                                <span className="text-sm text-slate-400">upcoming</span>
                            </div>
                            <div className="text-sm text-slate-500 mt-1">
                                {pendingBookingsCount} pending confirmation
                            </div>
                        </>
                    )}
                </div>
            </Link>

            {/* Client Orders Card */}
            <Link href={`/p/${slug}/manage/services/orders`}>
                <div
                    className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:border-slate-600 transition-colors cursor-pointer"
                    data-testid="orders-stats-card"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <ShoppingBag className="w-5 h-5 text-purple-400" />
                        <span className="font-medium text-white">Client Orders</span>
                    </div>
                    {isLoading ? (
                        <div className="space-y-2">
                            <div className="h-6 bg-slate-700/50 rounded animate-pulse w-24" />
                            <div className="h-4 bg-slate-700/50 rounded animate-pulse w-20" />
                        </div>
                    ) : (
                        <>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-white">{inProgressOrdersCount}</span>
                                <span className="text-sm text-slate-400">in progress</span>
                            </div>
                            <div className="text-sm text-slate-500 mt-1">
                                {newOrdersCount} new to fulfill
                            </div>
                        </>
                    )}
                </div>
            </Link>

            {/* Reviews Card */}
            <Link href={`/p/${slug}/manage/testimonials`}>
                <div
                    className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:border-slate-600 transition-colors cursor-pointer"
                    data-testid="reviews-stats-card"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <Star className="w-5 h-5 text-purple-400" />
                        <span className="font-medium text-white">Reviews</span>
                    </div>
                    {isLoading ? (
                        <div className="space-y-2">
                            <div className="h-6 bg-slate-700/50 rounded animate-pulse w-24" />
                            <div className="h-4 bg-slate-700/50 rounded animate-pulse w-20" />
                        </div>
                    ) : (
                        <>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-white">{testimonialsCount}</span>
                                <span className="text-sm text-slate-400">total</span>
                            </div>
                            <div className="mt-1">
                                {testimonialsCount > 0 ? (
                                    <div className="flex items-center gap-2">
                                        {renderStars(avgRating)}
                                        <span className="text-sm text-slate-500">{avgRating.toFixed(1)}</span>
                                    </div>
                                ) : (
                                    <span className="text-sm text-slate-500">No reviews yet</span>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </Link>
        </div>
    );
};

export default StatsCards;

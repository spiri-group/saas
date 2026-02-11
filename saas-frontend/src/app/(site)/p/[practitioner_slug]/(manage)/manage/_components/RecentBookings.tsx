'use client';

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";
import { DateTime } from "luxon";
import { ScheduledBooking } from "../bookings/hooks/UsePendingBookings";

interface RecentBookingsProps {
    bookings: ScheduledBooking[];
    slug: string;
    isLoading?: boolean;
}

const getDeliveryBadge = (method: string) => {
    switch (method) {
        case 'ONLINE':
            return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">Online</Badge>;
        case 'AT_PRACTITIONER':
            return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">In-Person</Badge>;
        case 'MOBILE':
            return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">Mobile</Badge>;
        default:
            return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30 text-xs">{method}</Badge>;
    }
};

const RecentBookings: React.FC<RecentBookingsProps> = ({ bookings, slug, isLoading }) => {
    const nextBookings = bookings.slice(0, 5);

    if (isLoading) {
        return (
            <div
                className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50"
                data-testid="recent-bookings"
            >
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-purple-400" />
                        <span className="font-medium text-white">Upcoming Bookings</span>
                    </div>
                </div>
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                            <div className="space-y-2">
                                <div className="h-4 bg-slate-700/50 rounded animate-pulse w-32" />
                                <div className="h-3 bg-slate-700/50 rounded animate-pulse w-20" />
                            </div>
                            <div className="h-5 bg-slate-700/50 rounded animate-pulse w-16" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (nextBookings.length === 0) {
        return (
            <div
                className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50"
                data-testid="recent-bookings"
            >
                <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-5 h-5 text-purple-400" />
                    <span className="font-medium text-white">Upcoming Bookings</span>
                </div>
                <p className="text-slate-400 text-sm">
                    No upcoming bookings yet. Bookings will appear here once clients schedule sessions.
                </p>
            </div>
        );
    }

    return (
        <div
            className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50"
            data-testid="recent-bookings"
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-400" />
                    <span className="font-medium text-white">Upcoming Bookings</span>
                </div>
                <Link
                    href={`/p/${slug}/manage/bookings`}
                    className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
                >
                    View all
                    <ArrowRight className="w-3 h-3" />
                </Link>
            </div>
            <div className="space-y-2">
                {nextBookings.map((booking) => {
                    const bookingDate = booking.scheduledDateTime?.date
                        ? DateTime.fromISO(booking.scheduledDateTime.date).toRelative()
                        : '';
                    const timeRange = booking.scheduledDateTime?.time
                        ? `${booking.scheduledDateTime.time.start} - ${booking.scheduledDateTime.time.end}`
                        : '';

                    return (
                        <Link
                            key={booking.id}
                            href={`/p/${slug}/manage/bookings`}
                            className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-700/50 transition-colors"
                            data-testid={`booking-row-${booking.id}`}
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-white text-sm truncate">
                                        {booking.service?.name || 'Session'}
                                    </span>
                                    <span className="text-slate-400 text-sm truncate">
                                        {booking.customer?.name || 'Client'}
                                    </span>
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5">
                                    {bookingDate}{timeRange ? ` \u00B7 ${timeRange}` : ''}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                                {getDeliveryBadge(booking.deliveryMethod)}
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};

export default RecentBookings;

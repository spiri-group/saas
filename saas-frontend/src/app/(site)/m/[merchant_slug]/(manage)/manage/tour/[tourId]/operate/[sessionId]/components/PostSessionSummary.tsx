'use client';

import React, { useMemo, useState, useEffect } from "react";
import { Panel, PanelHeader, PanelTitle } from "@/components/ux/Panel";
import { Badge } from "@/components/ui/badge";
import { Users, CheckCircle2, AlertCircle, DollarSign, XCircle } from "lucide-react";
import { recordref_type } from "@/utils/spiriverse";
import UseSessionBookings from "./SessionOnBooking/hooks/UseSessionBookings";
import CurrencySpan from "@/components/ux/CurrencySpan";
import { isBookingPaid } from "../utils";
import { useQuery } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";
import { session_type } from "@/utils/spiriverse";
import { DateTime } from "luxon";
import { useParams } from "next/navigation";

type Props = {
    sessionRef: recordref_type;
};

const PostSessionSummary: React.FC<Props> = ({ sessionRef }) => {
    const params = useParams<{ merchant_slug: string, tourId: string, sessionId: string }>();
    const merchantId = params?.merchant_slug?.split("-").pop() || "";
    const { data: bookings } = UseSessionBookings(sessionRef);

    // Session time awareness — shares cache with header
    const sessionTimeQuery = useQuery({
        queryKey: ['session-header', merchantId, params?.tourId, params?.sessionId],
        queryFn: async () => {
            const { session } = await gql<{ session: session_type }>(
                `query get_session($vendorId: ID!, $listingId: ID!, $sessionId: ID!) {
                    session(vendorId: $vendorId, listingId: $listingId, sessionId: $sessionId) {
                        date, time { start end }
                    }
                }`, { vendorId: merchantId, listingId: params?.tourId, sessionId: params?.sessionId }
            );
            return {
                start: DateTime.fromISO(`${session.date}T${session.time.start}`),
                end: DateTime.fromISO(`${session.date}T${session.time.end}`)
            };
        },
        enabled: !!merchantId && !!params?.tourId && !!params?.sessionId,
        staleTime: 60000,
    });

    const [now, setNow] = useState(DateTime.now());
    useEffect(() => {
        const interval = setInterval(() => setNow(DateTime.now()), 30000);
        return () => clearInterval(interval);
    }, []);

    const sessionStarted = sessionTimeQuery.data ? now >= sessionTimeQuery.data.start : false;

    const stats = useMemo(() => {
        if (!bookings) return null;

        const total = bookings.length;
        const checkedIn = bookings.filter(b => b.checkedIn != null).length;
        const noShows = sessionStarted ? bookings.filter(b => b.checkedIn == null && isBookingPaid(b)).length : 0;
        const cancelled = bookings.filter(b => String(b.ticketStatus) === 'CANCELLED').length;
        const totalRevenue = bookings.reduce((sum, b) => {
            if (isBookingPaid(b) && b.totalAmount) return sum + b.totalAmount.amount;
            return sum;
        }, 0);
        const currency = bookings.find(b => b.totalAmount)?.totalAmount?.currency || 'AUD';
        const checkInRate = total > 0 ? Math.round((checkedIn / total) * 100) : 0;

        return { total, checkedIn, noShows, cancelled, totalRevenue, currency, checkInRate };
    }, [bookings, sessionStarted]);

    if (!stats) return null;

    return (
        <div className="space-y-4" data-testid="post-session-summary">
            <Panel dark>
                <PanelHeader>
                    <PanelTitle as="h2">Session Summary</PanelTitle>
                </PanelHeader>

                {/* Big stats grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div className="flex flex-col items-center p-4 bg-muted/50 rounded-lg">
                        <Users className="w-6 h-6 text-muted-foreground mb-1" />
                        <span className="text-3xl font-bold">{stats.total}</span>
                        <span className="text-sm text-muted-foreground">Total Bookings</span>
                    </div>
                    <div className="flex flex-col items-center p-4 bg-green-100 rounded-lg">
                        <CheckCircle2 className="w-6 h-6 text-green-600 mb-1" />
                        <span className="text-3xl font-bold text-green-700">{stats.checkedIn}</span>
                        <span className="text-sm text-muted-foreground">Checked In</span>
                    </div>
                    <div className="flex flex-col items-center p-4 bg-yellow-100 rounded-lg">
                        <AlertCircle className="w-6 h-6 text-yellow-600 mb-1" />
                        <span className="text-3xl font-bold text-yellow-700">
                            {sessionStarted ? stats.noShows : '—'}
                        </span>
                        <span className="text-sm text-muted-foreground">
                            {sessionStarted ? 'No-Shows' : 'No-Shows (after start)'}
                        </span>
                    </div>
                    <div className="flex flex-col items-center p-4 bg-blue-100 rounded-lg">
                        <DollarSign className="w-6 h-6 text-blue-600 mb-1" />
                        <CurrencySpan className="text-2xl font-bold text-blue-700" value={{ amount: stats.totalRevenue, currency: stats.currency }} />
                        <span className="text-sm text-muted-foreground">Revenue</span>
                    </div>
                </div>

                {/* Check-in rate bar */}
                <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Check-in Rate</span>
                        <span className="text-sm font-bold">{stats.checkInRate}%</span>
                    </div>
                    <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-green-500 rounded-full transition-all"
                            style={{ width: `${stats.checkInRate}%` }}
                        />
                    </div>
                </div>

                {/* No-show list */}
                {sessionStarted && stats.noShows > 0 && bookings && (
                    <div className="mt-6">
                        <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-yellow-600" />
                            Guests Who Didn&apos;t Show ({stats.noShows})
                        </h3>
                        <div className="space-y-1">
                            {bookings
                                .filter(b => b.checkedIn == null && isBookingPaid(b))
                                .map(b => (
                                    <div key={b.id} className="flex items-center justify-between py-2 px-3 bg-yellow-50 rounded text-sm">
                                        <span>
                                            {b.user?.firstname} {b.user?.lastname}
                                            {b.code && <span className="font-mono text-xs text-muted-foreground ml-2">#{b.code}</span>}
                                        </span>
                                        {b.customerEmail && (
                                            <a href={`mailto:${b.customerEmail}`} className="text-sm text-blue-600 hover:underline">
                                                {b.customerEmail}
                                            </a>
                                        )}
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                )}

                {/* Not started message */}
                {!sessionStarted && (
                    <p className="mt-4 text-sm text-muted-foreground">
                        No-show data will appear after the session start time.
                    </p>
                )}

                {/* Cancelled bookings */}
                {stats.cancelled > 0 && (
                    <div className="mt-4">
                        <Badge variant="danger" className="gap-1">
                            <XCircle className="w-3 h-3" />
                            {stats.cancelled} cancelled
                        </Badge>
                    </div>
                )}
            </Panel>
        </div>
    );
};

export default PostSessionSummary;

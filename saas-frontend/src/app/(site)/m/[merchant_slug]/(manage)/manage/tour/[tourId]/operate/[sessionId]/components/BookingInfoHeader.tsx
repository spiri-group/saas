'use client'

import { gql } from "@/lib/services/gql";
import { session_type } from "@/utils/spiriverse";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { useState, useEffect } from "react";
import { Loader2, AlertCircle, Clock, Play, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const useSessionHeader = () => {
    const params = useParams<{ sessionId: string, tourId: string, merchant_slug: string }>();
    if (params == null) throw new Error("params is null");

    const merchantId = params.merchant_slug?.split("-").pop() || "";

    return useQuery({
        queryKey: ['session-header', merchantId, params.tourId, params.sessionId],
        queryFn: async () => {
            const { session } = await gql<{ session: session_type }>(
                `
                query get_session($vendorId: ID!, $listingId: ID!, $sessionId: ID!) {
                    session(vendorId: $vendorId, listingId: $listingId, sessionId: $sessionId) {
                        sessionTitle,
                        capacity {
                            max
                            current
                            remaining
                            mode
                        },
                        date,
                        time {
                            start
                            end
                        }
                        bookings {
                            id,
                        }
                    }
                }
                `, {
                    vendorId: merchantId,
                    listingId: params.tourId,
                    sessionId: params.sessionId
                }
            );
            return {
                date: DateTime.fromISO(session.date).toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY),
                title: session.sessionTitle,
                capacity: {
                    current: session.capacity.current || 0,
                    max: session.capacity.max,
                    remaining: session.capacity.remaining || session.capacity.max,
                    percentage: session.capacity.max > 0 ? ((session.capacity.current || 0) / session.capacity.max) * 100 : 0,
                    mode: session.capacity.mode
                },
                timeline: {
                    start: DateTime.fromISO(`${session.date}T${session.time.start}`),
                    finish: DateTime.fromISO(`${session.date}T${session.time.end}`)
                }
            };
        },
        enabled: !!merchantId && !!params.tourId && !!params.sessionId,
        refetchInterval: 10000,
    });
};

/** Returns a human-readable session status based on current time */
const useSessionStatus = (timeline: { start: DateTime; finish: DateTime } | undefined) => {
    const [now, setNow] = useState(DateTime.now());

    useEffect(() => {
        const interval = setInterval(() => setNow(DateTime.now()), 10000);
        return () => clearInterval(interval);
    }, []);

    if (!timeline) return null;

    const { start, finish } = timeline;

    if (now < start) {
        const diff = start.diff(now, ['hours', 'minutes']);
        const hours = Math.floor(diff.hours);
        const mins = Math.ceil(diff.minutes);
        const label = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;
        return { state: 'upcoming' as const, label: `Starts in ${label}` };
    }

    if (now >= start && now < finish) {
        const diff = finish.diff(now, ['hours', 'minutes']);
        const hours = Math.floor(diff.hours);
        const mins = Math.ceil(diff.minutes);
        const label = hours > 0 ? `${hours}h ${mins}m left` : `${mins} min left`;
        return { state: 'active' as const, label };
    }

    return { state: 'ended' as const, label: 'Session ended' };
};

const BookingInfoHeader: React.FC = () => {
    const { data: session, isLoading, isError } = useSessionHeader();
    const status = useSessionStatus(session?.timeline);

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 text-sm ml-auto text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading session...</span>
            </div>
        );
    }

    if (isError || !session) {
        return (
            <div className="flex items-center gap-2 text-sm ml-auto text-muted-foreground">
                <AlertCircle className="w-5 h-5" />
                <span>Could not load session details</span>
            </div>
        );
    }

    return (
        <div className="flex flex-row items-center gap-4 ml-auto" data-testid="session-info-header">
            {/* Large guest count — visible from arm's length on iPad */}
            <div className="flex flex-col items-center justify-center min-w-[80px] md:min-w-[100px]" data-testid="guest-count-display">
                <span className="text-3xl md:text-5xl font-bold tabular-nums leading-none">
                    {session.capacity.current}
                </span>
                <span className="text-xs md:text-sm text-muted-foreground">
                    of {session.capacity.max}
                </span>
                <div className="w-full h-1.5 md:h-2 bg-muted rounded-full mt-1 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all ${
                            session.capacity.percentage >= 90 ? 'bg-red-500' :
                            session.capacity.percentage >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(session.capacity.percentage, 100)}%` }}
                    />
                </div>
            </div>

            {/* Session details */}
            <div className="flex flex-col text-sm md:text-base">
                <h1 className="text-sm md:text-base lg:text-lg font-semibold">{session.title}</h1>
                <div className="flex flex-row flex-wrap gap-x-2 text-muted-foreground">
                    <span>{session.date}</span>
                    <span className="hidden sm:inline">|</span>
                    <span>{session.timeline.start.toLocaleString(DateTime.TIME_SIMPLE)} to {session.timeline.finish.toLocaleString(DateTime.TIME_SIMPLE)}</span>
                </div>
                <div className="flex flex-row items-center gap-2 mt-1">
                    <span className={session.capacity.remaining === 0 ? "text-red-500 font-bold" : "text-green-600"}>
                        {session.capacity.remaining} {session.capacity.mode === 'PER_PERSON' ? 'spots' : 'slots'} remaining
                    </span>
                    {status && (
                        <Badge
                            variant={status.state === 'active' ? 'success' : status.state === 'ended' ? 'secondary' : 'info'}
                            className="gap-1 text-xs"
                            data-testid="session-status-badge"
                        >
                            {status.state === 'active' ? <Play className="w-3 h-3" /> :
                             status.state === 'ended' ? <CheckCircle2 className="w-3 h-3" /> :
                             <Clock className="w-3 h-3" />}
                            {status.label}
                        </Badge>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BookingInfoHeader;

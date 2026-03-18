'use client'

import PersonWalking from "@/icons/person-walking";
import { DateTime } from "luxon";
import React, { useState } from "react"
import { useRouter } from "next/navigation";
import { Panel, PanelContent, PanelHeader } from "@/components/ux/Panel";
import { Button } from "@/components/ui/button";
import UseSessions from "./hooks/UseSessions";
import UseActivateSession from "./hooks/UseActivateSession";
import SessionsSummaryComponent from "../SessionsSummary";

const useBL = (merchantId?: string) => {
    const router = useRouter();

    const [from, ] = useState<DateTime>(DateTime.local().minus({ hours: 2 }));
    const [to, ] = useState<DateTime>(DateTime.local().plus({ months: 2 }));
    const {data, isLoading, isRefetching} = UseSessions(from, to, merchantId);

    return {
        router,
        merchantId: merchantId ?? null,
        sessions: {
            isLoading: isLoading || isRefetching,
            get: data ?? []
        }
    }
}

type SessionsProps = {
    merchantId?: string;
    canOperate?: boolean;
};

const SessionsComponent : React.FC<SessionsProps> = ({ merchantId, canOperate = false }) => {
    const bl = useBL(merchantId);

    const formatter = new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });

    const thresholds = {
        0: { color: 'red-600' },
        1: { color: 'orange-600' },
        0.50: { color: 'yellow-600' },
        0.80: { color: 'green-600' }
    };

    const activateSession = UseActivateSession();

    return (   
        <div className="flex-grow flex flex-col h-0 md:h-auto">
            { !bl.sessions.isLoading && <SessionsSummaryComponent thresholds={thresholds} /> }
            <Panel className="flex flex-col flex-grow h-0 md:h-auto">
                <PanelHeader>Sessions</PanelHeader>
                <PanelContent className="overflow-y-auto flex-grow">
                    {bl.sessions.isLoading ? (<span className="text-sm text-slate-400"> Loading sessions... </span>) : <></>}
                    {!bl.sessions.isLoading && bl.sessions.get.length == 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            <PersonWalking fillVariant="accent" height={40} className="mx-auto mb-3 opacity-30" />
                            <p className="text-sm">No upcoming sessions</p>
                            <p className="text-xs mt-1">Select a tour and pick dates on the left to schedule sessions</p>
                        </div>
                    ) :
                        (
                            <ul className="flex flex-col divide-y divide-slate-300">
                                {
                                    bl.sessions.get.map((session) => {
                                        const timeline = {
                                            start: DateTime.fromISO(`${session.date}T${session.time.start}`),
                                            finish: DateTime.fromISO(`${session.date}T${session.time.end}`)
                                        }

                                        const current = session.capacity.current || 0;
                                        const max = session.capacity.max || 1;
                                        const remaining = session.capacity.remaining || max;
                                        const bookedPercent = max > 0 ? current / max : 0;

                                        const isNow = timeline.start <= DateTime.local() && DateTime.local() <= timeline.finish;
                                        const barColor = bookedPercent >= 0.9 ? 'bg-red-500' : bookedPercent >= 0.7 ? 'bg-amber-500' : bookedPercent >= 0.4 ? 'bg-blue-500' : 'bg-slate-400';

                                        return (
                                            <li key={session.id} className="py-3 px-3">
                                                <div className="flex flex-row items-start gap-3">
                                                    <div className="hidden md:flex items-center justify-center bg-slate-800 h-12 w-12 rounded-lg flex-shrink-0">
                                                        <PersonWalking fillVariant="accent" height={28} />
                                                    </div>
                                                    <div className="flex-grow min-w-0">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <div>
                                                                <span className="font-semibold text-sm">{session.sessionTitle}</span>
                                                                {isNow && <span className="ml-2 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-medium">LIVE</span>}
                                                            </div>
                                                            <span className="text-xs text-slate-400">{isNow ? "Now" : timeline.start.toRelative()}</span>
                                                        </div>
                                                        <div className="text-xs text-slate-400 mb-2">
                                                            {DateTime.fromISO(session.date).toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY)} · {timeline.start.toLocaleString(DateTime.TIME_SIMPLE)} – {timeline.finish.toLocaleString(DateTime.TIME_SIMPLE)}
                                                        </div>
                                                        {/* Capacity bar */}
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className="flex-grow h-2 bg-slate-700 rounded-full overflow-hidden">
                                                                <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${Math.min(bookedPercent * 100, 100)}%` }} />
                                                            </div>
                                                            <span className="text-xs text-slate-300 whitespace-nowrap">
                                                                {current}/{max}
                                                                {remaining === 0 && <span className="text-red-400 font-medium ml-1">FULL</span>}
                                                                {remaining > 0 && remaining <= 5 && <span className="text-amber-400 ml-1">({remaining} left)</span>}
                                                            </span>
                                                        </div>
                                                        {canOperate && bl.merchantId != null && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={async () => {
                                                                    await activateSession.mutation.mutateAsync(session.ref);
                                                                    bl.router.push(`/m/${bl.merchantId}/tour/${session.forObject.id}/operate/${session.ref.id}`)
                                                                }}
                                                            >
                                                                Operate Session
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </li>
                                        )
                                    })
                                }
                            </ul>
                        )
                    }
                </PanelContent>
            </Panel>
        </div>
    )
}

export default SessionsComponent;
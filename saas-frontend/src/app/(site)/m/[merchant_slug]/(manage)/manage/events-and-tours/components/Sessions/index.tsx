'use client'

import { Separator } from "@/components/ui/separator";
import PersonWalking from "@/icons/person-walking";
import { DateTime } from "luxon";
import React, { useState } from "react"
import { useParams, useRouter } from "next/navigation";
import { Panel, PanelContent, PanelHeader } from "@/components/ux/Panel";
import { Button } from "@/components/ui/button";
import UseSessions from "./hooks/UseSessions";
import UseActivateSession from "./hooks/UseActivateSession";
import SessionsSummaryComponent from "../SessionsSummary";

const useBL = () => {
    const params = useParams();
    const router = useRouter();

    const [from, ] = useState<DateTime>(DateTime.local().minus({ hours: 2 }));
    const [to, ] = useState<DateTime>(DateTime.local().plus({ months: 2 }));
    const {data, isLoading, isRefetching} = UseSessions(from, to, params == null ? undefined : params.merchantId as string);

    return {
        router,
        merchantId: params != null && params.merchantId != null ? params.merchantId : null,
        sessions: {
            isLoading: isLoading || isRefetching,
            get: data ?? []
        }
    }
}

const SessionsComponent : React.FC = () => {
    const bl = useBL();

    const formatter = new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });

    const thresholds = {
        0: { color: 'red-600' },
        1: { color: 'orange-600'},
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
                    {bl.sessions.isLoading ? (<span> Loading your sessions, give us a moment... </span>) : <></>}
                    {!bl.sessions.isLoading && bl.sessions.get.length == 0 ? (<span>You have no sessions, create one now using the scheduler on the left.</span>) :
                        (
                            <ul className="flex flex-col divide-y divide-slate-300">
                                {
                                    bl.sessions.get.map((session) => {
                                        const timeline = {
                                            start: DateTime.fromISO(`${session.date}T${session.time.start}`),
                                            finish: DateTime.fromISO(`${session.date}T${session.time.end}`)
                                        }

                                        let fillColor = "text-white";

                                        const current = session.capacity.current || 0;
                                        const max = session.capacity.max || 1;
                                        const remaining = session.capacity.remaining || max;
                                        const bookedPercent = max > 0 ? current / max : 0;
                                        const threshold = Object.keys(thresholds ?? {}).find((key) => bookedPercent >= parseInt(key));
                                        if (threshold !== undefined) {
                                            fillColor = `text-${thresholds?.[parseInt(threshold)].color}`;
                                        }

                                        const capacityLabel = session.capacity.mode === 'PER_PERSON' ? 'people' : 'spots';

                                        return (
                                            <li key={session.id} className="flex flex-row items-center space-x-2 py-2 px-3">
                                                <div className="hidden md:block p-2 flex items-center justify-center bg-accent2 bg-opacity-60 h-16 w-16 rounded-md">
                                                    <PersonWalking fillVariant="accent" height={40} />
                                                </div>
                                                <div className="flex flex-col space-y-2 flex-grow">
                                                    <div className="flex flex-row space-x-2 items-center">
                                                        <div className="flex flex-col">
                                                            <span className="text-lg font-bold"> { timeline.start <= DateTime.local() && DateTime.local() <= timeline.finish ? "Now" : timeline.start.toRelative()}</span>
                                                            <span> { DateTime.fromISO(session.date).toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY) } </span>
                                                        </div>
                                                        <div className="flex flex-col flex-grow">
                                                            <span> {session.sessionTitle}</span>
                                                            <span> {timeline.start.toLocaleString(DateTime.TIME_SIMPLE)} - {timeline.finish.toLocaleString(DateTime.TIME_SIMPLE)} </span>
                                                        </div>
                                                        <div className="mr-3 flex flex-col">
                                                            <span className={`font-bold text-md ${fillColor}`}>
                                                                {`${formatter.format(bookedPercent)}`} booked
                                                            </span>
                                                            <span>
                                                                {current}/{max} {capacityLabel}
                                                                {remaining === 0 && <span className="text-red-500 font-bold ml-1">(FULL)</span>}
                                                                {remaining > 0 && remaining <= 5 && <span className="text-orange-500 ml-1">({remaining} left)</span>}
                                                                <Button variant="link" className="">view details</Button>
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {bl.merchantId != null && (
                                                        <div className="flex flex-row space-x-2 items-center">
                                                            <Button 
                                                                variant="default"
                                                                onClick={async () => {
                                                                    await activateSession.mutation.mutateAsync(session.ref);
                                                                    bl.router.push(`/m/${bl.merchantId}/tour/${session.forObject.id}/operate/${session.ref.id}`)
                                                                }} className="">
                                                                Operate
                                                            </Button>
                                                            {/* <Separator orientation="vertical" />
                                                            <Button variant="link" className="">Change date</Button> */}
                                                            <Separator orientation="vertical" />
                                                            <Button variant="link" className="">Refund session</Button>
                                                        </div>
                                                    )}
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
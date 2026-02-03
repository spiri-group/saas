'use client'

import {gql} from "@/lib/services/gql";
import { session_type } from "@/utils/spiriverse";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DateTime } from "luxon";


const useBL = () => {
    const params = useParams<{sessionId: string, tourId: string, merchantId: string}>();
    if (params == null) throw new Error("params is null");

    const [session, setSession] = useState<session_type | null>(null);

    useEffect(() => { 

        const process = async () => {

            const sessionQuery = await gql<any>(
                `
                        query get_session($vendorId: ID!, $listingId: ID!, $sessionId: ID!)  {
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
                `,{
                    vendorId: params?.merchantId,
                    listingId: params?.tourId,
                    sessionId: params?.sessionId
                }
            )
            
            if (sessionQuery.errors != null) throw new Error(sessionQuery.errors[0].message);
            if (sessionQuery.data == null) throw new Error("No data returned from server");
            setSession(sessionQuery.data.session)
        }

        if (params.merchantId != null && params.tourId != null && params.sessionId != null) {
            process();
        }
    }, [params.merchantId, params.tourId, params.sessionId])

    return session == null ? null : {
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
    }
}
    
const BookingInfoHeader : React.FC = () => {
    const session = useBL();

    if (session == null) return <div/>

    return (
        <>
            <div className="flex flex-col text-xs ml-auto md:text-base">
                <h1 className="text-xs md:text-base lg:text-lg"> {session.title}</h1>
                <div className="flex flex-row space-x-2">
                    <span> {session.date}</span>
                    <span> | </span>
                    <span> {session.timeline.start.toLocaleString(DateTime.TIME_SIMPLE)} to {session.timeline.finish.toLocaleString(DateTime.TIME_SIMPLE)} </span>
                </div>
                <div className="flex flex-row space-x-2">
                    <span> {Math.round(session.capacity.percentage)}% booked </span>
                    <span> | </span>
                    <span> {session.capacity.current}/{session.capacity.max} {session.capacity.mode === 'PER_PERSON' ? 'people' : 'spots'}</span>
                    <span> | </span>
                    <span className={session.capacity.remaining === 0 ? "text-red-500 font-bold" : "text-green-600"}>
                        {session.capacity.remaining} remaining
                    </span>
                </div>
            </div>
        </>
    )
}

export default BookingInfoHeader;
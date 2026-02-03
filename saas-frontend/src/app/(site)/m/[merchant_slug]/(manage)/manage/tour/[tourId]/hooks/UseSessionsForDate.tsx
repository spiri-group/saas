'use client'; 

import { gql } from "@/lib/services/gql";

import { recordref_type, session_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";
import { DateTime } from "luxon";

export const KEY = "sessions-for-date";

export const queryFn = async (date: string, eventAndTourRef?: recordref_type) => {

    const resp = await gql<{
        sessions: session_type[]
    }>(
        `
            query get_sessions($date: Date!, $vendorId: ID, $listingId: ID) {
                sessions(date: $date, vendorId: $vendorId, listingId: $listingId)  {
                    code
                    ref {
                        id
                        partition
                    }
                    date,
                    time {
                        start,
                        end
                    }
                    activityListId
                    activityList {
                        activities {
                            name,
                            location {
                                formattedAddress
                            },
                            time
                        }
                    }
                    capacity {
                        max
                        current
                        remaining
                        mode
                    }
                }
            }
        `,
        {
            date: DateTime.fromISO(date).toISODate(),
            vendorId: eventAndTourRef == undefined ? undefined : eventAndTourRef.partition[0],
            listingId: eventAndTourRef == undefined ? undefined : eventAndTourRef.id
        }
    )
    return resp.sessions;
}

const UseSessionsForDate = (date : string, eventAndTourRef?: recordref_type) => {
    return useQuery({
        queryKey: [KEY, eventAndTourRef, date],
        queryFn: () => queryFn(date, eventAndTourRef)
    });
}

export default UseSessionsForDate;
import { gql } from "@/lib/services/gql";
import { session_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";
import { DateTime } from "luxon";

const key = 'available-sessions';

const queryFn = async (merchantId: string, tourId: string, from: DateTime, to: DateTime) => {
    const resp = await gql<{
        sessions: session_type[]
    }>(
        `query get_sessions($from: DateTime!, $to: DateTime!, $vendorId: ID!, $listingId: ID) {
            sessions(from: $from, to: $to, vendorId: $vendorId, listingId: $listingId) {
                id
                date
                time {
                    start
                    end
                }
                sessionTitle
                capacity {
                    max
                    current
                    remaining
                    mode
                }
                ref {
                    id
                    partition
                    container
                }
                forObject {
                    id
                }
            }
        }`,
        {
            from: from.toISO(),
            to: to.toISO(),
            vendorId: merchantId,
            listingId: tourId
        }
    )
    return resp.sessions;
}

const UseAvailableSessions = (merchantId: string, tourId: string, from: DateTime, to: DateTime) => {
    return useQuery({
        queryKey: [key, merchantId, tourId, from.toISODate(), to.toISODate()],
        queryFn: () => queryFn(merchantId, tourId, from, to)
    });
}

export default UseAvailableSessions;

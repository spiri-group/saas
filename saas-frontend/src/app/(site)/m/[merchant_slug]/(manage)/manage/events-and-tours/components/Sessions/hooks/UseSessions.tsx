import { gql } from "@/lib/services/gql";
import { session_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";
import {DateTime} from "luxon";

const key = 'sessions';

const queryFn = async (from: DateTime, to: DateTime, merchantId?: string, tourId?: string) => {
    if (merchantId == null) return null;

    const resp = await gql<{
        sessions: session_type[]
    }>( `query get_sessions($from: DateTime!, $to: DateTime!, $vendorId: ID!, $listingId: ID) {
              sessions(from: $from, to: $to, vendorId: $vendorId, listingId: $listingId) {
                id
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
                    partition
                    container
                }
                sessionTitle
                code
                bookings {
                    user {
                        id
                        name
                    }
                    order {
                        balanceDue {
                            total {
                                amount
                                currency
                            }
                        }
                    }
                }
                date,
                time {
                    start
                    end
                }
              }
          }
        `,
        {
            from: from.toISO(), to: to.toISO(),
            vendorId: merchantId,
            listingId: tourId
        }
    )
    return resp.sessions;
}

const UseSessions = (from: DateTime, to: DateTime, merchantId?: string, tourId?: string) => {
    return useQuery({
        queryKey: [key, merchantId, from, to, merchantId, tourId],
        queryFn: () => queryFn(from, to, merchantId, tourId)
    });
}

export default UseSessions
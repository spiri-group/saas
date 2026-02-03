import { gql } from "@/lib/services/gql";

import { booking_type, recordref_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

const key = "booking-for-tour-session";

const queryFn = async (sessionRef: recordref_type, bookingRef: recordref_type) => {
    
    const resp = await gql<{
        sessionBooking: booking_type
    }>( `
            query get_booking($sessionRef: RecordRefInput!, $bookingRef: RecordRefInput!)  {
                sessionBooking(sessionRef: $sessionRef, bookingRef: $bookingRef) {
                    id,
                    userId,
                    sessions {
                        ref {
                            id
                            partition
                            container
                        }
                        tickets {
                            index
                            id
                            person
                            stripe {
                                charge {
                                    id
                                    amount_remaining {
                                        amount
                                        currency
                                    }
                                }
                            }
                            price {
                                amount
                                currency
                            }
                            refund_request_log {
                                datetime
                                status
                                quantity
                            }
                            price_log {
                                datetime
                                type
                                status
                                price {
                                    amount
                                    currency
                                }
                            }
                            status {
                                label
                                triggeredBy
                            }
                        }
                    }
                    notes
                    ref {
                        id,
                        container,
                        partition
                    }
                }
            }
        `,
        {
            sessionRef, 
            bookingRef
        }
    )
    
    return resp.sessionBooking;
}

const UseSessionBooking = (sessionRef: recordref_type, bookingRef: recordref_type) => {
    return useQuery({
        queryKey: [key, sessionRef, bookingRef],
        queryFn: () => queryFn(sessionRef, bookingRef)
    });
}

export default UseSessionBooking;
import { gql } from "@/lib/services/gql";

import { recordref_type, session_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

const key = "bookings-for-tour-session";

const queryFn = async (sessionRef: recordref_type) => {

    const resp = await gql<{
        session: session_type
    }>(
        `
            query get_session_bookings($vendorId: ID!, $listingId: ID!, $sessionId: ID!)  {
                session(vendorId: $vendorId, listingId: $listingId, sessionId: $sessionId) {
                    id,
                    ref {
                        id,
                        container,
                        partition
                    }
                    bookings {
                        id,
                        userId,
                        customerEmail,
                        user {
                            firstname,
                            lastname,
                            email,
                            phoneNumber
                        },
                        ticketStatus,
                        paid {
                            datetime
                            type
                        },
                        totalAmount {
                            amount
                            currency
                        },
                        notes,
                        order {
                            id
                            ref {
                                id,
                                container,
                                partition
                            }
                            paymentSummary {
                                due {
                                    total {
                                        amount
                                        currency
                                    }
                                }
                            }
                        },
                        payment_link,
                        checkedIn {
                            datetime
                        },
                        lastMessageRef {
                            id,
                            partition,
                            container
                        },
                        lastMessage {
                            text
                        },
                        ref {
                            id,
                            partition,
                            container
                        }
                    }
                }
            }
        `,
        {
            vendorId: sessionRef.partition[0],
            listingId: sessionRef.partition[1],
            sessionId: sessionRef.id
        }
    )
    
    return resp.session.bookings;
}

const UseSessionBookings = (sessionRef: recordref_type) => {
    return useQuery({
        queryKey: [key, sessionRef],
        queryFn: () => queryFn(sessionRef)
    });
}

export default UseSessionBookings;

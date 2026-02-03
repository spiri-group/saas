import { gql } from "@/lib/services/gql";
import { booking_type, session_type, tour_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

export type BookingWithDetails = booking_type & {
    sessionDetails?: session_type;
    tourDetails?: tour_type;
};

const queryFn = async (code: string, vendorId: string) => {
    const resp = await gql<{
        bookingByCode: BookingWithDetails | null;
    }>(
        `
            query GetBookingByCode($code: String!, $vendorId: ID!) {
                bookingByCode(code: $code, vendorId: $vendorId) {
                    id
                    code
                    userId
                    vendorId
                    customerEmail
                    user {
                        id
                        firstname
                        lastname
                        email
                        phoneNumber
                    }
                    sessions {
                        index
                        ref {
                            id
                            partition
                            container
                        }
                        tickets {
                            id
                            variantId
                            person
                            quantity
                            price {
                                amount
                                currency
                            }
                        }
                    }
                    ticketStatus
                    datetime
                    checkedIn {
                        datetime
                    }
                    paid {
                        datetime
                        type
                    }
                    totalAmount {
                        amount
                        currency
                    }
                    ref {
                        id
                        partition
                        container
                    }
                    sessionDetails {
                        id
                        sessionTitle
                        date
                        time {
                            start
                            end
                        }
                        ref {
                            id
                            partition
                            container
                        }
                    }
                    tourDetails {
                        id
                        name
                        description
                        ticketVariants {
                            id
                            name
                            description
                            price {
                                amount
                                currency
                            }
                            peopleCount
                        }
                    }
                }
            }
        `,
        { code, vendorId }
    );

    return resp.bookingByCode;
};

const UseBookingByCode = (code: string, vendorId: string, enabled: boolean = true) => {
    return useQuery({
        queryKey: ["booking-by-code", code, vendorId],
        queryFn: () => queryFn(code, vendorId),
        enabled: enabled && !!code && code.length >= 6 && !!vendorId,
        retry: false,
        staleTime: 0,
    });
};

export default UseBookingByCode;

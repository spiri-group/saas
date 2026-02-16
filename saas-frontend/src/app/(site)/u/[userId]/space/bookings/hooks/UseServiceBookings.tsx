'use client';

import { gql } from "@/lib/services/gql";

import { recordref_type, service_type, stripe_details_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

const key = 'serviceBookings';

//TODO: fix this

const queryFn = async (userId?: string, vendorId?: string) => {
    const resp = await gql<{
        serviceBookings: {
            time: any,
            date: any,
            ref: recordref_type,
            service: service_type,
            stripe: stripe_details_type
        }[]
    }>( `query serviceBookings($userId: ID, $vendorId: ID) {
            serviceBookings(userId: $userId, vendorId: $vendorId) {
                service {
                    name,
                    location {
                        place {
                            formattedAddress
                        }
                        meeting_link
                        meeting_passcode
                        type
                    }
                    duration {
                        amount
                    }
                    thumbnail {
                        url
                    }
                }
                date,
                time {
                    start
                    end
                    duration_ms
                }
                ref {
                    id,
                    partition,
                    container
                }
                stripe {
                    invoiceNumber,
                    amount {
                        due
                    }
                }
            }
        }
        `,
        {
           userId,
           vendorId
        }
    )
    return resp.serviceBookings;
}

const UseServiceBookings = (userId?: string, vendorId?: string) => {
    return useQuery({
        queryKey: [key, userId, vendorId],
        queryFn: () => queryFn(userId, vendorId)
    })
}

export default UseServiceBookings
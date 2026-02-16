'use client';

import { gql } from "@/lib/services/gql";

import { booking_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

const key = 'tourBookings';

const queryFn = async (userId?: string, vendorId?: string) => {
    const resp = await gql<{
        tourBookings: booking_type[]
    }>( `query tourBookings($userId: ID, $vendorId: ID) {
            tourBookings(userId: $userId, vendorId: $vendorId) {
                code,
                datetime,
                ref {
                    id
                    partition,
                    container
                },
                order {
                    id
                    lines {
                        id
                        refund_quantity
                        refund_status
                        descriptor
                        price {
                            amount
                            currency
                        }
                        quantity
                    },
                    ref {
                        id
                        partition
                        container
                    }
                },
                sessions {
                    ref {
                        id,
                        partition
                        container
                    },
                    tickets {
                        index,
                        name,
                        id,
                        price {
                            amount
                            currency
                        },
                        quantity
                        person
                        stripe {
                            charge {
                                id,
                                amount_remaining {
                                    amount
                                    currency
                                }
                            }
                        },
                        status {
                            label
                            triggeredBy
                        }
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
    return resp.tourBookings;
}

const UseTourBookings = (userId?: string, vendorId?: string) => {
    return useQuery({
        queryKey: [key, userId, vendorId],
        queryFn: () => queryFn(userId, vendorId)
    })
}

export default UseTourBookings
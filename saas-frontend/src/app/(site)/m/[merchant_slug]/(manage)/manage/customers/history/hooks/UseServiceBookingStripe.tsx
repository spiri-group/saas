import { gql } from "@/lib/services/gql"

import { serviceBooking_type } from "@/utils/spiriverse"
import { useQuery } from "@tanstack/react-query"

const key = "stripe-for-service-booking"

const queryFn = async (bookingId: string, userId: string) => {

    const resp = await gql<{
        serviceBooking: serviceBooking_type
    }>(`query get_serviceBooking($userId: ID!, $bookingId: ID!){
            serviceBooking(userId: $userId, bookingId: $bookingId) {
                id,
                stripe {
                    chargeId
                    amount {
                        due,
                        charged, 
                        refunded,
                        status
                    }
                }
            }
        }`,
        {
            bookingId,
            userId
        }
    )
    return resp.serviceBooking.stripe;
    
}

const UseServiceBookingStripe = (bookingId: string, userId: string) => {
    return useQuery({
        queryKey: [key, userId, bookingId],
        queryFn: () => queryFn(bookingId, userId)
    })
}

export default UseServiceBookingStripe;

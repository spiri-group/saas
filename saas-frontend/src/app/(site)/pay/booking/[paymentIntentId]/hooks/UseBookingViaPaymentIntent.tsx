import { gql } from "@/lib/services/gql"

import { booking_type } from "@/utils/spiriverse"
import { useQuery } from "@tanstack/react-query"

export const key = 'booking-via-paymentIntentId'

const queryFn = async ( paymentIntentId: string) => {

    const resp = await gql<{
        find_booking_via_paymentIntentId: booking_type
    }>(  
        `
            query get_booking($paymentIntentId: String!) {
                find_booking_via_paymentIntentId(id: $paymentIntentId) {
                    stripe {
                        paymentIntentSecret
                    }
                }
            }
        `,
        {
            paymentIntentId
        }
    )
    return resp.find_booking_via_paymentIntentId;
}

const UseBookingViaPaymentIntent = (paymentIntentId: string) => {
    return useQuery({
        queryKey: [key, paymentIntentId],
        queryFn: () => queryFn(paymentIntentId)
    });
}

export default UseBookingViaPaymentIntent;
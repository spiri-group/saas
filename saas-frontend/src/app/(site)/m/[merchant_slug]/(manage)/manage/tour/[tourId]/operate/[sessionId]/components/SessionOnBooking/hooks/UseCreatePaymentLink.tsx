import { gql } from "@/lib/services/gql";

import { booking_type, recordref_type } from "@/utils/spiriverse";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const UseCreatePaymentLink = (sessionRef: recordref_type) => {
    const queryClient = useQueryClient();

    return {
        mutation: useMutation({
            mutationFn: async (booking_ref: recordref_type) => {
                const response = await gql<{ create_booking_payment_link: { booking: booking_type }}>(
                    `
                        mutation create_payment_link($booking_ref: RecordRefInput!) {
                            create_booking_payment_link(bookingRef: $booking_ref) {
                                booking {
                                    ref {
                                        id
                                        partition,
                                        container
                                    }
                                    payment_link
                                }
                            }
                        }
                    `,
                    {
                        booking_ref: booking_ref
                    }
                )

                return response.create_booking_payment_link.booking
            },
            onSuccess: (data: booking_type) => {

                // update the booking with the payment link
                queryClient.setQueryData(['bookings-for-tour-session', sessionRef], (oldData: booking_type[]) => {
                    return oldData.map(booking => {
                        if (booking.ref.id == data.ref.id) {
                            return {
                                ...booking,
                                payment_link: data.payment_link
                            }
                        } else {
                            return booking
                        }
                    })
                })

            }
        })
    }
}

export default UseCreatePaymentLink;
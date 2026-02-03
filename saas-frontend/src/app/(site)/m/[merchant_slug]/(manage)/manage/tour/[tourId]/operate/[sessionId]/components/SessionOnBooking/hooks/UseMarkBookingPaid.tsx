import { gql } from "@/lib/services/gql"
import { booking_type, recordref_type } from "@/utils/spiriverse"
import { useMutation, useQueryClient } from "@tanstack/react-query"

const UseMarkBookingPaid = (sessionRef: recordref_type) => {
    const queryClient = useQueryClient();

    return {
        mutation: useMutation({
            mutationFn: async (booking_ref: recordref_type) => {
                const response = await gql<{
                    mark_booking_paid: {
                        booking: booking_type
                    }
                }>(`
                        mutation mark_booking_paid($booking_ref: RecordRefInput!) {
                            mark_booking_paid(bookingRef: $booking_ref) {
                                booking {
                                    id
                                    ref {
                                        id
                                        partition
                                        container
                                    }
                                    sessions {
                                        ref {
                                            id
                                            partition
                                            container
                                        }
                                        tickets {
                                            person,
                                            status {
                                                label
                                                triggeredBy
                                            }
                                            stripe {
                                                chargeId
                                                charge {
                                                    amount_remaining {
                                                        amount
                                                        currency
                                                    },
                                                }
                                            }
                                        }, 
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
                            }
                        }
                    `,
                    {
                        booking_ref
                    }
                )

                return response.mark_booking_paid.booking
            },
            onSuccess: (data: booking_type) => {

                // update the booking with the payment link
                queryClient.setQueryData(['bookings-for-tour-session', sessionRef], (oldData: booking_type[]) => {
                    return oldData.map(booking => {
                        if (booking.ref.id == data.id) {
                            return {
                                ...booking,
                                order: data.order?.paymentSummary.due
                            }
                        } else {
                            return booking
                        }
                    })
                })

                // this needs to update
                queryClient.setQueryData(['booking-for-tour-session', sessionRef, data.ref], (oldData: booking_type) => {
                    return {
                        ...oldData,
                        sessions: oldData.sessions.map(session => {
                            if (session.ref.id == sessionRef.id) {
                                return {
                                    ...session,
                                    tickets: data.sessions.find(x => x.ref.id == sessionRef.id)?.tickets
                                }
                            } else {
                                return session
                            }
                        }),
                        notes: data.notes,
                        order: data.order?.paymentSummary.due
                    }
                })
            }
        })
    }
}

export default UseMarkBookingPaid
'use client';

import { gql } from "@/lib/services/gql";

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form"
import { z } from "zod"
import { SessionSelection } from "../components/TicketSelection";
import { stripe_details_type } from "@/utils/spiriverse";

export type bookingTourFormType = z.infer<typeof bookingTourSchema>

const bookingTourSchema = z.object({
    email: z.string().email().optional(),
    people: z.coerce.number().min(1),
    date: z.string().min(1),
    sessions: z.array(
        SessionSelection
    )
}).refine((data) => {
    if (data.sessions.length == 0) return false
    // the tickets selected must be equal to the people
    const ticketsSelectedCount = data.sessions.reduce((acc, session) => {
        return acc + session.tickets.reduce((acc, ticket) => {
            return acc + ticket.quantity
        }, 0)
    },0)
    return ticketsSelectedCount == data.people
})

const UseCreateTourBooking = (gql_conn: gql_conn_type, merchantId: string, tourId: string) => {
    const queryClient = useQueryClient();

    const form = useForm<bookingTourFormType>({
        resolver: zodResolver(bookingTourSchema),
        defaultValues: {
            people: 0,
            date: undefined
        }
    })

    return {
        form,
        values: form.getValues(),
        mutation: useMutation({
            mutationFn: async (values: bookingTourFormType) => {

                const resp = await gql<{
                    create_tour_booking: {
                        bookings: {
                            id: string,
                            order: {
                                stripe: stripe_details_type
                            }
                        }[]
                    }
                }>( 
                    `mutation create_tour_booking($customerEmail: String!, $merchantId: String!, $sessions: [SessionBookingInput]!) {
                        create_tour_booking(customerEmail: $customerEmail, merchantId: $merchantId, sessions: $sessions) {
                                code,
                                success,
                                message,
                                bookings {
                                    id,
                                    order {
                                        stripe {
                                            accountId
                                            setupIntentId
                                            setupIntentSecret
                                        }
                                    }
                                }
                            }
                        }
                    `,
                    {
                        customerEmail: values.email,
                        merchantId,
                        sessions: values.sessions.map((session) => {
                            return {
                                ref: session.ref,
                                tickets: session.tickets.map((ticket) => {
                                    return {
                                        variantId: ticket.variantId,
                                        quantity: ticket.quantity
                                    }
                                })
                            }
                        })
                    }
                )

                return resp.create_tour_booking.bookings[0];
            },
            onSuccess: async () => {
                queryClient.invalidateQueries({
                    queryKey: ["bookingTour", merchantId, tourId]
                })
            }
        })
    }
}

export default UseCreateTourBooking
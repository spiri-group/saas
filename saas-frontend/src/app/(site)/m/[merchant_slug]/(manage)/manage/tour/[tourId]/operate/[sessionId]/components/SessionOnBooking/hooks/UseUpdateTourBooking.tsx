import { gql } from "@/lib/services/gql"
import { booking_type, recordref_type } from "@/utils/spiriverse"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod"
import UseSessionBooking from "./UseSessionBooking";
import { useEffect } from "react";
import { CurrencyAmountSchema } from "@/components/ux/CurrencyInput";
import { omit } from "@/lib/functions";


export type updateBookingForm_type = z.infer<typeof updateBookingsFormSchema>

const updateBookingsFormSchema = z.object({
    tickets: z.array(
        z.object({
            id: z.string().uuid().min(1),
            index: z.coerce.number(),
            person: z.string().optional(),
            price: CurrencyAmountSchema,
            refund: CurrencyAmountSchema.optional(),
            stripe: z.object({
                charge: z.object({
                    id: z.string().optional().nullable(),
                    amount_remaining: CurrencyAmountSchema
                }).nullable()
            }),
            price_log: z.array(z.object({
                datetime: z.string(),
                type: z.string(),
                status: z.string(),
                price: CurrencyAmountSchema
            })),
            refund_request_log: z.array(z.object({
                datetime: z.string(),
                status: z.string(),
                quantity: z.coerce.number()
            })),
            status: z.object({
                label: z.string().min(1),
                triggeredBy: z.string().min(1).optional()
            }),
            dirty: z.boolean()
        })
    ),
    notes: z.string().optional().nullable(),
    requirePayment: z.boolean().optional()
}).refine((data) => {
    if (data.tickets.some(x => x.refund_request_log != null && x.refund_request_log.length > 0)) {
        if (data.tickets.some(y => y.refund != null)) return true;
        else return false;
    } else {
        return true;
    }
})

const UseUpdateTourBooking = (sessionRef: recordref_type, bookingRef: recordref_type) => {
    const queryClient = useQueryClient();

    const sessionBooking = UseSessionBooking(sessionRef, bookingRef)

    const form = useForm<z.infer<typeof updateBookingsFormSchema>>({
        resolver: zodResolver(updateBookingsFormSchema)
    })

    useEffect(() => {
        if (sessionBooking.data) {
            form.reset({
                tickets: sessionBooking.data.sessions.find(x => x.ref.id == sessionRef.id)?.tickets.map((ticket) => {
                    return {
                        ...ticket,
                        price: ticket.price == null ? {
                            amount: 0,
                            currency: "AUD"
                        } : {
                            amount: ticket.price.amount,
                            currency: ticket.price.currency
                        },
                        refund_request_log: []
                    }
                }),
                notes: sessionBooking.data.notes
            })
        }
    }, [sessionBooking.data])

    return {
        form,
        mutation: useMutation({
            mutationFn: async (values: updateBookingForm_type) => {
                
                const data = {
                    tickets: values.tickets.filter(x => x.dirty).map((ticket) => 
                        omit(ticket, ["status", "stripe", "dirty", "refund_request_log"])
                    ),
                    notes: values.notes,
                    bookingRef,
                    sessionRef,
                    requirePayment: values.requirePayment
                }

                const response = await gql<{
                    update_tour_booking: {
                        success: boolean,
                        booking: booking_type
                    }
                }>(
                    `mutation update_tour_booking($tickets: [BookingTicketUpdateInput]!, $notes: String, $sessionRef: RecordRefInput!, $bookingRef: RecordRefInput!, $requirePayment: Boolean) {
                            update_tour_booking(tickets: $tickets, notes: $notes, sessionRef: $sessionRef, bookingRef: $bookingRef, requirePayment: $requirePayment) {
                                success
                                booking {
                                    id,
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
                                    notes,
                                    order {
                                        paymentSummary {
                                            due {
                                                amount
                                                currency
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    `,
                    data
                )

                return response.update_tour_booking
            },
            onSuccess: (data) => {
                // update the booking
                queryClient.setQueryData(['booking-for-tour-session', sessionRef, bookingRef], (oldData: booking_type) => {
                    return {
                        ...oldData,
                        sessions: oldData.sessions.map(session => {
                            if (session.ref.id == sessionRef.id) {
                                return {
                                    ...session,
                                    tickets: data.booking.sessions.find(x => x.ref.id == sessionRef.id)?.tickets
                                }
                            } else {
                                return session
                            }
                        }),
                        notes: data.booking.notes,
                        order: data.booking.order ? {
                            ...oldData.order,
                            balanceDue: data.booking.order.paymentSummary.due
                        } : oldData.order
                    }
                })
                
                // update the session bookings
                queryClient.setQueryData(['bookings-for-tour-session', sessionRef], (oldData: booking_type[]) => {
                    return oldData.map(booking => {
                        if (booking.ref.id == bookingRef.id) {
                            return {
                                ...booking,
                                notes: data.booking.notes,
                                order: data.booking.order ? {
                                    ...booking.order,
                                    balanceDue: data.booking.order.paymentSummary.due
                                } : booking.order
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

export default UseUpdateTourBooking
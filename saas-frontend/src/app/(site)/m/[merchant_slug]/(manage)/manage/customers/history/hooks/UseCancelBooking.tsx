import { gql } from "@/lib/services/gql";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

export type cancelBookingForm_type = z.infer<typeof cancelBookingSchema>

export const cancelBookingSchema = z.object({
    notes: z.string().optional()
})

const UseCancelBooking = (bookingId: string, customerEmail: string, type: string) => {

    const form = useForm<z.infer<typeof cancelBookingSchema>>({
        resolver: zodResolver(cancelBookingSchema)
    })

    return {
        form,
        mutation: useMutation({
            mutationFn: async () => {
                const response = await gql<any>(`mutation cancel_booking($bookingId: ID!, $customerEmail: String!, $type: String!) {
                        cancel_booking(bookingId: $bookingId, customerEmail: $customerEmail, type: $type) {
                                code,
                                charge {
                                    id
                                    amount
                                    amount_captured {
                                        amount,
                                        currency
                                    },
                                    amount_refunded {
                                        amount,
                                        currency
                                    },
                                    amount_remaining {
                                        amount,
                                        currency
                                    }
                                }
                            }   
                        }
                    `,
                    {
                        bookingId: bookingId,
                        customerEmail: customerEmail,
                        type: type
                    }
                )

                return response
            }
        })
    }
}

export default UseCancelBooking

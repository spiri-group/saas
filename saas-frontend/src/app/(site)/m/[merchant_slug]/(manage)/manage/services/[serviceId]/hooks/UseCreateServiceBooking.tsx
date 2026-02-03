'use client';

import { gql } from "@/lib/services/gql";

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { useForm } from "react-hook-form"
import { z } from "zod"
import { LocationSelectorSchema } from "../components/LocationSelector";

export type bookingsServiceFormType = z.infer<typeof bookingServiceSchema>

const bookingServiceSchema = z.object({
    date: z.string().min(1),
    time: z.object({
        start: z.string(),
        end: z.string(),
        duration_ms: z.number()
    }),
    location: LocationSelectorSchema,
    notes: z.string()
})

const UseCreateServiceBooking = (merchantId: string, serviceId: string) => {
    const queryClient = useQueryClient();

    const form = useForm<bookingsServiceFormType>({
        resolver: zodResolver(bookingServiceSchema),
        defaultValues: {
            date: undefined,
            time: undefined,
            notes: undefined
        }
    })

    return {
        form,
        values: form.getValues(),
        mutation: useMutation({
            mutationFn: async (values: bookingsServiceFormType) => {
                const resp = await gql<any>( 
                    `mutation book_service($bookService: BookServiceInput!) {
                        book_service(merchantId: "${merchantId}", serviceId: "${serviceId}", bookService: $bookService) {
                                code,
                                success,
                                message,
                                bookingService {
                                    id,
                                    stripe {
                                        paymentIntentSecret
                                    }
                                }
                            }
                        }
                    `,
                    {
                        bookingService: {
                            date: DateTime.fromISO(values.date).toISODate(),
                            time: values.time
                        }
                    }
                )

                return resp.book_service.bookingService;
            },
            onSuccess: async () => {
                queryClient.invalidateQueries({
                    queryKey: ["booking", merchantId, serviceId]
                })
            }
        })
    }
}

export default UseCreateServiceBooking
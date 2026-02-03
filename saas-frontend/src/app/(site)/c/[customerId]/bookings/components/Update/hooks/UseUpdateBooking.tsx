'use client';

import { gql } from "@/lib/services/gql";

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { useForm } from "react-hook-form"
import { z } from "zod"

export type bookingsServiceFormType = z.infer<typeof bookingServiceSchema>

const bookingServiceSchema = z.object({
    date: z.string(),
    time: z.object({
        start: z.string(),
        end: z.string(),
        duration_ms: z.number()
     })
})

const UseUpdateBooking = (
    merchantId: string,
    listingId: string,
    existingDate: string | undefined = undefined,
    existingTime: { start: string; end: string; duration_ms: number } | undefined = undefined
  ) => {
    const queryClient = useQueryClient();
  
    const form = useForm<bookingsServiceFormType>({
      resolver: zodResolver(bookingServiceSchema),
      defaultValues: {
        date: existingDate || undefined,
        time: existingTime || undefined,
      },
    });
  
    return {
      form,
      values: form.getValues(),
      mutation: useMutation({
        mutationFn: async (values: bookingsServiceFormType) => {
          const resp = await gql<{
            book_service: {
              code: string,
              success: boolean,
              message: string,
              bookingService: {
                id: string,
                stripe: {
                  paymentIntentSecret: string
                }
              }
            }
          }>(
            `mutation book_service($bookingService: BookServiceInput!) {
              book_service(merchantId: "${merchantId}", listingId: "${listingId}", bookingService: $bookingService) {
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
                time: values.time,
              },
            }
          )
  
          return resp.book_service.bookingService;
        },
        onSuccess: async () => {
            queryClient.invalidateQueries({
                queryKey: ["booking", merchantId, listingId]
            })
        }
      })
    }
}
  
  export default UseUpdateBooking;
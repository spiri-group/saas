'use client';

import { gql } from "@/lib/services/gql";

import { tour_type } from "@/utils/spiriverse";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { activityListSchema } from "../components/CreateActivityList";
import { CountrySchema, TimezoneSchema } from "@/components/ux/TimeZoneSelector";
import { DateTime } from "luxon";
import { accordionItemSchema } from "@/components/ux/AccordionInput";
import { countWords, omit } from "@/lib/functions";
import { ThumbnailSchema } from "@/shared/schemas/thumbnail";
import { default_thumbnail } from "@/components/ux/ThumbnailInput";

// Input schema - accepts optional track_inventory
const ticketVariantInputSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1, "Ticket name is required"),
    description: z.string().optional(),
    price: z.object({
        amount: z.number().min(0, "Price must be positive"),
        currency: z.string()
    }),
    peopleCount: z.number().min(1, "People count must be at least 1"),
    qty_on_hand: z.number().min(0, "Initial stock must be 0 or more"),
    track_inventory: z.boolean().optional(),
    low_stock_threshold: z.number().min(0).optional(),
    allow_backorder: z.boolean().optional()
})

// Output schema - ensures track_inventory is always boolean
export const ticketVariantSchema = ticketVariantInputSchema.transform((data) => ({
    ...data,
    track_inventory: data.track_inventory ?? true
}))

export const createTourSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1, "Tour name is required"),
    thumbnail: ThumbnailSchema,
    timezone: TimezoneSchema,
    country: CountrySchema,
    description: z.string().refine((value) => countWords(value) <= 500, "Description must be 500 words or less"),
    terms: z.string().refine((value) => countWords(value) <= 500, "Terms must be 500 words or less").optional(),
    faq: z.array(accordionItemSchema),
    activityList: activityListSchema,
    ticketVariants: z.array(ticketVariantSchema).min(1, "At least one ticket variant is required"),
    productReturnPolicyId: z.string().optional(),
    thumbnail_content_set: z.boolean().default(false)
})

export type CreateTourSchema = z.output<typeof createTourSchema>

const UseCreateTour = (merchantId: string) => {
    const queryClient = useQueryClient();

    const tourId = uuid();

    const form = useForm<z.input<typeof createTourSchema>, any, CreateTourSchema>({
        resolver: zodResolver(createTourSchema),
        defaultValues: {
            id: tourId,
            ticketVariants: [],
            thumbnail: default_thumbnail,
            faq: [],
            activityList: {
                id: uuid(),
                activities: [
                    { id: uuid(), name: "Start", time: DateTime.now().toISOTime() },
                    { id: uuid(), name: "End", time: DateTime.now().plus({ hours: 3 }).toISOTime() }
                ]
            },
            thumbnail_content_set: false
        }
    })

    return {
        form, 
        values: form.getValues(),
        mutation: useMutation({
            mutationFn: async (newTour: CreateTourSchema) => {
                const thumbnail = omit(newTour.thumbnail, ["image.media.url"])

                // Transform ticketVariants to match backend TourTicketVariantInput schema
                const ticketVariants = newTour.ticketVariants.map(variant => ({
                    id: variant.id,
                    name: variant.name,
                    description: variant.description,
                    price: {
                        amount: variant.price.amount,
                        currency: variant.price.currency
                    },
                    peopleCount: variant.peopleCount,
                    qty_on_hand: variant.qty_on_hand,
                    track_inventory: variant.track_inventory,
                    low_stock_threshold: variant.low_stock_threshold,
                    allow_backorder: variant.allow_backorder
                }))

                const resp = await gql<any>(
                    `
                        mutation create_tour($merchantId: String!, $tour: TourInput!) {
                            create_tour(merchantId: $merchantId, tour: $tour) {
                                tour {
                                    id
                                }
                            }
                        }
                    `,
                    {
                        tour: {
                            id: newTour.id,
                            name: newTour.name,
                            thumbnail,
                            country: newTour.country.code,
                            timezone: newTour.timezone.id,
                            description: newTour.description,
                            terms: newTour.terms,
                            faq: newTour.faq,
                            activityList: newTour.activityList,
                            ticketVariants,
                            productReturnPolicyId: newTour.productReturnPolicyId
                        },
                        merchantId
                    }
                )

                return resp.create_tour.tour;
            },
            onSuccess: async (data : tour_type) => {
                // we don't update the catalogue on the home screen as that is personalised

                // update the schedule query cache so they can schedule
                queryClient.setQueryData(["tours-for-merchant", { merchantId }], (old: tour_type[]) => {
                    if (old == undefined) return [data];
                    return [data, ...old];
                });
            }
        })
    }
}

export default UseCreateTour;
import { gql } from "@/lib/services/gql"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod"
import UseViewTourDetails from "../../../../[tourId]/hooks/UseViewTourDetails";
import { useEffect } from "react";

const ticketVariantInputSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1, "Ticket name is required"),
    description: z.string().optional(),
    price: z.object({
        amount: z.number().min(0, "Price must be positive"),
        currency: z.string()
    }),
    peopleCount: z.number().min(1, "People count must be at least 1"),
    qty_on_hand: z.number().min(0, "Stock must be 0 or more"),
    track_inventory: z.boolean().optional(),
    low_stock_threshold: z.number().min(0).optional(),
    allow_backorder: z.boolean().optional(),
    max_backorders: z.number().min(0).optional()
});

const ticketVariantSchema = ticketVariantInputSchema.transform((data) => ({
    ...data,
    track_inventory: data.track_inventory ?? true
}));

const updateTicketVariantsFormSchema = z.object({
    id: z.string().min(1),
    ticketVariants: z.array(ticketVariantSchema).min(1, "At least one ticket variant is required")
})

export type updateTicketVariants_type = z.output<typeof updateTicketVariantsFormSchema>

const UseEditTicketVariants = (merchantId: string, tourId: string) => {
    const queryClient = useQueryClient();
    const tourDetailsResponse = UseViewTourDetails(merchantId, tourId)

    const form = useForm<z.input<typeof updateTicketVariantsFormSchema>, any, updateTicketVariants_type>({
        resolver: zodResolver(updateTicketVariantsFormSchema),
        defaultValues: undefined
    })

    useEffect(() => {
        if (tourDetailsResponse.data != null && form.getValues().id != tourDetailsResponse.data.id) {
            form.reset({
                id: tourDetailsResponse.data.id,
                ticketVariants: tourDetailsResponse.data.ticketVariants.map(variant => ({
                    id: variant.id,
                    name: variant.name,
                    description: variant.description,
                    price: variant.price,
                    peopleCount: variant.peopleCount,
                    qty_on_hand: variant.inventory.qty_on_hand,
                    track_inventory: variant.inventory.track_inventory,
                    low_stock_threshold: variant.inventory.low_stock_threshold,
                    allow_backorder: variant.inventory.allow_backorder,
                    max_backorders: variant.inventory.max_backorders
                }))
            })
        }
    }, [tourDetailsResponse.data])

    return {
        form,
        isLoading: tourDetailsResponse.isLoading,
        mutation: useMutation({
            mutationFn: async (values: updateTicketVariants_type) => {
                const ticketVariants = values.ticketVariants.map(variant => ({
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
                    allow_backorder: variant.allow_backorder,
                    max_backorders: variant.max_backorders
                }));

                const response = await gql<any>(
                    `mutation update_tour($merchantId: String!, $tour: TourUpdateInput!) {
                        update_tour(merchantId: $merchantId, tour: $tour) {
                            tour {
                                id
                                ticketVariants {
                                    id
                                    name
                                    description
                                    price {
                                        amount
                                        currency
                                    }
                                    peopleCount
                                    inventory {
                                        qty_on_hand
                                        qty_committed
                                        qty_available
                                        track_inventory
                                        low_stock_threshold
                                        allow_backorder
                                        max_backorders
                                    }
                                }
                            }
                        }
                    }
                    `,
                    {
                        merchantId,
                        tour: {
                            id: values.id,
                            ticketVariants
                        }
                    }
                )

                return response.update_tour.tour
            },
            onSuccess: () => {
                // Invalidate tour details query to refresh the data
                queryClient.invalidateQueries({ queryKey: ['tour-for-merchant', merchantId, tourId] });
            }
        })
    }
}

export default UseEditTicketVariants

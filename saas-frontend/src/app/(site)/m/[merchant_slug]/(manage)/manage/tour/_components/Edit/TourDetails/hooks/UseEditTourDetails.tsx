import { gql } from "@/lib/services/gql"
import { useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod"
import UseViewTourDetails from "../../../../[tourId]/hooks/UseViewTourDetails";
import { useEffect } from "react";
import { countWords, omit } from "@/lib/functions";
import { ThumbnailSchema } from "@/shared/schemas/thumbnail";

export type updateTourDetails_type = z.infer<typeof updateTourDetailsFormSchema>

const updateTourDetailsFormSchema = z.object({
    id: z.string().min(1),
    name: z.string(),
    thumbnail: ThumbnailSchema,
    description: z.string().refine((value) => countWords(value) <= 500),
    terms: z.string().refine((value) => countWords(value) <= 500),
    faq: z.array(z.object({
        id: z.string().min(1),
        title: z.string().min(1),
        description: z.string().min(1)
    })).optional()
})

const UseEditTourDetails = (merchantId: string, tourId: string) => {

    const tourDetailsResponse = UseViewTourDetails(merchantId, tourId)

    const form = useForm<z.infer<typeof updateTourDetailsFormSchema>>({
        resolver: zodResolver(updateTourDetailsFormSchema),
        defaultValues: undefined
    })

    useEffect(() => {
        if (tourDetailsResponse.data != null && form.getValues().id != tourDetailsResponse.data.id) {
            form.reset({
                id: tourDetailsResponse.data.id,
                name: tourDetailsResponse.data.name,
                thumbnail: tourDetailsResponse.data.thumbnail,
                description: tourDetailsResponse.data.description,
                terms: tourDetailsResponse.data.terms,
                faq: tourDetailsResponse.data.faq
            })
        }
    }, [tourDetailsResponse.data])

    return {
        form,
        mutation: useMutation({
            mutationFn: async (values: updateTourDetails_type) => {
                const tourUpdateInput = omit(values, ['thumbnail.url'])

                const response = await gql<any>(
                    `mutation update_tour($merchantId: String!, $tour: TourUpdateInput!) { 
                        update_tour(merchantId: $merchantId, tour: $tour) {
                            tour {
                                id
                                name,
                                thumbnail {
                                    name
                                    url
                                    urlRelative
                                    size
                                    type
                                },
                                description,
                                terms,
                                faq {
                                    id
                                    title
                                    description
                                }
                            }
                        }
                    }
                    `,
                    {   
                        merchantId,
                        tour: tourUpdateInput
                    }
                )
                return response.update_tour.tour
            }
        })
    }
}

export default UseEditTourDetails
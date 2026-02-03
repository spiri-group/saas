'use client';

import { z } from "zod";
import { useForm } from "react-hook-form";
import { gql } from "@/lib/services/gql";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { review_type } from "@/utils/spiriverse";
import { v4 as uuid } from "uuid";

export type creatReviewSchema = z.infer<typeof reviewFormSchema>

export const reviewFormSchema = z.object({
    id: z.string().uuid(),
    headline: z.string().min(1),
    text: z.string().min(1),
    rating: z.number().min(1)
})

const UseCreateReview = (objectId: string, objectPartition: string) => {
    const queryClient = useQueryClient();

    const form = useForm<z.infer<typeof reviewFormSchema>>({
        resolver: zodResolver(reviewFormSchema),
        defaultValues: {
            id: uuid()
        }
    });

    return {
        form,
        schema: reviewFormSchema,
        values: form.getValues(),
        mutation: useMutation({
            mutationFn: async (newReview: creatReviewSchema) => {
                const resp = await gql<any>(
                    `mutation create_review($review: ReviewInput!, $objectId: String!, $objectPartition: String!) {
                            create_review(review: $review, objectId: $objectId, objectPartition: $objectPartition ) {
                                review {
                                    headline,
                                    base {
                                        id,
                                        text,
                                        posted_by {
                                            name
                                        },
                                        isReported,
                                        ref {
                                            id
                                            partition
                                            container
                                        }
                                    }
                                    rating
                                }
                            }
                        }
                    `,
                    {
                        review: {
                            headline: newReview.headline,
                            text: newReview.text,
                            rating: newReview.rating
                        },
                        objectId,
                        objectPartition
                    }
                );
                return resp.create_review.review;
            },
            onSuccess: async (data: review_type) => {
                queryClient.setQueryData(["reviews-for-listing", objectId, objectPartition ], (old: review_type[]) => {
                    return [data, ...(old ?? [])];
                });

                // we need to update ratings for listings
                queryClient.setQueryData(["ratings-for-listing", objectId, objectPartition], (old: any) => {
                    if (old == null) {
                        return {
                            total_count: 1,
                            average: data.rating,
                            rating1: data.rating == 1 ? 1 : 0,
                            rating2: data.rating == 2 ? 1 : 0,
                            rating3: data.rating == 3 ? 1 : 0,
                            rating4: data.rating == 4 ? 1 : 0,
                            rating5: data.rating == 5 ? 1 : 0
                        }
                    } else {
                        return {
                            total_count: old.total_count + 1,
                            average: (Math.ceil((old.average * old.total_count + data.rating) / (old.total_count + 1) * 2) / 2).toFixed(2),
                            rating1: old.rating1 + (data.rating == 1 ? 1 : 0),
                            rating2: old.rating2 + (data.rating == 2 ? 1 : 0),
                            rating3: old.rating3 + (data.rating == 3 ? 1 : 0),
                            rating4: old.rating4 + (data.rating == 4 ? 1 : 0),
                            rating5: old.rating5 + (data.rating == 5 ? 1 : 0)
                        }
                    }
                });
            }
        }) 
    }
}

export default UseCreateReview
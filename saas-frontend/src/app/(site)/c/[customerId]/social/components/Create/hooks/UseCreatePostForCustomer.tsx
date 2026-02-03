'use client';

import { gql } from "@/lib/services/gql";

import { socialpost_type } from "@/utils/spiriverse";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { DateTime } from "luxon";
import { MediaSchema } from "@/shared/schemas/media";

export type CreatePostSchema = z.infer<typeof CreatePostSchema>

export const CreatePostSchema = z.object({
    id: z.string().uuid(),
    availableAfter: z.date(),
    title: z.string(),
    description: z.string(),
    hashtags: z.array(z.string()),
    media: z.array(MediaSchema).optional(),
    embed: z.string().optional()
})

const UseCreatePostForCustomer = (vendorId: string) => {
    const queryClient = useQueryClient();

    const form = useForm<CreatePostSchema>({
        resolver: zodResolver(CreatePostSchema),
        defaultValues: {
            id: uuid(),
            availableAfter: DateTime.now().toJSDate(),
            hashtags: []
        }
    })

    return {
        form, 
        values: form.getValues(),
        mutation: useMutation({
            mutationFn: async (newPost: CreatePostSchema) => {
                const resp = await gql<{
                    create_socialpost: {
                        socialPost: socialpost_type
                    }
                }>(
                    `
                        mutation create_socialpost($socialPost: SocialPostInput!, $vendorId: String!) { 
                            create_socialpost(socialPost: $socialPost, vendorId: $vendorId) {
                                socialPost {
                                    id,
                                    vendorId
                                    availableAfter,
                                    description,
                                    media {
                                        name, 
                                        url, 
                                        type
                                    }
                                    hashtags,
                                    isPublished
                                }
                            }
                        }
                        `,
                    {
                        socialPost: newPost,
                        vendorId: vendorId
                    }
                )
        
                return resp.create_socialpost.socialPost;
            },
            onSuccess: async (data : socialpost_type) => {
                queryClient.setQueryData(["posts-for-customer", { vendorId }], (old: socialpost_type[]) => {
                    return [data, ...old];
                });
            }
        })
    }
}

export default UseCreatePostForCustomer;
'use client';

import { gql } from "@/lib/services/gql";

import { socialpost_type } from "@/utils/spiriverse";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { DateTime } from "luxon";
import { defaultTextFormat, TextFormatSchema } from "@/components/ux/TextFormatterInput";

const textSchema = z.object({
    content: z.string().min(1),
    format: TextFormatSchema
})

export const textOnlySocialPostSchema = z.object({
    mainText: textSchema,
    subText: textSchema.optional(),
    textVerticalAlignment: z.enum(["top", "center", "bottom"]),
    backgroundType: z.enum(["none", "color", "image"]).optional(),
    backgroundColor: z.string().optional(),
    backgroundImage: z.object({
        name: z.string().min(1),
        url: z.string().min(1),
        urlRelative: z.string().min(1),
        size: z.string().min(1),
        type: z.string().min(1)
    }).optional()
}).refine((data) => {
    if (data.backgroundType === "color") {
        return data.backgroundColor !== undefined;
    } else if (data.backgroundType === "image") {
        return data.backgroundImage !== undefined;
    } else {
        return false;
    }
})

export const mediaSocialPostSchema = z.object({
    media: z.array(z.string()).optional()
})


export type CreatePostSchema = z.infer<typeof CreatePostSchema>

export const CreatePostSchema = z.object({
    id: z.string().uuid(),
    type: z.enum(["text-only", "media-only"]),
    availableAfter: z.date(),
    title: z.string(),
    description: z.string().min(1),
    hashtags: z.array(z.string().min(2)),
    content: z.union([textOnlySocialPostSchema, mediaSocialPostSchema])
}).refine((data) => {
    if (data.type === "text-only") {
        return textOnlySocialPostSchema.parse(data.content);
    } else if (data.type === "media-only") {
        return mediaSocialPostSchema.parse(data.content);
    } else {
        return false;
    }
})


const UseCreatePostForMerchant = (merchantId: string) => {
    const queryClient = useQueryClient();

    const form = useForm<CreatePostSchema>({
        resolver: zodResolver(CreatePostSchema),
        defaultValues: {
            id: uuid(),
            availableAfter: DateTime.now().toJSDate(),
            hashtags: [],
            type: "text-only",
            content: {
                textVerticalAlignment: "top",
                mainText: {
                    content: "",
                    format: defaultTextFormat
                },
                subText: {
                    content: "",
                    format: defaultTextFormat
                }
            }
        }
    })

    return {
        form, 
        values: form.getValues(),
        mutation: useMutation({
            mutationFn: async (newPost: CreatePostSchema) => {
                const resp = await gql<any>(
                    `
                        mutation create_socialpost($socialPost: SocialPostTextOnlyInput!, $vendorId: String!) { 
                            create_textOnly_socialpost(socialPost: $socialPost, vendorId: $vendorId) {
                                socialPost {
                                    id,
                                    vendorId
                                    availableAfter,
                                    title,
                                    description,
                                    content {
                                        ... on SocialPostTextOnlyContent {
                                            ... on SocialPostTextOnlyContent {
                                                mainText {
                                                    content,
                                                    format {
                                                        font,
                                                        size,
                                                        color,
                                                        backgroundColor,
                                                        bold,
                                                        italic,
                                                        alignment,
                                                        decoration,
                                                        case,
                                                        margin {
                                                            top,
                                                            bottom,
                                                            left,
                                                            right
                                                        },
                                                        padding {
                                                            top,
                                                            bottom,
                                                            left,
                                                            right
                                                        },
                                                        withQuotes,
                                                        borderRadius {
                                                            topLeft,
                                                            topRight,
                                                            bottomLeft,
                                                            bottomRight
                                                        }
                                                    }
                                                }
                                                subText {
                                                    content,
                                                    format {
                                                        font,
                                                        size,
                                                        color,
                                                        backgroundColor,
                                                        bold,
                                                        italic,
                                                        alignment,
                                                        decoration,
                                                        case,
                                                        margin {
                                                            top,
                                                            bottom,
                                                            left,
                                                            right
                                                        },
                                                        padding {
                                                            top,
                                                            bottom,
                                                            left,
                                                            right
                                                        },
                                                        withQuotes,
                                                        borderRadius {
                                                            topLeft,
                                                            topRight,
                                                            bottomLeft,
                                                            bottomRight
                                                        }
                                                    }
                                                },
                                                textVerticalAlignment,
                                                backgroundType,
                                                backgroundColor,
                                                backgroundImage {
                                                    url
                                                }
                                            }
                                        }
                                    }
                                    hashtags,
                                    isPublished
                                }
                            }
                        }
                        `,
                    {
                        socialPost: newPost,
                        vendorId: merchantId
                    }
                )
        
                return resp.create_textOnly_socialpost.socialPost;
            },
            onSuccess: async (data : socialpost_type) => {
                queryClient.setQueryData(["posts-for-merchant", { merchantId }], (old: socialpost_type[]) => {
                    return [data, ...old];
                });
            }
        })
    }
}

export default UseCreatePostForMerchant;
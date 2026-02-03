'use client';

import { z } from "zod";
import { useForm } from "react-hook-form";
import { gql } from "@/lib/services/gql";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { comment_type, recordref_type } from "@/utils/spiriverse";
import { v4 as uuid } from "uuid";

export type createCommentSchema = z.infer<typeof commentFormSchema>

export const commentFormSchema = z.object({
    id: z.string().uuid(),
    text: z.string().min(1)
})

const UseCreateComment = (forObject?: recordref_type, replyTo?: recordref_type) => {
    const queryClient = useQueryClient();

    const form = useForm<z.infer<typeof commentFormSchema>>({
        resolver: zodResolver(commentFormSchema),
        defaultValues: {
            id: uuid()
        }
    })

    return {
        schema: commentFormSchema,
        form, 
        values: form.getValues(),
        mutation: useMutation({
            mutationFn: async (newComment: createCommentSchema) => {
                if (forObject != undefined) {
                    const resp = await gql<any>(
                        `mutation create_comment($text: String!, $forObject: RecordRefInput!) {
                            create_comment(text: $text, forObject: $forObject) {
                                comment {
                                    id,
                                    posted_by { 
                                        name 
                                    },
                                    text,
                                    ref {
                                        id,
                                        partition,
                                        container
                                    }
                                }
                            }
                        }
                        `,
                        {
                            text: newComment.text,
                            forObject
                        }
                    )
                    return resp.create_comment.comment;
                }
                else if (replyTo != undefined) {
                    const resp = await gql<any>(
                        `mutation reply_to_comment($text: String!, $replyTo: RecordRefInput!) {
                            reply_to_comment(text: $text, replyTo: $replyTo) {
                                comment {
                                    id,
                                    posted_by { 
                                        name 
                                    },
                                    text,
                                    ref {
                                        id,
                                        partition,
                                        container
                                    }
                                }
                            }
                        }
                        `,
                        {
                            text: newComment.text,
                            replyTo
                        }
                    )
                    return resp.reply_to_comment.comment;
                } else {
                    throw 'Must provide a reply to or for object to create a comment.'
                }  
            },
            onSuccess: async (data : comment_type) => {
                const keyId = forObject ?? replyTo

                queryClient.setQueryData(["comments-for-object", keyId], (old: comment_type[]) => {
                    if (old == undefined) return [data];
                    return [data, ...old];
                });

                if (replyTo != undefined) {
                    queryClient.setQueryData(["replies-to-comment", replyTo], (old: comment_type[]) => {
                        if (old == undefined) return [data];
                        return [data, ...old];
                    });

                    queryClient.setQueryData(['stats-for-comment', replyTo], (old: any) => {
                        return {
                            ...old,
                            replyCount: (old.replyCount ?? 0) + 1
                        }
                    })
                }

            }
        }) 
    }
}

export default UseCreateComment
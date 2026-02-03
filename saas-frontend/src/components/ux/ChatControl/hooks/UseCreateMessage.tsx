'use client';

import { z } from "zod";
import { useForm } from "react-hook-form";
import { gql } from "@/lib/services/gql";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query"
import { message_type, recordref_type } from "@/utils/spiriverse";
import { v4 as uuid } from "uuid";
import { MediaSchema } from "@/shared/schemas/media";
import { omit } from "@/lib/functions";

export type messageSchema = z.infer<typeof messageSchema>

export const messageSchema = z.object({
    id: z.string().uuid(),
    // allowResponse: z.object({
    //     allow: z.boolean(),
    //     code: z.string()
    // }),
    text: z.string().optional(),
    media: z.array(MediaSchema)
})

const UseCreateMessage = (
    forObject?: recordref_type, 
    deliverTo?: { userId: string, mode: string }, 
    vendorId?: string, 
    replyTo?: recordref_type
    // onMessageSent?: (message: message_type) => void
) => {

    const form = useForm<z.infer<typeof messageSchema>>({
        resolver: zodResolver(messageSchema),
        defaultValues: {
            id: uuid(),
            media: []
        }
    })

    return {
        form, 
        schema: messageSchema,
        values: form.getValues(),
        mutation: useMutation({
            mutationFn: async (newMessage: messageSchema) => {
                if (forObject != undefined) {
                    const resp = await gql<{
                        create_message: {
                            chat: message_type
                        }
                    }>( `mutation create_message($text: String, $media: [MediaInput], $forObject: RecordRefInput!, $vendorId: ID, $deliver_to: DeliverToInput, $reply_to: RecordRefInput) {
                            create_message(text: $text, media: $media, forObject: $forObject, vendorId: $vendorId, deliver_to: $deliver_to, reply_to: $reply_to) {
                                chat {
                                    id,
                                    text,
                                    posted_by {
                                        ref {
                                            id
                                            partition
                                            container
                                        }
                                        name
                                    },
                                    posted_by_vendor {
                                        id,
                                        name
                                    },
                                    ref {
                                        id,
                                        partition,
                                        container
                                    },
                                    reply_to {
                                        id,
                                        text,
                                        posted_by_user {
                                            id,
                                            firstname
                                        },
                                        posted_by_vendor {
                                            id,
                                            name
                                        }
                                    },
                                    deliver_to {
                                        userId,
                                        requiresResponse,
                                        responseCode,
                                        datetime,
                                        mode,
                                    }
                                    sentAt,
                                    respondedAt,
                                    media {
                                        name,
                                        url,
                                        code,
                                        title,
                                        description,
                                        hashtags
                                    }
                                }
                            }
                        }
                        `,
                        {
                            text: newMessage.text,
                            vendorId: vendorId,
                            forObject,
                            deliver_to: deliverTo,
                            reply_to: replyTo,
                            media: newMessage.media.map(message => omit(message, ["url"]))
                        }
                    )
                    return resp.create_message.chat;
                }
            },
            onSuccess: async () => {
                // queryClient.setQueryData(["message-for-object", replyTo != null ? replyTo : forObject], (old: message_type[]) => {
                //     if (old == undefined) return [data];
                //     return [data, ...old];
                // });
            }
        }) 
    }
}

export default UseCreateMessage
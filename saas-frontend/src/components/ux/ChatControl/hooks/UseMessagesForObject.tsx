'use client';

import { useRealTimeQueryList } from "@/components/utils/RealTime/useRealTimeQueryList";
import { gql } from "@/lib/services/gql";

import { message_type, recordref_type } from "@/utils/spiriverse";

const key = 'message-for-object';

const MESSAGE_FIELDS = `
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
    posted_by_user {
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
`

const queryFn = async ({ forObject }: {forObject: recordref_type}) => {

    const resp = await gql<{
        messages: message_type[]
    }>( `query get_messages_for_object($forObject: RecordRefInput!) {
            messages(forObject: $forObject) {
                ${MESSAGE_FIELDS}
            }
        }`,
        {
            forObject
        }
    )
    return resp.messages;
}

const hydrateFn = async (id: recordref_type) => {
    const resp = await gql<{
        message: message_type
    }>( `query get_message($ref: RecordRefInput!) {
            message(ref: $ref) {
                ${MESSAGE_FIELDS}
            }
        }`,
        {
            ref: id
        }
    )
    return resp.message;
}

const UseMessagesForObject = (forObject: recordref_type) => {
    const queryKey = [key, forObject]

    return useRealTimeQueryList<message_type>({
        queryKey,
        queryFn: () => queryFn({ forObject }),
        hydrateFn,
        realtimeEvent: "messages",
        signalRGroup: `chat-${forObject.id}-${forObject.partition}-${forObject.container}`,
        selectId: (d) => d.ref,
    });
}

export default UseMessagesForObject
'use client';

import { gql } from "@/lib/services/gql";
import { comment_type, recordref_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

const key = 'reply-to-object';

const queryFn = async (replyTo: recordref_type) => {

    const resp = await gql<{
        replies: comment_type[]
    }>( `query get_replies($replyTo: RecordRefInput!) {
            replies(replyTo: $replyTo) {
                id,
                text,
                posted_by { 
                    name 
                    isOwner
                }
                replyCount
                ref {
                    id
                    partition
                    container 
                }
            }
        }`,
        {
            replyTo
        }
    )
    return resp.replies;
}

const UseReplies = (forObject: recordref_type) => {
    return useQuery({
        queryKey: [key, forObject],
        queryFn: () => queryFn(forObject)
    });
}

export default UseReplies
'use client';

import { gql } from "@/lib/services/gql";
import { comment_type, recordref_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

const key = 'comments-for-object';

const queryFn = async (forObject: recordref_type) => {

    const resp = await gql<{
        comments: comment_type[]
    }>( `query get_comments_for_object($forObject: RecordRefInput!) {
            comments(forObject: $forObject) {
                id,
                text,
                posted_by { 
                    name,
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
            forObject
        }
    )
    return resp.comments;
}

const UseComment = (forObject: recordref_type) => {
    return useQuery({
        queryKey: [key, forObject],
        queryFn: () => queryFn(forObject)
    });
}

export default UseComment
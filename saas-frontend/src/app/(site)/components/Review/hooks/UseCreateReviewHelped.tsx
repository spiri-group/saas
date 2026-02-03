'use client';

import { gql } from "@/lib/services/gql";
import { recordref_type } from "@/utils/spiriverse";
import { useMutation } from "@tanstack/react-query"

const UseReviewHelped = (ref: recordref_type,  helped: boolean) => {
    
    return {
        mutation: useMutation({
            mutationFn: async () => {
                const resp = await gql<any>(
                    `mutation review_helped($ref: RecordRefInput!, $helped: Boolean!) {
                        review_helped(ref: $ref, helped: $helped) {
                            code
                            message
                            helpedState {
                                count
                            }
                        }
                      }
                    `,
                    {
                        ref,
                        helped
                    }
                );
                return resp.review_helped;
            },
            // onSuccess: async (data: review_type, _, __) => {
            //     queryClient.setQueryData(["review-for-listing", objectId, objectPartition ], (old: review_type[]) => {
            //         return [data, ...(old ?? [])];
            //     });
            // }
        }) 
    }
}

export default UseReviewHelped
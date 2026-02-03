'use client';

import { gql } from "@/lib/services/gql";
import { review_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

const key = 'reviews-for-listing';

const queryFn = async (id: string, vendorId: string) => {

    const resp = await gql<{
        listing: {
            reviews: review_type[]
    }
    }>( `query get_reviews_for_listing($id: String!, $vendorId: String!) {
            listing(id: $id, vendorId: $vendorId) {
                id
                reviews {
                    headline
                    base {
                        id,
                        text,
                        posted_by {
                            name
                        },
                        createdDate,
                        isReported,
                        ref {
                            id
                            partition
                            container
                        },
                        replyCount
                    }
                    rating 
                }
            }
        }`,
        {
            id, 
            vendorId
        }
    )
    return resp.listing.reviews;
}

const UseReviews = (id: string, vendorId: string) => {
    return useQuery({
        queryKey: [key, id, vendorId],
        queryFn: () => queryFn(id, vendorId)
    });
}

export default UseReviews
import { gql } from "@/lib/services/gql"

import { rating_type } from "@/utils/spiriverse"
import { useQuery } from "@tanstack/react-query"

export const key = 'ratings-for-listing'

const queryFn = async (id: string, vendorId: string) => {

    const resp = await gql<{
        listing: {
            rating: rating_type
        }
    }>( `query get_ratings_for_listing($id: String!, $vendorId: String!) {
            listing(id: $id, vendorId: $vendorId) {
                id
                rating {
                    total_count
                    average
                    rating1
                    rating2
                    rating3
                    rating4
                    rating5
                }
            }
        }`,
        {
            id, 
            vendorId
        }
    )
    return resp.listing.rating;
}

const UseListingRatings = (id: string, vendorId: string) => {
    return useQuery({
        queryKey: [key, id, vendorId],
        queryFn: () => queryFn(id, vendorId)
    });
}

export default UseListingRatings
import { gql } from "@/lib/services/gql";
import { tour_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

const key = 'public-tour-details';

const queryFn = async (merchantId: string, tourId: string) => {
    const resp = await gql<{
        tour: tour_type
    }>(
        `query get_tour($id: ID!, $vendorId: ID!) {
            tour(id: $id, vendorId: $vendorId) {
                id
                name
                description
                terms
                faq {
                    id
                    title
                    description
                }
                thumbnail {
                    image {
                        media {
                            url
                        }
                        objectFit
                        zoom
                    }
                    bgColor
                    title {
                        content
                    }
                }
                ticketVariants {
                    id
                    name
                    description
                    price {
                        amount
                        currency
                    }
                    peopleCount
                    inventory {
                        qty_available
                        track_inventory
                        low_stock_threshold
                        allow_backorder
                    }
                }
                activityLists {
                    id
                    name
                    activities {
                        id
                        name
                        time
                    }
                }
                vendor {
                    id
                    name
                    slug
                }
                ref {
                    id
                    partition
                    container
                }
            }
        }`,
        {
            id: tourId,
            vendorId: merchantId
        }
    )
    return resp.tour;
}

const UseTourDetails = (merchantId: string, tourId: string) => {
    return useQuery({
        queryKey: [key, merchantId, tourId],
        queryFn: () => queryFn(merchantId, tourId)
    });
}

export default UseTourDetails;

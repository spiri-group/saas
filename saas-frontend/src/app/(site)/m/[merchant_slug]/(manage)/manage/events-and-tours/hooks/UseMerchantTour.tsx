import { gql } from "@/lib/services/gql";
import { tour_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

const key = 'details-for-tour-for-merchant';

const queryFn = async (merchantId?: string, tourId?: string) => {

    const tourQuery = await gql<{
        tour: tour_type
    }>( `query get_tour($id: ID!, $merchantId: ID!) {
                tour(id: $id, vendorId: $merchantId) {
                    id
                    name
                    activityLists {
                        id
                        name
                        activities {
                            id
                            name
                            location {
                                formattedAddress
                            }
                            time
                        }
                    },
                    ticketLists {
                        id
                        name
                        tickets {
                            id
                            name
                            price {
                                amount
                                currency
                            }
                        }
                    }
                }
            }
        `,
    {
        id: tourId,
        merchantId: merchantId
    })
    
    return tourQuery.tour;
}

const UseMerchantTour = (merchantId?: string, tourId?: string) => {
    return useQuery({
        queryKey: [key, merchantId, tourId],
        queryFn: () => queryFn(merchantId, tourId),
        enabled: !!merchantId && !!tourId
    });
}

export default UseMerchantTour
'use client';

import { gql } from "@/lib/services/gql";
import { tour_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

export const KEY = "tour-details-for-session";

const UseTourDetails = (merchantId: string, tourId: string) => {
    return useQuery({
        queryKey: [KEY, merchantId, tourId],
        queryFn: async () => {
            const resp = await gql<{
                tour: tour_type
            }>(
                `query get_tour($id: ID!, $vendorId: ID!){
                    tour(id: $id, vendorId: $vendorId) {
                        id,
                        name,
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
                                qty_on_hand
                                qty_committed
                                qty_available
                                track_inventory
                            }
                        }
                    }
                }`,
                {
                    id: tourId,
                    vendorId: merchantId
                }
            );
            return resp.tour;
        },
        enabled: !!merchantId && !!tourId
    });
};

export default UseTourDetails;

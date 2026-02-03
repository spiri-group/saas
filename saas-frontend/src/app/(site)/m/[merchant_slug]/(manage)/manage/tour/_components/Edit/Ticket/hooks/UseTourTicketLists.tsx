import { gql } from "@/lib/services/gql";

import {  ticketList_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";
 
const key = "get-customers-by-merchant";

const queryFn = async (merchantId: string, tourId: string) => {

    const resp = await gql<{
        tour: {
            ticketlists: ticketList_type[]
        }
    }>(
        `query get_ticketlist($tourId: ID!, $merchantId: ID!) {
            tour(tourId: $tourId, vendorId: $merchantId) {
                ticketLists {
                    id
                    name
                    tickets {
                        id
                        name
                        price
                    }
                }
            }
        }
        `,
        {
            tourId,
            merchantId
        }
    )
  
    return resp.tour.ticketlists;
}
  

const UseTourTicketLists = (merchantId: string, tourId: string) => {
    return useQuery({
        queryKey: [key, merchantId, tourId],
        queryFn: () => queryFn(merchantId, tourId)
    });
}

export default UseTourTicketLists;
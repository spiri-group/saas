import { gql } from "@/lib/services/gql";

import { activityList_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";
 
const key = "get-activityList-by-tour";

const queryFn = async (merchantId: string, tourId: string) => {

    const resp = await gql<{
        tour: {
            activityLists: activityList_type[]
        }
    }>(`query get_activityList($tourId: ID!, $merchantId: ID!) {
            tour(tourId: $tourId, vendorId: $merchantId) {
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
            }
        }
        `,
        {
          merchantId,
          tourId
        }
    )
  
    return resp.tour.activityLists;
}
  

const UseTourActivityLists = (merchantId: string, tourId: string) => {
    return useQuery({
        queryKey: [key, merchantId, tourId],
        queryFn: () => queryFn(merchantId, tourId)
    });
}

export default UseTourActivityLists;
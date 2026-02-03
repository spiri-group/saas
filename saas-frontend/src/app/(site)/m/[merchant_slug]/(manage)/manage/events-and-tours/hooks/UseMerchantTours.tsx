import { gql } from "@/lib/services/gql";
import { tour_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

const key = 'tours-for-merchant';

const queryFn = async (merchantId?: string) => {
    if (merchantId == null) return null;

    const resp = await gql<{
        catalogue: tour_type[]
    }>( `query($merchantId: ID!) {
            catalogue(vendorId: $merchantId, types:["TOUR"]) {
                id
                name,
                ref {
                    id
                    partition
                    container
                }
            }
        }
        `,
        {
            merchantId: merchantId
        }
    )
    return resp.catalogue;
}

const UseMerchantTours = (merchantId?: string) => {
    return useQuery({
        queryKey: [key, merchantId],
        queryFn: () => queryFn(merchantId)
    });
}

export default UseMerchantTours
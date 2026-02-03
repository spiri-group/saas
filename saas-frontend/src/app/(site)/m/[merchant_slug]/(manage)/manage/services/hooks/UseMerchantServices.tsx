import { gql } from "@/lib/services/gql";

import { service_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

const key = 'services-for-merchant';

const queryFn = async (merchantId?: string) => {
    if (merchantId == null) return null;

    const resp = await gql<{
        catalogue: service_type[]
    }>(  
        `query($merchantId: ID!) {
            catalogue(vendorId: $merchantId, types:["SERVICE"]) {
                id
                name
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

const UseMerchantServices = (merchantId?: string) => {
    return useQuery({
        queryKey: [key, merchantId],
        queryFn: () => queryFn(merchantId)
    });
}

export default UseMerchantServices
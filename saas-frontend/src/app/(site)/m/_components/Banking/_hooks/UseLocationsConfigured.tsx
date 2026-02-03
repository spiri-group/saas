import { isNullOrUndefined } from "@/lib/functions";
import { gql } from "@/lib/services/gql";
import { useQuery } from "@tanstack/react-query";

const key = 'locations-configured-for-merchant';

const queryFn = async (merchantId: string) => {
    const resp = await gql<{
        vendor: {
            id: string;
            locations: {
                id: string;
            }[];
        }
    }>( `query get_merchantLocationsConfigured($merchantId: String!) {
              vendor(id:$merchantId)  {
                id
                locations {
                    id
                }
              }
          }
        `,
        {
            merchantId: merchantId
        }
    )

    return !isNullOrUndefined(resp.vendor.locations) && resp.vendor.locations.length > 0
}

const UseLocationsConfigured = (merchantId: string) => {
    return useQuery({
        queryKey: [key, merchantId],
        queryFn: () => queryFn(merchantId),
        enabled: !!merchantId && merchantId.length > 0
    })
}

export default UseLocationsConfigured
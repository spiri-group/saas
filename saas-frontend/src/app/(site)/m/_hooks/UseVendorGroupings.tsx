import { gql } from "@/lib/services/gql";
import { useQuery } from "@tanstack/react-query";

const key = 'groupings-for-vendor';

type GroupingsTypes = "CATEGORY" | "PLAYLIST"

const queryFn = async (merchantId: string, types?: GroupingsTypes[]) => {
    const resp = await gql<{
        listingGroupings: {
            id: string
            name: string
        }[] 
    }>( `query get_merchantGroupings($vendorId: String!, $type: [GroupingsType]) {
              listingGroupings(vendorId: $vendorId, types: $type) {
                id
                name
              }
          }
        `,
        {
            vendorId: merchantId,
            types
        }
    )

    return resp.listingGroupings
}

const UseVendorGroupings = (merchantId: string, types: GroupingsTypes[] ) => {
    return useQuery({
        queryKey: [key, merchantId, types.join('-')],
        queryFn: () => queryFn(merchantId, types),
        enabled: !!merchantId && merchantId.length > 0
    });
}

export default UseVendorGroupings
import { gql } from "@/lib/services/gql";
import { vendor_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

const key = 'teamMembers-for-merchant'

const queryFn = async (merchantId: string) => {
    const resp = await gql<{
        vendor: vendor_type 
    }>( `query get_vendorTeamMembers($vendorId: String!) {
            vendor(id:$vendorId)  {
                id,
                teamMembers {
                    id,
                    name,
                    tagline,
                    bio,
                    image {
                        url,
                        urlRelative,
                        name,
                        size,
                        type
                    }
                }
            }
        }
        `,
        {
            vendorId: merchantId
        }
    )
    return resp.vendor.teamMembers;
}

const UseVendorTeamMembers = (merchantId: string) => {
    return useQuery({
        queryKey: [key, merchantId],
        queryFn: () => queryFn(merchantId),
        enabled: !!merchantId && merchantId.length > 0
    });
}

export default UseVendorTeamMembers
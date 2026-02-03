import { gql } from "@/lib/services/gql";
import { vendor_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

const key = 'descriptions-for-vendor';

const queryFn = async (merchantId: string) => {
    const resp = await gql<{
        vendor: vendor_type
    }>( `query get_vendorInformation($vendorId: String!) {
              vendor(id:$vendorId)  {
                id
                descriptions {
                    id
                    title
                    body 
                    supporting_images {
                        name
                        url
                        urlRelative
                        size
                        type
                        title
                        description
                        hashtags
                    }
                }
              }
          }
        `,
        {
            vendorId: merchantId
        }
    )

    return resp
}

const UseVendorDescriptions = (merchantId: string) => {
    return useQuery({
        queryKey: [key, merchantId],
        queryFn: () => queryFn(merchantId),
        enabled: !!merchantId && merchantId.length > 0
    });
}

export default UseVendorDescriptions
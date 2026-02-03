import { gql } from "@/lib/services/gql";
import { vendor_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

const key = 'contact-information-for-vendor';

const queryFn = async (merchantId: string) => {
    const resp = await gql<{
        vendor: vendor_type
    }>( `query get_vendorInformation($vendorId: String!) {
              vendor(id:$vendorId)  {
                id
                website
                contact {
                    public {
                        email
                        phoneNumber {
                            displayAs
                            value
                            raw
                        }
                    }
                    internal {
                        email
                        phoneNumber {
                            displayAs
                            value
                            raw
                        }
                    }
                }
              }
          }
        `,
        {
            vendorId: merchantId
        }
    )
    return resp.vendor;
}

const UseVendorContactInformation = (merchantId: string) => {
    return useQuery({
        queryKey: [key, merchantId],
        queryFn: () => queryFn(merchantId),
        enabled: !!merchantId && merchantId.length > 0
    });
}

export default UseVendorContactInformation
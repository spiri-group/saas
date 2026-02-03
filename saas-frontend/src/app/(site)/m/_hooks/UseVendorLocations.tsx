import { gql } from "@/lib/services/gql";
import { vendor_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

const key = 'locations-for-vendor';

const queryFn = async (merchantId: string) => {
    const resp = await gql<{
        vendor: vendor_type
    }>( `query get_vendorInformation($vendorId: String!) {
              vendor(id:$vendorId)  {
                id
                locations {
                    id
                    title
                    address {
                        id
                        formattedAddress
                        components {
                            country 
                        }
                        point {
                            type
                            coordinates {
                                lat
                                lng
                            }
                        }
                    }
                    services
                }
              }
          }
        `,
        {
            vendorId: merchantId
        }
    )

    return resp.vendor.locations;
}

const UseVendorLocations = (merchantId: string) => {
    return useQuery({
        queryKey: [key, merchantId],
        queryFn: () => queryFn(merchantId),
        enabled: !!merchantId && merchantId.length > 0
    });
}

export default UseVendorLocations
import { distinctBy } from "@/lib/functions";
import { gql } from "@/lib/services/gql";
import { vendor_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";
import { countries } from "countries-list";

const key = 'countries-for-vendor';

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
                        components {
                            country
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

    return distinctBy(resp.vendor.locations, (location) => location.address.components.country)
        .map((country_acronym) => ({
            key: country_acronym,
            label: countries[country_acronym].name
        })).sort((a, b) => a.key.localeCompare(b.key));
}

const UseVendorLocations = (merchantId: string) => {
    return useQuery({
        queryKey: [key, merchantId],
        queryFn: () => queryFn(merchantId),
        enabled: !!merchantId && merchantId.length > 0
    });
}

export default UseVendorLocations
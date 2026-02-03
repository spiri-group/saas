import { gql } from "@/lib/services/gql";
import { useQuery } from "@tanstack/react-query";

const key = 'currency-for-vendor';

const queryFn = async (merchantId: string) => {
    const resp = await gql<{
        vendor: {
            id: string,
            currency: string, // ISO 4217
            country: string // ISO 3166-1 alpha-2
        }
    }>( `query get_vendorInformation($vendorId: String!) {
              vendor(id:$vendorId)  {
                id
                currency
                country
              }
          }
        `,
        {
            vendorId: merchantId
        }
    )

    return resp
}

const UseVendorCurrency = (merchantId: string) => {
    return useQuery({
        queryKey: [key, merchantId],
        queryFn: () => queryFn(merchantId),
        enabled: !!merchantId && merchantId.length > 0
    });
}

export default UseVendorCurrency
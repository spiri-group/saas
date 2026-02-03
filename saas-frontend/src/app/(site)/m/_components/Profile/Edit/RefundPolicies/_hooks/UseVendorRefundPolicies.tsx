import { gql } from "@/lib/services/gql";
import { useQuery } from "@tanstack/react-query";

const key = 'product-return-policies-for-merchant';

export const queryFn = async (merchantId: string, listingType?: string, country?: string) => {

    const resp = await gql<{
        productReturnPolicies: {
            id: string,
            title: string,
            listingType: string,
            country: string,
            updatedDate?: string
        }[]
    }>( `query productReturnPolicies($merchantId: ID!, $listingType: String, $country: String) {
              productReturnPolicies(merchantId:$merchantId, listingType: $listingType, country: $country)  {
                id
                title
                listingType
                country
                updatedDate
              }
          }`,
        {
            merchantId,
            listingType,
            country
        }
    );

    // Add any additional processing here
    // additional processing

    return resp.productReturnPolicies;
}

const useVendorRefundPolicies = (merchantId: string, listingType?: string, country?: string) => {
    return useQuery({
        queryKey: [key, merchantId, listingType, country],
        queryFn: () => queryFn(merchantId, listingType, country)
    });
}

export default useVendorRefundPolicies;
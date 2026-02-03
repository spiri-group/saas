import { gql } from "@/lib/services/gql";
import { useQuery } from "@tanstack/react-query";

const key = 'product-return-policy-for-merchant';

export const queryFn = async (merchantId: string, policyId: string) => {
    const resp = await gql<{
        productReturnPolicy: {
            id: string,
            title: string,
            listingType: string,
            country: string,
            updatedDate?: string,
            reasons: {
                id: string,
                code: string,
                title: string,
                confirmed: boolean,
                no_refund: boolean,
                whoPayShipping: string,
                tiers: {
                    daysUpTo: number,
                    refundPercentage: number,
                    refundCustomerFees: boolean
                }[],
                conditions: {
                    id: string,
                    title: string,
                    code: string,
                    isCustom: boolean,
                    description: string
                }[]
            }[]
        }
    }>( `query productReturnPolicy($merchantId: ID!, $policyId: ID!) {
              productReturnPolicy(merchantId:$merchantId, policyId: $policyId)  {
                id
                title
                listingType
                country
                updatedDate
                reasons {
                    id
                    code
                    title
                    confirmed
                    no_refund
                    whoPayShipping
                    tiers {
                        id
                        daysUpTo
                        refundPercentage
                        refundCustomerFees
                    }
                    conditions {
                        id
                        code
                        isCustom
                        title
                        description
                    }
                }
              }
          }`,
        {
            merchantId: merchantId,
            policyId: policyId
        }
    );

    // Add any additional processing here
    // additional processing

    return resp.productReturnPolicy;
}

const useVendorRefundPolicy = (merchantId: string, policyId: string) => {
    return useQuery({
        queryKey: [key, merchantId, policyId],
        queryFn: () => queryFn(merchantId, policyId)
    });
}

export default useVendorRefundPolicy;
import { isNullOrUndefined, isNullOrWhitespace } from "@/lib/functions";
import { gql } from "@/lib/services/gql";
import { vendor_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";


export const queryFn = async (merchantId: string, components?: string[], returnUrl?: string ) => {

    const resp = await gql<{
        vendor: vendor_type 
    }>( `query get_vendorStripeMerchantAccount($vendorId: String!${!isNullOrWhitespace(returnUrl) ? ", $returnUrl: String" : ""}${!isNullOrUndefined(components) ? ", $components: [String]!" : ""}) {
            vendor(id:$vendorId)  {
                id,
                stripe_business {
                        id,
                        disabled_reason,
                        currently_due, past_due
                    ${!isNullOrUndefined(components) ? `
                        token(components: $components)
                    ` : ""}
                    ${!isNullOrWhitespace(returnUrl) ? `
                        onboarding_link(return_url: $returnUrl) {
                            url
                        }
                        update_link(return_url: $returnUrl) {
                            url
                        }
                    ` : ""
                    }
                }
            }
        }`,
        {
            vendorId: merchantId,
            components,
            returnUrl
        }
    )
    return resp.vendor.stripe_business;
}

const UseStripeMerchantAccount = (merchantId: string, components?: string[], returnUrl?: string) => {
    return useQuery({
        queryKey: [merchantId],
        queryFn: () => queryFn(merchantId, components, returnUrl),
        enabled: !!merchantId && merchantId.length > 0
    });
}

export default UseStripeMerchantAccount
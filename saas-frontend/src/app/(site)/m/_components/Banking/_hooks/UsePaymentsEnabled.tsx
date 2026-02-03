import { gql } from "@/lib/services/gql";
import { useQuery } from "@tanstack/react-query";

const key = 'payments-enabled-for-merchant';

const queryFn = async (merchantId: string) => {
    const resp = await gql<{
        vendor: {
            stripe_business: {
                disabled_reason: string
                charges_enabled: boolean | null
            }
        }
    }>( `query get_merchantPaymentsEnabled($merchantId: String!) {
              vendor(id:$merchantId)  {
                id
                stripe_business {
                    id
                    disabled_reason
                    charges_enabled
                }
              }
          }
        `,
        {
            merchantId: merchantId
        }
    )

    // Payments are enabled if charges_enabled is true
    // This properly handles pending_verification which doesn't block charges
    const stripeBusiness = resp.vendor?.stripe_business;
    if (!stripeBusiness) return false;

    return stripeBusiness.charges_enabled === true;
}

const UsePaymentsEnabled = (merchantId: string) => {
    return useQuery({
        queryKey: [key, merchantId],
        queryFn: () => queryFn(merchantId),
        enabled: !!merchantId && merchantId.length > 0
    })
}

export default UsePaymentsEnabled
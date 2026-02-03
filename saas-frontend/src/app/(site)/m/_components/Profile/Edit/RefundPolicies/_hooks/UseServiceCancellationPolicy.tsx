import { gql } from "@/lib/services/gql";
import { useQuery } from "@tanstack/react-query";

const key = 'service-cancellation-policy-for-merchant';

export const queryFn = async (merchantId: string, policyId: string) => {
    const resp = await gql<{
        serviceCancellationPolicy: {
            id: string,
            title: string,
            serviceCategory: string,
            fullRefundHours?: number,
            partialRefundHours?: number,
            partialRefundPercentage?: number,
            noRefundHours?: number,
            allowRescheduling: boolean,
            maxReschedules?: number,
            rescheduleMinHours?: number,
            updatedDate?: string
        }
    }>( `query serviceCancellationPolicy($merchantId: ID!, $policyId: ID!) {
              serviceCancellationPolicy(merchantId:$merchantId, policyId: $policyId)  {
                id
                title
                serviceCategory
                fullRefundHours
                partialRefundHours
                partialRefundPercentage
                noRefundHours
                allowRescheduling
                maxReschedules
                rescheduleMinHours
                updatedDate
              }
          }`,
        {
            merchantId: merchantId,
            policyId: policyId
        }
    );

    return resp.serviceCancellationPolicy;
}

const useServiceCancellationPolicy = (merchantId: string, policyId: string) => {
    return useQuery({
        queryKey: [key, merchantId, policyId],
        queryFn: () => queryFn(merchantId, policyId)
    });
}

export default useServiceCancellationPolicy;

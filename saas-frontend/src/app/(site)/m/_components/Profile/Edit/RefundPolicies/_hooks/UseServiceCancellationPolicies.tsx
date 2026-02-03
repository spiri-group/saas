import { gql } from "@/lib/services/gql";
import { useQuery } from "@tanstack/react-query";

const key = 'service-cancellation-policies-for-merchant';

export const queryFn = async (merchantId: string, serviceCategory?: string) => {
    const resp = await gql<{
        serviceCancellationPolicies: {
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
        }[]
    }>( `query serviceCancellationPolicies($merchantId: ID!, $serviceCategory: String) {
              serviceCancellationPolicies(merchantId:$merchantId, serviceCategory: $serviceCategory)  {
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
            merchantId,
            serviceCategory
        }
    );

    return resp.serviceCancellationPolicies;
}

const useServiceCancellationPolicies = (merchantId: string, serviceCategory?: string) => {
    return useQuery({
        queryKey: [key, merchantId, serviceCategory],
        queryFn: () => queryFn(merchantId, serviceCategory)
    });
}

export default useServiceCancellationPolicies;

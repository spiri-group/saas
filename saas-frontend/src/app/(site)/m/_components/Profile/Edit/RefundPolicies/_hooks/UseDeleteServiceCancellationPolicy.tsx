'use client';

import { gql } from "@/lib/services/gql"
import { useMutation, useQueryClient } from "@tanstack/react-query"

type Props = {
    merchantId: string
}

type MutationProps = {
    policyId: string;
}

const UseDeleteServiceCancellationPolicy = (args: Props) => {
    const { merchantId } = args;
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ policyId }: MutationProps) => {
            await gql<{
                success: boolean;
            }>(`mutation delete_service_cancellation_policy($policyId: ID!, $merchantId: ID!) {
                delete_service_cancellation_policy(policyId:$policyId, merchantId: $merchantId) {
                    success
                }
            }`, { policyId, merchantId })
            return policyId
        },
        mutationKey: ["delete-service-cancellation-policy"],
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey:['service-cancellation-policies-for-merchant', merchantId]
            });
        }
    })
}

export default UseDeleteServiceCancellationPolicy

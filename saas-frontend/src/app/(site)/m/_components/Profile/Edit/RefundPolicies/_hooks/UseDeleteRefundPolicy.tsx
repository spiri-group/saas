'use client';

import { gql } from "@/lib/services/gql"
import { useMutation, useQueryClient } from "@tanstack/react-query"

type Props = {
    merchantId: string
}

type MutationProps = {   
    policyId: string;
}

const UseDeleteRefundPolicy = (args: Props) => {
    const { merchantId } = args;
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ policyId }: MutationProps) => {
            await gql<{
                success: boolean;
            }>(`mutation delete_product_return_policy($policyId: ID!, $merchantId: ID!) {
                delete_product_return_policy(policyId:$policyId, merchantId: $merchantId) {
                    success
                }
            }`, { policyId, merchantId })
            return policyId
        },
        mutationKey: ["delete-product-return-policy"],
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey:['product-return-policies-for-merchant', merchantId]
            });
        }
    })
}

export default UseDeleteRefundPolicy
'use client';

import { gql } from "@/lib/services/gql";
import { recordref_type } from "@/utils/spiriverse";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const UseApproveRefund = (merchantId: string) => {
    const queryClient = useQueryClient();

    return {
        mutation: useMutation({
            mutationFn: async (orderRef: recordref_type) => {
                const resp = await gql<{
                    approve_request_refund: {
                        order: {
                            id: string;
                        }
                    }
                }>(
                    `mutation approve_request_refund($orderRef: RecordRefInput) {
                        approve_request_refund(orderRef: $orderRef) {
                            order {
                                id
                            }
                        }
                    }`,
                    {
                        orderRef
                    }
                );
        
                return resp.approve_request_refund.order;
            },
            onSuccess: () => {
                // Invalidate merchant refunds to refresh the list
                queryClient.invalidateQueries({
                    queryKey: ['merchantRefunds', merchantId]
                });
            }
        })
    }
};

export default UseApproveRefund;
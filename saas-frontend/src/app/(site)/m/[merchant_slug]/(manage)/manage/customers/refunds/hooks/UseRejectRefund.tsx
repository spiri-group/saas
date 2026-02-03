'use client';

import { gql } from "@/lib/services/gql";
import { recordref_type } from "@/utils/spiriverse";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const UseRejectRefund = (merchantId: string) => {
    const queryClient = useQueryClient();

    return {
        mutation: useMutation({
            mutationFn: async (orderRef: recordref_type) => {
                const resp = await gql<{
                    reject_request_refund: {
                        order: {
                            id: string;
                        }
                    }
                }>(
                    `mutation reject_request_refund($orderRef: RecordRefInput) {
                        reject_request_refund(orderRef: $orderRef) {
                            order {
                                id
                            }
                        }
                    }`,
                    {
                        orderRef
                    }
                );
        
                return resp.reject_request_refund.order;
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

export default UseRejectRefund;
'use client';

import { gql } from "@/lib/services/gql";
import { recordref_type } from "@/utils/spiriverse";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const UseRequestBetterEvidence = (merchantId: string) => {
    const queryClient = useQueryClient();

    return {
        mutation: useMutation({
            mutationFn: async ({ orderRef, message }: { orderRef: recordref_type; message: string }) => {
                const resp = await gql<{
                    request_better_evidence: {
                        order: {
                            id: string;
                        }
                    }
                }>(
                    `mutation request_better_evidence($orderRef: RecordRefInput, $message: String) {
                        request_better_evidence(orderRef: $orderRef, message: $message) {
                            order {
                                id
                            }
                        }
                    }`,
                    {
                        orderRef,
                        message
                    }
                );
        
                return resp.request_better_evidence.order;
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

export default UseRequestBetterEvidence;
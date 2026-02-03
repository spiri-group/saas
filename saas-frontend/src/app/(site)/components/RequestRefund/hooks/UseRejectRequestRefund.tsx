'use client';

import { gql } from "@/lib/services/gql";
import { recordref_type } from "@/utils/spiriverse";
import { useMutation } from "@tanstack/react-query";

const UseRequestRejectRefund = (order_ref: recordref_type) => {

    return {
        mutation: useMutation({
            mutationFn: async () => {
                const resp = await gql<{
                    reject_request_refund: {
                        order: {
                            refundRequest: { id: "disabled" }
                        }
                    }
                }>(
                    `mutation reject_request_refund($orderRef: RecordRefInput) {
                        reject_request_refund(orderRef: $orderRef) {
                            order {
                                id
                                refundRequest {
                                    id
                                }
                            }
                        }
                    }
                    `,
                    {
                        orderRef: order_ref
                    }
                )
        
                return resp.reject_request_refund.order.refundRequest;
            }
        })
    }
}

export default UseRequestRejectRefund
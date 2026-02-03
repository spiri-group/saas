'use client';

import { gql } from "@/lib/services/gql";
import { order_type } from "@/utils/spiriverse";
import { useMutation } from "@tanstack/react-query";

const UseRequestCancelRefund = (order: order_type) => {

    return {
        mutation: useMutation({
            mutationFn: async () => {
                const resp = await gql<{
                    cancel_request_refund: {
                        order: {
                            refundRequest: { id: "disabled" }
                        }
                    }
                }>(
                    `mutation cancel_request_refund($orderRef: RecordRefInput, $lines: [OrderLineRefundInput]) {
                        cancel_request_refund(orderRef: $orderRef, lines: $lines) {
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
                        orderRef: order.ref,
                        lines: []
                    }
                )
        
                return resp.cancel_request_refund.order.refundRequest;
            }
        })
    }
}

export default UseRequestCancelRefund
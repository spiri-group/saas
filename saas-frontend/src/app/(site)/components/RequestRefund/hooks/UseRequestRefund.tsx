'use client';

import { CurrencyAmountSchema } from "@/components/ux/CurrencyInput";
import { gql } from "@/lib/services/gql";
import { order_type } from "@/utils/spiriverse";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { v4 as uuid } from "uuid";
import { z } from "zod";

export type requestRefundSchema = z.infer<typeof requestRefundSchema>

export const requestRefundSchema = z.object({
    id: z.string().uuid(),
    lines: z.array(z.object({
        id: z.string().uuid(),
        descriptor: z.string(),
        price: CurrencyAmountSchema,
        quantity: z.coerce.number(),
        refund_status: z.enum(["FULL", "PARTIAL"]).nullable(),
        refund_quantity: z.coerce.number()
    }))
})

const UseRequestRefund = (order: order_type, existingRefundRequest: any) => {

    const form = useForm<z.infer<typeof requestRefundSchema>>({
        resolver: zodResolver(requestRefundSchema),
        defaultValues: 
        existingRefundRequest != null 
        && !["CANCELLED", "REJECTED"].includes(existingRefundRequest.status)
         ? ({
            id: existingRefundRequest.id,
            lines: existingRefundRequest.lines.map((line) => ({
                ...line,
                refund_quantity: line.refund_status == "REJECTED" ? 0 : line.refund_quantity,
                refund_status: line.refund_status == "REJECTED" ? null : line.refund_status
            }))
         } as any) : {
            id: uuid(),
            lines: order.lines.map((orderLine) => {
                return {
                    id: orderLine.id,
                    descriptor: orderLine.descriptor,
                    price: orderLine.price,
                    quantity: orderLine.quantity,
                    refund_status: null,
                    refund_quantity: 0
                }
            })
        }
    })

    return {
        form, 
        values: form.getValues(),
        mutation: useMutation({
            mutationFn: async (values: requestRefundSchema) => {
                const resp = await gql<{
                    upsert_request_refund: {
                        order: {
                            refundRequest: { id: "disabled" }
                        }
                    }
                }>(
                    `mutation upsert_request_refund($orderRef: RecordRefInput, $lines: [OrderLineRefundInput]) {
                        upsert_request_refund(orderRef: $orderRef, lines: $lines) {
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
                        lines: values.lines
                            .filter(line => line.refund_quantity > 0)
                            .map((line) => ({
                                id: line.id,
                                refund_quantity: line.refund_quantity,
                                refund: {
                                    amount: line.refund_quantity * line.price.amount,
                                    currency: line.price.currency
                                }
                            }))
                    }
                )
        
                return resp.upsert_request_refund.order.refundRequest;
            },
            // onSuccess: (data, _variables, _context) => {
            //     queryClient.setQueryData(["tourBookings"], (old: booking_type[]) => {
            //         return [data, ...old]
            //     })
            // }
        })
    }
}

export default UseRequestRefund
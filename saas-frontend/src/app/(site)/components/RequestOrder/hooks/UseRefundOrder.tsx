'use client';

import { CurrencyAmountSchema } from "@/components/ux/CurrencyInput";
import { gql } from "@/lib/services/gql";
import { order_type } from "@/utils/spiriverse";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useEffect } from "react";
import useFormStatus from "@/components/utils/UseFormStatus";

export type refundOrderSchema = z.infer<typeof refundOrderSchema>

export const refundOrderSchema= z.object({
    id: z.string().uuid(),
    lines: z.array(z.object({
        id: z.string().uuid(),
        total: CurrencyAmountSchema,
        refund: CurrencyAmountSchema,
        dirty: z.boolean()
    }))
})

const UseRefundOrder = (order: order_type | null | undefined) => {

    const form = useForm<z.infer<typeof refundOrderSchema>>({
        resolver: zodResolver(refundOrderSchema),
        defaultValues: order ? {
            id: order.id,
            lines: []
        } : undefined
    })

    useEffect(() => {
        if (order) {
            form.reset({
                id: order.id,
                lines: order.lines.map(line => {

                    return {
                        id: line.id,
                        total: line.total,
                        refund: line.refunded ?? {
                            amount: 0,
                            currency: line.price.currency
                        },
                        dirty: false
                    }
                })
            });
        }
    }, [order, form]);

    const status = useFormStatus();

    return {
        status,
        form, 
        values: form.getValues(),
        mutation: useMutation({
            mutationFn: async (values: refundOrderSchema) => {
                const resp = await gql<{
                    refund_order: {
                        order: {
                            refund: refundOrderSchema
                        }
                    }
                }>( `mutation refund_order($orderRef: RecordRefInput!, $lines: [OrderLineRefundInput]!) {
                        refund_order(orderRef: $orderRef, lines: $lines) {
                            order {
                                id
                                lines {
                                    id
                                }
                            }
                        }
                    }
                    `,
                    {
                        orderRef: order!.ref,
                        lines: values.lines.map(line => ({
                            id: line.id,
                            refund: {
                                amount: Math.round(line.refund.amount), // refunds must be in whole numbers
                                currency: line.refund.currency
                            }
                        }))
                    }
                )
        
                return resp.refund_order.order.refund
            }
        })
    }
}

export default UseRefundOrder
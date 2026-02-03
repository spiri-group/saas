'use client';

import { z } from "zod";
import { useForm } from "react-hook-form";
import { gql } from "@/lib/services/gql";
import { order_type, recordref_type } from "@/utils/spiriverse";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { v4 as uuid } from "uuid";
import { CurrencyAmountSchema } from "@/components/ux/CurrencyInput";

export type createOrder = z.infer<typeof createOrderSchema>

export const createOrderSchema = z.object({
    id: z.string().uuid(),
    lines: z.array(z.object({
        id: z.string().uuid(),
        descriptor: z.string(),
        quantity: z.coerce.number(),
        price: CurrencyAmountSchema
    }))
})

const UseCreateOrder = (customerEmail: string, merchantId: string, forObject?: recordref_type) => {
    const queryClient = useQueryClient()

    const form = useForm<z.infer<typeof createOrderSchema>>({
        resolver: zodResolver(createOrderSchema),
        defaultValues: {
            id: uuid(),
            lines: [
                {
                    id: uuid(),
                    descriptor: "",
                    quantity: 1,
                    price: {
                        amount: 0,
                        currency: "AUD"
                    }
                }
            ]
        }
    })

    return {
        form, 
        schema: createOrderSchema,
        values: form.getValues(),
        addNewLine: () => {
            form.setValue("lines", [
                ...form.getValues().lines,
                {
                    id: uuid(),
                    descriptor: "",
                    quantity: 1,
                    price: {
                        amount: 0,
                        currency: "AUD"
                    }
                }
            ], { shouldDirty: true })
        },
        removeLine: (index: number) => {
            form.setValue("lines", form.getValues().lines.filter((_, i) => i !== index), { shouldDirty: true })
        },
        mutation: useMutation({
            mutationFn: async ({lines}: createOrder) => {
                const resp = await gql<{
                    create_order: { 
                        order: order_type
                    }
                }>(`mutation create_order($customerEmail: String!, $merchantId: String, $lines: [OrderLineInput], $forObject: RecordRefInput, $target: String!) {
                        create_order(customerEmail: $customerEmail, merchantId: $merchantId, lines: $lines, forObject: $forObject, target: $target) {
                            order {
                                id,
                                customerEmail
                                no
                                forObject {
                                    id
                                    partition
                                    container
                                }
                                lines {
                                    price_log {
                                        price {
                                            amount
                                            currency
                                        }
                                    }
                                    price {
                                        amount
                                        currency
                                    }
                                    quantity
                                    descriptor
                                    merchantId
                                }
                                balanceDue {
                                    subtotal {
                                        amount
                                        currency
                                    }
                                    fees {
                                        amount
                                        currency
                                    }
                                    total {
                                        amount
                                        currency
                                    }
                                },
                                balancePaid {
                                    amount {
                                        amount
                                        currency
                                    }
                                    refunded {
                                        amount
                                        currency
                                    }   
                                    total {
                                        amount
                                        currency
                                    }               
                                }
                                stripe {
                                    accountId
                                    setupIntentId
                                    setupIntentSecret
                                }
                                paid_status
                            }
                        }
                    }
                    `,
                    {
                        merchantId,
                        customerEmail,
                        lines: lines.map(line => ({
                            id: line.id,
                            descriptor: line.descriptor,
                            quantity: line.quantity,
                            price: line.price
                        })),
                        forObject,
                        target: "CASE-INVOICE-LINE"
                    }
                )
        
                return resp.create_order.order;
            },
            onSuccess: (data: order_type) => {
                // we need to update all the orders for the object
                queryClient.setQueryData(['orders', undefined, forObject], (orders: order_type[] | undefined) => {
                    return orders ? [...orders, data] : [data]
                })
            }
        })
    }   
}

export default UseCreateOrder
'use client';

import { z } from "zod";
import { useForm } from "react-hook-form";
import { gql } from "@/lib/services/gql";
import { order_type } from "@/utils/spiriverse";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { v4 as uuid } from "uuid";
import UseCaseInteractions from "./UseCaseInteractions";
import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import { CurrencyAmountSchema } from "@/components/ux/CurrencyInput";

export type caseInvoice = z.infer<typeof createCaseInvoiceSchema>

export const createCaseInvoiceSchema = z.object({
    id: z.string().uuid(),
    interactions: z.array(z.object({
        included: z.boolean(),
        interactionId: z.string().uuid(),
        invoiceDescription: z.string(),
        amount: CurrencyAmountSchema.optional()
    }).refine((data) => {
        if (data.included && data.amount == null) return false;
        return true;
    })
    )
})

const UseCreateInvoice = (caseId: string, merchantId: string) => {
    const invoiceId = uuid();

    const [isInitialized, setIsInitialized] = useState(false);

    const caseInteractions = UseCaseInteractions(caseId)
    const queryClient = useQueryClient();
    
    const form = useForm<z.infer<typeof createCaseInvoiceSchema>>({
        resolver: zodResolver(createCaseInvoiceSchema),
        defaultValues: {
            id: invoiceId,
            interactions: []
        }
    })

    useEffect(() => {
        if (caseInteractions.data != null && !isInitialized) {
            form.reset({
                id: invoiceId,
                interactions: caseInteractions.data.filter(x => x.participants && x.participants.some(y => y.vendorId == merchantId)).map((interaction) => {
                    return {
                        interactionId: interaction.id,
                        invoiceDescription: `${DateTime.fromISO(interaction.conductedAtDate).toLocaleString( DateTime.DATETIME_MED)} ${interaction.message}`,
                        included: false
                    }
                })
            })
            setIsInitialized(true);
        }
    }, [caseInteractions.data, form, invoiceId, merchantId, isInitialized])
    

    return {
        schema: createCaseInvoiceSchema,
        form, 
        values: form.getValues(),
        mutation: useMutation({
            mutationFn: async ({interactions, ...data}: caseInvoice) => {

                const new_invoice = {
                    ...data,
                    lines: interactions
                        .filter(x => x.included)
                        .map((interaction) => {
                            return {
                                interactionId: interaction.interactionId,
                                invoiceDescription: interaction.invoiceDescription,
                                amount: interaction.amount   
                            }
                        })
                }

                const resp = await gql<any>(
                    `mutation create_caseInvoice($merchantId: String!, $caseId: String!, $invoice: CaseInvoiceInput!) {
                        create_caseInvoice(merchantId: $merchantId, caseId: $caseId, invoice: $invoice) {
                            invoice {
                                id
                                lines {
                                    sale_price {
                                        amount
                                        currency
                                    }
                                    quantity
                                    merchantId
                                }
                                stripe {
                                    accountId
                                    setupIntentId
                                    setupIntentSecret
                                }
                            }
                        }
                    }
                    `,
                    {
                        merchantId,
                        caseId,
                        invoice: new_invoice
                    }
                )
        
                return resp.create_caseInvoice.invoice;
            },
            onSuccess: async (data : order_type) => {
                queryClient.setQueryData(["invoices-for-case", caseId], (old: order_type[]) => {
                    if (old == undefined) return [data]
                    else return [...old, data]
                })
            }
        })
    }
}

export default UseCreateInvoice
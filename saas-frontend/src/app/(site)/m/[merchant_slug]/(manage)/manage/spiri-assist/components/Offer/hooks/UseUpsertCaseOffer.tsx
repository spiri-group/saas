'use client';

import { z } from "zod";
import { useForm } from "react-hook-form";
import { gql } from "@/lib/services/gql";
import { caseOffer_type, case_type } from "@/utils/spiriverse";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { countWords, isNullOrUndefined, omit, upsert } from "@/lib/functions";
import { useEffect } from "react";
import { v4 as uuid } from "uuid";
import { CurrencyAmountSchema } from "@/components/ux/CurrencyInput";
import useRealTimeObjectState from "@/components/utils/useRealTimeObjectState";

const required_attributes = `
    id
    acceptedOn
    merchantId
    merchant {
        name
    }
    caseId
    case {
        id
        code
    }
    code
    type
    clientRequested
    merchantResponded
    ref {
        id
        partition
        container
    }
    order {
        id,
        lines {
            id,
            price {
                amount
                currency
            }
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
            discount {
                amount
                currency 
            }
        }
    }
    description,
    stripe {
        setupIntentId
        setupIntentSecret
    }
`
export type upsertCaseOfferSchema = z.infer<typeof upsertCaseOfferSchema>

export const upsertCaseOfferSchema = z.object({
    id: z.string().uuid(),
    caseId: z.string(),
    merchantId: z.string(),
    description: z.string().refine((value) => countWords(value) <= 85),
    type: z.enum(["APPLICATION", "RELEASE", "CLOSE"]),
    price: CurrencyAmountSchema.optional(),
    acknowledgement: z.boolean().default(false).optional()
}).refine((context)=> {
    if (["RELEASE", "CLOSE"].includes(context.type) ) {
        if (context.acknowledgement == false) return false;
        
        return context.price != undefined
    } else {
        return true
    }
})

const UseUpsertCaseOffer = (merchantId: string, type: "APPLICATION" | "RELEASE" | "CLOSE", caseId?: string, caseOffer?: caseOffer_type) => {
    if (caseId == null || (caseOffer != null && caseOffer.caseId == null)) {
        throw new Error("Need a valid case to create / update an offer")
    }

    const queryClient = useQueryClient();

    const form = useForm<z.infer<typeof upsertCaseOfferSchema>>({
        resolver: zodResolver(upsertCaseOfferSchema),
        defaultValues: {
            acknowledgement: !["RELEASE", "CLOSE"].includes(type),
            id: uuid(),
            caseId,
            merchantId,
            type,
            price: ["RELEASE", "CLOSE"].includes(type) ? {
                amount: 0,
                currency: "AUD"
            } : undefined
        }
    })

    const offer = useRealTimeObjectState<caseOffer_type>({
        typeName: "caseOffer",
        initialData: caseOffer as any,
        getRecord: (async () => {
            const resp = await gql<{
                caseOffer: caseOffer_type
            }>( `query get_caseOffer($ref: RecordRefInput!) {
                    caseOffer(ref: $ref) {
                        ${required_attributes}
                    }
                }
                `,
                {
                   ref: caseOffer?.ref
                }
            )
            return resp.caseOffer;
        }),
        group: `caseOffer-${caseOffer?.ref?.id}`
    })

    useEffect(() => {
        if (offer.get != null && form.getValues().id !== offer.get.id) {
            form.reset({
                id: offer.get.id,
                caseId: offer.get.caseId,
                description: offer.get.description,
                merchantId: offer.get.merchantId,
                type: offer.get.type as ("APPLICATION" | "RELEASE" | "CLOSE"),
                price: offer.get.order?.lines ? offer.get.order.lines[0].price : undefined
            })
        }
    }, [offer.get])

    return {
        form,
        schema: upsertCaseOfferSchema,
        values: form.getValues(),
        mutation: useMutation({
            mutationFn: async (data: upsertCaseOfferSchema) => {
                const offer = omit(data, ["acknowledgement"])
                
                const resp = await gql<{
                    upsert_caseOffer: {
                        offer: caseOffer_type
                    }
                }>(`mutation upsert_caseOffer($offer: CaseOfferInput) {
                        upsert_caseOffer(offer: $offer) {
                            offer {
                                ${required_attributes}
                            }
                        }
                    }
                    `,
                    {
                        offer
                    }
                )
                return resp.upsert_caseOffer.offer
            },
            onSuccess: async (data : caseOffer_type) => {
                if (type == "APPLICATION") {
                    // step 1. upsert into merchant's applications if they're viewing it
                    queryClient.setQueryData(["case-applications", merchantId, undefined], (old: caseOffer_type[]) => {
                        return upsert(old ?? [], {
                            ...data,
                            showDialog: false
                        }, {
                            idFields: ["id"]
                        })
                    })

                    queryClient.invalidateQueries({
                        predicate: (query) => query.queryKey.some(x => x == "available-cases")
                    });
                }
                else if (type == "RELEASE") {
                    queryClient.setQueryData(["details-for-case", caseId], (old: case_type) => {
                        const tmp = { ...old }
                        if (isNullOrUndefined(data.acceptedOn)) {
                            tmp.releaseOffer = data;
                            if (caseOffer == null) {
                                (tmp.releaseOffer as any).showDialog = true;
                            }
                        }
                        return tmp;
                    })
                }
                else if (type == "CLOSE") {
                    queryClient.setQueryData(["details-for-case", caseId], (old: case_type) => {
                        const tmp = { ...old }
                        if (isNullOrUndefined(data.acceptedOn)) {
                            tmp.closeOffer = data;
                            if (caseOffer == null) {
                                (tmp.closeOffer as any).showDialog = true;
                            }
                        }
                        return tmp;
                    })
                }

            }
        })
    }
}

export default UseUpsertCaseOffer
'use client';

import { z } from "zod";
import { useForm } from "react-hook-form";
import { v4 as uuid } from "uuid";
import { gql } from "@/lib/services/gql";
import { case_type, product_type, stripe_details_type, user_type, variant_type } from "@/utils/spiriverse";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { GooglePlaceSchema } from "@/components/ux/AddressInput";
import { affectedAreaSchema } from "../components/AreaAffectedForm";
import { affectedPersonSchema } from "../components/PersonAffectedForm";
import { countWords, escape_key, isNullOrUndefined, mergeDeep, mergeDeepWithClone, omit } from "@/lib/functions";
import { useEffect, useState } from "react";
import { PhoneSchema } from "@/components/ux/PhoneInput";
import { CurrencyAmountSchema } from "@/components/ux/CurrencyInput";
import useFormStatus from "@/components/utils/UseFormStatus";

export const helpRequestSchema_step1 = z.object({
    id: z.string(),
    contact: z.object({
        email: z.string(),
        name: z.string(),
        phoneNumber: PhoneSchema
    }),
    category: z.object({
        id: z.string().min(1),
        value: z.string().min(1)
    }),
    religion: z.object({
        id: z.string().min(1),
        value: z.string().min(1)
    })
})

export const helpRequestSchema_step2 = z.object({
    location: GooglePlaceSchema,
    startedFrom: z.object({
        amount: z.coerce.number(),
        unit: z.object({
            id: z.string().min(1),
            value: z.string().min(1)
        })
    }),
    description: z.string().refine((value) => countWords(value) <= 1000),
})

export const helpRequestSchema_step3 = z.object({
    affectedPeople: z.array(affectedPersonSchema).min(1)
        .describe("At least one affected person must be mentioned.")
})

export const helpRequestSchema_step4 = z.object({
    affectedAreas: z.array(affectedAreaSchema).min(1)
        .describe("At least one affected area must be mentioned.")
})

export const helpRequestSchema_step5 = z.object({
    selectedUrgencyFee: z.object({
        id: z.string().min(1),
        defaultPrice: CurrencyAmountSchema
    })
})


export const helpRequestFormSchema = [helpRequestSchema_step1, helpRequestSchema_step2, helpRequestSchema_step3, helpRequestSchema_step4, helpRequestSchema_step5]

const default_values = (caseDetails?: case_type, me?: user_type) => {

    const defaultContact = !isNullOrUndefined(me) ? {
        email: me.email,
        name: me.name,
        phoneNumber: {
            raw: "",
            value: "",
            displayAs: ""
        }
    } : {
        email: "",
        name: "",
        phoneNumber: {
            raw: "",
            value: "",
            displayAs: ""
        }
    }

    if (!isNullOrUndefined(caseDetails)) {

        return {
            id: caseDetails.id,
            category: {
                id: caseDetails.category.id,
                value: caseDetails.category.defaultLabel
            },
            contact: !isNullOrUndefined(caseDetails) ? caseDetails.contact : defaultContact,
            location: {
                id: caseDetails.location.formattedAddress,
                formattedAddress: caseDetails.location.formattedAddress,
                components: caseDetails.location.components,
                point: {
                    type: caseDetails.location.point.type,
                    coordinates: {
                        lat: caseDetails.location.point.coordinates.lat,
                        lng: caseDetails.location.point.coordinates.lng
                    }
                }
            },
            startedFrom: {
                amount: caseDetails.startedFrom.amount,
                unit: {
                    value: caseDetails.startedFrom.unit.defaultLabel,
                    id: caseDetails.startedFrom.unit.id
                }
            },
            religion: {
                id: caseDetails.religion.id,
                value: caseDetails.religion.defaultLabel
            },
            description: caseDetails.description,
            affectedAreas: caseDetails.affectedAreas.map(({evidence, ...area}) => ({
                ...area,
                evidence: evidence?.map((ed) => ({
                    url: ed.url,
                    urlRelative: ed.urlRelative
                }))
            })),
            affectedPeople: caseDetails.affectedPeople.map(({evidence, ...people}) => ({
                ...people,
                evidence: evidence?.map((ed) => ({
                    url: ed.url,
                    urlRelative: ed.urlRelative
                }))
            })),
            selectedUrgencyFee: caseDetails.urgencyFee,
            termAgreement: true
        }

    } else {

        return {
            id: uuid(),
            contact: defaultContact,
            description: "",
            affectedAreas: [],
            affectedPeople: [],
            termAgreement: true,
            startedFrom: {
                unit: {
                    id: "MONTH",
                    value: "Month"
                }
            },
            religion: {
                id: "NO_AFFILIATION",
                value: "No affiliation"
            }
        }

    }

}

const UseUpsertCase = (urgencyOptions?: product_type[], caseDetails?: case_type, me?: user_type) => {
    const queryClient = useQueryClient();

    const [selectedStripeDetails, setSelectedStripeDetails] = useState<stripe_details_type | null>(null);
    const [page, setPage] = useState(0)
    const [data, setData] = useState<any>({})

    const mutationStatus = useFormStatus()

    const form = useForm({
        resolver: zodResolver(helpRequestFormSchema[page] as any),
        defaultValues: default_values(caseDetails, me)
    });

    const mutation =  useMutation({
        mutationFn: async (values: any) => {
            const {category, startedFrom, location, religion, selectedUrgencyFee} = values;
            const caseData = omit(values, ["category", "startedFrom", "location", "termAgreement", "religion", "selectedUrgencyFee"])

            const resp = await gql<{
                upsert_case: {
                    case: case_type
                }
            }>(`mutation upsert_case($case: CaseInput!) { 
                    upsert_case(case: $case) {
                        case {
                            id,
                            caseStatus,
                            trackingCode,
                            ref {
                                id
                                partition
                                container
                            },
                            contact {
                                name,
                                email, 
                                phoneNumber {
                                    raw
                                    value
                                    displayAs
                                }
                            },
                            category {
                                id,
                                defaultLabel 
                            },
                            religion {
                                id,
                                defaultLabel 
                            },
                            affectedPeople {
                                id,
                                name,
                                mentallyInjured,
                                physicallyInjured,
                                isChild,
                                evidence {
                                    url,
                                    urlRelative
                                }
                            },
                            affectedAreas {
                                id,
                                name,
                                coldTemperature,
                                physicalActivity,
                                negativeSensations,
                                evidence {
                                    url,
                                    urlRelative
                                }
                            },
                            location {
                                id,
                                formattedAddress,
                                point {
                                    type,
                                    coordinates {
                                        lat
                                        lng
                                    }
                                }
                            },
                            description,
                            startedFrom {
                                descriptor
                                amount
                                unit {
                                    id
                                    defaultLabel
                                }
                            },
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
                    case: {
                        ...caseData,
                        urgencyFee: selectedUrgencyFee,
                        categoryId: category.id,
                        startedFrom: {
                            amount: startedFrom.amount,
                            unitId: startedFrom.unit.id
                        },
                        religionId: religion.id,
                        location
                    }
                }
            )
            return resp.upsert_case.case;
        },
        onSuccess: async(data: case_type) => {
            if (caseDetails != null) {
                // we know this an update
                queryClient.setQueryData(["details-for-case", caseDetails.id], (old: case_type) => {
                    const updatedRecord = mergeDeepWithClone(old, data)
                    return updatedRecord
                });
                
                escape_key();
            }
            else {
                // we know its a create
                console.info(`Creating a case requires no cache updates`);

                setSelectedStripeDetails(data.stripe)
                setPage(page + 1)
            }
        }
    })

    useEffect(() => {
        if (!isNullOrUndefined(urgencyOptions)) {
            // we want to set the default selected to be standard
            const standardVariant = urgencyOptions.find(x => x.name.toLowerCase() == "standard")
            if (!isNullOrUndefined(standardVariant)) {
                form.setValue("selectedUrgencyFee", standardVariant.defaultVariant as variant_type)
            }
        }
    }, [urgencyOptions])

    return {
        form, page, values: form.getValues(),
        selectedStripeDetails, setSelectedStripeDetails,
        mutationStatus,
        submit: {
            onValid: async (incoming) => {
                const result = mergeDeep(data, incoming) as any;
                setData(result)
                if (page == 4) {
                    await mutationStatus.submit(mutation.mutateAsync, result, () => {})
                } else {
                    setPage(page + 1)
                }
            }, 
            onError: (errors) => {
                console.log(errors)
            }
        },
        moveBack: () => {
            if (page != 0) {
                setPage(page - 1)
            }
        }
    }
}

export default UseUpsertCase
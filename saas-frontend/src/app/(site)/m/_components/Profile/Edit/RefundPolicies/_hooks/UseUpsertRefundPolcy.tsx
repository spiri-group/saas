import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod"
import { useEffect, useState } from "react";
import { countWords, omit } from "@/lib/functions";
import { gql } from "@/lib/services/gql";
import { v4 as uuid } from "uuid";
import UseVendorCountries from "@/app/(site)/m/_hooks/UseVendorCountries";

import product_reasons from "./product_reasons.json"
import useVendorRefundPolicies from "./UseVendorRefundPolicies";
import { queryFn as fetch_refund_policy } from "./UseVendorRefundPolicy";

export const RefundPolicyDetailSchema = z.object({
    id: z.string().uuid(),
    code: z.string().min(1),
    isCustom: z.boolean(),
    title: z.string().min(1),
    description: z.string().refine((value) => countWords(value) <= 150, {
        message: "Description must be less than 250 words"
    })
})
export type RefundPolicyDetailSchemaType = z.infer<typeof RefundPolicyDetailSchema>

export const RefundTierSchema = z.object({
    id: z.string().uuid().optional(),
    daysUpTo: z.coerce.number().min(0),
    refundPercentage: z.coerce.number().min(0.01).max(1),
    refundCustomerFees: z.boolean()
})
export type RefundTierSchemaType = z.infer<typeof RefundTierSchema>

export const RefundReturnReasonSchema = z.object({
    id: z.string().uuid(),
    code: z.string().min(1),
    title: z.string().min(1),
    whoPayShipping: z.enum(["MERCHANT", "CUSTOMER", "NOT_REQUIRED"]),
    conditions: z.array(RefundPolicyDetailSchema),
    tiers: z.array(RefundTierSchema),
    confirmed: z.boolean(),
    no_refund: z.boolean()
}).superRefine(data => {
    if (data.no_refund) {
        return true
    } else {
        return (
            data.tiers.length > 0 &&
            data.conditions.length > 0
        )
    }
})
export type RefundReturnReasonSchemaType = z.infer<typeof RefundReturnReasonSchema>

export const RefundPolicySchema = z.object({
    hydrated: z.boolean(),
    saved: z.boolean(),
    id: z.string().uuid().optional(),    
    title: z.string().min(1),
    listingType: z.string().min(1).optional(),
    country: z.string().min(1),
    updatedDate: z.string().optional(),
    reasons: z.array(RefundReturnReasonSchema).min(1).refine((value) => {
        return value.every(reason => reason.confirmed)
    }, { message: "All reasons must be configured and confirmed." })
})
.refine((data) => data.listingType !== undefined, {
    message: "Listing type is required",
    path: ["listingType"]
})
export type RefundPolicySchemaType = z.infer<typeof RefundPolicySchema>

const UpsertVendorRefundPoliciesSchema = z.object({
    id: z.string().min(1),
    refundPolicies: z.array(RefundPolicySchema)
});
export type UpsertVendorRefundPoliciesSchema = z.infer<typeof UpsertVendorRefundPoliciesSchema>;

export type ListingType = "PRODUCT" | "TOUR";

const createDefaultPolicy = (title: string, countries: { key: string }[], listingType: ListingType, reasons: typeof product_reasons) => ({
    id: uuid(),
    title,
    listingType,
    hydrated: true,
    saved: false,
    country: countries.length == 0 ? "US" : countries[0].key,
    reasons: reasons.map(reason => ({
        ...reason,
        no_refund: false,
        confirmed: false,
        tiers: [
            { id: uuid(), daysUpTo: 7, refundPercentage: 1, refundCustomerFees: false },
            { id: uuid(), daysUpTo: 14, refundPercentage: 0.5, refundCustomerFees: false },
            { id: uuid(), daysUpTo: 30, refundPercentage: 0.25, refundCustomerFees: false }
        ]
    } as RefundReturnReasonSchemaType))
});

type UseUpsertRefundPolicyOptions = {
    merchantId: string;
    listingType: ListingType;
    reasons: typeof product_reasons;
};

const useUpsertRefundPolicy = ({ merchantId, listingType, reasons }: UseUpsertRefundPolicyOptions) => {
    const queryClient = useQueryClient();
    const [editIndex, setEditIndex] = useState<number | null>(null);
    const [loaded, setLoaded] = useState(false);

    const countries = UseVendorCountries(merchantId);
    const policies = useVendorRefundPolicies(merchantId, listingType);

    const form = useForm<UpsertVendorRefundPoliciesSchema>({
        resolver: zodResolver(UpsertVendorRefundPoliciesSchema),
        defaultValues: {
            id: merchantId,
            refundPolicies: []
        }
    });

    const hydrate_policy = async (index: number | null) => {
        if (index != null) {
            const policy = form.getValues().refundPolicies[index]
            if (!policy.hydrated && policy.id) {
                const data = await fetch_refund_policy(merchantId, policy.id);
                const transformedData = {
                    ...data,
                    hydrated: true,
                    saved: true,
                    reasons: data.reasons.map(reason => ({
                        ...reason,
                        whoPayShipping: reason.whoPayShipping as "MERCHANT" | "CUSTOMER" | "NOT_REQUIRED",
                    }))
                };
                form.setValue(`refundPolicies.${index}`, transformedData);
            }
        }
    };

    useEffect(() => {
        if (policies.data && countries.data) {
            if (policies.data.length > 0) {
                form.reset({
                    id: merchantId,
                    refundPolicies: policies.data.map(policy => ({
                        ...policy,
                        saved: true
                    } as RefundPolicySchemaType))
                });

            } else {
                form.reset({
                    id: merchantId,
                    refundPolicies: [createDefaultPolicy("Policy 1", countries.data!, listingType, reasons)]
                });

                setTimeout(() => setEditIndex(0), 100);
            }
            setLoaded(true);
        }
    }, [policies.data, countries.data, listingType, reasons]);

    return {
        form,
        isLoading: !loaded,
        editIndex: {
            value: editIndex,
            set: (index: number | null) => {
                hydrate_policy(index).then(() => {
                    setEditIndex(index);
                });
            }
        },
        options: {
            countries: countries.data ?? [],
            defaultPolicy: (title: string) => createDefaultPolicy(title, countries.data ?? [], listingType, reasons)
        },
        mutation: useMutation({
            mutationFn: async (values: UpsertVendorRefundPoliciesSchema) => {
                // we will only send through the update for the editIndex
                if (editIndex == null) {
                    return;
                }

                // we need to remove the hydrated property from the policy
                const policy = omit(values.refundPolicies[editIndex], ["hydrated", "saved", "updatedDate"]);
                const transformedPolicy = {
                    ...policy,
                    reasons: policy.reasons.map(reason => ({
                        ...reason,
                        whoPayShipping: reason.whoPayShipping as "MERCHANT" | "CUSTOMER" | "NOT_REQUIRED",
                    }))
                };
                const updatedRefundPolicies = [transformedPolicy]

                const resp = await gql<{
                    upsert_product_return_policies: {
                        code: string,
                        success: boolean,
                        message: string,
                        policies: {
                            id: string
                        }[]
                    }
                }>(`
                    mutation UpsertProductReturnPolicies($merchantId: ID!, $policies: [ProductReturnPolicyInput]!) {
                        upsert_product_return_policies(merchantId: $merchantId, policies: $policies) {
                            code
                            success
                            message
                            policies {
                                id
                            }
                        }
                    }
                `, {
                    merchantId: values.id,
                    policies: updatedRefundPolicies
                })

                const result = resp.upsert_product_return_policies.policies.map((policy) => policy.id);
                return result;
            }, onSuccess: async(data: string[]) => {
                // we need to refresh the policies list with the new data in cache
                queryClient.invalidateQueries({
                    queryKey:['product-return-policies-for-merchant', merchantId]
                });
                // this will mean that the policies will be refetched next time needed
                return data;
            }
        })
    }
}

export default useUpsertRefundPolicy
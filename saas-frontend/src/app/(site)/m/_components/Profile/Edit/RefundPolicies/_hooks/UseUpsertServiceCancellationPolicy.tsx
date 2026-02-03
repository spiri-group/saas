import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod"
import { useEffect, useState } from "react";
import { gql } from "@/lib/services/gql";
import { v4 as uuid } from "uuid";
import useServiceCancellationPolicies from "./UseServiceCancellationPolicies";

export const ServiceCancellationPolicySchema = z.object({
    id: z.string().uuid(),
    title: z.string().min(1, "Title is required"),
    serviceCategory: z.enum(["READING", "HEALING", "COACHING"], {
        required_error: "Service category is required"
    }),
    fullRefundHours: z.coerce.number().min(0).optional(),
    partialRefundHours: z.coerce.number().min(0).optional(),
    partialRefundPercentage: z.coerce.number().min(0).max(100).optional(),
    noRefundHours: z.coerce.number().min(0).optional(),
    allowRescheduling: z.boolean(),
    maxReschedules: z.coerce.number().min(0).optional(),
    rescheduleMinHours: z.coerce.number().min(0).optional(),
    saved: z.boolean().optional()
}).refine((data) => {
    // If rescheduling is allowed, require reschedule settings
    if (data.allowRescheduling) {
        return data.maxReschedules !== undefined && data.rescheduleMinHours !== undefined;
    }
    return true;
}, {
    message: "When rescheduling is allowed, you must set max reschedules and minimum hours",
    path: ["allowRescheduling"]
});

export type ServiceCancellationPolicySchemaType = z.infer<typeof ServiceCancellationPolicySchema>

const UpsertServiceCancellationPoliciesSchema = z.object({
    id: z.string().min(1),
    cancellationPolicies: z.array(ServiceCancellationPolicySchema)
});
export type UpsertServiceCancellationPoliciesSchema = z.infer<typeof UpsertServiceCancellationPoliciesSchema>;

const createDefaultPolicy = (title: string, category: "READING" | "HEALING" | "COACHING"): ServiceCancellationPolicySchemaType => ({
    id: uuid(),
    title,
    serviceCategory: category,
    fullRefundHours: 48,
    partialRefundHours: 24,
    partialRefundPercentage: 50,
    noRefundHours: 12,
    allowRescheduling: true,
    maxReschedules: 2,
    rescheduleMinHours: 24,
    saved: false
});

const useUpsertServiceCancellationPolicy = (merchantId: string) => {
    const queryClient = useQueryClient();
    const [editIndex, setEditIndex] = useState<number | null>(null);
    const [loaded, setLoaded] = useState(false);

    const policies = useServiceCancellationPolicies(merchantId);

    const form = useForm<UpsertServiceCancellationPoliciesSchema>({
        resolver: zodResolver(UpsertServiceCancellationPoliciesSchema),
        defaultValues: {
            id: merchantId,
            cancellationPolicies: []
        }
    });

    useEffect(() => {
        if (policies.data) {
            if (policies.data.length > 0) {
                form.reset({
                    id: merchantId,
                    cancellationPolicies: policies.data.map(policy => ({
                        ...policy,
                        saved: true
                    } as ServiceCancellationPolicySchemaType))
                });
            } else {
                // Start with one default policy for each category
                form.reset({
                    id: merchantId,
                    cancellationPolicies: [
                        createDefaultPolicy("Reading Services", "READING"),
                    ]
                });
                setTimeout(() => setEditIndex(0), 100);
            }
            setLoaded(true);
        }
    }, [policies.data]);

    return {
        form,
        isLoading: !loaded,
        editIndex: {
            value: editIndex,
            set: setEditIndex
        },
        options: {
            defaultPolicy: (title: string, category: "READING" | "HEALING" | "COACHING") =>
                createDefaultPolicy(title, category)
        },
        mutation: useMutation({
            mutationFn: async (values: UpsertServiceCancellationPoliciesSchema) => {
                // We will only send through the update for the editIndex
                if (editIndex == null) {
                    return;
                }

                const policy = values.cancellationPolicies[editIndex];
                const cleanedPolicy = {
                    id: policy.id,
                    merchantId,
                    title: policy.title,
                    serviceCategory: policy.serviceCategory,
                    fullRefundHours: policy.fullRefundHours,
                    partialRefundHours: policy.partialRefundHours,
                    partialRefundPercentage: policy.partialRefundPercentage,
                    noRefundHours: policy.noRefundHours,
                    allowRescheduling: policy.allowRescheduling,
                    maxReschedules: policy.maxReschedules,
                    rescheduleMinHours: policy.rescheduleMinHours
                };

                const resp = await gql<{
                    upsert_service_cancellation_policies: {
                        code: string,
                        success: boolean,
                        message: string,
                        policies: {
                            id: string
                        }[]
                    }
                }>(`
                    mutation UpsertServiceCancellationPolicies($merchantId: ID!, $policies: [ServiceCancellationPolicyInput]!) {
                        upsert_service_cancellation_policies(merchantId: $merchantId, policies: $policies) {
                            code
                            success
                            message
                            policies {
                                id
                            }
                        }
                    }
                `, {
                    merchantId: merchantId,
                    policies: [cleanedPolicy]
                })

                const result = resp.upsert_service_cancellation_policies.policies.map((policy) => policy.id);
                return result;
            },
            onSuccess: async(data: string[]) => {
                // Refresh the policies list
                queryClient.invalidateQueries({
                    queryKey:['service-cancellation-policies-for-merchant', merchantId]
                });
                return data;
            }
        })
    }
}

export default useUpsertServiceCancellationPolicy

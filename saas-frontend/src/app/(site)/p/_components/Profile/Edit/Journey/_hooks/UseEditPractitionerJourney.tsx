import { gql } from "@/lib/services/gql"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod"
import { useEffect, useState } from "react";
import { mergeDeepWithClone } from "@/lib/functions";

// Schema for spiritual journey and approach editing
const EditPractitionerJourneySchema = z.object({
    id: z.string().min(1),
    spiritualJourney: z.string()
        .max(2000, "Spiritual journey must be less than 2000 characters")
        .optional()
        .or(z.literal("")),
    approach: z.string()
        .max(1000, "Approach must be less than 1000 characters")
        .optional()
        .or(z.literal("")),
});

export type EditPractitionerJourneySchema = z.infer<typeof EditPractitionerJourneySchema>

interface PractitionerProfile {
    spiritualJourney?: string;
    approach?: string;
}

interface Practitioner {
    id: string;
    practitioner: PractitionerProfile;
}

// Hook to fetch practitioner journey data
export const usePractitionerJourneyData = (practitionerId: string) => {
    return useQuery({
        queryKey: ['practitioner-journey', practitionerId],
        queryFn: async () => {
            const response = await gql<{ vendor: Practitioner }>(
                `query GetPractitionerJourneyForEdit($id: String!) {
                    vendor(id: $id) {
                        id
                        practitioner {
                            spiritualJourney
                            approach
                        }
                    }
                }`,
                { id: practitionerId }
            );
            return response.vendor;
        },
        enabled: !!practitionerId,
    });
};

const useEditPractitionerJourney = (practitionerId: string) => {
    const queryClient = useQueryClient()
    const [hasLoaded, setHasLoaded] = useState(false)

    const form = useForm<EditPractitionerJourneySchema>({
        resolver: zodResolver(EditPractitionerJourneySchema),
        defaultValues: {
            id: practitionerId,
            spiritualJourney: "",
            approach: "",
        }
    })

    const practitionerData = usePractitionerJourneyData(practitionerId)

    useEffect(() => {
        if (practitionerData.data?.practitioner && !hasLoaded) {
            form.reset({
                id: practitionerId,
                spiritualJourney: practitionerData.data.practitioner.spiritualJourney ?? "",
                approach: practitionerData.data.practitioner.approach ?? "",
            })
            setHasLoaded(true)
        }
    }, [practitionerData.data, practitionerId, hasLoaded, form])

    return {
        form,
        hasLoaded,
        isLoading: practitionerData.isLoading,
        mutation: useMutation({
            mutationFn: async (values: EditPractitionerJourneySchema) => {
                const response = await gql<{
                    update_practitioner_profile: {
                        success: boolean
                        message: string
                        practitioner: Practitioner
                    }
                }>(`
                    mutation UpdatePractitionerJourney($practitionerId: ID!, $profile: PractitionerProfileInput!) {
                        update_practitioner_profile(practitionerId: $practitionerId, profile: $profile) {
                            success
                            message
                            practitioner {
                                id
                                practitioner {
                                    spiritualJourney
                                    approach
                                }
                            }
                        }
                    }
                `, {
                    practitionerId: values.id,
                    profile: {
                        spiritualJourney: values.spiritualJourney || null,
                        approach: values.approach || null,
                    }
                })

                if (!response.update_practitioner_profile.success) {
                    throw new Error(response.update_practitioner_profile.message)
                }

                return response.update_practitioner_profile.practitioner
            },
            onSuccess: async (data: Practitioner) => {
                // Update caches
                queryClient.setQueryData(['practitioner-journey', practitionerId], (oldData: Practitioner | undefined) => {
                    if (!oldData) return data
                    return mergeDeepWithClone(oldData, data)
                })
                queryClient.setQueryData(['practitioner-profile', practitionerId], (oldData: Practitioner | undefined) => {
                    if (!oldData) return data
                    return mergeDeepWithClone(oldData, data)
                })
            }
        })
    }
}

export default useEditPractitionerJourney

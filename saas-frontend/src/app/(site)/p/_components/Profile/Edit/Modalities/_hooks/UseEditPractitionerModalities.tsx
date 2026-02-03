import { gql } from "@/lib/services/gql"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod"
import { useEffect, useState } from "react";
import { mergeDeepWithClone } from "@/lib/functions";
import { usePractitionerData } from "../../Bio/_hooks/UseEditPractitionerBio";

// Schema for modalities and specializations editing
const EditPractitionerModalitiesSchema = z.object({
    id: z.string().min(1),
    modalities: z.array(z.string()).min(1, "Please select at least one modality"),
    specializations: z.array(z.string()).min(1, "Please select at least one specialization"),
    customSpecializations: z.array(z.string()).optional(),
});

export type EditPractitionerModalitiesSchema = z.infer<typeof EditPractitionerModalitiesSchema>

interface PractitionerProfile {
    modalities: string[];
    specializations: string[];
    customSpecializations?: string[];
}

interface Practitioner {
    id: string;
    practitioner: PractitionerProfile;
}

const useEditPractitionerModalities = (practitionerId: string) => {
    const queryClient = useQueryClient()
    const [hasLoaded, setHasLoaded] = useState(false)

    const form = useForm<EditPractitionerModalitiesSchema>({
        resolver: zodResolver(EditPractitionerModalitiesSchema),
        defaultValues: {
            id: practitionerId,
            modalities: [],
            specializations: [],
            customSpecializations: [],
        }
    })

    const practitionerData = usePractitionerData(practitionerId)

    useEffect(() => {
        if (practitionerData.data?.practitioner && !hasLoaded) {
            form.reset({
                id: practitionerId,
                modalities: practitionerData.data.practitioner.modalities ?? [],
                specializations: practitionerData.data.practitioner.specializations ?? [],
                customSpecializations: [],
            })
            setHasLoaded(true)
        }
    }, [practitionerData.data, practitionerId, hasLoaded, form])

    const toggleArrayValue = (field: 'modalities' | 'specializations', value: string) => {
        const current = form.getValues(field);
        const updated = current.includes(value)
            ? current.filter(v => v !== value)
            : [...current, value];
        form.setValue(field, updated, { shouldValidate: true });
    };

    return {
        form,
        hasLoaded,
        isLoading: practitionerData.isLoading,
        toggleArrayValue,
        mutation: useMutation({
            mutationFn: async (values: EditPractitionerModalitiesSchema) => {
                const response = await gql<{
                    update_practitioner_profile: {
                        success: boolean
                        message: string
                        practitioner: Practitioner
                    }
                }>(`
                    mutation UpdatePractitionerModalities($practitionerId: ID!, $profile: PractitionerProfileInput!) {
                        update_practitioner_profile(practitionerId: $practitionerId, profile: $profile) {
                            success
                            message
                            practitioner {
                                id
                                practitioner {
                                    modalities
                                    specializations
                                    customSpecializations
                                }
                            }
                        }
                    }
                `, {
                    practitionerId: values.id,
                    profile: {
                        modalities: values.modalities,
                        specializations: values.specializations,
                        customSpecializations: values.customSpecializations,
                    }
                })

                if (!response.update_practitioner_profile.success) {
                    throw new Error(response.update_practitioner_profile.message)
                }

                return response.update_practitioner_profile.practitioner
            },
            onSuccess: async (data: Practitioner) => {
                queryClient.setQueryData(['practitioner-profile', practitionerId], (oldData: Practitioner | undefined) => {
                    if (!oldData) return data
                    return mergeDeepWithClone(oldData, data)
                })
            }
        })
    }
}

export default useEditPractitionerModalities

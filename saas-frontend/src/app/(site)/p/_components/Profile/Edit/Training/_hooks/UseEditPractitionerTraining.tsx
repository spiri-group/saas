import { gql } from "@/lib/services/gql"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod"
import { useEffect, useState } from "react";
import { mergeDeepWithClone } from "@/lib/functions";
import { v4 as uuid } from "uuid";

// Schema for a single training credential
const TrainingCredentialSchema = z.object({
    id: z.string(),
    title: z.string().min(1, "Title is required").max(200),
    institution: z.string().max(200).optional(),
    year: z.number().min(1900).max(new Date().getFullYear()).optional().nullable(),
    description: z.string().max(500).optional(),
});

// Schema for the training form
const EditPractitionerTrainingSchema = z.object({
    practitionerId: z.string().min(1),
    training: z.array(TrainingCredentialSchema),
});

export type TrainingCredentialType = z.infer<typeof TrainingCredentialSchema>;
export type EditPractitionerTrainingSchema = z.infer<typeof EditPractitionerTrainingSchema>;

interface TrainingCredential {
    id: string;
    title: string;
    institution?: string;
    year?: number;
    description?: string;
}

interface PractitionerProfile {
    training?: TrainingCredential[];
}

interface Practitioner {
    id: string;
    practitioner: PractitionerProfile;
}

// Hook to fetch practitioner training data
export const usePractitionerTrainingData = (practitionerId: string) => {
    return useQuery({
        queryKey: ['practitioner-training', practitionerId],
        queryFn: async () => {
            const response = await gql<{ vendor: Practitioner }>(
                `query GetPractitionerTrainingForEdit($id: String!) {
                    vendor(id: $id) {
                        id
                        practitioner {
                            training {
                                id
                                title
                                institution
                                year
                                description
                            }
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

const useEditPractitionerTraining = (practitionerId: string) => {
    const queryClient = useQueryClient()
    const [hasLoaded, setHasLoaded] = useState(false)

    const form = useForm<EditPractitionerTrainingSchema>({
        resolver: zodResolver(EditPractitionerTrainingSchema),
        defaultValues: {
            practitionerId: practitionerId,
            training: [],
        }
    })

    const fieldArray = useFieldArray({
        control: form.control,
        name: "training",
    });

    const practitionerData = usePractitionerTrainingData(practitionerId)

    useEffect(() => {
        if (practitionerData.data?.practitioner && !hasLoaded) {
            const training = practitionerData.data.practitioner.training ?? [];
            form.reset({
                practitionerId: practitionerId,
                training: training.map(t => ({
                    id: t.id,
                    title: t.title,
                    institution: t.institution ?? "",
                    year: t.year ?? null,
                    description: t.description ?? "",
                })),
            })
            setHasLoaded(true)
        }
    }, [practitionerData.data, practitionerId, hasLoaded, form])

    const addCredential = () => {
        fieldArray.append({
            id: uuid(),
            title: "",
            institution: "",
            year: null,
            description: "",
        });
    };

    const removeCredential = (index: number) => {
        fieldArray.remove(index);
    };

    return {
        form,
        hasLoaded,
        isLoading: practitionerData.isLoading,
        fields: fieldArray.fields,
        addCredential,
        removeCredential,
        mutation: useMutation({
            mutationFn: async (values: EditPractitionerTrainingSchema) => {
                // Prepare training for submission
                const trainingInput = values.training.map(cred => ({
                    id: cred.id,
                    title: cred.title,
                    institution: cred.institution || null,
                    year: cred.year || null,
                    description: cred.description || null,
                }));

                const response = await gql<{
                    update_practitioner_profile: {
                        success: boolean
                        message: string
                        practitioner: Practitioner
                    }
                }>(`
                    mutation UpdatePractitionerTraining($practitionerId: ID!, $profile: PractitionerProfileInput!) {
                        update_practitioner_profile(practitionerId: $practitionerId, profile: $profile) {
                            success
                            message
                            practitioner {
                                id
                                practitioner {
                                    training {
                                        id
                                        title
                                        institution
                                        year
                                        description
                                    }
                                }
                            }
                        }
                    }
                `, {
                    practitionerId: values.practitionerId,
                    profile: {
                        training: trainingInput,
                    }
                })

                if (!response.update_practitioner_profile.success) {
                    throw new Error(response.update_practitioner_profile.message)
                }

                return response.update_practitioner_profile.practitioner
            },
            onSuccess: async (data: Practitioner) => {
                // Update caches
                queryClient.setQueryData(['practitioner-training', practitionerId], (oldData: Practitioner | undefined) => {
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

export default useEditPractitionerTraining

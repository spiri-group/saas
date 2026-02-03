import { gql } from "@/lib/services/gql"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod"
import { useEffect, useState } from "react";
import { mergeDeepWithClone, countWords } from "@/lib/functions";
import { MediaSchema } from "@/shared/schemas/media";

// Schema for bio and headline editing
const EditPractitionerBioSchema = z.object({
    id: z.string().min(1),
    headline: z.string()
        .min(10, "Headline must be at least 10 characters")
        .max(150, "Headline must be less than 150 characters"),
    bio: z.string()
        .min(50, "Bio must be at least 50 characters")
        .refine(x => countWords(x) <= 500, {
            message: "Bio must be less than 500 words"
        }),
    logo: MediaSchema.optional().nullable()
});

export type EditPractitionerBioSchema = z.infer<typeof EditPractitionerBioSchema>

interface PractitionerProfile {
    pronouns?: string;
    headline: string;
    bio: string;
    spiritualJourney?: string;
    modalities: string[];
    specializations: string[];
}

interface Media {
    name?: string;
    url?: string;
    urlRelative?: string;
    size?: string;
    type?: string;
}

interface Practitioner {
    id: string;
    name: string;
    slug: string;
    logo?: Media;
    practitioner: PractitionerProfile;
}

// Hook to fetch practitioner data for editing
export const usePractitionerData = (practitionerId: string) => {
    return useQuery({
        queryKey: ['practitioner-profile', practitionerId],
        queryFn: async () => {
            const response = await gql<{ vendor: Practitioner }>(
                `query GetPractitionerForEdit($id: String!) {
                    vendor(id: $id) {
                        id
                        name
                        slug
                        logo {
                            name
                            url
                            urlRelative
                            size
                            type
                        }
                        practitioner {
                            pronouns
                            headline
                            bio
                            spiritualJourney
                            modalities
                            specializations
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

const useEditPractitionerBio = (practitionerId: string) => {
    const queryClient = useQueryClient()
    const [hasLoaded, setHasLoaded] = useState(false)

    const form = useForm<EditPractitionerBioSchema>({
        resolver: zodResolver(EditPractitionerBioSchema),
        defaultValues: {
            id: practitionerId,
            headline: "",
            bio: "",
            logo: null
        }
    })

    const practitionerData = usePractitionerData(practitionerId)

    useEffect(() => {
        if (practitionerData.data?.practitioner && !hasLoaded) {
            form.reset({
                id: practitionerId,
                headline: practitionerData.data.practitioner.headline ?? "",
                bio: practitionerData.data.practitioner.bio ?? "",
                logo: practitionerData.data.logo ?? null
            })
            setHasLoaded(true)
        }
    }, [practitionerData.data, practitionerId, hasLoaded, form])

    return {
        form,
        hasLoaded,
        isLoading: practitionerData.isLoading,
        mutation: useMutation({
            mutationFn: async (values: EditPractitionerBioSchema) => {
                // Update practitioner profile (bio, headline)
                const profileResponse = await gql<{
                    update_practitioner_profile: {
                        success: boolean
                        message: string
                        practitioner: Practitioner
                    }
                }>(`
                    mutation UpdatePractitionerBio($practitionerId: ID!, $profile: PractitionerProfileInput!) {
                        update_practitioner_profile(practitionerId: $practitionerId, profile: $profile) {
                            success
                            message
                            practitioner {
                                id
                                practitioner {
                                    headline
                                    bio
                                }
                            }
                        }
                    }
                `, {
                    practitionerId: values.id,
                    profile: {
                        headline: values.headline,
                        bio: values.bio
                    }
                })

                if (!profileResponse.update_practitioner_profile.success) {
                    throw new Error(profileResponse.update_practitioner_profile.message)
                }

                // Update logo if changed
                if (values.logo !== undefined) {
                    await gql<{
                        update_merchant_theme: {
                            vendor: {
                                id: string
                                logo: Media
                            }
                        }
                    }>(`
                        mutation UpdatePractitionerLogo($merchantId: ID!, $theme: VendorThemeUpdateInput!) {
                            update_merchant_theme(merchantId: $merchantId, theme: $theme) {
                                vendor {
                                    id
                                    logo {
                                        name
                                        url
                                        urlRelative
                                        size
                                        type
                                    }
                                }
                            }
                        }
                    `, {
                        merchantId: values.id,
                        theme: {
                            logo: values.logo
                        }
                    })
                }

                return {
                    ...profileResponse.update_practitioner_profile.practitioner,
                    logo: values.logo ?? undefined
                }
            },
            onSuccess: async (data: Practitioner) => {
                // Update the cache with the new data
                queryClient.setQueryData(['practitioner-profile', practitionerId], (oldData: Practitioner | undefined) => {
                    if (!oldData) return data
                    return mergeDeepWithClone(oldData, data)
                })
                // Also invalidate branding cache in case it's used elsewhere
                queryClient.invalidateQueries({ queryKey: ['branding-for-vendor', practitionerId] })
            }
        })
    }
}

export default useEditPractitionerBio

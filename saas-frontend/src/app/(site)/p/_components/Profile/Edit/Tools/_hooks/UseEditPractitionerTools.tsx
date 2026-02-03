import { gql } from "@/lib/services/gql"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod"
import { useEffect, useState } from "react";
import { mergeDeepWithClone } from "@/lib/functions";
import { v4 as uuid } from "uuid";
import { media_type } from "@/utils/spiriverse";

// Schema for a single tool
const ToolSchema = z.object({
    id: z.string(),
    name: z.string().min(1, "Name is required").max(100),
    description: z.string().max(500).optional(),
    image: z.object({
        name: z.string(),
        url: z.string(),
        urlRelative: z.string(),
        size: z.string(),
        type: z.string(),
    }).optional().nullable(),
});

// Schema for the tools form
const EditPractitionerToolsSchema = z.object({
    practitionerId: z.string().min(1),
    tools: z.array(ToolSchema),
});

export type ToolType = z.infer<typeof ToolSchema>;
export type EditPractitionerToolsSchema = z.infer<typeof EditPractitionerToolsSchema>;

interface PractitionerTool {
    id: string;
    name: string;
    description?: string;
    image?: media_type;
}

interface PractitionerProfile {
    tools?: PractitionerTool[];
}

interface Practitioner {
    id: string;
    practitioner: PractitionerProfile;
}

// Hook to fetch practitioner data for editing
export const usePractitionerToolsData = (practitionerId: string) => {
    return useQuery({
        queryKey: ['practitioner-tools', practitionerId],
        queryFn: async () => {
            const response = await gql<{ vendor: Practitioner }>(
                `query GetPractitionerToolsForEdit($id: String!) {
                    vendor(id: $id) {
                        id
                        practitioner {
                            tools {
                                id
                                name
                                description
                                image {
                                    name
                                    url
                                    urlRelative
                                    size
                                    type
                                }
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

const useEditPractitionerTools = (practitionerId: string) => {
    const queryClient = useQueryClient()
    const [hasLoaded, setHasLoaded] = useState(false)

    const form = useForm<EditPractitionerToolsSchema>({
        resolver: zodResolver(EditPractitionerToolsSchema),
        defaultValues: {
            practitionerId: practitionerId,
            tools: [],
        }
    })

    const fieldArray = useFieldArray({
        control: form.control,
        name: "tools",
    });

    const practitionerData = usePractitionerToolsData(practitionerId)

    useEffect(() => {
        if (practitionerData.data?.practitioner && !hasLoaded) {
            const tools = practitionerData.data.practitioner.tools ?? [];
            form.reset({
                practitionerId: practitionerId,
                tools: tools.map(t => ({
                    id: t.id,
                    name: t.name,
                    description: t.description ?? "",
                    image: t.image ?? null,
                })),
            })
            setHasLoaded(true)
        }
    }, [practitionerData.data, practitionerId, hasLoaded, form])

    const addTool = () => {
        fieldArray.append({
            id: uuid(),
            name: "",
            description: "",
            image: null,
        });
    };

    const removeTool = (index: number) => {
        fieldArray.remove(index);
    };

    return {
        form,
        hasLoaded,
        isLoading: practitionerData.isLoading,
        fields: fieldArray.fields,
        addTool,
        removeTool,
        mutation: useMutation({
            mutationFn: async (values: EditPractitionerToolsSchema) => {
                // Prepare tools for submission - remove url field as backend expects urlRelative only
                const toolsInput = values.tools.map(tool => ({
                    id: tool.id,
                    name: tool.name,
                    description: tool.description || null,
                    image: tool.image ? {
                        name: tool.image.name,
                        urlRelative: tool.image.urlRelative,
                        size: tool.image.size,
                        type: tool.image.type,
                    } : null,
                }));

                const response = await gql<{
                    update_practitioner_profile: {
                        success: boolean
                        message: string
                        practitioner: Practitioner
                    }
                }>(`
                    mutation UpdatePractitionerTools($practitionerId: ID!, $profile: PractitionerProfileInput!) {
                        update_practitioner_profile(practitionerId: $practitionerId, profile: $profile) {
                            success
                            message
                            practitioner {
                                id
                                practitioner {
                                    tools {
                                        id
                                        name
                                        description
                                        image {
                                            name
                                            url
                                            urlRelative
                                            size
                                            type
                                        }
                                    }
                                }
                            }
                        }
                    }
                `, {
                    practitionerId: values.practitionerId,
                    profile: {
                        tools: toolsInput,
                    }
                })

                if (!response.update_practitioner_profile.success) {
                    throw new Error(response.update_practitioner_profile.message)
                }

                return response.update_practitioner_profile.practitioner
            },
            onSuccess: async (data: Practitioner) => {
                // Update both caches
                queryClient.setQueryData(['practitioner-tools', practitionerId], (oldData: Practitioner | undefined) => {
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

export default useEditPractitionerTools

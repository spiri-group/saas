'use client';

import { clone, isNullOrWhitespace, mergeDeepWithClone } from "@/lib/functions";
import { gql } from "@/lib/services/gql";
import { vendor_type } from "@/utils/spiriverse";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { v4 as uuid } from "uuid";
import { z } from "zod";

const allowedPlatforms = ['facebook', 'x', 'instagram', 'linkedin', 'youtube', 'tiktok']
const SocialPlatformSchema = z.object({
    id: z.string().min(1),
    url: z.string().url().optional().nullable(),
    handle: z.string().optional().nullable(),
    platform: z.string().refine((value) => allowedPlatforms.includes(value))
});

const UpdatePractitionerSocialsSchema = z.object({
    id: z.string().min(1),
    socials: z.array(SocialPlatformSchema),
    style: z.enum(['solid', 'outline'])
});

export type UpdatePractitionerSocialsSchema = z.infer<typeof UpdatePractitionerSocialsSchema>

const useEditPractitionerSocials = (practitionerId: string) => {

    const queryClient = useQueryClient()
    const [hasLoaded, setHasLoaded] = useState(false)

    const form = useForm<z.infer<typeof UpdatePractitionerSocialsSchema>>({
        resolver: zodResolver(UpdatePractitionerSocialsSchema),
        defaultValues: {
            id: undefined,
            style: 'solid',
            socials: allowedPlatforms.map((platform) => {
                return { id: uuid(), url: undefined, platform }
            })
        }
    })

    // Fetch practitioner social data
    const vendorQuery = useQuery({
        queryKey: ['practitioner-socials', practitionerId],
        queryFn: async () => {
            const response = await gql<{ vendor: vendor_type }>(
                `query GetPractitionerSocials($id: String!) {
                    vendor(id: $id) {
                        id
                        social {
                            style
                            platforms {
                                id
                                url
                                handle
                                platform
                            }
                        }
                    }
                }`,
                { id: practitionerId }
            );
            return response.vendor;
        },
        enabled: !!practitionerId
    });

    if (vendorQuery.data != null && !hasLoaded) {
        const socials = (vendorQuery.data.social?.platforms ?? []) as UpdatePractitionerSocialsSchema['socials']

        // Add any missing platforms
        allowedPlatforms.forEach((platform) => {
            if (!socials.some((social) => social.platform === platform)) {
                socials.push({ id: uuid(), url: undefined, platform, handle: '' })
            }
        })

        form.reset({
            id: practitionerId,
            style: (vendorQuery.data.social?.style?.toLowerCase() as 'solid' | 'outline') ?? 'solid',
            socials: socials
        })
        setHasLoaded(true)
    }

    return {
        form,
        isLoading: !hasLoaded,
        mutation: useMutation({
            mutationFn: async (values: UpdatePractitionerSocialsSchema) => {
                const input = clone(values)
                // Filter out platforms with empty URLs
                input.socials = input.socials.filter((social) => {
                    return !isNullOrWhitespace(social.url)
                })

                // Use the same mutation as merchants since both are Vendors
                const response = await gql<{
                    update_merchant_socials: {
                        vendor: vendor_type
                    }
                }>(`
                    mutation update_practitioner_socials($practitionerId: ID!, $style: String!, $socials: [SocialPlatformInput]!) {
                        update_merchant_socials(merchantId: $practitionerId, style: $style, socials: $socials) {
                            vendor {
                                id
                                social {
                                    style
                                    platforms {
                                        id
                                        url
                                        handle
                                        platform
                                    }
                                }
                            }
                        }
                    }
                `, {
                    practitionerId: input.id,
                    style: input.style,
                    socials: input.socials
                })

                return response.update_merchant_socials.vendor
            },
            onSuccess: (data) => {
                queryClient.setQueryData(['practitioner-socials', practitionerId], (oldData: any) => {
                    return mergeDeepWithClone(oldData, data)
                })
                queryClient.invalidateQueries({ queryKey: ['practitioner-profile', practitionerId] })
            }
        })
    }

}

export default useEditPractitionerSocials;

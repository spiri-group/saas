'use client';

import UseVendorInformation from "@/app/(site)/m/_components/Nametag/hooks/UseVendorInformation";
import { clone, isNullOrWhitespace, mergeDeepWithClone } from "@/lib/functions";
import { gql } from "@/lib/services/gql";
import { vendor_type } from "@/utils/spiriverse";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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

const UpdateVendorFormSchema = z.object({
    id: z.string().min(1),
    socials: z.array(SocialPlatformSchema),
    style: z.enum(['solid', 'outline'])
});

export type UpdateVendorFormSchema = z.infer<typeof UpdateVendorFormSchema>

const useEditVendorSocials = (merchantId: string) => {

    const queryClient = useQueryClient()
    const [hasLoaded, setHasLoaded] = useState(false)
    
    const form = useForm<z.infer<typeof UpdateVendorFormSchema>>({
        resolver: zodResolver(UpdateVendorFormSchema),
        defaultValues: {
            id: undefined,
            style: 'solid',
            socials: allowedPlatforms.map((platform) => {
                return { id: uuid(), url: undefined, platform }
            })
        }
    })

    const vendorInformationResponse = UseVendorInformation(merchantId);

    if (vendorInformationResponse.data != null && !hasLoaded) {
        const socials = (vendorInformationResponse.data.social?.platforms ?? []) as UpdateVendorFormSchema['socials']

        // we need to add any missing platforms
        allowedPlatforms.forEach((platform) => {
            if (!socials.some((social) => social.platform === platform)) {
                socials.push({ id: uuid(), url: undefined, platform, handle: '' })
            }
        })

        form.reset({
            id: merchantId,
            style: (vendorInformationResponse.data.social?.style?.toLowerCase() as 'solid' | 'outline') ?? 'solid',
            socials: socials
        })
        setHasLoaded(true)
    }

    return {
        form,
        isLoading: !hasLoaded,
        mutation: useMutation({
            mutationFn: async (values: UpdateVendorFormSchema) => {
                const vendorInput = clone(values)
                // we need to delete each platform that has an empty url / id
                vendorInput.socials = vendorInput.socials.filter((social) => {
                    return !isNullOrWhitespace(social.url)
                })
                
                const response = await gql<{
                    update_merchant_socials: {
                        vendor: vendor_type
                    }
                }>(`
                    mutation update_vendor($merchantId: ID!, $style: String!, $socials: [SocialPlatformInput]!) {
                        update_merchant_socials(merchantId: $merchantId, style: $style, socials: $socials) {
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
                    merchantId: vendorInput.id,
                    style: vendorInput.style,
                    socials: vendorInput.socials
                })

                return response.update_merchant_socials.vendor
            },
            onSuccess: (data) => {
                queryClient.setQueryData(['vendorInformation', merchantId], (oldData: any) => {
                    return mergeDeepWithClone(oldData, data)
                })
            }
        })
    }

}

export default useEditVendorSocials;

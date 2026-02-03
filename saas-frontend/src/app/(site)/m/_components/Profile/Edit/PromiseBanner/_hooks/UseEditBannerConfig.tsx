import { gql } from "@/lib/services/gql"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod"
import { vendor_type } from "@/utils/spiriverse";
import UseVendorInformation from "../../../../Nametag/hooks/UseVendorInformation";
import { useEffect } from "react";

export type BannerConfigFormSchema = z.infer<typeof bannerConfigFormSchema>

const bannerConfigFormSchema = z.object({
    merchantId: z.string().min(1),
    bannerConfig: z.object({
        backgroundType: z.enum(['COLOR', 'GRADIENT', 'IMAGE']),
        backgroundColor: z.string().optional(),
        gradientStart: z.string().optional(),
        gradientEnd: z.string().optional(),
        gradientDirection: z.enum(['TO_RIGHT', 'TO_LEFT', 'TO_BOTTOM', 'TO_TOP', 'TO_BOTTOM_RIGHT', 'TO_BOTTOM_LEFT', 'TO_TOP_RIGHT', 'TO_TOP_LEFT']).optional(),
        backgroundImage: z.object({
            name: z.string(),
            url: z.string(),
            urlRelative: z.string(),
            size: z.string(),
            type: z.string()
        }).optional(),
        promiseText: z.string().min(1, "Promise text is required"),
        textColor: z.string().min(1),
        textAlignment: z.enum(['LEFT', 'CENTER', 'RIGHT']),
        textSize: z.enum(['SMALL', 'MEDIUM', 'LARGE', 'XLARGE'])
    })
})

const defaultBannerConfig = {
    backgroundType: 'COLOR' as const,
    backgroundColor: '#6366f1',
    promiseText: '',
    textColor: '#ffffff',
    textAlignment: 'CENTER' as const,
    textSize: 'LARGE' as const
}

const UseEditBannerConfig = (merchantId: string) => {
    const queryClient = useQueryClient()
    const vendorInfo = UseVendorInformation(merchantId);

    const form = useForm<BannerConfigFormSchema>({
        resolver: zodResolver(bannerConfigFormSchema),
        defaultValues: {
            merchantId: merchantId,
            bannerConfig: defaultBannerConfig
        }
    })

    // Reset form when vendor data loads to populate with existing banner config
    useEffect(() => {
        if (vendorInfo.data?.bannerConfig) {
            form.reset({
                merchantId: merchantId,
                bannerConfig: {
                    ...defaultBannerConfig,
                    ...vendorInfo.data.bannerConfig
                }
            })
        }
    }, [vendorInfo.data?.bannerConfig, merchantId, form])

    return {
        form,
        hasLoaded: !!vendorInfo.data,
        mutation: useMutation({
            mutationFn: async (values: BannerConfigFormSchema) => {
                const bannerInput = { ...values.bannerConfig } as any

                // Remove url from backgroundImage if present
                if (bannerInput.backgroundImage?.url) {
                    delete bannerInput.backgroundImage.url
                }

                const response = await gql<any>(
                    `mutation update_merchant_banner_config($merchantId: ID!, $bannerConfig: BannerConfigInput!) { 
                        update_merchant_banner_config(merchantId: $merchantId, bannerConfig: $bannerConfig) {
                            vendor {
                                id
                                bannerConfig {
                                    backgroundType
                                    backgroundColor
                                    gradientStart
                                    gradientEnd
                                    gradientDirection
                                    backgroundImage {
                                        name
                                        url
                                        urlRelative
                                        size
                                        type
                                    }
                                    promiseText
                                    textColor
                                    textAlignment
                                    textSize
                                }
                            }
                        }
                    }`,
                    {
                        merchantId: values.merchantId,
                        bannerConfig: bannerInput
                    }
                )
                return response.update_merchant_banner_config.vendor
            },
            onSuccess: async (data : vendor_type) => {
                queryClient.setQueryData(["vendorInformation", merchantId], (old: vendor_type) => {
                    return {
                        ...old,
                        bannerConfig: data.bannerConfig
                    }
                });
            }
        })
    }
}

export default UseEditBannerConfig

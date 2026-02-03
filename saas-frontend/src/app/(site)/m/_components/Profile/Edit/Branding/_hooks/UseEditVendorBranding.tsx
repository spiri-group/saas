import { gql } from "@/lib/services/gql"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod"
import { vendor_type } from "@/utils/spiriverse";
import { useEffect, useState } from "react";
import { clone, isNullOrWhitespace, mergeDeep, omit } from "@/lib/functions";
import { MediaSchema } from "@/shared/schemas/media";
import UseVendorBranding from "../../../../../_hooks/UseVendorBranding";
import { BackgroundSchema } from "@/components/ux/BackgroundPicker";

export type UpdateVendorFormSchema = z.infer<typeof UpdateVendorFormSchema>

const FontSchema = z.object({
    family: z.string().min(1),
    color: z.string().min(1)
})

const UpdateVendorFormSchema = z.object({
    id: z.string().min(1),
    logo: MediaSchema.optional().nullable(),
    mode: z.enum(['easy', 'advanced']),
    // New theme system
    selectedTheme: z.string().optional(), // theme ID (midnight, royal, etc.)
    selectedScheme: z.enum(['light', 'dark']).optional(), // UI scheme
    // Advanced mode fields (keep for backward compatibility)
    font: z.object({
        brand: FontSchema,
        headings: FontSchema,
        default: FontSchema,
        accent: FontSchema
    }),
    colors: z.object({
        primary: z.object({
            background: z.string().min(1),
            foreground: z.string().min(1)
        }),
        links: z.string().min(1)
    }),
    background: BackgroundSchema,
    panels: z.object({
        primary: FontSchema,
        accent: FontSchema,
        background: z.object({
            color: z.string().min(1),
            transparency: z.number().min(0).max(1)
        })
    }),
    social: z.object({
        style: z.enum(['solid', 'outline'])
    })
});

const UseEditVendorBranding = (merchantId: string) => {
    const queryClient = useQueryClient()
    const [hasLoaded, setHasLoaded] = useState(false)

    const form = useForm<z.infer<typeof UpdateVendorFormSchema>>({
        resolver: zodResolver(UpdateVendorFormSchema),
        defaultValues: {
            id: undefined,
            mode: 'easy',
            selectedTheme: 'midnight',
            selectedScheme: 'light'
        }
    })

    const vendorInformationResponse = UseVendorBranding(merchantId)

    useEffect(() => {
        if (vendorInformationResponse.data != null && !hasLoaded) {
            // Use saved mode if available, otherwise determine based on custom branding
            const savedMode = vendorInformationResponse.data.vendor.mode;
            const hasCustomBranding = vendorInformationResponse.data.vendor.background?.image || 
                                     vendorInformationResponse.data.vendor.panels?.background?.transparency !== 1;
            
            form.reset({
                id: vendorInformationResponse.data.vendor.id,
                logo: vendorInformationResponse.data.vendor.logo,
                mode: (savedMode as "easy" | "advanced") ?? (hasCustomBranding ? "advanced" : "easy"),
                selectedTheme: vendorInformationResponse.data.vendor.selectedTheme || 'midnight',
                selectedScheme: (vendorInformationResponse.data.vendor.selectedScheme as "light" | "dark") || 'light',
                font: {
                    brand: vendorInformationResponse.data.vendor.font?.brand 
                        ? { 
                            family: vendorInformationResponse.data.vendor.font.brand.family || "clean", 
                            color: vendorInformationResponse.data.vendor.font.brand.color || "#000000" 
                        }
                        : { family: "clean", color: "#000000" },
                    headings: vendorInformationResponse.data.vendor.font?.headings 
                        ? { 
                            family: vendorInformationResponse.data.vendor.font.headings.family || "clean", 
                            color: vendorInformationResponse.data.vendor.font.headings.color || "#000000" 
                        }
                        : { family: "clean", color: "#000000" },
                    default: vendorInformationResponse.data.vendor.font?.default 
                        ? { 
                            family: vendorInformationResponse.data.vendor.font.default.family || "clean", 
                            color: vendorInformationResponse.data.vendor.font.default.color || "#000000" 
                        }
                        : { family: "clean", color: "#000000" },
                    accent: vendorInformationResponse.data.vendor.font?.accent 
                        ? { 
                            family: vendorInformationResponse.data.vendor.font.accent.family || "clean", 
                            color: vendorInformationResponse.data.vendor.font.accent.color || "#000000" 
                        }
                        : { family: "clean", color: "#000000" }
                },
                colors: vendorInformationResponse.data.vendor.colors || {
                    primary: {
                        background: "#439bcc",
                        foreground: "#ffffff"
                    },
                    links: "#439bcc"
                },
                background: vendorInformationResponse.data.vendor.background || {
                    color: "#EEEEEE"
                },
                panels: vendorInformationResponse.data.vendor.panels || {
                    background: {
                        color: "#FFFFFF",
                        transparency: 1
                    },
                    primary: {
                        family: "clean",
                        color: "#000000"
                    },
                    accent: {
                        family: "clean",
                        color: "#000000"
                    }
                }, 
                social: {
                    style: vendorInformationResponse.data.vendor.social?.style as ('solid' | 'outline') || 'solid'
                }
            })
            setHasLoaded(true)
        }
    }, [vendorInformationResponse.data])

    // any form changes we want to apply in real time to the cached branding-for-vendor
    // this means they can see the changes
    const { watch } = form
    useEffect(() => {
        if (!hasLoaded) return;

        const {unsubscribe} = watch((values) => {
            if (values.id != null) {
                queryClient.setQueryData(["branding-for-vendor", values.id], (old: vendor_type) => {
                    // Transform the form values to match cache structure
                    const transformedValues = {
                        ...values,
                        social: {
                            ...old.social,
                            style: values.social?.style || 'solid'
                        }
                    };
                    
                    return {
                        vendor: mergeDeep(old, transformedValues)
                    }
                })
            }
        })
        
        return () => {
            unsubscribe()
        }

    }, [watch, hasLoaded])

    return {
        form,
        hasLoaded,
        isLoading: vendorInformationResponse.isLoading,
        mutation: useMutation({
            mutationFn: async (values: UpdateVendorFormSchema) => {
                const vendorInput = clone(values, 'deep') as any;
                const merchantId = vendorInput.id

                if (vendorInput.id == null || isNullOrWhitespace(vendorInput.id)) {
                    throw new Error("Vendor ID is required")
                }

                const theme = omit(vendorInput, ["id", "logo.url", "background.image.url"])
                theme.socialStyle = vendorInput.social.style
                delete theme.social

                const response = await gql<{
                    update_merchant_theme: {
                        vendor: {
                            id: string,
                            social: {
                                style: 'solid' | 'outline'
                            }
                        }
                    }
                }>(`
                    mutation update_merchant_theme($merchantId: ID!, $theme: VendorThemeUpdateInput!) {
                        update_merchant_theme(merchantId: $merchantId, theme: $theme) {
                            vendor {
                                id
                                social {
                                    style
                                }
                            }
                        }
                    }
                `, {
                    merchantId,
                    theme
                })

                return response.update_merchant_theme.vendor
            }, onSuccess: async(data, variables) => {
                // Update the branding-for-vendor cache with social style
                queryClient.setQueryData(["branding-for-vendor", variables.id], (old: any) => {
                    return {
                        vendor: {
                            ...old?.vendor,
                            social: {
                                ...old?.vendor?.social,
                                style: data.social.style
                            }
                        }
                    }
                })
            }
        })
    }
}

export default UseEditVendorBranding
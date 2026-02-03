import { gql } from "@/lib/services/gql"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod"
import { vendor_type } from "@/utils/spiriverse";
import { useEffect, useState } from "react";
import { clone, countWords, isNullOrWhitespace, mergeDeepWithClone, omit } from "@/lib/functions";
import { MediaSchema } from "@/shared/schemas/media";
import UseVendorDescriptions from "@/app/(site)/m/_hooks/UseVendorDescriptions";

export const VendorDescriptionSchema = z.object({
    id: z.string().uuid(),
    title: z.string().min(1),
    body: z.string().min(1).refine(x => countWords(x) <= 500, {
        message: "Description must be less than 500 words"
    }),
    supporting_images: z.array(MediaSchema).optional().nullable()
})
export type VendorDescriptionSchema = z.infer<typeof VendorDescriptionSchema>

const UpdateVendorFormSchema = z.object({
    id: z.string().min(1),
    descriptions: z.array(VendorDescriptionSchema),
});
export type UpdateVendorFormSchema = z.infer<typeof UpdateVendorFormSchema>

const useEditVendorDescriptions = (merchantId: string) => {
    const queryClient = useQueryClient()
    const [hasLoaded, setHasLoaded] = useState(false)

    const form = useForm<z.infer<typeof UpdateVendorFormSchema>>({
        resolver: zodResolver(UpdateVendorFormSchema),
        defaultValues: {
            id: undefined
        }
    })

    const vendorInformationResponse = UseVendorDescriptions(merchantId)

    useEffect(() => {
        if (vendorInformationResponse.data != null && !hasLoaded) {
            form.reset({
                id: vendorInformationResponse.data.vendor.id,
                descriptions: vendorInformationResponse.data.vendor.descriptions ?? []
            })
            setHasLoaded(true)
        }
    }, [vendorInformationResponse.data])

    return {
        form,
        hasLoaded,
        isLoading: vendorInformationResponse.isLoading,
        mutation: useMutation({
            mutationFn: async (values: UpdateVendorFormSchema) => {
                let vendorInput = clone(values, 'deep') as any;

                if (vendorInput.id == null || isNullOrWhitespace(vendorInput.id)) {
                    throw new Error("Vendor ID is required")
                }
                
                vendorInput = omit(vendorInput, ["descriptions.supporting_images.url"])

                const response = await gql<{
                    update_merchant_descriptions: {
                        vendor: vendor_type
                    }
                }>(`
                    mutation update_vendor($merchantId: ID!, $descriptions: [MerchantDescriptionInput]!) {
                        update_merchant_descriptions(merchantId: $merchantId, descriptions: $descriptions) {
                            vendor {
                                id
                                descriptions {
                                    id
                                    title
                                    body 
                                    supporting_images {
                                        name
                                        url
                                        urlRelative
                                        size
                                        type
                                        title
                                        description
                                        hashtags
                                    }
                                }
                            }
                        }
                    }
                `, {
                    merchantId: vendorInput.id,
                    descriptions: vendorInput.descriptions
                })

                return response.update_merchant_descriptions.vendor
            }, onSuccess: async(data: vendor_type) => {
                queryClient.setQueryData(['vendorInformation', merchantId], (oldData: any) => {
                    return mergeDeepWithClone(oldData, data)
                })
                queryClient.setQueryData(['descriptions-for-vendor', merchantId], (oldData: any) => {
                    return mergeDeepWithClone(oldData, { vendor: { descriptions: data.descriptions } })
                })
            }
        })
    }
}

export default useEditVendorDescriptions
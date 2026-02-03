import { gql } from "@/lib/services/gql"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod"
import { vendor_type } from "@/utils/spiriverse";
import { useEffect, useState } from "react";
import { clone, countWords, isNullOrWhitespace, mergeDeepWithClone } from "@/lib/functions";
import UseVendorInformation from "@/app/(site)/m/_components/Nametag/hooks/UseVendorInformation";

const UpdateVendorFormSchema = z.object({
    id: z.string().min(1),
    intro: z.string().min(1).refine(x => countWords(x) <= 100, {
        message: "Description must be less than 100 words"
    })
});
export type UpdateVendorFormSchema = z.infer<typeof UpdateVendorFormSchema>

const useEditVendorIntro = (merchantId: string) => {
    const queryClient = useQueryClient()
    const [hasLoaded, setHasLoaded] = useState(false)

    const form = useForm<z.infer<typeof UpdateVendorFormSchema>>({
        resolver: zodResolver(UpdateVendorFormSchema),
        defaultValues: {
            id: undefined
        }
    })

    const vendorInformationResponse = UseVendorInformation(merchantId)

    useEffect(() => {
        if (vendorInformationResponse.data != null && !hasLoaded) {
            form.reset({
                id: vendorInformationResponse.data.id,
                intro: vendorInformationResponse.data.intro ?? ""
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
                const vendorInput = clone(values, 'deep') as any;

                if (vendorInput.id == null || isNullOrWhitespace(vendorInput.id)) {
                    throw new Error("Vendor ID is required")
                }

                const response = await gql<{
                    update_merchant_intro: {
                        vendor: vendor_type
                    }
                }>(`
                    mutation update_vendor($merchantId: ID!, $intro: String!) {
                        update_merchant_intro(merchantId: $merchantId, intro: $intro) {
                            vendor {
                                id
                                intro
                            }
                        }
                    }
                `, {
                    merchantId: vendorInput.id,
                    intro: vendorInput.intro
                })

                return response.update_merchant_intro.vendor
            }, onSuccess: async(data: vendor_type) => {
                queryClient.setQueryData(['vendorInformation', merchantId], (oldData: any) => {
                    return mergeDeepWithClone(oldData, data)
                })
            }
        })
    }
}

export default useEditVendorIntro
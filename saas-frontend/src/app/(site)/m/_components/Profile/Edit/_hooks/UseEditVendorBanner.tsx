import { gql } from "@/lib/services/gql"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod"
import { vendor_type } from "@/utils/spiriverse";

export type updateVendor_type = z.infer<typeof updateVendorFormSchema>

const updateVendorFormSchema = z.object({
    id: z.string().min(1),
    banner: z.object({
        name: z.string().min(1),
        url: z.string().min(1),
        urlRelative: z.string().min(1),
        size: z.string().min(1),
        type: z.string().min(1)
    })
})

const UseEditVendorBanner = (merchantId: string) => {
    const queryClient = useQueryClient()

    const form = useForm<z.infer<typeof updateVendorFormSchema>>({
        resolver: zodResolver(updateVendorFormSchema),
        defaultValues: {
            id: merchantId
        }
    })

    return {
        form,
        mutation: useMutation({
            mutationFn: async (values: updateVendor_type) => {
                
                const vendorInput = { ...values } as any

                //we need to remove url from logo if logo is set
                if (vendorInput.banner != null) {
                    delete vendorInput.banner.url
                }

                const response = await gql<any>(
                    `mutation update_vendor($vendor: VendorUpdateInput!) { 
                        update_vendor(vendor: $vendor) {
                            vendor {
                                id
                                banner {
                                    name,
                                    url,
                                    urlRelative,
                                    size,
                                    type
                                }
                            }
                        }
                    }
                    `,
                    {
                        vendor: vendorInput
                    }
                )
                return response.update_vendor.vendor
            },
            onSuccess: async (data : vendor_type) => {
                queryClient.setQueryData(["vendorInformation", merchantId], (old: vendor_type) => {
                    return {
                        ...old,
                        banner: data.banner
                    }
                });
            }
        })
    }
}

export default UseEditVendorBanner
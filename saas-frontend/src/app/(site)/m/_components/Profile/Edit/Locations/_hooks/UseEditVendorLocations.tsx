import { gql } from "@/lib/services/gql"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod"
import { vendor_type } from "@/utils/spiriverse";
import { useEffect, useState } from "react";
import { clone, isNullOrWhitespace, mergeDeepWithClone } from "@/lib/functions";
import { GooglePlaceSchema } from "@/components/ux/AddressInput";
import UseVendorLocations from "@/app/(site)/m/_hooks/UseVendorLocations";
import { v4 as uuid } from 'uuid';

export const VendorLocationSchema = z.object({
    id: z.string().uuid(),
    title: z.string().min(1),
    address: GooglePlaceSchema,
    services: z.array(z.string())
})
export type VendorDescriptionSchema = z.infer<typeof VendorLocationSchema>

const UpdateVendorFormSchema = z.object({
    id: z.string().min(1),
    locations: z.array(VendorLocationSchema)
});
export type UpdateVendorFormSchema = z.infer<typeof UpdateVendorFormSchema>

const useEditVendorLocations = (merchantId: string) => {
    const queryClient = useQueryClient()
    const [hasLoaded, setHasLoaded] = useState(false)

    const form = useForm<z.infer<typeof UpdateVendorFormSchema>>({
        resolver: zodResolver(UpdateVendorFormSchema),
        defaultValues: {
            id: undefined,
            locations: []
        }
    })

    const vendorLocations = UseVendorLocations(merchantId)

    useEffect(() => {
        if (vendorLocations.data != null && !hasLoaded) {
            const locations = 
            vendorLocations.data != null &&
            vendorLocations.data.length > 0 
             ? vendorLocations.data
                : [{ id: uuid(), services: [] }]

            form.reset({
                id: merchantId,
                locations: locations
            })
            setHasLoaded(true)
        }
    }, [vendorLocations.data])

    return {
        form,
        isLoading: !hasLoaded,
        mutation: useMutation({
            mutationFn: async (values: UpdateVendorFormSchema) => {
                const vendorInput = clone(values, 'deep') as any;

                if (vendorInput.id == null || isNullOrWhitespace(vendorInput.id)) {
                    throw new Error("Vendor ID is required")
                }

                const response = await gql<{
                    update_merchant_locations: {
                        vendor: vendor_type
                    }
                }>(`
                    mutation update_vendor($merchantId: ID!, $locations: [MerchantLocationInput]!) {
                        update_merchant_locations(merchantId: $merchantId, locations: $locations) {
                            vendor {
                                id
                                locations {
                                    id
                                    title
                                    address {
                                        id
                                        formattedAddress
                                        point {
                                            type
                                            coordinates {
                                                lat
                                                lng
                                            }
                                        }
                                    }
                                    services
                                }
                            }
                        }
                    }
                `, {
                    merchantId: vendorInput.id,
                    locations: vendorInput.locations
                })

                return response.update_merchant_locations.vendor
            }, onSuccess: async(data: vendor_type) => {
                queryClient.setQueryData(['vendorInformation', merchantId], (oldData: any) => {
                    return mergeDeepWithClone(oldData, data)
                })
                queryClient.setQueryData(['locations-for-vendor', merchantId], (oldData: any) => {
                    return mergeDeepWithClone(oldData, { vendor: { locations: data.locations } })
                })
            }
        })
    }
}

export default useEditVendorLocations
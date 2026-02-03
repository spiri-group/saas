import { gql } from "@/lib/services/gql"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod"
import { vendor_type } from "@/utils/spiriverse";
import { useEffect, useState } from "react";
import { PhoneSchema } from "@/components/ux/PhoneInput";
import UseVendorContactInformation from "../../../../../_hooks/UseVendorContactInformation";
import { isNullOrWhitespace, mergeDeepWithClone, omit } from "@/lib/functions";

export type UpdateVendorFormSchema = z.infer<typeof UpdateVendorFormSchema>

export const VendorContactSchema = z.object({
    email: z.string().email().optional().or(z.literal("")),
    phoneNumber: PhoneSchema.optional()
});

export const InternalVendorContactSchema = z.object({
    email: z.string().email().optional().or(z.literal("")),
    phoneNumber: PhoneSchema.optional(),
    emailVerified: z.boolean(),
    phoneNumberVerified: z.boolean()
});

const UpdateVendorFormSchema = z.object({
    id: z.string().min(1),
    website: z.string().refine(
        (value) => value === "" || z.string().url().safeParse(value).success,
        {
            message: "Must be either an empty string or a valid URL",
        }
    ).optional(),
    contact: z.object({
        internal: InternalVendorContactSchema,
        public: VendorContactSchema
    })
});

const UseEditVendorContactDetails = (merchantId: string) => {
    const queryClient = useQueryClient()
    const [hasLoaded, setHasLoaded] = useState(false)

    const form = useForm<z.infer<typeof UpdateVendorFormSchema>>({
        resolver: zodResolver(UpdateVendorFormSchema),
        defaultValues: {
            id: undefined,
            website: "",
            contact: {
            }
        }
    })

    const vendorInformationResponse = UseVendorContactInformation(merchantId)

    useEffect(() => {
        if (vendorInformationResponse.data != null) {
            form.reset({
                id: vendorInformationResponse.data.id, // Use actual vendor ID, not slug
                website: vendorInformationResponse.data.website,
                contact: {
                    internal: {
                        email: vendorInformationResponse.data.contact.internal.email,
                        emailVerified: !isNullOrWhitespace(vendorInformationResponse.data.contact.internal.email),
                        phoneNumber: vendorInformationResponse.data.contact.internal.phoneNumber,
                        phoneNumberVerified: vendorInformationResponse.data.contact.internal.phoneNumber != null
                    },
                    public: {
                        email: vendorInformationResponse.data.contact.public.email,
                        phoneNumber: vendorInformationResponse.data.contact.public.phoneNumber
                    }
                }
            })
            setHasLoaded(true)
        }
    }, [vendorInformationResponse.data])

    // if internal email is changed, we need to update the emailVerified field to be false
    const internalEmailChange = form.watch("contact.internal.email")
    useEffect(() => {
        if (!hasLoaded) return;
        if (internalEmailChange != vendorInformationResponse.data?.contact.internal.email) {
            form.setValue("contact.internal.emailVerified", false)
        }
    }, [internalEmailChange])
    // if internal phone number is changed, we need to update the phoneNumberVerified field to be false
    const internalPhoneNumberChange = form.watch("contact.internal.phoneNumber.value")
    useEffect(() => {
        if (!hasLoaded) return;
        if (vendorInformationResponse.data?.contact.internal.phoneNumber == null || internalPhoneNumberChange != vendorInformationResponse.data?.contact.internal.phoneNumber.value) {
            form.setValue("contact.internal.phoneNumberVerified", false)
        }
    }, [internalPhoneNumberChange])

    return {
        form,
        isLoading: vendorInformationResponse.isLoading,
        mutation: useMutation({
            mutationFn: async (values: UpdateVendorFormSchema) => {
                // Check if internal contact details were changed
                const originalData = vendorInformationResponse.data;
                const internalEmailChanged = originalData && values.contact.internal.email !== originalData.contact.internal.email;
                const internalPhoneChanged = originalData && values.contact.internal.phoneNumber?.value !== originalData.contact.internal.phoneNumber?.value;

                // If internal contact was changed, require verification
                if (internalEmailChanged && !values.contact.internal.emailVerified) {
                    throw new Error("You must verify your internal email before saving changes to it");
                }
                if (internalPhoneChanged && !values.contact.internal.phoneNumberVerified) {
                    throw new Error("You must verify your internal phone number before saving changes to it");
                }

                const vendorInput = omit(values, [
                    "contact.internal.emailVerified",
                    "contact.internal.phoneNumberVerified",
                    "logo.url"]
                )

                const response = await gql<any>(
                    `mutation update_vendor($vendor: VendorUpdateInput!) { 
                        update_vendor(vendor: $vendor) {
                            vendor {
                                id
                                website
                                contact {
                                    internal {
                                        email,
                                        phoneNumber {
                                            displayAs,
                                            value,
                                            raw
                                        }
                                    },
                                    public {
                                        email,
                                        phoneNumber {
                                            displayAs,
                                            value,
                                            raw
                                        }
                                    }
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
            }, onSuccess: async(data: vendor_type) => {
                queryClient.setQueryData(["vendorInformation", merchantId], (old: vendor_type) => {
                    return mergeDeepWithClone(old, data)
                })
                queryClient.setQueryData(["contact-information-for-vendor", merchantId], (old: vendor_type) => {
                    return mergeDeepWithClone(old, data)
                })
            }
        })
    }
}

export default UseEditVendorContactDetails
import { gql } from "@/lib/services/gql"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod"
import UseUserProfile from "./UseUserProfile";
import { useEffect, useState } from "react";
import { GooglePlaceSchema } from "@/components/ux/AddressInput";
import { PhoneSchema } from "@/components/ux/PhoneInput";
import { v4 as uuid } from "uuid";
import { useUserPreferences } from "@/lib/context/UserPreferencesContext";
import { getDefaultsFromCountry } from "@/lib/functions";

export type UpdateUserProfileFormSchema = z.infer<typeof UpdateUserProfileFormSchema>

export const UpdateUserProfileFormSchema = z.object({
    id: z.string().uuid(),
    firstname: z.string().min(1),
    lastname: z.string().min(1),
    email: z.string().email().min(1),
    phoneNumber: PhoneSchema,
    address: GooglePlaceSchema,
    religion: z.object({
        id: z.string().min(1),
        label: z.string().min(1)
    }).optional(),
    openToOtherExperiences: z.boolean().optional(),
    securityQuestions: z.array(z.object({
        id: z.string().uuid(),
        question: z.string().min(1),
        answer: z.string().min(1)
    }))
})

const UseUpdateUserProfile = (userId: string) => {
    const queryClient = useQueryClient()
    const [hasLoaded, setHasLoaded] = useState(false)
    const userPreferences = useUserPreferences();

    const form = useForm<UpdateUserProfileFormSchema>({
        resolver: zodResolver(UpdateUserProfileFormSchema),
        defaultValues: {
            religion: undefined,
            openToOtherExperiences: false,
            securityQuestions: [{
                id: uuid(),
                question: "",
                answer: ""
            }]
        }
    })

    const userProfile = UseUserProfile(userId)

    useEffect(() => {
        if (userProfile.data != null && !hasLoaded) {
            // Get the default address or first address from the addresses array
            const defaultAddress = userProfile.data.addresses?.find(a => a.isDefault)?.address
                || userProfile.data.addresses?.[0]?.address;

            // Only populate fields that have values from the backend
            // Don't reset fields that are already filled by the user
            const currentValues = form.getValues();

            // Transform backend religion data (id, name) to form schema (id, label)
            const backendReligion = (userProfile.data as any).religion;
            const religionValue = currentValues.religion || (backendReligion ? {
                id: backendReligion.id,
                label: backendReligion.name // Backend uses 'name', form expects 'label'
            } : undefined);

            form.reset({
                id: userProfile.data.id,
                firstname: currentValues.firstname || userProfile.data.firstname,
                lastname: currentValues.lastname || userProfile.data.lastname,
                email: userProfile.data.email,
                phoneNumber: currentValues.phoneNumber || (userProfile.data as any).phoneNumber,
                address: currentValues.address || defaultAddress,
                religion: religionValue,
                openToOtherExperiences: currentValues.openToOtherExperiences ?? (userProfile.data as any).openToOtherExperiences ?? false,
                securityQuestions: currentValues.securityQuestions?.[0]?.question
                    ? currentValues.securityQuestions
                    : (userProfile.data.securityQuestions ?? [{
                        id: uuid(),
                        question: "",
                        answer: ""
                    }])
            })
            setHasLoaded(true)
        }
    }, [userProfile.data, hasLoaded])

    return {
        form,
        mutation: useMutation({
            mutationFn: async (values: UpdateUserProfileFormSchema) => {
                // we want to put in the currency for the customer we can look at the country code on the address
                // and then look up the currency for that country code
                const country_code = values.address.components.country
                const { currency, locale } = getDefaultsFromCountry(country_code);

                const resp = await gql<any>(
                    `mutation update_user($customer: CustomerUpdateInput!) {
                        update_user(customer: $customer) {
                            customer {
                                id
                                firstname,
                                lastname,
                                email,
                                phoneNumber {
                                    raw
                                    displayAs
                                    value
                                },
                                address {
                                    id,
                                    formattedAddress,
                                    point {
                                        type,
                                        coordinates {
                                            lat
                                            lng
                                        }
                                    }
                                }
                            }
                        }
                    }
                    `,
                    {
                        customer: {
                            id: values.id,
                            firstname: values.firstname,
                            lastname: values.lastname,
                            phoneNumber: values.phoneNumber,
                            address : values.address,
                            currency: currency,
                            locale,
                            religionId: values.religion?.id,
                            openToOtherExperiences: values.openToOtherExperiences,
                            securityQuestions: values.securityQuestions
                        }
                    }
                )
                return {...resp.update_user.customer, country_code}  
            },
            onSuccess: ({ country_code }) => {
                queryClient.invalidateQueries({
                    queryKey: ["user-profile", userId]
                })
                queryClient.invalidateQueries({
                    queryKey: ["user-requires-input", userId]
                })
                userPreferences.setFromCountry(country_code)
            }
        })
    }
}

export default UseUpdateUserProfile;
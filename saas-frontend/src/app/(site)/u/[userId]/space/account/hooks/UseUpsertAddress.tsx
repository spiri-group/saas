import { gql } from "@/lib/services/gql"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod"
import { GooglePlaceSchema } from "@/components/ux/AddressInput";
import { address_type, user_type } from "@/utils/spiriverse";
import { PhoneSchema } from "@/components/ux/PhoneInput";

export type AddressesSchema = z.infer<typeof AddressesSchema>

const AddressesSchema = z.object({
    id: z.string().uuid().optional(),
    firstname: z.string(),
    lastname: z.string(),
    phoneNumber: PhoneSchema,
    address: GooglePlaceSchema
})

const UseUpsertAddress = (userId: string, address?: address_type | null) => {
    const queryClient = useQueryClient();
    
    const form = useForm<AddressesSchema>({
        resolver: zodResolver(AddressesSchema),
        defaultValues: address ?? {
            
        }
    })

    return {
        form,
        mutation: useMutation({
            mutationFn: async (values: AddressesSchema) => {
                const resp = await gql<{
                    upsert_address: {
                        address: address_type
                    }
                }>(`
                    mutation upsert_address($customerId: ID!, $address: AddressInput!) { 
                        upsert_address(customerId: $customerId, address: $address) {
                            address {
                                id
                                firstname
                                lastname
                                phoneNumber {
                                    value
                                    raw
                                    displayAs
                                }
                                isDefault
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
                            }
                        }
                    }
                `, 
                {
                    customerId: userId,
                    address: values
                })
                return resp.upsert_address.address
            },
            onSuccess: async (data) => {
                
                // lets update the cache with the new address
                await queryClient.setQueryData(["user-profile", userId], (old: user_type) => {
                    if (address == null) {
                        return {
                            ...old,
                            addresses: [...old.addresses, data]
                        }
                    }

                    return {
                        ...old,
                        addresses: old.addresses.map((a) => {
                            if (a.id === address?.id) {
                                return data
                            }
                            return a
                        })
                    }
                })

                
            }
        })
    }
}

export default UseUpsertAddress
import { gql } from "@/lib/services/gql";
import { user_type } from "@/utils/spiriverse";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const UseSetAddressAsDefault = () => {
    const queryClient = useQueryClient();

    return {
        mutation: useMutation({
            mutationFn: async (values: { customerId: string; addressId: string }) => {
                await gql<{ set_default_address }>(`
                    mutation set_default_address($customerId: ID!, $addressId: ID!) {
                        set_default_address(customerId: $customerId, addressId: $addressId) {
                            code
                            success
                            message
                        }
                    }
                `, 
                {
                    customerId: values.customerId,
                    addressId: values.addressId
                })

                return values
            },
            onSuccess: ({addressId, customerId}) => {
                queryClient.setQueryData(["user-profile", customerId], (old: user_type) => {
                    return {
                        ...old,
                        addresses: old.addresses.map((a) => {
                            if (a.id === addressId) {
                                return {
                                    ...a,
                                    isDefault: true
                                }
                            }
                            return {
                                ...a,
                                isDefault: false
                            }
                        })
                    }
                })
            }
        }),
    }
}

export default UseSetAddressAsDefault
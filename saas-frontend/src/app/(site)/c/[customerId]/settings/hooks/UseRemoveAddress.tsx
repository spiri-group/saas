import { gql } from "@/lib/services/gql";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { user_type } from "@/utils/spiriverse";

const UseRemoveAddress = () => {
    const queryClient = useQueryClient();

    return {
        mutation: useMutation({
            mutationFn: async (values: { customerId: string; addressId: string }) => {
                await gql<{ remove_address }>(`
                    mutation remove_address($customerId: ID!, $addressId: ID!) {
                        remove_address(customerId: $customerId, addressId: $addressId) {
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
                return values;
            },
            onSuccess: (values: { customerId: string; addressId: string }) => {
                queryClient.setQueryData(["user-profile", values.customerId], (old: user_type) => {
                    return {
                        ...old,
                        addresses: old.addresses.filter((a) => a.id !== values.addressId)
                    }
                })
            }
        })
    }
}

export default UseRemoveAddress
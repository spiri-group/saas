import { gql } from "@/lib/services/gql";
import { vendor_type } from "@/utils/spiriverse";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const UseRemoveWelcomeMessage = () => {
    const queryClient = useQueryClient();

    return {
        mutation: useMutation({
            mutationFn: async (merchantId: string) => {
                await gql<any>(`
                    mutation create_service($merchantId: String!) { 
                        clearMerchantWelcomeMessage(vendorId: $merchantId) {
                            code
                        }
                    }
                    `,
                    {
                        merchantId
                    }
                )
        
                return merchantId
            },
            onSuccess: async (merchantId) => {
                queryClient.setQueryData(["vendorInformation", merchantId], (old: vendor_type) => {
                    if (old == undefined) return old;
                    delete old.onStart;
                    return old;
                });
            }
        })
    }
}

export default UseRemoveWelcomeMessage;
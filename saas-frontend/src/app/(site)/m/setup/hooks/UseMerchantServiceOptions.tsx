import { gql } from "@/lib/services/gql";
import { choice_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

const key = "service-options-for-merchant";

const queryFn = async () => {
    const resp = await gql<{
        flatChoice: choice_type
    }>(`
            query get_service_options {
                flatChoice(field: "services", defaultLocale: "EN") {
                    options {
                        id
                        defaultLabel
                    }
                }
            }
        `
    );
    return resp.flatChoice.options;
}

const UseMerchantServiceOptions = () => {
    return useQuery({
        queryKey: [key],
        queryFn: () => queryFn()
    });
}

export default UseMerchantServiceOptions;
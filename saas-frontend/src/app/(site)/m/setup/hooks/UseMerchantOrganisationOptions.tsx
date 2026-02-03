import { gql } from "@/lib/services/gql"
import { choice_type } from "@/utils/spiriverse"
import { useQuery } from "@tanstack/react-query"

const key = "organisation-options-for-merchant"

const queryFn = async () => {
    const resp = await gql<{
        flatChoice: choice_type
    }>(`
            query get_organisation_options {
                flatChoice(field: "merchantOrganisationType", defaultLocale: "EN") {
                    options {
                        id
                        defaultLabel
                    }
                }
            }
        `
    )
    return resp.flatChoice.options
}

const UseMerchantOrganisationOptions = () => {
    return useQuery({
        queryKey: [key],
        queryFn: () => queryFn()
    })
}

export default UseMerchantOrganisationOptions
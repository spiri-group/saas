import { gql } from "@/lib/services/gql";
import { choice_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

const key = "supported-country-options";

const queryFn = async () => {
    const resp = await gql<{
        flatChoice: choice_type
    }>( `
        query get_country_options {
            flatChoice(field: "supportedCountries", defaultLocale: "EN") {
                options {
                    id
                    defaultLabel
                }
            }
        }
    `)
    return resp.flatChoice.options
}

const UseSupportedCountryOptions = () => {
    return useQuery({
        queryKey: [key],
        queryFn: () => queryFn()
    })
}

export default UseSupportedCountryOptions
import { gql } from "@/lib/services/gql"
import { choice_type } from "@/utils/spiriverse"
import { useQuery } from "@tanstack/react-query"

const key = "spiriverse-interests"

const queryFn = async () => {
    const resp = await gql<{
        flatChoice: choice_type
    }>(`
        query get_interest_options {
            flatChoice(field: "interests", defaultLocale: "EN") {
                options {
                    id
                    defaultLabel
                }
            }
        }
    `)
    return resp.flatChoice.options
}

const UseSpiriVerseInterests = () => {
    return useQuery({
        queryKey: [key],
        queryFn: () => queryFn()
    })
}

export default UseSpiriVerseInterests
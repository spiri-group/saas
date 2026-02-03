'use client';

import { gql } from "@/lib/services/gql"
import { choice_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query"

export const KEY = "helpRequest-unit"

export const queryFn = async () => {
    const resp = await gql<{
        flatChoice: choice_type
    }>( `query GetHelpRequestCategory($field: String!, $defaultLocale: Locale!) {
                flatChoice(field: $field, defaultLocale: $defaultLocale) {
                    id
                    options {
                        id
                        defaultLabel
                    }
                }
            }
        `,
        {
            field: "unit",
            defaultLocale: "EN"
        }
    )
    return resp.flatChoice.options.filter(x => ["DAY", "WEEK", "MONTH", "YEAR"].includes(x.id));
}

const UseCaseUnit = () => {
    return useQuery({
        queryKey: [KEY],
        queryFn: () => queryFn()
    });
}

export default UseCaseUnit
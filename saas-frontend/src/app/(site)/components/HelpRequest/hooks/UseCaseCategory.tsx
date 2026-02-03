'use client';

import { gql } from "@/lib/services/gql"
import { choice_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query"

export const KEY = "helpRequest-categories"

export const queryFn = async () => {
    const resp = await gql<{
        flatChoice: choice_type
    }>(
        `query GetHelpRequestCategory($field: String!, $defaultLocale: Locale!) {
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
            field: "helpRequestCategory",
            defaultLocale: "EN"
        }
    )

    return resp.flatChoice.options;
}

const UseCaseCategory = () => {
    return useQuery({
        queryKey: [KEY],
        queryFn: () => queryFn()
    });
}

export default UseCaseCategory

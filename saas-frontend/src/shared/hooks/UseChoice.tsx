'use client';

import { gql } from "@/lib/services/gql"
import { choice_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query"

export const KEY = "choice"

type choice_client_type = choice_type & {
    combobox_options: { id: string, value: string}[]
}

export const queryFn = async (field: string, defaultLocale: string, allowedOptionIds: string[] = []) => {
    const resp = await gql<{flatChoice: choice_type}>(
        `query get_units($field: String!, $defaultLocale: String!) {
            flatChoice(field: $field, defaultLocale: $defaultLocale) {
                id
                options {
                    id
                    defaultLabel
                }
            }
        }`,
        {
            field, defaultLocale
        }
    )

    // if allowed options is set we need to limit the options
    if (allowedOptionIds.length > 0) {
        resp.flatChoice.options = resp.flatChoice.options.filter(x => allowedOptionIds.includes(x.id))
    }

    return {
        ...resp.flatChoice,
        combobox_options: resp.flatChoice.options.map((option) => ({ id: option.id, value: option.defaultLabel }))
    } as choice_client_type
}

const UseChoice = (field: string, defaultLocale: string, allowedOptionIds: string[] = []) => {
    return useQuery({
        queryKey: [KEY, field, defaultLocale, allowedOptionIds],
        queryFn: () => queryFn(field, defaultLocale, allowedOptionIds)
    });
}

export default UseChoice
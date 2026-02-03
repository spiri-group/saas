'use client';

import { escape_key, isNullOrWhitespace, isNumeric } from "@/lib/functions";
import { gql } from "@/lib/services/gql";
import UseReligiousOptions from "@/shared/hooks/UseReligiousOptions";
import { ChoiceOptionSchema } from "@/shared/schemas/choiceOption";
import { case_type } from "@/utils/spiriverse";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const key = 'available-cases';

const FilterSchema = z.object({
    religion: ChoiceOptionSchema.optional(),
    zipCode: z.coerce.number().optional()
});
type FilterSchema = z.infer<typeof FilterSchema>;

export const UseAvailableCasesFilter = () => {
    
    const [appliedFilters, setAppliedFilters] = useState<FilterSchema>({
        religion: undefined,
        zipCode: undefined
    });

    const religions = UseReligiousOptions()

    const form = useForm<FilterSchema>({
        resolver: zodResolver(FilterSchema),
        defaultValues: {
            religion: undefined,
            zipCode: undefined
        }
    })

    return {
        form,
        appliedFilters,
        appliedFiltersCount: Object.keys(appliedFilters).filter(key => appliedFilters[key] !== undefined).length,
        clear: () => {
            setAppliedFilters({});
            form.reset();
        },
        options: {
            religions: religions.data
        },
        saveFilters: (data: FilterSchema) => {
            setAppliedFilters(data);
            escape_key();
        }
    }
}

const queryFn = async (religionId?: string, zipCode?: number) => {

    const data = {} as any
    if (!isNullOrWhitespace(religionId)) {
        data.religionId = religionId
    }
    if (isNumeric(zipCode)) {
        data.zipCode = zipCode
    }

    const resp = await gql<{
        cases: case_type[]
    }>( `query get_all_new_case($religionId: String, $zipCode: Int) {
            cases(statuses: "NEW", madeOffer: false, religionId: $religionId, zipCode: $zipCode){
                id,
                description,
                category {
                    id,
                    defaultLabel 
                },
                locatedFromMe {
                    value
                    units
                },
                affectedPeople {
                    id
                },
                affectedAreas {
                    id
                },
                ref {
                    id,
                    partition,
                    container
                }
            }
        }
        `, data
    )
    return resp.cases;
}

const UseAvailableCases = (religionId?: string, zipCode?: number) => {
    return useQuery({
        queryKey: [key, religionId, zipCode],
        queryFn: () => queryFn(religionId, zipCode)
    });
}

export default UseAvailableCases
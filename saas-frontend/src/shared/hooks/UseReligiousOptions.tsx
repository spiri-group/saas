import { gql } from "@/lib/services/gql"
import { useQuery } from "@tanstack/react-query"

const key = "religious-options"

interface ChoiceFlatOption {
    id: string
    label: string
    path: string
    slug: string
    level: number
}

const queryFn = async () => {
    const resp = await gql<{
        choiceTreeFlat: ChoiceFlatOption[]
    }>(
        `
            query get_religious_options {
                choiceTreeFlat(field: "religions", locale: "EN") {
                    id
                    label
                    path
                    slug
                    level
                }
            }
        `
    )

    // Sort to ensure "No Affiliation" appears first (match by label, not ID)
    const options = resp.choiceTreeFlat;
    const noAffiliation = options.find(opt => opt.label === "No Affiliation");
    const others = options.filter(opt => opt.label !== "No Affiliation");

    // Convert to the format expected by ComboBox (id and defaultLabel)
    const sorted = noAffiliation ? [noAffiliation, ...others] : options;
    return sorted.map(opt => ({
        id: opt.id,
        defaultLabel: opt.label,
        status: "ACTIVE" as const
    }));
}

const UseReligiousOptions = () => {
    return useQuery({
        queryKey: [key],
        queryFn: () => queryFn()
    })
}

export default UseReligiousOptions
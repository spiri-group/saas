import { gql } from "@/lib/services/gql";
import { case_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

const key = 'assigned-cases-for-me';

export const required_attributes = `
    id,
    caseStatus,
    code,
    ref {
        id,
        partition,
        container
    }
`

const queryFn = async () => {

    const resp = await gql<{
        cases: case_type[]
    }>( 
        `query get_my_cases($status: [String]!) {
            cases(statuses: $status) {
                ${required_attributes}
            }
        }
        `,
        {
            status: ["ACTIVE", "CLOSED"]
        }
    )
    return resp.cases;
}

const UseAssignedCases = () => {
    return useQuery({
        queryKey: [key],
        queryFn: () => queryFn()
    });
}

export default UseAssignedCases
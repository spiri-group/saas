import { gql } from "@/lib/services/gql";
import { case_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

const key = 'case-status';

const queryFn = async (caseId: string) => {

    const resp = await gql<{
        case_status: case_type
    }>( `query get_caseStatus($caseId: String) {
            case(caseId: $caseId) {
                id,
                caseStatus,
                trackingCode
            }
        }
        `,
        {
            caseId: caseId
        }
    )
    return resp.case_status;
}

const UseCaseStatus = (caseId: string) => {
    return useQuery({
        queryKey: [key, caseId],
        queryFn: () => queryFn(caseId)
    });
}

export default UseCaseStatus
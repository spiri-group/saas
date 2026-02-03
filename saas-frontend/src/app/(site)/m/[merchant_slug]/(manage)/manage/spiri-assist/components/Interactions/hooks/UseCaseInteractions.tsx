import { gql } from "@/lib/services/gql";
import { case_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

const key = 'interactions-for-case';

const queryFn = async (caseId: string, types?: string[]) => {

    const resp = await gql<{
        case: case_type
    }>( `query get_case_interaction($caseId: String!, $types: [String])  {
                case(caseId:$caseId) {
                    id,
                    interactions(types: $types) {
                        id,
                        conductedAtDate,
                        code,
                        posted_by_userId,
                        posted_by_vendorId,
                        type,
                        details,
                        message,
                        details,
                        attachedFiles {
                            name
                            url
                        },
                        ref {
                            id,
                            partition,
                            container
                        }
                        participants {
                            vendorId
                        }
                    }
                }
            }
        `,
        {
            caseId,
            types
        }
    )
    return resp.case.interactions;
}

const UseCaseInteractions = (caseId: string, types?: string[]) => {
    return useQuery({
        queryKey: [key, caseId, types],
        queryFn: () => queryFn(caseId, types)
    });
}

export default UseCaseInteractions
import { gql } from "@/lib/services/gql";
import { caseOffer_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

const key = 'case-applications';

const queryFn = async (merchantId?: string, caseId?: string) => {

    const resp = await gql<{
        caseOffers: caseOffer_type[]
    }>( `query get_my_caseOffers($merchantId: ID, $caseId: ID) {
            caseOffers(merchantId: $merchantId, caseId: $caseId) {
                id,
                merchantId,
                caseId,
                case {
                    code
                }
                code,
                type,
                description,
                merchant {
                    name
                }
                ref {
                    id
                    partition
                    container
                }
            }
        }
        `,
        {
            merchantId,
            caseId
        }
    )
    return resp.caseOffers;
}

const UseCaseApplications = (merchantId?: string, caseId?: string) => {
    return useQuery({
        queryKey: [key, merchantId, caseId],
        queryFn: () => queryFn(merchantId, caseId)
    });
}

export default UseCaseApplications
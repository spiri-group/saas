import { gql } from "@/lib/services/gql";
import { vendor_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

const key = 'merchants-for-case'

const queryFn = async (caseId: string) => {

    const resp = await gql<{
        case: {
            merchants: vendor_type[]
        }
    }>( 
        `query get_case_merchants($caseId: String!) {
            case(caseId:$caseId) {
                id,
                merchants {
                    id
                    name
                }
            }
        }`,
        { 
            caseId 
        }
    )
    return resp.case.merchants
}    

const UseCaseMerchants = (caseId: string) => {
    return useQuery({
        queryKey: [key, caseId],
        queryFn: () => queryFn(caseId)
    });
}

export default UseCaseMerchants
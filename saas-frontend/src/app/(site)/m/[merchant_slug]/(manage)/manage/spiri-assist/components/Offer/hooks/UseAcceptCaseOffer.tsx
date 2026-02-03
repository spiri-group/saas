import { beforeStateReset } from "@/components/utils/UseFormStatus";
import { gql } from "@/lib/services/gql";
import { caseOffer_type, case_type, recordref_type } from "@/utils/spiriverse";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const UseAcceptCaseOffer = () => {
  const queryClient = useQueryClient();

    const mutation = useMutation({
      mutationFn: async (ref: recordref_type) => {
        const resp = await gql<{
            accept_caseOffer: {
                offer: caseOffer_type
            }
        }>( `mutation accept_caseOffer($ref: RecordRefInput!) {
            accept_caseOffer(ref: $ref) {
                code
                message
                offer {
                    id,
                    caseId,
                    acceptedOn,
                    rejectedOn,
                    ref {
                        id
                        partition
                        container
                    }
                }
            }
        }
        `, {
            ref
        })

        return resp.accept_caseOffer.offer
      },
      onSuccess: async (data : caseOffer_type) => {
        beforeStateReset(() => {
            queryClient.setQueryData(["details-for-case", data.caseId], (old: case_type) => {
                return {
                    ...old,
                    caseStatus: "ACTIVE"
                }
            })
        })
      }
        
    })

    return {
        mutation
    }
}
  
  export default UseAcceptCaseOffer
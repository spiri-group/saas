import { beforeStateReset } from "@/components/utils/UseFormStatus";
import { gql } from "@/lib/services/gql";
import { caseOffer_type, recordref_type } from "@/utils/spiriverse";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const UseRejectCaseOffer = () => {
  const queryClient = useQueryClient();

    const mutation = useMutation({
      mutationFn: async (ref: recordref_type) => {
        const resp = await gql<{
            reject_caseOffer: {
                offer: caseOffer_type
            }
        }>( `mutation reject_caseOffer($ref: RecordRefInput!) {
            reject_caseOffer(ref: $ref) {
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

        return resp.reject_caseOffer.offer
      },
      onSuccess: async (data : caseOffer_type) => {
        beforeStateReset(() => {
            queryClient.invalidateQueries({
                queryKey: ['case-applications', undefined, data.caseId]
            })
        })
      }
    })

    return {
        mutation
    }
}
  
  export default UseRejectCaseOffer
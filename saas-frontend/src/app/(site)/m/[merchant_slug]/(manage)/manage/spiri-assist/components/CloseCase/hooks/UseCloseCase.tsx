import { beforeStateReset } from "@/components/utils/UseFormStatus";
import { gql } from "@/lib/services/gql";
import { case_type, recordref_type } from "@/utils/spiriverse";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const UseCloseCase = () => {
  const queryClient = useQueryClient();

    const mutation = useMutation({
      mutationFn: async (ref: recordref_type) => {
        await gql<{
            close_case: {
                code: string
                message: string
            }
        }>( `mutation close_case($ref: RecordRefInput!) {
            close_case(ref: $ref) {
                code
                message
            }
        }
        `, {
            ref
        })

        return ref
      },
      onSuccess: async (data : recordref_type) => {
        beforeStateReset(() => {
            queryClient.setQueryData(["details-for-case", data.id], (old: case_type) => {
                return {
                    ...old,
                    caseStatus: "CLOSED"
                }
            })
        })
      }
    })

    return {
        mutation
    }
}
  
  export default UseCloseCase
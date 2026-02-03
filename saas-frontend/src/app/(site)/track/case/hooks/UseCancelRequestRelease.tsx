import { gql } from "@/lib/services/gql";
import { case_type, recordref_type } from "@/utils/spiriverse";
import { useMutation } from "@tanstack/react-query";

const UseCancelRequestReleaseCase = () => {

    const mutation = useMutation({
      mutationFn: async (ref: recordref_type) => {
        const resp = await gql<{
            cancel_request: case_type
        }>(`
            mutation cancel_request($ref: RecordRefInput!) {
                cancel_request(ref: $ref) {
                    case {
                        id
                        release_status,
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

        return resp.cancel_request
      },
        // onSuccess: async (data : case_type, _, __) => {

        // }
    })
    return {
        mutation
    }
}
  
export default UseCancelRequestReleaseCase
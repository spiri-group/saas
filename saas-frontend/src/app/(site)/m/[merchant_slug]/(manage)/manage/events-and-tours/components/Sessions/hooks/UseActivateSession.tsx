import { gql } from "@/lib/services/gql"

import { recordref_type } from "@/utils/spiriverse"
import { useMutation } from "@tanstack/react-query"

const UseActivateSession = () => {
    return {
        mutation: useMutation({
            mutationFn: async (sessionRef: recordref_type) => {
                const resp = await gql<{activate_session: boolean}>(`
                    mutation activate_session($sessionRef: RecordRefInput!) {
                        activate_session(sessionRef: $sessionRef) {
                            code
                        }
                    }
                `, {
                    sessionRef
                });
                return resp.activate_session;
            }
        })
    }
}

export default UseActivateSession
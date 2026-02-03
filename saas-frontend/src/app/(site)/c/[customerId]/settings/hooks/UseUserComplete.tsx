'use client';

import { gql } from "@/lib/services/gql"
import { useQuery } from "@tanstack/react-query"

const key = 'user-requires-input';

export const userCompleteQuery = `
    query get_user($id: String, $email: String) {
        user(id: $id, email: $email) {
            id,
            requiresInput
        }
        }
    `

export const userCompleteFn = async (userId: string) => {
    const resp = await gql<{
        user: {
            id: string,
            requiresInput: boolean
        }
    }>( userCompleteQuery,
        {
            id: userId
        }
    )
    return resp.user
}

const UseUserComplete = (userId: string) => {
    return useQuery({
        queryKey: [key, userId],
        queryFn: () => userCompleteFn(userId),
        enabled: !!userId, // Only run query when userId is available
        staleTime: 0, // Always refetch when component mounts
        refetchOnMount: true, // Refetch when component mounts
    })
}

export default UseUserComplete;
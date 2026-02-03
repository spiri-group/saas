import { gql } from "@/lib/services/gql";
import { user_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

export const KEY = "user-me-contact"

export const queryFn = async () => {
    const { me } = await gql<{ me: user_type }>(`
        query get_me {
            me {
                id
                email
                name
                phoneNumber {
                    raw
                    displayAs
                    value
                }
            }
        }
    `)
    return me;
}

const UseContactMe = () => {
    return useQuery({
        queryKey: [KEY],
        queryFn: () => queryFn(),
        // User contact info rarely changes, cache for longer
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 30 * 60 * 1000, // 30 minutes
    });
}

export default UseContactMe
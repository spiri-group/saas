/**
 * @deprecated This hook is deprecated and should no longer be used.
 *
 * All user data (id, email, requiresInput, vendors, cases) is now available
 * directly from NextAuth session via `useSession()` hook.
 *
 * Migration guide:
 *
 * Before:
 * ```tsx
 * import UseNavMe from "./_hooks/UseNavMe";
 * const { data: user, isLoading } = UseNavMe();
 * ```
 *
 * After:
 * ```tsx
 * import { useSession } from "next-auth/react";
 * const { data: session, status } = useSession();
 * const user = session?.user;
 * const isLoading = status === "loading";
 * ```
 *
 * Benefits:
 * - Reduces redundant GraphQL calls (data already fetched server-side)
 * - Faster page loads (no additional client-side queries)
 * - Single source of truth for user data
 * - Automatic revalidation handled by NextAuth
 *
 * This file is kept for reference only. Remove after all migrations are verified.
 */

import { gql } from "@/lib/services/gql";
import { user_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

export const KEY = "user-me-nav"

export const queryFn = async () => {
    const { me } = await gql<{ me: user_type }>(`
        query get_me {
            me {
                id
                email
                requiresInput
                vendors {
                    id
                    slug
                    name
                }
                cases {
                    id
                    code
                    location {
                        formattedAddress
                    }
                }
            }
        }
    `)
    return me;
}

/**
 * @deprecated Use `useSession()` from "next-auth/react" instead
 */
const UseNavMe = () => {
    return useQuery({
        queryKey: [KEY],
        queryFn: () => queryFn()
    });
}

export default UseNavMe

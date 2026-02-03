'use client';

import { gql } from "@/lib/services/gql";
import { setup_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";

const key = "setup-me"

const queryFn = async () => {
    const resp = await gql<any>(
        `
            query get_setup {
                me {
                    setup {
                        id
                        path
                    }
                }
            }
        `
    )
    if (resp.me.setup == null) {
        return {
            id: null,
            path: null
        } as setup_type;
    } else {
        return resp.me.setup as setup_type
    }
}

const UseSetup = () => {
    return useQuery({
        queryKey: [key],
        queryFn: () => queryFn()
    });
}

export default UseSetup
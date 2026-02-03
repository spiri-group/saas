'use client';

import { gql } from "@/lib/services/gql"

import { socialpost_type } from "@/utils/spiriverse"
import { useQuery } from "@tanstack/react-query"

export const KEY = "posts-for-customer"

export const queryFn = async (userId: string) => {
    const resp = await gql<{user: { socialPosts: socialpost_type[] } }>(
        `query get_socialpost($userId:String!){
            user(userId:$userId) {
                socialPosts {
                    id,
                    availableAfter,
                    description,
                    media {
                        name, 
                        url, 
                        type
                    }
                    hashtags,
                    isPublished
                }
            }
        }`,
        { 
            userId
        }
    )    
    return resp.user.socialPosts;
}

const UsePostsForCustomer = (userId: string) => {
    return useQuery({
        queryKey: ["posts-for-customer", { userId }],
        queryFn: () => queryFn(userId)
    });
}

export default UsePostsForCustomer
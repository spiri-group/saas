'use client';

import { gql } from "@/lib/services/gql"

import { socialpost_type } from "@/utils/spiriverse"
import { useQuery } from "@tanstack/react-query"

export const KEY = "posts-for-merchant"

export const queryFn = async (merchantId: string) => {
    const resp = await gql<{vendor: { socialPosts: socialpost_type[] } }>(
        `query get_socialpost($vendorId:String!){
            vendor(id:$vendorId) {
                socialPosts {
                    id,
                    type,
                    vendorId,
                    title,
                    availableAfter,
                    description
                    hashtags,
                    isPublished,
                    content {
                        ... on SocialPostTextOnlyContent {
                            mainText {
                                content,
                                format {
                                    font,
                                    size,
                                    color,
                                    backgroundColor,
                                    bold,
                                    italic,
                                    alignment,
                                    decoration,
                                    case,
                                    margin {
                                        top,
                                        bottom,
                                        left,
                                        right
                                    },
                                    padding {
                                        top,
                                        bottom,
                                        left,
                                        right
                                    },
                                    withQuotes,
                                    borderRadius {
                                        topLeft,
                                        topRight,
                                        bottomLeft,
                                        bottomRight
                                    }
                                }
                            }
                            subText {
                                content,
                                format {
                                    font,
                                    size,
                                    color,
                                    backgroundColor,
                                    bold,
                                    italic,
                                    alignment,
                                    decoration,
                                    case,
                                    margin {
                                        top,
                                        bottom,
                                        left,
                                        right
                                    },
                                    padding {
                                        top,
                                        bottom,
                                        left,
                                        right
                                    },
                                    withQuotes,
                                    borderRadius {
                                        topLeft,
                                        topRight,
                                        bottomLeft,
                                        bottomRight
                                    }
                                }
                            },
                            textVerticalAlignment,
                            backgroundType,
                            backgroundColor,
                            backgroundImage {
                                url
                            }
                        }
                    }
                    ref {
                        id, 
                        partition,
                        container
                    }
                }
            }
        }`,
        { vendorId: merchantId }
    )    
    return resp.vendor.socialPosts;
}

const UsePostsForMerchant = (merchantId: string) => {
    return useQuery({
        queryKey: [KEY, { merchantId }],
        queryFn: () => queryFn(merchantId)
    });
}

export default UsePostsForMerchant
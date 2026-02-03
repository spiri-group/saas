'use client';

import { gql } from "@/lib/services/gql";
import { searchResponse } from "@/utils/spiriverse";
import { useInfiniteQuery } from "@tanstack/react-query";

const queryFn = async (
    source: "listings" | "merchants",
    term: string,
    pageParam: { offset: number; limit: number }
) => {
    const resp = await gql<{
        search: searchResponse;
    }>(
        `query get_search_results($source: String!, $term: String!, $offset: Int, $limit: Int) {
            search(source: $source, term: $term, offset: $offset, limit: $limit) {
                results {
                    id
                    title
                    link
                    thumbnail {
                        image {
                            media {
                                size
                                url
                            }
                            zoom
                        }
                        title {
                            content
                            panel {
                                textColor
                                bgColor
                                bgOpacity
                            }
                        }
                        moreInfo {
                            content
                        }
                        bgColor
                    }
                    price {
                        amount
                        currency
                    }
                    additionalInfo
                }
                hasMore
            }
        }`,
        {
            term: term ?? null,
            offset: pageParam.offset,
            limit: pageParam.limit,
            source: source
        }
    );
    return resp.search;
};

const UseSearch = (source: "listings" | "merchants", enabled: boolean, term = '') => {
    const queryKey = ['search', source, term];
    return {
        key: queryKey,
        query: useInfiniteQuery({
            queryKey: queryKey,
            queryFn: ({ pageParam }) => queryFn(source, term, pageParam),
            initialPageParam: { offset: 0, limit: 28 },
            enabled,
            getNextPageParam: (_lastPage, pages) => {
                const totalLoaded = pages.flatMap(p => p.results).length;
                if (_lastPage.hasMore) {
                    return {
                        offset: totalLoaded,
                        limit: 16
                    };
                }
                return undefined;
            }
        })
    }
};

export default UseSearch;

'use client';

import { gql } from "@/lib/services/gql";
import { listing_type } from "@/utils/spiriverse";
import { useInfiniteQuery } from "@tanstack/react-query";

const key = 'catalogue';

const queryFn = async (
    pageParam: { offset: number; limit: number },
    merchantId?: string,
    search?: string,
    includeDrafts?: boolean
) => {
    const resp = await gql<{
        catalogue: {
            listings: listing_type[],
            hasMore: boolean,
            hasPrevious: boolean
        }
    }>( `query get_catalogue($vendorId: ID, $search: String, $offset: Int, $limit: Int, $includeDrafts: Boolean) {
            catalogue(vendorId:$vendorId, search:$search, offset:$offset, limit:$limit, includeDrafts:$includeDrafts)  {
                listings {
                    ref {
                        id
                        partition
                        container
                    }
                    id,
                    slug,
                    vendorId,
                    vendor {
                        id
                        name
                        slug
                        selectedTheme
                        selectedScheme
                    }
                    name,
                    url,
                    type, 
                    thumbnail {
                        image {
                            media {
                                name
                                size
                                url
                                urlRelative
                                type
                            },
                            zoom,
                            objectFit
                        },
                        dynamicMode {
                            type
                            video {
                                media {
                                    name
                                    size
                                    url
                                    urlRelative
                                    type
                                    durationSeconds
                                }
                                autoplay
                                muted
                            }
                            collage {
                                images {
                                    name
                                    size
                                    url
                                    urlRelative
                                    type
                                }
                                transitionDuration
                                crossFade
                            }
                        },
                        title {
                            content
                            panel {
                                textColor
                                bgColor
                                bgOpacity
                            }
                        },
                        moreInfo {
                            content
                        },
                        stamp {
                            text
                            enabled
                            bgColor
                            textColor
                        },
                        bgColor
                        panelTone
                    }
                    skus {
                        id
                        price {
                            amount
                            currency
                        }
                        qty
                    }
                    isLive
                }
                hasMore
                hasPrevious
                totalCount
            }
          }
        `,
        {
            vendorId: merchantId != null ? merchantId : null,
            search: search != null ? search : null,
            offset: pageParam.offset,
            limit: pageParam.limit,
            includeDrafts: includeDrafts ?? false
        }
    )
    return resp.catalogue;
}

const UseCatalogue = (merchantId?: string, search?: string, offset?: number, limit?: number, includeDrafts?: boolean) => {
    const queryKey = [key, merchantId, search, offset, limit, includeDrafts]
    return {
        key: queryKey,
        query: useInfiniteQuery({
            queryKey: queryKey,
            queryFn: ({ pageParam }) => queryFn(pageParam, merchantId, search, includeDrafts),
            initialPageParam: { offset: 0, limit: 28 },
            enabled: !!merchantId,
            getNextPageParam: (_lastPage, pages) => {
                const totalLoaded = pages.flatMap(p => p.listings).length;
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
}

export default UseCatalogue
import { useInfiniteQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export type FeedActivity = {
    id: string;
    vendorId: string;
    vendorName: string;
    vendorSlug: string;
    vendorLogo: { url: string; name: string } | null;
    vendorDocType: string;
    activityType: string;
    sourceId: string;
    title: string;
    subtitle: string | null;
    media: { url: string; name: string; type: string; durationSeconds?: number } | null;
    coverPhoto: { url: string; name: string } | null;
    metadata: string | null; // JSON string
    publishedAt: string;
};

type FeedResponse = {
    activities: FeedActivity[];
    hasMore: boolean;
    followingCount: number;
};

const FEED_FIELDS = `
    id
    vendorId
    vendorName
    vendorSlug
    vendorLogo { url name }
    vendorDocType
    activityType
    sourceId
    title
    subtitle
    media { url name type }
    coverPhoto { url name }
    metadata
    publishedAt
`;

export const useFollowingFeed = (activityTypes?: string[]) => {
    return useInfiniteQuery({
        queryKey: ['following-feed', activityTypes],
        queryFn: async ({ pageParam = 0 }) => {
            const response = await gql<{ myFeed: FeedResponse }>(`
                query MyFeed($limit: Int, $offset: Int, $activityTypes: [String]) {
                    myFeed(limit: $limit, offset: $offset, activityTypes: $activityTypes) {
                        activities { ${FEED_FIELDS} }
                        hasMore
                        followingCount
                    }
                }
            `, { limit: 10, offset: pageParam * 10, activityTypes });
            return response.myFeed;
        },
        getNextPageParam: (lastPage, allPages) => lastPage.hasMore ? allPages.length : undefined,
        initialPageParam: 0,
    });
};

type ExploreResponse = {
    activities: FeedActivity[];
    hasMore: boolean;
};

export const useExploreFeed = (category?: string) => {
    return useInfiniteQuery({
        queryKey: ['explore-feed', category],
        queryFn: async ({ pageParam = 0 }) => {
            const response = await gql<{ exploreFeed: ExploreResponse }>(`
                query ExploreFeed($limit: Int, $offset: Int, $category: String) {
                    exploreFeed(limit: $limit, offset: $offset, category: $category) {
                        activities { ${FEED_FIELDS} }
                        hasMore
                    }
                }
            `, { limit: 10, offset: pageParam * 10, category });
            return response.exploreFeed;
        },
        getNextPageParam: (lastPage, allPages) => lastPage.hasMore ? allPages.length : undefined,
        initialPageParam: 0,
    });
};

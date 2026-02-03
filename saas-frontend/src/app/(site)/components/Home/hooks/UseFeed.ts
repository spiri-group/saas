'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export interface FeedVideo {
  media: { url: string; name: string; type: string; durationSeconds?: number };
  coverPhoto?: { url: string; name: string } | null;
}

export interface FeedOracleMessage {
  id: string;
  audio: { url: string; name: string; type: string };
  message: string | null;
  postedAt: string;
  expiresAt: string;
}

export interface FeedPost {
  vendorId: string;
  vendorName: string;
  vendorSlug: string;
  vendorLogo: { url: string; name: string } | null;
  vendorDocType: string;
  postType: 'VIDEO' | 'ORACLE';
  video: FeedVideo | null;
  oracleMessage: FeedOracleMessage | null;
}

export interface RecommendedVendor {
  id: string;
  name: string;
  slug: string;
  logo: { url: string; name: string } | null;
  docType: string;
  followerCount: number | null;
  headline: string | null;
  modalities: string[] | null;
  matchReason: string | null;
}

const PAGE_SIZE = 10;

export const useMyFeed = (enabled: boolean = true) => {
  return useInfiniteQuery({
    queryKey: ['my-feed'],
    enabled,
    queryFn: async ({ pageParam = 0 }) => {
      const response = await gql<{
        myFeed: {
          posts: FeedPost[];
          hasMore: boolean;
        };
      }>(`
        query MyFeed($limit: Int, $offset: Int) {
          myFeed(limit: $limit, offset: $offset) {
            posts {
              vendorId
              vendorName
              vendorSlug
              vendorLogo {
                url
                name
              }
              vendorDocType
              postType
              video {
                media {
                  url
                  name
                  type
                  durationSeconds
                }
                coverPhoto {
                  url
                  name
                }
              }
              oracleMessage {
                id
                audio {
                  url
                  name
                  type
                }
                message
                postedAt
                expiresAt
              }
            }
            hasMore
          }
        }
      `, {
        limit: PAGE_SIZE,
        offset: pageParam * PAGE_SIZE
      });
      return response.myFeed;
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length : undefined;
    },
    initialPageParam: 0,
  });
};

export const useRecommendedVendors = (limit: number = 10, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['recommended-vendors', limit],
    enabled,
    queryFn: async () => {
      const response = await gql<{
        recommendedVendors: RecommendedVendor[];
      }>(`
        query RecommendedVendors($limit: Int) {
          recommendedVendors(limit: $limit) {
            id
            name
            slug
            logo {
              url
              name
            }
            docType
            followerCount
            headline
            modalities
            matchReason
          }
        }
      `, { limit });
      return response.recommendedVendors;
    },
  });
};

import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

type ListingType = 'TOUR' | 'PRODUCT' | 'SERVICE' | 'LIVESTREAM' | 'VIDEO' | 'PODCAST';

type ThumbnailMedia = {
  name: string;
  url: string;
  urlRelative: string;
  size: string;
  type: string;
  code: string;
};

type Thumbnail = {
  image?: {
    media?: ThumbnailMedia;
    zoom: number;
    objectFit?: string;
  };
  dynamicMode?: {
    type: string;
    video?: {
      media?: ThumbnailMedia;
      autoplay?: boolean;
      muted?: boolean;
    };
    collage?: {
      images: ThumbnailMedia[];
      transitionDuration?: number;
      crossFade?: boolean;
    };
  };
  panelTone?: string;
  bgColor?: string;
  stamp?: {
    text?: string;
    enabled: boolean;
    bgColor: string;
    textColor: string;
  };
  title?: {
    content?: string;
  };
  moreInfo?: {
    content?: string;
  };
};

type MerchantListingSearchResult = {
  id: string;
  title: string;
  type: ListingType;
  category?: string;
  status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  thumbnail?: Thumbnail;
};

type UseSearchMerchantListingsParams = {
  merchantId: string;
  searchQuery: string;
  enabled?: boolean;
};

export const useSearchMerchantListings = ({
  merchantId,
  searchQuery,
  enabled = true
}: UseSearchMerchantListingsParams) => {
  return useQuery({
    queryKey: ['search-merchant-listings', merchantId, searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.trim().length === 0) {
        return [];
      }

      const response = await gql<{
        searchMerchantListings: MerchantListingSearchResult[];
      }>(`
        query SearchMerchantListings($merchantId: ID!, $search: String!) {
          searchMerchantListings(merchantId: $merchantId, search: $search) {
            id
            title
            type
            category
            status
            thumbnail {
              image {
                media {
                  url
                  urlRelative
                }
                zoom
                objectFit
              }
              bgColor
              panelTone
            }
          }
        }
      `, {
        merchantId,
        search: searchQuery
      });

      return response.searchMerchantListings;
    },
    enabled: enabled && !!merchantId && !!searchQuery && searchQuery.trim().length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export type { MerchantListingSearchResult, ListingType };

'use client'

import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export interface gallery_album {
  id: string;
  merchantId: string;
  name: string;
  description?: string;
  coverImageUrl?: string;
  itemCount: number;
  ref: {
    id: string;
    partition: string[];
    container: string;
  };
  createdAt: string;
  updatedAt: string;
}

export const useGalleryAlbums = (merchantId: string) => {
  return useQuery({
    queryKey: ['gallery-albums', merchantId],
    queryFn: async () => {
      const response = await gql<{
        galleryAlbums: gallery_album[];
      }>(`
        query GetGalleryAlbums($merchantId: ID!) {
          galleryAlbums(merchantId: $merchantId) {
            id
            merchantId
            name
            description
            coverImageUrl
            itemCount
            ref {
              id
              partition
              container
            }
            createdAt
            updatedAt
          }
        }
      `, { merchantId });
      return response.galleryAlbums;
    },
    enabled: !!merchantId,
  });
};
'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { gallery_album } from './UseGalleryAlbums';

interface CreateGalleryAlbumInput {
  merchantId: string;
  name: string;
  description?: string;
  coverImageUrl?: string;
}

interface CreateGalleryAlbumResponse {
  success: boolean;
  message: string;
  album: gallery_album | null;
}

export const useCreateGalleryAlbum = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateGalleryAlbumInput) => {
      const response = await gql<{
        createGalleryAlbum: CreateGalleryAlbumResponse;
      }>(`
        mutation CreateGalleryAlbum($input: CreateGalleryAlbumInput!) {
          createGalleryAlbum(input: $input) {
            success
            message
            album {
              id
              merchantId
              name
              description
              coverImageUrl
              itemCount
              createdAt
              updatedAt
            }
          }
        }
      `, { input });
      
      if (!response.createGalleryAlbum.success) {
        throw new Error(response.createGalleryAlbum.message);
      }
      
      return response.createGalleryAlbum.album;
    },
    onSuccess: (album, variables) => {
      // Invalidate and refetch albums
      queryClient.invalidateQueries({ 
        queryKey: ['gallery-albums', variables.merchantId] 
      });
    },
  });
};
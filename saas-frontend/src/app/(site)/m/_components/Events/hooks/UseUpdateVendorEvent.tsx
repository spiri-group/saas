import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { omit } from '@/lib/functions';
import { vendor_event_type } from '@/utils/spiriverse';

export const useUpdateVendorEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventData: any) => {
      const finalData = omit(eventData, ["landscapeImage.image.media.url"])

      const response = await gql<{
        updateVendorEvent: {
          code: string;
          success: boolean;
          message: string;
          event: vendor_event_type
        };
      }>(`
        mutation UpdateVendorEvent($event: VendorEventUpdateInput!) {
          updateVendorEvent(event: $event) {
            code
            success
            message
            event {
              id
              type
              vendorId
              listingId
              title
              startAt
              endAt
              timezone
              location {
                type
                address {
                  formattedAddress
                }
                externalUrl
              }
              visibility
              status
              tags
              description
              landscapeImage {
                image {
                  media {
                    url
                    title
                    size
                    type
                  }
                  zoom
                }
              }
              ttl
            }
          }
        }
      `, { event: finalData });
      return response.updateVendorEvent;
    },
    onSuccess: (data) => {
      // Invalidate and refetch vendor events
      queryClient.invalidateQueries({ queryKey: ['vendor-events', data.event.vendorId] });
      // Also invalidate catalogue events to show immediately on merchant page
      queryClient.invalidateQueries({ queryKey: ['catalogue-events', data.event.vendorId] });
    },
    onError: (error) => {
      console.error('Failed to update vendor event:', error);
    }
  });
};
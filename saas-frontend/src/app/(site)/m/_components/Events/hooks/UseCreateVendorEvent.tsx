import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { omit } from '@/lib/functions';
import { vendor_event_type } from '@/utils/spiriverse';

export const useCreateVendorEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventData: any) => {
      const finalData = omit(eventData, ["landscapeImage.image.media.url"])

      const response = await gql<{
        createVendorEvent: {
          code: string;
          success: boolean;
          message: string;
          event: vendor_event_type
        };
      }>(`
        mutation CreateVendorEvent($event: VendorEventInput!) {
          createVendorEvent(event: $event) {
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
                externalUrl
                address {
                  formattedAddress
                }
              }
              visibility
              status
              tags
              description
              ttl
            }
          }
        }
      `, { event: finalData });
      return response.createVendorEvent;
    },
    onSuccess: (data) => {
      // Invalidate and refetch vendor events
      queryClient.invalidateQueries({ queryKey: ['vendor-events', data.event.vendorId] });
      // Also invalidate catalogue events to show immediately on merchant page
      queryClient.invalidateQueries({ queryKey: ['catalogue-events', data.event.vendorId] });
    },
    onError: (error) => {
      console.error('Failed to create vendor event:', error);
    }
  });
};
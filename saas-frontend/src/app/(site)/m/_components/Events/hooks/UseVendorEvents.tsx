import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { vendor_event_type } from '@/utils/spiriverse';

export const useVendorEvents = (vendorId: string) => {
  return useQuery({
    queryKey: ['vendor-events', vendorId],
    queryFn: async () => {
      const response = await gql<{
        vendorEvents: vendor_event_type[];
      }>(`
        query VendorEvents($vendorId: ID!) {
          vendorEvents(vendorId: $vendorId) {
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
                },
                zoom
              }
            }
            ttl
          }
        }
      `, { vendorId });
      return response.vendorEvents;
    },
    enabled: !!vendorId,
  });
};
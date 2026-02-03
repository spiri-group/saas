import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { vendor_event_type } from '@/utils/spiriverse';

const key = 'catalogue-events';

const queryFn = async (merchantId?: string) => {
  if (!merchantId) return { nextEvent: null, upcomingEvents: [] };

  const response = await gql<{
    nextVendorEvent: vendor_event_type | null;
    vendorEvents: vendor_event_type[];
  }>(
    `query CatalogueEvents($vendorId: ID!) {
      nextVendorEvent(vendorId: $vendorId) {
        id
        title
        startAt
        endAt
        location {
          type
          address {
            formattedAddress
          }
          externalUrl
        }
        landscapeImage {
          image {
            media {
              url
            }
          }
        }
        description
        tags
      }
      vendorEvents(vendorId: $vendorId) {
        id
        title
        startAt
        endAt
        location {
          type
          address {
            formattedAddress
          }
          externalUrl
        }
        landscapeImage {
          image {
            media {
              url
            }
          }
        }
        description
        tags
      }
    }`,
    {
      vendorId: merchantId
    }
  );

  // Filter upcoming events to exclude the next event
  const upcomingEvents = response.vendorEvents?.filter(
    (event: any) => event.id !== response.nextVendorEvent?.id
  ) || [];

  return {
    nextEvent: response.nextVendorEvent,
    upcomingEvents: upcomingEvents.slice(0, 5) // Limit to 5 upcoming events
  };
};

export const useCatalogueEvents = (merchantId?: string) => {
  return useQuery({
    queryKey: [key, merchantId],
    queryFn: () => queryFn(merchantId),
    enabled: !!merchantId,
  });
};
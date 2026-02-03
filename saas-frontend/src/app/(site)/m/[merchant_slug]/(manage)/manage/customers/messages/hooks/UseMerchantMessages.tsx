import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { message_type } from '@/utils/spiriverse';

export const useMerchantMessages = (merchantId: string) => {
  return useQuery({
    queryKey: ['merchant-messages', merchantId],
    queryFn: async () => {
      const response = await gql<{
        messages: message_type[];
      }>(`
        query GetMerchantMessages($forObject: RecordRefInput!) {
          messages(forObject: $forObject) {
            id
            text
            sentAt
            respondedAt
            ref {
              id
              partition
              container
            }
            posted_by {
              ref {
                id
                partition
                container
              }
              name
            }
            posted_by_user {
              id
              firstname
              lastname
              email
            }
            posted_by_vendor {
              id
              name
            }
            reply_to {
              id
              text
              sentAt
            }
            deliver_to {
              userId
              requiresResponse
              responseCode
              datetime
              mode
            }
            media {
              url
              type
              name
              size
            }
          }
        }
      `, { 
        forObject: {
          id: merchantId,
          partition: [merchantId],
          container: "Main-Vendor"
        }
      });
      return response.messages;
    },
    enabled: !!merchantId,
  });
};
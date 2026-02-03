import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { message_type } from '@/utils/spiriverse';

export const useCustomerMessages = (customerId: string) => {
  return useQuery({
    queryKey: ['customer-messages', customerId],
    queryFn: async () => {
      // Query messages where the customer is involved
      // This could be where they are the posted_by_user or in deliver_to
      // For now, query messages for the customer as forObject
      // This might need backend changes to properly support customer message queries
      const response = await gql<{
        messages: message_type[];
      }>(`
        query GetCustomerMessages($forObject: RecordRefInput!) {
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
          id: customerId,
          partition: [customerId],
          container: "Main-User"
        }
      });
      return response.messages;
    },
    enabled: !!customerId,
  });
};
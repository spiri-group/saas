import { useMutation } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

interface CreateConversationInput {
  customerEmail: string;
  subject: string;
  message: string;
  merchantId: string;
}

export const useCreateConversation = () => {
  return useMutation({
    mutationFn: async (input: CreateConversationInput) => {
      // First, we need to find the customer by email and then create a message
      // The forObject should be the merchant (conversation topic)
      // The deliver_to should specify the customer
      // For now, create a message with the merchant as the topic
      // The deliver_to will be handled separately (we'd need to look up customer by email first)
      const response = await gql<{
        create_message: {
          code: string;
          message: string;
          chat: any;
        };
      }>(`
        mutation CreateMessageToCustomer(
          $forObject: RecordRefInput!
          $text: String!
          $vendorId: ID!
        ) {
          create_message(
            forObject: $forObject
            text: $text
            vendorId: $vendorId
          ) {
            code
            message
            chat {
              id
              text
              sentAt
            }
          }
        }
      `, {
        forObject: {
          id: input.merchantId,
          partition: [input.merchantId],
          container: "Main-Vendor"
        },
        text: `Subject: ${input.subject}\n\nTo: ${input.customerEmail}\n\n${input.message}`,
        vendorId: input.merchantId
      });
      return response.create_message;
    },
  });
};
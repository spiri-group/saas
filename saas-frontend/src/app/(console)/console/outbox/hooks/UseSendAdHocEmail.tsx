import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";
import { SentEmail } from "./UseSentEmails";

interface SendAdHocEmailInput {
  recipients: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyHtml: string;
  scheduledFor?: string;
}

const UseSendAdHocEmail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SendAdHocEmailInput) => {
      const response = await gql<{ sendAdHocEmail: SentEmail }>(
        `
        mutation SendAdHocEmail($input: SendAdHocEmailInput!) {
          sendAdHocEmail(input: $input) {
            id
            sentBy
            sentByEmail
            recipients
            subject
            emailStatus
            scheduledFor
            sentAt
            createdAt
          }
        }
      `,
        { input }
      );
      return response.sendAdHocEmail;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["console-sent-emails"] });
    },
  });
};

export default UseSendAdHocEmail;

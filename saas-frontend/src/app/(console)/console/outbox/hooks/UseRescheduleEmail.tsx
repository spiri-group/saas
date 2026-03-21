import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";
import { SentEmail } from "./UseSentEmails";

const UseRescheduleEmail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; scheduledFor: string }) => {
      const response = await gql<{ rescheduleEmail: SentEmail }>(
        `
        mutation RescheduleEmail($id: ID!, $scheduledFor: String!) {
          rescheduleEmail(id: $id, scheduledFor: $scheduledFor) {
            id
            sentBy
            sentByEmail
            recipients
            cc
            bcc
            subject
            bodyHtml
            htmlSnapshot
            emailStatus
            scheduledFor
            sentAt
            createdAt
          }
        }
      `,
        data
      );
      return response.rescheduleEmail;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["console-sent-emails"] });
    },
  });
};

export default UseRescheduleEmail;

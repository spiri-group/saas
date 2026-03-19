import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";
import { SentEmail } from "./UseSentEmails";

interface SaveEmailDraftInput {
  id?: string;
  recipients?: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  bodyHtml?: string;
}

const UseSaveEmailDraft = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveEmailDraftInput) => {
      const response = await gql<{ saveEmailDraft: SentEmail }>(
        `
        mutation SaveEmailDraft($input: SaveEmailDraftInput!) {
          saveEmailDraft(input: $input) {
            id
            sentBy
            sentByEmail
            recipients
            cc
            bcc
            subject
            bodyHtml
            emailStatus
            createdAt
          }
        }
      `,
        { input }
      );
      return response.saveEmailDraft;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["console-sent-emails"] });
    },
  });
};

export default UseSaveEmailDraft;

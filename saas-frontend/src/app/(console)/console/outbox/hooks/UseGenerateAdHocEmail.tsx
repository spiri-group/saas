import { useMutation } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";

interface AiMessageInput {
  role: string;
  content: string;
}

interface GeneratedEmail {
  subject: string;
  bodyHtml: string;
}

const UseGenerateAdHocEmail = () => {
  return useMutation({
    mutationFn: async (messages: AiMessageInput[]) => {
      const response = await gql<{ generateAdHocEmail: GeneratedEmail }>(
        `
        query GenerateAdHocEmail($messages: [AiMessageInput!]!) {
          generateAdHocEmail(messages: $messages) {
            subject
            bodyHtml
          }
        }
      `,
        { messages }
      );
      return response.generateAdHocEmail;
    },
  });
};

export default UseGenerateAdHocEmail;

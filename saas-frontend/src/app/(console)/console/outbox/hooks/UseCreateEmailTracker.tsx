import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";

interface CreateEmailTrackerInput {
  recipients: string[];
  subject: string;
}

interface EmailTrackerResult {
  email: {
    id: string;
    sentByEmail: string;
    recipients: string[];
    subject: string;
    emailStatus: string;
    createdAt: string;
  };
  trackingPixelUrl: string;
}

const UseCreateEmailTracker = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateEmailTrackerInput) => {
      const response = await gql<{ createEmailTracker: EmailTrackerResult }>(
        `
        mutation CreateEmailTracker($input: CreateEmailTrackerInput!) {
          createEmailTracker(input: $input) {
            email {
              id
              sentByEmail
              recipients
              subject
              emailStatus
              createdAt
            }
            trackingPixelUrl
          }
        }
      `,
        { input }
      );
      return response.createEmailTracker;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["console-sent-emails"] });
    },
  });
};

export default UseCreateEmailTracker;

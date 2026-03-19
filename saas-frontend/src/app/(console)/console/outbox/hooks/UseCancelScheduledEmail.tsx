import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";

const UseCancelScheduledEmail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await gql<{ cancelScheduledEmail: boolean }>(
        `
        mutation CancelScheduledEmail($id: ID!) {
          cancelScheduledEmail(id: $id)
        }
      `,
        { id }
      );
      return response.cancelScheduledEmail;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["console-sent-emails"] });
    },
  });
};

export default UseCancelScheduledEmail;

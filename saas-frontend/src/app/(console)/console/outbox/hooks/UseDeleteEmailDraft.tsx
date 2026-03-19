import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";

const UseDeleteEmailDraft = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await gql<{ deleteEmailDraft: boolean }>(
        `
        mutation DeleteEmailDraft($id: ID!) {
          deleteEmailDraft(id: $id)
        }
      `,
        { id }
      );
      return response.deleteEmailDraft;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["console-sent-emails"] });
    },
  });
};

export default UseDeleteEmailDraft;

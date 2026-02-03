import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";

const UseDeleteEmailTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await gql<{
        deleteEmailTemplate: boolean;
      }>(`
        mutation DeleteEmailTemplate($id: ID!) {
          deleteEmailTemplate(id: $id)
        }
      `, { id });
      return response.deleteEmailTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
    },
  });
};

export default UseDeleteEmailTemplate;

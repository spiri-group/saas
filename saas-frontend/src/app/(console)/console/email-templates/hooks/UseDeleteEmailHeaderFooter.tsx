import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";

const UseDeleteEmailHeaderFooter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await gql<{
        deleteEmailHeaderFooter: boolean;
      }>(`
        mutation DeleteEmailHeaderFooter($id: ID!) {
          deleteEmailHeaderFooter(id: $id)
        }
      `, { id });
      return response.deleteEmailHeaderFooter;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-headers-footers'] });
    },
  });
};

export default UseDeleteEmailHeaderFooter;

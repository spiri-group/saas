import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";

const UseDeleteEmailAsset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assetName: string) => {
      const response = await gql<{
        deleteEmailAsset: boolean;
      }>(`
        mutation DeleteEmailAsset($name: String!) {
          deleteEmailAsset(name: $name)
        }
      `, { name: assetName });
      return response.deleteEmailAsset;
    },
    onSuccess: () => {
      // Invalidate any cached email assets queries
      queryClient.invalidateQueries({ queryKey: ['email-assets'] });
    },
  });
};

export default UseDeleteEmailAsset;

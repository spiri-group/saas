import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";
import { recordref_type } from "@/utils/spiriverse";

const UseDeleteCategory = (configRef: recordref_type, onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await gql<{ deleteCategory: boolean }>(`
        mutation DeleteCategory($id: ID!, $configId: ID!) {
          deleteCategory(id: $id, configId: $configId)
        }
      `, {
        id,
        configId: configRef.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['choice-root-nodes', configRef] });
      onSuccess?.();
    },
  });
};

export default UseDeleteCategory;
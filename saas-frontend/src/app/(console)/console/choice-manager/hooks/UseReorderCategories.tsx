import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";
import { choice_node_type, recordref_type } from "@/utils/spiriverse";

interface ReorderUpdate {
  id: string;
  sortOrder: number;
}

interface ReorderCategoriesInput {
  configId: string;
  updates: ReorderUpdate[];
}

const UseReorderCategories = (configRef: recordref_type, onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ReorderCategoriesInput) => {
      // Execute multiple updateCategory mutations in sequence
      const results: choice_node_type[] = [];
      for (const update of input.updates) {
        const response = await gql<{ updateCategory: choice_node_type }>(`
          mutation UpdateCategory($id: ID!, $input: UpdateCategoryInput!, $configId: ID!) {
            updateCategory(id: $id, input: $input, configId: $configId) {
              id
              sortOrder
              updatedAt
            }
          }
        `, { 
          id: update.id, 
          input: { sortOrder: update.sortOrder }, 
          configId: input.configId 
        });
        results.push(response.updateCategory);
      }
      return results;
    },
    onSuccess: () => {
      // Invalidate the choice tree to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ['choice-root-nodes', configRef] });
      onSuccess?.();
    },
  });
};

export default UseReorderCategories;
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";
import { choice_node_type, recordref_type, node_metadata_type } from "@/utils/spiriverse";

interface UpdateCategoryInput {
  defaultLabel?: string;
  icon?: string;
  sortOrder?: number;
  metadata?: node_metadata_type;
}

const UseUpdateCategory = (configRef: recordref_type, onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateCategoryInput }) => {
      const response = await gql<{ updateCategory: choice_node_type }>(`
        mutation UpdateCategory($id: ID!, $input: UpdateCategoryInput!, $configId: ID!) {
          updateCategory(id: $id, input: $input, configId: $configId) {
            id
            configId
            type
            label
            localizations {
              locale
              label
              slug
            }
            parentRef {
              id
              container
              partition
            }
            sortOrder
            ancestors
            path
            icon
            level
            childIds
            status
            metadata
            createdAt
            updatedAt
          }
        }
      `, { id, input, configId: configRef.id });
      return response.updateCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['choice-root-nodes', configRef] });
      onSuccess?.();
    },
  });
};

export default UseUpdateCategory;
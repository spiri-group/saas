import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";
import { choice_node_type, recordref_type, node_metadata_type } from "@/utils/spiriverse";

interface CategoryPlacement {
  type: 'AT_START' | 'BEFORE' | 'AFTER' | 'AT_END';
  referenceNodeId?: string;
}

interface CreateCategoryInput {
  configRef: recordref_type;
  defaultLabel: string;
  parentRef?: recordref_type;
  icon?: string;
  sortOrder?: number;
  metadata?: node_metadata_type;
  placement?: CategoryPlacement;
}

const UseCreateCategory = (configRef: recordref_type, onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<CreateCategoryInput, 'configRef'>) => {
      const response = await gql<{ createCategory: choice_node_type }>(`
        mutation CreateCategory($input: CreateCategoryInput!) {
          createCategory(input: $input) {
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
            children {
              id
              label
              level
            }
            createdAt
            updatedAt
          }
        }
      `, { input: { ...input, configRef } });
      return response.createCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['choice-root-nodes', configRef] });
      onSuccess?.();
    },
  });
};

export default UseCreateCategory;
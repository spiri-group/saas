import { gql } from "@/lib/services/gql";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { choice_config_type } from "@/utils/spiriverse";

interface CreateChoiceConfigInput {
  id: string; // The backing identifier (e.g., "category", "product-types")
  label: string;
  kind: 'FLAT' | 'HIERARCHICAL';
}

const UseCreateChoiceConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateChoiceConfigInput) => {
      const response = await gql<{
        upsertChoiceConfig: choice_config_type;
      }>(`
        mutation UpsertChoiceConfig($input: UpsertChoiceConfigInput!) {
          upsertChoiceConfig(input: $input) {
            ref {
              id
              container
              partition
            }
            kind
            label
            createdAt
            updatedAt
          }
        }
      `, {
        input: {
          id: input.id,
          kind: input.kind,
          label: input.label
        }
      });
      return response.upsertChoiceConfig;
    },
    onSuccess: (newConfig) => {
      // Update the choice configs cache
      queryClient.setQueryData(['choice-configs'], (old: choice_config_type[] | undefined) => {
        return [...(old ?? []), newConfig];
      });
    }
  });
};

export default UseCreateChoiceConfig;
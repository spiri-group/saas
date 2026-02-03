import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";
import { choice_config_type, metadata_schema_type } from "@/utils/spiriverse";

const UseUpdateMetadataSchema = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ configId, metadataSchema }: { configId: string; metadataSchema: metadata_schema_type }) => {
      const response = await gql<{ updateMetadataSchema: choice_config_type }>(`
        mutation UpdateMetadataSchema($configId: ID!, $metadataSchema: MetadataSchemaInput!) {
          updateMetadataSchema(configId: $configId, metadataSchema: $metadataSchema) {
            id
            kind
            label
            metadataSchema {
              fields {
                id
                name
                type
                required
              }
            }
            ref {
              id
              partition
              container
            }
            createdAt
            updatedAt
          }
        }
      `, { configId, metadataSchema });
      return response.updateMetadataSchema;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['choice-configs'] });
      onSuccess?.();
    },
  });
};

export default UseUpdateMetadataSchema;
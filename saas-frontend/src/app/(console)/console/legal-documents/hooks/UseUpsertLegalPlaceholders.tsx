import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";

const UseUpsertLegalPlaceholders = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (placeholders: Record<string, string>) => {
      const response = await gql<{
        upsertLegalPlaceholders: {
          id: string;
          placeholders: Record<string, string>;
        };
      }>(`
        mutation UpsertLegalPlaceholders($placeholders: JSON!) {
          upsertLegalPlaceholders(placeholders: $placeholders) {
            id
            placeholders
          }
        }
      `, { placeholders });
      return response.upsertLegalPlaceholders;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-placeholders'] });
    },
  });
};

export default UseUpsertLegalPlaceholders;

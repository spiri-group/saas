import { useQuery } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";

const UseLegalPlaceholders = () => {
  return useQuery({
    queryKey: ['legal-placeholders'],
    queryFn: async () => {
      const response = await gql<{
        legalPlaceholders: {
          id: string;
          placeholders: Record<string, string>;
        } | null;
      }>(`
        query GetLegalPlaceholders {
          legalPlaceholders {
            id
            placeholders
          }
        }
      `);
      return response.legalPlaceholders?.placeholders ?? {};
    },
  });
};

export default UseLegalPlaceholders;

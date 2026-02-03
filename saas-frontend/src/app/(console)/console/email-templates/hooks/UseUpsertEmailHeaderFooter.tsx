import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";
import { EmailHeaderFooterInput, EmailHeaderFooter } from "../types";

const UseUpsertEmailHeaderFooter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: EmailHeaderFooterInput) => {
      const response = await gql<{
        upsertEmailHeaderFooter: EmailHeaderFooter;
      }>(`
        mutation UpsertEmailHeaderFooter($input: EmailHeaderFooterInput!) {
          upsertEmailHeaderFooter(input: $input) {
            id
            name
            type
            content
            description
            isDefault
            isActive
            createdAt
            updatedAt
            updatedBy
          }
        }
      `, { input });
      return response.upsertEmailHeaderFooter;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-headers-footers'] });
    },
  });
};

export default UseUpsertEmailHeaderFooter;

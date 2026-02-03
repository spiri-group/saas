import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";
import { EmailTemplate, EmailTemplateInput } from "../types";

const UseUpsertEmailTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: EmailTemplateInput) => {
      const response = await gql<{
        upsertEmailTemplate: EmailTemplate;
      }>(`
        mutation UpsertEmailTemplate($input: EmailTemplateInput!) {
          upsertEmailTemplate(input: $input) {
            id
            name
            subject
            html
            variables
            category
            description
            isActive
            headerId
            footerId
            createdAt
            updatedAt
            updatedBy
          }
        }
      `, { input });
      return response.upsertEmailTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
    },
  });
};

export default UseUpsertEmailTemplate;

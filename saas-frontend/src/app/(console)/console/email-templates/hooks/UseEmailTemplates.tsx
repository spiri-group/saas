import { useQuery } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";
import { EmailTemplate } from "../types";

const UseEmailTemplates = (category?: string) => {
  return useQuery({
    queryKey: ['email-templates', category],
    queryFn: async () => {
      const response = await gql<{
        emailTemplates: EmailTemplate[];
      }>(`
        query GetEmailTemplates($category: String) {
          emailTemplates(category: $category) {
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
      `, { category });
      return response.emailTemplates;
    },
  });
};

export default UseEmailTemplates;

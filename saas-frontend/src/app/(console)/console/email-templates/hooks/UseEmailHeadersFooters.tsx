import { useQuery } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";
import { EmailHeaderFooter } from "../types";

const UseEmailHeadersFooters = (type?: "header" | "footer") => {
  return useQuery({
    queryKey: ['email-headers-footers', type],
    queryFn: async () => {
      const response = await gql<{
        emailHeadersFooters: EmailHeaderFooter[];
      }>(`
        query GetEmailHeadersFooters($type: String) {
          emailHeadersFooters(type: $type) {
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
      `, { type });
      return response.emailHeadersFooters;
    },
  });
};

export default UseEmailHeadersFooters;

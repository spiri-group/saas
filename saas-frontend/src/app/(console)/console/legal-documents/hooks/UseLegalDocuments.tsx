import { useQuery } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";
import { LegalDocument } from "../types";

const UseLegalDocuments = (market?: string, documentType?: string) => {
  return useQuery({
    queryKey: ['legal-documents', market, documentType],
    queryFn: async () => {
      const response = await gql<{
        legalDocuments: LegalDocument[];
      }>(`
        query GetLegalDocuments($market: String, $documentType: String) {
          legalDocuments(market: $market, documentType: $documentType) {
            id
            documentType
            title
            content
            market
            version
            isPublished
            effectiveDate
            changeSummary
            createdAt
            updatedAt
            updatedBy
          }
        }
      `, { market, documentType });
      return response.legalDocuments;
    },
  });
};

export default UseLegalDocuments;

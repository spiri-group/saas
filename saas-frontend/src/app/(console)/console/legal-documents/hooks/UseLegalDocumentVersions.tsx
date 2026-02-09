import { useQuery } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";
import { LegalDocumentVersion } from "../types";

const UseLegalDocumentVersions = (documentId?: string) => {
  return useQuery({
    queryKey: ['legal-document-versions', documentId],
    queryFn: async () => {
      const response = await gql<{
        legalDocumentVersions: LegalDocumentVersion[];
      }>(`
        query GetLegalDocumentVersions($documentId: ID!) {
          legalDocumentVersions(documentId: $documentId) {
            id
            documentId
            version
            title
            content
            market
            isPublished
            effectiveDate
            changeSummary
            createdAt
            supersededAt
            supersededBy
          }
        }
      `, { documentId });
      return response.legalDocumentVersions;
    },
    enabled: !!documentId,
  });
};

export default UseLegalDocumentVersions;

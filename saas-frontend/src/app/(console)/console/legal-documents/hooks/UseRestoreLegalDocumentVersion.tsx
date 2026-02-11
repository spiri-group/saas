import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";
import { LegalDocument } from "../types";

const UseRestoreLegalDocumentVersion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, versionId }: { documentId: string; versionId: string }) => {
      const response = await gql<{
        restoreLegalDocumentVersion: LegalDocument;
      }>(`
        mutation RestoreLegalDocumentVersion($documentId: ID!, $versionId: ID!) {
          restoreLegalDocumentVersion(documentId: $documentId, versionId: $versionId) {
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
            placeholders
          }
        }
      `, { documentId, versionId });
      return response.restoreLegalDocumentVersion;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['legal-documents'] });
      queryClient.invalidateQueries({ queryKey: ['legal-document-versions', variables.documentId] });
    },
  });
};

export default UseRestoreLegalDocumentVersion;

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";
import { LegalDocument, LegalDocumentInput } from "../types";

const UseUpsertLegalDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: LegalDocumentInput) => {
      const response = await gql<{
        upsertLegalDocument: LegalDocument;
      }>(`
        mutation UpsertLegalDocument($input: LegalDocumentInput!) {
          upsertLegalDocument(input: $input) {
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
            parentDocumentId
            supplementOrder
          }
        }
      `, { input });
      return response.upsertLegalDocument;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['legal-documents'] });
      queryClient.invalidateQueries({ queryKey: ['legal-document-versions', variables.id] });
    },
  });
};

export default UseUpsertLegalDocument;

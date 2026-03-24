import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";

export interface TermsDocument {
  id: string;
  vendorId: string;
  title: string;
  content: string;
  isDefault: boolean;
  createdDate?: string;
  updatedDate?: string;
}

export const useTermsAndConditions = (vendorId: string) => {
  return useQuery({
    queryKey: ["terms-and-conditions", vendorId],
    queryFn: async () => {
      const response = await gql<{ termsAndConditions: TermsDocument[] }>(
        `
        query GetTermsAndConditions($merchantId: ID!) {
          termsAndConditions(merchantId: $merchantId) {
            id
            vendorId
            title
            content
            isDefault
            createdDate
            updatedDate
          }
        }
      `,
        { merchantId: vendorId }
      );
      return response.termsAndConditions;
    },
    enabled: !!vendorId,
  });
};

export const useUpsertTerms = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      merchantId,
      documents,
    }: {
      merchantId: string;
      documents: { id: string; title: string; content: string; isDefault?: boolean }[];
    }) => {
      const response = await gql<{
        upsert_terms_and_conditions: { success: boolean; documents: TermsDocument[] };
      }>(
        `
        mutation UpsertTermsAndConditions($merchantId: ID!, $documents: [TermsAndConditionsInput]!) {
          upsert_terms_and_conditions(merchantId: $merchantId, documents: $documents) {
            success
            message
            documents {
              id
              vendorId
              title
              content
              isDefault
              createdDate
              updatedDate
            }
          }
        }
      `,
        { merchantId, documents }
      );
      return response.upsert_terms_and_conditions;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["terms-and-conditions", variables.merchantId] });
    },
  });
};

export const useDeleteTerms = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      merchantId,
      documentId,
    }: {
      merchantId: string;
      documentId: string;
    }) => {
      const response = await gql<{
        delete_terms_and_conditions: { success: boolean; message: string };
      }>(
        `
        mutation DeleteTermsAndConditions($merchantId: ID!, $documentId: ID!) {
          delete_terms_and_conditions(merchantId: $merchantId, documentId: $documentId) {
            success
            message
          }
        }
      `,
        { merchantId, documentId }
      );
      return response.delete_terms_and_conditions;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["terms-and-conditions", variables.merchantId] });
    },
  });
};

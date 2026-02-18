import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export type OutstandingConsent = {
  documentType: string;
  documentId: string;
  title: string;
  content: string;
  version: number;
  effectiveDate: string;
  placeholders?: Record<string, string>;
  supplementContent?: string;
  supplementDocumentId?: string;
  supplementVersion?: number;
  supplementTitle?: string;
};

const useCheckOutstandingConsents = (scope: string, enabled: boolean, market?: string | null) => {
  return useQuery({
    queryKey: ['outstanding-consents', scope, market],
    queryFn: async () => {
      const response = await gql<{
        checkOutstandingConsents: OutstandingConsent[];
      }>(`
        query CheckOutstandingConsents($scope: String!, $market: String) {
          checkOutstandingConsents(scope: $scope, market: $market) {
            documentType
            documentId
            title
            content
            version
            effectiveDate
            placeholders
            supplementContent
            supplementDocumentId
            supplementVersion
            supplementTitle
          }
        }
      `, { scope, market: market || undefined });
      return response.checkOutstandingConsents;
    },
    enabled,
  });
};

export default useCheckOutstandingConsents;

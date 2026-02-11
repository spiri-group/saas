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
};

const useCheckOutstandingConsents = (scope: string, enabled: boolean) => {
  return useQuery({
    queryKey: ['outstanding-consents', scope],
    queryFn: async () => {
      const response = await gql<{
        checkOutstandingConsents: OutstandingConsent[];
      }>(`
        query CheckOutstandingConsents($scope: String!) {
          checkOutstandingConsents(scope: $scope) {
            documentType
            documentId
            title
            content
            version
            effectiveDate
            placeholders
          }
        }
      `, { scope });
      return response.checkOutstandingConsents;
    },
    enabled,
  });
};

export default useCheckOutstandingConsents;

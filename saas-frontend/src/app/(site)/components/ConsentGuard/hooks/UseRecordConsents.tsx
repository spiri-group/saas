import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

type RecordConsentInput = {
  documentType: string;
  documentId: string;
  version: number;
  consentContext: string;
  documentTitle: string;
  supplementDocumentId?: string;
  supplementVersion?: number;
};

const useRecordConsents = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inputs: RecordConsentInput[]) => {
      const response = await gql<{
        recordConsents: boolean;
      }>(`
        mutation RecordConsents($inputs: [RecordConsentInput!]!) {
          recordConsents(inputs: $inputs)
        }
      `, { inputs });
      return response.recordConsents;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outstanding-consents'] });
    },
  });
};

export default useRecordConsents;

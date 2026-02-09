import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";

const UseDeleteLegalDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await gql<{
        deleteLegalDocument: boolean;
      }>(`
        mutation DeleteLegalDocument($id: ID!) {
          deleteLegalDocument(id: $id)
        }
      `, { id });
      return response.deleteLegalDocument;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-documents'] });
    },
  });
};

export default UseDeleteLegalDocument;

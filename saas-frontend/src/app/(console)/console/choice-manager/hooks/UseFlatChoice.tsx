import { useQuery } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";
import { choice_type } from "@/utils/spiriverse";

interface FlatChoiceResponse {
  flatChoice: choice_type;
}

const UseFlatChoice = (configId: string) => {
  return useQuery({
    queryKey: ['flat-choice', configId],
    queryFn: async () => {
      const response = await gql<FlatChoiceResponse>(`
        query GetFlatChoice($field: String!) {
          flatChoice(field: $field) {
            id
            options {
              id
              defaultLabel
              localizations {
                locale
                value
              }
              status
            }
          }
        }
      `, { field: configId });
      return response.flatChoice;
    },
  });
};

export default UseFlatChoice;
import { useQuery } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";
import { choice_config_type } from "@/utils/spiriverse";

interface ChoiceConfigsResponse {
  choiceConfigs: choice_config_type[];
}

const UseChoiceConfigs = () => {
  return useQuery({
    queryKey: ['choice-configs'],
    queryFn: async () => {
      const response = await gql<ChoiceConfigsResponse>(`
        query GetChoiceConfigs {
          choiceConfigs {
            id
            kind
            label
            createdAt
            updatedAt
            metadataSchema {
              fields {
                id
                name
                type
                required
              }
            }
            ref {
              id
              partition
              container
            }
          }
        }
      `);
      return response.choiceConfigs;
    },
  });
};

export default UseChoiceConfigs;
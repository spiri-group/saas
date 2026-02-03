import { useQuery } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";

export interface ReligionNode {
  id: string;
  label: string;
  children?: ReligionNode[];
}

interface ReligionTreeResponse {
  religions: ReligionNode[];
}

const UseReligionTree = () => {
  return useQuery({
    queryKey: ['religion-tree'],
    queryFn: async () => {
      const response = await gql<ReligionTreeResponse>(`
        query GetReligions {
          religions(defaultLocale: "EN") {
            id
            label
            children {
              id
              label
              children {
                id
                label
                children {
                  id
                  label
                }
              }
            }
          }
        }
      `);
      return response.religions;
    },
  });
};

export default UseReligionTree;

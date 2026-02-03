import { useQuery } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";
import { recordref_type, choice_node_type } from "@/utils/spiriverse";

interface ChoiceRootNodesResponse {
  choiceRootNodes: choice_node_type[];
}

const UseChoiceRootNodes = (node_ref: recordref_type) => {
  return useQuery<choice_node_type[] | null>({
    queryKey: ['choice-root-nodes', node_ref],
    queryFn: async () => {
      const response = await gql<ChoiceRootNodesResponse>(`
        query GetChoiceRootNodes($node_ref: RecordRefInput!) {
          choiceRootNodes(ref: $node_ref) {
            id
            label
            level
            sortOrder
            metadata
            ref {
              id
              container
              partition
            }
            children {
              id
              label
              level
              sortOrder
              metadata
              parentRef {
                id
                container
                partition
              }
              ref {
                id
                container
                partition
              }
              children {
                id
                label
                level
                sortOrder
                metadata
                parentRef {
                  id
                  container
                  partition
                }
                ref {
                  id
                  container
                  partition
                }
                children {
                  id
                  label
                  level
                  metadata
                  parentRef {
                    id
                    container
                    partition
                  }
                  ref {
                    id
                    container
                    partition
                  }
                }
              }
            }
          }
        }
      `, { node_ref });

      // Return the root nodes directly - let the component handle multiple roots
      const rootNodes = response.choiceRootNodes;

      if (rootNodes.length === 0) return null;

      // Return all root nodes directly without a virtual container
      return rootNodes;
    },
  });
};

export default UseChoiceRootNodes;
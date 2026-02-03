import { useQuery } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";
import { FeesData } from "../FeesManager";

const UseFees = () => {
  return useQuery({
    queryKey: ['fees-config'],
    queryFn: async () => {
      const response = await gql<{
        feeSetting: FeesData;
      }>(`
        query GetFeeSetting {
          feeSetting
        }
      `);
      return response.feeSetting;
    },
  });
};

export default UseFees;
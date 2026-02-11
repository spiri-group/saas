import { useQuery } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";
import { FeesData } from "../FeesManager";

const UseFees = (market: string = 'AU') => {
  return useQuery({
    queryKey: ['fees-config', market],
    queryFn: async () => {
      const response = await gql<{
        feeSetting: FeesData;
      }>(`
        query GetFeeSetting($market: String) {
          feeSetting(market: $market)
        }
      `, { market });
      return response.feeSetting;
    },
  });
};

export default UseFees;

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";
import { FeeConfig } from "../FeesManager";
import { toast } from "sonner";

interface UpdateFeeInput {
  market: string;
  key: string;
  config: FeeConfig;
}

const UseUpdateFees = () => {
  const queryClient = useQueryClient();

  const updateFee = useMutation({
    mutationFn: async (input: UpdateFeeInput) => {
      const response = await gql<{
        updateFeeConfig: boolean;
      }>(`
        mutation UpdateFeeConfig($market: String!, $key: String!, $percent: Float!, $fixed: Float!, $currency: String!, $basePrice: Float) {
          updateFeeConfig(market: $market, key: $key, percent: $percent, fixed: $fixed, currency: $currency, basePrice: $basePrice)
        }
      `, {
        market: input.market,
        key: input.key,
        percent: input.config.percent,
        fixed: input.config.fixed,
        currency: input.config.currency,
        basePrice: input.config.basePrice ?? null
      });
      return response.updateFeeConfig;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['fees-config', variables.market] });
      toast.success('Fee configuration updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update fee configuration');
      console.error('Update fee error:', error);
    }
  });

  return {
    updateFee
  };
};

export default UseUpdateFees;

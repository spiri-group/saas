import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";
import { FeeConfig } from "../FeesManager";
import { toast } from "sonner";

interface UpdateFeeInput {
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
        mutation UpdateFeeConfig($key: String!, $percent: Float!, $fixed: Float!, $currency: String!) {
          updateFeeConfig(key: $key, percent: $percent, fixed: $fixed, currency: $currency)
        }
      `, {
        key: input.key,
        percent: input.config.percent,
        fixed: input.config.fixed,
        currency: input.config.currency
      });
      return response.updateFeeConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees-config'] });
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

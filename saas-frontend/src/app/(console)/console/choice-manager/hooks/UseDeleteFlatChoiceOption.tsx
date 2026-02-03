import { gql } from "@/lib/services/gql";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface DeleteFlatChoiceOptionInput {
  choiceId: string;
  optionId: string;
}

const UseDeleteFlatChoiceOption = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DeleteFlatChoiceOptionInput) => {
      const response = await gql<{
        deleteFlatChoiceOption: boolean;
      }>(`
        mutation DeleteFlatChoiceOption($choiceId: String!, $optionId: String!) {
          deleteFlatChoiceOption(choiceId: $choiceId, optionId: $optionId)
        }
      `, {
        choiceId: input.choiceId,
        optionId: input.optionId
      });
      return response.deleteFlatChoiceOption;
    },
    onSuccess: () => {
      // Update any relevant caches
      queryClient.invalidateQueries({ queryKey: ['flat-choice'] });
    }
  });
};

export default UseDeleteFlatChoiceOption;
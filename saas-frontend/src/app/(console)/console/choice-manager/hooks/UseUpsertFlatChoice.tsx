import { gql } from "@/lib/services/gql";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { choice_option_type } from "@/utils/spiriverse";

interface UpsertFlatChoiceOptionInput {
  choiceId: string;
  option: choice_option_type;
}

const UseUpsertFlatChoiceOption = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpsertFlatChoiceOptionInput) => {
      const response = await gql<{
        upsertFlatChoiceOption: choice_option_type;
      }>(`
        mutation UpsertFlatChoiceOption($input: UpsertFlatChoiceOptionInput!) {
          upsertFlatChoiceOption(input: $input) {
            id
            defaultLabel
            localizations {
              locale
              value
            }
            status
          }
        }
      `, {
        input: {
          choiceId: input.choiceId,
          option: {
            id: input.option.id,
            status: input.option.status,
            localizations: input.option.localizations
          }
        }
      });
      return response.upsertFlatChoiceOption;
    },
    onSuccess: (data, variables) => {
      // Invalidate the specific flat choice query
      queryClient.invalidateQueries({ queryKey: ['flat-choice', variables.choiceId] });
      // Also invalidate all flat choice queries as a fallback
      queryClient.invalidateQueries({ queryKey: ['flat-choice'] });
    }
  });
};

export default UseUpsertFlatChoiceOption;
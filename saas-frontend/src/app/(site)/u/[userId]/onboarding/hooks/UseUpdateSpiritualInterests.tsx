'use client';

import { gql } from "@/lib/services/gql";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SpiritualInterest } from "../types";

interface UpdateSpiritualInterestsInput {
  primarySpiritualInterest: SpiritualInterest;
  secondarySpiritualInterests: SpiritualInterest[];
}

interface UpdateSpiritualInterestsResponse {
  update_user: {
    success: boolean;
    customer: {
      id: string;
      primarySpiritualInterest: SpiritualInterest | null;
      secondarySpiritualInterests: SpiritualInterest[] | null;
    };
  };
}

const UseUpdateSpiritualInterests = (userId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: UpdateSpiritualInterestsInput) => {
      const resp = await gql<UpdateSpiritualInterestsResponse>(
        `mutation UpdateSpiritualInterests($customer: CustomerUpdateInput!) {
          update_user(customer: $customer) {
            success
            customer {
              id
              primarySpiritualInterest
              secondarySpiritualInterests
            }
          }
        }`,
        {
          customer: {
            id: userId,
            primarySpiritualInterest: values.primarySpiritualInterest,
            secondarySpiritualInterests: values.secondarySpiritualInterests
          }
        }
      );
      return resp.update_user;
    },
    onSuccess: () => {
      // Invalidate user profile cache to reflect the updated interests
      queryClient.invalidateQueries({
        queryKey: ['user-profile', userId]
      });
    }
  });
};

export default UseUpdateSpiritualInterests;

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

type ProfileVisibilitySettings = {
  contactInformation: boolean;
  locations: boolean;
  teamMembers: boolean;
  sections: boolean;
};


export const useProfileVisibility = (merchantId: string) => {
  return useQuery({
    queryKey: ['profileVisibility', merchantId],
    queryFn: async () => {
      const response = await gql<{
        vendor: {
          profileVisibility: ProfileVisibilitySettings;
        };
      }>(`
        query GetProfileVisibility($id: String!) {
          vendor(id: $id) {
            profileVisibility {
              contactInformation
              locations
              teamMembers
              sections
            }
          }
        }
      `, { id: merchantId });
      return response.vendor.profileVisibility;
    },
    enabled: !!merchantId,
  });
};

export const useUpdateProfileVisibility = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      merchantId, 
      visibility 
    }: { 
      merchantId: string; 
      visibility: ProfileVisibilitySettings;
    }) => {
      const response = await gql<{
        update_profile_visibility: {
          success: boolean;
          vendor: {
            profileVisibility: ProfileVisibilitySettings;
          };
        };
      }>(`
        mutation UpdateProfileVisibility($merchantId: ID!, $visibility: ProfileVisibilityInput!) {
          update_profile_visibility(merchantId: $merchantId, visibility: $visibility) {
            success
            vendor {
              profileVisibility {
                contactInformation
                locations
                teamMembers
                sections
              }
            }
          }
        }
      `, { merchantId, visibility });
      return response.update_profile_visibility;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['profileVisibility', variables.merchantId], data.vendor.profileVisibility);
      queryClient.invalidateQueries({ queryKey: ['vendor', variables.merchantId] });
    },
  });
};


import { gql } from '@/lib/services/gql';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const useDeletePractitionerVideoUpdate = (practitionerId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (videoUpdateId: string) => {
            const response = await gql<{
                delete_vendor_video_update: {
                    success: boolean;
                    message: string;
                };
            }>(
                `
                mutation DeleteVendorVideoUpdate($vendorId: ID!, $videoUpdateId: ID!) {
                    delete_vendor_video_update(vendorId: $vendorId, videoUpdateId: $videoUpdateId) {
                        code
                        success
                        message
                    }
                }
            `,
                {
                    vendorId: practitionerId,
                    videoUpdateId
                }
            );

            return response.delete_vendor_video_update;
        },
        onSuccess: (_data, videoUpdateId) => {
            // Remove deleted video from cache before invalidating to avoid flash of missing profile data
            queryClient.setQueryData(['practitioner-profile', practitionerId], (oldData: any) => {
                if (!oldData?.videoUpdates) return oldData;
                return {
                    ...oldData,
                    videoUpdates: oldData.videoUpdates.filter((v: any) => v.id !== videoUpdateId),
                };
            });
            queryClient.invalidateQueries({ queryKey: ['practitioner-profile', practitionerId] });
            queryClient.invalidateQueries({ queryKey: ['my-feed'] });
        }
    });
};

export default useDeletePractitionerVideoUpdate;

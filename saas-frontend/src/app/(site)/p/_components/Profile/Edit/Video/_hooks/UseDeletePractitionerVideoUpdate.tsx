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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['practitioner-profile', practitionerId] });
            queryClient.invalidateQueries({ queryKey: ['my-feed'] });
        }
    });
};

export default useDeletePractitionerVideoUpdate;

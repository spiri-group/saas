import { gql } from '@/lib/services/gql';
import { useForm } from 'react-hook-form';
import { media_type, vendor_type } from '@/utils/spiriverse';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { omit } from '@/lib/functions';

export type UpdatePractitionerVideoFormSchema = {
    id: string;
    latestVideo?: media_type;
    coverPhoto?: media_type;
};

const useEditPractitionerVideo = (practitionerId: string) => {
    const queryClient = useQueryClient();

    const form = useForm<UpdatePractitionerVideoFormSchema>({
        defaultValues: {
            id: practitionerId,
            latestVideo: undefined,
            coverPhoto: undefined
        }
    });

    const mutation = useMutation({
        mutationFn: async (values: UpdatePractitionerVideoFormSchema) => {
            if (!values.latestVideo) {
                throw new Error('No video provided');
            }

            const response = await gql<{
                post_vendor_video_update: {
                    vendor: vendor_type;
                };
            }>(
                `
                mutation post_practitioner_video_update($vendorId: ID!, $videoUpdate: VideoUpdateInput!) {
                    post_vendor_video_update(vendorId: $vendorId, videoUpdate: $videoUpdate) {
                        code
                        success
                        message
                        vendor {
                            id
                            videoUpdates {
                                id
                                media {
                                    name
                                    url
                                    type
                                }
                                coverPhoto {
                                    name
                                    url
                                    type
                                }
                                caption
                                postedAt
                            }
                        }
                    }
                }
            `,
                {
                    vendorId: values.id,
                    videoUpdate: {
                        media: omit(values.latestVideo, ["url", "coverPhoto", "title", "description", "hashtags"]),
                        coverPhoto: values.coverPhoto ? omit(values.coverPhoto, ["url"]) : undefined,
                        caption: values.latestVideo.description || null
                    }
                }
            );

            return response.post_vendor_video_update.vendor;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['practitioner-profile', practitionerId] });
            queryClient.invalidateQueries({ queryKey: ['my-feed'] });
            // Reset form after successful upload
            form.reset({
                id: practitionerId,
                latestVideo: undefined,
                coverPhoto: undefined
            });
        }
    });

    return {
        form,
        mutation,
        hasLoaded: true
    };
};

export default useEditPractitionerVideo;

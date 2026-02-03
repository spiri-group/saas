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

            // Use the same mutation as merchants since both are stored as Vendors
            const response = await gql<{
                update_merchant_video: {
                    vendor: vendor_type;
                };
            }>(
                `
                mutation update_practitioner_video($practitionerId: ID!, $video: VideoInput) {
                    update_merchant_video(merchantId: $practitionerId, video: $video) {
                        code
                        success
                        message
                        vendor {
                            id
                            videos {
                                media {
                                    name
                                    url
                                    urlRelative
                                    size
                                    type
                                    title
                                    description
                                    hashtags
                                }
                                coverPhoto {
                                    name
                                    url
                                    urlRelative
                                    size
                                    type
                                }
                            }
                        }
                    }
                }
            `,
                {
                    practitionerId: values.id,
                    video: {
                        media: omit(values.latestVideo, ["url", "coverPhoto"]),
                        coverPhoto: values.coverPhoto ? omit(values.coverPhoto, ["url"]) : undefined
                    }
                }
            );

            return response.update_merchant_video.vendor;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['practitioner-profile', practitionerId] });
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

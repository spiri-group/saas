import { gql } from '@/lib/services/gql';
import { useForm } from 'react-hook-form';
import { media_type, vendor_type } from '@/utils/spiriverse';
import UseVendorInformation from '../../../../Nametag/hooks/UseVendorInformation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { omit } from '@/lib/functions';

export type UpdateVendorVideoFormSchema = {
    id: string;
    latestVideo?: media_type;
    coverPhoto?: media_type;
};

const useEditMerchantVideo = (merchantId: string) => {
    const queryClient = useQueryClient();
    const vendorInfo = UseVendorInformation(merchantId);

    const form = useForm<UpdateVendorVideoFormSchema>({
        defaultValues: {
            id: merchantId,
            latestVideo: undefined,
            coverPhoto: undefined
        }
    });

    const mutation = useMutation({
        mutationFn: async (values: UpdateVendorVideoFormSchema) => {
            if (!values.latestVideo) {
                throw new Error('No video provided');
            }

            const response = await gql<{
                update_merchant_video: {
                    vendor: vendor_type;
                };
            }>(
                `
                mutation update_merchant_video($merchantId: ID!, $video: VideoInput) {
                    update_merchant_video(merchantId: $merchantId, video: $video) {
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
                    merchantId: values.id,
                    video: {
                        media: omit(values.latestVideo, ["url", "coverPhoto"]),
                        coverPhoto: values.coverPhoto ? omit(values.coverPhoto, ["url"]) : undefined
                    }
                }
            );

            return response.update_merchant_video.vendor;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendorInformation', merchantId] });
            // Reset form after successful upload
            form.reset({
                id: merchantId,
                latestVideo: undefined,
                coverPhoto: undefined
            });
        }
    });

    return {
        form,
        mutation,
        hasLoaded: vendorInfo.isSuccess
    };
};

export default useEditMerchantVideo;

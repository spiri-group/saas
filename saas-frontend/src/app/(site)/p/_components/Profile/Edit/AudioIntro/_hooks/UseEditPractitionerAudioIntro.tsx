import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { gql } from "@/lib/services/gql";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { omit } from "@/lib/functions";
import { vendor_type } from "@/utils/spiriverse";
import { MediaSchema } from "@/shared/schemas/media";

const AudioIntroFormSchema = z.object({
    id: z.string(),
    audioIntro: MediaSchema.optional().nullable()
});

export type UpdateAudioIntroFormSchema = z.infer<typeof AudioIntroFormSchema>;

const useEditPractitionerAudioIntro = (practitionerId: string) => {
    const queryClient = useQueryClient();

    // Fetch current audio intro
    const query = useQuery({
        queryKey: ['practitioner-audio-intro', practitionerId],
        queryFn: async () => {
            const response = await gql<{
                vendor: vendor_type
            }>(`
                query get_practitioner_audio_intro($practitionerId: String!) {
                    vendor(id: $practitionerId) {
                        id
                        practitioner {
                            audioIntro {
                                name
                                url
                                urlRelative
                                size
                                type
                                code
                                durationSeconds
                            }
                        }
                    }
                }
            `, { practitionerId });
            return response.vendor;
        },
        enabled: !!practitionerId
    });

    const form = useForm<UpdateAudioIntroFormSchema>({
        resolver: zodResolver(AudioIntroFormSchema),
        defaultValues: {
            id: practitionerId,
            audioIntro: null
        },
        values: query.data ? {
            id: practitionerId,
            audioIntro: (query.data.practitioner?.audioIntro ?? null) as MediaSchema | null
        } : undefined
    });

    const mutation = useMutation({
        mutationFn: async (values: UpdateAudioIntroFormSchema) => {
            const response = await gql<{
                update_practitioner_audio_intro: { practitioner: vendor_type };
            }>(`
                mutation update_practitioner_audio_intro($practitionerId: ID!, $audioIntro: MediaInput) {
                    update_practitioner_audio_intro(practitionerId: $practitionerId, audioIntro: $audioIntro) {
                        code
                        success
                        message
                        practitioner {
                            id
                            practitioner {
                                audioIntro {
                                    name
                                    url
                                    urlRelative
                                    size
                                    type
                                    code
                                    durationSeconds
                                }
                            }
                        }
                    }
                }
            `, {
                practitionerId: values.id,
                audioIntro: values.audioIntro ? omit(values.audioIntro, ["url"]) : null
            });
            return response.update_practitioner_audio_intro.practitioner;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['practitioner-audio-intro', practitionerId] });
            queryClient.invalidateQueries({ queryKey: ['practitioner-profile', practitionerId] });
        }
    });

    return {
        form,
        mutation,
        hasLoaded: !query.isLoading
    };
};

export default useEditPractitionerAudioIntro;

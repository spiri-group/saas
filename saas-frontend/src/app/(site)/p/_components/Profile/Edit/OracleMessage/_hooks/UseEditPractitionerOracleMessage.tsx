import { media_type } from "@/utils/spiriverse";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { gql } from "@/lib/services/gql";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { omit } from "@/lib/functions";
import { vendor_type } from "@/utils/spiriverse";
import { MediaSchema } from "@/shared/schemas/media";

const OracleMessageFormSchema = z.object({
    id: z.string(),
    oracleMessage: z.object({
        id: z.string().optional(),
        audio: MediaSchema,
        message: z.string().max(200).optional().nullable()
    }).optional().nullable()
});

export type UpdateOracleMessageFormSchema = z.infer<typeof OracleMessageFormSchema>;

export type OracleMessageType = {
    id: string;
    audio: media_type;
    message?: string | null;
    postedAt: string;
    expiresAt: string;
};

const useEditPractitionerOracleMessage = (practitionerId: string) => {
    const queryClient = useQueryClient();

    // Fetch current oracle message
    const query = useQuery({
        queryKey: ['practitioner-oracle-message', practitionerId],
        queryFn: async () => {
            const response = await gql<{
                vendor: vendor_type
            }>(`
                query get_practitioner_oracle_message($practitionerId: String!) {
                    vendor(id: $practitionerId) {
                        id
                        practitioner {
                            oracleMessage {
                                id
                                audio {
                                    name
                                    url
                                    urlRelative
                                    size
                                    type
                                    code
                                    durationSeconds
                                }
                                message
                                postedAt
                                expiresAt
                            }
                        }
                    }
                }
            `, { practitionerId });
            return response.vendor;
        },
        enabled: !!practitionerId
    });

    const form = useForm<UpdateOracleMessageFormSchema>({
        resolver: zodResolver(OracleMessageFormSchema),
        defaultValues: {
            id: practitionerId,
            oracleMessage: null
        },
        values: query.data ? {
            id: practitionerId,
            oracleMessage: query.data.practitioner?.oracleMessage ? {
                id: query.data.practitioner.oracleMessage.id,
                audio: query.data.practitioner.oracleMessage.audio as MediaSchema,
                message: query.data.practitioner.oracleMessage.message
            } : null
        } : undefined
    });

    const mutation = useMutation({
        mutationFn: async (values: UpdateOracleMessageFormSchema) => {
            const response = await gql<{
                update_practitioner_oracle_message: { practitioner: vendor_type };
            }>(`
                mutation update_practitioner_oracle_message($practitionerId: ID!, $oracleMessage: OracleMessageInput) {
                    update_practitioner_oracle_message(practitionerId: $practitionerId, oracleMessage: $oracleMessage) {
                        code
                        success
                        message
                        practitioner {
                            id
                            practitioner {
                                oracleMessage {
                                    id
                                    audio {
                                        name
                                        url
                                        urlRelative
                                        size
                                        type
                                        code
                                        durationSeconds
                                    }
                                    message
                                    postedAt
                                    expiresAt
                                }
                            }
                        }
                    }
                }
            `, {
                practitionerId: values.id,
                oracleMessage: values.oracleMessage ? {
                    id: values.oracleMessage.id,
                    audio: omit(values.oracleMessage.audio, ["url"]),
                    message: values.oracleMessage.message
                } : null
            });
            return response.update_practitioner_oracle_message.practitioner;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['practitioner-oracle-message', practitionerId] });
            queryClient.invalidateQueries({ queryKey: ['practitioner-profile', practitionerId] });
        }
    });

    // Get the current oracle message with expiry info
    const currentOracleMessage = query.data?.practitioner?.oracleMessage as OracleMessageType | undefined;

    // Check if the oracle message has expired
    const isExpired = currentOracleMessage
        ? new Date(currentOracleMessage.expiresAt) < new Date()
        : false;

    return {
        form,
        mutation,
        hasLoaded: !query.isLoading,
        currentOracleMessage,
        isExpired
    };
};

export default useEditPractitionerOracleMessage;

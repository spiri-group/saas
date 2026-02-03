'use client';

import { z } from "zod";
import { useForm } from "react-hook-form";
import { gql } from "@/lib/services/gql";
import { caseInteraction_type, recordref_type } from "@/utils/spiriverse";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { v4 as uuid } from "uuid";
import { DateTime } from "luxon";
import { countWords } from "@/lib/functions";

export type createActivityLog = z.infer<typeof activityLogSchema>

export const activityLogSchema = z.object({
    id: z.string().uuid(),
    title: z.string(),
    details: z.string().refine((value) => countWords(value) <= 500),
    conductedAtDate: z.coerce.date(),
    attachedFiles: z.array(z.object({
        name: z.string().min(1),
        url: z.string().min(1)
    }))
})

const UseCreateActivityLog = (caseRef: recordref_type, merchantId: string) => {
    const queryClient = useQueryClient();

    const form = useForm<createActivityLog>({
        resolver: zodResolver(activityLogSchema),
        defaultValues: {
            id: uuid(),
            attachedFiles: [],
            conductedAtDate: undefined
        }
    })

    return {
        form, 
        schema: activityLogSchema,
        values: form.getValues(),
        mutation: useMutation({
            mutationFn: async (data : createActivityLog) => {
                
                const interaction = {
                    ...data,
                    conductedAtDate: DateTime.fromJSDate(data.conductedAtDate).toISO()
                }

                const resp = await gql<any>(
                    `
                        mutation create_activity_log($interaction: ActivityLogInput!, $caseRef: RecordRefInput!, $merchantId: String!) {
                            create_activity_log(interaction: $interaction, caseRef: $caseRef, vendorId: $merchantId) {
                            caseInteraction {
                                    id,
                                    title,
                                    details,
                                    message,
                                    code,
                                    conductedAtDate,
                                    attachedFiles {
                                        name,
                                        url
                                    }
                                    participants {
                                        vendorId
                                    }
                                }
                            }
                        }
                    `,
                    {
                        caseRef,
                        interaction,
                        merchantId
                    }
                )
        
                return resp.create_activity_log.caseInteraction;
            },
            onSuccess: async (data : caseInteraction_type) => {
                queryClient.setQueryData(["interactions-for-case", caseRef.id, undefined], (old: caseInteraction_type[]) => {
                    return [data, ...(old ?? [])]
                        .sort((a, b) => {
                            const aDt = DateTime.fromISO(b.conductedAtDate)
                            const bDt = DateTime.fromISO(a.conductedAtDate)
                            return aDt < bDt ? -1 : aDt > bDt ? 1 : 0
                        })
                });
            }
        })
    }
}

export default UseCreateActivityLog
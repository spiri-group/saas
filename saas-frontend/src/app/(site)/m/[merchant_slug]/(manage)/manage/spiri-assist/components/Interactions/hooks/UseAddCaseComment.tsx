'use client';

import { z } from "zod";
import { useForm } from "react-hook-form";
import { gql } from "@/lib/services/gql";
import { caseInteraction_type, recordref_type } from "@/utils/spiriverse";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { v4 as uuid } from "uuid";
import { countWords } from "@/lib/functions";

export type createCaseComment = z.infer<typeof caseCommentSchema>

export const caseCommentSchema = z.object({
    id: z.string().uuid(),
    title: z.string().refine((value) => countWords(value) <= 20),
    details: z.string().refine((value) => countWords(value) <= 500),
    attachedFiles: z.array(z.string()).optional()
})

const UseAddCaseComment = (caseRef: recordref_type, merchantId: string) => {
    const queryClient = useQueryClient();

    const form = useForm<z.infer<typeof caseCommentSchema>>({
        resolver: zodResolver(caseCommentSchema),
        defaultValues: {
            id: uuid(),
            attachedFiles: []
        }
    })

    return {
        schema: caseCommentSchema,
        form, values: form.getValues(),
        mutation: useMutation({
            mutationFn: async (data: createCaseComment) => {
                const resp = await gql<any>(
                    `
                        mutation add_case_comment($interaction: CaseInteractionCommentInput!, $caseRef: RecordRefInput!, $merchantId: String!) {
                            add_case_comment(interaction: $interaction, caseRef: $caseRef, vendorId: $merchantId) {
                            code,
                            caseInteraction {
                                    id,
                                    message,
                                    title,
                                    details,
                                    conductedAtDate,
                                    attachedFiles {
                                        name,
                                        url
                                    }
                                }
                            }
                        }
                    `,
                    {
                        caseRef,
                        interaction: data,
                        merchantId
                    }
                )
        
                return resp.add_case_comment.caseInteraction;
            },
            onSuccess: async (data : caseInteraction_type) => {
                queryClient.setQueryData(["interactions-for-case", caseRef.id, undefined], (old: caseInteraction_type[]) => {
                    return [data, ...old];
                });
            }
        })
    }
}

export default UseAddCaseComment
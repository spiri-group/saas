'use client';

import { gql } from "@/lib/services/gql";
import { useMutation } from "@tanstack/react-query"
import { recordref_type, report_type } from "@/utils/spiriverse";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

export type createReportSchema = z.infer<typeof reportFormSchema>

export const reportFormSchema = z.object({
    id: z.string().uuid(),
    reasons: z.array(z.object({
        id: z.string().min(1),
        value: z.string().min(1),
        checked: z.boolean()
    }))
})

const UseCreateReport = (forObject: recordref_type, onSuccess: (data: report_type) => void) => {

    const form = useForm<z.infer<typeof reportFormSchema>>({
        resolver: zodResolver(reportFormSchema),
        defaultValues: {
            reasons: [] 
        }
    })

    return {
        form,
        schema: reportFormSchema,
        values: form.getValues(),
        mutation: useMutation({
            mutationFn: async (values: createReportSchema) => {
                const resp = await gql<any>(
                    `mutation create_report($report: ReportInput!, $forObject: RecordRefInput!) {
                        create_report(report: $report, forObject: $forObject) {
                            code,
                            report {
                                id
                            }
                        }
                    }
                    `,
                    {
                        forObject,
                        report: {reasonIds: values.reasons.filter((reason) => reason.checked).map((reason) => reason.id) }
                    }
                );
                return resp.create_report
            },
            onSuccess
        }) 
    }
}

export default UseCreateReport
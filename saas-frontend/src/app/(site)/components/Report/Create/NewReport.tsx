'use client'

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import UseCreateReport, { createReportSchema } from "./hooks/UseCreateReport";
import { Checkbox } from "@/components/ui/checkbox";
import { choice_option_type, recordref_type, report_type } from "@/utils/spiriverse";
import { v4 as uuid } from "uuid";

type BLProps = {
    reportReasons: choice_option_type[],
    forObject: recordref_type,
    onSuccess: (data: report_type) => void
}

const useBL = (props: BLProps) => {

    const createReport = UseCreateReport(props.forObject, props.onSuccess)
    
    if (props.reportReasons != null && createReport.form.getValues().id == null) { 
        createReport.form.reset({
            id: uuid(),
            reasons: props.reportReasons.map((reason) => ({
                id: reason.id,
                value: reason.defaultLabel,
                checked: false
            }))
        })
    }

    return {
        form: createReport.form,
        submit: async (values: createReportSchema) => {
            await createReport.mutation.mutateAsync(values)
            document.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Escape'}));
        },
        reasons: {
            get: createReport.form.getValues().reasons
        }
    }
}

type Props = BLProps & {
    className?: string
}

const NewReport: React.FC<Props> = (props) => {
    const bl = useBL(props);

    return (
        <Form {...bl.form}>
            <form className="flex flex-col flex-grow space-y-3" onSubmit={bl.form.handleSubmit(bl.submit)}>
                <label className="font-bold">Why are you reporting this?</label>
                {bl.reasons.get.map((reason, idx) => (
                        <FormField
                        key={reason.id}
                        control={bl.form.control}
                        name={`reasons.${idx}.checked`}
                        render={({ field }) => (
                            <FormItem key={reason.id} className="flex flex-row space-x-2 items-center">
                                <FormControl>
                                <Checkbox
                                    className="mr-2"
                                    onCheckedChange={field.onChange}
                                    checked={reason.checked}
                                />
                                </FormControl>
                                <FormLabel>{reason.value}</FormLabel>
                            </FormItem>
                        )}
                        />
                ))}
                <div className="flex flex-col space-y-3">
                    <p className="mt-2">We will check this item meets our community guidelines. If it does not, we will remove it.</p>
                    <Button type="submit">Submit</Button>
                </div>
            </form>
        </Form>
    )
}

export default NewReport
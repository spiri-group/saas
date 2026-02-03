'use client';

import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import RichTextInput from "@/components/ux/RichTextInput"
import UseCreateActivityLog from "../hooks/UseCreateActivityLog";
import { recordref_type } from "@/utils/spiriverse";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import DateAndTimeInput from "@/components/ux/DateAndTimeInput";
import { escape_key } from "@/lib/functions";
import CancelDialogButton from "@/components/ux/CancelDialogButton";

type Props = BLProps & {
    
}

type BLProps = {
    merchantId: string
    caseRef: recordref_type
}

const useBL = (props : BLProps) => {

    const createActivityLog = UseCreateActivityLog(props.caseRef, props.merchantId)

    return {
        form: createActivityLog.form,
        values: createActivityLog.values,
        submit: async (data: z.infer<typeof createActivityLog.schema>) => {
            await createActivityLog.mutation.mutateAsync(data)
            escape_key()
        }
    }
    
}

//TODO: Add in participants selection
const CreateActivityLog: React.FC<Props> = (props) => {
    const bl = useBL(props)

    return (
        <>
            <Form {...bl.form}>
                <form onSubmit={bl.form.handleSubmit(bl.submit)} className="flex flex-col space-y-3">
                    <FormLabel className="text-xl"> Log Activity with Client </FormLabel>  
                    <FormDescription>
                        For example, this could be a visit to the client.
                    </FormDescription>
                    <FormField 
                    name="title"
                    control={bl.form.control}
                    render={({field}) => {
                        return (
                            <FormItem>
                                <FormControl>
                                    <Input {...field} placeholder="Activity title"/>
                                </FormControl>
                            </FormItem>
                        )
                    }} />
                    <FormField 
                    name="conductedAtDate"
                    control={bl.form.control}
                    render={({field}) => {
                        return (
                            <FormItem>
                                <FormControl>
                                    <DateAndTimeInput
                                        {...field}
                                        dateProps={{
                                            placeholder: "Date"
                                        }}
                                        timeProps={{
                                            placeholder: "Time"
                                        }}
                                    />
                                </FormControl>
                            </FormItem>
                        )
                    }} />
                    <FormField 
                        name="details"
                        control={bl.form.control}
                        render={({field}) => {
                            return (
                                <RichTextInput 
                                    label="Details"
                                    maxWords={500}
                                    className="h-[300px] w-[350px]"
                                    {...field} 
                                    placeholder="Your description here"/>
                            )
                        }} />
                    {/* <FormField
                    name="attachedFiles"
                    render={({field}) => (
                        <FormControl>
                            <FileUploader 
                                id={bl.values.id}
                                className={"w-[300px] aspect-video border border-dashed"} 
                                connection={{
                                    container: "public",
                                    relative_path: `case/${bl.values.id}`
                                }} 
                                targetImage={{
                                    height: 300,
                                    width: 500
                                }}
                                value={field.value != null ? field.value.map((x) => x.url) : []}
                                targetImageVariants={[]}
                                onDropAsync={function (files: string[]): void {
                                    field.onChange([])
                                }} 
                                onUploadCompleteAsync={function (files: media_type[]): void {
                                    field.onChange(files)
                                }}                                    
                            />
                        </FormControl>
                    )} /> */}
                    <div className="flex flex-row space-x-2">
                        <CancelDialogButton />
                        <Button  type="submit" className="w-full"> Save </Button>
                    </div>
                </form>
            </Form>
        </> 
    )
}

export default CreateActivityLog;
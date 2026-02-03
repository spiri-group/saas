'use client';

import { Form, FormControl, FormField, FormDescription, FormLabel, FormItem } from "@/components/ui/form";
import RichTextInput from "@/components/ux/RichTextInput"
import UseAddCaseComment from "../hooks/UseAddCaseComment";
import { Button } from "@/components/ui/button";
import { recordref_type } from "@/utils/spiriverse";
import { z } from "zod";
import { escape_key } from "@/lib/functions";
import CancelDialogButton from "@/components/ux/CancelDialogButton";
import { Input } from "@/components/ui/input";

type Props = BLProps & {
    
}

type BLProps = {
    merchantId: string
    caseRef: recordref_type
}

const useBL = (props: BLProps) => {

    const createCommentCase = UseAddCaseComment(props.caseRef, props.merchantId)

    return {
        form: createCommentCase.form,
        values: createCommentCase.values,
        submit: async (data: z.infer<typeof createCommentCase.schema>) => {
            await createCommentCase.mutation.mutateAsync(data)
            escape_key()
        }
    }
    
}

const CreateCommentCase : React.FC<Props> = (props) => {
    const bl = useBL(props)

    return (
        <>
            <Form {...bl.form}>
                <form onSubmit={bl.form.handleSubmit(bl.submit)} className="flex flex-col space-y-2">
                    <FormLabel className="text-xl"> Capture an internal team note </FormLabel>  
                    <FormDescription>Please know that this <span className="font-bold text-black">won&apos;t</span> be shown to the client</FormDescription>
                    <FormField
                        name="title"
                        control={bl.form.control}
                        render={({field}) => {
                            return (
                                <FormItem>
                                    <FormLabel> Title </FormLabel>
                                    <FormControl>
                                        <Input {...field}/>
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
                                className="h-[300px]"
                                {...field} 
                                placeholder="Your comment or note"/>
                        )
                    }} />
                    {/* <FormField
                        name="attachedFiles"
                        render={({field}) => (
                        <FormItem>
                            <FormLabel>Attachment</FormLabel>
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
                        </FormItem>
                    )} /> */}
                    <div className="flex flex-row space-x-3">
                        <CancelDialogButton />
                        <Button type="submit" className="flex-grow">Confirm</Button>
                    </div>
                </form>
            </Form>
        </> 
    )
}

export default CreateCommentCase;
'use client'

import { recordref_type } from "@/utils/spiriverse";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import UseCreateComment, { createCommentSchema } from "./hooks/UseCreateComment";
import { cn } from "@/lib/utils";

type BLProps = {
    replyTo?: recordref_type, 
    forObject?: recordref_type,
    onSuccess?: (value: createCommentSchema) => void
}

const useBL = (props: BLProps) => {

    if (props.replyTo == undefined && props.forObject == undefined) throw "Must pass either reply to or forObject"

    const createComment = UseCreateComment(props.forObject, props.replyTo)

    return {
        form: createComment.form,
        submit: async (data: createCommentSchema) => {
            await createComment.mutation.mutateAsync(data) 
            createComment.form.reset({
                text: ""
            })
            if (props.onSuccess) props.onSuccess(data)
        }
    }
}

type Props = BLProps & {
    className?: string
}

const NewComment : React.FC<Props> = (props) => {
    const bl =  useBL(props);
    
    return (
        <>
            <Form {...bl.form}>
                <form 
                    className={cn("flex flex-row w-full space-x-2 items-end", props.className)}
                    onSubmit={bl.form.handleSubmit(bl.submit)}>  
                    <FormField 
                    name="text"
                    control={bl.form.control}
                    render={({field}) => {
                        return (
                            <FormItem>
                                <FormControl>
                                <Textarea 
                                    {...field} 
                                    onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
                                        const target = e.target as HTMLTextAreaElement;
                                        // if the number of chacters is less than 22 dont run
                                        if (e.currentTarget.value.length < 22) {
                                            if (target.scrollHeight > 40) {
                                                target.style.height = '40px';
                                            }
                                            return;
                                        };
                                       // otherwise transform to scroll height with some padding
                                        target.style.height = 'auto';
                                        target.style.height = target.scrollHeight + 2 + 'px';
                                    }}
                                    style={{
                                        maxHeight: "176px",
                                        minHeight: 40,
                                        padding: "8px", // Add some padding
                                        boxSizing: "border-box",
                                        height: 40,
                                        resize: "none"
                                    }}
                                    maxLength={140}
                                />
                                </FormControl>
                            </FormItem>
                        )
                    }} />
                   <Button type="submit"> Send </Button>
                </form>
            </Form>
        </> 
    )
}

export default NewComment;
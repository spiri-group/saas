'use client'

import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { useZodFormHandler } from "@/components/ux/ZodFormHandler"
import { Input } from "@/components/ui/input"
import RichTextInput from "@/components/ux/RichTextInput"
import { DialogContent, DialogFooter, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RefundPolicyDetailSchema, RefundPolicyDetailSchemaType } from "../_hooks/UseUpsertRefundPolcy"

type Props = {
    type: "condition" | "exclusion",
    existing: RefundPolicyDetailSchemaType,
    onClose: () => void
    onSubmit: (values: RefundPolicyDetailSchemaType) => void
}

const EditRefundPolicyDetail:React.FC<Props> = (props) => {
    const { existing, onClose, onSubmit } = props;
    const { isCustom, ...existingData } = existing;

    const { form, control, handleSubmit } = useZodFormHandler({
        schema: RefundPolicyDetailSchema,
        defaultValues: {
            ...existingData,
            isCustom: isCustom ?? true
        },
        onSubmit: async (values) => {
            // Handle form submission
            onSubmit(values);
            form.reset();
            onClose();
        },
        onSuccess: () => {

        },
        onError: (errors) => {
            console.error(errors);
        }
    })

    return (
        <DialogContent className="w-[500px]">
        <DialogTitle>
            { props.type === "condition" ? "Refund Condition" : "Refund Exclusion" }
        </DialogTitle>
        <Form {...form}>
            <form onSubmit={handleSubmit} className="flex flex-col space-y-2">
                <FormField
                    name="title"
                    control={control}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                                <Input {...field} />
                            </FormControl>
                        </FormItem>
                    )} />
                <FormField
                    name="description"
                    control={control}
                    render={({ field }) => (
                        <RichTextInput className="h-[350px]" maxWords={150} label="Description" {...field} />
                    )} />
                <FormField
                    name="code"
                    control={control}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Code</FormLabel>
                            <FormControl>
                                <Input {...field} />
                            </FormControl>
                        </FormItem>
                    )} />
                <DialogFooter className="flex flex-row space-x-3 items-center mt-3">
                    <Button type="button" variant="link" onClick={() => {
                        form.reset();
                        onClose();
                    }}>Cancel</Button>
                    <Button type="button" className="flex-grow"
                        onClick={handleSubmit}>Confirm
                    </Button>
                </DialogFooter>
            </form>
        </Form>
        </DialogContent>
    )
}

export default EditRefundPolicyDetail
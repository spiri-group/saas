import { useZodFormHandler } from "@/components/ux/ZodFormHandler"
import { RefundTierSchema, RefundTierSchemaType } from "../_hooks/UseUpsertRefundPolcy"
import { Button } from "@/components/ui/button"
import { DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog"
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import PercentageInput from "@/components/ux/PercentageInput"
import { uuid } from "uuidv4"
import { omit } from "@/lib/functions"
import { Checkbox } from "@/components/ui/checkbox"

type Props = {
    existing: RefundTierSchemaType,
    onClose: () => void
    onSubmit: (values: RefundTierSchemaType) => void
}

const EditRefundTier: React.FC<Props> = (props) => {
    const { existing, onClose, onSubmit } = props;
    const existingData = omit(existing, ['id'])

    const { form, control, handleSubmit } = useZodFormHandler({
        schema: RefundTierSchema,
        defaultValues: {
            ...existingData,
            id: existing.id || uuid()
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
        <DialogContent  className="w-[500px]">
            <DialogTitle>Refund Tier</DialogTitle>
            <DialogDescription>These will be used to tune the amount of funds that are refunded based on the days after purchase the refund is requested.</DialogDescription>
            <Form {...form}>
                <form className="flex flex-col space-y-2">
                    <FormField
                        name="daysUpTo"
                        control={control}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Up to __ days</FormLabel>
                                <FormControl>
                                    <Input 
                                        {...field}
                                        type="number"
                                        min="1"
                                        placeholder="e.g. 30"
                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                    />
                                </FormControl>
                            </FormItem>
                        )} />
                    <FormField
                        name="refundPercentage"
                        control={control}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Refund Percentage</FormLabel>
                                <FormControl>
                                    <PercentageInput 
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder="e.g. 100"
                                    />
                                </FormControl>
                            </FormItem>
                        )} />
                    <FormField
                        name="refundCustomerFees"
                        control={control}
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                    <Checkbox 
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                    <FormLabel>
                                        Refund customer fees
                                    </FormLabel>
                                    <p className="text-xs text-muted-foreground">
                                        Include platform fees and transaction fees in the refund amount
                                    </p>
                                </div>
                            </FormItem>
                        )} />
                    <DialogFooter className="mt-2 w-full grid grid-cols-2 gap-3">
                        <Button aria-label="cancel-edit-refund-tier" type="button" variant="link" onClick={onClose}>Cancel</Button>
                        <Button aria-label="confirm-edit-refund-tier" type="button"
                            onClick={handleSubmit}>Confirm</Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    )
}

export default EditRefundTier
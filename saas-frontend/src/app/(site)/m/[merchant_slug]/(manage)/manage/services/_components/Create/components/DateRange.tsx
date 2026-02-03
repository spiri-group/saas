import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { z } from "zod";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";

import { DateFromTo, DurationSchema } from "@/shared/hooks/mutations";
import UseChoice from "@/shared/hooks/UseChoice";
import ComboBox from "@/components/ux/ComboBox";

export type DateRange = z.infer<typeof DateRangeSchema>

export const DateRangeSchema = z.object({
    type: z.enum(["into", "within", "indefinitely"]),
    intoTheFuture: DurationSchema.partial(),
    range: DateFromTo.partial()
}).refine((ctx) => {
    if (ctx.type == "into") {
        return ctx.intoTheFuture.amount != null && ctx.intoTheFuture.unit != null;
    } else if (ctx.type == "within") {
        return ctx.range.from != null && ctx.range.to != null
    } else {
        return true;
    }
})

const useBL = () => {
    const form = useFormContext();
    
    const unitDateRangeQuery = UseChoice( "unit", "EN")

    return {
        form,
        unitOptions: unitDateRangeQuery.data == null ? [] : unitDateRangeQuery.data.combobox_options,
    }
}

const DateRange : React.FC = () => {
    const bl = useBL();
    
    return (
        <Form {...bl.form}>
            <form>
                <FormLabel> Date Range </FormLabel>
                <FormDescription> Invitees can schedule... </FormDescription>
                <FormField 
                    name="availableUntil.type"
                    render={(typeField) => {
                        return (
                            <RadioGroup onValueChange={typeField.field.onChange} defaultValue={typeField.field.value} className="flex flex-col">
                                <div className="flex items-center space-x-1 w-full">
                                    <RadioGroupItem value="into"/>
                                    <FormField
                                    name="availableUntil.intoTheFuture.amount"
                                    render={({ field }) => (
                                        <FormItem className="flex-grow">
                                            <FormControl>
                                                <Input {...field} placeholder="Amount" />
                                            </FormControl>
                                        </FormItem>
                                    )} />
                                    <FormField 
                                        name="availableUntil.intoTheFuture.unit"
                                        control={bl.form.control}
                                        render={({field}) => {
                                            return (
                                                <FormItem>
                                                    <FormControl>
                                                    <ComboBox 
                                                        {...field}
                                                        withSearch={true}
                                                        objectName="unit"
                                                        fieldMapping={{
                                                            labelColumn: "value",
                                                            keyColumn: "id"
                                                        }}
                                                        items={bl.unitOptions ?? []}                              
                                                    />
                                                    </FormControl>
                                                </FormItem>
                                            )
                                    }} />
                                    <Label className="mr-2">into the future</Label>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <RadioGroupItem value="within"/>
                                    <Label className="ml-2">Within range</Label>
                                    <FormField
                                        name="availableUntil.range.from"
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                            <Input
                                                {...field}
                                                type="date"
                                            />
                                            </FormControl>
                                        </FormItem>
                                        )}
                                    />
                                    <FormField
                                    name="availableUntil.range.to"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                        <Input
                                            {...field}
                                            type="date"
                                        />
                                        </FormControl>
                                    </FormItem>
                                    )}
                                />
                                </div>
                                <div className="flex items-center space-x-1">
                                    <RadioGroupItem value="indefinitely"/>
                                    <Label className="ml-2">Indefinitely into the future</Label>
                                </div>
                            </RadioGroup>
                        )
                    }}
                />
            </form>
        </Form>
    )
}

export default DateRange;
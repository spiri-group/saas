'use client';

import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import CurrencyInput from "@/components/ux/CurrencyInput";
import UseCreateInvoice from "../hooks/UseCreateCaseInvoice";
import { Textarea } from "@/components/ui/textarea";
import { escape_key } from "@/lib/functions";

type Props = BLProps & {
    
}

type BLProps = {
    merchantId: string
    caseId: string
}

const useBL = (props: BLProps) => {

    const createCaseInvoice = UseCreateInvoice(props.caseId, props.merchantId)

    return {
        form: createCaseInvoice.form,
        values: createCaseInvoice.form.getValues(),
        submit: async (data: z.infer<typeof createCaseInvoice.schema>) => {
            await createCaseInvoice.mutation.mutateAsync(data)
            escape_key()
        }
    }
}

const CreateCaseInvoice : React.FC<Props> = (props) => {
    const bl = useBL(props)

    return (
        <>
            <Form {...bl.form}>
                <form onSubmit={bl.form.handleSubmit(bl.submit)} className="flex flex-col space-y-2">
                    <Table className="overflow-auto">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Included</TableHead>
                                <TableHead>Interaction (Shown on invoice)</TableHead>
                                <TableHead>Fee</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <>
                                {bl.values.interactions.map((interaction, idx) => {
                                    return (
                                        <TableRow key={interaction.interactionId}>
                                            <TableCell> 
                                            <FormField
                                                control={bl.form.control}
                                                name={`interactions.${idx}.included`}
                                                render={({field}) => (
                                                    <FormItem className="flex flex-row space-y-0">
                                                        <FormControl>
                                                            <Checkbox
                                                                className="mr-2"
                                                                checked={field.value}
                                                                onCheckedChange={(checked) => {
                                                                    if (checked) {
                                                                        bl.form.setValue(
                                                                            `interactions.${idx}.amount`, 
                                                                            {
                                                                                amount: 0,
                                                                                currency: "AUD"
                                                                            }
                                                                        )
                                                                    } else {
                                                                        bl.form.setValue(
                                                                            `interactions.${idx}.amount`,
                                                                            undefined
                                                                        )
                                                                    }
                                                                    field.onChange(checked)
                                                                }}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )} />
                                            </TableCell> 
                                            <TableCell> 
                                                <FormField
                                                    control={bl.form.control}
                                                    name={`interactions.${idx}.invoiceDescription`}
                                                    render={({field}) => (
                                                        <FormItem className="w-72">
                                                            <FormControl>
                                                                <Textarea {...field} />
                                                            </FormControl>
                                                        </FormItem>
                                                    )} />
                                            </TableCell>
                                            <TableCell className="w-40"> 
                                            { interaction.included && (
                                                <FormField 
                                                    name={`interactions.${idx}.amount`}
                                                    control={bl.form.control}
                                                    render={({field}) => {
                                                        return (
                                                            <FormItem>
                                                                <FormControl>
                                                                    <CurrencyInput 
                                                                        {...field} 
                                                                        placeholder="Amount" />
                                                                </FormControl>
                                                            </FormItem>
                                                        )
                                                }} />
                                            )}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </>
                        </TableBody>
                    </Table>
                    <Button type="submit" className="w-full mt-2"> Confirm and email fee </Button>
                </form>
            </Form>
        </> 
    )
}

export default CreateCaseInvoice;
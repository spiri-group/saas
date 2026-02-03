'use client'

import React from 'react';
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { DialogDescription, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import CurrencyInput from "@/components/ux/CurrencyInput";
import { Textarea } from "@/components/ui/textarea";
import { escape_key } from "@/lib/functions";
import UseCreateOrder from "../hooks/UseCreateOrder";
import CancelDialogButton from "@/components/ux/CancelDialogButton";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import CurrencySpan from '@/components/ux/CurrencySpan';
import { recordref_type } from '@/utils/spiriverse';
import { useWatch } from 'react-hook-form';

type Props = BLProps & {   
}

type BLProps = {
    customerEmail: string
    merchantId: string
    forObject?: recordref_type
}

const useBL = (props) => {
    const createOrder = UseCreateOrder(props.customerEmail, props.merchantId, props.forObject)
    
    // we need to watch the lines to update the total
    useWatch({
        control: createOrder.form.control,
        name: 'lines',
    });

    return {
        form: createOrder.form,
        values: createOrder.form.getValues(),
        addNewLine: createOrder.addNewLine,
        removeLine: createOrder.removeLine,
        total: createOrder.form.getValues().lines.length == 0 ? {amount: 0, currency: "AUD"} : {
            amount: createOrder.form.getValues().lines.reduce((acc, line) => acc + line.quantity * line.price.amount, 0),
            currency: createOrder.form.getValues().lines[0]?.price.currency
        },
        submit: async (data: z.infer<typeof createOrder.schema>) => {
            await createOrder.mutation.mutateAsync(data)
            escape_key()
        }
    }
}

const CreateOrder: React.FC<Props> = (props) => {
    const bl = useBL(props)

    return (
        <div className="flex flex-col min-h-0 h-full">
            <DialogHeader>Order</DialogHeader>
            <DialogDescription>Add anything you wish to invoice for.</DialogDescription>
            <Form {...bl.form}>
                <form onSubmit={bl.form.handleSubmit(bl.submit)} className="flex flex-col flex-grow min-h-0">
                    <div className="flex flex-row justify-between items-center">
                        <span>{bl.values.lines.length} line/s</span>
                        <Button type="button" onClick={bl.addNewLine} variant="link">Add new line</Button>
                    </div>
                    <Table className="relative flex flex-col flex-grow min-h-0 w-full mb-6">
                        <TableHeader>
                            <TableRow className="flex flex-row">
                                <TableHead className="flex-none w-72 mr-4 pt-4">Descriptor</TableHead>
                                <TableHead className="flex-grow mr-4 pt-4">Quantity</TableHead>
                                <TableHead className="flex-grow pt-4">Price</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="flex-grow min-h-0 overflow-y-auto">
                            {bl.values.lines.map((row, idx) => (
                                <TableRow key={row.id}>
                                    <TableCell>
                                        <FormField
                                            control={bl.form.control}
                                            name={`lines.${idx}.descriptor`}
                                            render={({ field }) => (
                                                <FormItem className="flex flex-col w-72">
                                                    <FormControl>
                                                        <Textarea {...field} placeholder="Descriptor" />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <FormField
                                            control={bl.form.control}
                                            name={`lines.${idx}.quantity`}
                                            render={({ field }) => (
                                                <FormItem className="flex flex-col">
                                                    <FormControl>
                                                        <Input type="number" {...field} placeholder="Quantity" />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <FormField
                                            control={bl.form.control}
                                            name={`lines.${idx}.price`}
                                            render={({ field }) => (
                                                <FormItem className="flex flex-col">
                                                    <FormControl>
                                                         <CurrencyInput 
                                                            placeholder="Price" 
                                                            {...field} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFooter className="w-full">
                            <TableRow className="flex flex-row">
                                <TableCell className="ml-auto">
                                    Total
                                </TableCell>
                                <TableCell>
                                    <CurrencySpan withAnimation={false} value={bl.total}/>
                                </TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                    <div className="flex flex-row space-x-2 ">
                        <CancelDialogButton />
                        <Button type="submit" className="flex-grow">Confirm and email fee</Button>
                    </div>
                </form>
            </Form>
        </div>
    )
}

export default CreateOrder;
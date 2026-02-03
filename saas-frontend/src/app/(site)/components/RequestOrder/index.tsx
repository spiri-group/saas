'use client'

import React from "react";
import CancelDialogButton from "@/components/ux/CancelDialogButton";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { order_type } from "@/utils/spiriverse";
import { escape_key } from "@/lib/functions";
import { Form, FormField } from "@/components/ui/form";
import UseRefundOrder, { refundOrderSchema } from "./hooks/UseRefundOrder";
import CurrencySpan from "@/components/ux/CurrencySpan";
import RefundInput from "@/components/ux/RefundInput";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useWatch } from "react-hook-form";

type BLProps = {
    order: order_type
}

type Props = BLProps & {

}

const useBL = (props: BLProps) => {

    const refundOrder = UseRefundOrder(props.order)

    useWatch({ control: refundOrder.form.control, name: 'lines' })

    return {
        form: refundOrder.form,
        values: refundOrder.form.getValues(),
        submit: async (values: refundOrderSchema) => {
            await refundOrder.mutation.mutateAsync(values)
            escape_key()
        }
    }
}

const RefundOrderForm: React.FC<Props> = (props) => {
    const bl = useBL(props)

    const totalBeforeRefund = bl.values.lines.reduce((total, line) => total + line.total.amount, 0)
    const totalRefund =  bl.values.lines.reduce((total, item) => total + item.refund.amount, 0)
    const totalAfterRefund = totalBeforeRefund - totalRefund
    const refundPercentage = ((totalRefund / totalBeforeRefund) * 100)

    return (
        <DialogContent className="flex flex-col w-[600px]">
            <Form {...bl.form}>
                <form onSubmit={bl.form.handleSubmit(bl.submit)}>
                    <DialogHeader>
                        <DialogTitle>Refund Order</DialogTitle>
                        <DialogDescription>Configure the amount for each line that you would like to refund.</DialogDescription>
                    </DialogHeader>
                    <Table className="mt-2">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Description</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Quantity</TableHead>
                                <TableHead>Refund Input</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {props.order.lines.map((line, idx) => {
                                const refund = bl.form.getValues(`lines.${idx}.refund`)
                                return (
                                    <TableRow key={line.id}>
                                        <TableCell>{line.descriptor}</TableCell>
                                        <TableCell><CurrencySpan withAnimation={false} value={line.price} /></TableCell>
                                        <TableCell>{line.quantity}</TableCell>
                                        <TableCell>
                                            <Popover>
                                                <PopoverTrigger className="w-full">
                                                    <Button type="button" className="w-full">
                                                        {refund.amount > 0 ? `${refund.amount} (${refundPercentage.toFixed(0)}%)` : "Add"}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="flex-grow">
                                                    <FormField
                                                        name={`lines.${idx}.refund`}
                                                        control={bl.form.control}
                                                        render={({ field }) => (
                                                            <RefundInput
                                                                originalAmount={line.price}
                                                                {...field}
                                                                onChange={(value) => {
                                                                    field.onChange(value, {shouldValidate: true})
                                                                    bl.form.setValue(`lines.${idx}.dirty`, true, { shouldValidate : true })
                                                                }}
                                                            />
                                                        )}
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                            <TableRow>
                                <TableCell colSpan={3} className="text-right">Sale total</TableCell>
                                <TableCell>
                                    <CurrencySpan withAnimation={false} value={{ amount: totalBeforeRefund, currency: props.order.lines[0].price.currency }} />
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell colSpan={3} className="text-right">Refund amount</TableCell>
                                <TableCell>
                                    <CurrencySpan value={{ amount: totalRefund, currency: props.order.lines[0].price.currency }} />
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell colSpan={3} className="text-right">Net Remaining</TableCell>
                                <TableCell>
                                    <CurrencySpan value={{ amount: totalAfterRefund, currency: props.order.lines[0].price.currency }} />
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                    <div className="flex flex-row space-x-2 mt-2">
                        <CancelDialogButton />
                        <Button
                            className="w-full"
                            type="submit"
                            aria-label="button-confirmRefund"> Confirm </Button>
                    </div>
                </form>
            </Form>
        </DialogContent>
    )
}

export default RefundOrderForm;
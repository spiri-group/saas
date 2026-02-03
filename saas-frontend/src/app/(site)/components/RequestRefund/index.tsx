'use client'

import React from "react"
import CancelDialogButton from "@/components/ux/CancelDialogButton";
import CurrencySpan from "@/components/ux/CurrencySpan";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { order_type } from "@/utils/spiriverse";
import { capitalize, escape_key } from "@/lib/functions";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import UseRequestRefund, { requestRefundSchema } from "./hooks/UseRequestRefund";
import UseRequestCancelRefund from "./hooks/UseRequestCancelRefund";

type BLProps = {
    gql_conn: gql_conn_type
    order: order_type
}

type Props = BLProps & {

}

const useBL = (props: BLProps) => {

    const requestRefund = UseRequestRefund(props.order, undefined)
    const requestCancelRefund = UseRequestCancelRefund(props.order)

    return {
        form: requestRefund.form,
        values: requestRefund.form.getValues(),
        submit: async (values: requestRefundSchema) => {
            await requestRefund.mutation.mutateAsync(values)
            escape_key();
        },
        requestCancelRefund
    }
}

const RequestRefundForm : React.FC<Props> = (props) => {
    const bl = useBL(props)

    return (
        <Form {...bl.form}>
            <form onSubmit={bl.form.handleSubmit(bl.submit)}>
                <h2 className="text-lg font-bold"> Request refund </h2>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Refund Quantity</TableHead>
                            <TableHead>Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {bl.form.getValues().lines.map((line, idx) => (
                            <TableRow key={line.id}>
                                <TableCell>{line.descriptor}</TableCell>
                                <TableCell><CurrencySpan withAnimation={false} value={line.price} /></TableCell>
                                { line.refund_status != null && line.refund_status == "FULL" ?
                                    <TableCell className="text-center" colSpan={3}>{capitalize(line.refund_status)} Refund</TableCell>    
                                    :
                                    <>
                                        <TableCell>{line.quantity}</TableCell>
                                        <TableCell>
                                            <FormField
                                                control={bl.form.control}
                                                name={`lines.${idx}.refund_quantity`}
                                                render={({field}) => (
                                                    <FormItem className="flex flex-row space-y-0">
                                                        <FormControl>
                                                            <Input aria-label="input-refundQuantity" {...field} value={field.value ?? ""} />
                                                        </FormControl>
                                                    </FormItem>
                                                )} />
                                        </TableCell>
                                        <TableCell>
                                            <CurrencySpan value={{
                                                amount: (line.quantity - line.refund_quantity) * line.price.amount,
                                                currency: line.price.currency
                                            }} />
                                        </TableCell>
                                    </>
                                }
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <div className=" flex flex-row space-x-2 mt-2">
                    <CancelDialogButton/>
                    {false && (  
                        <Button
                            className="w-full"
                            aria-label="button-cancelRefund"
                            onClick={async () => {
                                await bl.requestCancelRefund.mutation.mutateAsync()
                                escape_key()
                            }}>Cancel Refund</Button>
                    )}
                    <Button 
                        className="w-full" 
                        type="submit"
                        aria-label="button-confirmRefund"> Confirm </Button>
                </div>
            </form>
        </Form>
    )
}

export default RequestRefundForm;
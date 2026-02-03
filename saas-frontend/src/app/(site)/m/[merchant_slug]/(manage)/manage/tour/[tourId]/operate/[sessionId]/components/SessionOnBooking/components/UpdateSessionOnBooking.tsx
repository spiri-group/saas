'use client';

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { currency_amount_type, order_type, recordref_type } from "@/utils/spiriverse";
import { v4 as uuid } from "uuid"

import UseUpdateTourBooking, { updateBookingForm_type } from "../hooks/UseUpdateTourBooking";
import CurrencyInput from "@/components/ux/CurrencyInput";
import CurrencySpan from "@/components/ux/CurrencySpan";
import { Dialog, DialogHeader, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import RefundInput from "@/components/ux/RefundInput";
import { escape_key, groupBy } from "@/lib/functions";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { CircleHelp } from "lucide-react";
import { DateTime } from "luxon";
import { cn } from "@/lib/utils";
import CancelDialogButton from "@/components/ux/CancelDialogButton";
import UseRequestRejectRefund from "../../../../../../../../../../../components/RequestRefund/hooks/UseRejectRequestRefund";
import { Checkbox } from "@/components/ui/checkbox";

type Props = BLProps & {
    
}

type BLProps = {
    sessionRef: recordref_type,
    bookingRef: recordref_type,
    order: order_type | undefined
}

const useBL = (props: BLProps) => {

    const updateBooking = UseUpdateTourBooking(props.sessionRef, props.bookingRef)
    const rejectRequestRefund = props.order == null ? null : UseRequestRejectRefund(props.order.ref)
    
    return {
        form: updateBooking.form,
        values: updateBooking.form.getValues(),
        submit: async (values: updateBookingForm_type) => {
            await updateBooking.mutation.mutateAsync(values)
            escape_key()
        },
        rejectRequestRefund
    }
}

const UpdateSessionOnBooking : React.FC<Props> = (props) => {
    const bl = useBL(props);
    
    return (
        <>
            <Form {...bl.form}>
                <div className="flex flex-row">
                    <DialogHeader>Update booking</DialogHeader>
                </div>
                {bl.values.tickets != undefined && (
                <form onSubmit={bl.form.handleSubmit(bl.submit)} className="flex flex-col h-full">
                    <div className="lg:flex-grow">
                            {props.order != null && <span className="-mt-2 text-sm">Order code: {props.order.code}</span>}
                        <div className="flex flex-row items-center justify-between">
                            <FormLabel>Tickets</FormLabel>
                            <Button variant="link" onClick={() => {
                                const {notes, tickets} = bl.form.getValues()
                                bl.form.reset({
                                    notes: notes,
                                    tickets: 
                                    [...tickets, {
                                        person: `Person ${tickets.length + 1 }`,
                                        id: uuid(),
                                        index: tickets.length,
                                        status: {
                                            label: "CREATED",
                                            triggeredBy: undefined
                                        },
                                        price: undefined,
                                        refund: {
                                            amount:0,
                                            currency: "AUD"
                                        },
                                        dirty: true
                                    }]
                                })
                            }}> Add new </Button>
                        </div>
                        {bl.values.tickets.map((ticket, idx) => {
                            const ticket_price = {
                                amount: ticket.price == null ? 0 : ticket.price.amount - (ticket.refund ? ticket.refund.amount : 0),
                                currency: ticket.price == null ? "AUD" : ticket.price.currency
                            } as currency_amount_type

                            const price_log_grouped = groupBy(ticket.price_log,
                                (logEntry) => DateTime.fromISO(logEntry.datetime).toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY)
                            )
                            const price_log_grouped_array = 
                                Array.from(price_log_grouped).map(([name, value]) => ({name, value}))

                            const refund_request = ticket.refund_request_log?.find(x => x.status == "PENDING")

                            return (
                            <div key={ticket.id} className="flex flex-col lg:flex-row mt-2 space-x-2">
                                <FormField 
                                    control={bl.form.control}
                                    name={`tickets.${idx}.person`}
                                    render={({ field }) => (
                                    <FormItem className="flex flex-row space-x-6 items-center">
                                        <FormControl>
                                            <Input placeholder="Person" 
                                                {...field}
                                                onChange={(value) => {
                                                    field.onChange(value)
                                                    bl.form.setValue(`tickets.${idx}.dirty`, true, { shouldValidate : true })
                                                }} />
                                        </FormControl>
                                    </FormItem>
                                )} />
                                <HoverCard>
                                    <HoverCardTrigger asChild>
                                        <div className="flex flex-row space-x-2 mt-6">
                                            <CircleHelp size={14} />
                                        </div>
                                    </HoverCardTrigger>
                                    <HoverCardContent className="w-64 flex flex-col text-sm">
                                        <>
                                            {price_log_grouped_array.map((entry) =>{
                                                const {name, value} = entry;
                                                return (
                                                    <>
                                                        <span>{name}</span>
                                                        {value.map(({price, type, status}, index) => (
                                                            <div key={index} className="flex flex-row space-x-2">
                                                                <span>{type.toLowerCase() as string}</span> 
                                                                <span>of</span>
                                                                <CurrencySpan 
                                                                    className={cn("", type == "REFUND" ? "text-red-500" : "text-green-600")} 
                                                                    value={price as currency_amount_type} 
                                                                />
                                                                <span className="ml-auto"> {status.toLowerCase() as string} </span>
                                                            </div>
                                                        ))}
                                                    </>
                                                )
                                            })}
                                        </>
                                    </HoverCardContent>
                                </HoverCard>
                                {ticket.status.label == "PAID" ?
                                    (<div className="p-3">
                                        <CurrencySpan value={ticket_price} />
                                        <span className="ml-2">
                                            {ticket.status.triggeredBy == "MERCHANT" && ticket.stripe.charge == null ? 
                                                "Paid externally" : 
                                                (refund_request != null) && 
                                                    ( 
                                                    <Dialog>
                                                        <DialogTrigger>
                                                        <Button type="button">
                                                            {refund_request != null ? "Change" : "Refund"}
                                                        </Button>
                                                        </DialogTrigger>
                                                        <DialogContent>
                                                            <FormField
                                                                name={`tickets.${idx}.refund`}
                                                                control={bl.form.control}
                                                                render={({ field }) => (
                                                                    <RefundInput
                                                                        originalAmount={ticket.price}
                                                                        {...field}
                                                                        onChange={(value) => {
                                                                            field.onChange(value, {shouldValidate: true})
                                                                            bl.form.setValue(`tickets.${idx}.dirty`, true, { shouldValidate : true })
                                                                        }}
                                                                    />
                                                                )}
                                                            />
                                                        </DialogContent>
                                                    </Dialog>
                                                )}
                                        </span>
                                    </div>) :
                                    (<FormField 
                                        control={bl.form.control}
                                        name={`tickets.${idx}.price`} 
                                        render={({ field }) => (
                                        <FormItem className="flex flex-row space-x-4 items-center">
                                            <FormControl>
                                                <CurrencyInput 
                                                    placeholder="Amount" 
                                                    {...field}
                                                    onChange={(value) => {
                                                        field.onChange(value)
                                                        bl.form.setValue(`tickets.${idx}.dirty`, true, { shouldValidate : true })
                                                    }} />
                                            </FormControl>
                                        </FormItem>
                                    )} />) 
                                }
                            </div>
                            )
                        })}
                    </div>
                    {props.order == null && (
                        <FormField
                            control={bl.form.control}
                            name="requirePayment"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center ml-auto">
                                    <FormControl>
                                        <Checkbox
                                            className="mr-2 mt-2"
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <FormLabel>Require payment</FormLabel>
                                </FormItem>
                            )}
                        />
                    )}
                    <FormField 
                        name="notes"
                        control={bl.form.control} 
                        render={({ field }) => (
                        <FormItem className="flex flex-row space-x-6 items-center">
                            <FormLabel>Notes</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Any comments for the booking" {...field} value={field.value ?? ""} />
                                </FormControl>
                        </FormItem>
                    )} />
                    <div className="grid grid-cols-2 space-x-2 mt-2">
                        <CancelDialogButton />
                        { bl.rejectRequestRefund != null ?  
                            <div className="grid grid-cols-2 space-x-2">
                                <Button 
                                    aria-label="button-rejectRefund"
                                    onClick={async () => {
                                        if (bl.rejectRequestRefund != null) {
                                            await bl.rejectRequestRefund.mutation.mutateAsync()
                                            escape_key()
                                        }
                                    }}> Reject </Button>
                                <Button 
                                    disabled={!bl.form.formState.isValid} 
                                    type="submit"
                                    aria-label="button-approveRefund">Approve</Button>
                            </div> : 
                            <Button type="submit" aria-label="button-updateSessionOnBooking">Update</Button> 
                        }
                    </div>
                </form>
                )}
            </Form>
        </> 
    )
}

export default UpdateSessionOnBooking
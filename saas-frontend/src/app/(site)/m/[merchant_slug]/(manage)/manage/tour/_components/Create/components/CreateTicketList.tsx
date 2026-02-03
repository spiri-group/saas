'use client';

import z from 'zod';
import { v4 as uuid } from 'uuid';
import { Input } from '@/components/ui/input';
import { ControllerRenderProps, useForm } from "react-hook-form"
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { getCurrencySymbols } from '@/lib/functions';
import CurrencyInput from 'react-currency-input-field';
import { Button } from '@/components/ui/button';
import classNames from 'classnames';

type Ticket = z.infer<typeof ticketSchema>;
type TicketList = z.infer<typeof ticketListSchema>;

export const ticketSchema = z.object({
    id: z.string().uuid(),
    price: z.number(),
    name: z.string(),
    peopleCount: z.coerce.number(),
    currency: z.string()
})

export const ticketListSchema = z.object({
    id: z.string().uuid(),
    tickets: z.array(ticketSchema)
})

type TicketFormProps = TicketFormBLProps & {
    name?: string
}

type TicketFormBLProps = {
    onSubmit: (ticket: Ticket) => void,
    currency: string
}

const useBL = (props) => {
    const form = useForm<Ticket>({
        resolver: zodResolver(ticketSchema),
        defaultValues: {
            id: uuid(),
            currency: props.currency,
            peopleCount: 1
        }
    })

    if (props.form != null && props.index == null) {
        throw new Error("if form is provided, index must be provided")
    }

    return {
        form,
        save: async (values: Ticket) => {
            props.onSubmit(values)
            // reset the form but it needs a new id
            form.reset({
                id: uuid()
            })
        }
    }
}

const TicketForm: React.FC<TicketFormProps> = (props) => {
    const bl = useBL(props);

    const Controls = (
        <div className="flex flex-row items-center space-x-2">
            <FormField
                name={`${props.name ?? ""}peopleCount`}
                render={({ field }) => {
                    return (
                        <FormItem className="flex-none w-32">
                            <FormControl>
                                <Input {...field} value={field.value ?? ""} placeholder="count" type="number" min={0} />
                            </FormControl>
                        </FormItem>
                    )
                }} />
            <FormField
                name={`${props.name ?? ""}name`}
                render={({ field }) => {
                    return (
                        <FormItem className="flex-none w-36">
                            <FormControl>
                                <Input {...field} value={field.value ?? ""} placeholder="name (e.g. Adult)" type="text" />
                            </FormControl>
                        </FormItem>
                    )
                }} />
            <span>@</span>
            <FormField
                name={`${props.name ?? ""}price`}
                render={({field}) => {
                    return (
                        <FormItem className="flex-none w-20">
                            <FormControl>
                            <CurrencyInput
                                placeholder="price"
                                type="text"
                                defaultValue={0}
                                decimalsLimit={2}
                                value={field.value ?? ""}
                                className={"w-full border border-gray-200 rounded-md p-2"}
                                prefix={getCurrencySymbols("USD").prefix}
                                onValueChange={(value) => {
                                    if (value != null) {
                                        field.onChange(parseFloat(value))
                                    }
                                }} />
                            </FormControl>
                        </FormItem>
                    )
                }} />
        </div>
    )

    if (props.name != null) {
        return (
            <div>
                {Controls}
            </div>
        )
    } else {
        return (
            <Form {...bl.form}>
                <form className="flex flex-row space-x-3">
                    {Controls}
                    <Button 
                        onClick={bl.form.handleSubmit(bl.save)} 
                        className="flex-none w-20" 
                        type="button">
                            Confirm
                    </Button>
                </form>
            </Form>
        )
    }
}

type Props = ControllerRenderProps<{
    [key: string]: TicketList
}, any> & {
    currency: string,
    className?: string,
}

const CreateTicketList : React.FC<Props> = (props) => {

    const onSubmitTicket = (ticket: Ticket) => {
        if (props.value.tickets.find(t => t.id == ticket.id) != null) {
            return;
        } else {
            props.onChange({ ...props.value, tickets: props.value.tickets.concat(ticket) }, { shouldValidate: true, shouldDirty: true })
        }
    }

    return (
        <div className={classNames(props.className)}>
            <div className='flex flex-row items-center'>
                <FormLabel> Configure ticket catalogue </FormLabel>
                <span className="ml-auto text-muted-foreground opacity-60">{props.value.tickets.length} ticket choices</span>        
            </div>
            <FormDescription className="mt-2"> (e.g. 1 Adult @ $20, 2 Adults @ $35) </FormDescription>
            <div className="mt-2">
                <TicketForm onSubmit={onSubmitTicket} currency={props.currency} />
                <ul className="flex flex-col space-y-3 mt-3">
                    {props.value.tickets.map((ticket, index) => (
                        <li key={ticket.id}>
                            <TicketForm
                                name={`${props.name}.tickets.${index}.`}
                                currency={props.currency} 
                                onSubmit={onSubmitTicket} />
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}

export default CreateTicketList;
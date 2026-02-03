import { UseFormReturn } from "react-hook-form"
import { z } from "zod"
import UseSessionsForDate from "../hooks/UseSessionsForDate"
import UseViewTourDetails from "../hooks/UseViewTourDetails"
import { FormControl, FormField, FormItem } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { Panel } from "@/components/ux/Panel"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { cn } from "@/lib/utils"
import { DateTime } from "luxon"
import CurrencySpan from "@/components/ux/CurrencySpan"
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card"
import { CircleHelpIcon } from "lucide-react"

export const SessionSelection = z.object({
    ref: z.object({
        id: z.string().uuid(),
        partition: z.array(z.string())
    }),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    tickets: z.array(
        z.object({
            variantId: z.string().uuid(),
            quantity: z.coerce.number()
        })
    )
})

type BLProps = {
    form: UseFormReturn<any>,
    tourId: string,
    merchantId: string,
    date: string,
    ticketsRequired:number
}

type Props = BLProps & {
    
}

const useBL = (props: BLProps) => {

    const [ticketsSelected, changeTicketsSelected] = useState(0)

    const sessions = UseSessionsForDate(
        props.date,
        { id: props.tourId, partition: [props.merchantId]}
    )

    const tour = UseViewTourDetails(props.merchantId, props.tourId)

    const values = props.form.getValues().sessions

    // Initialize form with sessions and ticket variants
    if (sessions.data != null && tour.data != null && values == undefined) {
        props.form.reset({
            ...props.form.getValues(),
            sessions: sessions.data.map((session) => {
                return {
                    ref: session.ref,
                    date: session.date,
                    tickets: tour.data.ticketVariants.map((variant) => ({
                        variantId: variant.id,
                        quantity: 0
                    }))
                }
            })
        })
    }

    return {
        form: props.form,
        values,
        sessions: sessions.data,
        tour: tour.data,
        ticketsSelected: {
            get: ticketsSelected,
            set: changeTicketsSelected
        },
        ticketsRequiredMet: ticketsSelected == props.ticketsRequired
    }
}

const TicketSelectionComponent: React.FC<Props> = (props) => {
    const bl = useBL(props)

    if (!bl.tour || !bl.sessions || !bl.values) {
        return <div>Loading...</div>
    }

    const tour = bl.tour; // Extract to const to satisfy TypeScript

    return (
        <Carousel className={cn((bl.sessions?.length ?? 0) > 2 ? "mx-8" : "")}>
            <CarouselContent className="p-2">
            {bl.sessions.map((sessionFromDB, sidx) => {
                const session = bl.values!.find((s) => s.ref.id === sessionFromDB.ref.id);
                if (!session) return null;

                return (
                    <CarouselItem key={sidx} className="flex-none min-w-1/2 md:min-w-1/3 flex flex-col space-y-2">
                        <Panel className="w-full h-full">
                            <div className="flex flex-row space-x-1 items-center">
                                <HoverCard>
                                    <HoverCardTrigger asChild>
                                        <CircleHelpIcon size={14} />
                                    </HoverCardTrigger>
                                    <HoverCardContent className="w-64 flex flex-col text-sm p-4">
                                        <span className="text-sm flex-none">
                                            Location: {sessionFromDB.activityList && sessionFromDB.activityList.activities.length > 0
                                                ? sessionFromDB.activityList.activities[0].location.formattedAddress
                                                : ''}
                                        </span>
                                    </HoverCardContent>
                                </HoverCard>
                                <span className="text-sm flex-grow">
                                    {DateTime.fromISO(sessionFromDB.time.start).toLocaleString(DateTime.TIME_SIMPLE)} - {DateTime.fromISO(sessionFromDB.time.end).toLocaleString(DateTime.TIME_SIMPLE)}
                                </span>
                                <div className="ml-auto">
                                    <span
                                        aria-label="ticket-session-code"
                                        className="text-sm text-gray-500">
                                        {sessionFromDB.code}
                                    </span>
                                    <span className="text-xs text-gray-400 ml-2">
                                        ({sessionFromDB.capacity.remaining}/{sessionFromDB.capacity.max} available)
                                    </span>
                                </div>
                            </div>
                            <ul className="flex flex-col space-y-2 mt-2">
                                {session.tickets.map((ticket, tidx) => {
                                    const variant = tour.ticketVariants.find((v) => v.id === ticket.variantId);
                                    if (!variant) return null;

                                    return (
                                        <li key={variant.id} className="flex flex-row space-x-2 items-center">
                                            <div className="flex flex-col flex-none w-32">
                                                <span className="text-xs md:text-sm lg:text-base">{variant.name}</span>
                                                {variant.description && (
                                                    <span className="text-xs text-gray-500">{variant.description}</span>
                                                )}
                                            </div>
                                            <CurrencySpan className="flex-none w-24" value={variant.price} />
                                            <FormField
                                                name={`sessions.${sidx}.tickets.${tidx}.quantity`}
                                                control={props.form.control}
                                                render={({ field }) => {
                                                    return (
                                                        <FormItem className="flex-none w-40">
                                                            <FormControl>
                                                                <Input
                                                                    aria-label="input-bookTour-ticket"
                                                                    disabled={bl.ticketsRequiredMet && field.value == "0"}
                                                                    type="number"
                                                                    min={0}
                                                                    max={variant.inventory.track_inventory ? variant.inventory.qty_available : undefined}
                                                                    {...field}
                                                                    onChange={(e) => {
                                                                        // if the ticket selection has been met only allow the user to reduce the number of tickets
                                                                        if (bl.ticketsRequiredMet && parseInt(e.target.value) > parseInt(field.value)) return;

                                                                        field.onChange(e.target.value)
                                                                        const increment = parseInt(e.target.value) - parseInt(field.value)
                                                                        bl.ticketsSelected.set(bl.ticketsSelected.get + increment)

                                                                        bl.form.trigger();
                                                                    }}
                                                                />
                                                            </FormControl>
                                                        </FormItem>
                                                    )
                                                }} />
                                        </li>
                                    )
                                })}
                            </ul>
                        </Panel>
                    </CarouselItem>
                )
            })}
            </CarouselContent>
            { (bl.sessions?.length ?? 0) > 2 && <CarouselNext />}
            { (bl.sessions?.length ?? 0) > 2 && <CarouselPrevious />}
        </Carousel>
    )
}

export default TicketSelectionComponent
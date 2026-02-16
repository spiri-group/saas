'use client' 

import React, { useEffect, useState } from "react";
import { Panel, PanelContent } from "@/components/ux/Panel";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DateTime } from "luxon";
import CancelBookingForm from "../CancelBookingForm";
import CurrencySpan from "@/components/ux/CurrencySpan";
import { booking_type, order_type } from "@/utils/spiriverse";
import { cn } from "@/lib/utils";
import UseOrders, { query_fields } from "@/app/(site)/m/_components/Order/hooks/UseOrders";
import PaidStatusBadge from "@/components/ux/PaidStatusBadge";
import OrderDialog from "./_components/OrderDialog";
import useRealTimeArrayState from "@/components/utils/useRealTimeArray";
import { gql } from "@/lib/services/gql";
import { isNullOrUndefined } from "@/lib/functions";
import UseTourBookings from "@/app/(site)/u/[userId]/space/bookings/hooks/UseTourBookings";

type BLProps = {
    merchantId: string,
    customerId: string | undefined
}

type Props = BLProps & {
    className?: string
}

const useBL = (props: BLProps) => {

    // const servicePurchases = UseServiceBookings(props.customerId, props.merchantId)
    const tourPurchases = UseTourBookings(props.customerId, props.merchantId)
    const [updateBooking, setUpdateBooking] = useState<booking_type | null>(null)
    const customerOrders = UseOrders(undefined, props.customerId, undefined, props.merchantId)

    // real time
    const rt_customerOrders = useRealTimeArrayState({
        idFields: ["id", "customerEmail"],
        initialData: customerOrders.data ?? null,
        typeName: 'order',
        getRecord: async (id: string[]) => {
            const resp = await gql<{
                order: order_type
            }>(`query GetOrder($id: ID!, $customerEmail: String!) {
                order(id: $id, customerEmail: $customerEmail) {
                   ${query_fields}
                }
            }`, { id: id[0], customerEmail: id[1] })
            return resp.order;
        },
        group: `customer-${props.customerId}`
    })

    useEffect(() => {
        if (!isNullOrUndefined(customerOrders.data)) {
            rt_customerOrders.set(customerOrders.data)
        }
    }, [props.customerId, customerOrders])

    return {
        servicePurchases: {
            get: [] as any[]
        },
        tourPurchases: {
            get: tourPurchases.data ?? []
        },
        customerOrders: rt_customerOrders,
        updateBooking: {
            get: updateBooking,
            set: setUpdateBooking
        }
        
    }
}

const CustomerPurchases: React.FC<Props> = (props) => {

    const bl = useBL(props as BLProps);

    type selection_type = (order_type | booking_type) & { type: 'order' | 'booking' }
    const [selectedPurchase, setSelectedPurchase] = useState<selection_type | null>(null)

    return (
        <>
            <Panel className={cn("flex flex-col", props.className)}>
                <h1 className="text-xl font-bold mb-3">Their Purchases</h1>
                {props.customerId ? (
                    <>
                        <ul className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 grid-rows-auto flex-wrap w-full gap-3">
                            {bl.tourPurchases.get.map((customerTourBooking) => {
                                return (
                                    <li key={customerTourBooking.ref.id}>
                                        <Panel className="p-4">
                                            <span>Order code: {customerTourBooking.code}</span>
                                            <Button variant="link">Update booking</Button>
                                            <Button variant="link">Change day</Button>
                                        </Panel>
                                    </li>
                                )
                            })}
                            {bl.servicePurchases.get.length > 0 && bl.servicePurchases.get.map((customerServiceBooking) => {
                                return (
                                    <li key={customerServiceBooking.ref.id}>
                                        <Panel className="p-2 flex flex-row space-x-4">
                                            <div className="flex flex-col space-y-2">
                                                <span>{customerServiceBooking.service.name}</span>
                                                <span className="text-sm text-slate-400">Invoice #{customerServiceBooking.stripe.invoiceNumber}</span>
                                                <CurrencySpan value={customerServiceBooking.stripe.totalDue} />
                                            </div>
                                            <div className="flex flex-col ml-auto space-y-2">
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button> View </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="flex flex-row p-4">
                                                        <div className="flex flex-col">
                                                            <span>{customerServiceBooking.service.name} </span> 
                                                            <span className="text-sm text-slate-400">Invoice #{customerServiceBooking.stripe.invoiceNumber}</span>
                                                            <div className="flex flex-row">
                                                                <span>{DateTime.fromISO(customerServiceBooking.date).toLocaleString(DateTime.DATE_MED)}</span>,<span>{DateTime.fromISO(customerServiceBooking.time.start).toLocaleString(DateTime.TIME_24_SIMPLE)} - {DateTime.fromISO(customerServiceBooking.time.end).toLocaleString(DateTime.TIME_24_SIMPLE)} ({customerServiceBooking.service.duration.amount})</span>
                                                            </div>
                                                            {/* <div className="flex flex-col">
                                                                <span>{customerServiceBooking.service.type}</span>
                                                                {customerServiceBooking.service.type === 'in_person' && (
                                                                    <span>{customerServiceBooking.service.location.place.formattedAddress}</span>
                                                                )}
                                                                {customerServiceBooking.service.location.type === 'online' && (
                                                                    <div className="flex flex-row">
                                                                        <span>{customerServiceBooking.service.location.meeting_link}</span>,
                                                                        <span>{customerServiceBooking.service.location.meeting_passcode}</span>
                                                                    </div>
                                                                )}
                                                            </div>   */}
                                                        </div>
                                                        <div className="flex flex-col ml-auto">
                                                            <Dialog>
                                                                <DialogTrigger asChild>
                                                                    <Button variant="link"> Change Day / Time </Button>
                                                                </DialogTrigger>
                                                                <DialogContent className="flex flex-col flex-grow h-[550px]">
                                                                </DialogContent>
                                                            </Dialog>
                                                            <Button variant="link"> Change location </Button>
                                                        </div>
                                                    </DialogContent>
                                                    </Dialog>
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button> Refund </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="flex flex-col p-6">
                                                        <CancelBookingForm 
                                                            bookingId={customerServiceBooking.ref.id}
                                                            userId={customerServiceBooking.ref.partition[1]}
                                                            type="SERVICE" />
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                        </Panel>
                                    </li>
                                )   
                            })}
                            {bl.customerOrders.get.length > 0 && bl.customerOrders.get.map((order) => {
                                return (
                                    <li key={order.id}>
                                        <Panel className="p-4" style={{height: 320, width: "100%"}}>
                                            <PanelContent className="flex flex-col h-full">
                                                <div className="flex flex-row justify-between items-center mb-2">
                                                    <span className="font-bold text-xl">{order.code}</span>
                                                    <PaidStatusBadge className="text-md " status={order.paid_status} />
                                                </div>
                                                <div className="space-y-2 flex flex-col flex-grow">
                                                    <span>
                                                        Ordered: {DateTime.fromISO(order.createdDate).toLocaleString({ weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </span>
                                                    <div className="flex-grow bg-slate-50 rounded-xl p-3">
                                                        <span className={cn("font-semibold text-slate-500 mb-3 text-sm py-2")}>Item Summary</span>
                                                        <p className="line-clamp-3 text-sm">
                                                        {Array
                                                            .from(new Set(order.lines.map((line) => line.descriptor)))
                                                            .map((descriptor) => {
                                                                const quantity = order.lines
                                                                    .filter((line) => line.descriptor === descriptor)
                                                                    .reduce((sum, line) => sum + line.quantity, 0);
                                                                return `${quantity} x ${descriptor}`;
                                                            })
                                                            .join(", ")}
                                                        </p>
                                                    </div>
                                                    <Button 
                                                        onClick={() => setSelectedPurchase({...order, type: 'order'})}
                                                        type="button" 
                                                        variant="default">
                                                        Open Order
                                                    </Button>
                                                </div>
                                            </PanelContent>
                                        </Panel>
                                    </li>
                                )
                            })}
                        </ul>
                    </>
                    ) : (
                    <>
                        <span>Please select a customer first.</span>
                    </>   
                )}
            </Panel>
            <Dialog open={selectedPurchase != null}>
                {
                    selectedPurchase != null && selectedPurchase.type == "order" ? (
                        <OrderDialog 
                            order={{
                                ref: selectedPurchase.ref,
                                id: selectedPurchase.id,
                                customerEmail: selectedPurchase.customerEmail
                            }} 
                            abortDialog={() => setSelectedPurchase(null)}
                            />
                    ) : <></>
                }
            </Dialog>
            {/* <Dialog open={bl.updateBooking.get != null} onOpenChange={() => bl.updateBooking.set(null)}>
                <DialogContent className="flex flex-col p-8 min-w-[450px] min-h-[330px] mt-2">
                    {bl.updateBooking.get != null &&
                        <UpdateBooking 
                            gql_conn={props.gql_conn}
                            sessionRef={bl.}
                            bookingRef={bl.updateBooking.get.ref as recordref_type}
                            order={bl.updateBooking.get.order}
                        />
                    }
                </DialogContent>
            </Dialog> */}
        </>
    )
}

export default CustomerPurchases;
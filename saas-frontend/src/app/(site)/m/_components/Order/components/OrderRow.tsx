'use client'


import { order_type } from "@/utils/spiriverse"
import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import CurrencySpan from "@/components/ux/CurrencySpan"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@radix-ui/react-collapsible"
import { ChevronsUpDown, CircleHelp } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import PaidStatusBadge from "@/components/ux/PaidStatusBadge"
import { Dialog } from "@/components/ui/dialog"
import RefundOrderForm from "@/app/(site)/components/RequestOrder"
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTrigger } from "@/components/ui/drawer"

type BLProps = {
    page: 'trackCase' | 'case' | 'orders'
}

type Props = BLProps & {
    order: order_type,
    setSelectedOrder?: (order: order_type) => void
}

const useBL = () => {
    const [selectedOrderForRefund, setSelectedOrderForRefund] = useState<order_type | null>(null)

    return {
        selectedOrderForRefund: {
            get: selectedOrderForRefund,
            set: setSelectedOrderForRefund
        },
    }
}

const OrderRow : React.FC<Props> = (props) => {
    const bl = useBL();

    return (  
        <>
            <div className="hidden md:block">
            <Card className="flex flex-col">
                <CardHeader className="flex flex-row items-center">
                    <div className="flex flex-row space-x-2">
                        <span>{props.order.code}</span>
                        <span>-</span>
                        <HoverCard>
                            <HoverCardTrigger asChild>
                                <div className="flex flex-row space-x-3">
                                    <span> Due: </span>
                                    <CurrencySpan value={props.order.paymentSummary.due.total} />
                                    <CircleHelp size={14} className="mt-1" />
                                </div>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-64 flex flex-col text-sm">
                                <div className="flex flex-row space-x-2">
                                    <span>Subtotal:</span><CurrencySpan value={props.order.paymentSummary.due.subtotal} />
                                </div>
                                <div className="flex flex-row space-x-2">
                                    <span>Fees:</span><CurrencySpan value={props.order.paymentSummary.due.fees} />
                                </div>
                                <div className="flex flex-row space-x-2">
                                    <span>Total:</span><CurrencySpan value={props.order.paymentSummary.due.total} />
                                </div>
                            </HoverCardContent>
                        </HoverCard>
                        <HoverCard>
                            <HoverCardTrigger asChild>
                                <div className="flex flex-row space-x-3">
                                    <span> Paid: </span>
                                    <CurrencySpan value={props.order.paymentSummary.due.total} />
                                    <CircleHelp size={14} className="mt-1" />
                                </div>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-64 flex flex-col text-sm">
                                <p>TODO: TRAVIS FIX THIS</p>
                                {/* <div className="flex flex-row space-x-2">
                                    <span>Charged:</span><CurrencySpan value={props.order.paymentSummary.charged.paid} />
                                </div> */}
                                {/* <div className="flex flex-row space-x-2">
                                    <span>Refunded:</span><CurrencySpan value={props.order.paymentSummary.charged.ref} />
                                </div> */}
                                {/* <div className="flex flex-row space-x-2">
                                    <span>Total:</span><CurrencySpan value={props.order.balancePaid.total} />
                                </div> */}
                            </HoverCardContent>
                        </HoverCard>
                    </div>
                    {props.page === 'trackCase' ?
                        props.order.paid_status === 'AWAITING_PAYMENT' ? (
                            <Button variant="default" className="ml-auto" onClick={() => {
                                if (props.setSelectedOrder) {
                                    props.setSelectedOrder(props.order);
                                }
                            }}>Pay now</Button>
                        ) : (
                            <div className="ml-auto">
                                <PaidStatusBadge status={props.order.paid_status} />
                            </div>
                        ) : (
                        props.order.paid_status === 'AWAITING_PAYMENT' ? (
                            <Button variant="default" className="ml-auto">Send payment link</Button>
                        ) : (
                            <div className="ml-auto">
                                <PaidStatusBadge status={props.order.paid_status} />
                            </div>
                        )
                    )}
                    {["PAID", "PARTIAL_REFUND"].includes(props.order.paid_status) && (
                        <div className="flex flex-col space-y-2">
                            { props.page === 'case' &&   
                                <Button variant="link" onClick={() => bl.selectedOrderForRefund.set(props.order)}>
                                    Refund
                                </Button>
                            }
                        </div>
                    )}
                </CardHeader>
                <CardContent className="-mt-4">
                    <Collapsible className="flex flex-col w-full">
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" className="w-full">
                                <span>Lines</span>
                                <ChevronsUpDown className="h-4 w-4 ml-auto" />
                            </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="flex flex-col pl-4">
                            {props.order.lines.map((line) => {
                                return (
                                    <div className="flex flex-row text-sm" key={line.id}>
                                        <p className="leading-6">{line.descriptor}</p>
                                        <div className="flex flex-row space-x-2 ml-auto pr-6">
                                            <span>Original Quantity: {line.quantity}</span>
                                            <span>Current Fee:</span><CurrencySpan className="flex-none" value={line.price} />
                                        </div>
                                    </div>
                                );
                            })}
                        </CollapsibleContent>
                    </Collapsible>
                </CardContent>
            </Card>
            <Dialog open={bl.selectedOrderForRefund.get != null} onOpenChange={() => bl.selectedOrderForRefund.set(null)}>
                {bl.selectedOrderForRefund.get != null && 
                    <RefundOrderForm order={bl.selectedOrderForRefund.get}/>
                }
            </Dialog>
            </div>
            <div className="block md:hidden"> 
                <div className="block flex flex-col space-y-2 border-2 border-black p-2 rounded-md md:hidden">
                    <div className="flex flex-row space-x-2">
                        <span>{props.order.code}</span>
                        <span>-</span>
                        <HoverCard>
                            <HoverCardTrigger asChild>
                                <div className="flex flex-row space-x-3">
                                    <span> Due: </span>
                                    <CurrencySpan value={props.order.paymentSummary.due.total} />
                                    <CircleHelp size={14} className="mt-1" />
                                </div>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-64 flex flex-col text-sm">
                                <div className="flex flex-row space-x-2">
                                    <span>Subtotal:</span><CurrencySpan value={props.order.paymentSummary.due.subtotal} />
                                </div>
                                <div className="flex flex-row space-x-2">
                                    <span>Fees:</span><CurrencySpan value={props.order.paymentSummary.due.fees} />
                                </div>
                                <div className="flex flex-row space-x-2">
                                    <span>Total:</span><CurrencySpan value={props.order.paymentSummary.due.total} />
                                </div>
                            </HoverCardContent>
                        </HoverCard>
                        {/* <HoverCard>
                            <HoverCardTrigger asChild>
                                <div className="flex flex-row space-x-3">
                                    <span> Paid: </span>
                                    <CurrencySpan value={props.order.balancePaid.total} />
                                    <CircleHelp size={14} className="mt-1" />
                                </div>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-64 flex flex-col text-sm">
                                <div className="flex flex-row space-x-2">
                                    <span>Charged:</span><CurrencySpan value={props.order.balancePaid.amount} />
                                </div>
                                <div className="flex flex-row space-x-2">
                                    <span>Refunded:</span><CurrencySpan value={props.order.balancePaid.refunded} />
                                </div>
                                <div className="flex flex-row space-x-2">
                                    <span>Total:</span><CurrencySpan value={props.order.balancePaid.total} />
                                </div>
                            </HoverCardContent>
                        </HoverCard> */}
                    </div>
                    {props.page === 'trackCase' ?
                        props.order.paid_status === 'AWAITING_PAYMENT' ? (
                            <Button variant="default" className="ml-auto" onClick={() => {
                                if (props.setSelectedOrder) {
                                    props.setSelectedOrder(props.order);
                                }
                            }}>Pay now</Button>
                        ) : (
                            <div className="ml-auto">
                                <PaidStatusBadge status={props.order.paid_status} />
                            </div>
                        ) : (
                        props.order.paid_status === 'AWAITING_PAYMENT' ? (
                            <Button variant="default" className="ml-auto">Send payment link</Button>
                        ) : (
                            <div className="ml-auto">
                                <PaidStatusBadge status={props.order.paid_status} />
                            </div>
                        )
                    )}
                </div>
                <Drawer>
                    <DrawerTrigger>
                        <Button variant="link" className="ml-auto"> See details </Button>
                    </DrawerTrigger>
                    <DrawerContent className="p-4 h-[95%]">
                        <DrawerHeader>
                            <span> Order </span>
                        </DrawerHeader>
                        <DrawerFooter className="grid grid-cols-2 gap-2">
                            <DrawerClose>
                                <Button variant="outline">Cancel</Button>
                            </DrawerClose>
                            {props.page === 'trackCase' ?
                                props.order.paid_status === 'AWAITING_PAYMENT' ? (
                                    <Button variant="default" className="ml-auto" onClick={() => {
                                        if (props.setSelectedOrder) {
                                            props.setSelectedOrder(props.order);
                                        }
                                    }}>Pay now</Button>
                                ) : (
                                    <div className="ml-auto">
                                        <PaidStatusBadge status={props.order.paid_status} />
                                    </div>
                                ) : (
                                props.order.paid_status === 'AWAITING_PAYMENT' ? (
                                    <Button variant="default" className="ml-auto">Send payment link</Button>
                                ) : (
                                    <div className="ml-auto">
                                        <PaidStatusBadge status={props.order.paid_status} />
                                    </div>
                                )
                            )}
                        </DrawerFooter>
                    </DrawerContent>
                </Drawer>
            </div>
        </>
    )
}

export default OrderRow;
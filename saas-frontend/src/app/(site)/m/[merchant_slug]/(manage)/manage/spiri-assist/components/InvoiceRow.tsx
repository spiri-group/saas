'use client'


import { order_type } from "@/utils/spiriverse"
import React from "react"
import { Button } from "@/components/ui/button"
import CurrencySpan from "@/components/ux/CurrencySpan"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@radix-ui/react-collapsible"
import { ChevronsUpDown, CircleHelp } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import PaidStatusBadge from "@/components/ux/PaidStatusBadge"

type BLProps = {
    gql_conn: gql_conn_type,
    caseId: string,
    page: 'trackCase' | 'case'
}

type Props = BLProps & {
    invoice: order_type,
    setSelectedInvoice?: (invoice: order_type) => void
}

const InvoiceRow : React.FC<Props> = (props) => {
    
    const due = props.invoice.paymentSummary.due

    return (  
        <>
            <Card className="flex flex-col">
                <CardHeader className="flex flex-row items-center">
                    <div className="flex flex-row space-x-2">
                        <span>{props.invoice.code}</span>
                        <span>-</span>
                        <HoverCard>
                            <HoverCardTrigger asChild>
                                <div className="flex flex-row space-x-3">
                                    <CurrencySpan value={due.total} />
                                    <CircleHelp size={14} className="mt-1"/>
                                </div>
                            </HoverCardTrigger>
                                <HoverCardContent className="w-64 flex flex-col text-sm">
                                    <div className="flex flex-row space-x-2">
                                        <span>Subtotal:</span><CurrencySpan value={due.subtotal} />
                                    </div>
                                    <div className="flex flex-row space-x-2">
                                        <span>Fees:</span><CurrencySpan value={due.fees} />
                                    </div>
                                    {props.invoice.discount && ( 
                                        <div className="flex flex-row space-x-2">
                                            <span>Discount:</span><CurrencySpan value={due.discount} />
                                        </div>
                                    )}
                                    <div className="flex flex-row space-x-2">
                                        <span>Tax:</span><CurrencySpan value={due.tax} />
                                    </div>
                                    <div className="flex flex-row space-x-2">
                                        <span>Total:</span><CurrencySpan value={due.total} />
                                    </div>
                                </HoverCardContent>
                        </HoverCard>
                    </div>
                    {props.page === 'trackCase' ? 
                        props.invoice.paid_status == 'AWAITING_PAYMENT' ? (
                            <Button variant="link" className="ml-auto" onClick={() => {
                                if (props.setSelectedInvoice) {
                                    props.setSelectedInvoice(props.invoice)
                                }
                            }}> Pay now</Button>
                        ) : (
                            <div className="ml-auto">
                                <PaidStatusBadge status={props.invoice.paid_status} />
                            </div>
                            
                        ) : (
                        props.invoice.paid_status == 'AWAITING_PAYMENT' ? (
                            <Button variant="default" className="ml-auto">Send payment link</Button>
                        ) : (
                            <div className="ml-auto">
                                <PaidStatusBadge status={props.invoice.paid_status} />
                            </div>
                        )
                    )}
                </CardHeader>
                <CardContent className="-mt-4">
                    <Collapsible className="flex flex-col w-full">
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full">
                            <span> Lines </span>
                            <ChevronsUpDown className="h-4 w-4 ml-auto" />
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="flex flex-col pl-4">
                        <>
                            <div key={props.invoice.id} className="mt-2">
                                {props.invoice.lines.map((line) => 
                                    <div key={line.id} className="flex flex-col">
                                        <div className="flex flex-row space-x-2">
                                            <span> Amount: </span><CurrencySpan className="flex-none" value={line.price_log[0].price}  />
                                            <span> Quantity: {line.quantity} </span>
                                        </div>
                                        <p className="leading-6 text-sm mt-2">{line.description}</p>
                                    </div>
                                )}
                            </div>
                        </>
                    </CollapsibleContent>
                    </Collapsible>
                </CardContent>
            </Card>
        </>
    )
}

export default InvoiceRow;
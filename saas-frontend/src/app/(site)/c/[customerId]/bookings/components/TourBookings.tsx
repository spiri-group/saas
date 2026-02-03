'use client'

import React, { useState } from "react"
import UseTourBookings from "../hooks/UseTourBookings";
import CurrencySpan from "@/components/ux/CurrencySpan";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ux/Panel";
import { CommunicationModeType, order_type } from "@/utils/spiriverse";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ChatControl from "@/components/ux/ChatControl";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronsUpDown, QrCode } from "lucide-react";
import { Drawer, DrawerTrigger, DrawerContent } from "@/components/ui/drawer";
import BookingQRCode from "@/components/ux/BookingQRCode";

type BLProps = {
    userId?: string,
    merchantId?: string
}

type Props = BLProps & {

}

const useBL = (props: BLProps) => {
    
    const tourBookings = UseTourBookings(props.userId, props.merchantId);
    const [selectedOrderForRefund, setSelectedOrderForRefund] = useState<order_type | null>(null)
    const [selectedOrderChat, setSelectedOrderChat] = useState<order_type | null>(null)

    return {
        tourBookings: {
            get: tourBookings.data ?? []
        },
        selectedOrderForRefund: {
            get: selectedOrderForRefund,
            set: setSelectedOrderForRefund
        },
        selectedOrderChat: {
            get: selectedOrderChat,
            set: setSelectedOrderChat
        }
    }
}

export const DrawerDialogMerchantChat: React.FC<Props> = (props) => {
    const bl = useBL(props)
    const [open, setOpen] = useState(false)
    const isDesktop = window.innerWidth >= 768;
  
    return (
      <>
            {isDesktop ? (
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button variant="link">Merchant Chat</Button>
                    </DialogTrigger>
                    <DialogContent className="flex flex-col flex-grow w-[500px]">
                        {bl.selectedOrderChat.get != null &&
                            <ChatControl
                                allowResponseCodes={false}
                                userId={props.userId}
                                vendorSettings={{ withUserName: false, withCompanyLogo: false, withCompanyName: false }}
                                forObject={bl.selectedOrderChat.get.ref}
                                withDiscussion={true}
                                withAttachments={true}
                                defaultMode={CommunicationModeType.PLATFORM}                            
                            />
                        }
                    </DialogContent>
                </Dialog>
            ) : (
            <Drawer open={open} onOpenChange={setOpen}>
                <DrawerTrigger asChild>
                    <Button variant="link">Merchant Chat</Button>
                </DrawerTrigger>
                <DrawerContent>
                    {bl.selectedOrderChat.get != null && 
                        <ChatControl
                            allowResponseCodes={false}
                            userId={props.userId}
                            vendorSettings={{ withUserName: false, withCompanyLogo: false, withCompanyName: false }}
                            forObject={bl.selectedOrderChat.get.ref}
                            withDiscussion={true}
                            withAttachments={true}
                            defaultMode={CommunicationModeType.PLATFORM}                            
                        />
                    }
                </DrawerContent>
            </Drawer>
            )}
      </>
    )
}

const TourBookings: React.FC<Props> = (props) => {
    const bl = useBL(props)

    return (
        <>
            <ul className="space-y-2">
                {
                    bl.tourBookings.get.map((tourBooking) => {
                        return (
                            <li key={tourBooking.ref.id}>
                                <Panel className="flex flex-row">
                                    <div>
                                        <span>Order code: {tourBooking.code}</span>
                                        <Collapsible className="flex flex-col w-full">
                                            <CollapsibleTrigger asChild>
                                                <div className="flex flex-row items-center justify-between space-x-2">
                                                    <Button variant="ghost" className="w-full p-2">
                                                        <span className="text-sm">Details</span>
                                                        <ChevronsUpDown className="h-4 w-4 ml-auto" />
                                                    </Button>
                                                </div>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent className="space-y-2 mt-2">
                                                {tourBooking.sessions.map((session, index) => {
                                                    return (
                                                        <ul key={index} className="flex flex-col flex-grow space-y-2">
                                                            {session.tickets.map((ticket) => (
                                                                <li key={ticket.id}>
                                                                    <span>{ticket.variantId}</span>
                                                                    <CurrencySpan value={ticket.price} />
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )
                                                })}
                                            </CollapsibleContent>
                                        </Collapsible>
                                    </div>
                                    <div className="flex flex-row items-center justify-between ml-auto space-x-2">
                                        {/* QR Code Dialog */}
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" size="sm" data-testid={`qr-code-btn-${tourBooking.code}`}>
                                                    <QrCode className="h-4 w-4 mr-1" />
                                                    QR Code
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-sm">
                                                <DialogHeader>
                                                    <DialogTitle>Booking Check-In Code</DialogTitle>
                                                </DialogHeader>
                                                <div className="flex justify-center py-4">
                                                    <BookingQRCode
                                                        bookingCode={tourBooking.code}
                                                        size={200}
                                                        label="Show this QR code at check-in"
                                                    />
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                        <DrawerDialogMerchantChat />
                                        {/* <Button variant="link" onClick={() => bl.selectedOrderChat.set(tourBooking.order)}>Merchant Chat</Button> */}
                                        {/* <div className="flex flex-col space-y-2">
                                            {tourBooking.order.refundRequest != null &&
                                                <RefundStatusBadge status={tourBooking.order.refundRequest.status} />
                                            }
                                            {   
                                                tourBooking.order.refundRequest == null || tourBooking.order.refundRequest.status != "FULL REFUND" &&
                                                <Button variant="link" onClick={() => bl.selectedOrderForRefund.set(tourBooking.order)}>
                                                    {has_pending_refund_request ? "Update refund request" : "Request refund" }
                                                </Button>
                                            }
                                        </div> */}
                                        {/* {
                                            tourBooking.order.refundRequest == null || tourBooking.order.refundRequest.status != "FULL REFUND" &&
                                            <>
                                                <Button variant="link">Change day</Button>
                                                <Button variant="link">Add tickets</Button>
                                            </>
                                        } */}
                                    </div>
                                </Panel>
                            </li>
                        )
                    })
                }
            </ul>
            {/* <Dialog open={bl.selectedOrderForRefund.get != null} onOpenChange={() => bl.selectedOrderForRefund.set(null)}>
                {bl.selectedOrderForRefund.get != null && 
                    <DialogContent className="flex flex-col w-[500px]">
                        <RequestRefundForm gql_conn={props.gql_conn} order={bl.selectedOrderForRefund.get}/>
                    </DialogContent>
                }
            </Dialog> */}
            {/* <Dialog open={bl.selectedOrderChat.get != null} onOpenChange={() => bl.selectedOrderChat.set(null)}>
                {bl.selectedOrderChat.get != null && 
                    <DialogContent className="flex flex-col flex-grow w-[500px]">
                        <ChatControl
                            allowResponseCodes={false}
                            userId={props.userId}
                            vendorSettings={{ withUserName: false, withCompanyLogo: false, withCompanyName: false }}
                            forObject={bl.selectedOrderChat.get.ref}
                            gql_conn={props.gql_conn}
                            withDiscussion={true}
                            withAttachments={true}
                            defaultMode={CommunicationModeType.PLATFORM}                            
                        />
                    </DialogContent>
                }
            </Dialog>     */}
        </>
    )
}

export default TourBookings;
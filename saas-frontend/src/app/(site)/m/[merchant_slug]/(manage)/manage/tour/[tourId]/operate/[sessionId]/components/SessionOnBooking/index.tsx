'use client'

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Panel } from "@/components/ux/Panel"
import { CommunicationModeType, booking_type, order_type, recordref_type } from "@/utils/spiriverse"
import { useParams } from "next/navigation"
import { ChevronDownCircleIcon, Mail, MessageCircle, Pencil, Phone } from "lucide-react"
import CopyButton from "@/components/ux/CopyButton"
import UseCreatePaymentLink from "./hooks/UseCreatePaymentLink"

import UseSessionBookings from "./hooks/UseSessionBookings"
import UseMarkBookingPaid from "./hooks/UseMarkBookingPaid"
import UseCheckInBooking from "../CheckIn/hooks/UseCheckInBooking"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import CurrencySpan from "@/components/ux/CurrencySpan"
import ChatControl from "@/components/ux/ChatControl"
import NewSessionOnBooking from "./components/NewSessionOnBooking"
import UpdateSessionOnBooking from "./components/UpdateSessionOnBooking"

/**
 * Helper to determine if a booking is paid.
 * For manual bookings (no order): check paid field or ticketStatus === COMPLETED
 * For order-based bookings: check order.paymentSummary.due.total.amount === 0
 */
const isBookingPaid = (booking: booking_type): boolean => {
    // Manual booking - check paid field or ticketStatus
    if (!booking.order) {
        // GraphQL returns string enum values, so we cast for comparison
        return booking.paid != null || String(booking.ticketStatus) === 'COMPLETED';
    }
    // Order-based booking - check payment summary
    return booking.order.paymentSummary?.due?.total?.amount === 0;
};

/**
 * Get the amount due for a booking.
 * For manual bookings without an order, returns the total amount if not paid.
 * For order-based bookings, returns the order due amount.
 */
const getAmountDue = (booking: booking_type) => {
    if (!booking.order) {
        // Manual booking - if paid, return 0, otherwise return total amount
        if (isBookingPaid(booking)) {
            return { amount: 0, currency: booking.totalAmount?.currency || 'AUD' };
        }
        return booking.totalAmount || { amount: 0, currency: 'AUD' };
    }
    // Order-based booking
    return booking.order.paymentSummary?.due?.total || { amount: 0, currency: 'AUD' };
};

const useBL = () => {
    const params = useParams<{ merchant_slug: string, tourId: string, sessionId: string}>();

    if (params == null) throw new Error("No params")

    // Extract merchant ID from slug (e.g., "my-shop-abc123" -> "abc123")
    const merchantId = params.merchant_slug?.split("-").pop() || "";

    const [createManualBookingOpen, setCreateManualBookingOpen] = useState<boolean>()
    const [selectedOrderRef, setSelectedOrderRef] = useState<recordref_type | null>(null)
    const [updateBooking, setUpdateBooking] = useState<booking_type | null>(null)

    const [selectedOrderChat, setSelectedOrderChat] = useState<order_type | null>(null)

    const sessionRef = {
        id: params.sessionId,
        partition: [merchantId, params.tourId],
        container: "Tour-Session"
    }
    const sessionWithBookings = UseSessionBookings(sessionRef)

    const markBookingAsPaid = UseMarkBookingPaid(sessionRef)
    const createPaymentLink = UseCreatePaymentLink(sessionRef)
    const checkInBooking = UseCheckInBooking(sessionRef)

    const handleCheckIn = async (booking: booking_type) => {
        if (!booking.code) return;

        try {
            await checkInBooking.mutateAsync({
                bookingCode: booking.code,
                sessionId: params.sessionId,
                vendorId: merchantId
            });
        } catch (error) {
            console.error("Failed to check in booking:", error);
        }
    };

    return {
        createManualBookingOpen,
        setCreateManualBookingOpen,
        sessionRef,
        bookings: sessionWithBookings.data == null ? [] : sessionWithBookings.data,
        selectedOrderRef: {
            get: selectedOrderRef,
            set: setSelectedOrderRef
        },
        updateBooking: {
            get: updateBooking,
            set: setUpdateBooking
        },
        markBookingAsPaid,
        createPaymentLink,
        selectedOrderChat: {
            get: selectedOrderChat,
            set: setSelectedOrderChat
        },
        merchantId,
        handleCheckIn,
        isCheckingIn: checkInBooking.isPending
    }
}

const SessionOnBooking : React.FC = () => {
    const bl = useBL();

    return (   
    <>
        <div className="h-full flex flex-col md:flex-row space-x-2">
            <Panel className="hidden md:block w-3/5">
                <div className="flex flex-row space-x-2 hidden md:block">
                    <Dialog open={bl.createManualBookingOpen} onOpenChange={bl.setCreateManualBookingOpen} >
                        <DialogTrigger asChild>
                            <Button variant="default" data-testid="create-booking-btn"> Create booking </Button>
                        </DialogTrigger>
                        <DialogContent className="flex flex-col p-8 max-w-lg max-h-[90vh] overflow-y-auto">
                            { bl.sessionRef != null && (
                                <NewSessionOnBooking 
                                    sessionRef={bl.sessionRef} />
                                )
                            }
                        </DialogContent>
                    </Dialog>
                    <Button variant="default"> Complete </Button>
                </div>
                <Table className="hidden md:block">
                    <TableHeader>
                        <TableRow className="text-xs md:text-base">
                            <TableHead className="text-center"> Owner </TableHead>
                            <TableHead className="text-center"> Checked In </TableHead>
                            <TableHead className="text-center"> Balance </TableHead>
                            <TableHead className="text-center"> Actions </TableHead>
                            <TableHead className="text-center"> Last Message </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <>
                            {
                                bl.bookings.map(booking => (
                                    <TableRow key={booking.id} className="w-full text-center items-center justify-between">
                                        <TableCell className="flex flex-col">
                                            <div className="flex flex-row space-x-2">
                                                <span> {booking.user.firstname} </span> 
                                                <span> {booking.user.lastname} </span>
                                            </div>
                                            <div className="grid grid-cols-3 grid-rows-auto md:gap-3 lg:gap-3 mt-3">
                                                <Button variant="link"><Phone height={18} /></Button>
                                                <Button variant="link"><Mail height={18} /></Button>
                                                <Button variant="link" onClick={() => { if (booking.order) bl.selectedOrderRef.set(booking.order.ref) }} disabled={!booking.order}><MessageCircle height={18} /></Button>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {booking.checkedIn == null ? (
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    onClick={() => bl.handleCheckIn(booking)}
                                                    disabled={bl.isCheckingIn}
                                                    data-testid={`check-in-${booking.id}`}
                                                >
                                                    Check In
                                                </Button>
                                            ) : (
                                                <span className="text-green-600 text-sm">{booking.checkedIn.datetime}</span>
                                            )}
                                        </TableCell>
                                        <TableCell
                                            className={cn(
                                                "hidden md:block",
                                                isBookingPaid(booking) ? "text-green-800" : "text-red-800 font-bold"
                                            )}
                                            data-testid={`booking-balance-${booking.id}`}
                                        >
                                            {isBookingPaid(booking)
                                                ? <span>Paid</span>
                                                : <CurrencySpan defaultLabel="" delay={500} value={getAmountDue(booking)} />
                                            }
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col hidden md:block" data-testid={`booking-actions-${booking.id}`}>
                                                {!isBookingPaid(booking) ? (
                                                    <>
                                                        {/* Show payment options for unpaid bookings */}
                                                        {booking.order && booking.payment_link != null
                                                            ? <CopyButton textToCopy={`${"http://localhost:3000"}/${booking.payment_link}`}>Copy payment link</CopyButton>
                                                            : booking.order && <Button variant="link" onClick={() => bl.createPaymentLink.mutation.mutate(booking.ref)} data-testid={`create-payment-link-${booking.id}`}> Create Payment Link </Button>}
                                                        <div className="grid grid-cols-2 grid-rows-auto gap-3">
                                                            <Button type="button" variant="link" onClick={() => bl.markBookingAsPaid.mutation.mutate(booking.ref)} data-testid={`mark-paid-${booking.id}`}>Mark paid</Button>
                                                            <Button variant="link" onClick={() => bl.updateBooking.set(booking)} data-testid={`update-booking-${booking.id}`}>Update</Button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        {/* Show change option for paid bookings */}
                                                        <Button variant="link" onClick={() => bl.updateBooking.set(booking)} data-testid={`change-booking-${booking.id}`}>
                                                            Change
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:block"> 
                                            Last Message: { booking.lastMessage == null ? "No messages" : booking.lastMessage.text } 
                                        </TableCell>
                                    </TableRow>
                                ))
                            }
                        </>
                    </TableBody>
                </Table>
            </Panel>
            <Panel className="flex-grow">
                {bl.selectedOrderRef.get != null ? 
                    <ChatControl
                        allowResponseCodes={false}
                        merchantId={bl.merchantId}
                        vendorSettings={{ withUserName: false, withCompanyLogo: false, withCompanyName: false }}
                        forObject={bl.selectedOrderRef.get}
                        withDiscussion={true}
                        defaultMode={CommunicationModeType.PLATFORM}
                        withAttachments={true}                            
                    /> : 
                    <>
                        <span> Please choose customer to show the chat </span>
                    </>
                }
            </Panel>
            <Dialog open={bl.updateBooking.get != null} onOpenChange={() => bl.updateBooking.set(null)}>
                <DialogContent className="flex flex-col p-8 min-w-[450px] min-h-[330px] mt-2">
                    {bl.updateBooking.get != null &&
                        <UpdateSessionOnBooking 
                            sessionRef={bl.sessionRef}
                            bookingRef={bl.updateBooking.get.ref as recordref_type}
                            order={bl.updateBooking.get.order}
                        />
                    }
                </DialogContent>
            </Dialog>
        </div>
        
        <div className="flex flex-col h-full bg-block lg:hidden">
            <Panel className="flex-grow">
                <ul>
                    <li>
                    {
                        bl.bookings.map(booking => (
                            <div key={booking.ref.id} className="flex flex-row space-x-2 mt-2" data-testid={`mobile-booking-row-${booking.id}`}>
                                <div className="flex flex-col text-xs">
                                    <div className="flex flex-row mb-2 space-x-1">
                                        <span> {booking.user.firstname} </span>
                                        <span> {booking.user.lastname} </span>
                                    </div>
                                    <div className="flex flex-row space-x-2">
                                        {/* Payment status dropdown */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="link"
                                                    className={cn(
                                                        "text-xs flex-none w-24 justify-start",
                                                        isBookingPaid(booking) ? "text-green-800 bg-green-100" : "text-red-600 bg-red-100"
                                                    )}
                                                    data-testid={`mobile-payment-status-${booking.id}`}
                                                >
                                                    <ChevronDownCircleIcon size={18} className="mr-2 flex-none" />
                                                    {isBookingPaid(booking)
                                                        ? "Paid"
                                                        : <CurrencySpan defaultLabel="" value={getAmountDue(booking)} delay={500} />
                                                    }
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                {!isBookingPaid(booking) && (
                                                    <DropdownMenuItem onClick={() => bl.markBookingAsPaid.mutation.mutate(booking.ref)}>
                                                        Mark as paid
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem onClick={() => bl.updateBooking.set(booking)}>
                                                    Edit booking
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        <Button
                                            variant="link"
                                            className={cn("text-xs flex-none w-24", !booking.checkedIn ? "bg-blue-100" : "text-green-800 bg-green-100")}
                                            onClick={() => !booking.checkedIn && bl.handleCheckIn(booking)}
                                            disabled={bl.isCheckingIn || !!booking.checkedIn}
                                            data-testid={`mobile-checkin-${booking.id}`}
                                        >
                                            {booking.checkedIn ? "Checked in" : "Check in"}
                                        </Button>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button className="bg-blue-100 text-primary">
                                                    <MessageCircle height={18} />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="items-center">
                                                <DropdownMenuItem>
                                                    <Phone height={18} />
                                                </DropdownMenuItem>
                                                <DropdownMenuItem>
                                                    <Mail height={18} />
                                                </DropdownMenuItem>
                                                <DropdownMenuItem>
                                                    <MessageCircle height={18} /> Direct Message
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        <Button variant="default" onClick={() => bl.updateBooking.set(booking)} data-testid={`mobile-edit-${booking.id}`}>
                                            <Pencil size={18} />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))
                    }
                    </li>
                </ul>
            </Panel>
            <Dialog open={bl.createManualBookingOpen} onOpenChange={bl.setCreateManualBookingOpen} >
                <DialogTrigger asChild>
                    <Button variant="default" className="w-full" data-testid="create-booking-btn-mobile"> Create booking </Button>
                </DialogTrigger>
                <DialogContent className="flex flex-col p-8 max-w-lg max-h-[90vh] overflow-y-auto">
                    { bl.sessionRef != null && (
                        <NewSessionOnBooking
                            sessionRef={bl.sessionRef} />
                        )
                    }
                </DialogContent>
            </Dialog>
            <Button variant="destructive" className="w-full"> Close session </Button>
        </div>
    </>
    )
}

export default SessionOnBooking;
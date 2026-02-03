'use client';

import React, { useState, useCallback, useEffect, useRef } from "react";
import { Panel, PanelHeader, PanelTitle, PanelDescription } from "@/components/ux/Panel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, XCircle, AlertCircle, Search, User, Ticket, Calendar, Clock, Loader2 } from "lucide-react";
import UseBookingByCode, { BookingWithDetails } from "./hooks/UseBookingByCode";
import UseCheckInBooking from "./hooks/UseCheckInBooking";
import { format } from "date-fns";
import { StatusType, recordref_type } from "@/utils/spiriverse";

type Props = {
    merchantId: string;
    sessionId: string;
    sessionRef: recordref_type;
};

const useBL = (props: Props) => {
    const [bookingCode, setBookingCode] = useState("");
    const [searchCode, setSearchCode] = useState("");
    const [checkInSuccess, setCheckInSuccess] = useState<string | null>(null);
    const [checkInError, setCheckInError] = useState<string | null>(null);

    const bookingQuery = UseBookingByCode(searchCode, props.merchantId, searchCode.length >= 6);
    const checkInMutation = UseCheckInBooking(props.sessionRef);

    const handleSearch = useCallback(() => {
        if (bookingCode.length >= 6) {
            setSearchCode(bookingCode);
            setCheckInSuccess(null);
            setCheckInError(null);
        }
    }, [bookingCode]);

    const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    }, [handleSearch]);

    const handleCheckIn = useCallback(async (booking: BookingWithDetails) => {
        // Use the session ID from props since we're already in the operate page for this session
        const sessionId = props.sessionId;

        try {
            const result = await checkInMutation.mutateAsync({
                bookingCode: booking.code,
                sessionId: sessionId,
                vendorId: props.merchantId,
            });

            if (result.success) {
                setCheckInSuccess(result.message);
                setCheckInError(null);
                // Clear the form after a short delay for next scan
                setTimeout(() => {
                    setBookingCode("");
                    setSearchCode("");
                    setCheckInSuccess(null);
                }, 3000);
            } else {
                setCheckInError(result.message);
            }
        } catch (error: any) {
            const errorMessage = error?.message || "Failed to check in booking";
            setCheckInError(errorMessage);
        }
    }, [checkInMutation, props.merchantId, props.sessionId]);

    const clearSearch = useCallback(() => {
        setBookingCode("");
        setSearchCode("");
        setCheckInSuccess(null);
        setCheckInError(null);
    }, []);

    return {
        bookingCode,
        setBookingCode,
        booking: bookingQuery.data,
        isLoading: bookingQuery.isLoading,
        isError: bookingQuery.isError,
        error: bookingQuery.error,
        handleSearch,
        handleKeyPress,
        handleCheckIn,
        isCheckingIn: checkInMutation.isPending,
        checkInSuccess,
        checkInError,
        clearSearch,
    };
};

const BookingDetails: React.FC<{
    booking: BookingWithDetails;
    onCheckIn: () => void;
    isCheckingIn: boolean;
}> = ({ booking, onCheckIn, isCheckingIn }) => {
    const isAlreadyCheckedIn = !!booking.checkedIn;
    const isPending = booking.ticketStatus === StatusType.AWAITING_PAYMENT;
    const isCancelled = booking.ticketStatus === StatusType.CANCELLED;

    const getTicketVariantName = (variantId: string) => {
        if (!booking.tourDetails?.ticketVariants) return "Unknown Ticket";
        const variant = booking.tourDetails.ticketVariants.find((v) => v.id === variantId);
        return variant?.name || "Unknown Ticket";
    };

    const totalTickets = booking.sessions?.reduce(
        (sum, session) => sum + session.tickets.reduce((tSum, t) => tSum + t.quantity, 0),
        0
    ) || 0;

    return (
        <div className="space-y-4">
            {/* Status Badges */}
            <div className="flex flex-wrap gap-2">
                {isAlreadyCheckedIn && (
                    <Badge variant="default" className="bg-green-600" data-testid="checked-in-badge">
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Checked In
                    </Badge>
                )}
                {isPending && (
                    <Badge variant="destructive" data-testid="payment-pending-badge">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        Payment Pending
                    </Badge>
                )}
                {isCancelled && (
                    <Badge variant="destructive" data-testid="cancelled-badge">
                        <XCircle className="w-4 h-4 mr-1" />
                        Cancelled
                    </Badge>
                )}
                {!isAlreadyCheckedIn && !isPending && !isCancelled && (
                    <Badge variant="outline" className="border-yellow-500 text-yellow-600" data-testid="not-checked-in-badge">
                        Not Checked In
                    </Badge>
                )}
            </div>

            {/* Tour & Session Info */}
            {booking.tourDetails && (
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                    <h3 className="font-semibold text-lg" data-testid="tour-name">
                        {booking.tourDetails.name}
                    </h3>
                    {booking.sessionDetails && (
                        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2" data-testid="session-date">
                                <Calendar className="w-4 h-4" />
                                {booking.sessionDetails.date}
                            </div>
                            {booking.sessionDetails.time && (
                                <div className="flex items-center gap-2" data-testid="session-time">
                                    <Clock className="w-4 h-4" />
                                    {booking.sessionDetails.time.start} - {booking.sessionDetails.time.end}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <Separator />

            {/* Customer Info */}
            <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Customer Details
                </h4>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-1">
                    {booking.user && (
                        <p className="font-medium" data-testid="customer-name">
                            {booking.user.firstname} {booking.user.lastname}
                        </p>
                    )}
                    <p className="text-sm text-muted-foreground" data-testid="customer-email">
                        {booking.customerEmail}
                    </p>
                    {booking.user?.phoneNumber?.displayAs && (
                        <p className="text-sm text-muted-foreground" data-testid="customer-phone">
                            {booking.user.phoneNumber.displayAs}
                        </p>
                    )}
                </div>
            </div>

            <Separator />

            {/* Tickets */}
            <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                    <Ticket className="w-4 h-4" />
                    Tickets ({totalTickets})
                </h4>
                <div className="space-y-2" data-testid="tickets-list">
                    {booking.sessions?.map((session) =>
                        session.tickets.map((ticket) => (
                            <div
                                key={ticket.id}
                                className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 flex justify-between items-center"
                                data-testid={`ticket-${ticket.id}`}
                            >
                                <div>
                                    <p className="font-medium">{getTicketVariantName(ticket.variantId)}</p>
                                    {ticket.person && (
                                        <p className="text-sm text-muted-foreground">{ticket.person}</p>
                                    )}
                                </div>
                                <Badge variant="secondary">x{ticket.quantity}</Badge>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Check In Time (if already checked in) */}
            {isAlreadyCheckedIn && booking.checkedIn && (
                <>
                    <Separator />
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                        <p className="text-sm text-green-700 dark:text-green-400" data-testid="check-in-time">
                            Checked in at: {format(new Date(booking.checkedIn.datetime), "PPpp")}
                        </p>
                    </div>
                </>
            )}

            {/* Check In Button */}
            {!isAlreadyCheckedIn && !isPending && !isCancelled && (
                <Button
                    onClick={onCheckIn}
                    disabled={isCheckingIn}
                    className="w-full"
                    size="lg"
                    data-testid="check-in-btn"
                >
                    {isCheckingIn ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Checking In...
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Check In
                        </>
                    )}
                </Button>
            )}

            {/* Message for pending payment */}
            {isPending && (
                <Alert variant="destructive" data-testid="payment-required-alert">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Payment Required</AlertTitle>
                    <AlertDescription>
                        This booking has not been paid. The customer must complete payment before check-in.
                    </AlertDescription>
                </Alert>
            )}

            {/* Message for cancelled booking */}
            {isCancelled && (
                <Alert variant="destructive" data-testid="cancelled-alert">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Booking Cancelled</AlertTitle>
                    <AlertDescription>
                        This booking has been cancelled and cannot be checked in.
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
};

const CheckInComponent: React.FC<Props> = (props) => {
    const bl = useBL(props);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus the input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    return (
        <div className="space-y-4">
            <Panel>
                <PanelHeader>
                    <PanelTitle as="h2">Quick Check-In</PanelTitle>
                    <PanelDescription>
                        Enter a 6-digit booking code to check in guests for this session
                    </PanelDescription>
                </PanelHeader>

                {/* Search Input */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Input
                            ref={inputRef}
                            type="text"
                            placeholder="Enter booking code (e.g., 123456)"
                            value={bl.bookingCode}
                            onChange={(e) => bl.setBookingCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            onKeyDown={bl.handleKeyPress}
                            className="pr-10"
                            maxLength={6}
                            data-testid="booking-code-input"
                        />
                        {bl.bookingCode && (
                            <button
                                onClick={bl.clearSearch}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                data-testid="clear-search-btn"
                            >
                                <XCircle className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <Button
                        onClick={bl.handleSearch}
                        disabled={bl.bookingCode.length < 6 || bl.isLoading}
                        data-testid="search-btn"
                    >
                        {bl.isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Search className="w-4 h-4" />
                        )}
                    </Button>
                </div>
            </Panel>

            {/* Success Message */}
            {bl.checkInSuccess && (
                <Alert className="border-green-500 bg-green-50 dark:bg-green-900/20" data-testid="success-alert">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-700 dark:text-green-400">Success</AlertTitle>
                    <AlertDescription className="text-green-600 dark:text-green-300">
                        {bl.checkInSuccess}
                    </AlertDescription>
                </Alert>
            )}

            {/* Error Message */}
            {bl.checkInError && (
                <Alert variant="destructive" data-testid="error-alert">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{bl.checkInError}</AlertDescription>
                </Alert>
            )}

            {/* Loading State */}
            {bl.isLoading && (
                <Panel>
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                </Panel>
            )}

            {/* Booking Not Found */}
            {!bl.isLoading && bl.isError && (
                <Alert variant="destructive" data-testid="not-found-alert">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Booking Not Found</AlertTitle>
                    <AlertDescription>
                        No booking was found with code &quot;{bl.bookingCode}&quot;. Please check the code and try again.
                    </AlertDescription>
                </Alert>
            )}

            {/* Booking Details */}
            {!bl.isLoading && bl.booking && (
                <Panel data-testid="booking-details-panel">
                    <PanelHeader>
                        <div className="flex items-center justify-between">
                            <PanelTitle>Booking #{bl.booking.code}</PanelTitle>
                        </div>
                    </PanelHeader>
                    <BookingDetails
                        booking={bl.booking}
                        onCheckIn={() => bl.handleCheckIn(bl.booking!)}
                        isCheckingIn={bl.isCheckingIn}
                    />
                </Panel>
            )}
        </div>
    );
};

export default CheckInComponent;

"use client";

import { useState } from "react";
import { Calendar, Clock, Ticket, AlertCircle, CheckCircle2, XCircle, Mail, Loader2, Pencil, Plus, Minus } from "lucide-react";
import UseCustomerModifyBooking from "./hooks/UseCustomerModifyBooking";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import UsePublicBooking from "./hooks/UsePublicBooking";
import UseCustomerCancelBooking from "./hooks/UseCustomerCancelBooking";

interface BookingCancellationUIProps {
    bookingCode: string;
    merchantSlug: string;
}

function formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatTime(time: { start?: string; end?: string } | undefined): string {
    if (!time) return '';
    if (time.start && time.end) {
        return `${time.start} - ${time.end}`;
    }
    return time.start || '';
}

function getStatusBadge(status: string) {
    switch (status) {
        case 'CONFIRMED':
        case 'PAID':
        case 'COMPLETED':
            return <Badge data-testid="status-badge-confirmed" className="bg-green-500">Confirmed</Badge>;
        case 'AWAITING_PAYMENT':
            return <Badge data-testid="status-badge-pending" variant="secondary">Pending Payment</Badge>;
        case 'CANCELLED':
            return <Badge data-testid="status-badge-cancelled" variant="destructive">Cancelled</Badge>;
        default:
            return <Badge data-testid="status-badge-other" variant="outline">{status}</Badge>;
    }
}

function ModifyBookingSection({ booking, bookingCode, merchantSlug }: { booking: any; bookingCode: string; merchantSlug: string }) {
    const { data: session } = useSession();
    const [isEditing, setIsEditing] = useState(false);
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [verifyEmail, setVerifyEmail] = useState('');
    const modifyMutation = UseCustomerModifyBooking();

    // Auto-fill email from session if logged in
    const isLoggedIn = !!session?.user?.email;
    const effectiveEmail = isLoggedIn ? session.user.email! : verifyEmail;

    // Initialize quantities from current booking
    const startEditing = () => {
        const initial: Record<string, number> = {};
        booking.tickets.forEach((t: any) => {
            initial[t.variantId || t.variantName] = t.quantity;
        });
        setQuantities(initial);
        setIsEditing(true);
    };

    const hasChanges = () => {
        return booking.tickets.some((t: any) => {
            const key = t.variantId || t.variantName;
            return quantities[key] !== undefined && quantities[key] !== t.quantity;
        });
    };

    const calculatePriceDiff = () => {
        let diff = 0;
        booking.tickets.forEach((t: any) => {
            const key = t.variantId || t.variantName;
            const newQty = quantities[key] ?? t.quantity;
            const qtyDiff = newQty - t.quantity;
            diff += qtyDiff * t.price.amount;
        });
        return diff;
    };

    const handleSubmit = async () => {
        const ticketChanges = booking.tickets.map((t: any) => ({
            variantId: t.variantId || t.variantName,
            newQuantity: quantities[t.variantId || t.variantName] ?? t.quantity
        }));

        await modifyMutation.mutateAsync({
            bookingCode,
            customerEmail: effectiveEmail,
            merchantSlug,
            ticketChanges
        });
        setIsEditing(false);
    };

    if (modifyMutation.isSuccess) {
        return (
            <Alert className="bg-green-50 border-green-200 mb-6" data-testid="modify-success-alert">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Booking Updated</AlertTitle>
                <AlertDescription className="text-green-700">
                    {modifyMutation.data.message}
                </AlertDescription>
            </Alert>
        );
    }

    if (!isEditing) {
        return (
            <Button
                variant="outline"
                className="w-full mb-6"
                onClick={startEditing}
                data-testid="edit-booking-btn"
            >
                <Pencil className="h-4 w-4 mr-2" />
                Edit Tickets
            </Button>
        );
    }

    const priceDiff = calculatePriceDiff();
    const currency = booking.tickets[0]?.price?.currency || 'AUD';

    return (
        <Card className="mb-6" data-testid="modify-booking-card">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Pencil className="h-4 w-4" />
                    Edit Your Tickets
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {booking.tickets.map((ticket: any, idx: number) => {
                    const key = ticket.variantId || ticket.variantName;
                    const qty = quantities[key] ?? ticket.quantity;
                    return (
                        <div key={idx} className="flex items-center justify-between" data-testid={`modify-ticket-${idx}`}>
                            <div>
                                <span className="font-medium text-sm">{ticket.variantName}</span>
                                <span className="text-xs text-slate-500 ml-2">
                                    {formatCurrency(ticket.price.amount, ticket.price.currency)} each
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0"
                                    onClick={() => setQuantities({ ...quantities, [key]: Math.max(0, qty - 1) })}
                                    disabled={qty === 0}
                                >
                                    <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-8 text-center font-medium">{qty}</span>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0"
                                    onClick={() => setQuantities({ ...quantities, [key]: qty + 1 })}
                                >
                                    <Plus className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    );
                })}

                {hasChanges() && (
                    <>
                        <div className="border-t pt-3">
                            {priceDiff < 0 && (
                                <p className="text-sm text-green-700 bg-green-50 p-2 rounded">
                                    You&apos;ll receive a refund of {formatCurrency(Math.abs(priceDiff), currency)}
                                </p>
                            )}
                            {priceDiff > 0 && (
                                <p className="text-sm text-amber-700 bg-amber-50 p-2 rounded">
                                    Additional charge: {formatCurrency(priceDiff, currency)}
                                </p>
                            )}
                            {priceDiff === 0 && (
                                <p className="text-sm text-slate-500">No price change</p>
                            )}
                        </div>

                        {!isLoggedIn && (
                            <div>
                                <Label htmlFor="modify-email" className="text-sm">Confirm your email</Label>
                                <Input
                                    id="modify-email"
                                    type="email"
                                    placeholder="your@email.com"
                                    value={verifyEmail}
                                    onChange={(e) => setVerifyEmail(e.target.value)}
                                    data-testid="modify-verify-email"
                                />
                            </div>
                        )}

                        {modifyMutation.isError && (
                            <p className="text-sm text-red-500">{(modifyMutation.error as Error)?.message || 'Failed to update booking'}</p>
                        )}

                        <div className="flex gap-2">
                            <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>Cancel</Button>
                            <Button
                                className="flex-1"
                                onClick={handleSubmit}
                                disabled={!effectiveEmail || modifyMutation.isPending}
                                data-testid="confirm-modify-btn"
                            >
                                {modifyMutation.isPending ? (
                                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Updating...</>
                                ) : (
                                    'Confirm Changes'
                                )}
                            </Button>
                        </div>
                    </>
                )}

                {!hasChanges() && (
                    <Button variant="outline" className="w-full" onClick={() => setIsEditing(false)}>
                        Cancel
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

export default function BookingCancellationUI({ bookingCode, merchantSlug }: BookingCancellationUIProps) {
    const [confirmEmail, setConfirmEmail] = useState("");
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [emailError, setEmailError] = useState("");

    const { data: booking, isLoading, error } = UsePublicBooking(bookingCode, merchantSlug);
    const cancelMutation = UseCustomerCancelBooking();

    const handleCancelClick = () => {
        if (!confirmEmail) {
            setEmailError("Please enter your email address");
            return;
        }
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(confirmEmail)) {
            setEmailError("Please enter a valid email address");
            return;
        }
        setEmailError("");
        setShowConfirmDialog(true);
    };

    const handleConfirmCancel = async () => {
        try {
            await cancelMutation.mutateAsync({
                bookingCode,
                customerEmail: confirmEmail,
                merchantSlug
            });
            setShowConfirmDialog(false);
            setShowSuccessDialog(true);
        } catch (err) {
            // Error is handled by the mutation
            console.error("Cancellation failed:", err);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50" data-testid="booking-loading">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-500" />
                    <p className="mt-2 text-slate-600">Loading booking details...</p>
                </div>
            </div>
        );
    }

    if (error || !booking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" data-testid="booking-error">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <CardTitle className="text-red-600 flex items-center gap-2">
                            <XCircle className="h-5 w-5" />
                            Booking Not Found
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-600">
                            We couldn&apos;t find a booking with code <strong>{bookingCode}</strong>.
                            Please check the link in your confirmation email and try again.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const isCancelled = booking.ticketStatus === 'CANCELLED';
    const isPendingPayment = booking.ticketStatus === 'AWAITING_PAYMENT';

    return (
        <div className="min-h-screen bg-slate-50 py-8 px-4" data-testid="booking-cancellation-page">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-slate-900" data-testid="page-title">
                        Your Booking
                    </h1>
                    {booking.merchantName && (
                        <p className="text-slate-500 mt-1">with {booking.merchantName}</p>
                    )}
                </div>

                {/* Prominent booking code */}
                {!isCancelled && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center mb-6" data-testid="booking-code-card">
                        <p className="text-xs text-slate-500 mb-1">Your booking code</p>
                        <p className="text-3xl font-mono font-bold text-green-700 tracking-wider" data-testid="booking-code-display">{booking.code}</p>
                        <p className="text-xs text-slate-400 mt-1">Show this at check-in</p>
                    </div>
                )}

                {/* Booking Details Card */}
                <Card className="mb-6" data-testid="booking-details-card">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle data-testid="tour-name">{booking.tourName}</CardTitle>
                                <CardDescription>Your booking details</CardDescription>
                            </div>
                            {getStatusBadge(booking.ticketStatus)}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Date and Time */}
                        <div className="flex items-center gap-3" data-testid="session-date">
                            <Calendar className="h-5 w-5 text-slate-500" />
                            <span>{formatDate(booking.sessionDate)}</span>
                        </div>
                        {booking.sessionTime && (
                            <div className="flex items-center gap-3" data-testid="session-time">
                                <Clock className="h-5 w-5 text-slate-500" />
                                <span>{formatTime(booking.sessionTime)}</span>
                            </div>
                        )}

                        {/* Tickets */}
                        <div className="border-t pt-4 mt-4">
                            <h3 className="font-medium mb-3 flex items-center gap-2">
                                <Ticket className="h-4 w-4" />
                                Tickets
                            </h3>
                            <div className="space-y-2" data-testid="ticket-list">
                                {booking.tickets.map((ticket, idx) => (
                                    <div
                                        key={idx}
                                        className="flex justify-between text-sm"
                                        data-testid={`ticket-item-${idx}`}
                                    >
                                        <span>
                                            {ticket.quantity}x {ticket.variantName}
                                        </span>
                                        <span className="text-slate-600">
                                            {formatCurrency(ticket.price.amount * ticket.quantity, ticket.price.currency)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            {booking.totalAmount && (
                                <div className="flex justify-between font-medium mt-3 pt-3 border-t" data-testid="total-amount">
                                    <span>Total</span>
                                    <span>{formatCurrency(booking.totalAmount.amount, booking.totalAmount.currency)}</span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Add to Calendar */}
                {!isCancelled && booking.sessionDate && (
                    <Button
                        variant="outline"
                        className="w-full mb-6"
                        data-testid="add-to-calendar-btn"
                        onClick={() => {
                            const date = booking.sessionDate;
                            const startTime = booking.sessionTime?.start || '09:00';
                            const endTime = booking.sessionTime?.end || '17:00';
                            const startISO = `${date}T${startTime}:00`.replace(/[:-]/g, '');
                            const endISO = `${date}T${endTime}:00`.replace(/[:-]/g, '');
                            const title = encodeURIComponent(booking.tourName);
                            const details = encodeURIComponent(`Booking code: ${bookingCode}\nTickets: ${booking.tickets.map((t: any) => `${t.quantity}x ${t.variantName}`).join(', ')}`);
                            window.open(
                                `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startISO}/${endISO}&details=${details}`,
                                '_blank'
                            );
                        }}
                    >
                        <Calendar className="h-4 w-4 mr-2" />
                        Add to Google Calendar
                    </Button>
                )}

                {/* Modify Booking Section */}
                {!isCancelled && !isPendingPayment && <ModifyBookingSection booking={booking} bookingCode={bookingCode} merchantSlug={merchantSlug} />}

                {/* Cancellation Section */}
                {isCancelled ? (
                    <Alert className="bg-red-50 border-red-200" data-testid="already-cancelled-alert">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <AlertTitle className="text-red-800">Booking Cancelled</AlertTitle>
                        <AlertDescription className="text-red-700">
                            This booking has already been cancelled. If you need assistance, please contact the merchant.
                        </AlertDescription>
                    </Alert>
                ) : isPendingPayment ? (
                    <Alert className="bg-yellow-50 border-yellow-200" data-testid="pending-payment-alert">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <AlertTitle className="text-yellow-800">Payment Pending</AlertTitle>
                        <AlertDescription className="text-yellow-700">
                            This booking is awaiting payment. Please contact the merchant if you need to cancel.
                        </AlertDescription>
                    </Alert>
                ) : booking.canCancel ? (
                    <Card data-testid="cancellation-form-card">
                        <CardHeader>
                            <CardTitle className="text-lg">Cancel This Booking</CardTitle>
                            <CardDescription>
                                Enter your email to verify your identity and cancel this booking.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Cancellation Policy Info */}
                            {booking.cancellationPolicy && (
                                <Alert className="bg-blue-50 border-blue-200" data-testid="policy-info-alert">
                                    <AlertCircle className="h-4 w-4 text-blue-600" />
                                    <AlertTitle className="text-blue-800">Refund Policy</AlertTitle>
                                    <AlertDescription className="text-blue-700">
                                        {booking.cancellationPolicy.refundPercentage === 100 ? (
                                            <span>You are eligible for a full refund if you cancel now.</span>
                                        ) : (
                                            <span>
                                                Based on the cancellation policy, you are eligible for a{" "}
                                                <strong>{booking.cancellationPolicy.refundPercentage}%</strong> refund.
                                            </span>
                                        )}
                                        {booking.cancellationDeadline && (
                                            <span className="block mt-1">
                                                Cancellation deadline: {formatDate(booking.cancellationDeadline)}
                                            </span>
                                        )}
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Email Input */}
                            <div className="space-y-2">
                                <Label htmlFor="confirm-email">
                                    <Mail className="h-4 w-4 inline mr-1" />
                                    Confirm Your Email
                                </Label>
                                <Input
                                    id="confirm-email"
                                    type="email"
                                    placeholder="Enter the email used for this booking"
                                    value={confirmEmail}
                                    onChange={(e) => {
                                        setConfirmEmail(e.target.value);
                                        setEmailError("");
                                    }}
                                    className={emailError ? "border-red-500" : ""}
                                    data-testid="confirm-email-input"
                                />
                                {emailError && (
                                    <p className="text-sm text-red-600" data-testid="email-error">{emailError}</p>
                                )}
                            </div>

                            <Button
                                variant="destructive"
                                className="w-full"
                                onClick={handleCancelClick}
                                disabled={cancelMutation.isPending}
                                data-testid="cancel-booking-btn"
                            >
                                {cancelMutation.isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    "Cancel Booking"
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <Alert className="bg-orange-50 border-orange-200" data-testid="cannot-cancel-alert">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <AlertTitle className="text-orange-800">Cancellation Not Available</AlertTitle>
                        <AlertDescription className="text-orange-700">
                            <p>The cancellation deadline for this booking has passed.</p>
                            {booking.cancellationDeadline && (
                                <p className="mt-1">
                                    Deadline was: {formatDate(booking.cancellationDeadline)}
                                </p>
                            )}
                            <p className="mt-2">
                                Please contact the merchant directly if you need assistance with your booking.
                            </p>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Confirmation Dialog */}
                <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                    <DialogContent data-testid="confirm-cancel-dialog">
                        <DialogHeader>
                            <DialogTitle>Confirm Cancellation</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to cancel your booking for <strong>{booking.tourName}</strong> on{" "}
                                <strong>{formatDate(booking.sessionDate)}</strong>?
                            </DialogDescription>
                        </DialogHeader>

                        {booking.cancellationPolicy?.refundPercentage !== undefined && (
                            <div className="py-2">
                                {booking.cancellationPolicy.refundPercentage === 100 ? (
                                    <p className="text-green-600 font-medium">
                                        You will receive a full refund.
                                    </p>
                                ) : booking.cancellationPolicy.refundPercentage > 0 ? (
                                    <p className="text-orange-600 font-medium">
                                        You will receive a {booking.cancellationPolicy.refundPercentage}% refund
                                        {booking.totalAmount && (
                                            <span>
                                                {" "}({formatCurrency(
                                                    booking.totalAmount.amount * (booking.cancellationPolicy.refundPercentage / 100),
                                                    booking.totalAmount.currency
                                                )})
                                            </span>
                                        )}
                                    </p>
                                ) : (
                                    <p className="text-red-600 font-medium">
                                        No refund will be issued based on the cancellation policy.
                                    </p>
                                )}
                            </div>
                        )}

                        {cancelMutation.isError && (
                            <Alert variant="destructive" data-testid="cancel-error-alert">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>
                                    {(cancelMutation.error as Error)?.message || "Failed to cancel booking. Please try again."}
                                </AlertDescription>
                            </Alert>
                        )}

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setShowConfirmDialog(false)}
                                disabled={cancelMutation.isPending}
                                data-testid="cancel-dialog-back-btn"
                            >
                                Go Back
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleConfirmCancel}
                                disabled={cancelMutation.isPending}
                                data-testid="confirm-cancel-btn"
                            >
                                {cancelMutation.isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Cancelling...
                                    </>
                                ) : (
                                    "Yes, Cancel Booking"
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Success Dialog */}
                <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
                    <DialogContent data-testid="success-dialog">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-green-600">
                                <CheckCircle2 className="h-5 w-5" />
                                Booking Cancelled
                            </DialogTitle>
                            <DialogDescription>
                                Your booking has been successfully cancelled.
                            </DialogDescription>
                        </DialogHeader>

                        {cancelMutation.data && (
                            <div className="py-4 space-y-2">
                                <p>{cancelMutation.data.message}</p>
                                {cancelMutation.data.refundInitiated && cancelMutation.data.refundAmount && (
                                    <p className="text-green-600 font-medium">
                                        A refund of {formatCurrency(cancelMutation.data.refundAmount.amount, cancelMutation.data.refundAmount.currency)} has been initiated.
                                    </p>
                                )}
                                <p className="text-sm text-slate-500">
                                    A confirmation email has been sent to your email address.
                                </p>
                            </div>
                        )}

                        <DialogFooter>
                            <Button
                                onClick={() => setShowSuccessDialog(false)}
                                data-testid="success-dialog-close-btn"
                            >
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}

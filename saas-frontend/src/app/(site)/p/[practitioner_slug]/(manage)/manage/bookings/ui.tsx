'use client'

import React, { useState } from "react";
import { Session } from "next-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import CurrencySpan from "@/components/ux/CurrencySpan";
import { Calendar, Clock, Video, MapPin, Car, CheckCircle, XCircle, Loader2, AlertCircle, User, Mail, DollarSign, MessageSquare } from "lucide-react";
import PractitionerSideNav from "../../../../_components/PractitionerSideNav";
import { usePendingBookings, ScheduledBooking } from "./hooks/UsePendingBookings";
import { useUpcomingBookings } from "./hooks/UseUpcomingBookings";
import { useConfirmBooking } from "./hooks/UseConfirmBooking";
import { useRejectBooking } from "./hooks/UseRejectBooking";
import { useCancelBooking } from "./hooks/UseCancelBooking";
import { toast } from "sonner";
import { Ban } from "lucide-react";

type Props = {
    session: Session;
    practitionerId: string;
    slug: string;
}

const DELIVERY_METHOD_ICONS = {
    ONLINE: Video,
    AT_PRACTITIONER: MapPin,
    MOBILE: Car,
};

const DELIVERY_METHOD_LABELS = {
    ONLINE: 'Online Session',
    AT_PRACTITIONER: 'At Your Location',
    MOBILE: 'At Customer Location',
};

function formatDate(dateStr: string) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function formatTime(timeStr: string) {
    return timeStr;
}

function getDeadlineStatus(deadline?: string): { text: string; variant: 'default' | 'destructive' | 'outline' } {
    if (!deadline) return { text: 'No deadline', variant: 'outline' };

    const now = new Date();
    const deadlineDate = new Date(deadline);
    const hoursLeft = Math.floor((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60));

    if (hoursLeft < 0) return { text: 'Expired', variant: 'destructive' };
    if (hoursLeft < 6) return { text: `${hoursLeft}h left`, variant: 'destructive' };
    if (hoursLeft < 24) return { text: `${hoursLeft}h left`, variant: 'default' };
    const daysLeft = Math.floor(hoursLeft / 24);
    return { text: `${daysLeft}d left`, variant: 'outline' };
}

interface BookingCardProps {
    booking: ScheduledBooking;
    onConfirm?: () => void;
    onReject?: () => void;
    onCancel?: () => void;
    showActions?: boolean;
    showCancelAction?: boolean;
}

function BookingCard({ booking, onConfirm, onReject, onCancel, showActions = false, showCancelAction = false }: BookingCardProps) {
    const DeliveryIcon = DELIVERY_METHOD_ICONS[booking.deliveryMethod] || Video;
    const deliveryLabel = DELIVERY_METHOD_LABELS[booking.deliveryMethod] || booking.deliveryMethod;
    const deadlineStatus = showActions ? getDeadlineStatus(booking.confirmationDeadline) : null;

    return (
        <Card className="bg-slate-800/30 border-slate-700/50" data-testid={`booking-card-${booking.id}`}>
            <CardContent className="p-4 space-y-4">
                {/* Header with service name and status */}
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="font-semibold text-white text-lg">{booking.service.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <User className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-300">{booking.customer.name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <Mail className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-400 text-sm">{booking.customer.email}</span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        {showActions && deadlineStatus && (
                            <Badge variant={deadlineStatus.variant} className="text-xs">
                                {deadlineStatus.text}
                            </Badge>
                        )}
                        {booking.confirmationStatus === 'CONFIRMED' && (
                            <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Confirmed
                            </Badge>
                        )}
                    </div>
                </div>

                <Separator className="bg-slate-700/50" />

                {/* Date, Time, Delivery Method */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-purple-400" />
                        <span className="text-slate-300 text-sm">
                            {formatDate(booking.scheduledDateTime.date)}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-purple-400" />
                        <span className="text-slate-300 text-sm">
                            {formatTime(booking.scheduledDateTime.time.start)} - {formatTime(booking.scheduledDateTime.time.end)}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <DeliveryIcon className="w-4 h-4 text-purple-400" />
                        <span className="text-slate-300 text-sm">{deliveryLabel}</span>
                    </div>
                </div>

                {/* Payment info */}
                {booking.payment && (
                    <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-400" />
                        <span className="text-green-300 font-medium">
                            <CurrencySpan value={booking.payment} withAnimation={false} />
                        </span>
                    </div>
                )}

                {/* Customer address for mobile bookings */}
                {booking.deliveryMethod === 'MOBILE' && booking.customerAddress?.formatted_address && (
                    <div className="p-3 rounded-lg bg-slate-700/30 border border-slate-600/50">
                        <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                            <MapPin className="w-4 h-4" />
                            Customer Address
                        </div>
                        <p className="text-slate-200 text-sm">{booking.customerAddress.formatted_address}</p>
                    </div>
                )}

                {/* Meeting link for confirmed online bookings */}
                {booking.confirmationStatus === 'CONFIRMED' && booking.deliveryMethod === 'ONLINE' && booking.meetingLink && (
                    <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                        <div className="flex items-center gap-2 text-purple-400 text-sm mb-1">
                            <Video className="w-4 h-4" />
                            Meeting Link
                        </div>
                        <a href={booking.meetingLink} target="_blank" rel="noopener noreferrer" className="text-purple-300 text-sm underline">
                            {booking.meetingLink}
                        </a>
                        {booking.meetingPasscode && (
                            <p className="text-slate-400 text-xs mt-1">Passcode: {booking.meetingPasscode}</p>
                        )}
                    </div>
                )}

                {/* Questionnaire responses */}
                {booking.questionnaireResponses && booking.questionnaireResponses.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                            <MessageSquare className="w-4 h-4" />
                            Questionnaire Responses
                        </div>
                        <div className="p-3 rounded-lg bg-slate-700/30 border border-slate-600/50 space-y-2">
                            {booking.questionnaireResponses.map((qr, idx) => (
                                <div key={idx}>
                                    <p className="text-slate-400 text-xs">{qr.question}</p>
                                    <p className="text-slate-200 text-sm">{qr.answer}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Action buttons for pending bookings */}
                {showActions && (
                    <div className="flex gap-2 pt-2">
                        <Button
                            onClick={onConfirm}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            data-testid="confirm-booking-btn"
                        >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Confirm
                        </Button>
                        <Button
                            onClick={onReject}
                            variant="outline"
                            className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
                            data-testid="reject-booking-btn"
                        >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                        </Button>
                    </div>
                )}

                {/* Cancel button for confirmed bookings */}
                {showCancelAction && (
                    <div className="flex justify-end pt-2">
                        <Button
                            onClick={onCancel}
                            variant="outline"
                            size="sm"
                            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                            data-testid="cancel-booking-btn"
                        >
                            <Ban className="w-4 h-4 mr-2" />
                            Cancel Booking
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function PractitionerBookingsUI({ session, practitionerId, slug }: Props) {
    const [activeTab, setActiveTab] = useState('pending');
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<ScheduledBooking | null>(null);
    const [meetingLink, setMeetingLink] = useState('');
    const [meetingPasscode, setMeetingPasscode] = useState('');
    const [rejectReason, setRejectReason] = useState('');
    const [cancelReason, setCancelReason] = useState('');

    const { data: pendingBookings, isLoading: loadingPending } = usePendingBookings(practitionerId);
    const { data: upcomingBookings, isLoading: loadingUpcoming } = useUpcomingBookings(practitionerId);
    const confirmMutation = useConfirmBooking();
    const rejectMutation = useRejectBooking();
    const cancelMutation = useCancelBooking();

    const handleOpenConfirmDialog = (booking: ScheduledBooking) => {
        setSelectedBooking(booking);
        setMeetingLink('');
        setMeetingPasscode('');
        setConfirmDialogOpen(true);
    };

    const handleOpenRejectDialog = (booking: ScheduledBooking) => {
        setSelectedBooking(booking);
        setRejectReason('');
        setRejectDialogOpen(true);
    };

    const handleOpenCancelDialog = (booking: ScheduledBooking) => {
        setSelectedBooking(booking);
        setCancelReason('');
        setCancelDialogOpen(true);
    };

    const handleConfirm = async () => {
        if (!selectedBooking) return;

        try {
            await confirmMutation.mutateAsync({
                practitionerId,
                bookingId: selectedBooking.id,
                meetingLink: selectedBooking.deliveryMethod === 'ONLINE' ? meetingLink : undefined,
                meetingPasscode: selectedBooking.deliveryMethod === 'ONLINE' ? meetingPasscode : undefined,
            });
            toast.success('Booking confirmed! Customer has been notified.');
            setConfirmDialogOpen(false);
            setSelectedBooking(null);
        } catch {
            toast.error('Failed to confirm booking. Please try again.');
        }
    };

    const handleReject = async () => {
        if (!selectedBooking || !rejectReason.trim()) return;

        try {
            await rejectMutation.mutateAsync({
                practitionerId,
                bookingId: selectedBooking.id,
                reason: rejectReason,
            });
            toast.success('Booking rejected. Customer has been notified.');
            setRejectDialogOpen(false);
            setSelectedBooking(null);
        } catch {
            toast.error('Failed to reject booking. Please try again.');
        }
    };

    const handleCancel = async () => {
        if (!selectedBooking) return;

        try {
            const result = await cancelMutation.mutateAsync({
                bookingId: selectedBooking.id,
                reason: cancelReason || undefined,
            });
            if (result.success) {
                toast.success('Booking cancelled. Customer has been notified and refunded.');
                setCancelDialogOpen(false);
                setSelectedBooking(null);
            } else {
                toast.error(result.message || 'Failed to cancel booking.');
            }
        } catch {
            toast.error('Failed to cancel booking. Please try again.');
        }
    };

    return (
        <div className="flex min-h-full">
            {/* Sidebar */}
            <PractitionerSideNav
                session={session}
                practitionerId={practitionerId}
                practitionerSlug={slug}
            />

            {/* Main Content */}
            <div className="flex-1 md:ml-[200px] p-4 md:p-6">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-purple-500/20">
                                <Calendar className="w-6 h-6 text-purple-400" />
                            </div>
                            <h1 className="text-2xl font-bold text-white">Bookings</h1>
                        </div>
                        <p className="text-slate-400">
                            Manage your scheduled sessions and confirmations
                        </p>
                    </div>

                    {/* Tabs */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="bg-slate-800/50 border border-slate-700/50 mb-6">
                            <TabsTrigger
                                value="pending"
                                className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300"
                                data-testid="pending-tab"
                            >
                                Pending
                                {pendingBookings && pendingBookings.length > 0 && (
                                    <Badge className="ml-2 bg-orange-500/20 text-orange-300 border-orange-500/30 text-xs">
                                        {pendingBookings.length}
                                    </Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger
                                value="upcoming"
                                className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300"
                                data-testid="upcoming-tab"
                            >
                                Upcoming
                                {upcomingBookings && upcomingBookings.length > 0 && (
                                    <Badge className="ml-2 bg-green-500/20 text-green-300 border-green-500/30 text-xs">
                                        {upcomingBookings.length}
                                    </Badge>
                                )}
                            </TabsTrigger>
                        </TabsList>

                        {/* Pending Confirmations */}
                        <TabsContent value="pending" className="space-y-4">
                            {loadingPending ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                                    <span className="ml-2 text-slate-400">Loading pending bookings...</span>
                                </div>
                            ) : pendingBookings && pendingBookings.length > 0 ? (
                                <>
                                    <Alert className="bg-orange-500/10 border-orange-500/30">
                                        <AlertCircle className="h-4 w-4 text-orange-400" />
                                        <AlertDescription className="text-orange-300">
                                            You have {pendingBookings.length} booking{pendingBookings.length > 1 ? 's' : ''} awaiting confirmation.
                                            Payment will be captured when you confirm.
                                        </AlertDescription>
                                    </Alert>
                                    {pendingBookings.map(booking => (
                                        <BookingCard
                                            key={booking.id}
                                            booking={booking}
                                            showActions
                                            onConfirm={() => handleOpenConfirmDialog(booking)}
                                            onReject={() => handleOpenRejectDialog(booking)}
                                        />
                                    ))}
                                </>
                            ) : (
                                <Card className="bg-slate-800/30 border-slate-700/50">
                                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                        <CheckCircle className="w-12 h-12 text-green-500/50 mb-4" />
                                        <p className="text-slate-400 mb-2">No pending confirmations</p>
                                        <p className="text-slate-500 text-sm">
                                            All bookings are up to date
                                        </p>
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>

                        {/* Upcoming Sessions */}
                        <TabsContent value="upcoming" className="space-y-4">
                            {loadingUpcoming ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                                    <span className="ml-2 text-slate-400">Loading upcoming bookings...</span>
                                </div>
                            ) : upcomingBookings && upcomingBookings.length > 0 ? (
                                upcomingBookings.map(booking => (
                                    <BookingCard
                                        key={booking.id}
                                        booking={booking}
                                        showCancelAction
                                        onCancel={() => handleOpenCancelDialog(booking)}
                                    />
                                ))
                            ) : (
                                <Card className="bg-slate-800/30 border-slate-700/50">
                                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                        <Calendar className="w-12 h-12 text-slate-600 mb-4" />
                                        <p className="text-slate-400 mb-2">No upcoming sessions</p>
                                        <p className="text-slate-500 text-sm">
                                            Confirmed bookings will appear here
                                        </p>
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>
                    </Tabs>
            </div>

            {/* Confirm Dialog */}
            <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
                <DialogContent className="bg-slate-900 border-slate-700">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            Confirm Booking
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Confirming this booking will capture the customer&apos;s payment.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedBooking && (
                        <div className="space-y-4">
                            <div className="p-3 rounded-lg bg-slate-800/50 space-y-2">
                                <p className="text-white font-medium">{selectedBooking.service.name}</p>
                                <p className="text-slate-400 text-sm">
                                    {formatDate(selectedBooking.scheduledDateTime.date)} at {selectedBooking.scheduledDateTime.time.start}
                                </p>
                                <p className="text-slate-400 text-sm">
                                    Customer: {selectedBooking.customer.name}
                                </p>
                            </div>

                            {selectedBooking.deliveryMethod === 'ONLINE' && (
                                <div className="space-y-3">
                                    <div>
                                        <Label htmlFor="meetingLink" className="text-slate-300">
                                            Meeting Link *
                                        </Label>
                                        <Input
                                            id="meetingLink"
                                            value={meetingLink}
                                            onChange={(e) => setMeetingLink(e.target.value)}
                                            placeholder="https://zoom.us/j/..."
                                            className="bg-slate-800 border-slate-700 text-white mt-1"
                                            data-testid="meeting-link-input"
                                        />
                                        <p className="text-slate-500 text-xs mt-1">
                                            Enter your Zoom, Google Meet, or other video call link
                                        </p>
                                    </div>
                                    <div>
                                        <Label htmlFor="meetingPasscode" className="text-slate-300">
                                            Meeting Passcode (optional)
                                        </Label>
                                        <Input
                                            id="meetingPasscode"
                                            value={meetingPasscode}
                                            onChange={(e) => setMeetingPasscode(e.target.value)}
                                            placeholder="Enter passcode if required"
                                            className="bg-slate-800 border-slate-700 text-white mt-1"
                                            data-testid="meeting-passcode-input"
                                        />
                                    </div>
                                </div>
                            )}

                            {selectedBooking.deliveryMethod === 'AT_PRACTITIONER' && (
                                <Alert className="bg-blue-500/10 border-blue-500/30">
                                    <MapPin className="h-4 w-4 text-blue-400" />
                                    <AlertDescription className="text-blue-300">
                                        Your full address will be shared with the customer after confirmation.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {selectedBooking.deliveryMethod === 'MOBILE' && selectedBooking.customerAddress?.formatted_address && (
                                <Alert className="bg-purple-500/10 border-purple-500/30">
                                    <Car className="h-4 w-4 text-purple-400" />
                                    <AlertDescription className="text-purple-300">
                                        You&apos;ll travel to: {selectedBooking.customerAddress.formatted_address}
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setConfirmDialogOpen(false)}
                            className="border-slate-700 text-slate-300"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            disabled={confirmMutation.isPending || (selectedBooking?.deliveryMethod === 'ONLINE' && !meetingLink)}
                            className="bg-green-600 hover:bg-green-700"
                            data-testid="confirm-submit-btn"
                        >
                            {confirmMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Confirming...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Confirm & Capture Payment
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent className="bg-slate-900 border-slate-700">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <XCircle className="w-5 h-5 text-red-400" />
                            Reject Booking
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Rejecting will release the payment authorization and notify the customer.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedBooking && (
                        <div className="space-y-4">
                            <div className="p-3 rounded-lg bg-slate-800/50 space-y-2">
                                <p className="text-white font-medium">{selectedBooking.service.name}</p>
                                <p className="text-slate-400 text-sm">
                                    {formatDate(selectedBooking.scheduledDateTime.date)} at {selectedBooking.scheduledDateTime.time.start}
                                </p>
                                <p className="text-slate-400 text-sm">
                                    Customer: {selectedBooking.customer.name}
                                </p>
                            </div>

                            <div>
                                <Label htmlFor="rejectReason" className="text-slate-300">
                                    Reason for rejection *
                                </Label>
                                <Textarea
                                    id="rejectReason"
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Please provide a reason for the customer..."
                                    className="bg-slate-800 border-slate-700 text-white mt-1"
                                    rows={3}
                                    data-testid="reject-reason-input"
                                />
                                <p className="text-slate-500 text-xs mt-1">
                                    This will be shared with the customer
                                </p>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setRejectDialogOpen(false)}
                            className="border-slate-700 text-slate-300"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleReject}
                            disabled={rejectMutation.isPending || !rejectReason.trim()}
                            className="bg-red-600 hover:bg-red-700"
                            data-testid="reject-submit-btn"
                        >
                            {rejectMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Rejecting...
                                </>
                            ) : (
                                <>
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Reject Booking
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Cancel Dialog */}
            <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <DialogContent className="bg-slate-900 border-slate-700">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <Ban className="w-5 h-5 text-red-400" />
                            Cancel Booking
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Cancelling will refund the customer and notify them. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedBooking && (
                        <div className="space-y-4">
                            <div className="p-3 rounded-lg bg-slate-800/50 space-y-2">
                                <p className="text-white font-medium">{selectedBooking.service.name}</p>
                                <p className="text-slate-400 text-sm">
                                    {formatDate(selectedBooking.scheduledDateTime.date)} at {selectedBooking.scheduledDateTime.time.start}
                                </p>
                                <p className="text-slate-400 text-sm">
                                    Customer: {selectedBooking.customer.name}
                                </p>
                            </div>

                            <div>
                                <Label htmlFor="cancelReason" className="text-slate-300">
                                    Reason for cancellation (optional)
                                </Label>
                                <Textarea
                                    id="cancelReason"
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    placeholder="Let the customer know why you&apos;re cancelling..."
                                    className="bg-slate-800 border-slate-700 text-white mt-1"
                                    rows={3}
                                    data-testid="cancel-reason-input"
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setCancelDialogOpen(false)}
                            className="border-slate-700 text-slate-300"
                        >
                            Keep Booking
                        </Button>
                        <Button
                            onClick={handleCancel}
                            disabled={cancelMutation.isPending}
                            className="bg-red-600 hover:bg-red-700"
                            data-testid="cancel-submit-btn"
                        >
                            {cancelMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Cancelling...
                                </>
                            ) : (
                                <>
                                    <Ban className="w-4 h-4 mr-2" />
                                    Cancel & Refund
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

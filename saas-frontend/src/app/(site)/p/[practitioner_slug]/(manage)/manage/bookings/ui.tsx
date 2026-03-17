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
import { Calendar, Clock, Video, MapPin, Car, CheckCircle, XCircle, Loader2, AlertCircle, User, Mail, DollarSign, MessageSquare, Ban, Package, Sparkles, Heart, MessageCircle, Eye } from "lucide-react";
import { format } from 'date-fns';
import PractitionerSideNav from "../../../../_components/PractitionerSideNav";
import { usePendingBookings, ScheduledBooking } from "./hooks/UsePendingBookings";
import { useUpcomingBookings } from "./hooks/UseUpcomingBookings";
import { useConfirmBooking } from "./hooks/UseConfirmBooking";
import { useRejectBooking } from "./hooks/UseRejectBooking";
import { useCancelBooking } from "./hooks/UseCancelBooking";
import { useMyServiceOrders } from "../services/orders/hooks/UseMyServiceOrders";
import FulfillmentDialog from "../services/orders/_components/FulfillmentDialog";
import { useQueryClient } from '@tanstack/react-query';
import { toast } from "sonner";

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

    if (hoursLeft < 0) return { text: 'Overdue', variant: 'destructive' };
    if (hoursLeft < 6) return { text: `${hoursLeft} hours left`, variant: 'destructive' };
    if (hoursLeft < 24) return { text: `${hoursLeft} hours left`, variant: 'default' };
    const daysLeft = Math.floor(hoursLeft / 24);
    return { text: `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`, variant: 'outline' };
}

function getCategoryIcon(category: string) {
    switch (category) {
        case 'READING':
            return <Sparkles className="h-4 w-4" />;
        case 'HEALING':
            return <Heart className="h-4 w-4" />;
        case 'COACHING':
            return <MessageCircle className="h-4 w-4" />;
        default:
            return <Package className="h-4 w-4" />;
    }
}

function getCategoryColor(category: string) {
    switch (category) {
        case 'READING':
            return 'bg-purple-900/30 text-purple-400';
        case 'HEALING':
            return 'bg-green-900/30 text-green-400';
        case 'COACHING':
            return 'bg-blue-900/30 text-blue-400';
        default:
            return 'bg-slate-700 text-slate-300';
    }
}

// --- Scheduled Booking Card ---

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
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-purple-900/30 text-purple-400 text-xs">
                                <Video className="w-3 h-3 mr-1" />
                                Live Session
                            </Badge>
                        </div>
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

                {booking.payment && (
                    <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-400" />
                        <span className="text-green-300 font-medium">
                            <CurrencySpan value={booking.payment} withAnimation={false} />
                        </span>
                    </div>
                )}

                {booking.deliveryMethod === 'MOBILE' && booking.customerAddress?.formattedAddress && (
                    <div className="p-3 rounded-lg bg-slate-700/30 border border-slate-600/50">
                        <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                            <MapPin className="w-4 h-4" />
                            Customer Address
                        </div>
                        <p className="text-slate-200 text-sm">{booking.customerAddress.formattedAddress}</p>
                    </div>
                )}

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

                {booking.questionnaireResponses && booking.questionnaireResponses.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                            <MessageSquare className="w-4 h-4" />
                            Their Answers
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

// --- Async Order Card ---

function OrderCard({ order, onOpen }: { order: any; onOpen: () => void }) {
    const dueDate = order.service.turnaroundDays
        ? new Date(new Date(order.purchaseDate).getTime() + order.service.turnaroundDays * 24 * 60 * 60 * 1000)
        : null;
    const isOverdue = dueDate && new Date() > dueDate;
    const isDelivered = order.orderStatus === 'DELIVERED';

    return (
        <Card className="bg-slate-800/30 border-slate-700/50" data-testid={`order-card-${order.id}`}>
            <CardContent className="p-4 space-y-4">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge className={getCategoryColor(order.service.category) + ' text-xs'}>
                                <div className="flex items-center gap-1">
                                    {getCategoryIcon(order.service.category)}
                                    {order.service.category.charAt(0) + order.service.category.slice(1).toLowerCase()}
                                </div>
                            </Badge>
                        </div>
                        <h3 className="font-semibold text-white text-lg">{order.service.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <User className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-300">{order.customer?.name || 'Customer'}</span>
                        </div>
                        {order.customer?.email && (
                            <div className="flex items-center gap-2 mt-1">
                                <Mail className="w-4 h-4 text-slate-400" />
                                <span className="text-slate-400 text-sm">{order.customer.email}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        {isOverdue && !isDelivered && (
                            <Badge variant="destructive" className="text-xs">Overdue</Badge>
                        )}
                        {isDelivered && (
                            <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Sent
                            </Badge>
                        )}
                    </div>
                </div>

                <Separator className="bg-slate-700/50" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-purple-400" />
                        <span className="text-slate-300 text-sm">
                            Ordered {format(new Date(order.purchaseDate), 'MMM d, yyyy')}
                        </span>
                    </div>
                    {dueDate && (
                        <div className="flex items-center gap-2">
                            <Package className={`w-4 h-4 ${isOverdue ? 'text-red-400' : 'text-purple-400'}`} />
                            <span className={`text-sm ${isOverdue ? 'text-red-400 font-medium' : 'text-slate-300'}`}>
                                Due {format(dueDate, 'MMM d, yyyy')}
                            </span>
                        </div>
                    )}
                </div>

                {order.questionnaireResponses && order.questionnaireResponses.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                            <MessageSquare className="w-4 h-4" />
                            Their Answers
                        </div>
                        <div className="p-3 rounded-lg bg-slate-700/30 border border-slate-600/50 space-y-2">
                            {order.questionnaireResponses.slice(0, 2).map((qr: any, idx: number) => (
                                <div key={idx}>
                                    <p className="text-slate-400 text-xs">{qr.question}</p>
                                    <p className="text-slate-200 text-sm">{qr.answer}</p>
                                </div>
                            ))}
                            {order.questionnaireResponses.length > 2 && (
                                <p className="text-slate-500 text-xs italic">
                                    +{order.questionnaireResponses.length - 2} more responses
                                </p>
                            )}
                        </div>
                    </div>
                )}

                <Button
                    onClick={onOpen}
                    className={isDelivered ? 'w-full bg-slate-700 hover:bg-slate-600' : 'w-full'}
                    data-testid={isDelivered ? 'view-details-button' : 'start-fulfillment-button'}
                >
                    {isDelivered ? (
                        <><Eye className="w-4 h-4 mr-2" />View Details</>
                    ) : order.orderStatus === 'PAID' ? (
                        'Get Started'
                    ) : (
                        'Continue'
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}

// --- Main Page ---

export default function PractitionerBookingsUI({ session, practitionerId, slug }: Props) {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('action');
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<ScheduledBooking | null>(null);
    const [meetingLink, setMeetingLink] = useState('');
    const [meetingPasscode, setMeetingPasscode] = useState('');
    const [rejectReason, setRejectReason] = useState('');
    const [cancelReason, setCancelReason] = useState('');

    // Fulfillment dialog state
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [fulfillmentOpen, setFulfillmentOpen] = useState(false);

    // Scheduled bookings
    const { data: pendingBookings, isLoading: loadingPending } = usePendingBookings(practitionerId);
    const { data: upcomingBookings, isLoading: loadingUpcoming } = useUpcomingBookings(practitionerId);
    const confirmMutation = useConfirmBooking();
    const rejectMutation = useRejectBooking();
    const cancelMutation = useCancelBooking();

    // Async orders
    const { data: paidOrders, isLoading: loadingPaid } = useMyServiceOrders(practitionerId, 'PAID');
    const { data: inProgressOrders, isLoading: loadingInProgress } = useMyServiceOrders(practitionerId, 'IN_PROGRESS');
    const { data: deliveredOrders, isLoading: loadingDelivered } = useMyServiceOrders(practitionerId, 'DELIVERED');

    // Counts for tabs
    const needsActionCount = (pendingBookings?.length || 0) + (paidOrders?.length || 0);
    const inProgressCount = (upcomingBookings?.length || 0) + (inProgressOrders?.length || 0);
    const completedCount = deliveredOrders?.length || 0;

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

    const handleOpenFulfillment = (order: any) => {
        setSelectedOrder(order);
        setFulfillmentOpen(true);
    };

    const handleFulfillmentSuccess = () => {
        queryClient.invalidateQueries({ queryKey: ['my-service-orders'] });
    };

    const isLoading = loadingPending || loadingUpcoming || loadingPaid || loadingInProgress || loadingDelivered;

    return (
        <div className="flex min-h-full">
            <PractitionerSideNav
                session={session}
                practitionerId={practitionerId}
                practitionerSlug={slug}
            />

            <div className="flex-1 md:ml-[200px] p-4 md:p-6">
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-purple-500/20">
                            <Calendar className="w-6 h-6 text-purple-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-white">Bookings</h1>
                    </div>
                    <p className="text-slate-400">
                        Your sessions and readings, all in one place
                    </p>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="bg-slate-800/50 border border-slate-700/50 mb-6">
                        <TabsTrigger
                            value="action"
                            className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300"
                            data-testid="needs-action-tab"
                        >
                            Needs Action
                            {needsActionCount > 0 && (
                                <Badge className="ml-2 bg-orange-500/20 text-orange-300 border-orange-500/30 text-xs">
                                    {needsActionCount}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger
                            value="in-progress"
                            className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300"
                            data-testid="in-progress-tab"
                        >
                            In Progress
                            {inProgressCount > 0 && (
                                <Badge className="ml-2 bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
                                    {inProgressCount}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger
                            value="completed"
                            className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300"
                            data-testid="completed-tab"
                        >
                            Completed
                            {completedCount > 0 && (
                                <Badge className="ml-2 bg-green-500/20 text-green-300 border-green-500/30 text-xs">
                                    {completedCount}
                                </Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    {/* NEEDS ACTION — pending confirmations + paid orders */}
                    <TabsContent value="action" className="space-y-4">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                                <span className="ml-2 text-slate-400">Loading...</span>
                            </div>
                        ) : needsActionCount > 0 ? (
                            <>
                                {pendingBookings && pendingBookings.length > 0 && (
                                    <>
                                        <Alert className="bg-orange-500/10 border-orange-500/30">
                                            <AlertCircle className="h-4 w-4 text-orange-400" />
                                            <AlertDescription className="text-orange-300">
                                                You have {pendingBookings.length} live session{pendingBookings.length > 1 ? 's' : ''} awaiting confirmation.
                                                Payment will go through when you confirm.
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
                                )}
                                {paidOrders && paidOrders.length > 0 && (
                                    <>
                                        {pendingBookings && pendingBookings.length > 0 && (
                                            <Separator className="bg-slate-700/50 my-4" />
                                        )}
                                        {paidOrders.map(order => (
                                            <OrderCard
                                                key={order.id}
                                                order={order}
                                                onOpen={() => handleOpenFulfillment(order)}
                                            />
                                        ))}
                                    </>
                                )}
                            </>
                        ) : (
                            <Card className="bg-slate-800/30 border-slate-700/50">
                                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                    <CheckCircle className="w-12 h-12 text-green-500/50 mb-4" />
                                    <p className="text-slate-400 mb-2">You&apos;re all caught up</p>
                                    <p className="text-slate-500 text-sm">
                                        No bookings need your attention right now
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* IN PROGRESS — upcoming sessions + in-progress orders */}
                    <TabsContent value="in-progress" className="space-y-4">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                                <span className="ml-2 text-slate-400">Loading...</span>
                            </div>
                        ) : inProgressCount > 0 ? (
                            <>
                                {upcomingBookings && upcomingBookings.length > 0 && (
                                    upcomingBookings.map(booking => (
                                        <BookingCard
                                            key={booking.id}
                                            booking={booking}
                                            showCancelAction
                                            onCancel={() => handleOpenCancelDialog(booking)}
                                        />
                                    ))
                                )}
                                {inProgressOrders && inProgressOrders.length > 0 && (
                                    <>
                                        {upcomingBookings && upcomingBookings.length > 0 && (
                                            <Separator className="bg-slate-700/50 my-4" />
                                        )}
                                        {inProgressOrders.map(order => (
                                            <OrderCard
                                                key={order.id}
                                                order={order}
                                                onOpen={() => handleOpenFulfillment(order)}
                                            />
                                        ))}
                                    </>
                                )}
                            </>
                        ) : (
                            <Card className="bg-slate-800/30 border-slate-700/50">
                                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                    <Calendar className="w-12 h-12 text-slate-600 mb-4" />
                                    <p className="text-slate-400 mb-2">Nothing in progress</p>
                                    <p className="text-slate-500 text-sm">
                                        Your upcoming sessions and work you&apos;re preparing will appear here
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* COMPLETED — delivered orders */}
                    <TabsContent value="completed" className="space-y-4">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                                <span className="ml-2 text-slate-400">Loading...</span>
                            </div>
                        ) : completedCount > 0 ? (
                            deliveredOrders!.map(order => (
                                <OrderCard
                                    key={order.id}
                                    order={order}
                                    onOpen={() => handleOpenFulfillment(order)}
                                />
                            ))
                        ) : (
                            <Card className="bg-slate-800/30 border-slate-700/50">
                                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                    <CheckCircle className="w-12 h-12 text-slate-600 mb-4" />
                                    <p className="text-slate-400 mb-2">No completed bookings yet</p>
                                    <p className="text-slate-500 text-sm">
                                        Your finished work will appear here
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
                            The customer&apos;s payment will go through once you confirm.
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
                                            dark
                                            value={meetingLink}
                                            onChange={(e) => setMeetingLink(e.target.value)}
                                            placeholder="https://zoom.us/j/..."
                                            className="mt-1"
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
                                            dark
                                            value={meetingPasscode}
                                            onChange={(e) => setMeetingPasscode(e.target.value)}
                                            placeholder="Enter passcode if required"
                                            className="mt-1"
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

                            {selectedBooking.deliveryMethod === 'MOBILE' && selectedBooking.customerAddress?.formattedAddress && (
                                <Alert className="bg-purple-500/10 border-purple-500/30">
                                    <Car className="h-4 w-4 text-purple-400" />
                                    <AlertDescription className="text-purple-300">
                                        You&apos;ll travel to: {selectedBooking.customerAddress.formattedAddress}
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
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Confirming...</>
                            ) : (
                                <><CheckCircle className="w-4 h-4 mr-2" />Confirm Booking</>
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
                            The customer won&apos;t be charged and will be notified.
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
                                    dark
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Let the customer know why..."
                                    className="mt-1"
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
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Rejecting...</>
                            ) : (
                                <><XCircle className="w-4 h-4 mr-2" />Reject Booking</>
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
                                    dark
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    placeholder="Let the customer know why you&apos;re cancelling..."
                                    className="mt-1"
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
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Cancelling...</>
                            ) : (
                                <><Ban className="w-4 h-4 mr-2" />Cancel & Refund</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Fulfillment Dialog for async orders */}
            {selectedOrder && practitionerId && (
                <FulfillmentDialog
                    order={selectedOrder}
                    practitionerId={practitionerId}
                    open={fulfillmentOpen}
                    onOpenChange={setFulfillmentOpen}
                    onSuccess={handleFulfillmentSuccess}
                />
            )}
        </div>
    );
}

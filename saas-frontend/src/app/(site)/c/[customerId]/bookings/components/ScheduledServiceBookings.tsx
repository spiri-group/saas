'use client';

import React, { useState } from 'react';
import { DateTime } from 'luxon';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Calendar,
    Clock,
    Video,
    MapPin,
    Car,
    ExternalLink,
    Loader2,
    AlertCircle,
    CheckCircle,
    XCircle,
    Clock4,
    Ban
} from 'lucide-react';
import { toast } from 'sonner';
import { useScheduledBookings, ScheduledBooking } from '../hooks/UseScheduledBookings';
import { useCancelScheduledBooking } from '../hooks/UseCancelScheduledBooking';
import CurrencySpan from '@/components/ux/CurrencySpan';
import Link from 'next/link';

interface Props {
    customerId?: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
    PENDING_CONFIRMATION: {
        label: 'Awaiting Confirmation',
        icon: Clock4,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50 border-yellow-200'
    },
    CONFIRMED: {
        label: 'Confirmed',
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-50 border-green-200'
    },
    REJECTED: {
        label: 'Rejected',
        icon: XCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50 border-red-200'
    },
    EXPIRED: {
        label: 'Expired',
        icon: AlertCircle,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50 border-gray-200'
    },
    CANCELLED: {
        label: 'Cancelled',
        icon: Ban,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50 border-gray-200'
    }
};

const DELIVERY_ICONS: Record<string, React.ElementType> = {
    ONLINE: Video,
    AT_PRACTITIONER: MapPin,
    MOBILE: Car
};

const DELIVERY_LABELS: Record<string, string> = {
    ONLINE: 'Online Session',
    AT_PRACTITIONER: 'At Practitioner Location',
    MOBILE: 'Mobile (They come to you)'
};

export default function ScheduledServiceBookings({ customerId }: Props) {
    const { data: bookings, isLoading, error } = useScheduledBookings(customerId);
    const cancelMutation = useCancelScheduledBooking();
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<ScheduledBooking | null>(null);
    const [cancelReason, setCancelReason] = useState('');

    const handleCancelClick = (booking: ScheduledBooking) => {
        setSelectedBooking(booking);
        setCancelReason('');
        setCancelDialogOpen(true);
    };

    const handleConfirmCancel = async () => {
        if (!selectedBooking) return;

        try {
            const result = await cancelMutation.mutateAsync({
                bookingId: selectedBooking.id,
                cancelledBy: 'CUSTOMER',
                reason: cancelReason || undefined
            });

            if (result.success) {
                toast.success('Booking cancelled successfully');
                setCancelDialogOpen(false);
                setSelectedBooking(null);
            } else {
                toast.error(result.message || 'Failed to cancel booking');
            }
        } catch {
            toast.error('An error occurred while cancelling');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                <span className="ml-2 text-slate-500">Loading bookings...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12 text-red-500">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                <p>Failed to load bookings</p>
            </div>
        );
    }

    if (!bookings || bookings.length === 0) {
        return (
            <div className="text-center py-12 text-slate-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No scheduled bookings</p>
                <p className="text-sm mt-1">Your scheduled service bookings will appear here</p>
            </div>
        );
    }

    // Group bookings by status
    const upcomingBookings = bookings.filter(b =>
        ['PENDING_CONFIRMATION', 'CONFIRMED'].includes(b.confirmationStatus) &&
        DateTime.fromISO(b.scheduledDateTime.date) >= DateTime.now().startOf('day')
    );
    const pastBookings = bookings.filter(b =>
        !['PENDING_CONFIRMATION', 'CONFIRMED'].includes(b.confirmationStatus) ||
        DateTime.fromISO(b.scheduledDateTime.date) < DateTime.now().startOf('day')
    );

    const renderBookingCard = (booking: ScheduledBooking) => {
        const statusConfig = STATUS_CONFIG[booking.confirmationStatus] || STATUS_CONFIG.PENDING_CONFIRMATION;
        const StatusIcon = statusConfig.icon;
        const DeliveryIcon = DELIVERY_ICONS[booking.deliveryMethod] || Video;
        const deliveryLabel = DELIVERY_LABELS[booking.deliveryMethod] || booking.deliveryMethod;
        const bookingDate = DateTime.fromISO(booking.scheduledDateTime.date);
        const isUpcoming = bookingDate >= DateTime.now().startOf('day');
        const canCancel = ['PENDING_CONFIRMATION', 'CONFIRMED'].includes(booking.confirmationStatus) && isUpcoming;

        return (
            <Card
                key={booking.id}
                className={`border ${statusConfig.bgColor}`}
                data-testid={`booking-card-${booking.id}`}
            >
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        {/* Left side - Booking details */}
                        <div className="flex-1 space-y-3">
                            {/* Service & Practitioner */}
                            <div>
                                <h3 className="font-semibold text-lg text-slate-800">
                                    {booking.service?.name || 'Service'}
                                </h3>
                                {booking.service?.vendor && (
                                    <Link
                                        href={`/p/${booking.service.vendor.slug}`}
                                        className="text-sm text-purple-600 hover:underline flex items-center gap-1"
                                    >
                                        {booking.service.vendor.name}
                                        <ExternalLink className="w-3 h-3" />
                                    </Link>
                                )}
                            </div>

                            {/* Date & Time */}
                            <div className="flex flex-wrap items-center gap-4 text-slate-600">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-purple-500" />
                                    <span>{bookingDate.toFormat('EEEE, MMMM d, yyyy')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-purple-500" />
                                    <span>
                                        {booking.scheduledDateTime.time.start} - {booking.scheduledDateTime.time.end}
                                    </span>
                                </div>
                            </div>

                            {/* Delivery Method */}
                            <div className="flex items-center gap-2 text-slate-600">
                                <DeliveryIcon className="w-4 h-4 text-purple-500" />
                                <span>{deliveryLabel}</span>
                            </div>

                            {/* Meeting link for confirmed online bookings */}
                            {booking.confirmationStatus === 'CONFIRMED' &&
                                booking.deliveryMethod === 'ONLINE' &&
                                booking.meetingLink && (
                                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                        <p className="text-sm font-medium text-purple-800 mb-1">Meeting Link</p>
                                        <a
                                            href={booking.meetingLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-purple-600 hover:underline flex items-center gap-1 text-sm"
                                        >
                                            {booking.meetingLink}
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                        {booking.meetingPasscode && (
                                            <p className="text-sm text-slate-600 mt-1">
                                                Passcode: {booking.meetingPasscode}
                                            </p>
                                        )}
                                    </div>
                                )}

                            {/* Practitioner address for confirmed in-person bookings */}
                            {booking.confirmationStatus === 'CONFIRMED' &&
                                booking.deliveryMethod === 'AT_PRACTITIONER' &&
                                booking.practitionerAddress && (
                                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                        <p className="text-sm font-medium text-purple-800 mb-1">Location</p>
                                        <p className="text-sm text-slate-600">{booking.practitionerAddress}</p>
                                    </div>
                                )}

                            {/* Rejection reason */}
                            {booking.confirmationStatus === 'REJECTED' && booking.rejectionReason && (
                                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                                    <p className="text-sm font-medium text-red-800 mb-1">Reason</p>
                                    <p className="text-sm text-red-700">{booking.rejectionReason}</p>
                                </div>
                            )}

                            {/* Cancellation reason */}
                            {booking.confirmationStatus === 'CANCELLED' && booking.cancellationReason && (
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <p className="text-sm font-medium text-gray-800 mb-1">
                                        Cancelled by {booking.cancelledBy === 'CUSTOMER' ? 'You' : 'Practitioner'}
                                    </p>
                                    <p className="text-sm text-gray-600">{booking.cancellationReason}</p>
                                </div>
                            )}
                        </div>

                        {/* Right side - Status & Actions */}
                        <div className="flex flex-col items-end gap-3">
                            {/* Status badge */}
                            <Badge className={`${statusConfig.color} ${statusConfig.bgColor} border`}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {statusConfig.label}
                            </Badge>

                            {/* Price */}
                            {booking.price && (
                                <div className="text-lg font-semibold text-purple-700">
                                    <CurrencySpan value={booking.price} withAnimation={false} />
                                </div>
                            )}

                            {/* Confirmation deadline for pending */}
                            {booking.confirmationStatus === 'PENDING_CONFIRMATION' && booking.confirmationDeadline && (
                                <p className="text-xs text-yellow-700">
                                    Expires: {DateTime.fromISO(booking.confirmationDeadline).toFormat('MMM d, h:mm a')}
                                </p>
                            )}

                            {/* Cancel button */}
                            {canCancel && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCancelClick(booking)}
                                    className="text-red-600 border-red-300 hover:bg-red-50"
                                    data-testid={`cancel-booking-${booking.id}`}
                                >
                                    Cancel Booking
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="space-y-6">
            {upcomingBookings.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-3">Upcoming Bookings</h3>
                    <div className="space-y-4">
                        {upcomingBookings.map(renderBookingCard)}
                    </div>
                </div>
            )}

            {pastBookings.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-slate-600 mb-3">Past Bookings</h3>
                    <div className="space-y-4">
                        {pastBookings.map(renderBookingCard)}
                    </div>
                </div>
            )}

            {/* Cancel Dialog */}
            <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cancel Booking</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to cancel this booking? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedBooking && (
                        <div className="py-4">
                            <div className="p-3 bg-slate-50 rounded-lg space-y-2 text-sm">
                                <p className="font-medium">{selectedBooking.service?.name}</p>
                                <p className="text-slate-600">
                                    {DateTime.fromISO(selectedBooking.scheduledDateTime.date).toFormat('EEEE, MMMM d, yyyy')}
                                    {' at '}
                                    {selectedBooking.scheduledDateTime.time.start}
                                </p>
                            </div>

                            <div className="mt-4">
                                <Label htmlFor="cancel-reason">Reason (optional)</Label>
                                <Textarea
                                    id="cancel-reason"
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    placeholder="Let the practitioner know why you're cancelling..."
                                    className="mt-2"
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
                        >
                            Keep Booking
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmCancel}
                            disabled={cancelMutation.isPending}
                            data-testid="confirm-cancel-btn"
                        >
                            {cancelMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Cancelling...
                                </>
                            ) : (
                                'Cancel Booking'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

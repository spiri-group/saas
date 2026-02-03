'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { CalendarIcon, XCircleIcon, Loader2 } from "lucide-react";
import useUpdateServiceBooking from "../_hooks/UseUpdateServiceBooking";
import useRequestReschedule from "../_hooks/UseRequestReschedule";
import useFormStatus from "@/components/utils/UseFormStatus";
import { toast } from "sonner";
import { DateTime } from "luxon";

type ServiceBooking = {
    id: string;
    customerId: string;
    date: string;
    time: {
        start: string;
        end: string;
    };
    service: {
        id: string;
        name: string;
        cancellationPolicy?: {
            allowRescheduling: boolean;
            maxReschedules: number;
        };
    };
    rescheduleCount?: number;
    status: string;
};

type Props = {
    booking: ServiceBooking;
};

const ServiceBookingActions: React.FC<Props> = ({ booking }) => {
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
    const [cancelReason, setCancelReason] = useState("");
    const [newDate, setNewDate] = useState("");
    const [newStartTime, setNewStartTime] = useState("");
    const [newEndTime, setNewEndTime] = useState("");

    const cancelStatus = useFormStatus();
    const rescheduleStatus = useFormStatus();

    const cancelMutation = useUpdateServiceBooking();
    const rescheduleMutation = useRequestReschedule();

    const handleCancel = () => {
        cancelStatus.submit(
            async () => {
                const result = await cancelMutation.mutateAsync({
                    bookingId: booking.id,
                    customerId: booking.customerId,
                    action: "CANCEL",
                    reason: cancelReason
                });
                return result;
            },
            {},
            (result) => {
                const refundMsg = result.refundAmount
                    ? `You will receive a ${result.refundPercentage}% refund ($${result.refundAmount.toFixed(2)}).`
                    : "No refund will be issued for this cancellation.";

                toast.success(`Booking cancelled. ${refundMsg}`);
                setShowCancelDialog(false);
                setCancelReason("");
                cancelStatus.reset();
            }
        );
    };

    const handleReschedule = () => {
        if (!newDate || !newStartTime || !newEndTime) {
            toast.error("Please select a date and time for your new appointment");
            return;
        }

        rescheduleStatus.submit(
            async () => {
                const result = await rescheduleMutation.mutateAsync({
                    bookingId: booking.id,
                    customerId: booking.customerId,
                    newDate,
                    newTime: {
                        start: newStartTime,
                        end: newEndTime
                    }
                });
                return result;
            },
            {},
            () => {
                toast.success(`Booking rescheduled successfully! New date: ${DateTime.fromISO(newDate).toLocaleString(DateTime.DATE_FULL)}`);
                setShowRescheduleDialog(false);
                setNewDate("");
                setNewStartTime("");
                setNewEndTime("");
                rescheduleStatus.reset();
            }
        );
    };

    const canReschedule =
        booking.service.cancellationPolicy?.allowRescheduling &&
        (booking.rescheduleCount || 0) < (booking.service.cancellationPolicy?.maxReschedules || 0);

    // Don't show actions if booking is already cancelled or completed
    if (booking.status === "CANCELLED" || booking.status === "COMPLETED") {
        return null;
    }

    return (
        <>
            <div className="flex gap-2">
                {canReschedule && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowRescheduleDialog(true)}
                        className="flex items-center gap-2"
                    >
                        <CalendarIcon className="h-4 w-4" />
                        Reschedule
                    </Button>
                )}

                <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowCancelDialog(true)}
                    className="flex items-center gap-2"
                >
                    <XCircleIcon className="h-4 w-4" />
                    Cancel Booking
                </Button>
            </div>

            {/* Cancel Dialog */}
            <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <DialogContent>
                    <DialogTitle>Cancel Booking</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to cancel your booking for <strong>{booking.service.name}</strong> on{" "}
                        {new Date(booking.date).toLocaleDateString()} at {booking.time.start}?
                    </DialogDescription>

                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">Reason for cancellation (optional)</label>
                            <Textarea
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                placeholder="Let us know why you're cancelling..."
                                className="mt-2"
                            />
                        </div>

                        <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                            <p>
                                <strong>Cancellation Policy:</strong> Refunds are based on how far in advance you cancel.
                                The exact refund amount will be calculated based on the service&apos;s cancellation policy.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowCancelDialog(false);
                                setCancelReason("");
                                cancelStatus.reset();
                            }}
                            disabled={cancelStatus.formState === 'processing'}
                        >
                            Keep Booking
                        </Button>
                        <Button
                            variant={cancelStatus.formState === "idle" ? "destructive" : cancelStatus.button.variant}
                            onClick={handleCancel}
                            disabled={cancelStatus.formState === 'processing'}
                        >
                            {cancelStatus.formState === 'processing' && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {cancelStatus.formState === 'idle' ? 'Cancel Booking' : cancelStatus.button.title}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reschedule Dialog */}
            <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
                <DialogContent>
                    <DialogTitle>Reschedule Booking</DialogTitle>
                    <DialogDescription>
                        Select a new date and time for your <strong>{booking.service.name}</strong> appointment.
                    </DialogDescription>

                    <div className="space-y-4">
                        <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-4 text-sm">
                            <p>
                                <strong>Reschedules Remaining:</strong>{" "}
                                {(booking.service.cancellationPolicy?.maxReschedules || 0) - (booking.rescheduleCount || 0)}
                            </p>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="text-sm font-medium">New Date</label>
                                <Input
                                    type="date"
                                    value={newDate}
                                    onChange={(e) => setNewDate(e.target.value)}
                                    min={DateTime.now().toISODate()}
                                    className="mt-2"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm font-medium">Start Time</label>
                                    <Input
                                        type="time"
                                        value={newStartTime}
                                        onChange={(e) => setNewStartTime(e.target.value)}
                                        className="mt-2"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">End Time</label>
                                    <Input
                                        type="time"
                                        value={newEndTime}
                                        onChange={(e) => setNewEndTime(e.target.value)}
                                        className="mt-2"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                            <p>
                                <strong>Current Appointment:</strong> {new Date(booking.date).toLocaleDateString()} at {booking.time.start} - {booking.time.end}
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowRescheduleDialog(false);
                                setNewDate("");
                                setNewStartTime("");
                                setNewEndTime("");
                                rescheduleStatus.reset();
                            }}
                            disabled={rescheduleStatus.formState === 'processing'}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant={rescheduleStatus.formState === "idle" ? "default" : rescheduleStatus.button.variant}
                            onClick={handleReschedule}
                            disabled={rescheduleStatus.formState === 'processing' || !newDate || !newStartTime || !newEndTime}
                        >
                            {rescheduleStatus.formState === 'processing' && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {rescheduleStatus.formState === 'idle' ? 'Confirm Reschedule' : rescheduleStatus.button.title}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default ServiceBookingActions;

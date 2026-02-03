'use client'

import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, Loader2, CheckCircle, Clock } from "lucide-react";
import CurrencySpan from "@/components/ux/CurrencySpan";
import UseJoinWaitlist from "../hooks/UseJoinWaitlist";
import { toast } from "sonner";

type TicketVariant = {
    id: string;
    name: string;
    description?: string;
    price: { amount: number; currency: string };
    peopleCount: number;
};

type SessionRef = {
    id: string;
    partition: string[];
    container: string;
};

type WaitlistDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sessionRef: SessionRef;
    sessionDate: string;
    sessionTime: string;
    tourId: string;
    tourName: string;
    vendorId: string;
    ticketVariants: TicketVariant[];
};

const WaitlistDialog: React.FC<WaitlistDialogProps> = ({
    open,
    onOpenChange,
    sessionRef,
    sessionDate,
    sessionTime,
    tourId,
    tourName,
    vendorId,
    ticketVariants
}) => {
    const [email, setEmail] = useState("");
    const [ticketPreferences, setTicketPreferences] = useState<Record<string, number>>({});
    const [step, setStep] = useState<'form' | 'success'>('form');
    const [position, setPosition] = useState<number | null>(null);

    const joinWaitlist = UseJoinWaitlist();

    const handleSubmit = async () => {
        if (!email) {
            toast.error("Please enter your email address");
            return;
        }

        const preferences = Object.entries(ticketPreferences)
            .filter(([, qty]) => qty > 0)
            .map(([variantId, quantity]) => ({ variantId, quantity }));

        if (preferences.length === 0) {
            toast.error("Please select at least one ticket preference");
            return;
        }

        try {
            const result = await joinWaitlist.mutateAsync({
                sessionRef,
                tourId,
                vendorId,
                customerEmail: email,
                ticketPreferences: preferences
            });

            if (result.success) {
                setPosition(result.queuePosition);
                setStep('success');
                toast.success(result.message);
            } else {
                toast.error(result.message);
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to join waitlist");
        }
    };

    const handleClose = () => {
        // Reset state when closing
        setStep('form');
        setEmail("");
        setTicketPreferences({});
        setPosition(null);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-orange-500" />
                        {step === 'form' ? 'Join the Waitlist' : 'You\'re on the Waitlist!'}
                    </DialogTitle>
                    {step === 'form' && (
                        <DialogDescription>
                            This session is currently full. Join the waitlist and we&apos;ll notify you when a spot becomes available.
                        </DialogDescription>
                    )}
                </DialogHeader>

                {step === 'form' ? (
                    <div className="space-y-4">
                        {/* Session info */}
                        <div className="bg-gray-50 rounded-lg p-3">
                            <div className="font-medium text-gray-900">{tourName}</div>
                            <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                                <Clock className="h-4 w-4" />
                                {sessionDate} at {sessionTime}
                            </div>
                        </div>

                        {/* Email input */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-2">
                                Email Address
                            </label>
                            <Input
                                type="email"
                                placeholder="your@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                data-testid="waitlist-email-input"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                We&apos;ll send you an email when a spot opens up
                            </p>
                        </div>

                        {/* Ticket preferences */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-2">
                                Ticket Preferences
                            </label>
                            <div className="space-y-2">
                                {ticketVariants.map(variant => {
                                    const qty = ticketPreferences[variant.id] || 0;

                                    return (
                                        <div
                                            key={variant.id}
                                            className="flex items-center justify-between p-3 border rounded-lg"
                                        >
                                            <div>
                                                <div className="font-medium text-gray-900">{variant.name}</div>
                                                <div className="text-sm text-gray-600">
                                                    <CurrencySpan value={variant.price} />
                                                    {variant.peopleCount > 1 && (
                                                        <span className="ml-1">({variant.peopleCount} people)</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setTicketPreferences({
                                                        ...ticketPreferences,
                                                        [variant.id]: Math.max(0, qty - 1)
                                                    })}
                                                    disabled={qty === 0}
                                                >
                                                    -
                                                </Button>
                                                <span className="w-8 text-center font-medium">{qty}</span>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setTicketPreferences({
                                                        ...ticketPreferences,
                                                        [variant.id]: qty + 1
                                                    })}
                                                >
                                                    +
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="py-6 text-center space-y-4">
                        <div className="flex justify-center">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircle className="h-8 w-8 text-green-600" />
                            </div>
                        </div>
                        <div>
                            <p className="text-gray-600">
                                You&apos;re now on the waitlist at position:
                            </p>
                            <p className="text-4xl font-bold text-gray-900 mt-2">
                                #{position}
                            </p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
                            <p className="font-medium mb-1">What happens next?</p>
                            <p>
                                We&apos;ll email you at <strong>{email}</strong> as soon as a spot opens up.
                                You&apos;ll have 24 hours to complete your booking.
                            </p>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    {step === 'form' ? (
                        <>
                            <Button variant="outline" onClick={handleClose}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={joinWaitlist.isPending || !email || Object.values(ticketPreferences).every(q => q === 0)}
                                data-testid="waitlist-submit-btn"
                            >
                                {joinWaitlist.isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Joining...
                                    </>
                                ) : (
                                    <>
                                        <Bell className="h-4 w-4 mr-2" />
                                        Join Waitlist
                                    </>
                                )}
                            </Button>
                        </>
                    ) : (
                        <Button onClick={handleClose} className="w-full">
                            Done
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default WaitlistDialog;

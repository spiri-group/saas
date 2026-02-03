'use client'

import React, { useState, useEffect } from "react"
import { recordref_type } from "@/utils/spiriverse";
import ListingRatings from "../../listing/components/ListingRatings";
import { Panel, PanelContent, PanelHeader, PanelTitle } from "@/components/ux/Panel";
import NewReview from "../../../../../components/Review/Create/NewReview";
import AllReview from "../../../../../components/Review/Reviews";
import UseTourDetails from "./hooks/UseTourDetails";
import { Button } from "@/components/ui/button";
import useMerchantTheme from "@/app/(site)/m/_hooks/UseMerchantTheme";
import MerchantFontLoader from "@/app/(site)/m/_components/MerchantFontLoader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import UseAvailableSessions from "./hooks/UseAvailableSessions";
import { DateTime } from "luxon";
import { Calendar, Clock, MapPin, CreditCard, Loader2, CheckCircle, Lock, Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CurrencySpan from "@/components/ux/CurrencySpan";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import UseCreateTourBooking from "./hooks/UseCreateTourBooking";
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import WaitlistDialog from "./components/WaitlistDialog";

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_stripe_token ?? "");

// Session type for waitlist
type WaitlistSession = {
    id: string;
    ref: { id: string; partition: string[]; container: string };
    date: string;
    time: { start: string; end: string };
};

// Checkout step type
type CheckoutStep = 'selection' | 'payment' | 'confirmation';

type BLProps = {
    merchantId: string,
    tourId: string,
}

type Props = BLProps & {}

// Booking data type for payment step
type BookingData = {
    id: string;
    code: string;
    clientSecret: string;
    stripeAccountId?: string;
    totalAmount: { amount: number; currency: string };
};

const useBL = (props: BLProps) => {
    const tour = UseTourDetails(props.merchantId, props.tourId);
    const vendorBranding = useMerchantTheme(props.merchantId);

    const [from] = useState<DateTime>(DateTime.now().startOf('day'));
    const [to] = useState<DateTime>(DateTime.now().plus({ months: 3 }).endOf('day'));
    const sessions = UseAvailableSessions(props.merchantId, props.tourId, from, to);

    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [ticketQuantities, setTicketQuantities] = useState<Record<string, number>>({});
    const [customerEmail, setCustomerEmail] = useState<string>("");

    // Checkout flow state
    const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('selection');
    const [bookingData, setBookingData] = useState<BookingData | null>(null);

    // Waitlist state
    const [waitlistDialogOpen, setWaitlistDialogOpen] = useState(false);
    const [waitlistSession, setWaitlistSession] = useState<WaitlistSession | null>(null);

    const createBooking = UseCreateTourBooking();

    // Proceed to payment step
    const handleProceedToPayment = async () => {
        if (!customerEmail) {
            toast.error("Please enter your email address to continue.");
            return;
        }

        if (!selectedSessionId) {
            toast.error("Please select a date and time.");
            return;
        }

        const selectedSession = sessions.data?.find(s => s.id === selectedSessionId);
        if (!selectedSession) return;

        const tickets = Object.entries(ticketQuantities)
            .filter(([, qty]) => qty > 0)
            .map(([variantId, quantity]) => ({ variantId, quantity }));

        if (tickets.length === 0) {
            toast.error("Please select at least one ticket.");
            return;
        }

        try {
            // Normalize partition to always be an array
            const sessionRef = {
                id: selectedSession.ref.id,
                partition: Array.isArray(selectedSession.ref.partition)
                    ? selectedSession.ref.partition
                    : [selectedSession.ref.partition],
                container: selectedSession.ref.container || ''
            };

            const result = await createBooking.mutateAsync({
                customerEmail,
                merchantId: props.merchantId,
                sessions: [{
                    ref: sessionRef,
                    tickets
                }]
            });

            const booking = result.bookings[0];

            // Check if we have a payment intent client secret for inline checkout
            if (booking.stripe?.paymentIntentSecret) {
                setBookingData({
                    id: booking.id,
                    code: booking.code,
                    clientSecret: booking.stripe.paymentIntentSecret,
                    stripeAccountId: booking.stripe.accountId,
                    totalAmount: booking.totalAmount || { amount: 0, currency: 'AUD' }
                });
                setCheckoutStep('payment');
            } else if (booking.payment_link) {
                // Fallback to payment link if no inline checkout available
                window.location.href = booking.payment_link;
            } else {
                // Free booking - go to confirmation
                setBookingData({
                    id: booking.id,
                    code: booking.code,
                    clientSecret: '',
                    totalAmount: { amount: 0, currency: 'AUD' }
                });
                setCheckoutStep('confirmation');
            }
        } catch (error: any) {
            // Handle concurrent modification gracefully
            if (error.message?.includes('capacity changed') || error.message?.includes('CONCURRENT_MODIFICATION')) {
                toast.error("This session was just booked by someone else. Refreshing page...");
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                toast.error(error.message || "Failed to create booking. Please try again.");
            }
        }
    };

    // Handle successful payment
    const handlePaymentSuccess = () => {
        setCheckoutStep('confirmation');
        toast.success(`Payment successful! Your booking is confirmed.`);
    };

    // Handle payment error
    const handlePaymentError = (error: string) => {
        toast.error(error);
    };

    // Go back to selection
    const handleBackToSelection = () => {
        setCheckoutStep('selection');
        setBookingData(null);
    };

    // Open waitlist dialog for a session
    const openWaitlistDialog = (session: WaitlistSession) => {
        setWaitlistSession(session);
        setWaitlistDialogOpen(true);
    };

    return {
        ref: {
            id: props.tourId,
            partition: props.merchantId
        } as recordref_type,
        tour: tour.data,
        isLoading: tour.isLoading,
        vendorBranding: vendorBranding.data,
        sessions: {
            data: sessions.data || [],
            isLoading: sessions.isLoading
        },
        selectedDate,
        setSelectedDate,
        selectedSessionId,
        setSelectedSessionId,
        ticketQuantities,
        setTicketQuantities,
        customerEmail,
        setCustomerEmail,
        handleProceedToPayment,
        handlePaymentSuccess,
        handlePaymentError,
        handleBackToSelection,
        isBooking: createBooking.isPending,
        checkoutStep,
        bookingData,
        merchantId: props.merchantId,
        tourId: props.tourId,
        // Waitlist
        waitlistDialogOpen,
        setWaitlistDialogOpen,
        waitlistSession,
        openWaitlistDialog
    }
}

const UI: React.FC<Props> = (props) => {
    const bl = useBL(props);

    // Don't render until branding data is available
    if (!bl.vendorBranding || !bl.tour) return null;

    const fontConfig = bl.vendorBranding.vendor.font ? {
        brand: bl.vendorBranding.vendor.font.brand?.family || 'clean',
        default: bl.vendorBranding.vendor.font.default?.family || 'clean',
        headings: bl.vendorBranding.vendor.font.headings?.family || 'clean',
        accent: bl.vendorBranding.vendor.font.accent?.family || 'clean'
    } : undefined;

    // Group sessions by date
    const sessionsByDate = bl.sessions.data.reduce((acc, session) => {
        const date = session.date;
        if (!acc[date]) acc[date] = [];
        acc[date].push(session);
        return acc;
    }, {} as Record<string, typeof bl.sessions.data>);

    const sortedDates = Object.keys(sessionsByDate).sort();
    const selectedSession = bl.sessions.data.find(s => s.id === bl.selectedSessionId);

    // Calculate total people and price
    const totalPeople = Object.entries(bl.ticketQuantities).reduce((sum, [variantId, qty]) => {
        const variant = bl.tour?.ticketVariants.find(v => v.id === variantId);
        return sum + (variant ? variant.peopleCount * qty : 0);
    }, 0);

    const totalPrice = Object.entries(bl.ticketQuantities).reduce((sum, [variantId, qty]) => {
        const variant = bl.tour?.ticketVariants.find(v => v.id === variantId);
        return sum + (variant ? variant.price.amount * qty : 0);
    }, 0);

    const hasSelectedTickets = Object.values(bl.ticketQuantities).some(qty => qty > 0);

    return (
        <div className="flex flex-col space-y-2 ml-2 mr-2"
            style={{
                background: 'rgb(var(--merchant-background, 248, 250, 252))',
                backgroundImage: 'var(--merchant-background-image, linear-gradient(to bottom, #f8fafc, #f1f5f9, #e2e8f0))',
                minHeight: '100vh'
            }}>
            <MerchantFontLoader fonts={fontConfig} />

            {/* Hero Section */}
            <div className="relative w-full h-[400px] rounded-xl overflow-hidden mt-2">
                <img
                    src={bl.tour.thumbnail.image.media.url}
                    alt={bl.tour.name}
                    className="w-full h-full object-cover"
                    style={{
                        objectFit: bl.tour.thumbnail.image.objectFit || 'cover',
                        transform: `scale(${bl.tour.thumbnail.image.zoom || 1})`
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h1 className="text-4xl font-bold text-white mb-2">{bl.tour.name}</h1>
                    <div className="flex items-center gap-4 text-white/90">
                        <span className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {bl.tour.vendor?.name}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left Column - Tour Details */}
                <div className="lg:col-span-2 space-y-4">
                    <Panel style={{
                        backgroundColor: `rgba(var(--merchant-panel), var(--merchant-panel-transparency, 1))`,
                        color: `rgb(var(--merchant-panel-primary-foreground))`,
                        borderColor: `rgb(var(--merchant-primary), 0.2)`,
                        boxShadow: `var(--shadow-merchant-lg)`
                    }}>
                        <PanelHeader>
                            <PanelTitle className="text-merchant-headings-foreground">About This Tour</PanelTitle>
                        </PanelHeader>
                        <PanelContent>
                            <Tabs defaultValue="description">
                                <TabsList>
                                    <TabsTrigger value="description">Description</TabsTrigger>
                                    <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
                                    {bl.tour.terms && <TabsTrigger value="terms">Terms</TabsTrigger>}
                                    {bl.tour.faq.length > 0 && <TabsTrigger value="faq">FAQ</TabsTrigger>}
                                </TabsList>

                                <TabsContent value="description">
                                    <div
                                        className="prose prose-sm max-w-none text-merchant-default-foreground"
                                        dangerouslySetInnerHTML={{ __html: bl.tour.description }}
                                    />
                                </TabsContent>

                                <TabsContent value="itinerary">
                                    {bl.tour.activityLists.length > 0 && (
                                        <div className="space-y-4">
                                            {bl.tour.activityLists[0].activities.map((activity, idx) => (
                                                <div key={activity.id} className="flex gap-4">
                                                    <div className="flex flex-col items-center">
                                                        <div className="w-8 h-8 rounded-full bg-merchant-primary/20 flex items-center justify-center text-sm font-bold">
                                                            {idx + 1}
                                                        </div>
                                                        {idx < bl.tour!.activityLists[0].activities.length - 1 && (
                                                            <div className="w-0.5 h-12 bg-merchant-primary/20" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 pb-4">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Clock className="h-4 w-4 text-merchant-accent-foreground" />
                                                            <span className="text-sm text-merchant-accent-foreground">
                                                                {DateTime.fromISO(activity.time).toLocaleString(DateTime.TIME_SIMPLE)}
                                                            </span>
                                                        </div>
                                                        <h4 className="font-semibold text-merchant-headings-foreground">{activity.name}</h4>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>

                                {bl.tour.terms && (
                                    <TabsContent value="terms">
                                        <div
                                            className="prose prose-sm max-w-none text-merchant-default-foreground"
                                            dangerouslySetInnerHTML={{ __html: bl.tour.terms }}
                                        />
                                    </TabsContent>
                                )}

                                {bl.tour.faq.length > 0 && (
                                    <TabsContent value="faq">
                                        <Accordion type="single" collapsible>
                                            {bl.tour.faq.map((item) => (
                                                <AccordionItem key={item.id} value={item.id}>
                                                    <AccordionTrigger className="text-merchant-headings-foreground">
                                                        {item.title}
                                                    </AccordionTrigger>
                                                    <AccordionContent>
                                                        <div
                                                            className="text-merchant-default-foreground"
                                                            dangerouslySetInnerHTML={{ __html: item.description }}
                                                        />
                                                    </AccordionContent>
                                                </AccordionItem>
                                            ))}
                                        </Accordion>
                                    </TabsContent>
                                )}
                            </Tabs>
                        </PanelContent>
                    </Panel>

                    {/* Reviews */}
                    <Panel style={{
                        backgroundColor: `rgba(var(--merchant-panel), var(--merchant-panel-transparency, 1))`,
                        color: `rgb(var(--merchant-panel-primary-foreground))`,
                        borderColor: `rgb(var(--merchant-primary), 0.2)`,
                        boxShadow: `var(--shadow-merchant-lg)`
                    }}>
                        <PanelHeader className="flex flex-row items-center justify-between">
                            <PanelTitle className="text-merchant-headings-foreground">Reviews</PanelTitle>
                            <NewReview objectId={props.tourId} objectPartition={props.merchantId} />
                        </PanelHeader>
                        <PanelContent>
                            <ListingRatings
                                listingId={props.tourId}
                                merchantId={props.merchantId}
                                useMerchantTheming={true}
                            />
                            <AllReview
                                objectId={props.tourId}
                                objectPartition={props.merchantId}
                                ref={bl.ref}
                            />
                        </PanelContent>
                    </Panel>
                </div>

                {/* Right Column - Booking */}
                <div className="lg:col-span-1">
                    <Card className="sticky top-4" style={{
                        backgroundColor: `rgba(var(--merchant-panel), var(--merchant-panel-transparency, 1))`,
                        borderColor: `rgb(var(--merchant-primary), 0.3)`,
                        boxShadow: `var(--shadow-merchant-lg)`
                    }}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-merchant-headings-foreground">
                                <Calendar className="h-5 w-5" />
                                Book Your Tour
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Date Selection */}
                            <div>
                                <label className="text-sm font-medium text-merchant-default-foreground mb-2 block">
                                    Select Date
                                </label>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {bl.sessions.isLoading ? (
                                        <div className="text-sm text-merchant-default-foreground/70">Loading dates...</div>
                                    ) : sortedDates.length === 0 ? (
                                        <div className="text-sm text-merchant-default-foreground/70">No dates available</div>
                                    ) : (
                                        sortedDates.map(date => {
                                            const dateSessions = sessionsByDate[date];
                                            const hasAvailability = dateSessions.some(s => (s.capacity.remaining || 0) > 0);

                                            return (
                                                <button
                                                    key={date}
                                                    onClick={() => {
                                                        bl.setSelectedDate(date);
                                                        bl.setSelectedSessionId(null);
                                                    }}
                                                    disabled={!hasAvailability}
                                                    className={cn(
                                                        "w-full text-left p-3 rounded-lg border transition-all",
                                                        bl.selectedDate === date
                                                            ? "border-merchant-primary bg-merchant-primary/10"
                                                            : "border-gray-300 hover:border-merchant-primary/50",
                                                        !hasAvailability && "opacity-50 cursor-not-allowed"
                                                    )}
                                                >
                                                    <div className="font-medium text-merchant-headings-foreground">
                                                        {DateTime.fromISO(date).toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY)}
                                                    </div>
                                                    <div className="text-xs text-merchant-default-foreground/70">
                                                        {dateSessions.length} session{dateSessions.length !== 1 ? 's' : ''} available
                                                    </div>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Time Selection */}
                            {bl.selectedDate && sessionsByDate[bl.selectedDate] && (
                                <div>
                                    <label className="text-sm font-medium text-merchant-default-foreground mb-2 block">
                                        Select Time
                                    </label>
                                    <div className="space-y-2">
                                        {sessionsByDate[bl.selectedDate].map(session => {
                                            const isAvailable = (session.capacity.remaining || 0) > 0;
                                            const isFull = session.capacity.remaining === 0;

                                            return (
                                                <div key={session.id} className="space-y-2">
                                                    <button
                                                        onClick={() => isAvailable && bl.setSelectedSessionId(session.id)}
                                                        disabled={!isAvailable}
                                                        className={cn(
                                                            "w-full text-left p-3 rounded-lg border transition-all",
                                                            bl.selectedSessionId === session.id
                                                                ? "border-merchant-primary bg-merchant-primary/10"
                                                                : "border-gray-300 hover:border-merchant-primary/50",
                                                            !isAvailable && "opacity-50"
                                                        )}
                                                    >
                                                        <div className="flex justify-between items-center">
                                                            <div>
                                                                <div className="font-medium text-merchant-headings-foreground">
                                                                    {DateTime.fromISO(`${session.date}T${session.time.start}`).toLocaleString(DateTime.TIME_SIMPLE)}
                                                                    {' - '}
                                                                    {DateTime.fromISO(`${session.date}T${session.time.end}`).toLocaleString(DateTime.TIME_SIMPLE)}
                                                                </div>
                                                                <div className="text-xs text-merchant-default-foreground/70">
                                                                    {isAvailable
                                                                        ? `${session.capacity.remaining || 0} ${session.capacity.mode === 'PER_PERSON' ? 'spots' : 'tickets'} left`
                                                                        : 'Session is full'
                                                                    }
                                                                </div>
                                                            </div>
                                                            {isFull && (
                                                                <Badge variant="destructive">Full</Badge>
                                                            )}
                                                        </div>
                                                    </button>
                                                    {isFull && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-full text-orange-600 border-orange-300 hover:bg-orange-50 hover:border-orange-400"
                                                            onClick={() => bl.openWaitlistDialog({
                                                                id: session.id,
                                                                ref: {
                                                                    id: session.ref.id,
                                                                    partition: Array.isArray(session.ref.partition)
                                                                        ? session.ref.partition
                                                                        : [session.ref.partition],
                                                                    container: session.ref.container || 'Tour-Session'
                                                                },
                                                                date: session.date,
                                                                time: session.time
                                                            })}
                                                            data-testid={`join-waitlist-btn-${session.id}`}
                                                        >
                                                            <Bell className="h-4 w-4 mr-2" />
                                                            Join Waitlist
                                                        </Button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Ticket Selection */}
                            {bl.selectedSessionId && (
                                <div>
                                    <label className="text-sm font-medium text-merchant-default-foreground mb-2 block">
                                        Select Tickets
                                    </label>
                                    <div className="space-y-3">
                                        {bl.tour.ticketVariants.map(variant => {
                                            const qty = bl.ticketQuantities[variant.id] || 0;
                                            const available = variant.inventory.qty_available || 0;
                                            const isLowStock = variant.inventory.track_inventory &&
                                                              available <= (variant.inventory.low_stock_threshold || 5) &&
                                                              available > 0;

                                            return (
                                                <div key={variant.id} className="p-3 border border-gray-300 rounded-lg">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <div className="font-medium text-merchant-headings-foreground">{variant.name}</div>
                                                            {variant.description && (
                                                                <div className="text-xs text-merchant-default-foreground/70">{variant.description}</div>
                                                            )}
                                                            <div className="text-sm text-merchant-accent-foreground">
                                                                <CurrencySpan value={variant.price} />
                                                                {variant.peopleCount > 1 && (
                                                                    <span className="text-xs ml-1">({variant.peopleCount} people)</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {isLowStock && (
                                                            <Badge variant="outline" className="text-orange-500 border-orange-500">
                                                                Only {available} left
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                const newQty = Math.max(0, qty - 1);
                                                                bl.setTicketQuantities({
                                                                    ...bl.ticketQuantities,
                                                                    [variant.id]: newQty
                                                                });
                                                            }}
                                                            disabled={qty === 0}
                                                        >
                                                            -
                                                        </Button>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            max={variant.inventory.track_inventory ? available : 100}
                                                            value={qty}
                                                            onChange={(e) => {
                                                                const newQty = parseInt(e.target.value) || 0;
                                                                const maxQty = variant.inventory.track_inventory ? available : 100;
                                                                bl.setTicketQuantities({
                                                                    ...bl.ticketQuantities,
                                                                    [variant.id]: Math.min(Math.max(0, newQty), maxQty)
                                                                });
                                                            }}
                                                            className="w-16 text-center"
                                                        />
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                const maxQty = variant.inventory.track_inventory ? available : 100;
                                                                const newQty = Math.min(qty + 1, maxQty);
                                                                bl.setTicketQuantities({
                                                                    ...bl.ticketQuantities,
                                                                    [variant.id]: newQty
                                                                });
                                                            }}
                                                            disabled={variant.inventory.track_inventory && qty >= available}
                                                        >
                                                            +
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Summary & Checkout */}
                            {hasSelectedTickets && selectedSession && bl.checkoutStep === 'selection' && (
                                <div className="pt-4 border-t space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-merchant-default-foreground/70">Total People:</span>
                                            <span className="font-medium text-merchant-headings-foreground">{totalPeople}</span>
                                        </div>
                                        <div className="flex justify-between text-lg font-bold">
                                            <span className="text-merchant-headings-foreground">Total:</span>
                                            <span className="text-merchant-primary">
                                                <CurrencySpan value={{ amount: totalPrice, currency: bl.tour.ticketVariants[0].price.currency }} />
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-merchant-default-foreground mb-2 block">
                                            Email Address
                                        </label>
                                        <Input
                                            type="email"
                                            placeholder="your@email.com"
                                            value={bl.customerEmail}
                                            onChange={(e) => bl.setCustomerEmail(e.target.value)}
                                            className="w-full"
                                            data-testid="booking-email-input"
                                        />
                                    </div>
                                    <Button
                                        className="w-full"
                                        size="lg"
                                        onClick={bl.handleProceedToPayment}
                                        disabled={bl.isBooking || !bl.customerEmail}
                                        data-testid="proceed-to-payment-btn"
                                    >
                                        {bl.isBooking ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <CreditCard className="h-4 w-4 mr-2" />
                                                Proceed to Payment
                                            </>
                                        )}
                                    </Button>
                                    <p className="text-xs text-center text-merchant-default-foreground/50 flex items-center justify-center gap-1">
                                        <Lock className="h-3 w-3" />
                                        Secure checkout powered by Stripe
                                    </p>
                                </div>
                            )}

                            {/* Payment Step */}
                            {bl.checkoutStep === 'payment' && bl.bookingData && (
                                <StripeCheckoutForm
                                    clientSecret={bl.bookingData.clientSecret}
                                    stripeAccountId={bl.bookingData.stripeAccountId}
                                    bookingCode={bl.bookingData.code}
                                    totalAmount={bl.bookingData.totalAmount}
                                    onSuccess={bl.handlePaymentSuccess}
                                    onError={bl.handlePaymentError}
                                    onBack={bl.handleBackToSelection}
                                    merchantId={bl.merchantId}
                                />
                            )}

                            {/* Confirmation Step */}
                            {bl.checkoutStep === 'confirmation' && bl.bookingData && (
                                <div className="pt-4 space-y-4 text-center">
                                    <div className="flex justify-center">
                                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                                            <CheckCircle className="h-8 w-8 text-green-600" />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-merchant-headings-foreground">
                                            Booking Confirmed!
                                        </h3>
                                        <p className="text-merchant-default-foreground/70 mt-1">
                                            Your booking code is:
                                        </p>
                                        <p className="text-2xl font-mono font-bold text-merchant-primary mt-2">
                                            {bl.bookingData.code}
                                        </p>
                                    </div>
                                    <p className="text-sm text-merchant-default-foreground/70">
                                        A confirmation email has been sent to your email address.
                                    </p>
                                    <Button
                                        variant="outline"
                                        onClick={() => window.location.reload()}
                                        className="w-full"
                                    >
                                        Book Another Tour
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Waitlist Dialog */}
            {bl.waitlistSession && (
                <WaitlistDialog
                    open={bl.waitlistDialogOpen}
                    onOpenChange={bl.setWaitlistDialogOpen}
                    sessionRef={bl.waitlistSession.ref}
                    sessionDate={DateTime.fromISO(bl.waitlistSession.date).toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY)}
                    sessionTime={`${DateTime.fromISO(`${bl.waitlistSession.date}T${bl.waitlistSession.time.start}`).toLocaleString(DateTime.TIME_SIMPLE)} - ${DateTime.fromISO(`${bl.waitlistSession.date}T${bl.waitlistSession.time.end}`).toLocaleString(DateTime.TIME_SIMPLE)}`}
                    tourId={bl.tourId}
                    tourName={bl.tour?.name || ''}
                    vendorId={bl.merchantId}
                    ticketVariants={bl.tour?.ticketVariants || []}
                />
            )}
        </div>
    );
}

// Stripe Checkout Form Component
type StripeCheckoutFormProps = {
    clientSecret: string;
    stripeAccountId?: string;
    bookingCode: string;
    totalAmount: { amount: number; currency: string };
    onSuccess: () => void;
    onError: (error: string) => void;
    onBack: () => void;
    merchantId: string;
};

const StripeCheckoutForm: React.FC<StripeCheckoutFormProps> = ({
    clientSecret,
    stripeAccountId,
    bookingCode,
    totalAmount,
    onSuccess,
    onError,
    onBack,
    merchantId
}) => {
    // Load Stripe with connected account if applicable
    const [stripePromiseWithAccount, setStripePromiseWithAccount] = useState<ReturnType<typeof loadStripe> | null>(null);

    useEffect(() => {
        if (stripeAccountId) {
            setStripePromiseWithAccount(loadStripe(process.env.NEXT_PUBLIC_stripe_token ?? "", {
                stripeAccount: stripeAccountId
            }));
        } else {
            setStripePromiseWithAccount(stripePromise);
        }
    }, [stripeAccountId]);

    if (!stripePromiseWithAccount) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-merchant-primary" />
            </div>
        );
    }

    return (
        <Elements
            stripe={stripePromiseWithAccount}
            options={{
                clientSecret,
                appearance: {
                    theme: 'stripe',
                    variables: {
                        colorPrimary: '#6366f1',
                        colorBackground: '#ffffff',
                        colorText: '#1f2937',
                        colorDanger: '#ef4444',
                        fontFamily: 'system-ui, sans-serif',
                        borderRadius: '8px'
                    }
                }
            }}
        >
            <CheckoutFormContent
                bookingCode={bookingCode}
                totalAmount={totalAmount}
                onSuccess={onSuccess}
                onError={onError}
                onBack={onBack}
                merchantId={merchantId}
            />
        </Elements>
    );
};

// Inner form that uses Stripe hooks
const CheckoutFormContent: React.FC<{
    bookingCode: string;
    totalAmount: { amount: number; currency: string };
    onSuccess: () => void;
    onError: (error: string) => void;
    onBack: () => void;
    merchantId: string;
}> = ({ bookingCode, totalAmount, onSuccess, onError, onBack, merchantId }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setIsProcessing(true);

        try {
            const { error, paymentIntent } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: `${window.location.origin}/m/${merchantId}/booking/success?code=${bookingCode}`
                },
                redirect: 'if_required'
            });

            if (error) {
                onError(error.message || 'Payment failed. Please try again.');
            } else if (paymentIntent && paymentIntent.status === 'succeeded') {
                onSuccess();
            } else if (paymentIntent && paymentIntent.status === 'requires_action') {
                // 3D Secure or other action required - Stripe will handle redirect
                onError('Additional authentication required. Please follow the prompts.');
            }
        } catch (err: any) {
            onError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="pt-4 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b">
                <button
                    type="button"
                    onClick={onBack}
                    className="text-sm text-merchant-links hover:underline"
                >
                    ← Back to selection
                </button>
                <div className="text-right">
                    <div className="text-xs text-merchant-default-foreground/70">Booking</div>
                    <div className="font-mono font-bold">{bookingCode}</div>
                </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center">
                    <span className="text-merchant-default-foreground">Total to pay:</span>
                    <span className="text-xl font-bold text-merchant-headings-foreground">
                        <CurrencySpan value={totalAmount} />
                    </span>
                </div>
            </div>

            <div className="space-y-4">
                <PaymentElement
                    options={{
                        layout: 'tabs'
                    }}
                />
            </div>

            <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={!stripe || !elements || isProcessing}
                data-testid="confirm-payment-btn"
            >
                {isProcessing ? (
                    <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing Payment...
                    </>
                ) : (
                    <>
                        <Lock className="h-4 w-4 mr-2" />
                        Pay <CurrencySpan value={totalAmount} />
                    </>
                )}
            </Button>

            <p className="text-xs text-center text-merchant-default-foreground/50">
                Your payment is secured by Stripe. We never store your card details.
            </p>
        </form>
    );
};

export default UI;

import { GraphQLError } from "graphql";
import { DateTime } from "luxon";
import { serverContext } from "../../../services/azFunction";
import { booking_type, session_type, tour_type } from "../types";
import { StatusType } from "../../0_shared/types";
import { restore_ticket_inventory } from "../utils/ticket_inventory";
import { calculate_session_capacity } from "../utils/session_capacity";
import { process_waitlist_on_slot_open } from "../utils/waitlist_manager";
import { vendor_type } from "../../vendor/types";

// Rate limiting map (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;

function checkRateLimit(key: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(key);

    if (!entry || now > entry.resetTime) {
        rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
        return true;
    }

    if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
        return false;
    }

    entry.count++;
    return true;
}

/**
 * Calculate cancellation eligibility based on tour's return policy
 * Default: Allow cancellation up to 24 hours before session
 */
function calculateCancellationEligibility(
    sessionDate: string,
    sessionTime: { from?: string; to?: string } | undefined,
    policy: any | null
): {
    canCancel: boolean;
    cancellationDeadline: string | null;
    refundPercentage: number;
    policyDetails: any;
} {
    const now = DateTime.now();

    // Combine session date and time
    let sessionDateTime: DateTime;
    if (sessionTime?.from) {
        // Parse time like "09:00" and combine with date
        const [hours, minutes] = sessionTime.from.split(':').map(Number);
        sessionDateTime = DateTime.fromISO(sessionDate).set({ hour: hours, minute: minutes });
    } else {
        // Default to start of day if no time specified
        sessionDateTime = DateTime.fromISO(sessionDate).startOf('day');
    }

    // Default policy: 24 hours before session
    const defaultDeadlineHours = 24;
    let deadlineHours = defaultDeadlineHours;
    let refundPercentage = 100;
    let policyDetails = null;

    // Check if there's a product return policy
    if (policy) {
        policyDetails = {
            title: policy.title,
            fullRefundHours: null as number | null,
            partialRefundHours: null as number | null,
            partialRefundPercentage: null as number | null,
            refundPercentage: 100
        };

        // Look for a "cancellation" reason in the policy
        const cancellationReason = policy.reasons?.find(
            (r: any) => r.code === 'CANCELLATION' || r.code === 'CUSTOMER_CANCELLATION'
        );

        if (cancellationReason?.tiers && cancellationReason.tiers.length > 0) {
            // Sort tiers by daysUpTo (ascending)
            const sortedTiers = [...cancellationReason.tiers].sort(
                (a: any, b: any) => (a.daysUpTo || 0) - (b.daysUpTo || 0)
            );

            // Calculate hours until session
            const hoursUntilSession = sessionDateTime.diff(now, 'hours').hours;

            // Find applicable tier based on time until session
            for (const tier of sortedTiers) {
                const tierHours = (tier.daysUpTo || 0) * 24;
                if (hoursUntilSession >= tierHours) {
                    refundPercentage = tier.refundPercentage || 100;
                    deadlineHours = tierHours;
                }
            }

            // Set policy details
            if (sortedTiers.length > 0) {
                const firstTier = sortedTiers[0];
                policyDetails.fullRefundHours = (firstTier.daysUpTo || 1) * 24;
                policyDetails.refundPercentage = refundPercentage;

                if (sortedTiers.length > 1) {
                    const secondTier = sortedTiers[1];
                    policyDetails.partialRefundHours = (secondTier.daysUpTo || 0) * 24;
                    policyDetails.partialRefundPercentage = secondTier.refundPercentage;
                }
            }
        }
    }

    // Calculate deadline
    const deadline = sessionDateTime.minus({ hours: deadlineHours });
    const canCancel = now < deadline;

    return {
        canCancel,
        cancellationDeadline: deadline.toISO(),
        refundPercentage: canCancel ? refundPercentage : 0,
        policyDetails
    };
}

export const public_booking_resolvers = {
    Query: {
        publicBookingByCode: async (
            _: any,
            args: { code: string; merchantSlug: string },
            context: serverContext
        ) => {
            const { code, merchantSlug } = args;

            // Rate limit by IP or booking code
            const rateLimitKey = `public-booking:${code}:${merchantSlug}`;
            if (!checkRateLimit(rateLimitKey)) {
                throw new GraphQLError("Too many requests. Please try again later.", {
                    extensions: { code: 'RATE_LIMITED' }
                });
            }

            try {
                // 1. Resolve merchant slug to ID
                const vendorQuery = await context.dataSources.cosmos.run_query<{ id: string; name: string; slug: string }>(
                    "Main-Vendor",
                    {
                        query: "SELECT c.id, c.name, c.slug FROM c WHERE c.slug = @slug",
                        parameters: [{ name: "@slug", value: merchantSlug }]
                    },
                    true
                );

                if (vendorQuery.length === 0) {
                    throw new GraphQLError("Merchant not found", {
                        extensions: { code: 'MERCHANT_NOT_FOUND' }
                    });
                }

                const vendor = vendorQuery[0];
                const vendorId = vendor.id;

                // 2. Find booking by code for the specified vendor
                const query = `SELECT * FROM c WHERE c.code = @code AND c.vendorId = @vendorId`;
                const parameters = [
                    { name: "@code", value: code },
                    { name: "@vendorId", value: vendorId }
                ];

                const bookings = await context.dataSources.cosmos.run_query<booking_type>(
                    "Main-Bookings",
                    { query, parameters }
                );

                if (bookings.length === 0) {
                    throw new GraphQLError("Booking not found", {
                        extensions: { code: 'BOOKING_NOT_FOUND' }
                    });
                }

                const booking = bookings[0];

                // 3. Load session details
                let sessionDate = '';
                let sessionTime: { from?: string; to?: string } | undefined;
                let tourName = '';
                let productReturnPolicy = null;
                let tour: tour_type | null = null;

                if (booking.sessions && booking.sessions.length > 0) {
                    const sessionRef = booking.sessions[0].ref;
                    try {
                        const session = await context.dataSources.cosmos.get_record<session_type>(
                            sessionRef.container,
                            sessionRef.id,
                            sessionRef.partition
                        );

                        sessionDate = session.date;
                        // Convert timeRange_type (start/end) to the expected format (from/to)
                        sessionTime = session.time ? { from: session.time.start, to: session.time.end } : undefined;

                        // Load tour details
                        tour = await context.dataSources.cosmos.get_record<tour_type>(
                            session.forObject.container,
                            session.forObject.id,
                            session.forObject.partition
                        );

                        if (tour) {
                            tourName = tour.name;

                            // Load product return policy if exists
                            if (tour.productReturnPolicyId) {
                                try {
                                    productReturnPolicy = await context.dataSources.cosmos.get_record(
                                        "Main-VendorSettings",
                                        tour.productReturnPolicyId,
                                        vendorId
                                    );
                                } catch (policyError) {
                                    console.error("Error loading product return policy:", policyError);
                                }
                            }
                        }
                    } catch (error) {
                        console.error("Error loading session/tour details:", error);
                    }
                }

                // 4. Build ticket information (limited public data)
                const tickets = booking.sessions[0]?.tickets.map(ticket => {
                    const variant = tour?.ticketVariants.find(v => v.id === ticket.variantId);
                    return {
                        variantName: variant?.name || 'Ticket',
                        quantity: ticket.quantity,
                        price: ticket.price
                    };
                }) || [];

                // 5. Calculate cancellation eligibility
                const cancellationInfo = calculateCancellationEligibility(
                    sessionDate,
                    sessionTime,
                    productReturnPolicy
                );

                // 6. Determine if booking can be cancelled
                // Cannot cancel if already cancelled, already checked in, or past deadline
                const isCancelled = booking.ticketStatus === StatusType.CANCELLED;
                const isCheckedIn = !!booking.checkedIn;
                const isPendingPayment = booking.ticketStatus === StatusType.AWAITING_PAYMENT;

                const canCancel = !isCancelled && !isCheckedIn && !isPendingPayment && cancellationInfo.canCancel;

                // 7. Return limited public booking details
                return {
                    code: booking.code,
                    tourName,
                    sessionDate,
                    sessionTime,
                    tickets,
                    totalAmount: booking.totalAmount,
                    canCancel,
                    cancellationDeadline: cancellationInfo.cancellationDeadline,
                    cancellationPolicy: cancellationInfo.policyDetails,
                    ticketStatus: booking.ticketStatus,
                    merchantName: vendor.name,
                    merchantSlug: vendor.slug
                };

            } catch (error) {
                console.error("Error fetching public booking:", error);
                if (error instanceof GraphQLError) {
                    throw error;
                }
                throw new GraphQLError("Failed to fetch booking details");
            }
        }
    },

    Mutation: {
        customer_cancel_booking: async (
            _: any,
            args: { bookingCode: string; customerEmail: string; merchantSlug: string },
            context: serverContext
        ) => {
            const { bookingCode, customerEmail, merchantSlug } = args;

            // Rate limit by email
            const rateLimitKey = `cancel-booking:${customerEmail}`;
            if (!checkRateLimit(rateLimitKey)) {
                throw new GraphQLError("Too many cancellation attempts. Please try again later.", {
                    extensions: { code: 'RATE_LIMITED' }
                });
            }

            try {
                // 1. Resolve merchant slug to ID
                const vendorQuery = await context.dataSources.cosmos.run_query<vendor_type>(
                    "Main-Vendor",
                    {
                        query: "SELECT * FROM c WHERE c.slug = @slug",
                        parameters: [{ name: "@slug", value: merchantSlug }]
                    },
                    true
                );

                if (vendorQuery.length === 0) {
                    throw new GraphQLError("Merchant not found", {
                        extensions: { code: 'MERCHANT_NOT_FOUND' }
                    });
                }

                const vendor = vendorQuery[0];
                const vendorId = vendor.id;

                // 2. Find booking by code
                const query = `SELECT * FROM c WHERE c.code = @code AND c.vendorId = @vendorId`;
                const parameters = [
                    { name: "@code", value: bookingCode },
                    { name: "@vendorId", value: vendorId }
                ];

                const bookings = await context.dataSources.cosmos.run_query<booking_type>(
                    "Main-Bookings",
                    { query, parameters }
                );

                if (bookings.length === 0) {
                    throw new GraphQLError("Booking not found", {
                        extensions: { code: 'BOOKING_NOT_FOUND' }
                    });
                }

                const booking = bookings[0];

                // 3. Verify customer email matches (case-insensitive)
                if (booking.customerEmail?.toLowerCase() !== customerEmail.toLowerCase()) {
                    throw new GraphQLError("Email does not match the booking", {
                        extensions: { code: 'EMAIL_MISMATCH' }
                    });
                }

                // 4. Check if booking can be cancelled
                if (booking.ticketStatus === StatusType.CANCELLED) {
                    throw new GraphQLError("Booking is already cancelled", {
                        extensions: { code: 'ALREADY_CANCELLED' }
                    });
                }

                if (booking.checkedIn) {
                    throw new GraphQLError("Cannot cancel a checked-in booking", {
                        extensions: { code: 'ALREADY_CHECKED_IN' }
                    });
                }

                if (booking.ticketStatus === StatusType.AWAITING_PAYMENT) {
                    throw new GraphQLError("Cannot cancel an unpaid booking. Contact the merchant for assistance.", {
                        extensions: { code: 'BOOKING_UNPAID' }
                    });
                }

                // 5. Load session and tour details
                if (!booking.sessions || booking.sessions.length === 0) {
                    throw new GraphQLError("Invalid booking - no session found");
                }

                const sessionRef = booking.sessions[0].ref;
                const session = await context.dataSources.cosmos.get_record<session_type>(
                    sessionRef.container,
                    sessionRef.id,
                    sessionRef.partition
                );

                if (!session) {
                    throw new GraphQLError("Session not found");
                }

                const tour = await context.dataSources.cosmos.get_record<tour_type>(
                    session.forObject.container,
                    session.forObject.id,
                    session.forObject.partition
                );

                if (!tour) {
                    throw new GraphQLError("Tour not found");
                }

                // 6. Load product return policy
                let productReturnPolicy = null;
                if (tour.productReturnPolicyId) {
                    try {
                        productReturnPolicy = await context.dataSources.cosmos.get_record(
                            "Main-VendorSettings",
                            tour.productReturnPolicyId,
                            vendorId
                        );
                    } catch (policyError) {
                        console.error("Error loading product return policy:", policyError);
                    }
                }

                // 7. Check cancellation eligibility
                // Convert timeRange_type (start/end) to the expected format (from/to)
                const sessionTimeForCancellation = session.time ? { from: session.time.start, to: session.time.end } : undefined;
                const cancellationInfo = calculateCancellationEligibility(
                    session.date,
                    sessionTimeForCancellation,
                    productReturnPolicy
                );

                if (!cancellationInfo.canCancel) {
                    throw new GraphQLError(
                        `Cancellation deadline has passed. The deadline was ${DateTime.fromISO(cancellationInfo.cancellationDeadline!).toLocaleString(DateTime.DATETIME_FULL)}. Please contact the merchant for assistance.`,
                        { extensions: { code: 'CANCELLATION_DEADLINE_PASSED' } }
                    );
                }

                const refundPercentage = cancellationInfo.refundPercentage;

                // 8. Calculate refund amount
                let refundAmount = null;
                if (booking.totalAmount && refundPercentage > 0) {
                    refundAmount = {
                        amount: Math.round(booking.totalAmount.amount * (refundPercentage / 100) * 100) / 100,
                        currency: booking.totalAmount.currency
                    };
                }

                // 9. Restore ticket inventory
                const bookingSession = booking.sessions[0];
                const inventoryPatches: any[] = [];
                for (const ticket of bookingSession.tickets) {
                    const patches = restore_ticket_inventory(
                        tour,
                        ticket.variantId,
                        ticket.quantity,
                        booking.orderId || booking.id,
                        "CUSTOMER"
                    );
                    inventoryPatches.push(...patches);
                }

                if (inventoryPatches.length > 0) {
                    await context.dataSources.cosmos.patch_record(
                        "Main-Listing",
                        tour.id,
                        vendorId,
                        inventoryPatches,
                        "CUSTOMER"
                    );
                }

                // 10. Process Stripe refund if applicable
                let refundInitiated = false;
                if (booking.stripe?.paymentIntent?.id && refundPercentage > 0) {
                    try {
                        let stripeService = context.dataSources.stripe;
                        if (booking.stripe?.accountId && booking.stripe.accountId !== 'SPIRIVERSE') {
                            stripeService = context.dataSources.stripe.asConnectedAccount(booking.stripe.accountId);
                        } else if (vendor.stripe?.accountId && vendor.stripe.accountId !== 'SPIRIVERSE') {
                            stripeService = context.dataSources.stripe.asConnectedAccount(vendor.stripe.accountId);
                        }

                        // Get payment intent to find charges
                        const paymentIntentResponse = await stripeService.callApi(
                            "GET",
                            `payment_intents/${booking.stripe.paymentIntent.id}`
                        );

                        if (paymentIntentResponse.status === 200 && paymentIntentResponse.data.latest_charge) {
                            // Calculate refund amount in smallest unit
                            const refundAmountSmallest = refundAmount
                                ? Math.round(refundAmount.amount * 100)
                                : undefined;

                            const refundData: any = {
                                charge: paymentIntentResponse.data.latest_charge,
                                reason: "requested_by_customer",
                                metadata: {
                                    bookingId: booking.id,
                                    bookingCode: booking.code,
                                    cancellationType: "CUSTOMER_SELF_SERVICE",
                                    refundPercentage: refundPercentage,
                                    triggeredBy: "CUSTOMER"
                                }
                            };

                            // If partial refund, specify amount
                            if (refundPercentage < 100 && refundAmountSmallest) {
                                refundData.amount = refundAmountSmallest;
                            }

                            const refundResponse = await stripeService.callApi("POST", "refunds", refundData);

                            if (refundResponse.status === 200) {
                                refundInitiated = true;
                            } else {
                                console.error("Failed to process refund:", refundResponse);
                            }
                        }
                    } catch (refundError) {
                        console.error("Error processing Stripe refund:", refundError);
                        // Continue with cancellation even if refund fails
                    }
                }

                // 11. Update booking status to CANCELLED
                const cancellationTime = DateTime.now().toISO();
                const statusLogEntry = {
                    datetime: cancellationTime,
                    label: `Booking cancelled by customer (${refundPercentage}% refund)`,
                    triggeredBy: "CUSTOMER"
                };

                await context.dataSources.cosmos.patch_record(
                    booking.ref.container,
                    booking.ref.id,
                    booking.ref.partition,
                    [
                        { op: "set", path: "/ticketStatus", value: StatusType.CANCELLED },
                        { op: "add", path: "/status_log/-", value: statusLogEntry },
                        { op: "set", path: "/cancelledAt", value: cancellationTime },
                        { op: "set", path: "/cancellationReason", value: "Customer self-cancellation" },
                        { op: "set", path: "/refundProcessed", value: refundInitiated },
                        { op: "set", path: "/refundPercentage", value: refundPercentage },
                        { op: "set", path: "/refundAmount", value: refundAmount }
                    ],
                    "CUSTOMER"
                );

                // 12. Update session capacity
                const updatedSession = await context.dataSources.cosmos.get_record<session_type>(
                    sessionRef.container,
                    sessionRef.id,
                    sessionRef.partition
                );

                if (updatedSession.bookings) {
                    updatedSession.bookings = updatedSession.bookings.filter(b => b.id !== booking.id);
                }

                const capacityInfo = calculate_session_capacity(updatedSession, tour);

                await context.dataSources.cosmos.patch_record(
                    "Tour-Session",
                    session.id,
                    session.forObject.partition,
                    [
                        { op: "set", path: "/capacity/current", value: capacityInfo.current },
                        { op: "set", path: "/capacity/remaining", value: capacityInfo.remaining }
                    ],
                    "CUSTOMER"
                );

                // 13. Update associated order if exists
                if (booking.orderId) {
                    try {
                        await context.dataSources.cosmos.patch_record(
                            "Main-Orders",
                            booking.orderId,
                            booking.orderId,
                            [
                                { op: "set", path: "/status", value: "CANCELLED" },
                                { op: "set", path: "/cancelledAt", value: cancellationTime },
                                { op: "set", path: "/cancellationReason", value: "Customer self-cancellation" }
                            ],
                            "CUSTOMER"
                        );
                    } catch (orderError) {
                        console.error("Error updating order status:", orderError);
                    }
                }

                // 14. Process waitlist
                let totalSlotsFreed = 0;
                const capacityMode = session.capacity?.mode || 'PER_PERSON';
                if (capacityMode === 'PER_PERSON') {
                    totalSlotsFreed = bookingSession.tickets.reduce((sum, ticket) => {
                        const variant = tour.ticketVariants.find(v => v.id === ticket.variantId);
                        if (!variant) return sum;
                        return sum + (variant.peopleCount * ticket.quantity);
                    }, 0);
                } else {
                    totalSlotsFreed = bookingSession.tickets.reduce((sum, ticket) => sum + ticket.quantity, 0);
                }

                try {
                    await process_waitlist_on_slot_open(context, sessionRef, totalSlotsFreed);
                } catch (waitlistError) {
                    console.error("Error processing waitlist:", waitlistError);
                }

                // 15. Send cancellation confirmation email
                try {
                    await context.dataSources.email.sendEmail(
                        "noreply@spiriverse.com",
                        customerEmail,
                        "TOUR_BOOKING_CANCELLED",
                        {
                            tourName: tour.name,
                            sessionDate: session.date,
                            sessionTime: session.time,
                            bookingCode: booking.code,
                            cancellationReason: "Customer self-cancellation",
                            refundProcessed: refundInitiated,
                            refundAmount: refundAmount,
                            refundPercentage: refundPercentage
                        }
                    );
                } catch (emailError) {
                    console.error("Failed to send booking cancellation email:", emailError);
                }

                return {
                    code: "200",
                    success: true,
                    message: refundInitiated
                        ? `Booking cancelled successfully. A ${refundPercentage}% refund has been initiated.`
                        : `Booking cancelled successfully.${refundPercentage < 100 ? ` Note: Only ${refundPercentage}% refund applies based on the cancellation policy.` : ''}`,
                    refundAmount,
                    refundPercentage,
                    refundInitiated
                };

            } catch (error) {
                console.error("Error cancelling booking:", error);
                if (error instanceof GraphQLError) {
                    throw error;
                }
                throw new GraphQLError(`Failed to cancel booking: ${error.message}`);
            }
        }
    }
};

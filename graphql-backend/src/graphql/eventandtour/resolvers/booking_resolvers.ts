import { GraphQLError } from "graphql";
import { v4 as uuidv4 } from "uuid";
import { DateTime, Duration } from "luxon";
import { serverContext } from "../../../services/azFunction";
import { booking_type, session_type, tour_type, booking_ticket_type } from "../types";
import { commit_ticket_inventory, rollback_ticket_inventory, restore_ticket_inventory } from "../utils/ticket_inventory";
import { validate_session_capacity, calculate_session_capacity } from "../utils/session_capacity";
import { process_waitlist_on_slot_open } from "../utils/waitlist_manager";
import { StatusType, recordref_type } from "../../0_shared/types";
import { order_type } from "../../order/types";
import { vendor_type } from "../../vendor/types";
import { encodeAmountToSmallestUnit } from "../../../utils/functions";

export const booking_resolvers = {
    Query: {
        bookingByCode: async (_: any, args: { code: string; vendorId: string }, context: serverContext) => {
            const { code, vendorId } = args;

            // Find booking by code for the specified vendor
            const query = `SELECT * FROM c WHERE c.code = @code AND c.vendorId = @vendorId`;
            const parameters = [
                { name: "@code", value: code },
                { name: "@vendorId", value: vendorId }
            ];

            const bookings = await context.dataSources.cosmos.run_query<booking_type>("Main-Bookings", {
                query,
                parameters
            });

            if (bookings.length === 0) {
                return null;
            }

            const booking = bookings[0];

            // Load session details for the booking
            if (booking.sessions && booking.sessions.length > 0) {
                const sessionRef = booking.sessions[0].ref;
                try {
                    const session = await context.dataSources.cosmos.get_record<session_type>(
                        sessionRef.container,
                        sessionRef.id,
                        sessionRef.partition
                    );

                    // Load tour details
                    const tour = await context.dataSources.cosmos.get_record<tour_type>(
                        session.forObject.container,
                        session.forObject.id,
                        session.forObject.partition
                    );

                    // Attach session and tour info to booking for convenience
                    (booking as any).sessionDetails = session;
                    (booking as any).tourDetails = tour;
                } catch (error) {
                    console.error("Error loading session/tour details:", error);
                }
            }

            return booking;
        },

        tourBookings: async (_: any, args: { userId?: string; vendorId?: string }, context: serverContext) => {
            const whereConditions = ["c.type = 'BOOKING'"];
            const parameters: any[] = [];

            if (args.userId) {
                whereConditions.push("c.userId = @userId");
                parameters.push({ name: "@userId", value: args.userId });
            }

            if (args.vendorId) {
                whereConditions.push("c.vendorId = @vendorId");
                parameters.push({ name: "@vendorId", value: args.vendorId });
            }

            const query = `SELECT * FROM c WHERE ${whereConditions.join(" AND ")} ORDER BY c.datetime DESC`;

            const bookings = await context.dataSources.cosmos.run_query<booking_type>("Main-Bookings", {
                query,
                parameters
            });

            return bookings;
        },

        sessionBooking: async (_: any, args: { sessionRef: any; bookingRef: any }, context: serverContext) => {
            const booking = await context.dataSources.cosmos.get_record<booking_type>(
                args.bookingRef.container,
                args.bookingRef.id,
                args.bookingRef.partition
            );

            return booking;
        }
    },

    Mutation: {
        create_tour_booking: async (
            _: any,
            args: {
                customerEmail: string;
                merchantId: string;
                sessions: { ref: any; tickets: { variantId: string; quantity: number }[] }[]
            },
            context: serverContext
        ) => {
            const { customerEmail, merchantId, sessions: sessionInputs } = args;

            try {
                const createdBookings: booking_type[] = [];

                for (const sessionInput of sessionInputs) {
                    // 1. Load session and tour (session includes _etag for optimistic concurrency)
                    const session = await context.dataSources.cosmos.get_record<session_type>(
                        sessionInput.ref.container,
                        sessionInput.ref.id,
                        sessionInput.ref.partition
                    );

                    const tour = await context.dataSources.cosmos.get_record<tour_type>(
                        session.forObject.container,
                        session.forObject.id,
                        session.forObject.partition
                    );

                    // Store the original ETag for optimistic concurrency check
                    const sessionETag = (session as any)._etag;

                    // 2. Validate session capacity
                    validate_session_capacity(session, tour, sessionInput.tickets);

                    // 3. Build order lines and commit inventory
                    const orderLines: any[] = [];
                    const inventoryPatches: any[] = [];

                    for (const ticketInput of sessionInput.tickets) {
                        const variant = tour.ticketVariants.find(v => v.id === ticketInput.variantId);
                        if (!variant) {
                            throw new GraphQLError(`Ticket variant ${ticketInput.variantId} not found`);
                        }

                        // Generate temporary order ID (will be replaced when order created)
                        const tempOrderId = `pending-${uuidv4()}`;

                        // Commit inventory
                        const { patches, isBackorder } = commit_ticket_inventory(
                            tour,
                            ticketInput.variantId,
                            ticketInput.quantity,
                            tempOrderId,
                            context.userId
                        );

                        inventoryPatches.push(...patches);

                        // Create order line
                        orderLines.push({
                            id: uuidv4(),
                            variantId: ticketInput.variantId,
                            descriptor: `${tour.name} - ${variant.name} - ${session.date}`,
                            price: variant.price,
                            quantity: ticketInput.quantity,
                            merchantId,
                            target: "TOUR-BOOKING",
                            sessionRef: sessionInput.ref,
                            inventory_status: isBackorder ? 'BACKORDERED' : 'IN_STOCK',
                            backordered_at: isBackorder ? DateTime.now().toISO() : undefined
                        });
                    }

                    // 4. Apply inventory patches to tour
                    if (inventoryPatches.length > 0) {
                        await context.dataSources.cosmos.patch_record(
                            "Main-Listing",
                            tour.id,
                            merchantId,
                            inventoryPatches,
                            context.userId
                        );
                    }

                    // 5. Create order with Stripe payment intent
                    const orderId = uuidv4();
                    const orderCode = Math.floor(100000 + Math.random() * 900000);

                    // Calculate total amount
                    let totalAmount = 0;
                    let currency = 'aud'; // Default, will be overwritten by first ticket

                    for (const ticketInput of sessionInput.tickets) {
                        const variant = tour.ticketVariants.find(v => v.id === ticketInput.variantId);
                        if (variant) {
                            totalAmount += variant.price.amount * ticketInput.quantity;
                            currency = variant.price.currency.toLowerCase();
                        }
                    }

                    // Get merchant for Stripe connected account
                    const merchant = await context.dataSources.cosmos.get_record<vendor_type>(
                        "Main-Vendor",
                        merchantId,
                        merchantId
                    );

                    // Resolve or create Stripe customer
                    const stripeCustomer = await context.dataSources.stripe.resolveCustomer(customerEmail);

                    // Create payment intent
                    let paymentIntentData: any = {
                        customer: stripeCustomer.id,
                        amount: encodeAmountToSmallestUnit(totalAmount, currency),
                        currency: currency,
                        automatic_payment_methods: { enabled: true },
                        metadata: {
                            target: "TOUR-BOOKING",
                            orderId: orderId,
                            customerEmail: customerEmail,
                            merchantId: merchantId,
                            tourId: tour.id,
                            sessionId: session.id
                        }
                    };

                    let stripeService = context.dataSources.stripe;
                    let connectedAccountId: string | undefined;

                    // If merchant has a connected Stripe account, use it
                    if (merchant?.stripe?.accountId && merchant.stripe.accountId !== 'SPIRIVERSE') {
                        connectedAccountId = merchant.stripe.accountId;
                        stripeService = context.dataSources.stripe.asConnectedAccount(connectedAccountId);

                        // For connected accounts, need to create/link customer
                        const connectedCustomer = await stripeService.resolveCustomer(customerEmail);
                        paymentIntentData.customer = connectedCustomer.id;

                        // Set application fee for platform
                        const applicationFeePercent = 0.05; // 5% platform fee
                        paymentIntentData.application_fee_amount = Math.round(
                            encodeAmountToSmallestUnit(totalAmount, currency) * applicationFeePercent
                        );
                    }

                    const paymentIntent = await stripeService.callApi("POST", "payment_intents", paymentIntentData);

                    if (paymentIntent.status !== 200) {
                        throw new GraphQLError("Failed to create payment intent");
                    }

                    // Create order document
                    const order: Partial<order_type> = {
                        id: orderId,
                        orderId: orderId,
                        docType: "ORDER",
                        code: orderCode,
                        customerEmail: customerEmail,
                        target: "TOUR-BOOKING",
                        ttl: Duration.fromObject({ days: 2 }).as("seconds"), // Expires in 2 days if not paid
                        lines: orderLines.map((line: any, idx: number) => ({
                            ...line,
                            forObject: {
                                id: tour.id,
                                partition: [merchantId],
                                container: "Main-Listing"
                            },
                            price_log: [{
                                id: uuidv4(),
                                datetime: DateTime.now().toISO(),
                                type: "CHARGE",
                                status: "NEW",
                                price: line.price
                            }],
                            paid_status_log: [],
                            refund_request_log: [],
                            stripe: {}
                        })),
                        payments: [],
                        credits: [],
                        stripe: {
                            paymentIntent: {
                                id: paymentIntent.data.id,
                                account: connectedAccountId
                            },
                            paymentIntentSecret: paymentIntent.data.client_secret,
                            accountId: connectedAccountId
                        },
                        status: "PENDING_PAYMENT",
                        createdDate: DateTime.now().toISO()
                    };

                    // Save order
                    await context.dataSources.cosmos.add_record(
                        "Main-Orders",
                        order,
                        orderId,
                        context.userId ?? "GUEST"
                    );

                    // 6. Create booking document
                    const bookingTickets: booking_ticket_type[] = sessionInput.tickets.map(ticket => ({
                        id: uuidv4(),
                        variantId: ticket.variantId,
                        person: "", // Will be filled in later
                        quantity: ticket.quantity,
                        price: tour.ticketVariants.find(v => v.id === ticket.variantId)!.price
                    }));

                    const booking: booking_type = {
                        id: uuidv4(),
                        code: Math.floor(100000 + Math.random() * 900000).toString(),
                        userId: context.userId,
                        customerEmail,
                        vendorId: merchantId,
                        user: null as any, // Will be populated by resolver
                        sessions: [{
                            index: 0,
                            ref: sessionInput.ref,
                            tickets: bookingTickets
                        }],
                        ticketStatus: StatusType.AWAITING_PAYMENT,
                        orderId,
                        datetime: DateTime.now().toISO(),
                        ref: {
                            id: "",
                            partition: [merchantId],
                            container: "Main-Bookings"
                        },
                        stripe: {
                            paymentIntent: {
                                id: paymentIntent.data.id,
                                account: connectedAccountId
                            },
                            paymentIntentSecret: paymentIntent.data.client_secret,
                            accountId: connectedAccountId
                        },
                        totalAmount: {
                            amount: totalAmount,
                            currency: currency.toUpperCase()
                        },
                        status_log: [{
                            datetime: DateTime.now().toISO(),
                            label: "Booking created - awaiting payment",
                            triggeredBy: context.userId
                        }]
                    };

                    booking.ref.id = booking.id;

                    // Save booking
                    await context.dataSources.cosmos.upsert_record(
                        "Main-Bookings",
                        booking.id,
                        booking,
                        args.merchantId
                    );

                    createdBookings.push(booking);

                    // 7. Update session capacity with optimistic concurrency control
                    // Recalculate capacity including the new booking
                    session.bookings = session.bookings || [];
                    session.bookings.push(booking);
                    const capacityInfo = calculate_session_capacity(session, tour);

                    try {
                        await context.dataSources.cosmos.patch_record(
                            "Tour-Session",
                            session.id,
                            session.forObject.partition,
                            [
                                { op: "set", path: "/capacity/current", value: capacityInfo.current },
                                { op: "set", path: "/capacity/remaining", value: capacityInfo.remaining }
                            ],
                            context.userId,
                            sessionETag // Use ETag for optimistic concurrency
                        );
                    } catch (error: any) {
                        // If ETag mismatch (412), the session was modified concurrently
                        if (error.extensions?.code === 'PRECONDITION_FAILED') {
                            // Rollback: Delete the booking we just created
                            await context.dataSources.cosmos.purge_record(
                                "Main-Bookings",
                                booking.id,
                                booking.ref.partition
                            );

                            // Rollback: Restore committed inventory for all tickets
                            const rollbackPatches: any[] = [];
                            for (const ticketInput of sessionInput.tickets) {
                                const patches = rollback_ticket_inventory(
                                    tour,
                                    ticketInput.variantId,
                                    ticketInput.quantity,
                                    orderId,
                                    context.userId
                                );
                                rollbackPatches.push(...patches);
                            }

                            if (rollbackPatches.length > 0) {
                                await context.dataSources.cosmos.patch_record(
                                    "Main-Listing",
                                    tour.id,
                                    merchantId,
                                    rollbackPatches,
                                    context.userId
                                );
                            }

                            throw new GraphQLError(
                                'Session capacity changed during booking. Please try again.',
                                { extensions: { code: 'CONCURRENT_MODIFICATION' } }
                            );
                        }
                        throw error;
                    }

                    // 8. Send email confirmation
                    try {
                        await context.dataSources.email.sendEmail(
                            "noreply@spiriverse.com",
                            customerEmail,
                            "TOUR_BOOKING_CREATED_CUSTOMER",
                            {
                                tourName: tour.name,
                                sessionDate: session.date,
                                bookingCode: booking.code,
                                tickets: bookingTickets
                            }
                        );
                    } catch (emailError) {
                        console.error("Failed to send booking confirmation email:", emailError);
                    }
                }

                return {
                    code: "200",
                    success: true,
                    message: `Booking created successfully`,
                    bookings: createdBookings
                };

            } catch (error) {
                console.error("Error creating tour booking:", error);
                throw new GraphQLError(`Failed to create booking: ${error.message}`);
            }
        },

        create_manual_tour_bookings: async (
            _: any,
            args: {
                bookings: {
                    userDetails: {
                        email: string;
                        firstname: string;
                        lastname: string;
                        phoneNumber?: { raw: string; displayAs: string; value: string };
                    };
                    tickets: { variantId: string; quantity: number }[];
                    markAsPaid?: boolean;
                    paymentMethod?: string;
                    notes?: string;
                }[];
                sessionRef: recordref_type;
            },
            context: serverContext
        ) => {
            const { bookings: bookingInputs, sessionRef } = args;

            try {
                const createdBookings: booking_type[] = [];

                // 1. Load session and tour
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

                const merchantId = session.forObject.partition[0];
                const sessionETag = (session as any)._etag;

                for (const bookingInput of bookingInputs) {
                    const { userDetails, tickets, markAsPaid, paymentMethod, notes } = bookingInput;

                    // 2. Validate session capacity for this booking
                    validate_session_capacity(session, tour, tickets);

                    // 3. Find or create user by email
                    let userId: string | undefined;
                    const userQuery = `SELECT * FROM c WHERE c.email = @email`;
                    const existingUsers = await context.dataSources.cosmos.run_query<any>("Main-User", {
                        query: userQuery,
                        parameters: [{ name: "@email", value: userDetails.email }]
                    });

                    if (existingUsers.length > 0) {
                        userId = existingUsers[0].id;
                    } else {
                        // Create a new user record for this customer
                        const newUserId = uuidv4();
                        const newUser = {
                            id: newUserId,
                            email: userDetails.email,
                            firstname: userDetails.firstname,
                            lastname: userDetails.lastname,
                            requiresInput: true, // They'll need to complete registration if they log in
                            addresses: userDetails.phoneNumber ? [{
                                id: uuidv4(),
                                firstname: userDetails.firstname,
                                lastname: userDetails.lastname,
                                phoneNumber: userDetails.phoneNumber,
                                isDefault: true
                            }] : []
                        };
                        await context.dataSources.cosmos.add_record(
                            "Main-User",
                            newUser,
                            newUserId,
                            context.userId ?? "MERCHANT"
                        );
                        userId = newUserId;
                    }

                    // 4. Build booking tickets
                    const bookingTickets: booking_ticket_type[] = tickets.map(ticket => {
                        const variant = tour.ticketVariants.find(v => v.id === ticket.variantId);
                        if (!variant) {
                            throw new GraphQLError(`Ticket variant ${ticket.variantId} not found`);
                        }
                        return {
                            id: uuidv4(),
                            variantId: ticket.variantId,
                            person: `${userDetails.firstname} ${userDetails.lastname}`,
                            quantity: ticket.quantity,
                            price: variant.price
                        };
                    });

                    // 5. Calculate total amount
                    let totalAmount = 0;
                    let currency = 'AUD';
                    for (const ticket of tickets) {
                        const variant = tour.ticketVariants.find(v => v.id === ticket.variantId);
                        if (variant) {
                            totalAmount += variant.price.amount * ticket.quantity;
                            currency = variant.price.currency.toUpperCase();
                        }
                    }

                    // 6. Commit inventory
                    const inventoryPatches: any[] = [];
                    for (const ticket of tickets) {
                        const { patches } = commit_ticket_inventory(
                            tour,
                            ticket.variantId,
                            ticket.quantity,
                            `manual-${uuidv4()}`,
                            context.userId ?? "MERCHANT"
                        );
                        inventoryPatches.push(...patches);
                    }

                    if (inventoryPatches.length > 0) {
                        await context.dataSources.cosmos.patch_record(
                            "Main-Listing",
                            tour.id,
                            merchantId,
                            inventoryPatches,
                            context.userId
                        );
                    }

                    // 7. Determine ticket status based on payment
                    const ticketStatus = markAsPaid ? StatusType.COMPLETED : StatusType.AWAITING_PAYMENT;

                    // 8. Create booking document
                    const booking: booking_type = {
                        id: uuidv4(),
                        code: Math.floor(100000 + Math.random() * 900000).toString(),
                        userId: userId!,
                        customerEmail: userDetails.email,
                        vendorId: merchantId,
                        user: null as any, // Will be populated by resolver
                        sessions: [{
                            index: 0,
                            ref: sessionRef,
                            tickets: bookingTickets
                        }],
                        ticketStatus,
                        datetime: DateTime.now().toISO(),
                        notes,
                        ref: {
                            id: "",
                            partition: [merchantId],
                            container: "Main-Bookings"
                        },
                        totalAmount: {
                            amount: totalAmount,
                            currency
                        },
                        status_log: [{
                            datetime: DateTime.now().toISO(),
                            label: markAsPaid
                                ? `Manual booking created - marked as paid (${paymentMethod || 'cash'})`
                                : "Manual booking created - awaiting payment",
                            triggeredBy: context.userId ?? "MERCHANT"
                        }]
                    };

                    // Add paid info if marked as paid
                    if (markAsPaid) {
                        booking.paid = {
                            datetime: DateTime.now().toISO(),
                            type: paymentMethod || 'CASH'
                        };
                    }

                    booking.ref.id = booking.id;

                    // 9. Save booking
                    await context.dataSources.cosmos.upsert_record(
                        "Main-Bookings",
                        booking.id,
                        booking,
                        merchantId
                    );

                    createdBookings.push(booking);

                    // 10. Update session capacity
                    session.bookings = session.bookings || [];
                    session.bookings.push(booking);
                }

                // 11. Recalculate and update session capacity
                const capacityInfo = calculate_session_capacity(session, tour);

                try {
                    await context.dataSources.cosmos.patch_record(
                        "Tour-Session",
                        session.id,
                        session.forObject.partition,
                        [
                            { op: "set", path: "/capacity/current", value: capacityInfo.current },
                            { op: "set", path: "/capacity/remaining", value: capacityInfo.remaining }
                        ],
                        context.userId,
                        sessionETag
                    );
                } catch (error: any) {
                    // If ETag mismatch, the session was modified - bookings are still valid
                    // Just log and continue - capacity will be recalculated on next view
                    console.warn("Session capacity update failed due to concurrent modification:", error.message);
                }

                // 12. Send confirmation emails
                for (const booking of createdBookings) {
                    try {
                        const activityList = tour.activityLists?.find((al: any) => al.id === session.activityListId);

                        await context.dataSources.email.sendEmail(
                            "noreply@spiriverse.com",
                            booking.customerEmail,
                            "TOUR_MANUAL_BOOKING_CREATED_CUSTOMER",
                            {
                                tourName: tour.name,
                                sessionDate: session.date,
                                sessionTime: session.time,
                                bookingCode: booking.code,
                                location: activityList?.activities?.[0]?.location?.formattedAddress || "See booking details",
                                totalAmount: booking.totalAmount,
                                isPaid: booking.paid != null,
                                paymentMethod: booking.paid?.type
                            }
                        );
                    } catch (emailError) {
                        console.error("Failed to send manual booking confirmation email:", emailError);
                    }
                }

                return {
                    code: "200",
                    success: true,
                    message: `${createdBookings.length} booking(s) created successfully`,
                    bookings: createdBookings
                };

            } catch (error) {
                console.error("Error creating manual tour bookings:", error);
                if (error instanceof GraphQLError) {
                    throw error;
                }
                throw new GraphQLError(`Failed to create manual bookings: ${error.message}`);
            }
        },

        check_in_booking: async (
            _: any,
            args: {
                bookingCode: string;
                sessionId: string;
                vendorId: string;
            },
            context: serverContext
        ) => {
            const { bookingCode, sessionId, vendorId } = args;

            try {
                // 1. Find the booking by code
                const query = `SELECT * FROM c WHERE c.code = @code AND c.vendorId = @vendorId`;
                const parameters = [
                    { name: "@code", value: bookingCode },
                    { name: "@vendorId", value: vendorId }
                ];

                const bookings = await context.dataSources.cosmos.run_query<booking_type>("Main-Bookings", {
                    query,
                    parameters
                });

                if (bookings.length === 0) {
                    throw new GraphQLError("Booking not found", {
                        extensions: { code: 'BOOKING_NOT_FOUND' }
                    });
                }

                const booking = bookings[0];

                // 2. Validate booking is for the correct session
                const bookingSession = booking.sessions.find(s => s.ref.id === sessionId);
                if (!bookingSession) {
                    throw new GraphQLError("Booking is not for this session", {
                        extensions: { code: 'SESSION_MISMATCH' }
                    });
                }

                // 3. Check if already checked in
                if (booking.checkedIn) {
                    throw new GraphQLError(
                        `Booking already checked in at ${booking.checkedIn.datetime}`,
                        { extensions: { code: 'ALREADY_CHECKED_IN' } }
                    );
                }

                // 4. Check booking status - must be paid/confirmed
                if (booking.ticketStatus === StatusType.AWAITING_PAYMENT) {
                    throw new GraphQLError("Booking has not been paid", {
                        extensions: { code: 'PAYMENT_REQUIRED' }
                    });
                }

                if (booking.ticketStatus === StatusType.CANCELLED) {
                    throw new GraphQLError("Booking has been cancelled", {
                        extensions: { code: 'BOOKING_CANCELLED' }
                    });
                }

                // 5. Update the booking with check-in information
                const checkInTime = DateTime.now().toISO();
                const statusLogEntry = {
                    datetime: checkInTime,
                    label: "Checked in",
                    triggeredBy: context.userId || "STAFF"
                };

                await context.dataSources.cosmos.patch_record(
                    booking.ref.container,
                    booking.ref.id,
                    booking.ref.partition,
                    [
                        { op: "set", path: "/checkedIn", value: { datetime: checkInTime } },
                        { op: "add", path: "/status_log/-", value: statusLogEntry }
                    ],
                    context.userId
                );

                // 6. Load additional details for response
                let sessionDetails: session_type | null = null;
                let tourDetails: tour_type | null = null;

                try {
                    sessionDetails = await context.dataSources.cosmos.get_record<session_type>(
                        bookingSession.ref.container,
                        bookingSession.ref.id,
                        bookingSession.ref.partition
                    );

                    if (sessionDetails) {
                        tourDetails = await context.dataSources.cosmos.get_record<tour_type>(
                            sessionDetails.forObject.container,
                            sessionDetails.forObject.id,
                            sessionDetails.forObject.partition
                        );
                    }
                } catch (error) {
                    console.error("Error loading session/tour details:", error);
                }

                // Update booking with check-in info for response
                booking.checkedIn = { datetime: checkInTime };
                (booking as any).sessionDetails = sessionDetails;
                (booking as any).tourDetails = tourDetails;

                return {
                    code: "200",
                    success: true,
                    message: "Successfully checked in",
                    booking
                };

            } catch (error) {
                console.error("Error checking in booking:", error);
                if (error instanceof GraphQLError) {
                    throw error;
                }
                throw new GraphQLError(`Failed to check in: ${error.message}`);
            }
        },

        cancel_tour_booking: async (
            _: any,
            args: {
                bookingRef: recordref_type;
                sessionRef: recordref_type;
                vendorId: string;
                reason?: string;
            },
            context: serverContext
        ) => {
            const { bookingRef, sessionRef, vendorId, reason } = args;

            try {
                // 1. Load the booking
                const booking = await context.dataSources.cosmos.get_record<booking_type>(
                    bookingRef.container,
                    bookingRef.id,
                    bookingRef.partition
                );

                if (!booking) {
                    throw new GraphQLError("Booking not found");
                }

                // Validate booking belongs to the session
                const bookingSession = booking.sessions.find(s => s.ref.id === sessionRef.id);
                if (!bookingSession) {
                    throw new GraphQLError("Booking does not belong to the specified session");
                }

                // Check if booking is already cancelled
                if (booking.ticketStatus === StatusType.CANCELLED) {
                    throw new GraphQLError("Booking is already cancelled");
                }

                // 2. Load the session
                const session = await context.dataSources.cosmos.get_record<session_type>(
                    sessionRef.container,
                    sessionRef.id,
                    sessionRef.partition
                );

                if (!session) {
                    throw new GraphQLError("Session not found");
                }

                // 3. Load the tour for ticket variant info
                const tour = await context.dataSources.cosmos.get_record<tour_type>(
                    session.forObject.container,
                    session.forObject.id,
                    session.forObject.partition
                );

                if (!tour) {
                    throw new GraphQLError("Tour not found");
                }

                // 4. Calculate total slots being freed for waitlist notification
                let totalSlotsFreed = 0;
                const capacityMode = session.capacity?.mode || 'PER_PERSON';

                if (capacityMode === 'PER_PERSON') {
                    // Count by people (use peopleCount from ticket variants)
                    totalSlotsFreed = bookingSession.tickets.reduce((sum, ticket) => {
                        const variant = tour.ticketVariants.find(v => v.id === ticket.variantId);
                        if (!variant) return sum;
                        return sum + (variant.peopleCount * ticket.quantity);
                    }, 0);
                } else {
                    // Count by tickets
                    totalSlotsFreed = bookingSession.tickets.reduce((sum, ticket) => sum + ticket.quantity, 0);
                }

                // 5. Restore ticket inventory
                const inventoryPatches: any[] = [];
                for (const ticket of bookingSession.tickets) {
                    const patches = restore_ticket_inventory(
                        tour,
                        ticket.variantId,
                        ticket.quantity,
                        booking.orderId || booking.id,
                        context.userId
                    );
                    inventoryPatches.push(...patches);
                }

                if (inventoryPatches.length > 0) {
                    await context.dataSources.cosmos.patch_record(
                        "Main-Listing",
                        tour.id,
                        vendorId,
                        inventoryPatches,
                        context.userId
                    );
                }

                // 6. Handle Stripe refund if payment was made
                let refundProcessed = false;
                if (booking.stripe?.paymentIntent?.id && booking.ticketStatus !== StatusType.AWAITING_PAYMENT) {
                    try {
                        // Get merchant for Stripe connected account
                        const merchant = await context.dataSources.cosmos.get_record<vendor_type>(
                            "Main-Vendor",
                            vendorId,
                            vendorId
                        );

                        // Determine which Stripe account to use
                        let stripeService = context.dataSources.stripe;
                        if (booking.stripe?.accountId && booking.stripe.accountId !== 'SPIRIVERSE') {
                            stripeService = context.dataSources.stripe.asConnectedAccount(booking.stripe.accountId);
                        } else if (merchant?.stripe?.accountId && merchant.stripe.accountId !== 'SPIRIVERSE') {
                            stripeService = context.dataSources.stripe.asConnectedAccount(merchant.stripe.accountId);
                        }

                        // Get payment intent to find charges
                        const paymentIntentResponse = await stripeService.callApi(
                            "GET",
                            `payment_intents/${booking.stripe.paymentIntent.id}`
                        );

                        if (paymentIntentResponse.status === 200 && paymentIntentResponse.data.latest_charge) {
                            // Create refund for the charge
                            const refundResponse = await stripeService.callApi("POST", "refunds", {
                                charge: paymentIntentResponse.data.latest_charge,
                                reason: "requested_by_customer",
                                metadata: {
                                    bookingId: booking.id,
                                    bookingCode: booking.code,
                                    sessionId: sessionRef.id,
                                    cancellationReason: reason || "Booking cancelled",
                                    triggeredBy: context.userId || "SYSTEM"
                                }
                            });

                            if (refundResponse.status === 200) {
                                refundProcessed = true;
                            } else {
                                console.error("Failed to process refund:", refundResponse);
                            }
                        }
                    } catch (refundError) {
                        console.error("Error processing Stripe refund:", refundError);
                        // Continue with cancellation even if refund fails - can be handled manually
                    }
                }

                // 7. Update booking status to CANCELLED
                const cancellationTime = DateTime.now().toISO();
                const statusLogEntry = {
                    datetime: cancellationTime,
                    label: reason ? `Booking cancelled: ${reason}` : "Booking cancelled",
                    triggeredBy: context.userId || "SYSTEM"
                };

                await context.dataSources.cosmos.patch_record(
                    bookingRef.container,
                    bookingRef.id,
                    bookingRef.partition,
                    [
                        { op: "set", path: "/ticketStatus", value: StatusType.CANCELLED },
                        { op: "add", path: "/status_log/-", value: statusLogEntry },
                        { op: "set", path: "/cancelledAt", value: cancellationTime },
                        { op: "set", path: "/cancellationReason", value: reason || null },
                        { op: "set", path: "/refundProcessed", value: refundProcessed }
                    ],
                    context.userId
                );

                // 8. Update session capacity
                // Reload session with updated bookings list (excluding this booking)
                const updatedSession = await context.dataSources.cosmos.get_record<session_type>(
                    sessionRef.container,
                    sessionRef.id,
                    sessionRef.partition
                );

                // Filter out the cancelled booking from the bookings list for capacity calculation
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
                    context.userId
                );

                // 9. If there was an associated order, update its status too
                if (booking.orderId) {
                    try {
                        await context.dataSources.cosmos.patch_record(
                            "Main-Orders",
                            booking.orderId,
                            booking.orderId,
                            [
                                { op: "set", path: "/status", value: "CANCELLED" },
                                { op: "set", path: "/cancelledAt", value: cancellationTime },
                                { op: "set", path: "/cancellationReason", value: reason || "Booking cancelled" }
                            ],
                            context.userId
                        );
                    } catch (orderError) {
                        console.error("Error updating order status:", orderError);
                        // Continue - booking cancellation is the primary concern
                    }
                }

                // 10. Trigger waitlist processing - notify customers on waitlist
                let waitlistNotified = 0;
                try {
                    const notifiedEntries = await process_waitlist_on_slot_open(
                        context,
                        sessionRef,
                        totalSlotsFreed
                    );
                    waitlistNotified = notifiedEntries.length;
                } catch (waitlistError) {
                    console.error("Error processing waitlist:", waitlistError);
                    // Continue - waitlist processing failure shouldn't fail the cancellation
                }

                // 11. Send cancellation confirmation email to customer
                try {
                    await context.dataSources.email.sendEmail(
                        "noreply@spiriverse.com",
                        booking.customerEmail,
                        "TOUR_BOOKING_CANCELLED",
                        {
                            tourName: tour.name,
                            sessionDate: session.date,
                            sessionTime: session.time,
                            bookingCode: booking.code,
                            cancellationReason: reason || "No reason provided",
                            refundProcessed: refundProcessed,
                            refundAmount: refundProcessed ? booking.totalAmount : null
                        }
                    );
                } catch (emailError) {
                    console.error("Failed to send booking cancellation email:", emailError);
                }

                return {
                    code: "200",
                    success: true,
                    message: refundProcessed
                        ? `Booking cancelled successfully. Refund has been initiated. ${waitlistNotified > 0 ? `${waitlistNotified} waitlist customer(s) notified.` : ''}`
                        : `Booking cancelled successfully. ${waitlistNotified > 0 ? `${waitlistNotified} waitlist customer(s) notified.` : ''}`,
                    waitlistNotified
                };

            } catch (error) {
                console.error("Error cancelling tour booking:", error);
                if (error instanceof GraphQLError) {
                    throw error;
                }
                throw new GraphQLError(`Failed to cancel booking: ${error.message}`);
            }
        }
    },

    TourBooking: {
        user: async (parent: booking_type, _: any, context: serverContext) => {
            if (!parent.userId) return null;

            try {
                return await context.dataSources.cosmos.get_record(
                    "Main-User",
                    parent.userId,
                    [parent.userId]
                );
            } catch (error) {
                return null;
            }
        },

        order: async (parent: booking_type, _: any, context: serverContext) => {
            if (!parent.orderId) return null;

            try {
                return await context.dataSources.cosmos.get_record(
                    "Main-Orders",
                    parent.orderId,
                    parent.ref.partition
                );
            } catch (error) {
                return null;
            }
        }
    }
};

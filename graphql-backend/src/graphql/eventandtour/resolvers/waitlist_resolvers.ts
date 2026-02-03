import { GraphQLError } from "graphql";
import { serverContext } from "../../../services/azFunction";
import { waitlist_entry_type, session_type, tour_type } from "../types";
import { recordref_type } from "../../0_shared/types";
import {
    add_to_waitlist,
    cancel_waitlist_entry,
    get_waitlist_status,
    get_customer_waitlist_entries,
    get_queue_position
} from "../utils/waitlist_manager";

export const waitlist_resolvers = {
    Query: {
        /**
         * Get waitlist status for a session
         */
        waitlistStatus: async (
            _: any,
            args: { sessionRef: recordref_type; customerEmail?: string },
            context: serverContext
        ) => {
            const status = await get_waitlist_status(
                context,
                args.sessionRef,
                args.customerEmail
            );

            return {
                sessionId: args.sessionRef.id,
                ...status
            };
        },

        /**
         * Get all waitlist entries for a customer
         */
        myWaitlistEntries: async (
            _: any,
            args: { customerEmail: string; vendorId: string },
            context: serverContext
        ) => {
            return await get_customer_waitlist_entries(
                context,
                args.customerEmail,
                args.vendorId
            );
        }
    },

    Mutation: {
        /**
         * Join the waitlist for a tour session
         */
        join_tour_waitlist: async (
            _: any,
            args: {
                sessionRef: recordref_type;
                tourId: string;
                vendorId: string;
                customerEmail: string;
                ticketPreferences: { variantId: string; quantity: number; notes?: string }[];
            },
            context: serverContext
        ) => {
            try {
                // Get session details
                const session = await context.dataSources.cosmos.get_record<session_type>(
                    args.sessionRef.container || "Tour-Session",
                    args.sessionRef.id,
                    args.sessionRef.partition
                );

                if (!session) {
                    throw new GraphQLError("Session not found");
                }

                // Get tour details for name
                const tour = await context.dataSources.cosmos.get_record<tour_type>(
                    "Main-Listing",
                    args.tourId,
                    args.vendorId
                );

                if (!tour) {
                    throw new GraphQLError("Tour not found");
                }

                // Format session time
                const sessionTime = session.time
                    ? `${session.time.start} - ${session.time.end}`
                    : "TBD";

                // Add to waitlist
                const entry = await add_to_waitlist(
                    context,
                    args.sessionRef,
                    {
                        id: args.tourId,
                        partition: [args.vendorId],
                        container: "Main-Listing"
                    },
                    args.vendorId,
                    args.customerEmail,
                    args.ticketPreferences,
                    session.date,
                    sessionTime,
                    tour.name
                );

                // Send confirmation email
                try {
                    await context.dataSources.email.sendEmail(
                        "noreply@spiriverse.com",
                        args.customerEmail,
                        "TOUR_WAITLIST_JOINED",
                        {
                            tourName: tour.name,
                            sessionDate: session.date,
                            sessionTime,
                            queuePosition: entry.positionInQueue,
                            ticketPreferences: args.ticketPreferences
                        }
                    );
                } catch (emailError) {
                    console.error("Failed to send waitlist confirmation email:", emailError);
                }

                return {
                    code: "200",
                    success: true,
                    message: `You've been added to the waitlist at position #${entry.positionInQueue}`,
                    waitlistEntry: entry,
                    queuePosition: entry.positionInQueue,
                    estimatedNotification: "We'll notify you as soon as a spot opens up"
                };

            } catch (error: any) {
                if (error.message?.includes("already on the waitlist")) {
                    throw new GraphQLError(error.message);
                }
                console.error("Error joining waitlist:", error);
                throw new GraphQLError(`Failed to join waitlist: ${error.message}`);
            }
        },

        /**
         * Cancel a waitlist entry
         */
        cancel_waitlist_entry: async (
            _: any,
            args: { waitlistEntryId: string; sessionId: string; vendorId: string },
            context: serverContext
        ) => {
            try {
                await cancel_waitlist_entry(
                    context,
                    args.waitlistEntryId,
                    args.sessionId,
                    args.vendorId
                );

                return {
                    code: "200",
                    success: true,
                    message: "Successfully removed from waitlist"
                };
            } catch (error: any) {
                console.error("Error cancelling waitlist entry:", error);
                throw new GraphQLError(`Failed to cancel waitlist entry: ${error.message}`);
            }
        }
    },

    // Field resolvers for Session type
    Session: {
        waitlistCount: async (parent: session_type, _: any, context: serverContext) => {
            const status = await get_waitlist_status(context, parent.ref);
            return status.totalInWaitlist;
        }
    },

    // Field resolvers for WaitlistEntry type
    WaitlistEntry: {
        session: async (parent: waitlist_entry_type, _: any, context: serverContext) => {
            try {
                return await context.dataSources.cosmos.get_record<session_type>(
                    parent.sessionRef.container || "Tour-Session",
                    parent.sessionRef.id,
                    parent.sessionRef.partition
                );
            } catch {
                return null;
            }
        },

        tour: async (parent: waitlist_entry_type, _: any, context: serverContext) => {
            try {
                return await context.dataSources.cosmos.get_record<tour_type>(
                    parent.tourRef.container || "Main-Listing",
                    parent.tourRef.id,
                    parent.tourRef.partition
                );
            } catch {
                return null;
            }
        },

        currentPosition: async (parent: waitlist_entry_type, _: any, context: serverContext) => {
            return await get_queue_position(context, parent.sessionRef, parent.customerEmail);
        }
    }
};

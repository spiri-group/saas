import { GraphQLError } from "graphql";
import { DateTime } from "luxon";
import { serverContext } from "../../../services/azFunction";
import { session_type, tour_type } from "../types";
import { calculate_session_capacity } from "../utils/session_capacity";
import { generate_sessions_from_schedules, get_schedules_for_listing } from "../utils/session_generator";

export const session_resolvers = {
    Query: {
        session: async (
            _: any,
            args: { vendorId: string; listingId: string; sessionId: string },
            context: serverContext
        ) => {
            try {
                const session = await context.dataSources.cosmos.get_record<session_type>(
                    "Tour-Session",
                    args.sessionId,
                    [args.listingId, args.vendorId]
                );

                return session;
            } catch (error) {
                console.error("Error fetching session:", error);
                return null;
            }
        },

        sessions: async (
            _: any,
            args: {
                vendorId?: string;
                listingId?: string;
                date?: string;
                from?: string;
                to?: string;
                skip?: number;
                take?: number;
                ticketsRequired?: number;
            },
            context: serverContext
        ) => {
            // Smart lazy generation: Only generate if sessions don't exist
            if (args.listingId && args.vendorId && (args.from || args.date)) {
                const fromDate = args.from
                    ? DateTime.fromISO(args.from)
                    : DateTime.fromISO(args.date!);
                const toDate = args.to
                    ? DateTime.fromISO(args.to)
                    : fromDate;

                // Quick check: Do sessions exist for this range?
                const countQuery = `
                    SELECT VALUE COUNT(1) FROM c
                    WHERE c.forObject.id = @listingId
                    AND c.date >= @from
                    AND c.date <= @to
                `;

                const countResult = await context.dataSources.cosmos.run_query<number>("Tour-Session", {
                    query: countQuery,
                    parameters: [
                        { name: "@listingId", value: args.listingId },
                        { name: "@from", value: fromDate.toISODate() },
                        { name: "@to", value: toDate.toISODate() }
                    ]
                });

                const existingCount = countResult[0] || 0;

                // Only generate if no sessions exist (first load or expired)
                if (existingCount === 0) {
                    try {
                        // Get tour and schedules
                        const [tour, schedules] = await Promise.all([
                            context.dataSources.cosmos.get_record<tour_type>(
                                "Main-Listing",
                                args.listingId,
                                args.vendorId
                            ),
                            get_schedules_for_listing(
                                context.dataSources.cosmos,
                                args.vendorId,
                                args.listingId
                            )
                        ]);

                        if (schedules.length > 0) {
                            // Generate synchronously since user is waiting
                            await generate_sessions_from_schedules(
                                schedules,
                                tour,
                                fromDate,
                                toDate,
                                context.dataSources.cosmos,
                                context.userId || "system",
                                2592000 // 30 days TTL (auto-cleanup)
                            );
                        }
                    } catch (error) {
                        console.error("Error in session generation:", error);
                        // Continue with query even if generation fails
                    }
                }
            }

            // Query existing sessions
            const whereConditions = [];
            const parameters: any[] = [];

            if (args.listingId) {
                whereConditions.push("c.forObject.id = @listingId");
                parameters.push({ name: "@listingId", value: args.listingId });
            }

            if (args.date) {
                whereConditions.push("c.date = @date");
                parameters.push({ name: "@date", value: args.date });
            }

            if (args.from) {
                whereConditions.push("c.date >= @from");
                parameters.push({ name: "@from", value: args.from });
            }

            if (args.to) {
                whereConditions.push("c.date <= @to");
                parameters.push({ name: "@to", value: args.to });
            }

            const query = `
                SELECT * FROM c
                ${whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : ""}
                ORDER BY c.date ASC, c.time.start ASC
                ${args.skip ? `OFFSET ${args.skip}` : ""}
                ${args.take ? `LIMIT ${args.take}` : ""}
            `;

            const sessions = await context.dataSources.cosmos.run_query<session_type>("Tour-Session", {
                query,
                parameters
            });

            return sessions;
        },

        sessionsSummary: async (
            _: any,
            args: {
                vendorId?: string;
                listingId?: string;
                date?: string;
                from?: string;
                to?: string;
            },
            context: serverContext
        ) => {
            const whereConditions = [];
            const parameters: any[] = [];

            if (args.listingId) {
                whereConditions.push("c.forObject.id = @listingId");
                parameters.push({ name: "@listingId", value: args.listingId });
            }

            if (args.date) {
                whereConditions.push("c.date = @date");
                parameters.push({ name: "@date", value: args.date });
            }

            if (args.from) {
                whereConditions.push("c.date >= @from");
                parameters.push({ name: "@from", value: args.from });
            }

            if (args.to) {
                whereConditions.push("c.date <= @to");
                parameters.push({ name: "@to", value: args.to });
            }

            const query = `
                SELECT
                    COUNT(1) as numberOfSessions,
                    SUM(c.capacity.max) as overallCapacity,
                    c.date
                FROM c
                WHERE ${whereConditions.join(" AND ")}
                GROUP BY c.date
            `;

            const summary = await context.dataSources.cosmos.run_query("Tour-Session", {
                query,
                parameters
            });

            return summary;
        }
    },

    Mutation: {
        activate_session: async (_: any, args: { sessionRef: any }, context: serverContext) => {
            try {
                // Remove TTL to make session permanent
                await context.dataSources.cosmos.patch_record(
                    args.sessionRef.container,
                    args.sessionRef.id,
                    args.sessionRef.partition,
                    [{ op: "remove", path: "/ttl" }],
                    context.userId
                );

                return {
                    code: "200",
                    success: true,
                    message: "Session activated successfully"
                };
            } catch (error) {
                console.error("Error activating session:", error);
                throw new GraphQLError(`Failed to activate session: ${error.message}`);
            }
        },

        create_announcement: async (
            _: any,
            args: { announcement: any; sessionRef: any; vendorId: string },
            context: serverContext
        ) => {
            try {
                const announcement = {
                    id: DateTime.now().toMillis().toString(),
                    message: args.announcement.message,
                    time: args.announcement.time,
                    unit: args.announcement.unitId,
                    timeFrame: args.announcement.timeFrameId
                };

                await context.dataSources.cosmos.patch_record(
                    args.sessionRef.container,
                    args.sessionRef.id,
                    args.sessionRef.partition,
                    [{ op: "add", path: "/announcements/-", value: announcement }],
                    context.userId
                );

                return {
                    code: "200",
                    success: true,
                    message: "Announcement created",
                    announcement
                };
            } catch (error) {
                console.error("Error creating announcement:", error);
                throw new GraphQLError(`Failed to create announcement: ${error.message}`);
            }
        }
    },

    Session: {
        activityList: async (parent: session_type, _: any, context: serverContext) => {
            if (!parent.activityListId) return null;

            try {
                const tour = await context.dataSources.cosmos.get_record<tour_type>(
                    parent.forObject.container,
                    parent.forObject.id,
                    parent.forObject.partition
                );

                return tour.activityLists.find(al => al.id === parent.activityListId);
            } catch (error) {
                console.error("Error fetching activity list:", error);
                return null;
            }
        },

        bookings: async (parent: session_type, _: any, context: serverContext) => {
            try {
                const query = `
                    SELECT * FROM c
                    WHERE ARRAY_CONTAINS(c.sessions, {"ref": {"id": @sessionId}}, true)
                `;

                const bookings = await context.dataSources.cosmos.run_query("Main-Bookings", {
                    query,
                    parameters: [{ name: "@sessionId", value: parent.id }]
                });

                return bookings;
            } catch (error) {
                console.error("Error fetching session bookings:", error);
                return [];
            }
        },

        capacity: async (parent: session_type, _: any, context: serverContext) => {
            try {
                // Load tour to calculate capacity correctly
                const tour = await context.dataSources.cosmos.get_record<tour_type>(
                    parent.forObject.container,
                    parent.forObject.id,
                    parent.forObject.partition
                );

                // Calculate current capacity including bookings
                const capacityInfo = calculate_session_capacity(parent, tour);

                return {
                    max: parent.capacity.max,
                    mode: parent.capacity.mode || 'PER_PERSON',
                    current: capacityInfo.current,
                    remaining: capacityInfo.remaining
                };
            } catch (error) {
                console.error("Error calculating session capacity:", error);
                return parent.capacity;
            }
        }
    }
};

import { GraphQLError } from "graphql";
import { DateTime } from "luxon";
import { serverContext } from "../../../services/azFunction";
import { vendor_event_type, vendor_event_input_type, vendor_event_update_type } from "../types";

export const vendor_event_resolvers = {
    Query: {
        vendorEvents: async (_: any, args: { vendorId: string }, { dataSources }: serverContext) => {
            const events = await dataSources.cosmos.run_query<vendor_event_type>("Main-Listing", {
                query: "SELECT * FROM c WHERE c.vendorId = @vendorId AND c.docType = 'schedule' AND c.type = 'VendorEvent' AND c.startAt >= @now ORDER BY c.startAt ASC",
                parameters: [
                    { name: "@vendorId", value: args.vendorId },
                    { name: "@now", value: DateTime.now().toISO() }
                ]
            }, true);

            return events;
        },

        vendorEvent: async (_: any, args: { id: string }, { dataSources }: serverContext) => {
            const events = await dataSources.cosmos.run_query<vendor_event_type>("Main-Listing", {
                query: "SELECT * FROM c WHERE c.id = @id AND c.docType = 'schedule' AND c.type = 'VendorEvent'",
                parameters: [{ name: "@id", value: args.id }]
            }, true);

            return events.length > 0 ? events[0] : null;
        },

        nextVendorEvent: async (_: any, args: { vendorId: string }, { dataSources }: serverContext) => {
            const events = await dataSources.cosmos.run_query<vendor_event_type>("Main-Listing", {
                query: "SELECT * FROM c WHERE c.vendorId = @vendorId AND c.docType = 'schedule' AND c.type = 'VendorEvent' AND c.startAt >= @now ORDER BY c.startAt ASC OFFSET 0 LIMIT 1",
                parameters: [
                    { name: "@vendorId", value: args.vendorId },
                    { name: "@now", value: DateTime.now().toISO() }
                ]
            }, true);

            return events.length > 0 ? events[0] : null;
        }
    },

    Mutation: {
        createVendorEvent: async (_: any, args: { event: vendor_event_input_type }, context: serverContext) => {
            try {
                const event: vendor_event_type = {
                    ...args.event,
                    type: "VendorEvent",
                    docType: "schedule",
                    startAt: DateTime.fromJSDate(args.event.startAt).toISO(),
                    endAt: DateTime.fromJSDate(args.event.endAt).toISO(),
                    status: "scheduled"
                };

                await context.dataSources.cosmos.add_record(
                    "Main-Listing",
                    event,
                    args.event.vendorId,
                    context.userId
                );

                const createdEvent = await context.dataSources.cosmos.get_record<vendor_event_type>(
                    "Main-Listing",
                    event.id,
                    args.event.vendorId
                );

                return {
                    code: "200",
                    success: true,
                    message: "Vendor event created successfully",
                    event: createdEvent
                };
            } catch (error) {
                console.error("Error creating vendor event:", error);
                throw new GraphQLError(`Failed to create vendor event: ${error.message}`);
            }
        },

        updateVendorEvent: async (_: any, args: { event: vendor_event_update_type }, context: serverContext) => {
            try {
                const existingEvent = await context.dataSources.cosmos.run_query<vendor_event_type>(
                    "Main-Listing",
                    {
                        query: "SELECT * FROM c WHERE c.id = @id AND c.docType = 'schedule' AND c.type = 'VendorEvent'",
                        parameters: [{ name: "@id", value: args.event.id }]
                    },
                    true
                );

                if (!existingEvent || existingEvent.length === 0) {
                    throw new GraphQLError("Vendor event not found");
                }

                const event = existingEvent[0];
                const patches = [];

                if (args.event.title) patches.push({ op: "set", path: "/title", value: args.event.title });
                if (args.event.startAt) patches.push({ op: "set", path: "/startAt", value: DateTime.fromJSDate(args.event.startAt).toISO() });
                if (args.event.endAt) patches.push({ op: "set", path: "/endAt", value: DateTime.fromJSDate(args.event.endAt).toISO() });
                if (args.event.timezone) patches.push({ op: "set", path: "/timezone", value: args.event.timezone });
                if (args.event.location) patches.push({ op: "set", path: "/location", value: args.event.location });
                if (args.event.visibility) patches.push({ op: "set", path: "/visibility", value: args.event.visibility });
                if (args.event.status) patches.push({ op: "set", path: "/status", value: args.event.status });
                if (args.event.tags) patches.push({ op: "set", path: "/tags", value: args.event.tags });
                if (args.event.description !== undefined) patches.push({ op: "set", path: "/description", value: args.event.description });
                if (args.event.landscapeImage) patches.push({ op: "set", path: "/landscapeImage", value: args.event.landscapeImage });
                if (args.event.ttl !== undefined) patches.push({ op: "set", path: "/ttl", value: args.event.ttl });

                await context.dataSources.cosmos.patch_record(
                    "Main-Listing",
                    args.event.id,
                    event.vendorId,
                    patches,
                    context.userId
                );

                const updatedEvent = await context.dataSources.cosmos.get_record<vendor_event_type>(
                    "Main-Listing",
                    args.event.id,
                    event.vendorId
                );

                return {
                    code: "200",
                    success: true,
                    message: "Vendor event updated successfully",
                    event: updatedEvent
                };
            } catch (error) {
                console.error("Error updating vendor event:", error);
                throw new GraphQLError(`Failed to update vendor event: ${error.message}`);
            }
        },

        deleteVendorEvent: async (_: any, args: { id: string }, context: serverContext) => {
            try {
                const existingEvent = await context.dataSources.cosmos.run_query<vendor_event_type>(
                    "Main-Listing",
                    {
                        query: "SELECT * FROM c WHERE c.id = @id AND c.docType = 'schedule' AND c.type = 'VendorEvent'",
                        parameters: [{ name: "@id", value: args.id }]
                    },
                    true
                );

                if (!existingEvent || existingEvent.length === 0) {
                    throw new GraphQLError("Vendor event not found");
                }

                const event = existingEvent[0];

                await context.dataSources.cosmos.delete_record(
                    "Main-Listing",
                    args.id,
                    event.vendorId,
                    context.userId
                );

                return {
                    code: "200",
                    success: true,
                    message: "Vendor event deleted successfully"
                };
            } catch (error) {
                console.error("Error deleting vendor event:", error);
                throw new GraphQLError(`Failed to delete vendor event: ${error.message}`);
            }
        }
    }
};

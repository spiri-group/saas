import { serverContext } from "../../../services/azFunction";
import { activityList_type, tour_type } from "../types";

export const activity_resolvers = {
    Query: {
        activityLists: async (
            _: any,
            args: { listingId: string; vendorId: string; scheduleIds?: string[] },
            context: serverContext
        ) => {
            const tour = await context.dataSources.cosmos.get_record<tour_type>(
                "Main-Listing",
                args.listingId,
                args.vendorId
            );

            return tour.activityLists || [];
        },

        activity: async (_: any, args: { id: string }, context: serverContext) => {
            // Query across all tours to find activity by ID
            const query = `
                SELECT a.*
                FROM c
                JOIN al in c.activityLists
                JOIN a in al.activities
                WHERE a.id = @activityId
            `;

            const results = await context.dataSources.cosmos.run_query("Main-Listing", {
                query,
                parameters: [{ name: "@activityId", value: args.id }]
            }, true);

            return results[0] || null;
        }
    },

    Mutation: {
        create_activitylist: async (
            _: any,
            args: { listingId: string; vendorId: string; activityList: activityList_type },
            context: serverContext
        ) => {
            try {
                // Add activity list to tour
                await context.dataSources.cosmos.patch_record(
                    "Main-Listing",
                    args.listingId,
                    args.vendorId,
                    [{ op: "add", path: "/activityLists/-", value: args.activityList }],
                    context.userId
                );

                const updatedTour = await context.dataSources.cosmos.get_record<tour_type>(
                    "Main-Listing",
                    args.listingId,
                    args.vendorId
                );

                return {
                    code: "200",
                    success: true,
                    message: "Activity list created successfully",
                    impactedRecordRef: updatedTour.ref,
                    tour: updatedTour
                };
            } catch (error) {
                console.error("Error creating activity list:", error);
                throw new Error(`Failed to create activity list: ${error.message}`);
            }
        },

        update_activitylist: async (
            _: any,
            args: { id: string; listingId: string; vendorId: string; activityList: activityList_type },
            context: serverContext
        ) => {
            try {
                const tour = await context.dataSources.cosmos.get_record<tour_type>(
                    "Main-Listing",
                    args.listingId,
                    args.vendorId
                );

                const index = tour.activityLists.findIndex(al => al.id === args.id);
                if (index === -1) {
                    throw new Error(`Activity list ${args.id} not found`);
                }

                await context.dataSources.cosmos.patch_record(
                    "Main-Listing",
                    args.listingId,
                    args.vendorId,
                    [{ op: "set", path: `/activityLists/${index}`, value: args.activityList }],
                    context.userId
                );

                const updatedTour = await context.dataSources.cosmos.get_record<tour_type>(
                    "Main-Listing",
                    args.listingId,
                    args.vendorId
                );

                return {
                    code: "200",
                    success: true,
                    message: "Activity list updated successfully",
                    impactedRecordRef: updatedTour.ref,
                    tour: updatedTour
                };
            } catch (error) {
                console.error("Error updating activity list:", error);
                throw new Error(`Failed to update activity list: ${error.message}`);
            }
        }
    },

    ActivityList: {
        ref: (parent: activityList_type & { tourRef?: any }) => {
            // Return ref for activity list (nested in tour)
            if (parent.tourRef) {
                return {
                    ...parent.tourRef,
                    // Activity lists don't have their own container
                    // They're embedded in tours
                };
            }
            return null;
        }
    }
};

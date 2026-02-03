import { GraphQLError } from "graphql";
import { v4 as uuidv4 } from "uuid";
import { DateTime } from "luxon";
import { serverContext } from "../../../services/azFunction";
import { tour_type, tour_input_type, tour_ticket_variant_type } from "../types";
import { ListingTypes } from "../../listing/types";
import { calculate_ticket_availability } from "../utils/ticket_inventory";
import { MediaType } from "../../0_shared/types";

export const tour_resolvers = {
    Query: {
        tour: async (_: any, args: { id: string; vendorId: string }, { dataSources }: serverContext) => {
            const tour = await dataSources.cosmos.get_record<tour_type>("Main-Listing", args.id, args.vendorId);
            return tour;
        }
    },

    Mutation: {
        create_tour: async (_: any, args: { merchantId: string; tour: tour_input_type }, context: serverContext) => {
            const { merchantId, tour: tourInput } = args;

            try {
                // Initialize ticket variants with inventory
                const ticketVariants: tour_ticket_variant_type[] = tourInput.ticketVariants.map(variant => ({
                    id: variant.id,
                    name: variant.name,
                    description: variant.description,
                    price: variant.price,
                    peopleCount: variant.peopleCount,
                    inventory: {
                        qty_on_hand: variant.qty_on_hand,
                        qty_committed: 0, // Start with no commitments
                        qty_available: variant.qty_on_hand, // Initially all stock is available
                        track_inventory: variant.track_inventory ?? true,
                        low_stock_threshold: variant.low_stock_threshold,
                        allow_backorder: variant.allow_backorder ?? false,
                        max_backorders: variant.max_backorders ?? 0
                    },
                    inventory_transactions: [] // Empty transaction history
                }));

                // Create tour document
                const tour: tour_type = {
                    id: tourInput.id,
                    type: ListingTypes.TOUR,
                    name: tourInput.name,
                    description: tourInput.description,
                    terms: tourInput.terms || "",
                    faq: tourInput.faq || [],
                    country: tourInput.country,
                    thumbnail: tourInput.thumbnail || {
                        image: {
                            media: { url: "", name: "", size: "SQUARE", type: MediaType.IMAGE, urlRelative: "", code: "" },
                            zoom: 1,
                            objectFit: "cover"
                        },
                        title: {
                            content: tourInput.name,
                            panel: {
                                bgColor: "#000000",
                                textColor: "#FFFFFF",
                                bgOpacity: 0.7
                            }
                        },
                        bgColor: "#FFFFFF"
                    },
                    ticketVariants,
                    activityLists: [tourInput.activityList],
                    productReturnPolicyId: tourInput.productReturnPolicyId,
                    ref: {
                        id: tourInput.id,
                        partition: [merchantId],
                        container: "Main-Listing"
                    }
                };

                // Save to cosmos
                await context.dataSources.cosmos.upsert_record("Main-Listing", tour.id, tour, merchantId);

                // Send email notification (optional)
                try {
                    await context.dataSources.email.sendEmail(
                        "noreply@spiriverse.com",
                        context.userId,
                        "TOUR_CREATED_MERCHANT",
                        {
                            tourName: tour.name,
                            tourId: tour.id,
                            ticketCount: ticketVariants.length
                        }
                    );
                } catch (emailError) {
                    console.error("Failed to send tour creation email:", emailError);
                }

                return {
                    code: "200",
                    success: true,
                    message: `Tour "${tour.name}" created successfully`,
                    impactedRecordRef: tour.ref,
                    tour
                };

            } catch (error) {
                console.error("Error creating tour:", error);
                throw new GraphQLError(`Failed to create tour: ${error.message}`);
            }
        },

        update_tour: async (_: any, args: { merchantId: string; tour: any }, context: serverContext) => {
            const { merchantId, tour: updates } = args;

            try {
                // Get existing tour
                const existingTour = await context.dataSources.cosmos.get_record<tour_type>(
                    "Main-Listing",
                    updates.id,
                    merchantId
                );

                // Build patch operations
                const patches = [];

                if (updates.name) patches.push({ op: "set", path: "/name", value: updates.name });
                if (updates.description) patches.push({ op: "set", path: "/description", value: updates.description });
                if (updates.terms !== undefined) patches.push({ op: "set", path: "/terms", value: updates.terms });
                if (updates.faq) patches.push({ op: "set", path: "/faq", value: updates.faq });
                if (updates.thumbnail) patches.push({ op: "set", path: "/thumbnail", value: updates.thumbnail });
                if (updates.productReturnPolicyId !== undefined) patches.push({ op: "set", path: "/productReturnPolicyId", value: updates.productReturnPolicyId });

                // Handle ticket variants update
                if (updates.ticketVariants) {
                    const updatedVariants: tour_ticket_variant_type[] = updates.ticketVariants.map(variant => ({
                        id: variant.id,
                        name: variant.name,
                        description: variant.description,
                        price: variant.price,
                        peopleCount: variant.peopleCount,
                        inventory: {
                            qty_on_hand: variant.qty_on_hand,
                            qty_committed: existingTour.ticketVariants.find(v => v.id === variant.id)?.inventory.qty_committed || 0,
                            track_inventory: variant.track_inventory ?? true,
                            low_stock_threshold: variant.low_stock_threshold,
                            allow_backorder: variant.allow_backorder,
                            max_backorders: variant.max_backorders
                        },
                        inventory_transactions: existingTour.ticketVariants.find(v => v.id === variant.id)?.inventory_transactions || []
                    }));
                    patches.push({ op: "set", path: "/ticketVariants", value: updatedVariants });
                }

                // Apply patches
                await context.dataSources.cosmos.patch_record(
                    "Main-Listing",
                    updates.id,
                    merchantId,
                    patches,
                    context.userId
                );

                // Fetch updated tour
                const updatedTour = await context.dataSources.cosmos.get_record<tour_type>(
                    "Main-Listing",
                    updates.id,
                    merchantId
                );

                return {
                    code: "200",
                    success: true,
                    message: "Tour updated successfully",
                    impactedRecordRef: updatedTour.ref,
                    tour: updatedTour
                };

            } catch (error) {
                console.error("Error updating tour:", error);
                throw new GraphQLError(`Failed to update tour: ${error.message}`);
            }
        }
    },

    Tour: {
        // Computed field: qty_available for each variant
        ticketVariants: (parent: tour_type) => {
            return parent.ticketVariants.map(variant => ({
                ...variant,
                inventory: {
                    ...variant.inventory,
                    qty_available: calculate_ticket_availability(variant)
                }
            }));
        },

        // Fetch product return policy if referenced
        productReturnPolicy: async (parent: tour_type, _: any, context: serverContext) => {
            if (!parent.productReturnPolicyId) return null;

            try {
                // Fetch product return policy from vendor settings
                const policy = await context.dataSources.cosmos.get_record(
                    "Main-VendorSettings",
                    parent.productReturnPolicyId,
                    parent.ref.partition[0] // vendorId
                );

                return policy;
            } catch (error) {
                console.error("Error fetching product return policy:", error);
                return null;
            }
        }
    },

    TourTicketInventory: {
        // Computed field resolver
        qty_available: (parent: any) => {
            return parent.qty_on_hand - parent.qty_committed;
        }
    }
};

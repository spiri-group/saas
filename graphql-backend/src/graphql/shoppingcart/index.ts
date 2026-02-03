import { DateTime, Duration } from "luxon"
import { serverContext } from "../../services/azFunction"
import { PatchOperation } from "@azure/cosmos"
import { listing_type } from "../listing/types"
import { product_type, variant_type } from "../product/types"
import { service_type } from "../service/types"
import { v4 as uuidv4 } from 'uuid'
import { featuring_relationship_type, FeaturingRequestStatus, featuring_source_type } from "../featuring/types"

const resolvers = {
    Query: {
        shoppingCart: async (_: any, __: any, { dataSources: { cosmos }, userId }: serverContext) => {
            if (userId == null) throw "You cannot retrieve a shopping cart for a non auth'd user"

            if (!(await cosmos.record_exists("Main-ShoppingCart", userId, userId))) {
                await cosmos.add_record("Main-ShoppingCart", {
                    items: [],
                    id: userId,
                    ttl: Duration.fromObject({ weeks: 3}).toMillis()
                }, userId, userId)
            }

            return await cosmos.get_record("Main-ShoppingCart", userId, userId)
        }
    },
    Mutation: {
        add_to_shoppingcart: async (_: any, args: { 
            items: { 
                id: string, 
                name: string, 
                variant: {
                    id: string
                }, 
                quantity: number }[]
        }, 
        context: serverContext) => {
            if (context.userId == null) throw new Error("User must be present for this call");
        
            const operations: PatchOperation[] = [];
        
            const items = args.items.flatMap((item) => {
                operations.push(
                    {
                        op: "add",
                        value: {
                            id: item.id,
                            name: item.name,
                            variant: item.variant.id,
                            quantity: item.quantity
                        },
                        path: `/items/0`
                    }
                )

                return items
            
            })
           
            await context.dataSources.cosmos.patch_record("Main-ShoppingCart", context.userId, context.userId, operations, context.userId)
        
            return {
                code: 200,
                message: `Successfully added to shopping cart`,
                shoppingCart: await context.dataSources.cosmos.get_record("Main-ShoppingCart", context.userId, context.userId)
            }
        },

        add_service_to_cart: async (_: any, args: {
            serviceId: string,
            questionnaireResponses?: { questionId: string, question: string, answer: string }[],
            selectedAddOns?: string[],
            featuringRelationshipId?: string
        }, context: serverContext) => {
            if (context.userId == null) throw new Error("User must be present for this call");

            const services = await context.dataSources.cosmos.run_query("Main-Listing", {
                query: "SELECT * FROM c WHERE c.id = @serviceId AND c.type = 'SERVICE'",
                parameters: [{ name: "@serviceId", value: args.serviceId }]
            }, true);

            if (!services || services.length === 0) {
                throw new Error("Service not found");
            }

            const service: service_type = services[0];

            if (!service.pricing) {
                throw new Error("Service pricing not configured");
            }

            let price = 0;
            let currency = "USD";

            if (service.pricing.type === "FIXED" && service.pricing.fixedPrice) {
                price = service.pricing.fixedPrice.amount;
                currency = service.pricing.fixedPrice.currency;
            } else if (service.pricing.type === "PACKAGE" && service.pricing.packageOptions && service.pricing.packageOptions.length > 0) {
                const defaultPackage = service.pricing.packageOptions[0];
                price = defaultPackage.price.amount;
                currency = defaultPackage.price.currency;
            } else if (service.pricing.type === "HOURLY" && service.pricing.ratePerHour) {
                throw new Error("Hourly rate services cannot be added to cart. Please book an appointment instead.");
            } else {
                throw new Error("Unable to determine service price");
            }

            // Handle featuring relationship for revenue share tracking
            let featuringSource: featuring_source_type | undefined = undefined;
            if (args.featuringRelationshipId) {
                // Parse relationship ID to get merchantId (partition key)
                const parts = args.featuringRelationshipId.split("_");
                if (parts.length === 3 && parts[0] === "feat") {
                    const merchantId = parts[1];

                    const relationship = await context.dataSources.cosmos.get_record<featuring_relationship_type>(
                        "Main-FeaturingRelationship",
                        args.featuringRelationshipId,
                        merchantId
                    );

                    // Only use featuring source if relationship is active and service is featured
                    if (relationship &&
                        relationship.requestStatus === FeaturingRequestStatus.ACCEPTED &&
                        relationship.practitionerId === service.vendorId) {

                        // For SELECTED_SERVICES, verify this service is in the featured list
                        const isServiceFeatured = relationship.featuringType === "FULL_PROFILE" ||
                            (relationship.featuredServiceIds?.includes(service.id));

                        if (isServiceFeatured) {
                            featuringSource = {
                                relationshipId: relationship.id,
                                merchantId: relationship.merchantId,
                                merchantName: relationship.merchantName,
                                merchantSlug: relationship.merchantSlug,
                                merchantRevenueShareBps: relationship.merchantRevenueShareBps,
                                practitionerRevenueShareBps: relationship.practitionerRevenueShareBps
                            };
                        }
                    }
                }
            }

            const cartItem = {
                id: uuidv4(),
                itemType: "SERVICE",
                name: service.name,
                descriptor: service.name,
                quantity: 1,
                merchantId: service.vendorId,
                isService: true,
                serviceId: service.id,
                // Reference to the listing
                listingRef: {
                    id: service.id,
                    partition: [service.vendorId],
                    container: "Main-Listing"
                },
                service: service,
                questionnaireResponses: args.questionnaireResponses || [],
                selectedAddOns: args.selectedAddOns || [],
                price: {
                    amount: price,
                    currency: currency
                },
                // Track featuring source for revenue share (if applicable)
                featuringSource: featuringSource
            };

            const operations: PatchOperation[] = [{
                op: "add",
                value: cartItem,
                path: `/items/0`
            }];

            await context.dataSources.cosmos.patch_record("Main-ShoppingCart", context.userId, context.userId, operations, context.userId);

            return {
                code: "200",
                success: true,
                message: `Service "${service.name}" added to shopping cart`,
                shoppingCart: await context.dataSources.cosmos.get_record("Main-ShoppingCart", context.userId, context.userId)
            };
        },

        add_product_to_cart: async (_: any, args: {
            input: {
                productRef: { id: string, partition: string[], container: string },
                variantId: string,
                descriptor: string,
                quantity: number,
                price: { amount: number, currency: string },
                imageUrl?: string
            }
        }, context: serverContext) => {
            if (context.userId == null) throw new Error("User must be present for this call");

            const { productRef, variantId, descriptor, quantity, price, imageUrl } = args.input;

            // Ensure cart exists
            if (!(await context.dataSources.cosmos.record_exists("Main-ShoppingCart", context.userId, context.userId))) {
                await context.dataSources.cosmos.add_record("Main-ShoppingCart", {
                    items: [],
                    id: context.userId,
                    ttl: Duration.fromObject({ weeks: 3 }).toMillis()
                }, context.userId, context.userId)
            }

            // Get current cart to check for existing item
            const cart = await context.dataSources.cosmos.get_record<any>("Main-ShoppingCart", context.userId, context.userId);

            // Check if same product+variant already in cart (check listingRef or legacy productRef)
            const existingIndex = cart.items.findIndex((item: any) =>
                item.itemType === "PRODUCT" &&
                (item.listingRef?.id === productRef.id || item.productRef?.id === productRef.id) &&
                item.variantId === variantId
            );

            let operations: PatchOperation[];

            if (existingIndex >= 0) {
                // Update quantity of existing item
                const newQuantity = cart.items[existingIndex].quantity + quantity;
                operations = [{
                    op: "replace",
                    path: `/items/${existingIndex}/quantity`,
                    value: newQuantity
                }];
            } else {
                // Add new item
                const cartItem = {
                    id: uuidv4(),
                    itemType: "PRODUCT",
                    // Reference to the listing
                    listingRef: productRef,
                    variantId,
                    descriptor,
                    quantity,
                    price,
                    imageUrl: imageUrl || null,
                    merchantId: productRef.partition[0],
                    isService: false
                };

                operations = [{
                    op: "add",
                    value: cartItem,
                    path: `/items/0`
                }];
            }

            await context.dataSources.cosmos.patch_record("Main-ShoppingCart", context.userId, context.userId, operations, context.userId);

            return {
                code: "200",
                success: true,
                message: existingIndex >= 0 ? "Cart updated" : `"${descriptor}" added to cart`,
                shoppingCart: await context.dataSources.cosmos.get_record("Main-ShoppingCart", context.userId, context.userId)
            };
        },

        update_cart_item_quantity: async (_: any, args: { itemId: string, quantity: number }, context: serverContext) => {
            if (context.userId == null) throw new Error("User must be present for this call");

            const cart = await context.dataSources.cosmos.get_record<any>("Main-ShoppingCart", context.userId, context.userId);

            if (!cart || !cart.items) {
                throw new Error("Shopping cart not found");
            }

            const itemIndex = cart.items.findIndex((item: any) => item.id === args.itemId);

            if (itemIndex === -1) {
                throw new Error("Item not found in cart");
            }

            let operations: PatchOperation[];

            if (args.quantity <= 0) {
                // Remove item if quantity is 0 or less
                operations = [{
                    op: "remove",
                    path: `/items/${itemIndex}`
                }];
            } else {
                // Update quantity
                operations = [{
                    op: "replace",
                    path: `/items/${itemIndex}/quantity`,
                    value: args.quantity
                }];
            }

            await context.dataSources.cosmos.patch_record("Main-ShoppingCart", context.userId, context.userId, operations, context.userId);

            return {
                code: "200",
                success: true,
                message: args.quantity <= 0 ? "Item removed from cart" : "Cart updated",
                shoppingCart: await context.dataSources.cosmos.get_record("Main-ShoppingCart", context.userId, context.userId)
            };
        },

        remove_from_cart: async (_: any, args: { itemId: string }, context: serverContext) => {
            if (context.userId == null) throw new Error("User must be present for this call");

            const cart = await context.dataSources.cosmos.get_record<any>("Main-ShoppingCart", context.userId, context.userId);

            if (!cart || !cart.items) {
                throw new Error("Shopping cart not found");
            }

            const itemIndex = cart.items.findIndex((item: any) => item.id === args.itemId);

            if (itemIndex === -1) {
                throw new Error("Item not found in cart");
            }

            const operations: PatchOperation[] = [{
                op: "remove",
                path: `/items/${itemIndex}`
            }];

            await context.dataSources.cosmos.patch_record("Main-ShoppingCart", context.userId, context.userId, operations, context.userId);

            return {
                code: "200",
                success: true,
                message: "Item removed from shopping cart",
                shoppingCart: await context.dataSources.cosmos.get_record("Main-ShoppingCart", context.userId, context.userId)
            };
        },

        clear_cart: async (_: any, __: any, context: serverContext) => {
            if (context.userId == null) throw new Error("User must be present for this call");

            const operations: PatchOperation[] = [{
                op: "replace",
                path: "/items",
                value: []
            }];

            await context.dataSources.cosmos.patch_record("Main-ShoppingCart", context.userId, context.userId, operations, context.userId);

            return {
                code: "200",
                success: true,
                message: "Shopping cart cleared",
                shoppingCart: await context.dataSources.cosmos.get_record("Main-ShoppingCart", context.userId, context.userId)
            };
        }
    }
}

export {resolvers}
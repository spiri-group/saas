import { serverContext } from "../../services/azFunction";
import { encodeAmountToSmallestUnit, generate_human_friendly_id, groupBy, isNullOrUndefined, isNullOrWhiteSpace } from "../../utils/functions";
import { v4 as uuidv4 } from 'uuid'
import { orderLine_caseInvoice_type, orderLine_tourBooking_type, orderLine_type, order_credit_type, order_payment_type, order_type, refund_record_type } from "./types";
import { currency_amount_type, media_type, recordref_type, stripeplace_type } from "../0_shared/types";
import { DateTime, Duration } from "luxon";
import { PatchOperation } from "@azure/cosmos";
import { booking_type, tour_type } from "../eventandtour/types";
import { merchantLocation_type, vendor_type } from "../vendor/types";
import { sender_details } from "../../client/email_templates";
import { deriveFees, deriveTax } from "../0_shared";
import { address_details_type, address_type, user_type } from "../user/types";
import { variant_inventory_type, variant_type } from "../product/types";
import { DataAction } from "../../services/signalR";
import { v4 as uuid } from 'uuid'
import { pack_by_box_sources } from "../logistics/functions/packing";
import { items_with_dimensions } from "../logistics/types";
import { restore_orderline_quantities_webhook } from "./inventory_utils";
import { process_refund } from "./refund_utils";
import { getTierFeatures } from "../subscription/featureGates";
import { subscription_tier } from "../vendor/types";

const resolvers = {
    Query: { 
        order: async (_: any, args: any, { dataSources }: serverContext, ___: any) => {
            const order = await dataSources.cosmos.get_record("Main-Orders", args.id, args.id)
            return order
        },
        orders: async(_:any, args: {
            customerEmail?: string, 
            customerId?: string,
            forObject?: recordref_type
            vendorId?: string,
        }, {dataSources, signalR}: serverContext, __:any) => {

            let query = "SELECT VALUE o FROM o ";
            let parameters = [];
            let joinConditions = [];
            let whereConditions = ["o.target != 'MERCHANT_SUBSCRIPTION'"];

            if (!isNullOrWhiteSpace(args.customerEmail)) {
                whereConditions.push("o.customerEmail = @customerEmail");
                parameters.push({ name: "@customerEmail", value: args.customerEmail });
            }

            if (!isNullOrWhiteSpace(args.customerId)) {
                whereConditions.push("o.userId = @customerId");
                parameters.push({ name: "@customerId", value: args.customerId });
            }

            if (!isNullOrUndefined(args.forObject)) {
                if (parameters.length > 0) query += "AND ";
                whereConditions.push("o.forObject.id = @forObjectId AND o.forObject.partition = @forObjectPartition");
                parameters.push(
                    { name: "@forObjectId", value: args.forObject.id },
                    { name: "@forObjectPartition", value: args.forObject.partition }
                );
            }

            if (!isNullOrWhiteSpace(args.vendorId)) {
                joinConditions.push("JOIN l in o.lines");
                whereConditions.push("l.merchantId = @merchantId");
                parameters.push({ name: "@merchantId", value: args.vendorId });
            }

            query += joinConditions.join(" ") + " ";
            query += (whereConditions.length > 0 ? "WHERE " : "") + whereConditions.join(" AND ") + " ";
            query += "ORDER BY o.createdDate DESC";

            let orders = await dataSources.cosmos.run_query("Main-Orders", {
                query,
                parameters
            }, true);

            return orders;
        },
        estimate: async (_: any, args: { lines: any[], target: string}, context: serverContext, __: any) => {
            // Try to get user's preferred currency, fall back to merchant's pricing currency
            let user_currency = args.lines[0]?.price?.currency || "USD";

            if (context.userId) {
                const userResult = await context.dataSources.cosmos.get_scalar<{ currency: string }>(
                    "Main-User", "id", "currency", context.userId, context.userId
                );
                if (userResult?.currency) {
                    user_currency = userResult.currency;
                }
            }

            return await estimate_order(args.lines, user_currency, context);
        },
        refunds: async (_: any, args: { 
            vendorId: string, 
            status?: string[]
        }, context: serverContext) => {
            const defaultStatuses = ["PENDING", "IN_PROGRESS", "APPROVED"];
            const refundStatuses = args.status || defaultStatuses;
            
            // Query separate refund documents using refund_status for workflow state
            const refunds = await context.dataSources.cosmos.run_query<refund_record_type>("Main-Orders", {
                query: `
                    SELECT *
                    FROM c
                    WHERE 
                        c.docType = "REFUND"
                        AND c.vendorId = @vendorId
                        AND c.status = "ACTIVE"
                        AND ARRAY_CONTAINS(@refundStatuses, c.refund_status)
                    ORDER BY c.requestedAt DESC
                `,
                parameters: [
                    { name: "@vendorId", value: args.vendorId },
                    { name: "@refundStatuses", value: refundStatuses }
                ]
            }, true);

            // For each refund, get the order details
            const refundsWithOrders = await Promise.all(
                refunds.map(async (refund: any) => {
                    const order = await context.dataSources.cosmos.get_record<order_type>("Main-Orders", refund.orderId, refund.orderId);
                    
                    return {
                        ...refund,
                        order: {
                            id: order.id,
                            code: order.code,
                            customerEmail: order.customerEmail,
                            createdDate: order.createdDate
                        }
                    };
                })
            );
            
            return refundsWithOrders;
        },
        refund: async (_: any, args: { orderId: string }, context: serverContext) => {
            // Query for active refund by orderId
            const refunds = await context.dataSources.cosmos.run_query<refund_record_type>("Main-Orders", {
                query: `
                    SELECT * FROM c 
                    WHERE c.docType = "REFUND" 
                    AND c.orderId = @orderId
                    AND c.status = "ACTIVE"
                    ORDER BY c.requestedAt DESC
                `,
                parameters: [
                    { name: "@orderId", value: args.orderId }
                ]
            }, true);

            if (refunds.length === 0) {
                return null;
            }

            const refund = refunds[0]; // Get the most recent refund for this order

            // Get the order details
            const order = await context.dataSources.cosmos.get_record<order_type>("Main-Orders", refund.orderId, refund.orderId);
            
            return {
                ...refund,
                order: {
                    id: order.id,
                    code: order.code,
                    customerEmail: order.customerEmail,
                    createdDate: order.createdDate
                }
            };
        },
        posSales: async (_: any, args: {
            vendorId: string;
            limit?: number;
            offset?: number;
        }, context: serverContext) => {
            const limit = args.limit || 50;
            const offset = args.offset || 0;

            const sales = await context.dataSources.cosmos.run_query<order_type>("Main-Orders", {
                query: `
                    SELECT VALUE o FROM o
                    JOIN l IN o.lines
                    WHERE o.source = "POS"
                    AND l.merchantId = @merchantId
                    ORDER BY o.createdDate DESC
                    OFFSET @offset LIMIT @limit
                `,
                parameters: [
                    { name: "@merchantId", value: args.vendorId },
                    { name: "@offset", value: offset },
                    { name: "@limit", value: limit }
                ]
            }, true);

            return sales;
        },
        backorderedOrders: async (_: any, args: { vendorId: string }, context: serverContext) => {
            // Query for orders with backordered lines
            const orders = await context.dataSources.cosmos.run_query<order_type>("Main-Orders", {
                query: `
                    SELECT * FROM c
                    WHERE ARRAY_LENGTH(
                        ARRAY(SELECT VALUE line
                              FROM line IN c.lines
                              WHERE line.merchantId = @vendorId
                              AND line.inventory_status = "BACKORDERED")
                    ) > 0
                    ORDER BY c.createdDate ASC
                `,
                parameters: [
                    { name: "@vendorId", value: args.vendorId }
                ]
            }, true);

            return orders;
        },
        orderCheckout: async (_: any, args: { orderId: string }, context: serverContext) => {
            // NO AUTH REQUIRED - Public checkout link
            const orders = await context.dataSources.cosmos.run_query<order_type>("Main-Orders", {
                query: "SELECT * FROM c WHERE c.id = @orderId",
                parameters: [{ name: "@orderId", value: args.orderId }]
            }, true);

            if (!orders || orders.length === 0) {
                throw new Error("Checkout order not found");
            }

            const order = orders[0];

            // Only return if status is PENDING_PAYMENT (security check)
            if (order.status !== "PENDING_PAYMENT") {
                throw new Error("This checkout link is no longer valid");
            }

            // Check if link is expired
            if (order.checkoutLinkExpiresAt && new Date(order.checkoutLinkExpiresAt) < new Date()) {
                throw new Error("This checkout link has expired");
            }

            return order;
        },
        orderRefundPolicy: async (_: any, args: { orderId: string }, context: serverContext) => {
            // We need to find the order by querying since we don't know the partition (customerEmail)
            const orders = await context.dataSources.cosmos.run_query<order_type>("Main-Orders", {
                query: `SELECT * FROM c WHERE c.id = @orderId`,
                parameters: [{ name: "@orderId", value: args.orderId }]
            }, true);

            if (orders.length === 0) {
                throw new Error(`Order ${args.orderId} not found`);
            }

            const order = orders[0];

            // Get the merchant from the first line (assuming all lines are from the same merchant for refund policy)
            if (order.lines.length === 0) {
                throw new Error("Order has no lines");
            }

            const firstLine = order.lines[0];
            const merchantId = firstLine.merchantId;

            // Get the listing to determine listing type
            const forObjectRef = firstLine.forObject as recordref_type;
            const listing = await context.dataSources.cosmos.get_record<any>("Main-Listing", forObjectRef.id, forObjectRef.partition[0]);

            if (!listing) {
                throw new Error("Listing not found for order line");
            }

            // Get the merchant to determine country
            const merchant = await context.dataSources.cosmos.get_record<vendor_type>("Main-Vendor", merchantId, merchantId);
            if (!merchant) {
                throw new Error("Merchant not found");
            }

            // Find applicable refund policy
            const refundPolicies = await context.dataSources.cosmos.run_query("Main-VendorSettings", {
                query: `SELECT * FROM c WHERE c.vendorId = @merchantId AND c.type = 'REFUND_POLICY' AND c.listingType = @listingType`,
                parameters: [
                    { name: "@merchantId", value: merchantId },
                    { name: "@listingType", value: listing.type }
                ]
            }, true);

            if (refundPolicies.length === 0) {
                // Try to find a general policy if no specific one exists
                const generalPolicies = await context.dataSources.cosmos.run_query("Main-VendorSettings", {
                    query: `SELECT * FROM c WHERE c.vendorId = @merchantId AND c.type = 'REFUND_POLICY' AND (c.listingType = 'ALL' OR IS_NULL(c.listingType))`,
                    parameters: [
                        { name: "@merchantId", value: merchantId }
                    ]
                }, true);

                if (generalPolicies.length === 0) {
                    return null; // No refund policy found
                }

                return generalPolicies[0];
            }

            return refundPolicies[0];
        }
    },
    Mutation: {
        create_order:  async (_: any, args: {
            customerEmail: string,
            lines: any[],
            merchantId?: string,
            forObject?: recordref_type,
            target: string,
            digitalOnly?: boolean
        }, context: serverContext) => {

            // Validation for forObject at top level
            if (isNullOrUndefined(args.forObject)) {
                if (args.lines.some((line: any) => isNullOrUndefined(line.forObject))) {
                    throw new Error("For object is required on all lines if not provided on args")
                }
            }

            if (!isNullOrUndefined(args.forObject) && isNullOrWhiteSpace(args.merchantId)) {
                throw new Error("Merchant ID is required if forObject is provided")
            }

            if (isNullOrWhiteSpace(args.merchantId)) {
                if (args.lines.some((line: any) => isNullOrWhiteSpace(line.merchantId))) {
                    throw new Error("Merchant ID is required on all lines if not provided on args")
                }
            }

            await restore_target_on_lines_async(args.lines, context.dataSources.cosmos)

            const orderId = uuidv4();
            const order: any = {
                ttl: Duration.fromObject({days: 2}).as("seconds"),
                id: orderId,
                orderId: orderId,
                docType: "ORDER",
                code: await generate_order_no(args.customerEmail, context.dataSources.cosmos),
                userId: context.userId,
                customerEmail: args.customerEmail,
                forObject: args.forObject,
                target: args.target,
                digitalOnly: args.digitalOnly ?? false,
                lines: args.lines.map((line: any) => {
                    return {
                        id: uuidv4(),
                        forObject: isNullOrUndefined(args.forObject) ? line.forObject : "inherit",
                        variantId: line.variantId,
                        descriptor: line.descriptor,
                        price_log: [
                            {
                                id: uuidv4(),
                                datetime: DateTime.now().toISO(),
                                type: "CHARGE",
                                status: "NEW",
                                price: {
                                    ...line.price,
                                    quantity: line.quantity
                                }
                            }
                        ],
                        paid_status_log: [],
                        refund_request_log: [],
                        stripe: {},
                        target: line.target,
                        merchantId: args.merchantId ?? line.merchantId,
                        // Service-specific fields (from optional service input)
                        ...(line.service && {
                            questionnaireResponses: line.service.questionnaireResponses,
                            selectedAddOns: line.service.selectedAddOns
                        }),
                        // Featuring source for revenue share tracking (if purchasing through merchant featured section)
                        ...(line.featuringSource && {
                            featuringSource: line.featuringSource
                        })
                    }
                }),
                payments: [],
                credits: [],
                stripe: {}
            }

            // now that each line has a for object we can
            // assign the relevant tax code
            for (var line of order.lines) {
                const forObjectRef = line.forObject as recordref_type
                const tax_code = await context.dataSources.cosmos.get_scalar<{ tax_code: string }>("Main-Listing", "vendorId", "stripe.tax_code as tax_code", forObjectRef.id, forObjectRef.partition)
                if (tax_code) {
                    line.tax_code = tax_code
                }
            }

            if (!isNullOrUndefined(args.forObject)) {
                delete order.forObject
            }
        
            // Create the setup intent for the order
            const stripeCustomer = await context.dataSources.stripe.resolveCustomer(args.customerEmail)
            const intent = await context.dataSources.stripe.callApi("POST", "setup_intents", {
                customer: stripeCustomer.id,
                metadata: {
                    target: "Main-Orders",
                    orderId: order.id,
                    customerEmail: args.customerEmail
                }
            })
            if (intent.status != 200) throw "Error creating payment intent in stripe"
        
            order.stripe = {
                setupIntentId: intent.data["id"],
                setupIntentSecret: intent.data["client_secret"]
            }

            // Commit inventory for physical product lines
            const backorderPatches = await commit_orderline_quantities(order.lines.filter(line =>
                line.target.startsWith("PRODUCT-PURCHASE") && line.variantId
            ), context.dataSources.cosmos, context.userId ?? "GUEST");

            // Apply backorder status to order lines
            if (backorderPatches.length > 0) {
                for (const patch of backorderPatches) {
                    const pathParts = patch.path.split('/');
                    const lineIndex = parseInt(pathParts[2]);
                    const field = pathParts[3];
                    if ('value' in patch) {
                        order.lines[lineIndex][field] = patch.value;
                    }
                }
            }

            await context.dataSources.cosmos.add_record("Main-Orders", order, order.id, context.userId ?? "GUEST")

            if (args.merchantId && args.target.startsWith("CASE")) {
                
                const merchant = await context.dataSources.cosmos.get_record<vendor_type>("Main-Vendor", args.merchantId, args.merchantId)
                
                let payment_instructions = {
                    message: ""
                }
                if (order.lines.some(x => x.target.includes("CASE"))) {
                    payment_instructions.message = `To make payment, plaese track your case and then look for the fees section. From there you will be able to pay.`
                }

                await context.dataSources.email.sendEmail(
                    sender_details.from,
                    args.customerEmail,
                    "ORDER_FEE_CREATION",
                    {
                        order: {
                            code: order.code
                        },
                        merchant: {
                            name: merchant.name
                        },
                        payment_instructions
                    }
                )
            }

            return {
                code: "200",
                message: `Order has successfully created`,
                order: await context.dataSources.cosmos.get_record("Main-Orders", order.id, order.id)
            }
        },
        generate_sales_tax: async (_:any, { orderRef }: { orderRef: recordref_type }, { dataSources, userId }: serverContext) => {
            // this will use the billing address on the order to determine the tax for the items on the order
            if (!userId) throw new Error("User not logged in") 
            const order = await dataSources.cosmos.get_record<order_type>("Main-Orders", orderRef.id, orderRef.id)
            if (isNullOrUndefined(order.billing)) throw new Error("Order does not have a billing address")

            const userResult = await dataSources.cosmos.get_scalar<{ currency: string }>("Main-User", "id", "currency", userId, userId);
            const currency = userResult?.currency || "USD";

            restore_price_on_lines(order.lines)
            await restore_target_on_lines_async(order.lines, dataSources.cosmos)

            const taxDetails = await deriveTax(
                dataSources,
                { address: order.billing.addressComponents, currency },
                order.lines,
                "billing"
            )

            const orderPatches: PatchOperation[] = []

            // now we need to save the tax calc against the price_log on the order line
            for (const line of order.lines) {
                const lineIdx = order.lines.findIndex(x => x.id === line.id);
                const patch : PatchOperation = {
                    "op": "add",
                    "path": `/lines/${lineIdx}/price_log/0/tax`,
                    "value": {
                        id: uuid(),
                        datetime: DateTime.now().toISO(),
                        type: "CHARGE",
                        price: {
                            ...taxDetails.line_tax_mapping[line.id],
                            quantity: 1
                        }
                    }
                }
                orderPatches.push(patch)
            }

            await dataSources.cosmos.patch_record("Main-Orders", orderRef.id, orderRef.id, orderPatches, userId);

            // now we can return the total tax amount

            return {
                code: 200,
                status: "generated tax succssfully",
                tax: taxDetails
            }

        },
        update_order_address: async (_: any, args: {
            orderRef: recordref_type,
            name: string,
            address: address_details_type,
            mode: "billing" | "shipping"
        }, { dataSources: { cosmos }, userId }: serverContext) => {

            if (!await cosmos.record_exists("Main-Orders", args.orderRef.id, args.orderRef.id)) {
                throw new Error(`Cannot find order with id ${args.orderRef.id} to update`);
            }

            const patchOperations: PatchOperation[] = []

            const formattedAddress = Object.values(args.address).filter(x => !isNullOrWhiteSpace(x)).join(", ")

            patchOperations.push(
                { 
                    op: "set", 
                    path: `/${args.mode}`,
                    value: {
                        name: args.name,
                        address: formattedAddress,
                        addressComponents: args.address,
                    }
                }
            )

            await cosmos.patch_record("Main-Orders", args.orderRef.id, args.orderRef.id, patchOperations, userId)

            return {
                code: 200,
                message: `Order addresses successfully updated`,
                order: await cosmos.get_record("Main-Orders", args.orderRef.id, args.orderRef.id)
            }
        },
        update_order_addresses: async (_: any, args: {
            orderRef: recordref_type,
            billingName: string,
            billingAddress: address_details_type,
            shippingName?: string,
            shippingAddress?: address_details_type
        }, { dataSources: { cosmos }, userId }: serverContext) => {

            if (!await cosmos.record_exists("Main-Orders", args.orderRef.id, args.orderRef.id)) {
                throw new Error(`Cannot find order with id ${args.orderRef.id} to update`);
            }

            const patchOperations: PatchOperation[] = []

            // Always update billing address
            const formattedBillingAddress = Object.values(args.billingAddress).filter(x => !isNullOrWhiteSpace(x)).join(", ")
            patchOperations.push(
                { 
                    op: "set", 
                    path: "/billing",
                    value: {
                        name: args.billingName,
                        address: formattedBillingAddress,
                        addressComponents: args.billingAddress,
                    }
                }
            )

            // Update shipping address if provided
            if (args.shippingAddress && args.shippingName) {
                const formattedShippingAddress = Object.values(args.shippingAddress).filter(x => !isNullOrWhiteSpace(x)).join(", ")
                patchOperations.push(
                    { 
                        op: "set", 
                        path: "/shipping",
                        value: {
                            name: args.shippingName,
                            address: formattedShippingAddress,
                            addressComponents: args.shippingAddress,
                        }
                    }
                )
            }

            await cosmos.patch_record("Main-Orders", args.orderRef.id, args.orderRef.id, patchOperations, userId)

            return {
                code: 200,
                message: `Order addresses successfully updated`,
                order: await cosmos.get_record("Main-Orders", args.orderRef.id, args.orderRef.id)
            }
        },
        upsert_request_refund: async (_: any, args: {
            orderRef: recordref_type,
            lines: {
                id: string,
                refund_quantity: number
            }[],
            reasonId?: string,
            evidencePhotos?: media_type[],
            evidenceVideos?: media_type[]
        }, context: serverContext) => {

            const order = await context.dataSources.cosmos.get_record<order_type>("Main-Orders", args.orderRef.id, args.orderRef.id)
            const patchOperations: PatchOperation[] = []
                        
            let requestRefundCreated = 0;
            let refundReason = null;
            let shouldAutoApprove = false;
            let initialReturnShippingEstimate: any = null;

            const customerEmail = order.customerEmail;
            const customer = await context.dataSources.cosmos.run_query<user_type>(
                "Main-User",
                {
                    query: `SELECT * FROM c WHERE c.email = @customerEmail`,
                    parameters: [{ name: "@customerEmail", value: customerEmail }]
                },
                true
            )
            .then(users => users[0]);

            // If reasonId is provided, fetch the reason details and check for auto-approval
            if (args.reasonId) {
                // Get the merchant from the first line to find the refund policy
                const firstLine = order.lines[0];
                const merchantId = firstLine.merchantId;
                
                // Find the refund policy containing this reason
                const refundPolicies = await context.dataSources.cosmos.run_query("Main-VendorSettings", {
                    query: `SELECT * FROM c WHERE c.vendorId = @merchantId AND c.type = 'REFUND_POLICY'`,
                    parameters: [{ name: "@merchantId", value: merchantId }]
                }, true);

                // Find the specific reason across all policies
                for (const policy of refundPolicies) {
                    if (policy.reasons) {
                        const foundReason = policy.reasons.find((r: any) => r.id === args.reasonId);
                        if (foundReason) {
                            refundReason = foundReason;
                            
                            // Calculate order age in days
                            const orderDate = DateTime.fromISO(order.createdDate);
                            const orderAgeDays = Math.abs(orderDate.diffNow('days').days);
                            
                            // Check if the reason supports auto-approval (confirmed = true)
                            // and if we're within the refund timeframe
                            if (foundReason.confirmed && !foundReason.no_refund) {
                                const applicableTier = foundReason.tiers
                                    ?.sort((a: any, b: any) => a.daysUpTo - b.daysUpTo)
                                    ?.find((tier: any) => orderAgeDays <= tier.daysUpTo);
                                
                                if (applicableTier && applicableTier.refundPercentage > 0) {
                                    shouldAutoApprove = true;
                                }
                            }
                            break;
                        }
                    }
                }
            }

            // Fetch product refund rules for override logic
            const productRefundRules = new Map<string, any>();
            for (const line of args.lines) {
                const orderLine = order.lines.find(l => l.id === line.id);
                if (!orderLine) continue;

                // Only check products (not tours or cases)
                if (!orderLine.target?.startsWith("PRODUCT-PURCHASE")) continue;

                const forObject = orderLine.forObject as recordref_type;
                if (forObject && forObject.id && !productRefundRules.has(forObject.id)) {
                    try {
                        const product = await context.dataSources.cosmos.get_record<any>(
                            forObject.container || "Main-Listing",
                            forObject.id,
                            Array.isArray(forObject.partition) ? forObject.partition[0] : forObject.partition
                        );

                        if (product?.refundRules) {
                            productRefundRules.set(forObject.id, product.refundRules);
                        }
                    } catch (error) {
                        context.logger.logMessage(`Could not fetch product ${forObject.id} for refund rules: ${error}`);
                    }
                }
            }

            // Apply product-level override to whoPayShipping
            let effectiveWhoPayShipping = refundReason?.whoPayShipping;

            // Check if any product overrides to "refund without return"
            for (const [productId, rules] of productRefundRules) {
                if (rules.refundWithoutReturn === true) {
                    effectiveWhoPayShipping = "NOT_REQUIRED";
                    break;
                }
            }

            // Apply product-level override to auto-approval
            for (const [productId, rules] of productRefundRules) {
                // If allowAutoReturns is explicitly false, disable auto-approval
                if (rules.allowAutoReturns === false) {
                    shouldAutoApprove = false;
                    break;
                }

                // If refundTiming is manual, disable auto-approval
                if (rules.refundTiming === 'manual') {
                    shouldAutoApprove = false;
                    break;
                }
            }

            // Server-side evidence validation
            if (effectiveWhoPayShipping === "NOT_REQUIRED") {
                // Evidence-only refunds require minimum 2 photos
                if (!args.evidencePhotos || args.evidencePhotos.length < 2) {
                    throw new Error("Evidence-only refunds require at least 2 photos");
                }
            }

            // Apply product-level requirePhoto override
            for (const [productId, rules] of productRefundRules) {
                if (rules.requirePhoto === true) {
                    if (!args.evidencePhotos || args.evidencePhotos.length < 2) {
                        throw new Error("This product requires at least 2 evidence photos for all refund reasons");
                    }
                    break;
                }
            }

            // Validate video evidence if provided
            if (args.evidenceVideos && args.evidenceVideos.length > 0) {
                for (const video of args.evidenceVideos) {
                    // Max 50MB
                    if (video.sizeBytes && video.sizeBytes > 50 * 1024 * 1024) {
                        throw new Error("Video evidence must be under 50MB");
                    }

                    // Max 60 seconds
                    if (video.durationSeconds && video.durationSeconds > 60) {
                        throw new Error("Video evidence must be under 60 seconds");
                    }
                }
            }

            for (var line of args.lines) {
                const existingOrderLine = order.lines.findIndex(x => x.id == line.id);
                if (existingOrderLine == -1) throw "Could not find the line on the order"

                const requestRefundIndex = order.lines[existingOrderLine].refund_request_log.findIndex(x => x.status == "PENDING")
                
                if (requestRefundIndex == -1) {
                    if (line.refund_quantity == 0) continue;
                    
                    // Create the request refund with reason information
                    const refundRequestData: any = {
                        id: uuidv4(),
                        datetime: DateTime.now(),
                        status: shouldAutoApprove ? "APPROVED" : "PENDING",
                        quantity: line.refund_quantity
                    };

                    // Add reason information if provided
                    if (refundReason) {
                        refundRequestData.reason = {
                            id: args.reasonId,
                            code: refundReason.code,
                            title: refundReason.title
                        };
                    }

                    // Add return shipping estimate if available
                    if (initialReturnShippingEstimate) {
                        refundRequestData.returnShippingEstimate = initialReturnShippingEstimate;
                    }

                    // Add evidence photos if provided
                    if (args.evidencePhotos && args.evidencePhotos.length > 0) {
                        refundRequestData.evidencePhotos = args.evidencePhotos;
                    }

                    // Add evidence videos if provided
                    if (args.evidenceVideos && args.evidenceVideos.length > 0) {
                        refundRequestData.evidenceVideos = args.evidenceVideos;
                    }

                    patchOperations.push(
                        { 
                            op: "add", 
                            value: refundRequestData, 
                            path: `/lines/${existingOrderLine}/refund_request_log/0`
                        }
                    )

                    requestRefundCreated++;

                } else {
                    if (line.refund_quantity == 0) {
                        patchOperations.push(
                            { 
                                op: "set", 
                                value: line.refund_quantity, 
                                path: `/lines/${existingOrderLine}/refund_request_log/${requestRefundIndex}/quantity`
                            }
                        )
                    }
                    
                }

            }

            await context.dataSources.cosmos.patch_record("Main-Orders", args.orderRef.id, args.orderRef.id, patchOperations, "CUSTOMER")

            // Group refund request lines by type for notifications and shipping calculation
            const refundRequestLines = args.lines.map(line => 
                order.lines.find(ol => ol.id === line.id)
            ).filter(Boolean);

            // Group lines by type
            const tourLines = refundRequestLines.filter(line => 
                'sessionRef' in line && 'ticketId' in line
            ) as orderLine_tourBooking_type[];

            const caseInvoiceLines = refundRequestLines.filter(line => 
                'interactionId' in line
            ) as orderLine_caseInvoice_type[];

            const productLines = refundRequestLines.filter(line => 
                !('sessionRef' in line) && !('interactionId' in line)
            );

            // Calculate return shipping estimate for physical products first
            let returnShippingEstimate: any = null;
            if (productLines.length > 0 && refundReason && !refundReason.no_refund && effectiveWhoPayShipping !== "NOT_REQUIRED") {
                try {                    
                    // Get customer address from order
                    const customerAddress = customer.addresses.find(x => x.isDefault);
                    if (!customerAddress) {
                        throw new Error("No shipping address found for return estimate");
                    }

                    // Get product details for items being returned
                    const returnOrderLines = productLines.map(line => {
                        const refundQuantity = args.lines.find(al => al.id === line.id)?.refund_quantity || 0;
                        return { ...line, quantity: refundQuantity };
                    }).filter(line => line.quantity > 0);

                    if (returnOrderLines.length === 0) {
                        throw new Error("No items to return");
                    }

                    // Restore target information for order lines
                    await restore_target_on_lines_async(returnOrderLines, context.dataSources.cosmos);
                    restore_price_on_lines(returnOrderLines);

                    // Get variant details for dimensions and weights
                    const variantIds = returnOrderLines.map(item => item.variantId);
                    const productIds = returnOrderLines.map(item => (item.forObject as recordref_type).id);

                    const variant_details = await context.dataSources.cosmos.run_query<
                        variant_type & {
                            productId: string;
                            stripe: { tax_code: string };
                            variantId: string;
                        }
                    >('Main-Listing', {
                        query: `
                            SELECT 
                                c.id AS productId,
                                c.stripe,
                                v.id AS variantId,
                                v.name,
                                v.dimensions,
                                v.weight,
                                v.countryOfManufacture,
                                v.countryOfOrigin,
                                v.harmonizedTarrifCode
                            FROM c
                            JOIN v IN c.variants
                            WHERE ARRAY_CONTAINS(@variantIds, v.id)
                            AND ARRAY_CONTAINS(@productIds, c.id)
                        `,
                        parameters: [
                            { name: "@variantIds", value: Array.isArray(variantIds) ? variantIds : [] },
                            { name: "@productIds", value: Array.isArray(productIds) ? productIds : [] }
                        ]
                    }, true);

                    // Create items with dimensions for packing
                    const items_with_dimensions: items_with_dimensions[] = returnOrderLines.map(item => {
                        const forObject = item.forObject as recordref_type;
                        const variantId = item.variantId;

                        const variant_detail = variant_details.find(v => v.productId === forObject.id && v.variantId === variantId);

                        if (!variant_detail) {
                            throw new Error(`Variant details not found for item ${item.id}`);
                        }

                        const sorted = [variant_detail.dimensions.depth, variant_detail.dimensions.width, variant_detail.dimensions.height].sort((a, b) => b - a);

                        return {
                            ...item,
                            name: variant_detail.name,
                            tax_code: variant_detail.stripe.tax_code,
                            country_of_manufacture: variant_detail.countryOfManufacture,
                            country_of_origin: variant_detail.countryOfOrigin,
                            harmonized_tariff_code: variant_detail.harmonizedTarrifCode,
                            dimensions: {
                                depth: sorted[0], // Using centimeters as default
                                width: sorted[1],
                                height: sorted[2],
                                uom: 'cm'
                            },
                            weight: {
                                amount: variant_detail.weight.amount,
                                uom: variant_detail.weight.uom
                            }
                        };
                    }).filter(item => item !== null) as items_with_dimensions[];

                    // Use optimal packing algorithm
                    const packages = pack_by_box_sources(items_with_dimensions);
                    const bestPackageOption = packages["Australia Post"]; // Use Australia Post as default
                    
                    if (!bestPackageOption || bestPackageOption.length === 0) {
                        throw new Error("Could not pack items for return shipping");
                    }

                    // Get merchant address
                    const firstProductLine = productLines[0];
                    const merchant = await context.dataSources.cosmos.get_record<vendor_type>("Main-Vendor", firstProductLine.merchantId, firstProductLine.merchantId);
                    const merchantLocation = merchant.locations?.[0];
                    if (!merchantLocation?.address) {
                        throw new Error("No merchant address found for return estimate");
                    }

                    // Convert packed boxes to ShipEngine packages format
                    const shipEnginePackages = bestPackageOption.map(box => ({
                        package_code: "package",
                        weight: {
                            value: box.used_weight,
                            unit: "kilogram"
                        },
                        dimensions: {
                            length: box.dimensions_cm.depth,
                            width: box.dimensions_cm.width,
                            height: box.dimensions_cm.height,
                            unit: "centimeter"
                        },
                        items: box.items.map(item => ({
                            description: item.name,
                            quantity: item.quantity,
                            value: {
                                amount: item.price.amount,
                                currency: item.price.currency
                            },
                            country_of_origin: item.country_of_origin,
                            country_of_manufacture: item.country_of_manufacture,
                            harmonized_tariff_code: item.harmonized_tariff_code.hsCode
                        }))
                    }));
                    
                    // Get shipping rates for return (from customer to merchant)
                    const rates = await context.dataSources.shipEngine.getEstimate(
                        {
                            from: {
                                name: `${customer.firstname} ${customer.lastname}` || "Customer",
                                phone: customerAddress.phoneNumber.raw,
                                company_name: "",
                                address_line1: customerAddress.address.components.line1,
                                address_line2: customerAddress.address.components.line2 || "",
                                city_locality: customerAddress.address.components.city,
                                state_province: customerAddress.address.components.state,
                                postal_code: customerAddress.address.components.postal_code,
                                country_code: customerAddress.address.components.country,
                                address_residential_indicator: "yes"
                            },
                            to: {
                                name: merchant.name,
                                phone: merchant.contact.public.phoneNumber.raw,
                                company_name: merchant.name,
                                address_line1: merchantLocation.address.components.line1,
                                address_line2: merchantLocation.address.components.line2 || "",
                                city_locality: merchantLocation.address.components.city,
                                state_province: merchantLocation.address.components.state,
                                postal_code: merchantLocation.address.components.postal_code,
                                country_code: merchantLocation.address.components.country,
                                address_residential_indicator: "no"
                            }
                        },
                        shipEnginePackages
                    );

                    if (rates.length === 0) {
                        throw new Error("No shipping rates available for return");
                    }

                    // Select cheapest rate
                    const selectedRate = rates.reduce((prev, current) => 
                        (prev.total_rate.amount < current.total_rate.amount) ? prev : current
                    );
                    // encode the cheapest rate to 
                    const fieldsToEncode = ['shipping_amount', 'insurance_amount', 'confirmation_amount', 'other_amount', 'tax_amount', 'total_rate'];
                    fieldsToEncode.forEach(field => {
                        selectedRate[field].amount = encodeAmountToSmallestUnit(selectedRate[field].amount, selectedRate[field].currency);
                        selectedRate[field].currency = selectedRate[field].currency.toUpperCase();
                    });

                    for (const rateDetail of selectedRate.rate_details) {
                        rateDetail.amount.amount = encodeAmountToSmallestUnit(rateDetail.amount.amount, rateDetail.amount.currency);
                        rateDetail.amount.currency = rateDetail.amount.currency.toUpperCase();
                    }

                    // Determine who pays for return shipping (use effectiveWhoPayShipping from product override or policy)
                    const whoPayShipping = (effectiveWhoPayShipping || refundReason.whoPayShipping).toLowerCase();

                    // Store return shipping estimate (not labels yet - those are generated after payment)
                    returnShippingEstimate = {
                        id: uuidv4(),
                        rate_id: selectedRate.rate_id,
                        whoPayShipping: whoPayShipping,
                        cost: selectedRate.total_rate,
                        boxes: bestPackageOption.map(box => ({
                            id: uuidv4(),
                            code: box.code,
                            dimensions_cm: box.dimensions_cm,
                            used_weight: box.used_weight,
                            items: box.items
                        })),
                        status: whoPayShipping === "customer" ? "pending_payment" : "ready_for_labels",
                        createdAt: DateTime.now().toISO()
                    };

                } catch (error) {
                    console.error("Failed to create return shipping estimate:", error);
                    // Continue without estimate - don't fail the entire refund request
                }
            }

            // Now create refund records per merchant with shipping estimate attached
            const linesByMerchant = groupBy(args.lines.filter(line => line.refund_quantity > 0), line => {
                const existingOrderLine = order.lines.find(x => x.id === line.id);
                return existingOrderLine?.merchantId || '';
            });

            for (const [merchantId, refundLines] of Object.entries(linesByMerchant)) {
                if (!merchantId) continue;

                // Check if any of these lines already have pending refund requests
                const hasExistingRequest = refundLines.some(line => {
                    const existingOrderLine = order.lines.find(x => x.id === line.id);
                    return existingOrderLine?.refund_request_log.some(x => x.status === "PENDING");
                });
                if (hasExistingRequest) continue;

                // Calculate total refund amount and build refund lines
                let totalRefundAmount = 0;
                const refundRequestLinesForMerchant: any[] = [];

                for (const line of refundLines) {
                    const existingOrderLine = order.lines.find(x => x.id === line.id);
                    if (!existingOrderLine) continue;

                    const linePrice = existingOrderLine.price_log
                        .filter(x => x.status === "SUCCESS" && x.type === "CHARGE")[0];
                    if (!linePrice) continue;

                    const lineRefundAmount = (linePrice.price.amount * line.refund_quantity) + 
                        (linePrice.tax ? linePrice.tax.amount * line.refund_quantity : 0);
                    totalRefundAmount += lineRefundAmount;

                    refundRequestLinesForMerchant.push({
                        id: existingOrderLine.id,
                        descriptor: existingOrderLine.descriptor,
                        price: {
                            amount: linePrice.price.amount,
                            currency: linePrice.price.currency
                        },
                        quantity: linePrice.price.quantity,
                        refund_quantity: line.refund_quantity,
                        refund_status: null
                    });
                }

                if (totalRefundAmount === 0) continue;

                // Generate unique refund ID
                const refundId = `${order.id}:refund:${uuidv4().substring(0, 8)}`;

                // Determine if this merchant has product lines that need return shipping
                const merchantHasProductLines = productLines.some(pl => pl.merchantId === merchantId);

                // Create setup intent for return shipping payment if needed
                let stripeDetails = null;
                if (merchantHasProductLines && returnShippingEstimate && returnShippingEstimate.cost.amount > 0) {
                    try {
                        // Determine who pays for shipping
                        const whoPayShipping = returnShippingEstimate.whoPayShipping;
                        let stripeCustomer: string | null = null;
                        
                        // Get the merchant record to access stripe details
                        const merchant = await context.dataSources.cosmos.get_record<vendor_type>("Main-Vendor", merchantId, merchantId);
                        
                        if (whoPayShipping === "merchant") {
                            stripeCustomer = merchant.stripe.customerId;
                        } else {
                            stripeCustomer = customer.stripe.customerId;
                        }

                        const setupIntentResponse = await context.dataSources.stripe.callApi("POST", "setup_intents", {
                            customer: stripeCustomer,
                            metadata: {
                                target: "RETURN_SHIPPING",
                                refundId: refundId,
                                orderId: order.id,
                                customerEmail: order.customerEmail,
                                merchantId: merchantId
                            }
                        });
                        
                        if (setupIntentResponse.status === 200) {
                            stripeDetails = {
                                setupIntentId: setupIntentResponse.data.id,
                                setupIntentSecret: setupIntentResponse.data.client_secret,
                                totalDue: returnShippingEstimate.cost
                            };
                        }
                    } catch (error) {
                        console.error("Failed to create setup intent for refund:", error);
                        // Continue without setup intent
                    }
                }

                const refundRecord: refund_record_type = {
                    id: refundId,
                    docType: "REFUND",
                    orderId: order.id,
                    userId: customer.id,
                    vendorId: merchantId,
                    amount: totalRefundAmount,
                    currency: refundRequestLinesForMerchant[0]?.price.currency || 'USD',
                    reason: refundReason?.title || "Refund requested",
                    status: "ACTIVE", // Record lifecycle status
                    refund_status: shouldAutoApprove ? "APPROVED" : "PENDING", // Refund workflow status
                    requestedAt: DateTime.now().toISO(),
                    decisionAt: shouldAutoApprove ? DateTime.now().toISO() : undefined,
                    decidedBy: shouldAutoApprove ? "SYSTEM" : undefined,
                    evidencePhotos: args.evidencePhotos,
                    evidenceVideos: args.evidenceVideos,
                    payments: {
                        provider: "Stripe",
                        refundRef: null
                    },
                    audit: [
                        {
                            at: DateTime.now().toISO(),
                            by: customer.id,
                            action: "requested"
                        }
                    ],
                    attachments: [],
                    lines: refundRequestLinesForMerchant,
                    returnShippingEstimate: merchantHasProductLines ? returnShippingEstimate : undefined,
                    stripe: stripeDetails,
                    createdDate: DateTime.now().toISO(),
                    createdBy: context.userId || "CUSTOMER"
                };

                // Add auto-approval audit entry if applicable
                if (shouldAutoApprove) {
                    refundRecord.audit.push({
                        at: DateTime.now().toISO(),
                        by: "SYSTEM",
                        action: "auto_approved"
                    });
                }

                // Create the refund record in Main-Orders container
                await context.dataSources.cosmos.add_record(
                    "Main-Orders", 
                    refundRecord, 
                    refundRecord.id, 
                    context.userId || "CUSTOMER"
                );
            }

            // Send notifications based on line types
            if (tourLines.length > 0) {
                // Handle tour refund notifications
                const firstTourLine = tourLines[0];
                const forObjectRef = firstTourLine.forObject as recordref_type;
                const tourResp = await context.dataSources.cosmos.get_record<tour_type>("Main-Listing", forObjectRef.id, forObjectRef.partition);
                const bookingResp = await context.dataSources.cosmos.get_record<booking_type>("Main-Bookings", firstTourLine.sessionRef.id, firstTourLine.sessionRef.partition);
        
                await context.dataSources.email.sendEmail(
                    sender_details.from,
                    order.customerEmail,
                    "TOUR_REFUND_REQUEST_MERCHANT",
                    {
                        tour: {
                            name: tourResp.name
                        },
                        tourBooking: {
                            code: bookingResp.code
                        }
                    }
                );
            }

            if (productLines.length > 0) {
                // Handle product refund notifications based on who pays for return shipping
                if (refundReason && !refundReason.no_refund && refundReason.whoPayShipping && refundReason.whoPayShipping.toLowerCase() === "merchant") {
                    const merchantId = productLines[0].merchantId;
                    const merchant = await context.dataSources.cosmos.get_record<vendor_type>("Main-Vendor", merchantId, merchantId);

                    // Send targeted email to merchant when they need to pay for return shipping
                    await context.dataSources.email.sendEmail(
                        sender_details.from,
                        merchant.contact.internal.email,
                        "PRODUCT_REFUND_REQUEST_REQUIRES_MERCHANT_PAYMENT",
                        {
                            order: {
                                code: order.code
                            },
                            products: productLines.map(line => ({
                                name: line.descriptor,
                                quantity: args.lines.find(al => al.id === line.id)?.refund_quantity || 0
                            }))
                        }
                    );
                } else {
                    // Only send email if customer doesn't need to pay for return label, or if payment isn't required
                    // If customer pays shipping and payment is pending, email will be sent after payment webhook
                    const shouldSendEmail = !returnShippingEstimate || returnShippingEstimate.status !== "pending_payment";

                    if (shouldSendEmail) {
                        // Default product refund request email for customer pays or no shipping required
                        await context.dataSources.email.sendEmail(
                            sender_details.from,
                            order.customerEmail,
                            "PRODUCT_REFUND_REQUEST_MERCHANT",
                            {
                                order: {
                                    code: order.code
                                },
                                products: productLines.map(line => ({
                                    name: line.descriptor,
                                    quantity: args.lines.find(al => al.id === line.id)?.refund_quantity || 0
                                }))
                            }
                        );
                    }
                }
            }

            if (caseInvoiceLines.length > 0) {
                // Handle case invoice refund notifications
                await context.dataSources.email.sendEmail(
                    sender_details.from,
                    order.customerEmail,
                    "CASE_REFUND_REQUEST_MERCHANT",
                    {
                        order: {
                            code: order.code
                        },
                        cases: caseInvoiceLines.map(line => ({
                            description: line.descriptor,
                            interactionId: line.interactionId
                        }))
                    }
                );
            }

            return {
                code: 200,
                message: `Request refund successfully created`,
                order: await context.dataSources.cosmos.get_record<order_type>("Main-Orders", args.orderRef.id, args.orderRef.id)
            }
        },
        cancel_request_refund: async (_: any, args: {
            orderRef: recordref_type,
            lines: {
                id: string,
                refund_quantity: number
            }[]
        }, context: serverContext) => {

            const order = await context.dataSources.cosmos.get_record<order_type>("Main-Orders", args.orderRef.id, args.orderRef.id)
            const patchOperations: PatchOperation[] = []

            let cancelRefundCreated = 0;

            for (var line of args.lines) {
                const existingOrderLine = order.lines.findIndex(x => x.id == line.id);
                if (existingOrderLine == -1) throw "Could not find the line on the order"

                const requestRefundIndex = order.lines[existingOrderLine].refund_request_log.findIndex(x => x.status == "PENDING")
                
                patchOperations.push(
                    { 
                        op: "set", 
                        value: "CANCELLED", 
                        path: `/lines/${existingOrderLine}/refund_request_log/${requestRefundIndex}/status`
                    }
                )

                cancelRefundCreated++;
            }

            await context.dataSources.cosmos.patch_record("Main-Orders", args.orderRef.id, args.orderRef.id, patchOperations, "CUSTOMER")

            return {
                code: 200,
                message: `Request refund successfully cancelled`,
                order: await context.dataSources.cosmos.get_record<order_type>("Main-Orders", args.orderRef.id, args.orderRef.id)
            }
        
        },
        reject_request_refund: async (_: any, args: {
            orderRef: recordref_type
        }, context: serverContext) => {

            const order = await context.dataSources.cosmos.get_record<order_type>("Main-Orders", args.orderRef.id, args.orderRef.id)
            let rejectCreated = 0;

            const patchOperations: PatchOperation[] = []

            for (var line of order.lines) {
                const existingOrderLine = order.lines.findIndex(x => x.id == line.id);
                const requestRefundIndex = order.lines[existingOrderLine].refund_request_log.findIndex(x => x.status == "PENDING")
                
                if (requestRefundIndex != -1) {
                    patchOperations.push(
                        { 
                            op: "set", 
                            value: "REJECTED", 
                            path: `/lines/${existingOrderLine}/refund_request_log/${requestRefundIndex}/status`
                        }
                    )
                }

                rejectCreated++;
            }

            if (rejectCreated) {
                await context.dataSources.cosmos.add_record("Main-Message", {
                    id: uuidv4(),
                    text: `Sorry the merchant can't grant this refund request.`,
                    topicRef: {
                        id: order.id,
                        partition: order.customerEmail,
                        container: "Main-Orders"
                    },
                    forObject: {
                        id: order.id,
                        partition: order.customerEmail,
                        container: "Main-Orders"
                    },
                    posted_by_system: true,
                    sentAt: DateTime.now().toISO()
                }, [order.id, order.customerEmail], context.userId)
            }

            await context.dataSources.cosmos.patch_record("Main-Orders", args.orderRef.id, args.orderRef.id, patchOperations, "CUSTOMER")

            const lines = order.lines[0] as orderLine_tourBooking_type
            const forObjectRef = lines.forObject as recordref_type
            const tourResp = await context.dataSources.cosmos.get_record<tour_type>("Main-Listing", forObjectRef.id, forObjectRef.partition)
            const bookingResp = await context.dataSources.cosmos.get_record<booking_type>("Main-Bookings", lines.sessionRef.id, lines.sessionRef.partition)

            await context.dataSources.email.sendEmail(
                sender_details.from,
                order.user.email,
                "TOUR_REFUND_REQUEST_REJECTED_CUSTOMER",
                {
                    tour: {
                        name: tourResp.name
                    },
                    tourBooking: {
                        code: bookingResp.code
                    }
                }                 
            )

            return {
                code: 200,
                message: `Request refund successfully rejected`,
                order: await context.dataSources.cosmos.get_record<order_type>("Main-Orders", args.orderRef.id, args.orderRef.id)
            }
        },
        refund_order: async (_: any, args: {
            orderRef: recordref_type,
            lines: {
                id: string,
                refund_quantity?: number,
                refund: currency_amount_type
            }[]
        }, context: serverContext) => {
            const userId = context.userId

            // Use shared refund processing utility
            const result = await process_refund(
                args.orderRef.id,
                args.lines,
                context.dataSources.cosmos,
                context.dataSources.stripe,
                userId
            );

            if (!result.success) {
                throw new Error(result.error || "Failed to process refund");
            }

            const order = await context.dataSources.cosmos.get_record<order_type>("Main-Orders", args.orderRef.id, args.orderRef.id)

            const customer = await context.dataSources.cosmos.run_query<user_type>("Main-User", {
                query: `SELECT VALUE c FROM c WHERE c.email = @email`,
                parameters: [{ name: "@email", value: order.customerEmail }]
            }, true)
            if (customer.length == 0) {
                throw new Error(`Customer with email ${order.customerEmail} not found`)
            }
            // real time message to update order
            context.signalR.addDataMessage("orders", { id: order.id, customerEmail: order.customerEmail }, { action: DataAction.UPSERT, group: `customer-${customer[0].id}` })

            return {
                code: 200,
                message: `Request refund successfully created`,
                order: await context.dataSources.cosmos.get_record<order_type>("Main-Orders", args.orderRef.id, args.orderRef.id)
            }
        },
        approve_request_refund: async (_: any, args: {
            orderRef: recordref_type
        }, context: serverContext) => {
            const order = await context.dataSources.cosmos.get_record<order_type>("Main-Orders", args.orderRef.id, args.orderRef.id);

            // Find active refund record for this order
            const refunds = await context.dataSources.cosmos.run_query<refund_record_type>("Main-Orders", {
                query: `
                    SELECT * FROM c 
                    WHERE c.docType = "REFUND" 
                    AND c.orderId = @orderId
                    AND c.status = "ACTIVE"
                    ORDER BY c.requestedAt DESC
                `,
                parameters: [
                    { name: "@orderId", value: args.orderRef.id }
                ]
            }, true);

            if (refunds.length === 0) {
                throw new Error("No active refund request found for this order");
            }

            const refund = refunds[0];

            // Update refund status to APPROVED
            await context.dataSources.cosmos.patch_record("Main-Orders", refund.id, refund.id, [
                {
                    op: "set",
                    path: "/refund_status",
                    value: "APPROVED"
                },
                {
                    op: "set", 
                    path: "/decisionAt",
                    value: DateTime.now().toISO()
                },
                {
                    op: "set",
                    path: "/decidedBy", 
                    value: context.userId
                }
            ], "REFUND");

            // Send a message to customer
            const messageId = uuidv4();
            const messagePartition = [order.customerEmail, order.id];
            const messageItem = {
                id: messageId,
                text: `Great news! Your refund request has been approved by the merchant.`,
                topicRef: {
                    id: order.id,
                    partition: order.customerEmail,
                    container: "Main-Orders"
                },
                forObject: {
                    id: order.id,
                    partition: order.customerEmail,
                    container: "Main-Orders"
                },
                posted_by_system: true,
                sentAt: DateTime.now().toISO()
            };

            await context.dataSources.cosmos.add_record("Main-Message", messageItem, messagePartition, context.userId);

            // Send SignalR message for real-time chat update
            const groupName = `chat-${order.id}-${order.customerEmail}-Main-Orders`;
            context.signalR.addDataMessage(
                "messages", 
                {
                    ref: {
                        id: messageId, 
                        partition: messagePartition, 
                        container: "Main-Message"
                    }
                }, 
                { 
                    action: DataAction.UPSERT,
                    group: groupName 
                });

            return {
                code: 200,
                message: `Refund request approved successfully`,
                order: await context.dataSources.cosmos.get_record<order_type>("Main-Orders", args.orderRef.id, args.orderRef.id)
            }
        },
        request_better_evidence: async (_: any, args: {
            orderRef: recordref_type,
            message: string
        }, context: serverContext) => {
            const order = await context.dataSources.cosmos.get_record<order_type>("Main-Orders", args.orderRef.id, args.orderRef.id);

            // Find active refund record for this order
            const refunds = await context.dataSources.cosmos.run_query<refund_record_type>("Main-Orders", {
                query: `
                    SELECT * FROM c 
                    WHERE c.docType = "REFUND" 
                    AND c.orderId = @orderId
                    AND c.status = "ACTIVE"
                    ORDER BY c.requestedAt DESC
                `,
                parameters: [
                    { name: "@orderId", value: args.orderRef.id }
                ]
            }, true);

            if (refunds.length === 0) {
                throw new Error("No active refund request found for this order");
            }

            const refund = refunds[0];

            // Update refund status to REQUIRES_INFO
            await context.dataSources.cosmos.patch_record("Main-Orders", refund.id, refund.id, [
                {
                    op: "set",
                    path: "/refund_status",
                    value: "REQUIRES_INFO"
                }
            ], "REFUND");

            // Send message to customer with merchant's request
            const messageId = uuidv4();
            const messagePartition = [order.customerEmail, order.id];
            const messageItem = {
                id: messageId,
                text: `The merchant needs better evidence for your refund request: ${args.message}`,
                topicRef: {
                    id: order.id,
                    partition: order.customerEmail,
                    container: "Main-Orders"
                },
                forObject: {
                    id: order.id,
                    partition: order.customerEmail,
                    container: "Main-Orders"
                },
                posted_by_system: true,
                sentAt: DateTime.now().toISO()
            };

            await context.dataSources.cosmos.add_record("Main-Message", messageItem, messagePartition, context.userId);

            // Send SignalR message for real-time chat update
            const groupName = `chat-${order.id}-${order.customerEmail}-Main-Orders`;
            context.signalR.addDataMessage(
                "messages", 
                {
                    ref: {
                        id: messageId, 
                        partition: messagePartition, 
                        container: "Main-Message"
                    }
                }, 
                { 
                    action: DataAction.UPSERT,
                    group: groupName 
                });

            return {
                code: 200,
                message: `Evidence request sent to customer`,
                order: await context.dataSources.cosmos.get_record<order_type>("Main-Orders", args.orderRef.id, args.orderRef.id)
            }
        },
        create_order_checkout_link: async (_: any, args: {
            merchantId: string;
            input: {
                customerEmail: string;
                lines: any[];
                target: string;
                expiresInHours?: number;
            };
        }, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            const { customerEmail, lines, target, expiresInHours } = args.input;

            // Validate that we have lines
            if (!lines || lines.length === 0) {
                throw new Error("At least one order line is required");
            }

            // Restore targets on lines
            await restore_target_on_lines_async(lines, context.dataSources.cosmos);

            // Get merchant to verify ownership and get slug
            const merchant = await context.dataSources.cosmos.get_record<vendor_type>("Main-Vendor", args.merchantId, args.merchantId);
            if (!merchant) {
                throw new Error("Merchant not found");
            }

            // Calculate order total using estimate_order
            const estimate = await estimate_order(lines, "USD", context);

            // Create pending order
            const orderId = uuidv4();
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + (expiresInHours || 24));

            const order = {
                ttl: Duration.fromObject({ days: 2 }).as("seconds"),
                id: orderId,
                orderId: orderId,
                docType: "ORDER",
                code: await generate_order_no(customerEmail, context.dataSources.cosmos),
                userId: null, // Will be set when customer pays
                customerEmail,
                target,
                status: "PENDING_PAYMENT",
                checkoutLinkExpiresAt: expiresAt.toISOString(),
                lines: lines.map((line: any) => {
                    return {
                        id: uuidv4(),
                        forObject: line.forObject,
                        variantId: line.variantId,
                        descriptor: line.descriptor,
                        merchantId: line.merchantId || args.merchantId,
                        price_log: [
                            {
                                type: "CHARGE",
                                price: line.price,
                                status: "pending"
                            }
                        ],
                        quantity: line.quantity || line.price.quantity
                    };
                }),
                createdDate: DateTime.now().toISO(),
                createdBy: context.userId
            };

            await context.dataSources.cosmos.add_record("Main-Orders", order, [orderId], context.userId);

            // Generate checkout URL
            const checkoutUrl = `${process.env.FRONTEND_URL}/m/${merchant.slug || args.merchantId}/checkout/${orderId}`;

            return {
                code: "200",
                success: true,
                message: "Checkout link created successfully",
                checkoutUrl,
                orderId,
                expiresAt: expiresAt.toISOString()
            };
        },
        create_pos_sale: async (_: any, args: {
            merchantId: string;
            input: {
                customerEmail?: string;
                lines: any[];
                paymentMethod: string;
                notes?: string;
            };
        }, context: serverContext) => {
            if (context.userId == null) throw new Error("User must be authenticated to create a POS sale");

            const { lines, paymentMethod, customerEmail, notes } = args.input;

            if (!lines || lines.length === 0) {
                throw new Error("At least one line item is required");
            }

            const validPaymentMethods = ["CASH", "EXTERNAL_TERMINAL"];
            if (!validPaymentMethods.includes(paymentMethod)) {
                throw new Error(`Invalid payment method. Must be one of: ${validPaymentMethods.join(", ")}`);
            }

            // Verify merchant exists
            const merchant = await context.dataSources.cosmos.get_record<vendor_type>("Main-Vendor", args.merchantId, args.merchantId);
            if (!merchant) {
                throw new Error("Merchant not found");
            }

            // Build order lines with price and target info
            const orderLines: any[] = lines.map((line: any) => {
                const quantity = line.quantity || 1;
                return {
                    id: uuidv4(),
                    forObject: line.forObject,
                    variantId: line.variantId,
                    descriptor: line.descriptor,
                    merchantId: line.merchantId || args.merchantId,
                    quantity,
                    price_log: [
                        {
                            id: uuidv4(),
                            datetime: DateTime.now().toISO(),
                            type: "CHARGE",
                            status: "SUCCESS",
                            price: {
                                ...line.price,
                                quantity
                            }
                        }
                    ],
                    paid_status_log: [
                        {
                            datetime: DateTime.now().toISO(),
                            status: "SUCCESS",
                            label: "POS_SALE",
                            triggeredBy: "MERCHANT"
                        }
                    ],
                    refund_request_log: [],
                    stripe: {},
                    target: line.target
                };
            });

            // Restore targets on lines (determines fee tier from listing type)
            await restore_target_on_lines_async(orderLines, context.dataSources.cosmos);

            // Calculate subtotal
            const subtotal = orderLines.reduce((sum, line) => {
                const price = line.price_log[0].price;
                return sum + (price.amount * price.quantity);
            }, 0);
            const currency = orderLines[0]?.price_log[0]?.price?.currency || merchant.currency || "USD";

            // Deduct inventory immediately (POS = already paid)
            await deduct_pos_inventory(orderLines, context.dataSources.cosmos, context.userId);

            // Build completed order
            const orderId = uuidv4();
            const order: any = {
                id: orderId,
                orderId,
                docType: "ORDER",
                code: await generate_order_no(customerEmail || `pos-${args.merchantId}`, context.dataSources.cosmos),
                userId: context.userId,
                customerEmail: customerEmail || null,
                target: "PRODUCT-PURCHASE",
                source: "POS",
                digitalOnly: false,
                lines: orderLines,
                payments: [
                    {
                        id: uuidv4(),
                        code: "POS",
                        method_description: paymentMethod === "CASH" ? "Cash" : "External Terminal",
                        date: DateTime.now().toISO(),
                        currency,
                        charge: {
                            subtotal,
                            tax: 0,
                            paid: subtotal
                        }
                    }
                ],
                credits: [],
                stripe: {},
                paid_status: "PAID",
                createdDate: DateTime.now().toISO(),
                createdBy: context.userId,
                ...(notes && { notes })
            };

            await context.dataSources.cosmos.add_record("Main-Orders", order, order.id, context.userId);

            return {
                code: "200",
                success: true,
                message: "POS sale recorded successfully",
                order: await context.dataSources.cosmos.get_record("Main-Orders", order.id, order.id)
            };
        }
    },
    Order: {
        ref: async (parent: any, _args: any, _context: serverContext, _info: any) => {
            return {
                id: parent.id, partition: [parent.id], container: "Main-Orders"
            }
        },
        customer: async (parent: any, _args: any, { dataSources: { cosmos }}: serverContext, _info: any) => {
            const customer = await cosmos.run_query("Main-User", {
                query: `SELECT VALUE c FROM c WHERE c.email = @email`,
                parameters: [{ name: "@email", value: parent.customerEmail }]
            }, true)
            if (customer.length == 0) return null;
            return customer[0]
        },
        delivery: async (parent: { delivery?: { addressId: string }}, _args: any, { dataSources: { cosmos }, userId}: serverContext, _info: any) => {
            if (isNullOrUndefined(parent.delivery)) return null;
            const addressId = parent.delivery.addressId
            if (isNullOrWhiteSpace(addressId)) return null;

            const addresses = await cosmos.run_query<address_type>("Main-User", {
                query: `
                    SELECT VALUE a
                    FROM c
                    JOIN a in c.addresses
                    WHERE a.id = @id and c.id = @userId
                `,
                parameters: [
                    { name: "@id", value: addressId },
                    { name: "@userId", value: userId }
                ]
            }, true)

            if (addresses.length == 0) {
                throw new Error(`Address with id ${addressId} not found`)
            }

            return {
                name: `${addresses[0].firstname} ${addresses[0].lastname}`,
                address: addresses[0].address.formattedAddress,
                addressComponents: addresses[0].address.components
            }
        },
        paid_status: (parent: order_type, _args: any, _: serverContext, _info: any) => {
            const lines_with_payment = parent.lines.filter(x => x.paid_status_log != undefined && x.paid_status_log.length > 0);
            
            if (lines_with_payment.length == 0) return "AWAITING_PAYMENT"
            if (lines_with_payment.some(x => x.paid_status_log[0].label == "AWAITING_PAYMENT")) {
                return "AWAITING_PAYMENT"
            }

            const refunded_lines = lines_with_payment.filter(x => x.price_log[0].type.includes("REFUND"))
            if (refunded_lines.length > 0) {
                if (refunded_lines.some(x => x.price_log[0].status == "PENDING")) {
                    return "AWAITING_REFUND"
                }

                if (refunded_lines.every(x => x.paid_status_log[0].label == "FULL_REFUND")) {
                    return "FULL_REFUND"
                } else {
                    return "PARTIAL_REFUND"
                }
            } else {
                return "PAID"
            }

        },
        paymentSummary: async (parent: order_type, _: any, { userId, dataSources }: serverContext) => {
            // get the users currency as the currency in focus
            const userResult = await dataSources.cosmos.get_scalar<{ currency: string }>("Main-User", "id", "currency", userId, userId);
            const currency_in_focus = userResult?.currency || "USD";

            // we will trim away the stuff we don't need
            return {
                currency: currency_in_focus,
                linesRequiringPayment: parent.lines.filter(x => x.paid_status_log.length == 0 || x.paid_status_log[0].label == "AWAITING_CHARGE"),
                payments: parent.payments.map(x => ({
                    currency: x.currency,
                    charge: x.charge,
                    payout: x.payout
                })),
                credits: parent.credits
            }
        }
    },
    OrderCharge: {
        fees: async (parent: any, _: any, __: serverContext) => {
            if (parent.fees !== undefined) return parent.fees;

            if (parent.additions == undefined) throw new Error("Additions are required to determine fees");
            var fees = parent.additions;
            delete fees.tax;
            return Object.values(fees).reduce((prev: number, curr: number) => prev + curr, 0); 
        },
        tax: async (parent: any, _: any, __: serverContext) => {
            if (parent.tax !== undefined) return parent.tax;
            if (parent.additions == undefined) throw new Error("Additions are required to determine tax");

            return parent.additions.tax;
        }
    },
    OrderPaymentSummary: {
        due: async (parent: { linesRequiringPayment: orderLine_type[] }, _: any, context: serverContext) => {
            if (parent.linesRequiringPayment.length == 0) return null;
            const userResult = await context.dataSources.cosmos.get_scalar<{ currency: string }>("Main-User", "id", "currency", context.userId, context.userId);
            const currency = userResult?.currency || "USD";
            const defaultAddress = await context.dataSources.cosmos.run_query<stripeplace_type>("Main-User", {
                query: `
                    SELECT VALUE a.address.components 
                    FROM c 
                    JOIN a on c.addresses
                    WHERE a.isDefault = true
                    AND c.id = @id
                `, parameters: [
                    { name: "@id", value: context.userId }
                ]
            }, true)
            if (defaultAddress.length == 0) {
                throw new Error("No default address found for user, unable to determine tax rate and what is due")
            }

            const estimate = await estimate_order(parent.linesRequiringPayment, currency, context);
            
            return estimate;
        },
        currency: (parent: { currency: string, payments: order_payment_type[] }, _: any, __: serverContext) => {
            if (!isNullOrWhiteSpace(parent.currency)) return parent.currency;
            if (parent.payments == undefined || parent.payments.length == 0) return "AUD";
            return parent.payments[0].currency; //TODO: Needs to be a much better way of doing this
        },
        charged: (parent: { currency: string, payments: order_payment_type[] }, _: any, __: serverContext) => {
            if (parent.payments == undefined || parent.payments.length == 0) return null;

            const result = parent.payments.reduce((prev, curr) => {
                const charge = curr.charge;

                // we need to compile the fees which will be
                // stripe estimate fees + application actual fees + shipping fees
                let fees = 0;
                if (charge.stripe && charge.stripe.estimate) {
                    fees += charge.stripe.estimate;
                }
                if (charge.application && charge.application.actual) {
                    fees += charge.application.actual;
                }
                if (charge.shipping && charge.shipping.estimate) {
                    fees += charge.shipping.estimate;
                }

                return {
                    subtotal: prev.subtotal + charge.subtotal,
                    fees: prev.fees + fees,
                    tax: prev.tax + charge.tax,
                    paid: prev.paid + charge.paid
                }
            }, {
                subtotal: 0,
                fees: 0,
                tax: 0,
                paid: 0
            });

            return result;
        },
        payout: async (parent: { currency: string, payments: order_payment_type[], credits: order_credit_type[] }, _: any, context: serverContext) => {
            if (parent.payments == undefined || parent.payments.length == 0) return null;

            // we need to find out the users currency
            const currency_in_focus = parent.currency;
            if (isNullOrWhiteSpace(currency_in_focus)) throw new Error("Currency is required to determine refund amount");

            // now we find the currencies of all the payouts
            const payment_currencies = groupBy(parent.payments, x => x.currency);
            const credit_currencies = groupBy(parent.credits, x => x.currency);
            const combined_currencies = [...new Set([...Object.keys(payment_currencies), ...Object.keys(credit_currencies)])];
            // okay now we need to work out if we need to convert
            const other_currencies = combined_currencies.filter(x => x != currency_in_focus);
            // then we need to find the exchange rates
            const exchange_rates = await context.dataSources.exchangeRate.getRates(currency_in_focus, other_currencies);
            
            // now we can calculate the payout
            const recieves = Object.keys(payment_currencies).reduce((prev, curr) => {
                const charges = payment_currencies[curr];
                const exchange_rate = curr == currency_in_focus ? 1 : exchange_rates[curr];
                const total = charges.reduce((prev, curr) => prev + curr.payout.summary.recieves, 0);
                return prev + (total * exchange_rate);
            }, 0);

            const refunded = Object.keys(credit_currencies).reduce((prev, curr) => {
                const charges = credit_currencies[curr];
                const exchange_rate = curr == currency_in_focus ? 1 : exchange_rates[curr];
                const total = charges.reduce((prev, curr) => prev + (curr.amount ?? 0), 0);
                return prev + (total * exchange_rate);
            }, 0);

            const subtotal = Object.keys(payment_currencies).reduce((prev, curr) => {
                const charges = payment_currencies[curr];
                const exchange_rate = curr == currency_in_focus ? 1 : exchange_rates[curr];
                const charge_subtotal = charges.reduce((prev, curr) => prev + curr.payout.customer_paid, 0);
                return prev + (charge_subtotal * exchange_rate);
            }, 0);

            // we work out the fees based on the recieves and subtotal
            // the fees we will also work out a tax assuming GST
            const difference = recieves - subtotal;
            // let Let F be the fees before GST:
            // F + 0.10F = 1.60
            const fees = Math.round(difference / 1.1);
            const tax = Math.round(difference - fees);

            const result = {
                subtotal,
                fees,
                tax,
                recieves,
                refunded
            }

            return result;
        }
    },
    Refund: {
        refund_status: (parent: any) => parent.refund_status,
        status: (parent: any) => parent.status,
        order: async (parent: any, _: any, context: serverContext) => {
            if (parent.order) {
                return parent.order; // Already populated
            }
            
            // If not populated, fetch the order
            const order = await context.dataSources.cosmos.get_record<order_type>("Main-Orders", parent.orderId, parent.orderId);
            return {
                id: order.id,
                code: order.code,
                customerEmail: order.customerEmail,
                createdDate: order.createdDate
            };
        }
    },
    RefundRequestLine: {
        refund_status: async (parent: any, _: any, ___: serverContext) => {
            if (parent.price_log == undefined || parent.price_log.length == 0) return null;
            const price_log_has_refund = parent.price_log.some(x => x.type.includes("REFUND"))
            const amount = parent.price_log
                .filter(x => x.status !== "failed")
                .reduce((prev, curr) => prev + curr.price.quantity, 0)
            if (amount == 0 && price_log_has_refund) return "FULL"
            else if (price_log_has_refund) return "PARTIAL"
            else if (parent.request_refund_log != null && parent.request_refund_log.length > 0 && parent.request_refund_log[0].status == "REJECTED") {
                return "REJECTED";
            }
            else return null;
        }
    },
    OrderLine: {
        merchant: async (parent: orderLine_type, _: any, { dataSources: { cosmos } }: serverContext) => {
            return cosmos.get_record<vendor_type>("Main-Vendor", parent.merchantId, parent.merchantId)
        },
        image: async(parent: any, _: any, { dataSources: { cosmos } }: serverContext) => {
            if (isNullOrUndefined(parent.forObject)) return null;
            if (parent.forObject === "inherit") return null;
            const forObjectRef = parent.forObject as recordref_type

            const listingQuery = await cosmos.run_query<{
                thumbnail_image: media_type,
                variant_id: string,
                variant_image: media_type,
            }>(
                "Main-Listing",
                {
                    query: `
                        SELECT
                            c.thumbnail.image as thumbnail_image,
                            v.id as variant_id,
                            v.images[0] as variant_image
                        FROM c
                        JOIN v in c.variants
                        WHERE c.id = @id AND c.vendorId = @vendorId
                    `,
                    parameters: [
                        { name: "@id", value: forObjectRef.id },
                        { name: "@vendorId", value: forObjectRef.partition[0] }
                    ]
                }, true
            )

            if (listingQuery.length == 0) return null;
            const thumbnail_image = listingQuery[0].thumbnail_image;

            // now we need to know if we're dealing with a variant or a listing
            if (!isNullOrWhiteSpace(parent.variantId)) {
                var variant = listingQuery.find(x => x.variant_id == parent.variantId);
                if (variant) return variant.variant_image;
                else return thumbnail_image;
            } else {
                return thumbnail_image;
            }
        },
        refund_status: async (parent: any, _: any, ___: serverContext) => {
            if (parent.price_log == undefined || parent.price_log.length == 0) return null;
            const price_log_has_refund = parent.price_log.some(x => x.type.includes("REFUND"))
            const amount = parent.price_log
                .filter(x => x.status !== "failed")
                .reduce((prev, curr) => prev + curr.price.quantity, 0)
            if (amount == 0 && price_log_has_refund) return "FULL"
            else if (price_log_has_refund) return "PARTIAL"
            else if (parent.request_refund_log != null && parent.request_refund_log.length > 0 && parent.request_refund_log[0].status == "REJECTED") {
                return "REJECTED";
            }
            else return null;
        },
        // productRef: async (parent: any, _args: any, _context: serverContext, _info: any) => {
        //     return {
        //         id: parent.id, partition: [parent.id], container: "Main-Orders"
        //     }
        // },
        // listing: async (parent: any, _args: any, _context: serverContext, _info: any) => {
        //     if (parent.productRef.container == "Main-Tickets") {
        //         return await _context.dataSources.cosmos.get_record("Main-Tickets", parent.productRef.id, parent.productRef.partition);
        //     } else if (parent.productRef.container == "Main-Tickets") {
        //         throw new Error("Not implemented"); 
        //     } else if (parent.productRef.container == "Main-Listing") {
        //         return await _context.dataSources.cosmos.get_record("Main-Listing", parent.productRef.id, parent.productRef.partition);
        //     } else {
        //         throw new Error("Unknown product ref type");
        //     }
        // },
        // ticket: async (parent: any, _args: any, _context: serverContext, _info: any) => {
        //     if (parent.productRef.container == "Main-Tickets") {
        //         return await _context.dataSources.cosmos.get_record("Main-Tickets", parent.productRef.id, parent.productRef.partition);
        //     } else {
        //         return null;
        //     }
        // },
        price: async (parent: any, _: any, ___: serverContext) => {
            if (parent.price_log == undefined || parent.price_log.length == 0) return null;
            const amount = parent.price_log
                .filter(x => x.status !== "failed" && x.type == "CHARGE")
                .reduce((prev, curr) => prev + curr.price.amount, 0)
            return {
                amount,
                currency: parent.price_log[0].price.currency
            }
        },
        quantity: async (parent: any, _: any, ___: serverContext) => {
            if (parent.price_log == undefined || parent.price_log.length == 0) return null;
            const amount = parent.price_log
                .filter(x => x.status !== "failed" && x.type == "CHARGE")
                .reduce((prev, curr) => prev + curr.price.quantity, 0)
            return amount
        },
        subtotal: async (parent: any, _: any, ___: serverContext) => {
            if (parent.price_log == undefined || parent.price_log.length == 0) return null;
            const amount = parent.price_log
                .filter(x => x.status !== "failed" && x.type == "CHARGE")
                .reduce((prev, curr) => prev + (curr.price.amount * curr.price.quantity), 0)
            return {
                amount,
                currency: parent.price_log[0].price.currency
            }
        },
        tax: async (parent: any, _: any, ___: serverContext) => {
            if (parent.price_log == undefined || parent.price_log.length == 0) return null;
            const amount = parent.price_log
                .filter(x => x.status !== "failed" && x.type == "CHARGE")
                .reduce((prev, curr) => prev + curr.tax.amount, 0)
            return {
                amount,
                currency: parent.price_log[0].price.currency
            }
        },
        total: async (parent: any, _: any, ___: serverContext) => {
            if (parent.price_log == undefined || parent.price_log.length == 0) return null;
            const amount = parent.price_log
                .filter(x => x.status !== "failed" && x.type == "CHARGE")
                .reduce((prev, curr) => prev + (curr.price.amount * curr.price.quantity) + curr.tax.amount, 0)
            return {
                amount,
                currency: parent.price_log[0].price.currency
            }
        },
        refunded: async (parent: any, _: any, ___: serverContext) => {
            if (parent.price_log == undefined || parent.price_log.length == 0) return null;
            const amount = parent.price_log
                .filter(x => x.status !== "failed" && x.type.includes("REFUND"))
                .reduce((prev, curr) => prev + ((curr.price.amount * (curr.price.quantity * -1)) + curr.tax.amount), 0)
            return {
                amount: amount,
                currency: parent.price_log[0].price.currency
            }
        },
        item_description: async (parent: orderLine_type, _: any, _context: serverContext) => {
            if (parent.forObject === "inherit") {
                throw new Error("A For Object for a sale line must be restored for an order line with an inherit value to work out its description.")
            }
            const listing = await _context.dataSources.cosmos.get_record<any>("Main-Listing", parent.forObject.id, parent.forObject.partition[0])
            if (!isNullOrWhiteSpace(parent.variantId)) {
                const variant : variant_type = listing.variants.find(x => x.id == parent.variantId)
                return `${variant.code} ${listing.name} - ${variant.name}`
            } else {
                return listing.name
            }
        },
        soldFrom: async (parent: any, _: any, {dataSources: { cosmos }}: serverContext) => {
            if (parent.forObject === "inherit") {
                throw new Error("A For Object for a sale line must be restored for an order line with an inherit value to work out its description.")
            }
            const resp = await cosmos.get_scalar<{
                soldFromLocationId: string
            }>("Main-Listing", "vendorId", "soldFromLocationId", parent.forObject.id, parent.forObject.partition[0])

            if (isNullOrUndefined(resp) || isNullOrWhiteSpace(resp.soldFromLocationId)) return null;

            const merchantLocations = await cosmos.get_scalar<{
                locations: merchantLocation_type[]
            }>("Main-Vendor", "id", "locations", parent.merchantId, parent.forObject.partition[0])

            const location = merchantLocations.locations.find(x => x.id == resp.soldFromLocationId)
            if (isNullOrUndefined(location)) {
                throw `Could not find location with id ${resp.soldFromLocationId} for merchant ${parent.merchantId}`
            }

            return {
                state: location.address.components.state,
                country: location.address.components.country
            }
        },
        description: async (parent: any, _: any, _context: serverContext) => {
            const { target, ...order } = parent

            if (!isNullOrWhiteSpace(parent.description)) return parent.description

            var description = ""; 

            switch (target) {
                case "CASE-INTERACTION" :
                    description = `A fee of ${order.sale_price.amount} has been requested from the customer.`
                    break
                default:
                    description = `No message template for ${target}`;
                    break
            }

            return description
        },
        lineRules: async (parent: orderLine_type, _: any, { dataSources: { cosmos } }: serverContext) => {
            try {
                // Only get rules for product lines
                if (!parent.forObject || parent.forObject === "inherit") {
                    return { noRefunds: false, refundRules: null };
                }

                const forObjectRef = parent.forObject as recordref_type;
                const listing = await cosmos.get_record<any>("Main-Listing", forObjectRef.id, forObjectRef.partition[0]);

                if (!listing || listing.type !== "PRODUCT") {
                    return { noRefunds: false, refundRules: null };
                }

                const product = await cosmos.get_record<any>("Main-Product", listing.forObject.id, listing.forObject.partition[0]);

                if (!product) {
                    return { noRefunds: false, refundRules: null };
                }

                return {
                    noRefunds: product.noRefunds || false,
                    refundRules: product.refundRules || null
                };
            } catch (error) {
                console.warn(`Failed to get line rules for order line ${parent.id}:`, error);
                return { noRefunds: false, refundRules: null };
            }
        }
    }
}

const generate_order_no = async (customerEmail: string, cosmosClient: serverContext["dataSources"]["cosmos"]) => {
    const existingOrderNos = await cosmosClient.run_query("Main-Orders", {
        query: `SELECT VALUE c.order_no FROM c WHERE c.customerEmail = @customerEmail`,
        parameters: [{name: "@customerEmail", value: customerEmail}]
    }, true)

    var order_no = "";
    var maxDigits = 24;
    var attempts = 0;
    var maxAttempts = 500;

    while (isNullOrWhiteSpace(order_no) || existingOrderNos.includes(order_no) && attempts < maxAttempts) {
        order_no = generate_human_friendly_id("ORD", maxDigits);
        maxDigits += 1; // opens the search space to wider for the uniqueness
        attempts++;
    }

    if (attempts == maxAttempts) {
        return uuidv4()
    }

    return order_no;
}

const estimate_order = async (
    lines: orderLine_type[],
    customerCurrency: string,
    { dataSources: { cosmos, exchangeRate }} : serverContext) => {
        const user_currency = customerCurrency
            
        if (lines.length === 0) {
            return {
                quantity: 0,
                subtotal: { amount: 0, currency: user_currency },
                fees: { amount: 0, currency: user_currency },
                tax: { amount: 0, currency: user_currency },
                discount: { amount: 0, currency: user_currency },
                total: { amount: 0, currency: user_currency }
            }
        }
        
        // group by merchantId then reduce by running derive fees
        
        const feePromises = Object.entries(groupBy(lines, x => x.merchantId))
            .map(async ([merchantId, lines]) => {
                const vendorResult = await cosmos.get_scalar<{
                    currency: string,
                    accountId: string
                }>("Main-Vendor", "id", ["currency", "stripe.accountId"], merchantId, merchantId)

                // Handle case where vendor doesn't have currency set - default to USD
                const merchant_currency = vendorResult?.currency || "USD";
                const merchant_accountId = vendorResult?.accountId;
                
                // work out the fees
                const merchantFees = await deriveFees(merchantId, lines, cosmos);

                let conversion_rate = 1; // assume the same currency
                if (merchant_currency != user_currency) {
                    // we need to convert the fees to the user currency
                    conversion_rate = await exchangeRate.getRate(merchant_currency, user_currency);
                    // convert the fees to the user currency
                    merchantFees.customer.charge *= conversion_rate;
                    // convert the line prices to the user currency
                    for (let line of lines) {
                        const conversion_rate = await exchangeRate.getRate(merchant_currency, user_currency);
                        line.price.amount *= conversion_rate;
                    }
                }

                const summary = {
                    quantity: lines.reduce((prev, curr) => prev + curr.quantity, 0),
                    subtotal: { amount: lines.reduce((prev, curr) => prev + curr.price.amount * curr.quantity, 0), currency: user_currency }
                }

                const result = {
                    ...summary,
                    discount: { amount: 0, currency: user_currency }, // Assuming discount is not calculated here
                    fees: { amount: merchantFees.customer.fees, currency: user_currency },
                    total: { amount: merchantFees.customer.charge, currency: user_currency }
                }

                return result
            });

        const feeResults = await Promise.all(feePromises);
        
        const aggregateResult =  feeResults.reduce((prev, curr) => {
            const result = {
                quantity: prev.quantity + curr.quantity,
                subtotal: { amount: prev.subtotal.amount + curr.subtotal.amount, currency: user_currency },
                fees: { amount: prev.fees.amount + curr.fees.amount, currency: user_currency },
                discount: { amount: prev.discount.amount + curr.discount.amount, currency: user_currency },
                total: { amount: prev.total.amount + curr.total.amount, currency: user_currency }
            }
            return result;
        }, {
            quantity: 0,
            subtotal: { amount: 0, currency: user_currency },
            fees: { amount: 0, currency: user_currency },
            discount: { amount: 0, currency: user_currency },
            total: { amount: 0, currency: user_currency }
        });

        return aggregateResult;
}

export const restore_price_on_line = (line: orderLine_type) => {
    if (!isNullOrUndefined(line.price)) return; // price is already restored

    // we aggregate the price log
    const total = line.price_log.reduce((prev, curr) => {
        return prev + (curr.price.amount * curr.price.quantity)
    }, 0)

    const quantity = line.price_log.reduce((prev, curr) => {
        return prev + curr.price.quantity
    }, 0)

    line.price = {
        amount: total / quantity,
        currency: line.price_log[0].price.currency
    }

    line.quantity = quantity
}

export const restore_price_on_lines = (lines: orderLine_type[]) => {
    if (lines.length === 0) return; // no lines to restore
    // we restore the price on each line
    if (lines.some(line => isNullOrUndefined(line.price_log) || line.price_log.length === 0)) {
        throw new Error("Price log is not available on all lines, cannot restore price");
    }

    lines.forEach(line => {
        restore_price_on_line(line);
    });
}

export const restore_target_on_line = async (line: orderLine_type, cosmosClient: serverContext["dataSources"]["cosmos"]) => {
    if (!isNullOrUndefined(line.target)) return; // target is already restored
    if (line.merchantId === "SPIRIVERSE") return "NO-FEES"
    
    // if the line is set to inherit, we throw an error as this needs to be restored first
    if (line.forObject == "inherit") {
        throw new Error("For object is not restored on the line")
    }

    // if a line does not have a price mandate that the price needs to be restored as a prerequisite
    if (isNullOrUndefined(line.price)) {
        throw new Error("Price is not restored on the line, please restore the price first")
    }

    // fetch the listing from the db - use get_scalar_required since listing MUST exist
    const listingId = line.forObject.id;
    const vendorId = line.forObject.partition[0];

    if (!listingId || !vendorId) {
        throw new Error(`Invalid forObject: id=${listingId}, partition=${JSON.stringify(line.forObject.partition)}`);
    }

    const { type: listing_type } = await cosmosClient.get_scalar_required<{ type: string }>(
        "Main-Listing", "vendorId", "type", listingId, vendorId, `Listing (id=${listingId}, vendorId=${vendorId})`
    )

    if (listing_type === "PRODUCT") {
        line.target = "PRODUCT-PURCHASE-0"

        // we need to calculate the total cost of the line
        const total_cost = line.price.amount * line.quantity

        if (total_cost >= 5000) {
            line.target = "PRODUCT-PURCHASE-50"
        } else if (total_cost >= 50000) {
            line.target = "PRODUCT-PURCHASE-500"
        }
    } else if (listing_type === "SERVICE") {
        line.target = "SERVICE-PURCHASE"
    } else {
        throw new Error(`Listing type ${listing_type} is not supported`)
    }
}

export const restore_target_on_lines_async = async (lines: orderLine_type[], cosmosClient: serverContext["dataSources"]["cosmos"]) => {
    await Promise.all(lines.map(line => restore_target_on_line(line, cosmosClient)));
}

// Deduct inventory immediately for POS sales (payment already collected)
const deduct_pos_inventory = async (
    lines: orderLine_type[],
    cosmos: serverContext["dataSources"]["cosmos"],
    userId: string
): Promise<void> => {
    const containerName = "Main-Listing";
    const now = new Date().toISOString();

    for (const line of lines) {
        if (!line.variantId || !line.merchantId) continue;

        const variantInventoryId = `invv:${line.variantId}`;
        let inventory: variant_inventory_type;
        try {
            inventory = await cosmos.get_record<variant_inventory_type>(
                containerName, variantInventoryId, line.merchantId
            );
        } catch {
            // No inventory record = inventory not tracked for this variant
            continue;
        }

        if (!inventory || !inventory.track_inventory) continue;

        const quantity = line.price_log?.[0]?.price?.quantity || line.quantity || 1;

        if (inventory.qty_on_hand < quantity) {
            throw new Error(`Insufficient stock for "${line.descriptor}". Available: ${inventory.qty_on_hand}, Requested: ${quantity}`);
        }

        const newQtyOnHand = inventory.qty_on_hand - quantity;

        await cosmos.patch_record(containerName, variantInventoryId, line.merchantId, [
            { op: "set", path: "/qty_on_hand", value: newQtyOnHand },
            { op: "set", path: "/updated_at", value: now }
        ], userId);

        // Create transaction record
        const transactionId = `invt:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await cosmos.add_record(containerName, {
            id: transactionId,
            docType: "transaction",
            vendorId: line.merchantId,
            product_id: inventory.product_id,
            variant_id: line.variantId,
            delta: -quantity,
            qty_before: inventory.qty_on_hand,
            qty_after: newQtyOnHand,
            reason: "POS_SALE",
            source: "POS",
            reference_id: line.id,
            notes: `POS sale: ${quantity} unit(s)`,
            created_at: now,
            created_by: userId
        }, line.merchantId, userId);
    }
};

// Commit inventory quantities when order is placed
// Returns patch operations to mark order lines as backordered if applicable
const commit_orderline_quantities = async (
    lines: orderLine_type[],
    cosmos: serverContext["dataSources"]["cosmos"],
    userId: string
): Promise<PatchOperation[]> => {
    const containerName = "Main-Listing";
    const now = new Date().toISOString();
    const backorderPatches: PatchOperation[] = [];
    const vendorCache = new Map<string, vendor_type>();

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        if (!line.variantId || !line.merchantId) continue;

        try {
            const variantInventoryId = `invv:${line.variantId}`;

            let currentInventory: variant_inventory_type;
            try {
                currentInventory = await cosmos.get_record<variant_inventory_type>(
                    containerName,
                    variantInventoryId,
                    line.merchantId
                );
            } catch (error) {
                throw new Error(`Inventory record missing for variant ${line.variantId}. Please recreate the product to restore inventory tracking.`);
            }

            if (currentInventory && currentInventory.track_inventory) {
                const quantity = line.price_log
                    .filter(log => log.type === "CHARGE" && log.status !== "failed")
                    .reduce((acc, log) => acc + log.price.quantity, 0);

                // Check if we have enough available inventory
                const qtyAvailable = currentInventory.qty_on_hand - currentInventory.qty_committed;
                let isBackordered = false;

                if (qtyAvailable < quantity) {
                    // Check if backorders are allowed
                    if (currentInventory.allow_backorder) {
                        // Verify vendor's tier supports backorders
                        if (line.merchantId) {
                            if (!vendorCache.has(line.merchantId)) {
                                const v = await cosmos.get_record<vendor_type>("Main-Vendor", line.merchantId, line.merchantId);
                                vendorCache.set(line.merchantId, v);
                            }
                            const vendor = vendorCache.get(line.merchantId)!;
                            if (vendor?.subscription?.subscriptionTier) {
                                const tierFeatures = getTierFeatures(vendor.subscription.subscriptionTier as subscription_tier);
                                if (!tierFeatures.hasBackorders) {
                                    throw new Error(`Backorders require the Transcend plan. Vendor ${line.merchantId} is on ${vendor.subscription.subscriptionTier}.`);
                                }
                            }
                        }
                        const shortfall = quantity - qtyAvailable;
                        const currentBackorders = Math.abs(Math.min(0, currentInventory.qty_on_hand));
                        const maxBackorders = currentInventory.max_backorders || 0;

                        // Check if we're within backorder limit
                        if (currentBackorders + shortfall > maxBackorders) {
                            throw new Error(`Backorder limit exceeded for variant ${line.variantId}. Current: ${currentBackorders}, Limit: ${maxBackorders}, Requested: ${shortfall}`);
                        }

                        isBackordered = true;
                    } else {
                        throw new Error(`Insufficient inventory for variant ${line.variantId}. Available: ${qtyAvailable}, Requested: ${quantity}`);
                    }
                }

                // Update qty_committed
                const newQtyCommitted = currentInventory.qty_committed + quantity;
                await cosmos.patch_record(containerName, variantInventoryId, line.merchantId, [
                    { op: "set", path: '/qty_committed', value: newQtyCommitted },
                    { op: "set", path: '/updated_at', value: now }
                ], userId);

                // Create transaction record
                const transactionId = `invt:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const transaction = {
                    id: transactionId,
                    docType: "transaction",
                    vendorId: line.merchantId,
                    product_id: currentInventory.product_id,
                    variant_id: line.variantId,
                    delta: 0, // No physical change, just commitment
                    qty_before: currentInventory.qty_committed,
                    qty_after: newQtyCommitted,
                    reason: "COMMITMENT",
                    source: "ORDER",
                    reference_id: line.id,
                    notes: isBackordered
                        ? `Committed ${quantity} units (BACKORDERED - ${qtyAvailable < 0 ? 0 : qtyAvailable} in stock)`
                        : `Committed ${quantity} units for order line`,
                    created_at: now,
                    created_by: userId
                };

                await cosmos.add_record(containerName, transaction, line.merchantId, userId);

                // Mark line as backordered if applicable
                if (isBackordered) {
                    backorderPatches.push(
                        { op: "set", path: `/lines/${lineIndex}/inventory_status`, value: "BACKORDERED" },
                        { op: "set", path: `/lines/${lineIndex}/backordered_at`, value: now }
                    );
                } else {
                    backorderPatches.push(
                        { op: "set", path: `/lines/${lineIndex}/inventory_status`, value: "IN_STOCK" }
                    );
                }
            }
        } catch (error) {
            console.error(`Failed to commit inventory for variant ${line.variantId}:`, error);
            throw error;
        }
    }

    return backorderPatches;
}

export {resolvers, generate_order_no}
import Stripe from "stripe";
import { v4 as uuid } from "uuid"
import { PatchOperation } from "@azure/cosmos";
import { DateTime, Duration } from "luxon";
import { StripeHandler } from "../0_dependencies";
import { sender_details } from "../../../client/email_templates";
import { deriveFees } from "../../../graphql/0_shared";
import { recordref_type } from "../../../graphql/0_shared/types";
import { case_business_logic } from "../../../graphql/case";
import { case_type, caseOffer_type } from "../../../graphql/case/types";
import { booking_type, session_type } from "../../../graphql/eventandtour/types";
import { restore_price_on_lines, restore_target_on_lines_async } from "../../../graphql/order";
import { order_type, orderLine_type, orderLine_tourBooking_type, orderLine_servicePurchase_type } from "../../../graphql/order/types";
import { merchants_users } from "../../../graphql/vendor";
import { vendor_type } from "../../../graphql/vendor/types";
import { featuring_source_type } from "../../../graphql/featuring/types";
import { DataAction } from "../../../services/signalR";
import { isNullOrWhiteSpace, generate_human_friendly_id, forceFloat } from "../../../utils/functions";
import { generate_shipment_summary } from "./generate_shipment_summary";
import { variant_inventory_type } from "../../../graphql/product/types";
import { serviceBooking_type } from "../../../graphql/service/types";
import { user_type } from "../../../graphql/user/types";
import { paymentLink_type } from "../../../graphql/paymentLink/types";
import { renderEmailTemplate } from "../../../graphql/email/utils";
import {
    EXPO_MODE_CONTAINER, DOC_TYPE_EXPO_SALE,
    expoSale_type, expoItem_type, expo_type, ExpoSaleStatus
} from "../../../graphql/expoMode/types";

// ─── Payment Link post-payment handler ──────────────────────────

async function handlePaymentLinkPayment(
    paymentIntent: Stripe.PaymentIntent,
    metadata: { paymentLinkId?: string; vendorBreakdown?: string },
    logger: any,
    services: any
) {
    const { stripe, cosmos, email } = services;
    const linkId = metadata.paymentLinkId!;

    // 1. Fetch the payment link (cross-partition query since we don't know createdBy)
    const results = await cosmos.run_query("Main-PaymentLinks", {
        query: "SELECT * FROM c WHERE c.id = @id",
        parameters: [{ name: "@id", value: linkId }],
    }, true);

    if (results.length === 0) {
        throw new Error(`Payment link ${linkId} not found`);
    }

    const link = results[0];
    const now = DateTime.now().toISO();

    // 2. Update link status to PAID
    await cosmos.patch_record("Main-PaymentLinks", link.id, link.createdBy, [
        { op: "set", path: "/linkStatus", value: "PAID" },
        { op: "set", path: "/paidAt", value: now },
    ], "STRIPE");

    logger.logMessage(`Payment link ${linkId} marked as PAID`);

    // 3. Split funds via Stripe Transfers to each vendor's connected account
    const vendorBreakdown: Record<string, number> = metadata.vendorBreakdown
        ? JSON.parse(metadata.vendorBreakdown)
        : {};

    const bookingIds: string[] = [];

    for (const [vendorId, vendorAmount] of Object.entries(vendorBreakdown)) {
        const vendor = await cosmos.get_record("Main-Vendor", vendorId, vendorId) as vendor_type | null;
        if (!vendor?.stripe?.accountId) {
            logger.logMessage(`Vendor ${vendorId} has no Stripe account — skipping transfer`);
            continue;
        }

        try {
            // Transfer vendor's share (platform keeps the remainder as fee)
            // For MVP, transfer full amount to vendor; platform fee can be deducted later
            await stripe.callApi("POST", "transfers", {
                amount: vendorAmount,
                currency: link.totalAmount.currency.toLowerCase(),
                destination: vendor.stripe.accountId,
                transfer_group: `payment_link_${linkId}`,
                metadata: {
                    type: "PAYMENT_LINK",
                    paymentLinkId: linkId,
                    vendorId,
                },
            });
            logger.logMessage(`Transfer of ${vendorAmount} ${link.totalAmount.currency} created to vendor ${vendorId}`);
        } catch (transferError: any) {
            logger.logMessage(`Failed to create transfer to vendor ${vendorId}: ${transferError.message}`);
        }
    }

    // 4. For SERVICE items, create service bookings
    const serviceItems = link.items.filter(i => i.itemType === "SERVICE" && i.sourceId);
    for (const item of serviceItems) {
        try {
            const serviceOrderId = uuid();
            const service = await cosmos.get_record("Main-Listing", item.sourceId!, item.vendorId);

            const serviceOrder: any = {
                id: serviceOrderId,
                type: "SERVICE",
                customerEmail: link.customerEmail,
                userId: link.customerEmail,
                vendorId: item.vendorId,
                purchaseDate: now,
                listingId: item.sourceId,
                ref: {
                    id: item.sourceId,
                    container: "Main-Listing",
                    partition: [item.vendorId],
                },
                service: service,
                price: item.amount,
                stripe: {
                    paymentIntent: { id: paymentIntent.id },
                },
                orderStatus: "PAID",
                questionnaireResponses: [],
                source: "PAYMENT_LINK",
                paymentLinkId: linkId,
            };

            const partition = ["SERVICE", link.customerEmail];
            await cosmos.add_record("Main-Bookings", serviceOrder, partition, "system");
            bookingIds.push(serviceOrderId);
            logger.logMessage(`Service booking ${serviceOrderId} created from payment link for service ${item.sourceId}`);
        } catch (serviceError: any) {
            logger.logMessage(`Failed to create service booking for item ${item.id}: ${serviceError.message}`);
        }
    }

    // Store booking IDs on the payment link
    if (bookingIds.length > 0) {
        await cosmos.patch_record("Main-PaymentLinks", link.id, link.createdBy, [
            { op: "set", path: "/bookingIds", value: bookingIds },
        ], "STRIPE");
    }

    // 5. Send confirmation emails
    const description = link.items.map((i: any) => {
        if (i.itemType === "CUSTOM") return i.customDescription || "Custom item";
        return i.sourceName || i.customDescription || i.itemType;
    }).join(", ");

    const amountDisplay = `$${(link.totalAmount.amount / 100).toFixed(2)} ${link.totalAmount.currency.toUpperCase()}`;

    // Customer confirmation
    try {
        const customerEmail = await renderEmailTemplate({ cosmos } as any, "payment-link-paid-customer", {
            "vendor.name": link.items[0].vendorName,
            "customer.name": link.customerName ? ` ${link.customerName}` : "",
            "payment.amount": amountDisplay,
            "payment.description": description,
        });
        if (customerEmail) {
            await email.sendRawHtmlEmail(
                sender_details.from,
                link.customerEmail,
                customerEmail.subject,
                customerEmail.html
            );
        }
    } catch (err) {
        logger.logMessage(`Failed to send customer confirmation email: ${(err as any).message}`);
    }

    // Vendor notification(s) — one per unique vendor
    const uniqueVendorIds = [...new Set(link.items.map(i => i.vendorId))];
    for (const vendorId of uniqueVendorIds) {
        try {
            const vendor = await cosmos.get_record("Main-Vendor", vendorId, vendorId) as vendor_type | null;
            const vendorEmail = vendor?.contact?.internal?.email;
            if (!vendorEmail) continue;

            const vendorSlug = vendor?.slug || "";
            const dashboardUrl = vendor?.docType === "PRACTITIONER"
                ? `${process.env.FRONTEND_URL || "https://spiriverse.com"}/p/${vendorSlug}/manage/payment-links`
                : `${process.env.FRONTEND_URL || "https://spiriverse.com"}/m/${vendorSlug}/manage/payment-links`;

            const vendorEmailContent = await renderEmailTemplate({ cosmos } as any, "payment-link-paid-vendor", {
                "vendor.name": vendor?.name || "Vendor",
                "vendor.contactName": vendor?.name || "there",
                "customer.email": link.customerEmail,
                "payment.amount": amountDisplay,
                "payment.description": description,
                dashboardUrl,
            });
            if (vendorEmailContent) {
                await email.sendRawHtmlEmail(
                    sender_details.from,
                    vendorEmail,
                    vendorEmailContent.subject,
                    vendorEmailContent.html
                );
            }
        } catch (err) {
            logger.logMessage(`Failed to send vendor notification to ${vendorId}: ${(err as any).message}`);
        }
    }
}

// ─── Expo Sale post-payment handler ──────────────────────────────

async function handleExpoSalePayment(
    paymentIntent: Stripe.PaymentIntent,
    metadata: { expoId: string; saleId: string; vendorId: string },
    logger: any,
    services: any
) {
    const { cosmos, signalR } = services;
    const { expoId, saleId, vendorId } = metadata;
    const now = DateTime.now().toISO();

    // 1. Update sale to PAID
    await cosmos.patch_record(EXPO_MODE_CONTAINER, saleId, expoId, [
        { op: "set", path: "/saleStatus", value: "PAID" as ExpoSaleStatus },
        { op: "set", path: "/paidAt", value: now },
    ], "STRIPE");

    logger.logMessage(`Expo sale ${saleId} marked as PAID`);

    // 2. Fetch the sale for item details
    const sale = await cosmos.get_record(EXPO_MODE_CONTAINER, saleId, expoId) as expoSale_type | null;
    if (!sale) {
        logger.logMessage(`Expo sale ${saleId} not found after patch`);
        return;
    }

    // 3. Decrement inventory for each item
    for (const saleItem of sale.items) {
        const item = await cosmos.get_record(EXPO_MODE_CONTAINER, saleItem.itemId, expoId) as expoItem_type | null;
        if (!item || item.docType !== "expo-item") continue;

        await cosmos.patch_record(EXPO_MODE_CONTAINER, saleItem.itemId, expoId, [
            { op: "set", path: "/quantitySold", value: (item.quantitySold || 0) + saleItem.quantity },
        ], "STRIPE");

        // Broadcast item update
        signalR.addDataMessage("expoItem", {
            ...item,
            quantitySold: (item.quantitySold || 0) + saleItem.quantity,
        }, {
            group: `expo-${expoId}`,
            action: DataAction.UPSERT,
        });
    }

    // 4. Update expo stats
    const expo = await cosmos.get_record(EXPO_MODE_CONTAINER, expoId, vendorId) as expo_type | null;
    if (expo) {
        const totalItemsSoldInSale = sale.items.reduce((sum: number, i: any) => sum + i.quantity, 0);
        await cosmos.patch_record(EXPO_MODE_CONTAINER, expoId, vendorId, [
            { op: "set", path: "/totalSales", value: (expo.totalSales || 0) + 1 },
            { op: "set", path: "/totalRevenue", value: (expo.totalRevenue || 0) + sale.subtotal.amount },
            { op: "set", path: "/totalItemsSold", value: (expo.totalItemsSold || 0) + totalItemsSoldInSale },
            { op: "set", path: "/totalCustomers", value: (expo.totalCustomers || 0) + 1 },
        ], "STRIPE");

        // Broadcast updated expo
        const updatedExpo = await cosmos.get_record(EXPO_MODE_CONTAINER, expoId, vendorId) as expo_type | null;
        if (updatedExpo) {
            signalR.addDataMessage("expo", updatedExpo, {
                group: `expo-${expoId}`,
                action: DataAction.UPSERT,
            });
        }
    }

    // 5. Broadcast the sale
    signalR.addDataMessage("expoSale", { ...sale, saleStatus: "PAID", paidAt: now }, {
        group: `expo-${expoId}`,
        action: DataAction.UPSERT,
    });

    // 6. Send emails
    const vendor = await cosmos.get_record("Main-Vendor", vendorId, vendorId) as vendor_type | null;
    const formatAmt = (amt: number, cur: string) => `$${(amt / 100).toFixed(2)} ${cur.toUpperCase()}`;
    const itemsStr = sale.items.map((i: any) =>
        `${i.quantity}x ${i.itemName} — ${formatAmt(i.lineTotal.amount, i.lineTotal.currency)}`
    ).join(", ");

    // Customer receipt
    if (sale.customerEmail) {
        try {
            const emailContent = await renderEmailTemplate({ cosmos } as any, "expo-sale-receipt", {
                "customer.name": sale.customerName || "Customer",
                "expo.name": expo?.expoName || "Expo",
                "vendor.name": vendor?.name || "Practitioner",
                "sale.number": String(sale.saleNumber),
                "sale.items": itemsStr,
                "sale.total": formatAmt(sale.subtotal.amount, sale.subtotal.currency),
            });
            if (emailContent) {
                await services.email.sendRawHtmlEmail(
                    sender_details.from, sale.customerEmail, emailContent.subject, emailContent.html
                );
            }
        } catch (err) {
            logger.logMessage(`Failed to send expo sale receipt: ${(err as any).message}`);
        }
    }

    // Vendor notification
    const vendorEmail = vendor?.contact?.internal?.email;
    if (vendorEmail) {
        try {
            const emailContent = await renderEmailTemplate({ cosmos } as any, "expo-sale-vendor-notification", {
                "expo.name": expo?.expoName || "Expo",
                "customer.name": sale.customerName || "Walk-up customer",
                "sale.items": itemsStr,
                "sale.total": formatAmt(sale.subtotal.amount, sale.subtotal.currency),
            });
            if (emailContent) {
                await services.email.sendRawHtmlEmail(
                    sender_details.from, vendorEmail, emailContent.subject, emailContent.html
                );
            }
        } catch (err) {
            logger.logMessage(`Failed to send expo vendor notification: ${(err as any).message}`);
        }
    }

    logger.logMessage(`Expo sale ${saleId} fully processed`);
}

const handler : StripeHandler = async (event, logger, services ) => {

    const { stripe, cosmos, signalR, email } = services;
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const metadata = paymentIntent.metadata as {
        orderId: string,
        customerEmail: string,
        tax_amount: string,
        paymentLinkId?: string,
        vendorBreakdown?: string,
        type?: string,
        expoId?: string,
        saleId?: string
    }

    const paymentId = uuid();

    // ─── Payment Link handling ──────────────────────────────────
    if (!isNullOrWhiteSpace(metadata["paymentLinkId"])) {
        logger.logMessage(`Processing payment for payment link ${metadata["paymentLinkId"]}`);
        await handlePaymentLinkPayment(paymentIntent, metadata, logger, services);
        logger.logMessage(`Payment link ${metadata["paymentLinkId"]} processed successfully`);
        return;
    }

    // ─── Expo Sale handling ──────────────────────────────────────
    if (metadata["type"] === "EXPO_SALE" && metadata["expoId"] && metadata["saleId"]) {
        logger.logMessage(`Processing expo sale ${metadata["saleId"]} for expo ${metadata["expoId"]}`);
        await handleExpoSalePayment(paymentIntent, metadata as any, logger, services);
        return;
    }

    if (!isNullOrWhiteSpace(metadata["orderId"])) {
        logger.logMessage(`Processing payment intent in relation to order ${metadata["orderId"]}`)

        if (await cosmos.record_exists("Main-Orders", metadata["orderId"], metadata["orderId"]) == false) {
            throw `Order ${metadata["orderId"]} does not exist in the database`;
        }

        let order = await cosmos.get_record<order_type>("Main-Orders", metadata.orderId, metadata.orderId)
        logger.logMessage(`Retrieved order ${metadata.orderId} from db.`)

        // 1. fetch the corresponding order and scope to the lines that are concerning the merchant on the metadata
        const merchantLines = await cosmos.run_query<orderLine_type>("Main-Orders", {
            query: `
                SELECT VALUE l
                FROM c
                JOIN l IN c.lines
                WHERE 
                    c.id = @id 
                    AND c.customerEmail = @customerEmail
                    AND l.merchantId = @merchantId
                    AND l.paid_status_log[0].label = 'AWAITING_CHARGE'
            `,
            parameters: [
                { name: "@id", value: metadata["orderId"] },
                { name: "@customerEmail", value: metadata["customerEmail"] },
                { name: "@merchantId", value: metadata["merchantId"] }
            ]
        }, true)


        // 2. We will resolve any inherit lines for forObject
        merchantLines.forEach(x => {
            if (x.forObject == "inherit") {
                x.forObject = order.forObject
            }
        })

        // 2. Loop through the merchant lines
        logger.logMessage(`Found ${merchantLines.length} lines for merchant ${metadata["merchantId"]}`)

        restore_price_on_lines(merchantLines)
        // Restore target field (SERVICE-PURCHASE, PRODUCT-PURCHASE, etc.) from listing type
        await restore_target_on_lines_async(merchantLines, cosmos)

        logger.logMessage(`${merchantLines.length} lines restored successfully`)

        // 3. Line processing
        for (var item of merchantLines) {
            logger.logMessage(`Processing line - object type ${item.target}`)
            const objectRef = item.forObject as recordref_type

            if (item["target"] == "TOUR-BOOKING") {
                
                const typedLine = item as orderLine_tourBooking_type

                logger.logMessage(`Target session ${item["target"]} - ${typedLine.sessionRef.id} `)

                // so now we need to update the referenced ticket ids with the payment intent id and that they have been paid
                const bookingFromDb = await cosmos.get_record<booking_type>(objectRef.container, objectRef.id, objectRef.partition)
                logger.logMessage(`Obtained relevent booking from cosmos`)

                const sessionFromDbIndex = bookingFromDb.sessions.findIndex(x => x.ref.id == typedLine.sessionRef.id)
                if (sessionFromDbIndex == -1) throw `Could not find session with id ${typedLine.sessionRef.id}`;

                const sessionFromDb = bookingFromDb.sessions[sessionFromDbIndex]
                const ticketIndex = sessionFromDb.tickets.findIndex(x => x.id == typedLine.ticketId)
                if (ticketIndex == -1) throw `Could not find ticket with id ${typedLine.ticketId}`
                const ticketPrefix = `/sessions/${sessionFromDbIndex}/tickets/${ticketIndex}`

                logger.logMessage(`Determined cosmos path to be ${ticketPrefix}`)

                await cosmos.patch_record("Main-Bookings", objectRef.id, objectRef.partition, [
                    { op: "set", path: `${ticketPrefix}/stripe/paymentIntent`, value: {
                        id: paymentIntent.id,
                        account: event.account
                    }},
                    { op: "set", path: `${ticketPrefix}/stripe/charge`, value: {
                        id: paymentIntent.latest_charge,
                        account:    event.account 
                    }},
                    { op: "add", "path": `${ticketPrefix}/status_log/0`, "value": { datetime: DateTime.now().toISO(), label: "PAID", triggeredBy: "STRIPE" } }], "STRIPE")
        
            } else if (item["target"].startsWith("CASE")) {
                logger.logMessage("Detected a line of type CASE")
                const caseRef = item.forObject as recordref_type

                if (item["target"].startsWith("CASE-OFFER")) {
                    logger.logMessage(`Narrowed down to a type CASE OFFER`)

                    // 1. Get the case offer ref
                    const caseOffer_ref = objectRef
                    // 2. Get the case ref
                    const caseId = caseOffer_ref.partition[0]

                    const caseFromDB = await cosmos.get_record<case_type>("Main-Cases", caseId, caseId)
                    const merchantUserIds = (await merchants_users(cosmos, caseFromDB.managedBy)).map(x => x.id)

                    if (item["target"] == "CASE-OFFER-RELEASE") {
                        logger.logMessage(`So its specifically about a CASE OFFER RELEASE (caseId: ${caseId}, offerId: ${caseOffer_ref.id})`)
                        
                        case_business_logic.release_case(caseId, cosmos, signalR, logger)
            
                        // 4. remove stripe and add paid: true in offer
                        await cosmos.patch_record("Main-CaseOffers", caseOffer_ref.id, caseId, [
                            { op: "remove", path: "/stripe"},
                            { op: "add", value: true, path: "/paid"}
                        ], "STRIPE")

                        // we need to close out any outstanding invoices

                        const outstanding_orders = await cosmos.run_query<order_type>("Main-Orders", {
                            query: `
                                SELECT VALUE c
                                FROM c 
                                JOIN l IN c.lines 
                                WHERE 
                                l.forObject.id = @caseId 
                                AND l.target = "CASE-INVOICE-LINE" 
                                AND NOT EXISTS (
                                    SELECT VALUE pd 
                                    FROM pd IN l.paid_status_log 
                                    WHERE pd.label = "PAID"
                                )
                            `,
                            parameters: [
                                { name: "@customerEmail", value: caseFromDB.contact.email },
                                { name: "@caseId", value: caseId }
                            ]
                        }, true)

                        // add a ttl to each of the orders but also mark them as paid
                        // this will cover if they are viewed before they are deleted
                        for (var outstanding_order of outstanding_orders) {
                            // loop on the lines and add a paid status log of void
                            for(var line of outstanding_order.lines) {
                                await cosmos.patch_record("Main-Orders", outstanding_order.id, outstanding_order.id, [
                                    { op: "add", path: `/lines/${outstanding_order.lines.findIndex(x => x.id == line.id)}/paid_status_log/0`, value: { datetime: DateTime.now().toISO(), label: "VOID", triggeredBy: "STRIPE" } }
                                ], "STRIPE")
                            }

                            await cosmos.patch_record("Main-Orders", outstanding_order.id, outstanding_order.id, [
                                { op: "add", path: "/ttl", value: Duration.fromObject({ hours: 24 }).as("seconds") },
                            ], "STRIPE")
                        }
            
                        logger.logMessage(`Finished CASE RELEASE OFFER post payment handling. Now onto the default order stuff.`);
            
                    } else if (item["target"] == "CASE-OFFER-CLOSE") {
                        logger.logMessage(`So its specifically about a CASE OFFER CLOSE (caseId: ${caseId}, offerId: ${caseOffer_ref.id})`)
                        
                        await cosmos.patch_record("Main-Cases", caseId, caseId, [
                            { op: "set", value: "CLOSED", path: "/caseStatus"}
                        ], "STRIPE")
            
                        await cosmos.patch_record("Main-CaseOffers", caseOffer_ref.id, caseId, [
                            { op: "remove", path: "/stripe"},
                            { op: "add", value: true, path: "/paid"}
                        ], "STRIPE")

                        logger.logMessage(`Sending realtime notification to update the case status to CLOSED`);
                        signalR.addDataMessage("caseStatus", {
                            id: caseFromDB.trackingCode,
                            status: caseFromDB.caseStatus
                        }, { action: DataAction.UPSERT, userId: caseFromDB.trackingCode })
                        
                        for(var userId of merchantUserIds) {
                            signalR.addNotificationMessage(`
                                Case ${caseFromDB.code} successfully closed. 
                            `, { userId, status: "success" })
                        }

                        logger.logMessage(`Sending email in addition in case they're not logged in at the moment.`);
                        const offerFromDb = await cosmos.get_record<caseOffer_type>("Main-CaseOffers", caseOffer_ref.id, caseId)
                        await email.sendEmail(
                            sender_details.from,
                            caseFromDB.contact.email,
                            "CASE_CLOSE_OFFER_PAYMENT_SUCCESS",
                            {
                                case: {
                                    code: caseFromDB.code
                                },
                                caseOffer: {
                                    code: offerFromDb.code
                                }
                            }                     
                        )

                        logger.logMessage(`Finished CASE CLOSE OFFER post payment handling. Now onto the default order stuff.`);
                        
                    }
                } 
                else if (item["target"] == "CASE-CREATE") {
                    const caseDB = await cosmos.get_record<case_type>("Main-Cases", caseRef.id, caseRef.partition)

                        logger.logMessage(`Narrowed to it being about CASE CREATE (caseId: ${caseRef.id})`)

                        const operations = [
                            { op: "set", path: "/caseStatus", value: "NEW"},
                            { op: "remove", path: "/stripe"}
                        ] as PatchOperation[]

                        //2. patch and remove stripe from case
                        await cosmos.patch_record("Main-Cases", caseRef.id, caseRef.partition, operations, "STRIPE")
                        
                        logger.logMessage(`Sending realtime notification to update the case status for the user tracking the case`);
                        signalR.addDataMessage("caseStatus", {
                            id: caseDB.trackingCode,
                            status: caseDB.caseStatus
                        }, { action: DataAction.UPSERT, userId: caseDB.trackingCode })

                        logger.logMessage(`Sending email in addition in case they're not logged in at the moment.`);

                        await email.sendEmail(
                            sender_details.from,
                            caseDB.contact.email,
                            "CASE_CREATED_PAYMENT_SUCCESS",
                            {    
                                case: {
                                    contact: {
                                        name: caseDB.contact.name,
                                    },
                                    code: caseDB.code  
                                }
                            }                     
                        )

                        await email.sendEmail(
                            sender_details.from,
                            caseDB.contact.email,
                            "CASE_CREATED",
                            {
                                case: {
                                    contact: {
                                        name: caseDB.contact.name,
                                    },
                                    trackingCode: caseDB.trackingCode,
                                    code: caseDB.code  
                                }
                            }                     
                        )

                        logger.logMessage(`Finished CASE CREATE post payment handling. Now onto the default order stuff.`);
                }
                else {
                    logger.logMessage(`No processing logic for target ${item["target"]}`)
                }
            } else if (item["target"] == "PRODUCT-LISTING-FEE") {
                // we need to clear the ttl from the product
                await cosmos.patch_record("Main-Listing", objectRef.id, objectRef.partition, [
                    { op: "remove", path: "/listingFee/setupIntentSecret"},
                    { op: "remove", path: "/ttl"}
                ], "STRIPE")
            }
        }

        logger.logMessage(`Finished processing line by line. Now to do notifications.`)

        var stripe_ds = stripe
        if (metadata["merchantId"] !== "SPIRIVERSE") {
            const merchant = await cosmos.get_record<vendor_type>("Main-Vendor", metadata["merchantId"], metadata["merchantId"])
            if (merchant.stripe == null) throw `Merchant ${metadata["merchantId"]} does not have a stripe account`
            stripe_ds = stripe.asConnectedAccount(merchant.stripe.accountId)
        }

        logger.logMessage(`Get the payment method details.`)

        // get details of the payment method and also the fees from stripe
        const charge = await stripe_ds.callApi("GET", `charges/${paymentIntent.latest_charge}`, {
            expand: ["balance_transaction"]
        })
        let method_description = ""
        if (charge.data.payment_method_details.card) {
            method_description = `${charge.data.payment_method_details.card.brand} ending in ${charge.data.payment_method_details.card.last4}`
        }

        logger.logMessage(`Work out the details of the transaction i.e. stripe fees, merchant fees.`)
        
        // now we update all the merchant lines to be paid
        const payment_intent_order  = await cosmos.get_record<order_type>("Main-Orders", metadata["orderId"], metadata["orderId"])
        let patch_operations : PatchOperation[] = merchantLines.map((item) => ([
            { op: "add", path: `/lines/${payment_intent_order.lines.findIndex(x => x.id == item.id)}/paid_status_log/0`, value: { datetime: DateTime.now().toISO(), label: "PAID", triggeredBy: "STRIPE" } },
            { op: "set", path: `/lines/${payment_intent_order.lines.findIndex(x => x.id == item.id)}/price_log/0/paymentId`, value: paymentId },
            { op: "set", path:`/lines/${payment_intent_order.lines.findIndex(x => x.id == item.id)}/price_log/0/status`, value: 'SUCCESS' }   
        ])).flatMap(x => x as PatchOperation[])

        logger.logMessage(`Generate a payment number for reference purposes.`)

        // we need to keep attemping to generate a human friendly id until we have a unique one within the order
        var payment_no = ""
        while(isNullOrWhiteSpace(payment_no) || payment_intent_order.payments.some(x => x.code == payment_no)) {
            payment_no = generate_human_friendly_id("PYMT")
            logger.logMessage(`Generated payment number ${payment_no} for order ${metadata["orderId"]}`)
        }

        const fees = await deriveFees(metadata["merchantId"], merchantLines, cosmos)
        logger.logMessage(`Add the payment to the payments in the order.`)

        const balance_fee_details = charge.data.balance_transaction.fee_details.reduce((acc, x) => {
            acc[x.type] = x.amount
            return acc
        }, {} as { [key: string]: number })
        // lets take out application_fee
        delete balance_fee_details.application_fee
        // lets group tax and stripe_fee into a stripe object
        balance_fee_details.stripe = {
            amount: balance_fee_details.stripe_fee,
            tax: balance_fee_details.tax
        }
        delete balance_fee_details.tax
        delete balance_fee_details.stripe_fee

        // we create the application fee object, just rearranging for processing to be on top and tax on bottom
        const deductions_tax = fees.merchant.breakdown.tax
        delete fees.merchant.breakdown.tax
        const application_fee_merchant = fees.merchant.breakdown;

        const application_fee_merchant_total = Object.values(application_fee_merchant).reduce((acc, x) => acc + x, 0);

        const application_fee_customer = {
            processing: fees.customer.breakdown.processing,
        }
        const application_fee_customer_total = Object.values(application_fee_customer).reduce((acc, x) => acc + x, 0);

        const application_fee_total = application_fee_merchant_total + application_fee_customer_total + deductions_tax;

        const shipping_subtotal = forceFloat(metadata['shipping_subtotal'])
        const shipping = shipping_subtotal > 0 ?
            {
                subtotal: shipping_subtotal,
                tax: forceFloat(metadata['shipping_tax']),
                stripe: forceFloat(metadata['shipping_fee']),
                currency: metadata['shipping_currency']
            } : undefined;
        const shipping_grand_total = shipping ? (shipping_subtotal + shipping.tax + shipping.stripe) : 0
        
        patch_operations.push(
            { op: "add", path: `/payments/0`, value: {
                id: paymentId,
                code: payment_no,
                stripe_chargeId: paymentIntent.latest_charge,
                currency: paymentIntent.currency.toUpperCase(),
                charge: {
                    subtotal:  fees.customer.breakdown.item_total,
                    application: {
                        components: {
                            processing: fees.customer.breakdown.processing
                        },
                        actual: fees.customer.breakdown.processing
                    },
                    stripe: {
                        estimate: fees.customer.breakdown.stripe
                    },
                    shipping: {
                        components: shipping,
                        estimate: shipping_grand_total
                    },
                    tax: parseInt(metadata.tax_amount),
                    paid: paymentIntent.amount
                },
                payout: {
                    customer_paid: paymentIntent.amount,
                    application_fees: {
                        components: {
                            customer: {
                                components: application_fee_customer,
                                total: application_fee_customer_total
                            }, 
                            merchant: {
                                components: application_fee_merchant,
                                total: application_fee_merchant_total
                            },
                            tax: deductions_tax
                        },
                        total: application_fee_total
                    },
                    stripe_fees: {
                        components: balance_fee_details.stripe,
                        total: paymentIntent.amount - application_fee_total - charge.data.balance_transaction.net
                    },
                    summary: {
                        sale_price_inc_tax: fees.customer.breakdown.item_total + parseInt(metadata.tax_amount),
                        recieves: charge.data.balance_transaction.net,
                        remaining:  charge.data.balance_transaction.net - (fees.customer.breakdown.item_total + parseInt(metadata.tax_amount))
                    }
                },
                card_details: {
                    brand: charge.data.payment_method_details.card.brand,
                    last4: charge.data.payment_method_details.card.last4
                },
                method_description,
                date: DateTime.now().toISO()
            }}
        )

        await cosmos.patch_record("Main-Orders", metadata.orderId, metadata.orderId, patch_operations, "STRIPE")

        // Remove ttl attribute if it exists
        if (order.ttl != undefined) {
        await cosmos.patch_record("Main-Orders", metadata.orderId, metadata.orderId, [
            { op: "remove", path: "/ttl"}
        ], "STRIPE")
        }

        // get the order fresh after the patch
        order = await cosmos.get_record<order_type>("Main-Orders", metadata.orderId, metadata.orderId)

        const summaryAndPurgeOps = generate_shipment_summary(order);

        if (summaryAndPurgeOps.length > 0) {
            await cosmos.patch_record(
                "Main-Orders",
                metadata.orderId,
                metadata.orderId,
                summaryAndPurgeOps,
                "STRIPE"
            );
            logger.logMessage(`Applied shipment summaries and purged carrierOptions on ${summaryAndPurgeOps.length / 2} shipments.`);
        }

        logger.logMessage(`Finished processing order ${metadata.orderId} successfully. Now to send notifications.`)

        // checking if case emails are required
        logger.logMessage(`Checking for lines concerned with Cases on order.`)
        if (merchantLines.some(x => x.target.startsWith("CASE"))) {

            let distinctCasesFromDB : case_type[] = []
            logger.logMessage(`Found lines concerned with Cases on order, fetching distinct cases.`)
            const distinctCasesMentioned = 
                merchantLines
                    .map(x => (x.forObject as recordref_type).id)
                    .filter((value, index, self) => self.indexOf(value) === index);
            distinctCasesFromDB = await cosmos.run_query<case_type>("Main-Cases", {
                query: `
                    SELECT VALUE c FROM c WHERE ARRAY_CONTAINS(@ids, c.id)
                `,
                parameters: [
                    { name: "@ids", value: distinctCasesMentioned }
                ]
            }, true);

            for (var caseFromDB of distinctCasesFromDB) {

                logger.logMessage(`Scanning for CASE-INVOICE-LINE for case ${caseFromDB.id}`)
                if (merchantLines
                    .filter(x => (x.forObject as recordref_type).id == caseFromDB.id)
                    .some(x => x.target == "CASE-INVOICE-LINE")) {
                    await email.sendEmail(
                        sender_details.from,
                        order.customerEmail,
                        "CASE_ORDER_FEE_PAYMENT_SUCCESS_CUSTOMER",
                        {
                            case: {
                                contact: {
                                    name: caseFromDB.contact.name,
                                },
                                code: caseFromDB.code
                            },
                            order: {
                                code: order.code
                            }
                        }                     
                    )
                }
            }

        }

        // checking if product emails are required
        if (merchantLines.some(x => x.target.startsWith("PRODUCT-PURCHASE"))) {
            
            // Process inventory decrements for product purchases
            logger.logMessage("Processing inventory decrements for product purchases");
            const productLines = merchantLines.filter(x => x.target.startsWith("PRODUCT-PURCHASE"));
            
            for (const line of productLines) {
                if (line.variantId) {
                    try {
                        logger.logMessage(`Decrementing inventory for variant ${line.variantId}, quantity: ${line.quantity}`);
                        
                        const containerName = "Main-Listing";
                        const variantInventoryId = `invv:${line.variantId}`;
                        const now = DateTime.now().toISO();
                        
                        // Get current inventory
                        const currentInventory = await cosmos.get_record<variant_inventory_type>(containerName, variantInventoryId, line.merchantId);
                        
                        if (currentInventory && currentInventory.track_inventory) {
                            const qtyBefore = currentInventory.qty_on_hand;
                            const qtyAfter = qtyBefore - line.quantity;
                            
                            if (qtyAfter < 0) {
                                logger.logMessage(`Warning: Inventory went negative for variant ${line.variantId}. Before: ${qtyBefore}, After: ${qtyAfter}`);
                            }
                            
                            // Update inventory - deduct qty_on_hand AND reduce qty_committed
                            await cosmos.patch_record(containerName, variantInventoryId, line.merchantId, [
                                { op: "set", path: '/qty_on_hand', value: Math.max(0, qtyAfter) },
                                { op: "set", path: '/qty_committed', value: Math.max(0, currentInventory.qty_committed - line.quantity) },
                                { op: "set", path: '/updated_at', value: now }
                            ], "system");
                            
                            // Create transaction record
                            const transactionId = `invt:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                            const transaction = {
                                id: transactionId,
                                docType: "transaction",
                                vendorId: line.merchantId,
                                product_id: currentInventory.product_id,
                                variant_id: line.variantId,
                                delta: -line.quantity,
                                qty_before: qtyBefore,
                                qty_after: Math.max(0, qtyAfter),
                                reason: "SALE",
                                source: "ORDER",
                                reference_id: metadata.orderId,
                                created_at: now,
                                created_by: "system"
                            };
                            
                            await cosmos.add_record(containerName, transaction, line.merchantId, "system");
                            
                            // Check for alerts
                            const qtyAvailable = Math.max(0, qtyAfter) - currentInventory.qty_committed;
                            const threshold = currentInventory.low_stock_threshold || 5;
                            
                            if (qtyAvailable <= 0) {
                                const alertId = `inva:${line.variantId}:OUT_OF_STOCK:${now.split('T')[0]}`;
                                const alert = {
                                    id: alertId,
                                    docType: "alert",
                                    variant_id: line.variantId,
                                    product_id: currentInventory.product_id,
                                    vendorId: line.merchantId,
                                    alert_type: 'OUT_OF_STOCK',
                                    current_qty: qtyAvailable,
                                    status: 'OPEN',
                                    created_at: now,
                                    acknowledged: false
                                };
                                
                                try {
                                    await cosmos.add_record(containerName, alert, line.merchantId, "system");
                                    logger.logMessage(`Created OUT_OF_STOCK alert for variant ${line.variantId}`);
                                } catch (alertError) {
                                    logger.logMessage(`Alert might already exist for variant ${line.variantId}: ${alertError.message}`);
                                }
                                
                                // If OOAK, hide the product
                                if (currentInventory.is_ooak_effective) {
                                    logger.logMessage(`OOAK item sold out, should hide product ${currentInventory.product_id}`);
                                    // Note: In a production system, you'd want to update product visibility
                                    // This could be done via a separate process or queue to maintain atomicity
                                }
                            } else if (qtyAvailable <= threshold && qtyBefore > threshold) {
                                const alertId = `inva:${line.variantId}:LOW_STOCK:${now.split('T')[0]}`;
                                const alert = {
                                    id: alertId,
                                    docType: "alert",
                                    variant_id: line.variantId,
                                    product_id: currentInventory.product_id,
                                    vendorId: line.merchantId,
                                    alert_type: 'LOW_STOCK',
                                    threshold,
                                    current_qty: qtyAvailable,
                                    status: 'OPEN',
                                    created_at: now,
                                    acknowledged: false
                                };
                                
                                try {
                                    await cosmos.add_record(containerName, alert, line.merchantId, "system");
                                    logger.logMessage(`Created LOW_STOCK alert for variant ${line.variantId}`);
                                } catch (alertError) {
                                    logger.logMessage(`Alert might already exist for variant ${line.variantId}: ${alertError.message}`);
                                }
                            }
                            
                            logger.logMessage(`Successfully processed inventory for variant ${line.variantId}. Before: ${qtyBefore}, After: ${Math.max(0, qtyAfter)}`);
                        }
                    } catch (inventoryError) {
                        logger.logMessage(`Failed to process inventory for variant ${line.variantId}: ${inventoryError.message}`);
                        // Continue processing other items even if one fails
                    }
                }
            }

            // Process tour ticket inventory decrements
            logger.logMessage("Processing tour ticket inventory decrements");
            const tourLines = merchantLines.filter(x => x.target === "TOUR-BOOKING");

            if (tourLines.length > 0) {
                // Import tour inventory utilities
                const { deduct_ticket_inventory } = require("../../../graphql/eventandtour/utils/ticket_inventory");
                const { tour_type } = require("../../../graphql/eventandtour/types");

                for (const line of tourLines) {
                    const typedLine = line as orderLine_tourBooking_type;

                    try {
                        logger.logMessage(`Decrementing tour ticket inventory for session ${typedLine.sessionRef.id}, ticket ${typedLine.ticketId}, quantity: ${line.quantity}`);

                        // Get the booking to find the tour
                        const bookingRef = line.forObject as recordref_type;
                        const booking = await cosmos.get_record<booking_type>(
                            bookingRef.container,
                            bookingRef.id,
                            bookingRef.partition
                        );

                        // Get the session to find the tour
                        const session = await cosmos.get_record<session_type>(
                            typedLine.sessionRef.container,
                            typedLine.sessionRef.id,
                            typedLine.sessionRef.partition
                        );

                        // Get the tour
                        const tour = await cosmos.get_record<any>(
                            session.forObject.container!,
                            session.forObject.id,
                            session.forObject.partition
                        );

                        // Find the variantId from the booking
                        const sessionBooking = booking.sessions.find((s: any) => s.ref.id === typedLine.sessionRef.id);
                        if (!sessionBooking) {
                            logger.logMessage(`Warning: Could not find session booking for session ${typedLine.sessionRef.id}`);
                            continue;
                        }

                        const ticket = sessionBooking.tickets.find((t: any) => t.id === typedLine.ticketId);
                        if (!ticket || !ticket.variantId) {
                            logger.logMessage(`Warning: Could not find ticket ${typedLine.ticketId} or missing variantId`);
                            continue;
                        }

                        // Deduct inventory
                        const patches = deduct_ticket_inventory(
                            tour,
                            ticket.variantId,
                            line.quantity,
                            metadata.orderId,
                            "system"
                        );

                        if (patches.length > 0) {
                            await cosmos.patch_record(
                                "Main-Listing",
                                tour.id,
                                tour.vendorId,
                                patches,
                                "system"
                            );

                            logger.logMessage(`Successfully decremented tour ticket inventory for variant ${ticket.variantId}. Quantity: ${line.quantity}`);
                        }
                    } catch (tourInventoryError) {
                        logger.logMessage(`Failed to process tour ticket inventory for line ${line.id}: ${tourInventoryError.message}`);
                        // Continue processing other items even if one fails
                    }
                }
            }
            // if all the lines on the order are paid we can send the email saying purchase succssful
            if (order.lines.every(x => x.paid_status_log[0].label == "PAID")) {
                const amounts = order.payments.reduce((acc, x) => acc + x.charge.paid, 0)
                const refunds = 0
                const total = amounts - refunds
                await email.sendEmail(
                    sender_details.from,
                    order.customerEmail,
                    "PRODUCT_PURCHASE_SUCCESS_CUSTOMER",
                    {
                        order: {
                            code: order.code,
                            date_created: DateTime.fromISO(order.createdDate).toLocaleString(DateTime.DATETIME_FULL),
                            total
                        }
                    }
                )

                // Send SignalR notification to customer that payment is confirmed
                if (order.customer?.id) {
                    signalR.addDataMessage("paymentConfirmed", {
                        orderId: order.id,
                        setupIntentId: order.stripe?.setupIntentId,
                        target: order.target
                    }, {
                        userId: order.customer.id,
                        action: DataAction.UPSERT
                    });
                    logger.logMessage(`Sent paymentConfirmed SignalR message to customer ${order.customer.id}`);
                }
            }
        }

        // Process service orders - MUST be outside the PRODUCT-PURCHASE block
        // to handle service-only purchases
        logger.logMessage("Processing service orders from cart");
        const serviceLines = merchantLines.filter(x => x.target === "SERVICE-PURCHASE");

        for (const line of serviceLines) {
            try {
                // Get service ID from forObject (the reference to the listing)
                // Note: serviceId field on the line may not be set, use forObject.id instead
                const forObjectRef = line.forObject as recordref_type;
                const serviceId = forObjectRef.id;
                logger.logMessage(`Creating service order for service ${serviceId}`);

                const service = await cosmos.get_record("Main-Listing", serviceId, line.merchantId);

                const serviceOrderId = uuid();
                // Use order.userId since order.customer may not exist at this point
                // Note: order_type says customer but actual data may have userId
                const customerId = (order as any).userId || order.customer?.id;
                // Note: userId is required for the hierarchical partition key in Main-Bookings
                // For service orders, we use the vendorId as userId since that's how the partition is structured
                // Get customer email from the order for partition key
                const customerEmail = order.customerEmail;
                const serviceOrder: serviceBooking_type & { listingId: string; userId: string; type: string; customerEmail?: string } = {
                    id: serviceOrderId,
                    // type and customerEmail are the hierarchical partition key fields for Main-Bookings (per Bicep config)
                    // We also include userId for compatibility with existing code that uses it
                    type: "SERVICE",
                    customerEmail: customerEmail,
                    userId: customerEmail, // Use customerEmail for userId to match partition key path
                    customerId: customerId,
                    vendorId: line.merchantId,
                    purchaseDate: DateTime.now().toISO(),
                    // listingId is needed for the ServiceBooking.service resolver
                    listingId: serviceId,
                    ref: {
                        id: serviceId,
                        container: "Main-Listing",
                        partition: [line.merchantId]
                    },
                    service: service as any,
                    price: {
                        amount: line.price.amount,
                        currency: line.price.currency
                    },
                    stripe: {
                        paymentIntent: {
                            id: paymentIntent.id
                        }
                    },
                    // Using "orderStatus" instead of "status" to avoid conflict with Cosmos soft-delete
                    orderStatus: "PAID",
                    questionnaireResponses: (line as any).questionnaireResponses || [],
                    deliverables: undefined
                };

                // Partition key is [/type, /customerEmail] per Bicep config
                const partition = ["SERVICE", customerEmail];
                await cosmos.add_record("Main-Bookings", serviceOrder, partition, "system");

                logger.logMessage(`Service order ${serviceOrderId} created successfully`);

                // Handle featuring revenue share transfers
                // This processes when a service was purchased through a merchant's featured section
                const featuringSource = (line as orderLine_servicePurchase_type).featuringSource as featuring_source_type | undefined;
                if (featuringSource) {
                    logger.logMessage(`Processing featuring revenue share for relationship ${featuringSource.relationshipId}`);

                    try {
                        // Get merchant vendor for their Stripe account ID
                        const merchantVendor = await cosmos.get_record<vendor_type>(
                            "Main-Vendor",
                            featuringSource.merchantId,
                            featuringSource.merchantId
                        );

                        if (merchantVendor?.stripe?.accountId) {
                            // Calculate revenue shares
                            // Note: For this to work, the payment must have been made to the platform account
                            // (not direct to the practitioner's connected account)
                            const lineTotal = line.price.amount * line.quantity;
                            const merchantShare = Math.floor(lineTotal * featuringSource.merchantRevenueShareBps / 10000);

                            if (merchantShare > 0) {
                                // Create transfer to the referring merchant
                                // Note: This requires the payment to have been charged on the platform account
                                try {
                                    await stripe.callApi("POST", "transfers", {
                                        amount: merchantShare,
                                        currency: line.price.currency.toLowerCase(),
                                        destination: merchantVendor.stripe.accountId,
                                        transfer_group: `order_${metadata.orderId}_service_${serviceOrderId}`,
                                        metadata: {
                                            type: "FEATURING_REFERRAL_FEE",
                                            featuringRelationshipId: featuringSource.relationshipId,
                                            practitionerId: line.merchantId,
                                            merchantId: featuringSource.merchantId,
                                            serviceOrderId: serviceOrderId,
                                            merchantShareBps: featuringSource.merchantRevenueShareBps
                                        }
                                    });
                                    logger.logMessage(`Featuring transfer of ${merchantShare} ${line.price.currency} created to merchant ${featuringSource.merchantId}`);
                                } catch (transferError: any) {
                                    // Log but don't fail the order - the featuring revenue can be reconciled manually
                                    logger.logMessage(`Failed to create featuring transfer: ${transferError.message}. This may require manual reconciliation.`);
                                }
                            }
                        } else {
                            logger.logMessage(`Merchant ${featuringSource.merchantId} has no Stripe account - cannot create featuring transfer`);
                        }
                    } catch (featuringError: any) {
                        logger.logMessage(`Error processing featuring revenue share: ${featuringError.message}`);
                        // Don't fail the order - featuring revenue can be reconciled manually
                    }
                }

                // Get service category for routing and auto-activation logic
                const serviceCategory = (service as any).category;

                // Auto-activate Personal Space for READING category services
                // This ensures customer can view their purchased reading in Personal Space
                if (serviceCategory === "READING" && customerId) {
                    try {
                        const user = await cosmos.get_record<user_type>("Main-User", customerId, customerId);
                        if (user) {
                            if (!user.primarySpiritualInterest) {
                                // No primary interest - set MEDIUMSHIP as primary to activate Personal Space
                                logger.logMessage(`Auto-activating Personal Space for customer ${customerId} with MEDIUMSHIP interest`);
                                await cosmos.patch_record("Main-User", customerId, customerId, [
                                    { op: "set", path: '/primarySpiritualInterest', value: "MEDIUMSHIP" }
                                ], "system");
                                logger.logMessage(`Personal Space auto-activated for customer ${customerId}`);
                            } else if (user.primarySpiritualInterest !== "MEDIUMSHIP") {
                                // User has a different primary interest - add MEDIUMSHIP to secondary if not already there
                                const secondaryInterests = user.secondarySpiritualInterests || [];
                                if (!secondaryInterests.includes("MEDIUMSHIP" as any)) {
                                    const updatedSecondary = [...secondaryInterests, "MEDIUMSHIP"];
                                    logger.logMessage(`Adding MEDIUMSHIP to secondary interests for customer ${customerId}`);
                                    await cosmos.patch_record("Main-User", customerId, customerId, [
                                        { op: "set", path: '/secondarySpiritualInterests', value: updatedSecondary }
                                    ], "system");
                                    logger.logMessage(`MEDIUMSHIP added to secondary interests for customer ${customerId}`);
                                }
                            }
                        }
                    } catch (activationError) {
                        logger.logMessage(`Failed to auto-activate Personal Space for customer ${customerId}: ${activationError.message}`);
                        // Continue processing - don't block the order if activation fails
                    }
                }

                const vendor = await cosmos.get_record<vendor_type>("Main-Vendor", line.merchantId, line.merchantId);
                const practitionerEmail = vendor?.contact?.internal?.email;

                if (practitionerEmail) {
                    await email.sendEmail(
                        sender_details.from,
                        practitionerEmail,
                        "SERVICE_PURCHASED_PRACTITIONER",
                        {
                            serviceName: (service as any).name || "Service",
                            customerEmail: order.customerEmail,
                            purchaseDate: DateTime.now().toLocaleString(DateTime.DATETIME_FULL),
                            orderId: serviceOrderId,
                            fulfillmentUrl: `${process.env.FRONTEND_URL || 'https://spiriverse.com'}/m/${vendor.slug}/manage/services/orders/${serviceOrderId}`
                        }
                    );
                    logger.logMessage(`Sent practitioner notification to ${practitionerEmail}`);
                }

                const turnaroundMessage = (service as any).turnaroundDays
                    ? `Your service will be delivered within ${(service as any).turnaroundDays} days.`
                    : "Your service will be delivered soon.";

                // For READING category services, link to Personal Space readings
                // For other categories, link to the customer area (future enhancement)
                const orderUrl = serviceCategory === "READING"
                    ? `${process.env.FRONTEND_URL || 'https://spiriverse.com'}/u/${customerId}/space/readings/received`
                    : `${process.env.FRONTEND_URL || 'https://spiriverse.com'}/u/${customerId}/space/readings/received`;

                await email.sendEmail(
                    sender_details.from,
                    order.customerEmail,
                    "SERVICE_PURCHASED_CUSTOMER",
                    {
                        serviceName: (service as any).name || "Service",
                        practitionerName: vendor?.name || "Practitioner",
                        purchaseDate: DateTime.now().toLocaleString(DateTime.DATETIME_FULL),
                        turnaroundMessage: turnaroundMessage,
                        orderId: serviceOrderId,
                        orderUrl: orderUrl
                    }
                );
                logger.logMessage(`Sent customer confirmation to ${order.customerEmail}`);

            } catch (serviceError) {
                logger.logMessage(`Failed to process service order for line ${line.id}: ${serviceError.message}`);
            }
        }
    }

    logger.logMessage(`Payment intent processed successfully`)
}

export default handler;
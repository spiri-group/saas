import Stripe from "stripe";
import { StripeHandler } from "./0_dependencies";
import { DateTime } from "luxon";
import { sender_details } from "../../client/email_templates";
import { case_type } from "../../graphql/case/types";
import { order_type } from "../../graphql/order/types";
import { user_type } from "../../graphql/user/types";
import { DataAction } from "../../services/signalR";
import { generate_human_friendly_id, formatCurrency } from "../../utils/functions";
import { v4 as uuid } from 'uuid';
import type { booking_type, session_type } from "../../graphql/eventandtour/types";
import type { recordref_type } from "../../graphql/0_shared/types";

const handler: StripeHandler = async (event, logger, services) => {
    const { stripe, cosmos, email, signalR } = services;
    const refundedCharge = event.data.object as Stripe.Charge
    const metadata = refundedCharge.metadata as {
        orderId: string;
        customerEmail: string;
    }

    let order = await cosmos.get_record<order_type>("Main-Orders", metadata.orderId, metadata.orderId)
    logger.logMessage(`Received order ${metadata.orderId}`)      

    logger.logMessage(`Refund of charge detected - chargeId: ${refundedCharge.id}, account: ${event.account}`)

    const creditId = uuid();

    const refundsForCharge = await stripe.asConnectedAccount(event.account).callApi("GET", `refunds`, {
        charge: refundedCharge.id
    })

    const refunds = refundsForCharge.data.data;
    logger.logMessage(`Found ${refunds.length} refunds - Http status ${refundsForCharge.status}`)

    // resolve the order lines that have inherit
    for (var line of order.lines) {
        if (line.forObject == "inherit") {
            line.forObject = order.forObject
        }
    }

    for (var refund of refunds) {
        if (refund.status == 'succeeded') {
            logger.logMessage("Charge refund detected, getting corresponding order line information")

            // if (orderLine.price_log[priceLogEntryIndex].status == "SUCCESS") {
            //     continue;
            // }

            // if (orderLine.target == "TOUR-BOOKING") {
            //     logger.logMessage("Found a target of Main-Bookings, getting booking - session - ticket")
            //     const forObjectRef = orderLine.forObject as recordref_type

            //     const booking = await cosmos.get_record<booking_type>(forObjectRef.container, forObjectRef.id, forObjectRef.partition)
            //     const session = booking.sessions.find(x => x.ref.id == orderLine.sessionRef.id && partitionsEqual(x.ref.partition, orderLine.sessionRef.partition))
            //     const sessionIndex = booking.sessions.findIndex(x => x.ref.id == orderLine.sessionRef.id && partitionsEqual(x.ref.partition, orderLine.sessionRef.partition))
            //     const ticketIndex = session.tickets.findIndex(x => x.id == orderLine.ticketId)

            //     logger.logMessage("Patching tickets status log")

            //     await cosmos.patch_record("Main-Bookings", forObjectRef.id, forObjectRef.partition, [
            //         {   op: "set", 
            //             value: {
            //                 datetime: DateTime.now(),
            //                 label: orderLine.price_log[priceLogEntryIndex].type,
            //                 triggeredBy: "STRIPE"
            //             }, 
            //             path: `/sessions/${sessionIndex}/tickets/${ticketIndex}/status_log/0`
            //         }
            //     ], "STRIPE")

            // }

            // now do the general order stuff
            // i.e. update refund on price log to be SUCCESS and send data notification

            const orderLineIdxs = order.lines.map((ol, olidx) => {
                return {
                    orderLineIndex: olidx,
                    priceLogEntryIndex: ol.price_log.findIndex(x => x.stripe_refundId == refund.id),
                    priceLogEntry: ol.price_log.find(x => x.stripe_refundId == refund.id)
                }
            }).filter(x => x.priceLogEntryIndex != -1)

            // we need to work out the overall refund type, if all the price logs are FULL_REFUND then we put FULL_REFUND
            // otherwise put PARTIAL_REFUND
            const refundType = orderLineIdxs.every(x => order.lines[x.orderLineIndex].price_log[x.priceLogEntryIndex].type == "FULL_REFUND") ? "FULL_REFUND" : "PARTIAL_REFUND"
                
            // now we can patch the order line to indicate that the refund was successful
            for (var { orderLineIndex, priceLogEntryIndex } of orderLineIdxs) {
                logger.logMessage("Patching Orders line's refund as SUCCESS")
                await cosmos.patch_record("Main-Orders", order.id, order.id, [
                    {   op: "set", value: "SUCCESS", path: `/lines/${orderLineIndex}/price_log/${priceLogEntryIndex}/status`},
                    {   op: "remove", path: `/lines/${orderLineIndex}/price_log/${priceLogEntryIndex}/stripe_refundId`}, // this is because you can trace it via creditId
                    {   op: "set", value: creditId, path: `/lines/${orderLineIndex}/price_log/${priceLogEntryIndex}/creditId`},
                    {   op: "add", 
                        value: {
                            datetime: DateTime.now(),
                            label: refundType,
                            triggeredBy: "STRIPE",
                        },
                        path: `/lines/${orderLineIndex}/paid_status_log/0`
                    }
                ], "STRIPE")
            }

            const refundTaxAmount = orderLineIdxs.reduce((acc, x) => acc + x.priceLogEntry.tax.amount, 0)
            
            // lets add a new credit to the order
            await cosmos.patch_record("Main-Orders", order.id, order.id, [
                {
                    op: "add",
                    path: "/credits/0",
                    value: {
                        id: creditId,
                        code: generate_human_friendly_id("CR"),
                        stripe_refundId: refund.id, 
                        stripe_chargeId: refundedCharge.id,
                        destination: refund.destination_details,
                        currency: refund.currency.toUpperCase(),
                        amount: refund.amount - refundTaxAmount,
                        tax: refundTaxAmount,
                        date: DateTime.now().toISO()
                    }
                }
            ], "STRIPE")

            // Restore inventory for refunded items
            logger.logMessage(`Restoring inventory for ${orderLineIdxs.length} refunded order lines`)
            const refundedQuantities = new Map<string, number>();
            for (const { orderLineIndex, priceLogEntry } of orderLineIdxs) {
                const line = order.lines[orderLineIndex];
                // Calculate refunded quantity from the price_log entry
                // The quantity is negative in the price_log for refunds
                const refundedQty = Math.abs(priceLogEntry.price.quantity);
                if (refundedQty > 0 && line.variantId) {
                    refundedQuantities.set(line.id, refundedQty);
                }
            }

            if (refundedQuantities.size > 0) {
                // Restore product inventory
                const { restore_orderline_quantities_webhook } = await import('../../graphql/order/inventory_utils');
                await restore_orderline_quantities_webhook(
                    order.lines,
                    refundedQuantities,
                    cosmos,
                    "STRIPE"
                );
                logger.logMessage(`Successfully restored product inventory for ${refundedQuantities.size} order lines`)
            }

            // Restore tour ticket inventory for refunded items
            logger.logMessage(`Checking for tour ticket inventory to restore`)
            const tourRefundedLines = orderLineIdxs.filter(({ orderLineIndex }) => {
                return order.lines[orderLineIndex].target === "TOUR-BOOKING";
            });

            if (tourRefundedLines.length > 0) {
                const { restore_ticket_inventory } = await import('../../graphql/eventandtour/utils/ticket_inventory');

                for (const { orderLineIndex, priceLogEntry } of tourRefundedLines) {
                    const line = order.lines[orderLineIndex];
                    const refundedQty = Math.abs(priceLogEntry.price.quantity);

                    if (refundedQty > 0) {
                        try {
                            logger.logMessage(`Restoring tour ticket inventory for line ${line.id}, quantity: ${refundedQty}`);

                            // Get the booking to find the tour
                            const bookingRef = line.forObject as recordref_type;
                            const booking = await cosmos.get_record<booking_type>(
                                bookingRef.container!,
                                bookingRef.id,
                                bookingRef.partition
                            );

                            // Get the session to find the tour
                            const sessionRef = (line as any).sessionRef as recordref_type;
                            const session = await cosmos.get_record<session_type>(
                                sessionRef.container!,
                                sessionRef.id,
                                sessionRef.partition
                            );

                            // Get the tour
                            const tour = await cosmos.get_record<any>(
                                session.forObject.container!,
                                session.forObject.id,
                                session.forObject.partition
                            );

                            // Find the variantId from the booking
                            const sessionBooking = booking.sessions.find((s: any) => s.ref.id === sessionRef.id);
                            if (!sessionBooking) {
                                logger.logMessage(`Warning: Could not find session booking for session ${sessionRef.id}`);
                                continue;
                            }

                            const ticket = sessionBooking.tickets.find((t: any) => t.id === (line as any).ticketId);
                            if (!ticket || !ticket.variantId) {
                                logger.logMessage(`Warning: Could not find ticket ${(line as any).ticketId} or missing variantId`);
                                continue;
                            }

                            // Restore inventory
                            const patches = restore_ticket_inventory(
                                tour,
                                ticket.variantId,
                                refundedQty,
                                metadata.orderId,
                                "STRIPE"
                            );

                            if (patches.length > 0) {
                                await cosmos.patch_record(
                                    "Main-Listing",
                                    tour.id,
                                    tour.vendorId,
                                    patches,
                                    "STRIPE"
                                );

                                logger.logMessage(`Successfully restored tour ticket inventory for variant ${ticket.variantId}. Quantity: ${refundedQty}`);
                            }
                        } catch (tourInventoryError) {
                            logger.logMessage(`Failed to restore tour ticket inventory for line ${line.id}: ${tourInventoryError.message}`);
                            // Continue processing other items even if one fails
                        }
                    }
                }

                logger.logMessage(`Successfully processed tour ticket inventory restoration for ${tourRefundedLines.length} tour lines`)
            }

            // we need a customerId to send the notification to the right group
            const customer = await cosmos.run_query<user_type>("Main-User", {
                query: `SELECT VALUE c FROM c WHERE c.email = @email`,
                parameters: [{ name: "@email", value: order.customerEmail }]
            }, true);
            if (customer.length == 0) throw `Could not find customer with email ${order.customerEmail}`
            const customerId = customer[0].id

            // now we need to send a real time data update request to the clients viewing the customers orders
            logger.logMessage(`Sending data notification to group customer-${customerId} to update the order ${order.id}`)
            signalR.addDataMessage("orders", { id: order.id, customerEmail: order.customerEmail }, { action: DataAction.UPSERT, group: `customer-${customerId}` })
            
            const item_summary = orderLineIdxs.map(x => {
                const line = order.lines[x.orderLineIndex]
                const priceLog = line.price_log[x.priceLogEntryIndex]
                return `${Math.abs(priceLog.price.quantity)} x ${line.descriptor}`
            }).join(", ");
            const item_summary_text = item_summary.length > 20 ? `${item_summary.substring(0, 20)}...` : item_summary

            signalR.addNotificationMessage(`Payment of ${formatCurrency(refundedCharge.amount_refunded, refundedCharge.currency)} for order ${order.code} has been refunded successfully. The funds should appear in the customer's account within 5–10 business days, depending on their bank.`, { group: `customer-${customerId}`, status: "success", persisted: "true" })
            signalR.addNotificationMessage(`Payment of ${formatCurrency(refundedCharge.amount_refunded, refundedCharge.currency)} for order ${order.code} (${item_summary_text}) has been refunded successfully. Refunds typically take 5–10 business days to process.`, { userId: customerId, status: "success", persisted: "true" })

        }
    }

    if (order.forObject?.container === "Main-Cases") {
        const caseFromDB = await cosmos.get_record<case_type>("Main-Cases", order.forObject.id, order.forObject.partition)

            await email.sendEmail(
            sender_details.from,
            order.customerEmail,
            "CASE_REFUND_SUCCESS_CUSTOMER",
            {
                case: { 
                    code: caseFromDB.code 
                },
                order: { 
                    code: order.code 
                }
            }
        )
    }

    logger.logMessage("Processed refund successfully.")

}

export default handler;
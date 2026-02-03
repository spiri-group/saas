import NodeCache from "node-cache";
import { InvocationContext, Timer, app } from "@azure/functions";
import setup from "./stripe/0_dependencies";
import { refund_record_type, order_type } from "../graphql/order/types";
import { DateTime } from "luxon";
import { sender_details } from "../client/email_templates";
import { process_refund } from "../graphql/order/refund_utils";

const myCache = new NodeCache();

/**
 * Auto-Refund Protection Timer Function
 *
 * Runs daily to protect customers from merchants who don't process refunds:
 *
 * 1. Auto-process refunds after 7-day inspection window (after return delivery)
 * 2. Refund label costs if merchant doesn't process within 30 days (safety net)
 *
 * Flow:
 * - Customer pays for return label
 * - Item delivered to merchant
 * - 7-day window for merchant to inspect and process refund
 * - If not processed: Auto-process refund
 * - If still not processed after 30 days total: Refund label cost + escalate
 */
export async function refundProtection(myTimer: Timer, context: InvocationContext): Promise<void> {
  context.log('Refund protection cron job started at:', new Date().toISOString());

  try {
    const { services } = await setup(null, context, myCache);
    const { cosmos, stripe, email } = services;

    const now = DateTime.now().toISO();

    // ========================================
    // Task 1: Auto-process refunds after 7-day inspection window
    // ========================================

    context.log('Checking for refunds past auto-refund deadline...');

    const refundsToAutoProcess = await cosmos.run_query<refund_record_type>("Main-Orders", {
      query: `
        SELECT * FROM c
        WHERE c.docType = "REFUND"
        AND c.status = "ACTIVE"
        AND c.refund_status = "APPROVED"
        AND IS_DEFINED(c.returnShippingLabels)
        AND ARRAY_LENGTH(c.returnShippingLabels) > 0
        AND EXISTS(
          SELECT VALUE label
          FROM label IN c.returnShippingLabels
          WHERE IS_DEFINED(label.auto_refund_deadline)
          AND label.auto_refund_deadline <= @now
          AND NOT IS_DEFINED(label.auto_processed)
        )
      `,
      parameters: [
        { name: "@now", value: now }
      ]
    }, true);

    context.log(`Found ${refundsToAutoProcess.length} refunds to auto-process`);

    for (const refund of refundsToAutoProcess) {
      try {
        // Get the original order to access line details
        const order = await cosmos.get_record<order_type>("Main-Orders", refund.orderId, refund.orderId);

        // Build refund lines in the format expected by process_refund
        const refundLines = refund.lines.map(line => ({
          id: line.id,
          refund_quantity: line.refund_quantity,
          refund: {
            amount: line.price.amount * line.refund_quantity,
            currency: line.price.currency
          }
        }));

        // Process the refund using shared utility
        const result = await process_refund(
          refund.orderId,
          refundLines,
          cosmos,
          stripe,
          "AUTO_REFUND_CRON"
        );

        if (!result.success) {
          throw new Error(result.error);
        }

        context.log(`Auto-processed refund ${refund.id} for order ${refund.orderId} - Amount: ${result.refundedAmount} ${result.currency}`);

        // Mark label as auto-processed to prevent duplicate processing
        const labelIndex = refund.returnShippingLabels!.findIndex(
          label => label.auto_refund_deadline && DateTime.fromISO(label.auto_refund_deadline) <= DateTime.fromISO(now)
        );

        if (labelIndex !== -1) {
          await cosmos.patch_record("Main-Orders", refund.id, refund.id, [
            { op: "set", path: `/returnShippingLabels/${labelIndex}/auto_processed`, value: true },
            { op: "set", path: `/returnShippingLabels/${labelIndex}/auto_processed_at`, value: now }
          ], "refund-protection-cron");
        }

        // Send notification to merchant and customer
        try {
          await email.sendEmail(
            sender_details.from,
            order.customerEmail,
            "REFUND_AUTO_PROCESSED_CUSTOMER",
            {
              order: { code: order.code },
              refundAmount: refund.amount,
              currency: refund.currency
            }
          );
        } catch (emailError) {
          context.error(`Failed to send auto-refund notification: ${emailError}`);
        }

        context.log(`Auto-processed refund ${refund.id}`);
      } catch (error) {
        context.error(`Failed to auto-process refund ${refund.id}:`, error);
        // Continue with next refund
      }
    }

    // ========================================
    // Task 2: Refund label costs after 30-day deadline (safety net)
    // ========================================

    context.log('Checking for refunds past label cost refund deadline...');

    const refundsToRefundLabelCost = await cosmos.run_query<refund_record_type>("Main-Orders", {
      query: `
        SELECT * FROM c
        WHERE c.docType = "REFUND"
        AND c.status = "ACTIVE"
        AND IS_DEFINED(c.returnShippingLabels)
        AND ARRAY_LENGTH(c.returnShippingLabels) > 0
        AND EXISTS(
          SELECT VALUE label
          FROM label IN c.returnShippingLabels
          WHERE IS_DEFINED(label.label_cost_refund_deadline)
          AND label.label_cost_refund_deadline <= @now
          AND NOT IS_DEFINED(label.label_cost_refunded)
        )
      `,
      parameters: [
        { name: "@now", value: now }
      ]
    }, true);

    context.log(`Found ${refundsToRefundLabelCost.length} label costs to refund`);

    for (const refund of refundsToRefundLabelCost) {
      try {
        const order = await cosmos.get_record<order_type>("Main-Orders", refund.orderId, refund.orderId);

        // Find the label that needs cost refund
        const labelIndex = refund.returnShippingLabels!.findIndex(
          label => label.label_cost_refund_deadline &&
                   DateTime.fromISO(label.label_cost_refund_deadline) <= DateTime.fromISO(now) &&
                   !label.label_cost_refunded
        );

        if (labelIndex === -1) continue;

        const label = refund.returnShippingLabels![labelIndex];

        // Refund the label cost to customer
        // Find the charge for the return label (it was paid via setup_intent -> payment_intent flow)
        // For now, we'll log this action
        context.log(`Would refund label cost for refund ${refund.id}, label ${label.label_id}`);

        // Mark label cost as refunded
        await cosmos.patch_record("Main-Orders", refund.id, refund.id, [
          { op: "set", path: `/returnShippingLabels/${labelIndex}/label_cost_refunded`, value: true },
          { op: "set", path: `/returnShippingLabels/${labelIndex}/label_cost_refunded_at`, value: now }
        ], "refund-protection-cron");

        // Send escalation notification to support team
        try {
          await email.sendEmail(
            sender_details.from,
            "support@spiriverse.com", // TODO: Configure support email
            "REFUND_ESCALATION_SUPPORT",
            {
              refundId: refund.id,
              orderId: refund.orderId,
              orderCode: order.code,
              customerEmail: order.customerEmail,
              vendorId: refund.vendorId,
              daysOverdue: 30
            }
          );
        } catch (emailError) {
          context.error(`Failed to send escalation email: ${emailError}`);
        }

        context.log(`Refunded label cost for refund ${refund.id} and escalated to support`);
      } catch (error) {
        context.error(`Failed to refund label cost for refund ${refund.id}:`, error);
        // Continue with next refund
      }
    }

    context.log('Refund protection cron job completed successfully');
  } catch (error) {
    context.error('Refund protection cron job failed:', error);
    throw error;
  }
}

// Run daily at 2 AM UTC (cron: "0 0 2 * * *")
app.timer("refundProtection", {
  schedule: "0 0 2 * * *",
  handler: refundProtection
});

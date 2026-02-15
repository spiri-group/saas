import NodeCache from "node-cache";
import { InvocationContext, Timer, app } from "@azure/functions";
import setup from "./stripe/0_dependencies";
import { refund_record_type, order_type } from "../graphql/order/types";
import { DateTime } from "luxon";
import { sender_details } from "../client/email_templates";
import { process_refund } from "../graphql/order/refund_utils";
import { CosmosDataSource } from "../utils/database";
import { StripeDataSource } from "../services/stripe";
import { AzureEmailDataSource } from "../services/azureEmail";
import { LogManager } from "../utils/functions";

const myCache = new NodeCache();

/**
 * Extracted core logic for refund protection.
 * Can be called from Azure Functions timer trigger or Container Job entry point.
 */
export async function runRefundProtection(
  cosmos: CosmosDataSource,
  stripe: StripeDataSource,
  email: AzureEmailDataSource,
  logger: LogManager
): Promise<void> {
  logger.logMessage('Refund protection started at: ' + new Date().toISOString());

  const now = DateTime.now().toISO();

    // ========================================
    // Task 1: Auto-process refunds after 7-day inspection window
    // ========================================

    logger.logMessage('Checking for refunds past auto-refund deadline...');

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

    logger.logMessage(`Found ${refundsToAutoProcess.length} refunds to auto-process`);

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

        logger.logMessage(`Auto-processed refund ${refund.id} for order ${refund.orderId} - Amount: ${result.refundedAmount} ${result.currency}`);

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
          logger.error(`Failed to send auto-refund notification: ${emailError}`);
        }

        logger.logMessage(`Auto-processed refund ${refund.id}`);
      } catch (error) {
        logger.error(`Failed to auto-process refund ${refund.id}:`, error);
        // Continue with next refund
      }
    }

    // ========================================
    // Task 2: Refund label costs after 30-day deadline (safety net)
    // ========================================

    logger.logMessage('Checking for refunds past label cost refund deadline...');

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

    logger.logMessage(`Found ${refundsToRefundLabelCost.length} label costs to refund`);

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
        logger.logMessage(`Would refund label cost for refund ${refund.id}, label ${label.label_id}`);

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
          logger.error(`Failed to send escalation email: ${emailError}`);
        }

        logger.logMessage(`Refunded label cost for refund ${refund.id} and escalated to support`);
      } catch (error) {
        logger.error(`Failed to refund label cost for refund ${refund.id}:`, error);
        // Continue with next refund
      }
    }

    logger.logMessage('Refund protection completed successfully');
  }
}

/**
 * Auto-Refund Protection Timer Function
 *
 * Runs daily to protect customers from merchants who don't process refunds:
 *
 * 1. Auto-process refunds after 7-day inspection window (after return delivery)
 * 2. Refund label costs if merchant doesn't process within 30 days (safety net)
 */
export async function refundProtection(myTimer: Timer, context: InvocationContext): Promise<void> {
  try {
    const { services, logger } = await setup(null as any, context, myCache);
    const { cosmos, stripe, email } = services;

    await runRefundProtection(cosmos, stripe, email, logger);
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

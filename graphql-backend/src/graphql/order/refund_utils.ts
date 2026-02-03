/**
 * Shared refund processing utilities
 *
 * These functions are used by both:
 * - The refund_order GraphQL mutation (manual merchant refunds)
 * - The auto-refund cron job (automatic customer protection)
 */

import { v4 as uuidv4 } from "uuid";
import { DateTime } from "luxon";
import { groupBy } from "../../utils/functions";
import { order_type } from "./types";
import { vendor_type } from "../vendor/types";
import { currency_amount_type, recordref_type } from "../0_shared/types";
import { CosmosDataSource } from "../../utils/database";
import { StripeDataSource } from "../../services/stripe";
import { restore_orderline_quantities_webhook } from "./inventory_utils";

export type RefundLineInput = {
  id: string;
  refund_quantity?: number;
  refund: currency_amount_type;
};

export type ProcessRefundResult = {
  success: boolean;
  refundedAmount: number;
  currency: string;
  stripeRefundIds: string[];
  error?: string;
};

/**
 * Process a refund for an order
 *
 * This is the core refund logic shared between:
 * - Manual merchant-initiated refunds (refund_order mutation)
 * - Automatic customer protection refunds (cron job)
 *
 * @param orderId - The order ID to refund
 * @param lines - The lines to refund with quantities and amounts
 * @param cosmos - Cosmos DB data source
 * @param stripe - Stripe data source
 * @param triggeredBy - Who/what triggered this refund (e.g., "MERCHANT", "AUTO_REFUND_CRON")
 * @returns Result indicating success/failure and details
 */
export const process_refund = async (
  orderId: string,
  lines: RefundLineInput[],
  cosmos: CosmosDataSource,
  stripe: StripeDataSource,
  triggeredBy: string = "MERCHANT"
): Promise<ProcessRefundResult> => {
  try {
    const order = await cosmos.get_record<order_type>("Main-Orders", orderId, orderId);
    const patchOperations: {
      op: "add" | "set" | "remove";
      path: string;
      value: any;
    }[] = [];

    // Track refunded quantities for inventory restoration
    const refundedQuantities = new Map<string, number>();
    const stripeRefundIds: string[] = [];
    let totalRefunded = 0;
    let refundCurrency = "";

    // Enrich lines with merchant and charge information
    let enriched_lines = lines.map((line) => {
      const lineIndex = order.lines.findIndex((x) => x.id == line.id);
      if (lineIndex == -1) throw `Could not find line with id ${line.id}`;

      // Track refunded quantity for inventory restoration
      if (line.refund_quantity && line.refund_quantity > 0) {
        refundedQuantities.set(line.id, line.refund_quantity);
      }

      return {
        ...line,
        merchantId: order.lines[lineIndex].merchantId,
        chargeId: order.payments.find(
          (x) => x.id == order.lines[lineIndex].price_log[0].paymentId
        ).stripe_chargeId,
      };
    });

    const grouped_lines = groupBy(enriched_lines, (x) => x.merchantId);

    for (let [merchantId, refundedLines] of Object.entries(grouped_lines)) {
      // Group by charge ID so we only raise one refund per charge
      let grouped_by_charge_lines = groupBy(refundedLines, (x) => x.chargeId);

      for (let [chargeId, refundedLines] of Object.entries(grouped_by_charge_lines)) {
        let refund_total = 0;
        let impactedLines: {
          lineId: string;
          priceLogId: string;
        }[] = [];

        // Mark each line as refunded in the database
        for (let refundedLine of refundedLines) {
          const lineIndex = order.lines.findIndex((x) => x.id == refundedLine.id);
          const priceToDate = {
            principal: order.lines[lineIndex].price_log.reduce(
              (prev, curr) => prev + curr.price.amount * curr.price.quantity,
              0
            ),
            tax: order.lines[lineIndex].price_log.reduce(
              (prev, curr) => prev + curr.tax.amount,
              0
            ),
          };
          const totalToDate = priceToDate.principal + priceToDate.tax;

          const priceLogId = uuidv4();

          // Calculate tax amount by looking at the tax component of the price to date
          const taxPercent = totalToDate == 0 ? 0 : priceToDate.tax / totalToDate;
          const tax = {
            amount: Math.round(refundedLine.refund.amount * taxPercent),
            currency: refundedLine.refund.currency,
          };
          let price = {
            amount: refundedLine.refund.amount - tax.amount,
            currency: refundedLine.refund.currency,
            quantity: -1,
          };

          patchOperations.push({
            op: "add",
            path: `/lines/${lineIndex}/price_log/0`,
            value: {
              id: priceLogId,
              datetime: DateTime.now().toISO(),
              type:
                refundedLine.refund.amount === totalToDate
                  ? "FULL_REFUND"
                  : "PARTIAL_REFUND",
              status: "PENDING",
              price,
              tax,
            },
          });

          refund_total += refundedLine.refund.amount;
          totalRefunded += refundedLine.refund.amount;
          refundCurrency = refundedLine.refund.currency;
          impactedLines.push({ lineId: refundedLine.id, priceLogId });
        }

        const merchant = await cosmos.get_record<vendor_type>(
          "Main-Vendor",
          merchantId,
          merchantId
        );

        // Raise the refund in Stripe
        const stripeResp = await stripe
          .asConnectedAccount(merchant.stripe.accountId)
          .callApi("POST", `refunds`, {
            charge: chargeId,
            amount: refund_total,
            metadata: {
              orderId: order.id,
              customerEmail: order.customerEmail,
              triggeredBy,
            },
          });

        stripeRefundIds.push(stripeResp.data.id);

        // Add the Stripe refund ID to each line's price log
        for (let patchOp of patchOperations) {
          patchOp.value.stripe_refundId = stripeResp.data.id;
        }
      }
    }

    // Apply all patch operations to the order
    await cosmos.patch_record("Main-Orders", orderId, orderId, patchOperations, triggeredBy);

    // Restore inventory for refunded items
    if (refundedQuantities.size > 0) {
      await restore_orderline_quantities_webhook(
        order.lines,
        refundedQuantities,
        cosmos,
        triggeredBy
      );
    }

    return {
      success: true,
      refundedAmount: totalRefunded,
      currency: refundCurrency,
      stripeRefundIds,
    };
  } catch (error) {
    return {
      success: false,
      refundedAmount: 0,
      currency: "",
      stripeRefundIds: [],
      error: error.message || String(error),
    };
  }
};

import NodeCache from "node-cache";
import { HttpRequest, HttpResponseInit, InvocationContext, app, output } from "@azure/functions";
import { isNullOrWhiteSpace } from "../utils/functions";
import setup, { StripeHandler } from "./stripe/0_dependencies";

import setupIntentSucceeded from "./stripe/setup_intent_succeeded";
import chargeRefunded from "./stripe/charge_refunded";
import invoicePaid from "./stripe/invoice_paid";
import paymentIntentSucceeded from "./stripe/payment_intent_succeeded/index";
import invoicePaymentFailed from "./stripe/invoice_payment_failed";
import payoutPaid from "./stripe/payout_paid";

import Stripe from "stripe";
import { createPlatformAlertDirect, AlertType, AlertSeverity } from "../graphql/platform-alert/helper";

const handler_mapping: Record<string, StripeHandler> = {
    "charge.refunded": chargeRefunded,
    "invoice.paid": invoicePaid,
    "invoice_payment.failed": invoicePaymentFailed,
    "payment_intent.succeeded": paymentIntentSucceeded,
    "payout.paid": payoutPaid,
    "setup_intent.succeeded": setupIntentSucceeded
}

const myCache = new NodeCache();

export async function payments(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  let services: Awaited<ReturnType<typeof setup>>['services'] | null = null;
  let event: Stripe.Event | null = null;

  try {
    const setupResult = await setup(request, context, myCache);
    services = setupResult.services;
    const { logger, keyVault } = setupResult;

    const rawBody = await request.text();
    const sigHeader = request.headers.get('stripe-signature');
    const webhookSecret_account = await keyVault.get("stripe-webhook-account-secret");
    const webhookSecret_connect = await keyVault.get("stripe-webhook-connect-secret");

    let eventError: any = null;
    try {
      event = Stripe.webhooks.constructEvent(rawBody, sigHeader, webhookSecret_account);
    } catch (err1) {
      try {
        event = Stripe.webhooks.constructEvent(rawBody, sigHeader, webhookSecret_connect);
      } catch (err2) {
        eventError = err2;
      }
    }

    if (!event) {
      context.error("Failed to construct Stripe event from webhook payload.", eventError);

      // Create alert for invalid webhook signature
      await createPlatformAlertDirect(services.cosmos, {
        alertType: AlertType.WEBHOOK_FAILURE,
        severity: AlertSeverity.HIGH,
        title: 'Invalid Stripe Webhook Signature',
        message: 'Failed to validate Stripe webhook signature. This could indicate a misconfiguration or a security issue.',
        context: {
          errorMessage: eventError?.message || 'Signature validation failed',
          additionalData: {
            sigHeader: sigHeader ? 'present' : 'missing'
          }
        },
        source: {
          component: 'stripe-webhook-handler',
          environment: process.env.AZURE_FUNCTIONS_ENVIRONMENT || 'production'
        }
      });

      return {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          success: false,
          message: "Invalid webhook signature"
        })
      };
    }

    // Log the webhook event being processed
    context.log(`[Stripe Webhook] Processing event: ${event.type} (ID: ${event.id})`);
    context.log(`[Stripe Webhook] Event data:`, JSON.stringify(event.data.object, null, 2).substring(0, 500));

    const handler = handler_mapping[event.type];
    if (!handler) {
      context.warn(`[Stripe Webhook] No handler found for event type: ${event.type}`);
      return {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: true, message: `No handler for event type: ${event.type}` })
      };
    }

    context.log(`[Stripe Webhook] Calling handler for: ${event.type}`);
    await handler(event, logger, services);
    context.log(`[Stripe Webhook] Handler completed for: ${event.type}`);

    context.extraOutputs.set('signalR', services.signalR.messages)

    return {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            success: true,
            message: 'Webhook processed succesfully'
        })
    }
  } catch (error) {
    context.error(`Error processing webhook: ${error.message}`, error);

    // Create platform alert for webhook failure (if services are available)
    if (services?.cosmos) {
      await createPlatformAlertDirect(services.cosmos, {
        alertType: AlertType.WEBHOOK_FAILURE,
        severity: AlertSeverity.CRITICAL,
        title: `Stripe Webhook Handler Failed: ${event?.type || 'unknown'}`,
        message: error.message || 'An error occurred while processing the Stripe webhook',
        context: {
          errorMessage: error.message,
          stackTrace: error.stack,
          additionalData: {
            eventType: event?.type,
            eventId: event?.id,
            eventObject: event?.data?.object ? JSON.stringify(event.data.object).substring(0, 500) : undefined
          }
        },
        source: {
          component: 'stripe-webhook-handler',
          environment: process.env.AZURE_FUNCTIONS_ENVIRONMENT || 'production'
        }
      });
    }

    return {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: false,
        message: !isNullOrWhiteSpace(error.message) ? error.message : "An error occurred while processing the webhook"
      })
    }
  }
}

const goingOutToSignalR = output.generic({
    type: 'signalR',
    name: 'signalR',
    hubName: 'serverless',
    connectionStringSetting: 'AzureSignalRConnectionString',
});

app.http("payments", {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: payments,
    extraOutputs: [goingOutToSignalR]
});
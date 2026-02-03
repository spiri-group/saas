import NodeCache from "node-cache";
import { HttpRequest, HttpResponseInit, InvocationContext, app, output } from "@azure/functions";
import { isNullOrWhiteSpace } from "../utils/functions";
import setup, { ShipEngineHandler } from "./shipengine/0_depedencies";
import trackHandler from "./shipengine/track";
import { ShipEngineEvent } from "../services/shipengine/types";
import { extractSignatureHeaders, verifyShipEngineSignature } from "./shipengine/signature";

const myCache = new NodeCache();

const handler_mapping: Record<string, ShipEngineHandler> = {
    "API_TRACK": trackHandler
}

export async function logistics(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    // Get raw body BEFORE parsing (required for signature verification)
    const rawBody = await request.text();

    // Extract signature headers
    const signatureHeaders = extractSignatureHeaders(request.headers);

    // If signature headers are missing, return 404 to hide endpoint existence
    if (!signatureHeaders.signature || !signatureHeaders.keyId || !signatureHeaders.timestamp) {
      context.warn("ShipEngine webhook missing signature headers - returning 404");
      return {
        status: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Not found" })
      };
    }

    // Verify the signature using RSA-SHA256
    try {
      await verifyShipEngineSignature(rawBody, signatureHeaders);
      context.log("ShipEngine webhook signature verified successfully");
    } catch (signatureError) {
      context.error(`ShipEngine signature verification failed: ${signatureError.message}`);
      return {
        status: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, message: "Unauthorized" })
      };
    }

    // ⚙️ Init dependencies
    const { services, logger } = await setup(request, context, myCache);

    // 📦 Parse body (from raw string since we already read it)
    const body = JSON.parse(rawBody) as ShipEngineEvent;

    const { resource_type } = body;

    // 🧭 Dispatch to handler
    const handler = handler_mapping[resource_type];
    if (!handler) {
      logger.warn(`Unhandled ShipEngine webhook resource_type: ${resource_type}`);
      return {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: true, message: `No handler for ${resource_type}` })
      };
    }

    await handler(body, logger, services);

    // 📡 Send SignalR messages if any
    context.extraOutputs.set('signalR', services.signalR.messages);

    return {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, message: "Webhook processed successfully" })
    };
  } catch (error) {
    const message = !isNullOrWhiteSpace(error?.message) ? error.message : "An error occurred while processing the webhook";
    context.error(`Error processing logistics webhook: ${message}`, error);
    return {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, message })
    };
  }
}

// 🔌 Optional SignalR broadcast
const goingOutToSignalR = output.generic({
  type: 'signalR',
  name: 'signalR',
  hubName: 'serverless',
  connectionStringSetting: 'AzureSignalRConnectionString',
});

// 🔗 Azure Function binding
app.http("logistics", {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: logistics,
  extraOutputs: [goingOutToSignalR]
});

import { find_shipment_index } from "../../graphql/logistics";
import { ShipEngineEvent, ShipEngineTrackingUpdate } from "../../services/shipengine/types";
import { DataAction } from "../../services/signalR";
import { LogManager } from "../../utils/functions";
import { Services } from "./0_depedencies";
import { recordref_type } from "../../graphql/0_shared/types";
import { order_type, orderLine_type, refund_record_type } from "../../graphql/order/types";
import { CosmosDataSource } from "../../utils/database";
import { DateTime } from "luxon";

const trackHandler = async (
  event: ShipEngineEvent<ShipEngineTrackingUpdate>,
  logger: LogManager,
  services: Services
) => {
  const params = event.resource_url.split("?")[1];
  const [carrier_code, tracking_number] = params.split("&").map(param => param.split("=")[1]);

  const {
    status_code,
    status_description,
    carrier_status_description,
    events
  } = event.data;

  logger.logMessage(`ShipEngine update: ${carrier_code} ${tracking_number} — ${status_description}`);

  // 🎯 Step 1: Lookup order with matching tracking number
  const order = await services.cosmos.run_query<{
    id: string;
    customerEmail: string;
    shipmentId: string;
    merchantId: string;
  }>(
    "Main-Orders",
    {
      query: `
        SELECT c.id, c.customerEmail, s.id AS shipmentId, s.sendFrom.vendorId AS merchantId
        FROM c
        JOIN s IN c.shipments
        WHERE s.label.tracking_number = @trackingNumber
          AND s.label.carrier_code = @carrierCode
          AND (
            IS_DEFINED(s.trackingStatus) = false OR s.trackingStatus = null 
            OR s.trackingStatus.status_code != "DE" 
            OR s.trackingStatus.status_code = null
          )
      `,
      parameters: [
        { name: "@trackingNumber", value: tracking_number },
        { name: "@carrierCode", value: carrier_code }
      ]
    },
    true
  );

  if (!order || order.length === 0) {
    logger.warn(`No order found for tracking number: ${tracking_number}`);
    return;
  }

  const orderRef = {
    id: order[0].id,
    partition: [order[0].customerEmail]
  }

  // 🧠 Step 2: Retrieve full order to locate shipment index
  const shipmentIdx = await find_shipment_index(services.cosmos, orderRef, order[0].shipmentId);

  if (shipmentIdx === -1) {
    logger.warn(`No shipment index found for tracking number: ${tracking_number}`);
    return;
  }

  // 🛠️ Step 3: Build tracking status
  const latestEvent = events?.[0]; // assuming reverse-chronological order

  if (!latestEvent) {
    logger.warn(`No events found for tracking number: ${tracking_number}`);
    return;
  }

  const trackingStatus = {
      ...latestEvent,
      description: carrier_status_description || status_description,
      status_code,
      status_description,
      lastUpdatedAt: new Date().toISOString(),
      triggered_by: 'carrier',
      triggered_at: new Date().toISOString(),
      status_source: 'carrier'
  }

  await services.cosmos.patch_record(
    "Main-Orders",
    orderRef.id,
    orderRef.partition,
    [
        {
        op: "set",
        path: `/shipments/${shipmentIdx}/trackingStatus`,
        value: trackingStatus
        }
    ],
    "shipengine-webhook"
  );

  // Track received quantities when delivered
  if (status_code === "DE") {  // Delivered
    await mark_orderlines_as_received(orderRef, order[0].shipmentId, services.cosmos);
  }

  // Check if this is a return label delivery and update auto-refund deadlines
  if (status_code === "DE") {  // Delivered
    await handle_return_label_delivery(tracking_number, carrier_code, services.cosmos, logger);
  }

  services.signalR.addDataMessage(
    "delivery",
    { id: order[0].shipmentId, orderRef, trackingStatus },
    { group: `${order[0].merchantId}-deliveries`, action: DataAction.UPSERT },
  )

  logger.logMessage(`Updated trackingStatus for shipment ${order[0].shipmentId} on order ${orderRef.id}`);
};

// Mark orderlines as received when delivery is confirmed
export const mark_orderlines_as_received = async (
  orderRef: recordref_type,
  shipmentId: string,
  cosmos: CosmosDataSource,
  source: string = "shipengine-webhook"
) => {
  const containerName = "Main-Listing";
  const now = new Date().toISOString();

  try {
    // Get the full order to access shipment and line details
    const order = await cosmos.get_record<order_type>("Main-Orders", orderRef.id, orderRef.id);
    const shipment = order.shipments?.find(s => s.id === shipmentId);

    if (!shipment || !shipment.finalizedConfiguration) {
      console.warn(`No finalized shipment found for shipment ${shipmentId}`);
      return;
    }

    const packedItems = shipment.finalizedConfiguration.boxes
      .flatMap(box => box.items) || [];

    for (const item of packedItems) {
      if (!item.variantId || !shipment.sendFrom.vendorId) continue;

      try {
        const transactionId = `invt:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const transaction = {
          id: transactionId,
          docType: "transaction",
          vendorId: shipment.sendFrom.vendorId,
          product_id: (item.forObject as recordref_type).id,
          variant_id: item.variantId,
          delta: 0, // No qty change, just tracking received status
          qty_before: 0,
          qty_after: 0,
          reason: "RECEIVED",
          source: "DELIVERY",
          reference_id: shipmentId,
          notes: `Customer received ${item.quantity} units via shipment ${shipment.code}`,
          created_at: now,
          created_by: "shipengine-webhook"
        };

        await cosmos.add_record(containerName, transaction, shipment.sendFrom.vendorId, source);
      } catch (error) {
        console.error(`Failed to track received status for variant ${item.variantId}:`, error);
        // Continue processing other items even if one fails
      }
    }
  } catch (error) {
    console.error(`Failed to mark orderlines as received for shipment ${shipmentId}:`, error);
  }
};

// Handle return label delivery and set auto-refund deadlines
export const handle_return_label_delivery = async (
  tracking_number: string,
  carrier_code: string,
  cosmos: CosmosDataSource,
  logger: LogManager
) => {
  try {
    // Find refund with matching return label tracking number
    const refunds = await cosmos.run_query<refund_record_type>("Main-Orders", {
      query: `
        SELECT * FROM c
        WHERE c.docType = "REFUND"
        AND c.status = "ACTIVE"
        AND IS_DEFINED(c.returnShippingLabels)
        AND ARRAY_LENGTH(c.returnShippingLabels) > 0
        AND EXISTS(
          SELECT VALUE label
          FROM label IN c.returnShippingLabels
          WHERE label.tracking_number = @trackingNumber
          AND label.carrier_code = @carrierCode
        )
      `,
      parameters: [
        { name: "@trackingNumber", value: tracking_number },
        { name: "@carrierCode", value: carrier_code }
      ]
    }, true);

    if (refunds.length === 0) {
      logger.logMessage(`No refund found with return tracking number: ${tracking_number}`);
      return;
    }

    const refund = refunds[0];
    const labelIndex = refund.returnShippingLabels!.findIndex(
      label => label.tracking_number === tracking_number && label.carrier_code === carrier_code
    );

    if (labelIndex === -1) {
      logger.warn(`Label not found in returnShippingLabels array`);
      return;
    }

    // Calculate auto-refund deadline (7 days after delivery)
    const deliveredAt = new Date().toISOString();
    const autoRefundDeadline = DateTime.fromISO(deliveredAt).plus({ days: 7 }).toISO();

    // Update the label with delivery tracking
    await cosmos.patch_record("Main-Orders", refund.id, refund.id, [
      { op: "set", path: `/returnShippingLabels/${labelIndex}/delivered_at`, value: deliveredAt },
      { op: "set", path: `/returnShippingLabels/${labelIndex}/auto_refund_deadline`, value: autoRefundDeadline }
    ], "shipengine-webhook");

    logger.logMessage(`Return label delivered for refund ${refund.id}. Auto-refund deadline set to ${autoRefundDeadline}`);
  } catch (error) {
    logger.warn(`Failed to handle return label delivery: ${error}`);
    // Don't throw - tracking failure shouldn't break the webhook
  }
};

export default trackHandler;

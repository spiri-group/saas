import { serverContext } from "../../services/azFunction";
import { CosmosDataSource } from "../../utils/database";
import { decodeAmountFromSmallestUnit, distinctBy, encodeAmountToSmallestUnit, flatten, generate_human_friendly_id, groupBy, isNullOrUndefined, isNullOrWhiteSpace } from "../../utils/functions";
import { currency_amount_type, recordref_type } from "../0_shared/types";
import { restore_price_on_lines, restore_target_on_lines_async } from "../order";
import { order_type, orderLine_type } from "../order/types";
import convert from "convert-units";
import { merchantLocation_type } from "../vendor/types";
import { address_details_type } from "../user/types";
import { ShipEngineDataSource } from "../../services/shipengine";
import { v4 as uuidv4 } from "uuid";
import { ExchangeRateDataSource } from "../../services/exchangeRate";
import { calcStripeFees } from "../0_shared";
import { packed_box_type, items_with_dimensions, carrier_option_type, shipment_type, rate_record_type } from "./types";
import { buffers, pack_by_box_sources } from "./functions/packing";
import { box_sources } from "./functions/packing";
import { detectDeviation } from "./functions/detectDeviation";
import { isContext } from "vm";
import { DataAction } from "../../services/signalR";
import { mark_orderlines_as_received } from "../../functions/shipengine/track";

const resolvers = {
    Query: {
      availableBoxSizes: async (_, { merchantId }, { cosmos }: { cosmos: CosmosDataSource }) => {
        const merchantBoxSizes = await cosmos.run_query(
          "Main-VendorSettings",
          {
            query: `SELECT * FROM c WHERE c.type = @type AND c.merchantId = @merchantId`,
            parameters: [
              { name: "@type", value: "BOX_SIZES" },
              { name: "@merchantId", value: merchantId },
            ],
          },
          true
        );

        if (merchantBoxSizes.length > 0) {
          return merchantBoxSizes.map((box) => ({
            name: box.name,
            dimensions_cm: box.dimensions_cm,
            max_weight_kg: box.max_weight_kg,
          }));
        }

        return box_sources["Australia Post"].map((box) => ({
          name: box.name,
          dimensions_cm: box.dimensions_cm,
          max_weight_kg: box.max_weight_kg,
        }));
      },
      delivery: async (
        _,
        { orderRef, shipmentId }: { orderRef: recordref_type; shipmentId: string },
        { dataSources: { cosmos }, userId }: serverContext
      ) => {
        if (!userId) throw new Error("User not logged in");

        const order = await cosmos.get_record<order_type>("Main-Orders", orderRef.id, orderRef.id);
        const shipment = order.shipments?.find(s => s.id === shipmentId);
        if (!shipment) throw new Error("Delivery (shipment) not found");

        return {
          ...shipment,
          orderRef,
        };
      },
      deliveries: async (
        _,
        { merchantId, statusCode, fromDate, toDate, isFinalized },
        { dataSources, userId }: serverContext
      ) => {
        if (!userId) throw new Error("User not logged in");

        const { cosmos } = dataSources;

        // Step 1: Fetch orders with at least one shipment from merchantId
        const orders = await cosmos.run_query<any>("Main-Orders", {
          query: `
            SELECT DISTINCT VALUE c
            FROM c
            JOIN s IN c.shipments
            WHERE IS_DEFINED(s.sendFrom) 
              AND IS_DEFINED(s.sendFrom.vendorId)
              AND s.sendFrom.vendorId = @merchantId
              AND (NOT IS_DEFINED(s.reviewed_at) OR IS_NULL(s.reviewed_at))
          `,
          parameters: [{ name: "@merchantId", value: merchantId }],
        }, true);

        // Step 2: Flatten + filter shipments
        const shipments = orders.flatMap(order =>
          (order.shipments || [])
            .filter(shipment =>
              shipment.sendFrom?.vendorId === merchantId &&
              (isFinalized === undefined || shipment.isFinalized) &&
              (!statusCode || shipment.label?.tracking_status === statusCode) &&
              (!fromDate || new Date(shipment.label?.ship_date ?? 0) >= new Date(fromDate)) &&
              (!toDate || new Date(shipment.label?.ship_date ?? 0) <= new Date(toDate))
            )
            .map(shipment => ({
              ...shipment,
              orderRef: {
                id: order.id,
                partition: [order.customerEmail]
              },
            }))
        );

        return shipments;
      }
    },
    Mutation: {
        generate_shipments: async (_:any, { orderRef }: { orderRef: recordref_type }, { dataSources, userId }: serverContext) => {
            if (!userId) throw new Error("User not logged in")    
            const { cosmos, shipEngine, exchangeRate } = dataSources as { cosmos: CosmosDataSource, shipEngine: ShipEngineDataSource, exchangeRate: ExchangeRateDataSource };
            
            const order_result = await cosmos.run_query<{
                lines: orderLine_type[],
                userId: string,
                shipping: {
                  name: string,
                  addressComponents: address_details_type
                }
            }>("Main-Orders", {
              query: `
                SELECT c.lines, c.userId, c.shipping
                FROM c
                WHERE c.id = @orderId
              `,
              parameters: [
                { name: "@orderId", value: orderRef.id }
              ]
            }, true)
            if (order_result.length === 0) throw new Error("Order not found")
            const order = order_result[0]
            
            if (order.shipping === null) throw new Error("Order has no shipping address")

            const {
              currency: user_currency
            } = await cosmos.get_scalar<{
              currency: string
            }>("Main-User", "id", "currency", order.userId, order.userId);
            
            const sendTo = {
              id: order.userId,
              name: `${order.shipping.name}`,
              ...order.shipping.addressComponents
            }

            // we need to fix up lines to make sure it has a quantity on each as we need to total the price_log
            order.lines = order.lines.map(line => {
              return {
                ...line,
                quantity: line.price_log.filter(log => log.type === "CHARGE" && log.status !== "failed")
                              .reduce((acc, log) => acc + log.price.quantity, 0)
              }
            })

            // Filter out service lines - only physical products need shipping
            const shippableLines = order.lines.filter(line =>
              line.target?.startsWith("PRODUCT-PURCHASE") &&
              !isNullOrWhiteSpace(line.variantId)
            );

            if (shippableLines.length === 0) {
              // No physical products to ship - return empty shipments
              return [];
            }

            // our various shipments
            const shipments = await prepare_shipments_by_origin(user_currency, sendTo, shippableLines, cosmos, shipEngine, exchangeRate);
            
            // we'll save this against the order in the db
            await cosmos.patch_record("Main-Orders", orderRef.id, orderRef.id, [
              { op: "add", path: "/shipments", value: shipments },
            ], userId)

            return shipments
        },
        set_rate_for_shipment: async (_: any, { orderRef, shipmentId, rateId}: { orderRef: recordref_type, shipmentId: string, rateId: string}, { dataSources: { cosmos }, userId } : serverContext) => {
            if (!orderRef || !shipmentId || !rateId) throw new Error("Missing parameters")
            if (!orderRef.id) throw new Error("Missing order id")
            if (!orderRef.partition) throw new Error("Missing order partition")

            // now we will remove the other rates and only leave the selected one
            // so we just override the shipment with the selected rate id

            // we need to work out the shipmentIdx in cosmos
            const shipment_result = await cosmos.run_query<string>("Main-Orders", {
                query: `SELECT VALUE s.id FROM c JOIN s in c.shipments WHERE c.id = @orderId`,
                parameters: [
                    { name: "@orderId", value: orderRef.id },
                    { name: "@shipmentId", value: shipmentId }
                ]
            }, true)
            if (shipment_result.length === 0) throw new Error("Order has no shipments")
            const shipmentIdx = shipment_result.findIndex((s: any) => s === shipmentId)
            if (shipmentIdx === -1) throw new Error("Shipment not found")

            // get the rate from the shipment
            const rate_result = await cosmos.run_query<carrier_option_type>("Main-Orders", {
                query: `SELECT VALUE co FROM c JOIN s in c.shipments JOIN co in s.carrierOptions WHERE c.id = @orderId AND s.id = @shipmentId AND co.rate_id = @rateId`,
                parameters: [
                    { name: "@orderId", value: orderRef.id },
                    { name: "@shipmentId", value: shipmentId },
                    { name: "@rateId", value: rateId }
                ]
            }, true)
            if (rate_result.length === 0) throw new Error("Rate not found")
            const rate = rate_result[0]
            if (!rate) throw new Error("Rate not found")
            
            await cosmos.patch_record("Main-Orders", orderRef.id, orderRef.id, [
              { op: "set", 
                path: `/shipments/${shipmentIdx}/carrierInfo`, 
                value: {
                  rate_id: rate.rate_id,
                  code: rate.carrier_code,
                  name: rate.carrier_friendly_name,
                  service: {
                    code: rate.service_code,
                    name: rate.service_type,
                    delivery_days: rate.delivery_days
                  }
                } 
              },
              {
                op: "set",
                path: `/shipments/${shipmentIdx}/configuration`,
                value: {
                  boxes: rate.boxes,
                  pricing: {
                    tax_amount: rate.tax_amount,
                    subtotal_amount: rate.total_rate
                  }
                }
              },
              {
                op: "set",
                path: `/shipments/${shipmentIdx}/suggestedConfiguration`,
                value: {
                  source: `${rate.carrier_code}|${rate.service_code}`,
                  boxes: rate.boxes.map((box) => ({
                    id: uuidv4(),
                    code: box.code,
                    label: box.label,
                    dimensions_cm: box.dimensions_cm,
                    max_weight_kg: box.max_weight_kg,
                    volume: box.volume,
                    items: box.items.map(item => ({
                      id: item.id,
                      forObject: item.forObject,
                      variantId: item.variantId,
                      quantity: item.quantity,
                      weight: item.weight,
                      name: item.name,
                      price: item.price
                    })),
                    used_volume: box.used_volume,
                    used_weight: box.used_weight
                  })),
                  pricing: {
                    tax_amount: rate.tax_amount,
                    subtotal_amount: rate.total_rate
                  },
                  delivery_days: rate.delivery_days,
                  estimated_delivery_date: rate.estimated_delivery_date
                }
              }

            ], userId)
            
            return rate
        },
        submit_packed_boxes_for_estimate: async (_: any, 
        { orderRef, shipmentId, packedBoxes, serviceCode, carrierCode, sendFrom, sendTo }: { 
          orderRef: recordref_type;
          shipmentId: string;
          packedBoxes: packed_box_type[], 
          serviceCode: string, 
          carrierCode: string, 
          sendFrom: address_details_type & { name: string }, 
          sendTo: address_details_type & { name: string } 
        }, { dataSources, userId }: serverContext) => {
          const { shipEngine, exchangeRate, cosmos } = dataSources as { shipEngine: ShipEngineDataSource, exchangeRate: ExchangeRateDataSource, cosmos: CosmosDataSource };

          const shipmentIndex = await find_shipment_index(cosmos, orderRef, shipmentId);
          const shipmentPath = `/shipments/${shipmentIndex}`;

          // Prepare addresses in ShipEngine format
          const addresses = {
            from: {
              name: sendFrom.name,
              phone: "000 0000 0000",
              company_name: "",
              address_line1: sendFrom.line1,
              city_locality: sendFrom.city,
              state_province: sendFrom.state,
              country_code: sendFrom.country,
              postal_code: sendFrom.postal_code,
              address_residential_indicator: "no" as "yes" | "no"
            },
            to: {
              name: sendTo.name,
              phone: "000 0000 0000",
              company_name: "",
              address_line1: sendTo.line1,
              city_locality: sendTo.city,
              state_province: sendTo.state,
              country_code: sendTo.country,
              postal_code: sendTo.postal_code,
              address_residential_indicator: "no" as "yes" | "no"
            }
          };

          // Call shipEngine.getEstimate
          const rates = await shipEngine.getEstimate(
            { from: addresses.from, to: addresses.to },
            packedBoxes.map(box => ({
              package_code: "package",
              items: box.items.map(item => ({
                harmonized_tariff_code: item.harmonized_tariff_code?.hsCode,
                country_of_manufacture: item.country_of_manufacture,
                country_of_origin: item.country_of_origin,
                quantity: item.quantity,
                description: item.name,
                value: {
                  amount: decodeAmountFromSmallestUnit(item.price.amount, item.price.currency),
                  currency: item.price.currency
                }
              })),
              weight: {
                unit: "kilogram",
                value: box.used_weight * buffers.weight
              },
              dimensions: {
                unit: "centimeter",
                length: box.dimensions_cm.depth * buffers.volume,
                width: box.dimensions_cm.width * buffers.volume,
                height: box.dimensions_cm.height * buffers.volume
              }
            }))
          );

          // Filter rates by serviceCode + carrierCode
          const matchingRate = rates.find(rate =>
            rate.service_code === serviceCode && rate.carrier_code === carrierCode
          );

          if (!matchingRate) {
            throw new Error(`No matching rate found for carrierCode=${carrierCode} and serviceCode=${serviceCode}`);
          }

          // Convert amounts
          await exchangeRate.convertFieldsInPlace(matchingRate, matchingRate.total_rate.currency, 2);

          const fieldsToEncode = ['shipping_amount', 'insurance_amount', 'confirmation_amount', 'other_amount', 'tax_amount', 'total_rate'];
          fieldsToEncode.forEach(field => {
            matchingRate[field].amount = encodeAmountToSmallestUnit(matchingRate[field].amount, matchingRate[field].currency);
            matchingRate[field].currency = matchingRate[field].currency.toUpperCase();
          });

          for (const rateDetail of matchingRate.rate_details) {
            rateDetail.amount.amount = encodeAmountToSmallestUnit(rateDetail.amount.amount, rateDetail.amount.currency);
            rateDetail.amount.currency = rateDetail.amount.currency.toUpperCase();
          }

          await cosmos.patch_record("Main-Orders", orderRef.id, orderRef.id, [
            {
              op: "set",
              path: `${shipmentPath}/carrierInfo/rate_id`,
              value: matchingRate.rate_id
            },
            {
              op: "set",
              path: `${shipmentPath}/finalizedConfiguration`,
              value: {
                source: `${matchingRate.carrier_code}|${matchingRate.service_code}`,
                boxes: packedBoxes,
                pricing: {
                  tax_amount: matchingRate.tax_amount,
                  subtotal_amount: matchingRate.total_rate
                },
                delivery_days: matchingRate.delivery_days,
                estimated_delivery_date: matchingRate.estimated_delivery_date
              }
            }
          ], userId);

          return matchingRate;
        },
        confirm_and_finalize_shipment: async (
          _: any,
          { orderRef, shipmentId }: { orderRef: recordref_type; shipmentId: string },
          { dataSources: { cosmos, shipEngine }, userId }: serverContext
        ) => {
          if (!userId) throw new Error("User not logged in");

          // Step 1: Get shipment index
          const shipmentIdx = await find_shipment_index(cosmos, orderRef, shipmentId);
          const shipmentPath = `/shipments/${shipmentIdx}`;

          // Step 2: Get minimal shipment for verification
          const order = await cosmos.get_record<order_type>("Main-Orders", orderRef.id, orderRef.id);
          const shipment = order.shipments?.[shipmentIdx];
          if (!shipment) throw new Error("Shipment not found");

          if (!shipment.carrierInfo?.rate_id) {
            throw new Error("Shipment is missing carrierInfo.rate_id");
          }

          // Step 3: Purchase label from ShipEngine
          const label = await shipEngine.createLabelFromRate({
            rate_id: shipment.carrierInfo.rate_id
          });

          // Step 4: Detect deviation between suggested vs finalized config
          const deviation = detectDeviation(
            shipment.finalizedConfiguration?.boxes,
            shipment.suggestedConfiguration?.boxes
          );

          // Step 5: Patch shipment with label + finalized state
          await cosmos.patch_record("Main-Orders", orderRef.id, orderRef.id, [
            {
              op: "set",
              path: `${shipmentPath}/label`,
              value: label
            },
            {
              op: "set",
              path: `${shipmentPath}/isFinalized`,
              value: true
            },
            {
              op: "set",
              path: `${shipmentPath}/packingMetadata`,
              value: deviation
            },
            {
              op: "remove",
              path: `${shipmentPath}/configuration`
            }
          ], userId);

          // Track fulfillment quantities
          await fulfill_orderline_quantities(shipment, cosmos, userId);

          return {
            shipmentId,
            label,
            wasDeviated: deviation.wasDeviated,
            deviationType: deviation.deviationType ?? null
          };
        },
        mark_delivery_as_reviewed: async (
          _: any,
          { orderRef, shipmentId }: { orderRef: recordref_type; shipmentId: string },
          { dataSources: { cosmos }, userId, signalR }: serverContext
        ) => {
          if (!userId) throw new Error("User not logged in");

          // Step 1: Get shipment index
          const shipmentIdx = await find_shipment_index(cosmos, orderRef, shipmentId);
          const shipmentPath = `/shipments/${shipmentIdx}`;

          // Step 2: Patch shipment as reviewed
          await cosmos.patch_record("Main-Orders", orderRef.id, orderRef.id, [
            {
              op: "set",
              path: `${shipmentPath}/reviewed_at`,
              value: new Date().toISOString()
            }
          ], userId);

          const shipment = await cosmos.run_query<shipment_type>("Main-Orders", {
            query: `
              SELECT VALUE s FROM c JOIN s IN c.shipments
              WHERE c.id = @orderId AND s.id = @shipmentId
            `,
            parameters: [
              { name: "@orderId", value: orderRef.id },
              { name: "@shipmentId", value: shipmentId }
            ]
          }, true);

          signalR.addDataMessage(
            "delivery",
            { id: shipmentId, orderRef },
            { group: `${shipment[0].sendFrom.vendorId}-deliveries`, action: DataAction.DELETE },
          )

          return shipment[0];
        },
        override_delivery_status: async (
          _: any,
          { orderRef, shipmentId, statusCode, reason }: { orderRef: recordref_type; shipmentId: string; statusCode: string; reason?: string },
          { dataSources: { cosmos }, userId, signalR }: serverContext
        ) => {
          if (!userId) throw new Error("User not logged in");

          // Step 1: Get shipment index
          const shipmentIdx = await find_shipment_index(cosmos, orderRef, shipmentId);
          const shipmentPath = `/shipments/${shipmentIdx}`;

          const STATUS_OPTIONS = [
            { value: "IT", label: "In Transit" },
            { value: "DE", label: "Delivered" },
            { value: "SP", label: "Collection Location" },
            { value: "EX", label: "Exception" },
            { value: "UN", label: "Unknown" },
          ];

          const description = `Delivery is ${STATUS_OPTIONS.find(x => x.value == statusCode).label} ${!isNullOrWhiteSpace(reason) ? `with reason ${reason}` : ""}`;
          
          const trackingStatus = {
              status_code: statusCode,
              description,
              lastUpdatedAt: new Date().toISOString(),
              triggered_by: userId,
              occurred_at: new Date().toISOString(),
              reason,
              status_source: 'manual'
          }

          // Step 2: Patch shipment with new tracking status
          await cosmos.patch_record("Main-Orders", orderRef.id, orderRef.id, [
            {
              op: "set",
              path: `${shipmentPath}/trackingStatus`,
              value: trackingStatus
            }
          ], userId);

          const shipment = await cosmos.run_query<shipment_type>("Main-Orders", {
            query: `
              SELECT VALUE s FROM c JOIN s IN c.shipments
              WHERE c.id = @orderId AND s.id = @shipmentId
            `,
            parameters: [
              { name: "@orderId", value: orderRef.id },
              { name: "@shipmentId", value: shipmentId }
            ]
          }, true);

          // Track received quantities when delivered
          if (statusCode === "DE") {  // Delivered
            await mark_orderlines_as_received(orderRef, shipmentId, cosmos, `manual-${userId}`);
          }

          signalR.addDataMessage(
            "delivery",
            { id: shipmentId, orderRef, trackingStatus },
            { group: `${shipment[0].sendFrom.vendorId}-deliveries`, action: DataAction.UPSERT },
          )

          return shipment[0];
        }
      },
      Vendor: {
        shipments: async (parent: any, args: { onlyUnfinalized?: boolean }, { dataSources, userId }: serverContext) => {
          if (!userId) throw new Error("User not logged in");
          const { cosmos } = dataSources as { cosmos: CosmosDataSource };

        const onlyUnfinalized = args.onlyUnfinalized ?? false;

        // we need to get the shipments for the vendor
        const results = await cosmos.run_query<(
          { orderRef: recordref_type; shipment: shipment_type }
        )>(
          "Main-Orders",
          {
            query: `
              SELECT VALUE { 
                "orderRef": { 
                  "id": c.id, 
                  "partition": [c.customerEmail], 
                  "container": "Main-Orders" 
                }, 
                "shipment": s 
              } 
              FROM c 
              JOIN s IN c.shipments 
              WHERE 
                s.sendFrom.vendorId = @vendorId 
                AND IS_DEFINED(s.carrierInfo)
                ${onlyUnfinalized ? "AND NOT IS_DEFINED(s.isFinalized)" : ""}
            `,
            parameters: [
              { name: "@vendorId", value: parent.id }
            ]
          },
          true
        );

        // merge the object ref onto each shipment
        // then just return the shipments
        const shipments = results.map(x => ({
          orderRef: x.orderRef,
          ...x.shipment
        }));

        return shipments;
      }
    },
    EstimateRecord: {
        stripe_fee: (parent: any, _args: any, _context: serverContext, _info: any) => {
            // we don't include the fixed amount because this will have been added in with the sales calc
            // so if we include it on shipping it will double add
            return {
                amount: calcStripeFees(parent.total_rate.amount, false),
                currency: parent.total_rate.currency,
            } as currency_amount_type
        },
    },
    Shipment: {
      trackingEvents: async (
        parent: any,
        _args: any,
        { dataSources: { cosmos, shipEngine }, userId }: serverContext
      ) => {
        const { orderRef, id: shipmentId, label } = parent;
        const labelId = label?.label_id;
        if (!labelId) return [];

        // Get timeline from ShipEngine
        const events = await shipEngine.getTrackingTimeline(labelId);
        if (!Array.isArray(events) || events.length === 0) return [];

        // Find latest event
        const latestEvent = events[0]; // assuming ShipEngine returns in reverse-chronological order

        // Build patch path
        const shipmentIdx = await find_shipment_index(cosmos, orderRef, shipmentId);
        const shipmentPath = `/shipments/${shipmentIdx}`;

        // Patch latest tracking status onto shipment
        await cosmos.patch_record(
          "Main-Orders",
          orderRef.id,
          orderRef.partition,
          [
            {
              op: "set",
              path: `${shipmentPath}/trackingStatus`,
              value: {
                ...latestEvent,
                lastUpdatedAt: new Date().toISOString()
              }
            }
          ],
          userId
        );

        return events;
      }
    },
    TrackingEvent: {
      location: (parent: any) => {
        // ShipEngine may return location as city, state, postalCode, country
        // We can format it as a single string if needed
        if (parent.city || parent.state || parent.postalCode || parent.country) {
          return [
            parent.city,
            parent.postalCode,
            parent.state,
            parent.country
          ].filter(Boolean).join(", ");
        }
        return null;
      }
    }
}

// Track fulfillment quantities when shipment is finalized
async function fulfill_orderline_quantities(
  shipment: shipment_type,
  cosmos: CosmosDataSource,
  userId: string
) {
  const containerName = "Main-Listing";
  const now = new Date().toISOString();

  const packedItems = shipment.finalizedConfiguration?.boxes
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
        delta: 0, // No qty change, just tracking fulfillment
        qty_before: 0, // Would need to fetch current if needed for reporting
        qty_after: 0,
        reason: "FULFILLMENT",
        source: "SHIPMENT",
        reference_id: shipment.id,
        notes: `Fulfilled ${item.quantity} units in shipment ${shipment.code}`,
        created_at: now,
        created_by: userId
      };

      await cosmos.add_record(containerName, transaction, shipment.sendFrom.vendorId, userId);
    } catch (error) {
      console.error(`Failed to track fulfillment for variant ${item.variantId}:`, error);
      // Continue processing other items even if one fails
    }
  }
}

export async function find_shipment_index(
  cosmos: CosmosDataSource,
  orderRef: recordref_type,
  shipmentId: string
): Promise<number> {
    const result = await cosmos.run_query<string>(
    "Main-Orders",
    {
      query: `
        SELECT VALUE s.id FROM c JOIN s in c.shipments
        WHERE c.id = @orderId AND c.customerEmail = @partition
      `,
      parameters: [
        { name: "@orderId", value: orderRef.id },
        { name: "@partition", value: orderRef.partition[0] }
      ]
    },
    true
  );

  const match = result.findIndex(s => s === shipmentId);
  if (match === -1) {
    throw new Error(`Shipment ${shipmentId} not found in order ${orderRef.id}`);
  }

  return match;
}

const prepare_shipments_by_origin = async (
  user_currency: string,
  sendTo: address_details_type & { id: string, name: string }, 
  items: orderLine_type[], cosmos: CosmosDataSource, shipEngine: ShipEngineDataSource, exchangeRate: ExchangeRateDataSource) => {
    const included_items = items.filter(item => !isNullOrUndefined(item.forObject) && !isNullOrWhiteSpace(item.variantId)) as (orderLine_type & {key: string})[]
    
    await restore_target_on_lines_async(items, cosmos)

    // lets key the items by their id and partition, variantId
    for (const item of included_items) {
        var forObject = item.forObject as recordref_type
        item.key = `${forObject.id}|${flatten(forObject.partition)}-${item.variantId}`
    }

    // now we need to search for the items in cosmos and get the weight and dimensions
    // we need a distinct list of the items
    const distinct_items = distinctBy(
        included_items, 
        item => item.key
    ) as orderLine_type[]

    // now we need to get each of the items dimensions and weight from cosmos
    const variant_details = await cosmos.run_query<{
        productId: string,
        variantId: string,
        vendorId: string,
        name: string,
        stripe: { tax_code: string },
        soldFromLocationId: string,
        countryOfOrigin: string,
        countryOfManufacture: string,
        harmonizedTarrifCode: { hsCode: string },
        dimensions: { depth: number, width: number, height: number, uom: string },
        weight: { amount: number, uom: string }
    }>(
        "Main-Listing",
        {
            query: `SELECT c.id as productId, CONCAT(c.name, " ", v.name) as name, v.id as variantId, c.vendorId, c.soldFromLocationId, v.countryOfOrigin, v.countryOfManufacture, v.harmonizedTarrifCode, v.dimensions, v.weight, c.stripe from c JOIN v IN c.variants WHERE ARRAY_CONTAINS(@ids, c.id)`,
            parameters: [
                { name: "@ids", value: distinct_items.map(item => (item.forObject as recordref_type).id) },
            ]
        }, true
    )

    // now we need to get the sold from address for each of the items
    const sold_from_locations = distinctBy(
        variant_details,
        item => item.soldFromLocationId
    );

    const vendors = await cosmos.run_query<{
        vendorId: string,
        vendorName: string,
        accountId: string,
        locations: merchantLocation_type[]
    }>(
        "Main-Vendor",
        {
            query: `SELECT c.id as vendorId, c.name as vendorName, c.stripe.accountId as accountId, c.title, c.locations FROM c JOIN l in c.locations WHERE ARRAY_CONTAINS(@ids, l.id)`,
            parameters: [
                { name: "@ids", value: sold_from_locations.map(item => item.soldFromLocationId) },
            ]
        }, true
    )

    const sold_from_location_details = sold_from_locations.map(sl => {
        const vendor = vendors.find(v => v.vendorId === sl.vendorId)
        const location = vendor?.locations.find(l => l.id === sl.soldFromLocationId)
        return {
            id: sl.soldFromLocationId,
            vendorId: sl.vendorId,
            accountId: vendor?.accountId,
            name: `${vendor.vendorName} (${location.address.components.state} ${location.address.components.country})` ,
            ...location.address.components
        }
    })

    // group the items by their sold from location
    const grouped_items = groupBy(
        items, 
        item => {
            const forObject = item.forObject as recordref_type
            const variantId = item.variantId
            const variant_detail = variant_details.find(v => v.productId === forObject.id && v.variantId === variantId)
            if (variant_detail) {
                const sold_from_location = sold_from_location_details.find(l => l.id === variant_detail.soldFromLocationId)
                return `${sold_from_location?.id}|${variant_detail.vendorId}`
            }
            return null
        }
    )

    const weightUnits = {
      "kg": [
        "AU", // Australia
        "EU", // European Union
        "GB", // United Kingdom
        "CA", // Canada (dual use but metric is official)
        "NZ", // New Zealand
        "JP", // Japan
        "CN", // China
        "IN", // India
        "BR", // Brazil
        "ZA", // South Africa
        "MX", // Mexico
        "SG", // Singapore
        "KR", // South Korea
        "HK", // Hong Kong
        "DE", // Germany
        "FR", // France
        "IT", // Italy
        "ES", // Spain
        "SE", // Sweden
        "NO", // Norway
        "FI", // Finland
        "NL", // Netherlands
        "BE", // Belgium
        "CH", // Switzerland
        "AR", // Argentina
        "ID", // Indonesia
        "MY", // Malaysia
        "TH", // Thailand
        "PH", // Philippines
      ],
      "lb": [
        "US", // United States
        "LR", // Liberia
        "MM", // Myanmar (transitioning, still some imperial)
      ],
    };

    const distanceUnits = {
      "cm": [
        "AU", // Australia
        "EU", // European Union
        "GB", // United Kingdom (uses metric officially for most things, though miles still used on roads)
        "CA", // Canada (metric is official, imperial still in casual use)
        "NZ", // New Zealand
        "JP", // Japan
        "CN", // China
        "IN", // India
        "BR", // Brazil
        "ZA", // South Africa
        "MX", // Mexico
        "SG", // Singapore
        "KR", // South Korea
        "HK", // Hong Kong
        "DE", // Germany
        "FR", // France
        "IT", // Italy
        "ES", // Spain
        "SE", // Sweden
        "NO", // Norway
        "FI", // Finland
        "NL", // Netherlands
        "BE", // Belgium
        "CH", // Switzerland
        "AR", // Argentina
        "ID", // Indonesia
        "MY", // Malaysia
        "TH", // Thailand
        "PH", // Philippines
      ],
      "in": [
        "US", // United States
        "LR", // Liberia
        "MM", // Myanmar (transitioning but still using imperial system in places)
      ]
    };

    const unitByCountry = (from_unit: string, amount: number, country: string, type: 'distance' | 'weight') => {
        let MIN_VALUE;

        let convertedValue: number;
        let convertedUom: string;

        if (type == 'weight') {
          MIN_VALUE = 0.1; // Minimum weight in kg

          if (weightUnits["kg"].includes(country)) {
            convertedUom = "kg";
          } else if (weightUnits["lb"].includes(country)) {
            convertedUom = "lb";
          } else {
            throw `Unsupported country for weight conversion: ${country}`;
          }
        }

        if (type == 'distance') {
          MIN_VALUE = 1; // Minimum distance in cm

          if (distanceUnits["cm"].includes(country)) {
            convertedUom = "cm";
          } else if (distanceUnits["in"].includes(country)) {
            convertedUom = "in";
          } else {
            throw `Unsupported country for distance conversion: ${country}`;
          }
        }

        if (MIN_VALUE == null) throw `Unsupported type supplied`

        convertedValue = convert(amount).from(from_unit).to(convertedUom)

        // Ensure weight is capped at the minimum threshold
        return {
          amount: Math.max(convertedValue, MIN_VALUE),
          uom: convertedUom
        }
    };

    // now we need to loop through the groups and determine the shipment
    let shipments : {
      sendTo: address_details_type & {
        id: string, name: string
      }
      sendFrom: address_details_type & {
        id: string, name: string
      },
      carrierOptions: rate_record_type[]
    }[] = []

    for (const [groupKey, items_in_group] of Object.entries(grouped_items)) {
          const soldFromLocationId = groupKey.split("|")[0]
          // const vendorId = groupKey.split("|")[1]

          restore_price_on_lines(items_in_group)
            
          const items_with_dimensions = items_in_group.map(item => {
              const forObject = item.forObject as recordref_type
              const variantId = item.variantId
              const variant_detail = variant_details.find(v => v.productId === forObject.id && v.variantId === variantId)
              
              const sorted = [variant_detail.dimensions.depth, variant_detail.dimensions.width, variant_detail.dimensions.height].sort((a, b) => b - a); 

              if (variant_detail) {
                  // convert items into kg and cm
                  return {
                      ...item,
                      name: variant_detail.name,
                      tax_code: variant_detail.stripe.tax_code,
                      country_of_manufacture: variant_detail.countryOfManufacture,
                      country_of_origin: variant_detail.countryOfOrigin,
                      harmonized_tariff_code: variant_detail.harmonizedTarrifCode,
                      dimensions: {
                        depth: unitByCountry(variant_detail.dimensions.uom, sorted[0], variant_detail.countryOfOrigin, 'distance').amount, // convert to origin country unit
                        width: unitByCountry(variant_detail.dimensions.uom, sorted[1], variant_detail.countryOfOrigin, 'distance').amount, // convert to origin country unit
                        height: unitByCountry(variant_detail.dimensions.uom, sorted[2], variant_detail.countryOfOrigin, 'distance').amount, // convert to origin country unit
                        uom: unitByCountry(variant_detail.dimensions.uom, sorted[0], variant_detail.countryOfOrigin, 'distance').uom // use the same uom for all dimensions
                      },
                      weight: unitByCountry(variant_detail.weight.uom, variant_detail.weight.amount, variant_detail.countryOfOrigin, 'weight')
                  }
              }
              return null
          }
          ).filter(item => item !== null) as items_with_dimensions[]

          const packages = pack_by_box_sources(items_with_dimensions)

          // for each of the packed boxes we will get the rate estimate from shipengine
          // then we will total this up per carrier and return the most expensive one
          // this most expensive total will then be used as the estimate for the shipment
          
          const soldFromDetails = sold_from_location_details.find(l => l.id === soldFromLocationId)
          if (!soldFromDetails) throw new Error(`Sold from location not found for id: ${soldFromLocationId}`)
          
          const addresses = {
            from: {
              name: soldFromDetails.name,
              phone: "000 0000 0000",
              company_name: "",
              address_line1: soldFromDetails.line1,
              city_locality: soldFromDetails.city,
              state_province: soldFromDetails.state,
              country_code: soldFromDetails.country,
              postal_code: soldFromDetails.postal_code,
              address_residential_indicator: "no" as "yes" | "no"
            },
            to: {
              name: sendTo.name,
              phone: "000 0000 0000",
              company_name: "",
              address_line1: sendTo.line1,
              city_locality: sendTo.city,
              state_province: sendTo.state,
              country_code: sendTo.country,
              postal_code: sendTo.postal_code,
              address_residential_indicator: "no" as "yes" | "no"
            }
          }

          const packages_with_rates = {} as {
            [key: string]: {
              boxes: packed_box_type[],
              rates: rate_record_type[]
            }
          }
          for(const [box_source, boxes] of Object.entries(packages).filter(([_, boxes]) => boxes !== null)) {

            const rate_for_box_source = await shipEngine.getEstimate(
              {
                from: addresses.from,
                to: addresses.to
              }, 
              boxes.map(box => ({
                package_code: "package",
                items: box.items.map(item => ({
                  harmonized_tariff_code: item.harmonized_tariff_code.hsCode,
                  country_of_manufacture: item.country_of_manufacture,
                  country_of_origin: item.country_of_origin,
                  quantity: item.quantity,
                  description: item.name,
                  value: {
                    amount: decodeAmountFromSmallestUnit(item.price.amount, item.price.currency),
                    currency: item.price.currency
                  }
                })),
                weight: {
                  unit: "kilogram",
                  value: box.used_weight * buffers.weight // reduce weight to avoid perfect fits
                },
                dimensions: {
                  unit: "centimeter",
                  length: box.dimensions_cm.depth * buffers.volume, // reduce volume to avoid perfect fits
                  width: box.dimensions_cm.width * buffers.volume,
                  height: box.dimensions_cm.height * buffers.volume
                }
              }))
            )

            function standardizeCurrency(obj: any) {
              if (obj && obj.currency) {
                obj.currency = obj.currency.toUpperCase();
              }
            }

            // all amounts need to be encoded into the smallest unit for the currency
            // all amounts need to be converted to the users currency
            for(var rate of rate_for_box_source) {
              await exchangeRate.convertFieldsInPlace(rate, user_currency, 2)

              rate.shipping_amount.amount = encodeAmountToSmallestUnit(rate.shipping_amount.amount, rate.shipping_amount.currency)
              standardizeCurrency(rate.shipping_amount)

              rate.insurance_amount.amount = encodeAmountToSmallestUnit(rate.insurance_amount.amount, rate.insurance_amount.currency)
              standardizeCurrency(rate.insurance_amount)

              rate.confirmation_amount.amount = encodeAmountToSmallestUnit(rate.confirmation_amount.amount, rate.confirmation_amount.currency)
              standardizeCurrency(rate.confirmation_amount)

              rate.other_amount.amount = encodeAmountToSmallestUnit(rate.other_amount.amount, rate.other_amount.currency)
              standardizeCurrency(rate.other_amount)

              rate.tax_amount.amount = encodeAmountToSmallestUnit(rate.tax_amount.amount, rate.tax_amount.currency)
              standardizeCurrency(rate.tax_amount)

              rate.total_rate.amount = encodeAmountToSmallestUnit(rate.total_rate.amount, rate.total_rate.currency)
              standardizeCurrency(rate.total_rate)

              for (var rate_detail of rate.rate_details) {
                rate_detail.amount.amount = encodeAmountToSmallestUnit(rate_detail.amount.amount, rate_detail.amount.currency)
                standardizeCurrency(rate_detail.amount)
              }

            }

            packages_with_rates[box_source] = {
              boxes: boxes,
              rates: rate_for_box_source
            }

          }

          // now for a shipment it doesn't really matter about the box_source
          // we will just take the cheapest one for each carrier-service combo
          const carrier_options_duped = 
            Object.values(packages_with_rates)
            .filter(config => config.boxes !== null && config.rates != null && config.rates.length > 0)
            .flatMap(config => config.rates.map(rate => ({ ...rate, boxes: config.boxes }))).flat() // include boxes in the estimates
            const cheapest_carrier_options = carrier_options_duped.reduce((acc, estimate) => {
            const key = `${estimate.carrier_code}|${estimate.service_code}`;
            if (!acc[key] || estimate.total_rate.amount < acc[key].total_rate.amount) {
              acc[key] = estimate;
            }
            return acc;
          }, {} as { [key: string]: carrier_option_type });

          const shipment = {
            id: uuidv4(),
            code: generate_human_friendly_id("SH"),
            sendTo: sendTo,
            sendFrom: soldFromDetails,
            carrierOptions: Object.values(cheapest_carrier_options)
          }

          shipments.push(shipment)
    }

    // lets get a quote estimate for each shipment
    
    return shipments
}

export { resolvers, prepare_shipments_by_origin };
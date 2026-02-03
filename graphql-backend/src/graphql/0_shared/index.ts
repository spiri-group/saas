import { serverContext } from "../../services/azFunction"
import { ExchangeRateDataSource } from "../../services/exchangeRate";
import { StripeDataSource } from "../../services/stripe";
import { CosmosDataSource } from "../../utils/database";
import { currencyEquals, distinct, getSpiriverseFeeConfig, getProductFeeRate, getTargetFeeConfig, isNullOrUndefined, isNullOrWhiteSpace } from "../../utils/functions";
import { resolve_optionid } from "../choices";
import { restore_target_on_lines_async } from "../order";
import { orderLine_type } from "../order/types";
import { address_details_type } from "../user/types";
import { currency_amount_type, googleplace_type, recordref_type, thumbnail_type } from "./types";
import pluralize from "pluralize";

const resolvers = {
    Query: {
        search: async (_: any, args: { source: "merchants" | "listings", term: string, offset: number, limit: number}, { dataSources: { cosmos }}: serverContext, __: any) => {
            const searchTerm = args.term.toLowerCase();
        
            const merchantsQuery = args.source === "merchants" ? cosmos.run_query("Main-Vendor", {
                query: `
                    SELECT DISTINCT 
                        c.id,
                        c.name AS title,
                        c.id as vendorId,
                        c.thumbnail as thumbnail,
                        'company profile' AS additionalInfo
                    FROM c
                    WHERE
                        c.thumbnail != null
                        AND c.status = 'ACTIVE'
                        AND (
                            CONTAINS(LOWER(c.name), @search) OR
        
                            EXISTS (
                                SELECT VALUE d FROM d IN c.descriptions 
                                WHERE CONTAINS(LOWER(d.title), @search) OR CONTAINS(LOWER(d.body), @search)
                            ) OR
        
                            EXISTS (
                                SELECT VALUE l FROM l IN c.locations 
                                WHERE CONTAINS(LOWER(l.address.formattedAddress), @search) OR
                                    EXISTS (
                                        SELECT VALUE s FROM s IN l.services 
                                        WHERE CONTAINS(LOWER(s), @search)
                                    )
                            )
                        )
                    OFFSET @offset 
                    LIMIT @limit
                `,
                parameters: [
                    { name: "@search", value: searchTerm },
                    { name: "@offset", value: args.offset },
                    { name: "@limit", value: args.limit }
                ]
            }, true) : Promise.resolve([]);
        
            const listingsQuery = args.source === "listings" ? cosmos.run_query("Main-Listing", {
                query: `
                    SELECT
                        l.id,
                        l.name AS title,
                        l.vendorId as vendorId,
                        l.thumbnail as thumbnail,
                        'product page' AS additionalInfo,
                        l.preview as decription
                    FROM l
                    WHERE
                        CONTAINS(LOWER(l.name), @search)
                        AND l.status = 'ACTIVE'
                        AND l.vendorId <> 'spiriverse'
                        AND (NOT IS_DEFINED(l.docType) OR l.docType != 'CRYSTAL_LISTING')
                    ORDER BY l.displayScore DESC
                    OFFSET @offset LIMIT @limit
                `,
                parameters: [
                    { name: "@search", value: pluralize.singular(searchTerm) },
                    { name: "@offset", value: args.offset },
                    { name: "@limit", value: args.limit }
                ]
            }, true) : Promise.resolve([]);

            // Query crystal listings separately
            const crystalListingsQuery = args.source === "listings" ? cosmos.run_query("Main-Listing", {
                query: `
                    SELECT
                        l.id,
                        l.name AS title,
                        l.vendorId as vendorId,
                        l.thumbnail as thumbnail,
                        'crystal listing' AS additionalInfo,
                        l.description as decription,
                        l.price as price
                    FROM l
                    WHERE
                        CONTAINS(LOWER(l.name), @search)
                        AND l.status = 'ACTIVE'
                        AND l.docType = 'CRYSTAL_LISTING'
                        AND l.listingStatus = 'active'
                    ORDER BY l.createdAt DESC
                    OFFSET @offset LIMIT @limit
                `,
                parameters: [
                    { name: "@search", value: pluralize.singular(searchTerm) },
                    { name: "@offset", value: args.offset },
                    { name: "@limit", value: args.limit }
                ]
            }, true) : Promise.resolve([]);
            
            const merchantCountQuery = args.source === "merchants" ? cosmos.run_query("Main-Vendor", {
                query: `
                    SELECT VALUE COUNT(1) FROM c
                    WHERE 
                        c.thumbnail != null
                        AND c.status = 'ACTIVE'
                        AND (
                            CONTAINS(LOWER(c.name), @search) OR
        
                            EXISTS (
                                SELECT VALUE d FROM d IN c.descriptions 
                                WHERE CONTAINS(LOWER(d.title), @search) OR CONTAINS(LOWER(d.body), @search)
                            ) OR
        
                            EXISTS (
                                SELECT VALUE l FROM l IN c.locations 
                                WHERE CONTAINS(LOWER(l.address.formattedAddress), @search) OR
                                    EXISTS (
                                        SELECT VALUE s FROM s IN l.services 
                                        WHERE CONTAINS(LOWER(s), @search)
                                    )
                            )
                        )
                `,
                parameters: [
                    { name: "@search", value: searchTerm }
                ]
            }, true) : Promise.resolve([0]);
        
            const listingCountQuery = args.source === "listings" ? cosmos.run_query("Main-Listing", {
                query: `
                    SELECT VALUE COUNT(1) FROM l
                    WHERE 
                        CONTAINS(LOWER(l.name), @search)
                        AND l.status = 'ACTIVE'
                `,
                parameters: [
                    { name: "@search", value: pluralize.singular(searchTerm) }
                ]
            }, true) : Promise.resolve([0]);
        
            const [merchantsData, listingsData, crystalListingsData, merchantCount, listingCount] = await Promise.all([
                merchantsQuery, listingsQuery, crystalListingsQuery, merchantCountQuery, listingCountQuery
            ]);

            const data = [...merchantsData, ...listingsData, ...crystalListingsData];
            const grand_total = merchantCount[0] + listingCount[0];
        
            const product_ids = data.filter(x => x.additionalInfo == "product page").map(x => x.id);
        
            const [prices, vendors] = await Promise.all([
                cosmos.run_query<{
                    listingId: string,
                    variantId: string,
                    defaultPrice: currency_amount_type
                }>("Main-Listing", {
                    query: `
                        SELECT 
                            l.id as listingId,
                            v.id as variantId,
                            v.defaultPrice
                        FROM l
                        JOIN v IN l.variants
                        WHERE ARRAY_CONTAINS(@ids, l.id)
                    `,
                    parameters: [{ name: "@ids", value: product_ids }]
                }, true),
                cosmos.run_query("Main-Vendor", {
                    query: `
                        SELECT c.id, c.slug FROM c
                        WHERE ARRAY_CONTAINS(@ids, c.id)
                    `,
                    parameters: [{ name: "@ids", value: distinct(data.map(x => x.vendorId)) }]
                }, true)
            ]);
        
            const prices_map = prices.reduce((acc, x) => {
                if (acc[x.listingId] == null || x.defaultPrice.amount < acc[x.listingId].amount) {
                    acc[x.listingId] = x.defaultPrice;
                }
                return acc;
            }, {} as Record<string, currency_amount_type>);
        
            const vendors_to_slug_map = vendors.reduce((acc, x) => {
                acc[x.id] = x.slug;
                return acc;
            }, {} as Record<string, string>);
        
            data.forEach((x) => {
                if (x.additionalInfo == "product page") {
                    x.price = prices_map[x.id] || null;
                    x.link = `/m/${vendors_to_slug_map[x.vendorId]}/product/${x.id}`;
                } else if (x.additionalInfo == "crystal listing") {
                    // Crystal listings already have price from query, link to crystal page
                    x.link = `/m/${vendors_to_slug_map[x.vendorId]}/crystal/${x.id}`;
                    // Transform simple thumbnail URL to complex thumbnail object format
                    if (typeof x.thumbnail === "string") {
                        x.thumbnail = {
                            image: {
                                media: { size: "SQUARE", url: x.thumbnail },
                                zoom: 1
                            },
                            bgColor: "#ffffff"
                        };
                    } else if (x.thumbnail == null) {
                        // Create a default thumbnail for crystal listings without images
                        x.thumbnail = {
                            image: null,
                            bgColor: "#f8fafc"
                        };
                    }
                } else if (x.additionalInfo == "company profile") {
                    x.link = `/m/${vendors_to_slug_map[x.vendorId]}`;
                } else {
                    x.link = undefined;
                }
            });
        
            return {
                results: data,
                hasMore: args.offset + data.length < grand_total,
                hasPrevious: args.offset > 0,
                totalCount: grand_total
            };
        },        
        charge: async(_:any, args: { id: string }, context: serverContext, __:any ) => {
            const chargeResp = await context.dataSources.stripe.callApi("GET", `charges/${args.id}`)
            return chargeResp.data;
        },
        setUpIntentTarget: async (_: any, args: { id: string }, { dataSources: { cosmos }}: serverContext, __: any) => {
            const id = args.id

            // first we attempt to find it from the order
            let resp = await cosmos.run_query("Main-Orders", { query: `SELECT * FROM c WHERE c.stripe.setupIntentId = '${id}'`}, true)
            if (resp.length > 0) {
                if (resp[0].lines.length > 0) {
                    // we just take the purpose from the first line
                    // we take the forObject from the first line if its not inherited
                    let forObject = resp[0].lines[0].forObject !== "inherit" ? resp[0].lines[0].forObject : resp[0].forObject
                    return {
                        forObject,
                        target: !isNullOrWhiteSpace(resp[0].target) ? resp[0].target : resp[0].lines[0].target
                    }
                }
            }

            // otherwise we will use other logic to find the purpose

            // first check if it maps to a case close
            resp = await cosmos.run_query("Main-Cases", { query: `SELECT * FROM c WHERE c.stripeIntents.create = '${id}'`}, true)
            if (resp.length > 0) {
                return {
                    forObject: {
                        id: resp[0].trackingCode,
                        partition: [resp[0].id],
                        container: "Main-Cases"
                    },
                    target: "CASE-CREATE"
                }
            } 
            
            resp = await cosmos.run_query("Main-Cases", { query: `SELECT * FROM c WHERE c.stripeIntents.release = '${id}'`}, true)
            if (resp.length > 0) {
                return {
                    forObject: {
                        id: resp[0].trackingCode,
                        partition: [resp[0].id],
                        container: "Main-Cases"
                    },
                    target: "CASE-OFFER-RELEASE"
                }
            }
            
            resp = await cosmos.run_query("Main-Cases", { query: `SELECT * FROM c WHERE c.stripeIntents.close = '${id}'`}, true)
            if (resp.length > 0) {
                return {
                    forObject: {
                        id: resp[0].trackingCode,
                        partition: [resp[0].id],
                        container: "Main-Cases"
                    },
                    target: "CASE-OFFER-CLOSE"
                }
            }

            throw "Could not find purpose for given setup intent"
        },
        checkSetupIntentPayment: async (_: any, args: { id: string }, { dataSources: { cosmos }}: serverContext, __: any) => {
            const setupIntentId = args.id;

            // Find the order by setup intent ID
            const orders = await cosmos.run_query<any>("Main-Orders", {
                query: `SELECT * FROM c WHERE c.stripe.setupIntentId = @setupIntentId`,
                parameters: [{ name: "@setupIntentId", value: setupIntentId }]
            }, true);

            if (orders.length === 0) {
                return {
                    forObject: null,
                    target: null,
                    paymentConfirmed: false
                };
            }

            const order = orders[0];

            // Check if any line has been paid (paid_status_log contains "PAID")
            const paymentConfirmed = order.lines.some((line: any) =>
                line.paid_status_log &&
                line.paid_status_log.length > 0 &&
                line.paid_status_log[0].label === "PAID"
            );

            // Get forObject from the first line or order
            let forObject = null;
            if (order.lines.length > 0) {
                forObject = order.lines[0].forObject !== "inherit"
                    ? order.lines[0].forObject
                    : order.forObject;
            }

            // Normalize forObject.partition to always be an array (GraphQL expects [String])
            if (forObject && forObject.partition !== undefined && forObject.partition !== null) {
                if (!Array.isArray(forObject.partition)) {
                    forObject = { ...forObject, partition: [forObject.partition] };
                }
            }

            // Get target
            const target = !isNullOrWhiteSpace(order.target)
                ? order.target
                : (order.lines.length > 0 ? order.lines[0].target : null);

            return {
                forObject,
                target,
                paymentConfirmed
            };
        }
    },
    Mutation: {
        upsertThumbnail: async(_: any, args: { forObject: recordref_type, thumbnail: thumbnail_type}, { dataSources: { cosmos }, userId}: serverContext, __: any) => {
            if (args.forObject.container === null) throw "Cannot upsert thumbnail without knowing the container to update";

            await cosmos.patch_record(args.forObject.container, args.forObject.id, args.forObject.partition, [
                { path: "/thumbnail", value: args.thumbnail, op: "set" }
            ], userId)

            return {
                code: 200,
                success: true,
                message: "Thumbnail updated"
            }
        }
    },
    StripeDetails: {
        totalPaid: (parent: any, _: any, __: serverContext) => {
            if (parent.amountCharged == null) return null;
            return {
                amount: parent.amountCharged - parent.amountRefunded,
                currency: parent.currency
            } as currency_amount_type
        },
        totalDue: (parent: any, _: any, __: serverContext) => {
            return {
                amount: parent.amountDue,
                currency: parent.currency
            } as currency_amount_type
        },
        totalRefunded : (parent: any, _: any, __: serverContext) => {
            return {
                amount: parent.amountRefunded,
                currency: parent.currency
            }
        },
        charge: async (parent: any, _: any, context: serverContext) => {
            if (parent.charge == null || parent.charge.id == null) return null;
            if (parent.charge.account != null) {
                // should obtain the charge details from stripe
                const chargeResp = await context.dataSources.stripe.asConnectedAccount(parent.charge.account).callApi("GET", `charges/${parent.charge.id}`)
                return chargeResp.data;
            } else {
                // should obtain the charge details from stripe
                const chargeResp = await context.dataSources.stripe.callApi("GET", `charges/${parent.charge.id}`)
                return chargeResp.data;
            }
        },
        invoiceStatus: (parent: any, _: any, __: serverContext) => {
            if (parent.invoiceStatus == "void") return "cancelled"
            else if (parent.invoiceStatus == "open") return "awaiting payment"
            else return parent.invoiceStatus
        }
    },
    StripeInvoice: {
        status: (parent: any, _: any, __: serverContext) => {
            if (parent.status == "void") return "cancelled"
            else if (parent.status == "open") return "awaiting payment"
            else return parent.status
        }
    },
    StripeCharge: {
        status: (parent: any, _: any, __: serverContext) => {
            const status = parent.refunds != null && parent.refunds.data.filter((refund: any) => ["pending", "requires_action"].includes(refund.status)).length > 0 ? "refund_pending" : parent.status
            return status;            
        },
        amount: (parent: any, _: any, __: serverContext) => {
            return {
                amount: parent.amount,
                currency: parent.currency
            } as currency_amount_type
        },
        amount_remaining: (parent: any, _: any, __: serverContext) => {
            return {
                amount: parent.amount - parent.amount_refunded,
                currency: parent.currency
            } as currency_amount_type
        },
        amount_captured: (parent: any, _: any, __: serverContext) => {
            return {
                amount: parent.amount_captured,
                currency: parent.currency
            } as currency_amount_type
        },
        amount_refunded: (parent: any, _: any, __: serverContext) => {
            return {
                amount: parent.amount_refunded,
                currency: parent.currency
            } as currency_amount_type
        }
    },
    Media: {
        url: (parent: any, _: any, context: serverContext) => {
            if (parent.urlRelative == null) throw "Media must have a relative url";
            return context.dataSources.storage.toUrl(parent.urlRelative)
        }
    },
    TimeSpan: {
        unit: async (parent: any, { defaultLocale = "EN" }: any, context: serverContext) => {
            return await resolve_optionid({ defaultLocale, optionId: parent.unitId, field: "unit"}, context)
        }
    }
}

 

export const calcStripeFees = (total: number, includeFixedAmount = true) => {
    let stripe_fees = (total * 0.035)
    if (includeFixedAmount) {
        stripe_fees += 30
    }
    return Math.round(stripe_fees)
}

export const deriveFees = async (
  merchantId: string,
  items: orderLine_type[],
  cosmosClient: CosmosDataSource
) => {
  // Helper: assert integer (minor units)
  const i = (n: number) => Math.round(n);

  if (items.length === 0) {
    return {
      item_total: 0,
      customer: { breakdown: { item_total: 0, stripe: 0, processing: 0 }, fees: 0, charge: 0 },
      merchant: { breakdown: { sale: 0, listing: 0, tax: 0 }, charge: 0 },
      spiriverse_takes: 0
    };
  }

  await restore_target_on_lines_async(items, cosmosClient);

  if (items.some(x => isNullOrUndefined(x.target))) {
    throw "All lines must have a target defined";
  }

  // total is in MINOR units (e.g., cents)
  const total = items.reduce((acc, x) => acc + (x.price.amount * x.quantity), 0);

  if (merchantId === "SPIRIVERSE") {
    return {
      item_total: 0,
      customer: { breakdown: { item_total: 0, stripe: 0, processing: 0 }, fees: 0, charge: 0 },
      merchant: { breakdown: { sale: 0, listing: 0, tax: 0 }, charge: 0 },
      spiriverse_takes: 0
    };
  }

  const cfg = await getSpiriverseFeeConfig({ cosmos: cosmosClient });

  // SALE FEE (minor units) – round per line to avoid penny drift
  const sale_fee = items.reduce((acc, x) => {
    const lineMinor = x.price.amount * x.quantity; // minor units
    if (x.target.toLowerCase().startsWith("product")) {
      const rate = getProductFeeRate(lineMinor, cfg); // e.g., 0.12 for 12%
      return acc + i(lineMinor * rate);
    } else {
      const t = getTargetFeeConfig(x.target, cfg); // { percent: number, fixed?: number } where percent is e.g. 12
      const percentPart = i(lineMinor * (t.percent / 100));
      const fixedPart = t.fixed ?? 0; // fixed is assumed MINOR units
      return acc + percentPart + fixedPart;
    }
  }, 0);

  // PROCESSING FEE – keep in minor units
  // 1% of total, rounded to the nearest cent
  const processing_fee = Math.round(total / 100); // 1% == /100

  // Stripe fees function should take/return MINOR units
  const stripe_fees = calcStripeFees(total + processing_fee);

  // LISTING FEE – already in minor units
  const listing_fee = 100;

  // Subtotal the platform take (still MINOR units)
  const spiriverse_takes_subtotal = sale_fee + listing_fee + processing_fee;

  // GST 10% – in minor units, round correctly
  const gst = Math.round(spiriverse_takes_subtotal / 10);

  const spiriverse_takes = spiriverse_takes_subtotal + gst;

  return {
    customer: {
      breakdown: {
        item_total: total,
        stripe: stripe_fees,
        processing: processing_fee
      },
      fees: stripe_fees + processing_fee,
      charge: total + stripe_fees + processing_fee
    },
    merchant: {
      breakdown: {
        sale: sale_fee,
        listing: listing_fee,
        tax: gst
      },
      charge: spiriverse_takes
    },
    spiriverse_takes
  };
};


type stripe_tax_calcs = {
    amount: number,
    inclusive: boolean,
    tax_rate_details: {
        country: string,
        percentage_decimal: string,
        state: string,
        tax_type: string
    },
    taxability_reason: "standard_rated" | "zero_rated",
    taxable_amount: number
}

export const deriveTax = async (
    services: { cosmos: CosmosDataSource, exchangeRate: ExchangeRateDataSource, stripe: StripeDataSource },
    customer: {
        address: address_details_type,
        currency: string
    },
    items: orderLine_type[], 
    address_source: 'billing' | 'shipping'
) => {
    const { cosmos, exchangeRate, stripe } = services;

    if (items.length == 0) return {
        amount: {
            amount: 0,
            currency: customer.currency
        } as currency_amount_type,
        breakdown: []
    }

    // all lines must have a forObject defined
    if (items.some(x => isNullOrUndefined(x.forObject) && x.forObject === "inherit")) {
        throw "All lines must have a forObject defined"
    }


    // we onyl support deriving the tax for a single merchant 
    // in this we will assume that the first items currency is the merchant currency
    const merchant_currency = items[0].price.currency

    if (!currencyEquals(customer.currency, merchant_currency)) {
        // we need to convert the items to the customer currency
        items = await Promise.all(items.map(async x => {
            return {
                ...x,
                price: {
                    amount: await exchangeRate.convert(x.price.amount, merchant_currency, customer.currency),
                    currency: customer.currency
                }
            }
        }))
    }

    // work out all our tax codes
    const tax_codes = await cosmos.run_query<{ id: string, tax_code: string }>("Main-Listing", {
        query: `SELECT DISTINCT c.id, c.stripe.tax_code FROM c WHERE ARRAY_CONTAINS(@ids, c.id)`,
        parameters: [{name: "@ids", value: items.map(x => (x.forObject as recordref_type).id)}]
    }, true);

    const params = {
        currency: customer.currency,
        line_items: items.map((x, idx) => {
            const listing = tax_codes.find(y => y.id == (x.forObject as recordref_type).id);
            if (!listing?.tax_code) {
                throw new Error(`Could not find tax code for listing ${(x.forObject as recordref_type).id}`);
            }
            return {
                tax_code: listing.tax_code,
                amount: x.price.amount,
                reference: `L${idx}`
            }
        }),
        customer_details: {
            address: customer.address,
            address_source
        },
        expand: [ "line_items" ]
    }

    // call out to Stripe Tax service
    const tax_resp = await stripe.callApi("POST", "tax/calculations", params)

    const line_tax_mapping: Record<string, currency_amount_type> = {};

    // now if the customer currency is not the same as the merchant currency
    // we need to convert the tax amount to the merchant currency
    let currency = customer.currency
    if (!currencyEquals(customer.currency, merchant_currency)) {
        currency = merchant_currency

        tax_resp.data.tax_amount_exclusive = await exchangeRate.convert(tax_resp.data.tax_amount_exclusive, customer.currency, merchant_currency)
        tax_resp.data.tax_breakdown = await Promise.all(tax_resp.data.tax_breakdown.map(async x => {
            return {
                ...x,
                amount: await exchangeRate.convert(x.amount, customer.currency, merchant_currency)
            }
        }))
    }

    if (isNullOrUndefined(tax_resp.data.line_items)
        || isNullOrUndefined(tax_resp.data.line_items.data)) {
        throw `Tax calculation did not return line items`
    } else {
        for (var i = 0; i < tax_resp.data.line_items.data.length; i++) {
            line_tax_mapping[items[i].id] = {
                amount: tax_resp.data.line_items.data[i].amount_tax,
                currency
            }
        }
    }

    return {
        calculation: tax_resp.data.id,
        amount: {
            amount: tax_resp.data.tax_amount_exclusive,
            currency
        } as currency_amount_type,
        breakdown: tax_resp.data.tax_breakdown as stripe_tax_calcs[],
        line_tax_mapping
    }
     
}

export {resolvers}
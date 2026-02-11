import { serverContext } from "../../services/azFunction"
import { vendor_type, VendorDocType } from "../vendor/types"
import { user_type } from "../user/types"
import { PatchOperation } from "@azure/cosmos"
import { VendorLifecycleStage, computeLifecycleStage } from "./types"
import { DateTime } from "luxon"
import { journeysResolvers } from "./journeys"
import { mergeDeep } from "../../utils/functions"

const VENDOR_CONTAINER = "Main-Vendor"
const USER_CONTAINER = "Main-User"
const ORDER_CONTAINER = "Main-Orders"

const resolvers = {
    Query: {
        consoleVendorAccounts: async (_: any, args: {
            search?: string
            docTypes?: string[]
            lifecycleStages?: string[]
            limit?: number
            offset?: number
        }, context: serverContext) => {
            const limit = args.limit || 50
            const offset = args.offset || 0

            let whereConditions: string[] = []
            let parameters: { name: string, value: any }[] = []

            // Filter by docType
            if (args.docTypes && args.docTypes.length > 0) {
                whereConditions.push("ARRAY_CONTAINS(@docTypes, c.docType)")
                parameters.push({ name: "@docTypes", value: args.docTypes })
            }

            // Search by name or slug
            if (args.search) {
                whereConditions.push("(CONTAINS(LOWER(c.name), LOWER(@search)) OR CONTAINS(LOWER(c.slug), LOWER(@search)))")
                parameters.push({ name: "@search", value: args.search })
            }

            const whereClause = whereConditions.length > 0
                ? `WHERE ${whereConditions.join(" AND ")}`
                : ""

            // Get all matching vendors (we filter lifecycle in JS since it's computed)
            const querySpec = {
                query: `SELECT c.id, c.name, c.slug, c.docType, c.publishedAt, c.subscription, c.stripe, c.createdDate FROM c ${whereClause} ORDER BY c.createdDate DESC`,
                parameters
            }

            const allVendors = await context.dataSources.cosmos.run_query<vendor_type & { createdDate?: string }>(VENDOR_CONTAINER, querySpec, true)

            // Compute lifecycle stages and apply filter
            const vendorsWithStage = allVendors.map(v => ({
                ...v,
                lifecycleStage: computeLifecycleStage(v)
            }))

            const filtered = args.lifecycleStages && args.lifecycleStages.length > 0
                ? vendorsWithStage.filter(v => args.lifecycleStages!.includes(v.lifecycleStage))
                : vendorsWithStage

            const totalCount = filtered.length
            const paginated = filtered.slice(offset, offset + limit)

            return {
                vendors: paginated,
                totalCount,
                hasMore: offset + paginated.length < totalCount
            }
        },

        consoleCustomerAccounts: async (_: any, args: {
            search?: string
            limit?: number
            offset?: number
        }, context: serverContext) => {
            const limit = args.limit || 50
            const offset = args.offset || 0

            let whereConditions: string[] = []
            let parameters: { name: string, value: any }[] = []

            if (args.search) {
                whereConditions.push("(CONTAINS(LOWER(c.email), LOWER(@search)) OR CONTAINS(LOWER(c.firstname), LOWER(@search)) OR CONTAINS(LOWER(c.lastname), LOWER(@search)))")
                parameters.push({ name: "@search", value: args.search })
            }

            const whereClause = whereConditions.length > 0
                ? `WHERE ${whereConditions.join(" AND ")}`
                : ""

            // Get paginated results
            const querySpec = {
                query: `SELECT c.id, c.firstname, c.lastname, c.email, c.spiritualInterests, c.createdDate FROM c ${whereClause} ORDER BY c.createdDate DESC OFFSET @offset LIMIT @limit`,
                parameters: [
                    ...parameters,
                    { name: "@offset", value: offset },
                    { name: "@limit", value: limit }
                ]
            }

            const customers = await context.dataSources.cosmos.run_query<user_type & { createdDate?: string }>(USER_CONTAINER, querySpec, true)

            // Get total count
            const countQuery = {
                query: `SELECT VALUE COUNT(1) FROM c ${whereClause}`,
                parameters
            }
            const countResult = await context.dataSources.cosmos.run_query<number>(USER_CONTAINER, countQuery, true)
            const totalCount = countResult[0] || 0

            // Get vendor and order counts for each customer
            const customersWithCounts = await Promise.all(
                customers.map(async (customer) => {
                    // Count vendors the customer owns
                    const vendorCountResult = await context.dataSources.cosmos.run_query<number>(VENDOR_CONTAINER, {
                        query: `SELECT VALUE COUNT(1) FROM c WHERE ARRAY_CONTAINS(c.customers, {"id": @customerId}, true)`,
                        parameters: [{ name: "@customerId", value: customer.id }]
                    }, true)

                    // Count orders
                    const orderCountResult = await context.dataSources.cosmos.run_query<number>(ORDER_CONTAINER, {
                        query: `SELECT VALUE COUNT(1) FROM c WHERE c.customer.id = @customerId`,
                        parameters: [{ name: "@customerId", value: customer.id }]
                    }, true)

                    return {
                        ...customer,
                        vendorCount: vendorCountResult[0] || 0,
                        orderCount: orderCountResult[0] || 0
                    }
                })
            )

            return {
                customers: customersWithCounts,
                totalCount,
                hasMore: offset + customers.length < totalCount
            }
        },

        consoleAccountStats: async (_: any, _args: any, context: serverContext) => {
            const now = DateTime.now()
            const startOfToday = now.startOf("day").toISO()
            const startOfWeek = now.startOf("week").toISO()
            const startOfMonth = now.startOf("month").toISO()

            // Single-fetch: get all vendors with relevant fields
            const allVendors = await context.dataSources.cosmos.run_query<vendor_type & { createdDate?: string }>(VENDOR_CONTAINER, {
                query: `SELECT c.id, c.docType, c.publishedAt, c.subscription, c.stripe, c.createdDate FROM c`,
                parameters: []
            }, true)

            // Compute stats from the single result set
            let merchants = 0
            let practitioners = 0
            let published = 0
            let billingActive = 0
            let billingFailed = 0
            let billingBlocked = 0
            let waived = 0
            let mrr = 0
            let totalCollected = 0

            // Funnel counts
            const funnelCounts: Record<string, number> = {}
            for (const stage of Object.values(VendorLifecycleStage)) {
                funnelCounts[stage] = 0
            }

            for (const v of allVendors) {
                // DocType counts
                if (v.docType === VendorDocType.MERCHANT) merchants++
                if (v.docType === VendorDocType.PRACTITIONER) practitioners++

                // Published
                if ((v as any).publishedAt) published++

                const sub = v.subscription

                // Billing stats
                if (sub?.payment_status === "success" && sub?.next_billing_date) billingActive++
                if (sub?.payment_status === "failed" && !sub?.payouts_blocked) billingFailed++
                if (sub?.payouts_blocked) billingBlocked++
                if (sub?.waived) waived++

                // MRR: sum plan amounts for actively-billing vendors, adjusted for discount
                if (sub?.payment_status === "success" && sub?.next_billing_date && sub?.plans) {
                    const planTotal = sub.plans.reduce((sum, p) => sum + (p.price?.amount || 0), 0)
                    const discount = sub.discountPercent || 0
                    mrr += Math.round(planTotal * (1 - discount / 100))
                }

                // Total collected: sum all successful billing history amounts
                if (sub?.billing_history) {
                    for (const record of sub.billing_history) {
                        if ((record as any).billingStatus === "success") {
                            totalCollected += (record as any).amount || 0
                        }
                    }
                }

                // Funnel
                const stage = computeLifecycleStage(v)
                funnelCounts[stage]++
            }

            // Customer stats (2 queries)
            const customerTotalResult = await context.dataSources.cosmos.run_query<number>(USER_CONTAINER, {
                query: `SELECT VALUE COUNT(1) FROM c`,
                parameters: []
            }, true)

            const customersWithOrdersResult = await context.dataSources.cosmos.run_query<number>(ORDER_CONTAINER, {
                query: `SELECT VALUE COUNT(1) FROM (SELECT DISTINCT c.customer.id FROM c)`,
                parameters: []
            }, true)

            // Recent activity: 6 COUNT queries with time thresholds
            const [vendorsToday, vendorsThisWeek, vendorsThisMonth, customersToday, customersThisWeek, customersThisMonth] = await Promise.all([
                context.dataSources.cosmos.run_query<number>(VENDOR_CONTAINER, {
                    query: `SELECT VALUE COUNT(1) FROM c WHERE c.createdDate >= @threshold`,
                    parameters: [{ name: "@threshold", value: startOfToday }]
                }, true),
                context.dataSources.cosmos.run_query<number>(VENDOR_CONTAINER, {
                    query: `SELECT VALUE COUNT(1) FROM c WHERE c.createdDate >= @threshold`,
                    parameters: [{ name: "@threshold", value: startOfWeek }]
                }, true),
                context.dataSources.cosmos.run_query<number>(VENDOR_CONTAINER, {
                    query: `SELECT VALUE COUNT(1) FROM c WHERE c.createdDate >= @threshold`,
                    parameters: [{ name: "@threshold", value: startOfMonth }]
                }, true),
                context.dataSources.cosmos.run_query<number>(USER_CONTAINER, {
                    query: `SELECT VALUE COUNT(1) FROM c WHERE c.createdDate >= @threshold`,
                    parameters: [{ name: "@threshold", value: startOfToday }]
                }, true),
                context.dataSources.cosmos.run_query<number>(USER_CONTAINER, {
                    query: `SELECT VALUE COUNT(1) FROM c WHERE c.createdDate >= @threshold`,
                    parameters: [{ name: "@threshold", value: startOfWeek }]
                }, true),
                context.dataSources.cosmos.run_query<number>(USER_CONTAINER, {
                    query: `SELECT VALUE COUNT(1) FROM c WHERE c.createdDate >= @threshold`,
                    parameters: [{ name: "@threshold", value: startOfMonth }]
                }, true),
            ])

            // Build funnel array in stage order
            const stageOrder = [
                VendorLifecycleStage.CREATED,
                VendorLifecycleStage.STRIPE_ONBOARDING,
                VendorLifecycleStage.FIRST_PAYOUT,
                VendorLifecycleStage.CARD_ADDED,
                VendorLifecycleStage.PUBLISHED,
                VendorLifecycleStage.BILLING_ACTIVE,
                VendorLifecycleStage.BILLING_FAILED,
                VendorLifecycleStage.BILLING_BLOCKED,
            ]

            return {
                vendors: {
                    total: allVendors.length,
                    merchants,
                    practitioners,
                    published,
                    billingActive,
                    billingFailed,
                    billingBlocked,
                    waived
                },
                customers: {
                    total: customerTotalResult[0] || 0,
                    withOrders: customersWithOrdersResult[0] || 0
                },
                funnel: stageOrder.map(stage => ({
                    stage,
                    count: funnelCounts[stage] || 0
                })),
                revenue: {
                    mrr,
                    totalCollected,
                    currency: "AUD"
                },
                recentActivity: {
                    vendorsToday: vendorsToday[0] || 0,
                    vendorsThisWeek: vendorsThisWeek[0] || 0,
                    vendorsThisMonth: vendorsThisMonth[0] || 0,
                    customersToday: customersToday[0] || 0,
                    customersThisWeek: customersThisWeek[0] || 0,
                    customersThisMonth: customersThisMonth[0] || 0
                }
            }
        },

        consoleVendorDetail: async (_: any, args: { id: string }, context: serverContext) => {
            try {
                const vendor = await context.dataSources.cosmos.get_record<vendor_type & { createdDate?: string }>(
                    VENDOR_CONTAINER,
                    args.id,
                    args.id
                )
                return {
                    ...vendor,
                    lifecycleStage: computeLifecycleStage(vendor)
                }
            } catch {
                return null
            }
        }
    },

    Mutation: {
        updateVendorSubscriptionOverride: async (_: any, args: {
            vendorId: string
            input: {
                discountPercent?: number
                waived?: boolean
                waivedUntil?: string
                overrideNotes?: string
            }
        }, context: serverContext) => {
            const { vendorId, input } = args

            // Validate discount percent
            if (input.discountPercent !== undefined && input.discountPercent !== null) {
                if (input.discountPercent < 0 || input.discountPercent > 100) {
                    return {
                        code: "400",
                        success: false,
                        message: "Discount percent must be between 0 and 100"
                    }
                }
            }

            const patchOps: PatchOperation[] = []

            // Set or remove discount
            if (input.discountPercent !== undefined) {
                if (input.discountPercent === 0 || input.discountPercent === null) {
                    patchOps.push({ op: "remove", path: "/subscription/discountPercent" })
                } else {
                    patchOps.push({ op: "set", path: "/subscription/discountPercent", value: input.discountPercent })
                }
            }

            // Set or remove waiver
            if (input.waived !== undefined) {
                if (input.waived) {
                    patchOps.push({ op: "set", path: "/subscription/waived", value: true })
                } else {
                    patchOps.push({ op: "remove", path: "/subscription/waived" })
                    patchOps.push({ op: "remove", path: "/subscription/waivedUntil" })
                }
            }

            // Set or remove waivedUntil
            if (input.waivedUntil !== undefined) {
                if (input.waivedUntil) {
                    patchOps.push({ op: "set", path: "/subscription/waivedUntil", value: input.waivedUntil })
                } else {
                    patchOps.push({ op: "remove", path: "/subscription/waivedUntil" })
                }
            }

            // Set or remove notes
            if (input.overrideNotes !== undefined) {
                if (input.overrideNotes) {
                    patchOps.push({ op: "set", path: "/subscription/overrideNotes", value: input.overrideNotes })
                } else {
                    patchOps.push({ op: "remove", path: "/subscription/overrideNotes" })
                }
            }

            if (patchOps.length === 0) {
                return {
                    code: "400",
                    success: false,
                    message: "No override fields provided"
                }
            }

            await context.dataSources.cosmos.patch_record(
                VENDOR_CONTAINER,
                vendorId,
                vendorId,
                patchOps,
                context.userId || "CONSOLE_ADMIN"
            )

            return {
                code: "200",
                success: true,
                message: "Subscription override updated successfully"
            }
        },

        unblockVendorPayouts: async (_: any, args: { vendorId: string }, context: serverContext) => {
            try {
                // Patch vendor to unblock payouts
                const patchOps: PatchOperation[] = [
                    { op: "set", path: "/subscription/payouts_blocked", value: false },
                    { op: "set", path: "/subscription/payment_retry_count", value: 0 },
                    { op: "set", path: "/subscription/payment_status", value: "not_attempted" },
                ]

                await context.dataSources.cosmos.patch_record(
                    VENDOR_CONTAINER,
                    args.vendorId,
                    args.vendorId,
                    patchOps,
                    context.userId || "CONSOLE_ADMIN"
                )

                // Restore automatic payouts on Stripe
                const vendor = await context.dataSources.cosmos.get_record<vendor_type>(
                    VENDOR_CONTAINER,
                    args.vendorId,
                    args.vendorId
                )

                if (vendor.stripe?.accountId) {
                    await context.dataSources.stripe.callApi("POST", `accounts/${vendor.stripe.accountId}`, {
                        settings: {
                            payouts: {
                                schedule: {
                                    interval: "daily"
                                }
                            }
                        }
                    })
                }

                return {
                    code: "200",
                    success: true,
                    message: "Vendor payouts unblocked successfully"
                }
            } catch (err: any) {
                return {
                    code: "500",
                    success: false,
                    message: err.message || "Failed to unblock payouts"
                }
            }
        },

        forcePublishVendor: async (_: any, args: { vendorId: string }, context: serverContext) => {
            try {
                const patchOps: PatchOperation[] = [
                    { op: "set", path: "/publishedAt", value: DateTime.now().toISO() },
                ]

                await context.dataSources.cosmos.patch_record(
                    VENDOR_CONTAINER,
                    args.vendorId,
                    args.vendorId,
                    patchOps,
                    context.userId || "CONSOLE_ADMIN"
                )

                return {
                    code: "200",
                    success: true,
                    message: "Vendor published successfully"
                }
            } catch (err: any) {
                return {
                    code: "500",
                    success: false,
                    message: err.message || "Failed to publish vendor"
                }
            }
        },

        resetVendorBillingRetry: async (_: any, args: { vendorId: string }, context: serverContext) => {
            try {
                const tomorrow = DateTime.now().plus({ days: 1 }).toISODate()

                const patchOps: PatchOperation[] = [
                    { op: "set", path: "/subscription/payment_retry_count", value: 0 },
                    { op: "set", path: "/subscription/payment_status", value: "not_attempted" },
                    { op: "set", path: "/subscription/next_billing_date", value: tomorrow },
                ]

                await context.dataSources.cosmos.patch_record(
                    VENDOR_CONTAINER,
                    args.vendorId,
                    args.vendorId,
                    patchOps,
                    context.userId || "CONSOLE_ADMIN"
                )

                return {
                    code: "200",
                    success: true,
                    message: "Billing retry reset successfully. Next billing scheduled for tomorrow."
                }
            } catch (err: any) {
                return {
                    code: "500",
                    success: false,
                    message: err.message || "Failed to reset billing retry"
                }
            }
        }
    }
}

const mergedResolvers = mergeDeep({}, resolvers, journeysResolvers)

export { mergedResolvers as resolvers }

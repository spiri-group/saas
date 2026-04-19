import { serverContext } from "../../services/azFunction"
import { vendor_type, VendorDocType } from "../vendor/types"
import { user_type } from "../user/types"
import { HTTPMethod, PatchOperation } from "@azure/cosmos"
import { VendorLifecycleStage, computeLifecycleStage } from "./types"
import { DateTime } from "luxon"
import { journeysResolvers } from "./journeys"
import { mergeDeep } from "../../utils/functions"
import { v4 as uuidv4 } from "uuid"

const VENDOR_CONTAINER = "Main-Vendor"
const USER_CONTAINER = "Main-User"
const ORDER_CONTAINER = "Main-Orders"

interface AdminNote {
    id: string
    content: string
    pinned: boolean
    createdBy: string
    createdAt: string
}

type AdminNotesHash = Record<string, Omit<AdminNote, 'id'>>

/** Converts the { noteId: { ... } } hashmap stored in Cosmos to a sorted array for GraphQL */
function notesHashToArray(hash?: AdminNotesHash): AdminNote[] {
    if (!hash || typeof hash !== 'object') return []
    return Object.entries(hash)
        .map(([id, note]) => ({ id, ...note }))
        .sort((a, b) => {
            // Pinned first, then by date descending
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })
}

function getContainerForAccountType(accountType: string): string {
    if (accountType === 'vendor') return VENDOR_CONTAINER
    if (accountType === 'customer') return USER_CONTAINER
    throw new Error(`Invalid account type: ${accountType}`)
}

/**
 * Hard-deletes every dependent record for a vendor across every container it touches.
 * Shared between purgeVendorAccount and purgeCustomerAccount (vendor-owner case).
 *
 * Each step is wrapped in a try/catch that logs but never throws — a single failing
 * record must not abort the rest of the cascade. The caller is responsible for the
 * outer try/catch, for the confirmName guard, and for the final Main-Vendor delete.
 */
async function cascadeVendorPurgeRecords(
    vendorId: string,
    vendor: vendor_type,
    context: serverContext
): Promise<void> {
    const logTag = "[PURGE_VENDOR]"

    // Delete Stripe connected account
    if (vendor.stripe?.accountId) {
        try {
            await context.dataSources.stripe.callApi(HTTPMethod.delete, `accounts/${vendor.stripe.accountId}`, null)
            context.logger.logMessage(`${logTag} Deleted Stripe connected account ${vendor.stripe.accountId}`)
        } catch (err) {
            context.logger.error(`${logTag} Failed to delete Stripe account: ${err}`)
        }
    }

    // Delete Stripe customer
    if (vendor.stripe?.customerId) {
        try {
            await context.dataSources.stripe.callApi(HTTPMethod.delete, `customers/${vendor.stripe.customerId}`, null)
            context.logger.logMessage(`${logTag} Deleted Stripe customer ${vendor.stripe.customerId}`)
        } catch (err) {
            context.logger.error(`${logTag} Failed to delete Stripe customer: ${err}`)
        }
    }

    // Helper to purge all records from a container matching a query, keyed by @id = vendorId
    const purgeContainer = async (
        containerName: string,
        query: string,
        partitionKeyFn: (record: any) => string | string[]
    ) => {
        try {
            const records = await context.dataSources.cosmos.run_query<any>(containerName, {
                query,
                parameters: [{ name: "@id", value: vendorId }]
            }, true)

            if (records.length > 0) {
                context.logger.logMessage(`${logTag} Deleting ${records.length} records from ${containerName}`)
                for (const record of records) {
                    try {
                        await context.dataSources.cosmos.purge_record(containerName, record.id, partitionKeyFn(record))
                    } catch (err) {
                        context.logger.error(`${logTag} Failed to delete ${containerName}/${record.id}: ${err}`)
                    }
                }
            }
        } catch (err) {
            context.logger.error(`${logTag} Failed to query ${containerName}: ${err}`)
        }
    }

    // Vendor-partitioned containers
    await purgeContainer("Main-Listing", "SELECT c.id FROM c WHERE c.vendorId = @id", () => vendorId)
    await purgeContainer("Main-Gallery", "SELECT c.id FROM c WHERE c.vendorId = @id", () => vendorId)
    await purgeContainer("Main-SocialPost", "SELECT c.id FROM c WHERE c.vendorId = @id", () => vendorId)
    await purgeContainer("Main-VendorSettings", "SELECT c.id FROM c WHERE c.vendorId = @id", () => vendorId)
    await purgeContainer("Main-FeaturingRelationship", "SELECT c.id FROM c WHERE c.merchantId = @id", () => vendorId)
    // Main-PaymentLinks is partitioned by /createdBy; links created by this vendor have createdBy=vendorId.
    await purgeContainer("Main-PaymentLinks", "SELECT c.id FROM c WHERE c.vendorId = @id", () => vendorId)
    await purgeContainer("Main-ShoppingCart", "SELECT c.id FROM c WHERE c.vendorId = @id", (r) => r.id)
    await purgeContainer("Main-LiveAssist", "SELECT c.id FROM c WHERE c.partitionKey = @id", () => vendorId)
    await purgeContainer("Main-ExpoMode", "SELECT c.id FROM c WHERE c.partitionKey = @id", () => vendorId)
    // Main-Follow is partitioned by /targetId; rows where this vendor is the target share vendorId as the partition.
    await purgeContainer("Main-Follow", "SELECT c.id FROM c WHERE c.targetId = @id", () => vendorId)

    // Practitioner schedules (partition: practitionerId)
    await purgeContainer("Main-PractitionerSchedules", "SELECT c.id, c.practitionerId FROM c WHERE c.practitionerId = @id", (r) => r.practitionerId)

    // Main-FeaturingRelationship practitioner side (practitionerId stored here, partition is /merchantId)
    await purgeContainer(
        "Main-FeaturingRelationship",
        "SELECT c.id, c.merchantId FROM c WHERE c.practitionerId = @id",
        (r) => r.merchantId
    )

    // Bookings (partition: [type, customerEmail])
    try {
        const bookings = await context.dataSources.cosmos.run_query<any>("Main-Bookings", {
            query: "SELECT c.id, c.type, c.customerEmail FROM c WHERE c.vendorId = @id",
            parameters: [{ name: "@id", value: vendorId }]
        }, true)
        if (bookings.length > 0) {
            context.logger.logMessage(`${logTag} Deleting ${bookings.length} records from Main-Bookings`)
            for (const booking of bookings) {
                try {
                    await context.dataSources.cosmos.purge_record("Main-Bookings", booking.id, [booking.type, booking.customerEmail])
                } catch (err) {
                    context.logger.error(`${logTag} Failed to delete booking ${booking.id}: ${err}`)
                }
            }
        }
    } catch (err) {
        context.logger.error(`${logTag} Failed to query Main-Bookings: ${err}`)
    }

    // Tour-Waitlist (partition: [sessionRef.id, vendorId])
    try {
        const waitlistEntries = await context.dataSources.cosmos.run_query<any>("Tour-Waitlist", {
            query: "SELECT c.id, c.sessionRef, c.vendorId FROM c WHERE c.vendorId = @id",
            parameters: [{ name: "@id", value: vendorId }]
        }, true)
        if (waitlistEntries.length > 0) {
            context.logger.logMessage(`${logTag} Deleting ${waitlistEntries.length} records from Tour-Waitlist`)
            for (const entry of waitlistEntries) {
                try {
                    await context.dataSources.cosmos.purge_record(
                        "Tour-Waitlist",
                        entry.id,
                        [entry.sessionRef?.id, entry.vendorId]
                    )
                } catch (err) {
                    context.logger.error(`${logTag} Failed to delete waitlist entry ${entry.id}: ${err}`)
                }
            }
        }
    } catch (err) {
        context.logger.error(`${logTag} Failed to query Tour-Waitlist: ${err}`)
    }

    // Orders (partition: id). Broadened to also catch orders where any line item lists this vendor as merchant.
    await purgeContainer(
        "Main-Orders",
        "SELECT c.id FROM c WHERE c.vendorId = @id OR EXISTS(SELECT VALUE l FROM l IN c.lines WHERE l.merchantId = @id)",
        (r) => r.id
    )

    // Cases + their offers + their interactions (cascade by caseId)
    try {
        const cases = await context.dataSources.cosmos.run_query<any>("Main-Cases", {
            query: "SELECT c.id FROM c WHERE c.vendorId = @id",
            parameters: [{ name: "@id", value: vendorId }]
        }, true)
        if (cases.length > 0) {
            for (const caseDoc of cases) {
                // Main-CaseOffers partitioned by /caseId
                try {
                    const offers = await context.dataSources.cosmos.run_query<any>("Main-CaseOffers", {
                        query: "SELECT c.id FROM c WHERE c.caseId = @caseId",
                        parameters: [{ name: "@caseId", value: caseDoc.id }]
                    }, true)
                    for (const offer of offers) {
                        try {
                            await context.dataSources.cosmos.purge_record("Main-CaseOffers", offer.id, caseDoc.id)
                        } catch (err) {
                            context.logger.error(`${logTag} Failed to delete case offer ${offer.id}: ${err}`)
                        }
                    }
                } catch (err) {
                    context.logger.error(`${logTag} Failed to query Main-CaseOffers for case ${caseDoc.id}: ${err}`)
                }

                // Main-CaseInteraction partitioned by /caseRef/id
                try {
                    const interactions = await context.dataSources.cosmos.run_query<any>("Main-CaseInteraction", {
                        query: "SELECT c.id FROM c WHERE c.caseRef.id = @caseId",
                        parameters: [{ name: "@caseId", value: caseDoc.id }]
                    }, true)
                    for (const interaction of interactions) {
                        try {
                            await context.dataSources.cosmos.purge_record("Main-CaseInteraction", interaction.id, caseDoc.id)
                        } catch (err) {
                            context.logger.error(`${logTag} Failed to delete case interaction ${interaction.id}: ${err}`)
                        }
                    }
                } catch (err) {
                    context.logger.error(`${logTag} Failed to query Main-CaseInteraction for case ${caseDoc.id}: ${err}`)
                }
            }

            // Purge the cases themselves
            for (const caseDoc of cases) {
                try {
                    await context.dataSources.cosmos.purge_record("Main-Cases", caseDoc.id, caseDoc.id)
                } catch (err) {
                    context.logger.error(`${logTag} Failed to delete case ${caseDoc.id}: ${err}`)
                }
            }
        }
    } catch (err) {
        context.logger.error(`${logTag} Failed to query Main-Cases: ${err}`)
    }

    // Comments related to vendor (composite partition [forObject.partition, forObject.id])
    try {
        const comments = await context.dataSources.cosmos.run_query<any>("Main-Comments", {
            query: "SELECT c.id, c.forObject FROM c WHERE c.vendorId = @id",
            parameters: [{ name: "@id", value: vendorId }]
        }, true)
        if (comments.length > 0) {
            context.logger.logMessage(`${logTag} Deleting ${comments.length} records from Main-Comments`)
            for (const comment of comments) {
                try {
                    await context.dataSources.cosmos.purge_record(
                        "Main-Comments",
                        comment.id,
                        [comment.forObject?.partition, comment.forObject?.id]
                    )
                } catch (err) {
                    context.logger.error(`${logTag} Failed to delete comment ${comment.id}: ${err}`)
                }
            }
        }
    } catch (err) {
        context.logger.error(`${logTag} Failed to query Main-Comments: ${err}`)
    }

    // Messages posted by this vendor (composite partition [topicRef.partition, topicRef.id])
    try {
        const messages = await context.dataSources.cosmos.run_query<any>("Main-Message", {
            query: "SELECT c.id, c.topicRef FROM c WHERE c.posted_by_vendorId = @id",
            parameters: [{ name: "@id", value: vendorId }]
        }, true)
        if (messages.length > 0) {
            context.logger.logMessage(`${logTag} Deleting ${messages.length} records from Main-Message`)
            for (const message of messages) {
                try {
                    await context.dataSources.cosmos.purge_record(
                        "Main-Message",
                        message.id,
                        [message.topicRef?.partition, message.topicRef?.id]
                    )
                } catch (err) {
                    context.logger.error(`${logTag} Failed to delete message ${message.id}: ${err}`)
                }
            }
        }
    } catch (err) {
        context.logger.error(`${logTag} Failed to query Main-Message: ${err}`)
    }

    // Tour sessions (composite partition [forObject.partition, forObject.id])
    try {
        const sessions = await context.dataSources.cosmos.run_query<any>("Tour-Session", {
            query: "SELECT c.id, c.forObject FROM c WHERE c.vendorId = @id",
            parameters: [{ name: "@id", value: vendorId }]
        }, true)
        if (sessions.length > 0) {
            context.logger.logMessage(`${logTag} Deleting ${sessions.length} records from Tour-Session`)
            for (const session of sessions) {
                try {
                    await context.dataSources.cosmos.purge_record(
                        "Tour-Session",
                        session.id,
                        [session.forObject?.partition, session.forObject?.id]
                    )
                } catch (err) {
                    context.logger.error(`${logTag} Failed to delete tour session ${session.id}: ${err}`)
                }
            }
        }
    } catch (err) {
        context.logger.error(`${logTag} Failed to query Tour-Session: ${err}`)
    }

    // PersonalSpace reading requests where this vendor is the reader (lives in requester's partition)
    try {
        const readerDocs = await context.dataSources.cosmos.run_query<any>("Main-PersonalSpace", {
            query: "SELECT c.id, c.userId FROM c WHERE c.docType = 'READING_REQUEST' AND c.readerId = @id",
            parameters: [{ name: "@id", value: vendorId }]
        }, true)
        if (readerDocs.length > 0) {
            context.logger.logMessage(`${logTag} Deleting ${readerDocs.length} reader docs from Main-PersonalSpace`)
            for (const doc of readerDocs) {
                try {
                    await context.dataSources.cosmos.purge_record("Main-PersonalSpace", doc.id, doc.userId)
                } catch (err) {
                    context.logger.error(`${logTag} Failed to delete reader doc ${doc.id}: ${err}`)
                }
            }
        }
    } catch (err) {
        context.logger.error(`${logTag} Failed to query reader Main-PersonalSpace docs: ${err}`)
    }

    // LiveAssist queue entries (live-queue-entry) are partitioned by sessionId via /partitionKey.
    // Sessions themselves were deleted above; this sweeps any orphaned queue entries for this vendor.
    try {
        const queueEntries = await context.dataSources.cosmos.run_query<any>("Main-LiveAssist", {
            query: "SELECT c.id, c.partitionKey FROM c WHERE c.docType = 'live-queue-entry' AND c.vendorId = @id",
            parameters: [{ name: "@id", value: vendorId }]
        }, true)
        if (queueEntries.length > 0) {
            context.logger.logMessage(`${logTag} Deleting ${queueEntries.length} live-queue-entry records`)
            for (const entry of queueEntries) {
                try {
                    await context.dataSources.cosmos.purge_record("Main-LiveAssist", entry.id, entry.partitionKey)
                } catch (err) {
                    context.logger.error(`${logTag} Failed to delete queue entry ${entry.id}: ${err}`)
                }
            }
        }
    } catch (err) {
        context.logger.error(`${logTag} Failed to query Main-LiveAssist queue entries: ${err}`)
    }

    // ExpoMode expo-item and expo-sale docs are partitioned by expoId via /partitionKey.
    try {
        const expoChildren = await context.dataSources.cosmos.run_query<any>("Main-ExpoMode", {
            query: "SELECT c.id, c.partitionKey FROM c WHERE c.docType IN ('expo-item', 'expo-sale') AND c.vendorId = @id",
            parameters: [{ name: "@id", value: vendorId }]
        }, true)
        if (expoChildren.length > 0) {
            context.logger.logMessage(`${logTag} Deleting ${expoChildren.length} expo-item/expo-sale records`)
            for (const child of expoChildren) {
                try {
                    await context.dataSources.cosmos.purge_record("Main-ExpoMode", child.id, child.partitionKey)
                } catch (err) {
                    context.logger.error(`${logTag} Failed to delete expo child ${child.id}: ${err}`)
                }
            }
        }
    } catch (err) {
        context.logger.error(`${logTag} Failed to query Main-ExpoMode children: ${err}`)
    }

    // Remove vendor reference from ALL users who have it in their vendors array
    try {
        const usersWithVendor = await context.dataSources.cosmos.run_query<{ id: string }>(
            USER_CONTAINER,
            {
                query: "SELECT c.id FROM c WHERE ARRAY_CONTAINS(c.vendors, {id: @vendorId}, true)",
                parameters: [{ name: "@vendorId", value: vendorId }]
            },
            true
        )
        for (const user of usersWithVendor) {
            try {
                const userRecord = await context.dataSources.cosmos.get_record<user_type>(USER_CONTAINER, user.id, user.id)
                if (userRecord?.vendors) {
                    const updatedVendors = userRecord.vendors.filter((v: any) => v.id !== vendorId)
                    const patchOps: PatchOperation[] = [
                        { op: "set", path: "/vendors", value: updatedVendors }
                    ]
                    await context.dataSources.cosmos.patch_record(
                        USER_CONTAINER, user.id, user.id, patchOps, context.userId || "CONSOLE_ADMIN"
                    )
                    context.logger.logMessage(`${logTag} Removed vendor ref from user ${user.id}`)
                }
            } catch (err) {
                context.logger.error(`${logTag} Failed to update user ${user.id}: ${err}`)
            }
        }
    } catch (err) {
        context.logger.error(`${logTag} Failed to query users with vendor reference: ${err}`)
    }

    // Finally, delete the vendor document itself
    try {
        await context.dataSources.cosmos.purge_record(VENDOR_CONTAINER, vendorId, vendorId)
        context.logger.logMessage(`${logTag} Purged vendor document ${vendorId}`)
    } catch (err) {
        context.logger.error(`${logTag} Failed to purge vendor document ${vendorId}: ${err}`)
    }
}

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
                query: `SELECT c.id, c.name, c.slug, c.docType, c.publishedAt, c.subscription, c.stripe, c.createdDate, c.customers, c.accountBlocked, c.accountBlockedAt, c.accountBlockedReason, c.adminNotes FROM c ${whereClause} ORDER BY c.createdDate DESC`,
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

            // Resolve owner emails for paginated vendors
            const ownerIds = paginated
                .map(v => (v as any).customers?.[0]?.id)
                .filter((id: string | undefined): id is string => !!id)

            let ownerMap: Record<string, string> = {}
            if (ownerIds.length > 0) {
                const uniqueIds = [...new Set(ownerIds)]
                const owners = await context.dataSources.cosmos.run_query<user_type>(
                    USER_CONTAINER,
                    {
                        query: `SELECT c.id, c.email FROM c WHERE ARRAY_CONTAINS(@ids, c.id)`,
                        parameters: [{ name: "@ids", value: uniqueIds }]
                    },
                    true
                )
                ownerMap = Object.fromEntries(owners.map(o => [o.id, o.email]))
            }

            const vendorsWithOwner = paginated.map(v => ({
                ...v,
                ownerEmail: ownerMap[(v as any).customers?.[0]?.id] || null,
                customers: undefined,
                adminNotes: notesHashToArray((v as any).adminNotes),
            }))

            return {
                vendors: vendorsWithOwner,
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
                query: `SELECT c.id, c.firstname, c.lastname, c.email, c.spiritualInterests, c.createdDate, c.adminNotes FROM c ${whereClause} ORDER BY c.createdDate DESC OFFSET @offset LIMIT @limit`,
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
                        orderCount: orderCountResult[0] || 0,
                        adminNotes: notesHashToArray((customer as any).adminNotes),
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
        },

        purgeVendorAccount: async (_: any, args: { vendorId: string, confirmName: string }, context: serverContext) => {
            try {
                const vendorId = args.vendorId

                // Fetch the vendor
                const vendor = await context.dataSources.cosmos.get_record<vendor_type>(
                    VENDOR_CONTAINER, vendorId, vendorId
                )

                if (!vendor) {
                    return { code: "404", success: false, message: "Vendor not found" }
                }

                // Verify confirmName matches
                if (vendor.name !== args.confirmName) {
                    return { code: "400", success: false, message: "Confirmation name does not match vendor name" }
                }

                context.logger.logMessage(`[PURGE_VENDOR] Starting purge for vendor: ${vendor.name} (${vendorId})`)

                await cascadeVendorPurgeRecords(vendorId, vendor, context)

                return {
                    code: "200",
                    success: true,
                    message: `Vendor "${vendor.name}" has been permanently deleted`
                }
            } catch (err: any) {
                return {
                    code: "500",
                    success: false,
                    message: err.message || "Failed to purge vendor account"
                }
            }
        },

        purgeCustomerAccount: async (_: any, args: { userId: string, confirmEmail: string }, context: serverContext) => {
            try {
                const userId = args.userId

                // Fetch the user
                const user = await context.dataSources.cosmos.get_record<user_type>(
                    USER_CONTAINER, userId, userId
                )

                if (!user) {
                    return { code: "404", success: false, message: "Customer not found" }
                }

                // Verify confirmEmail matches
                if (user.email !== args.confirmEmail) {
                    return { code: "400", success: false, message: "Confirmation email does not match customer email" }
                }

                const userEmail = user.email
                context.logger.logMessage(`[PURGE_CUSTOMER] Starting purge for customer: ${userEmail} (${userId})`)

                // 1. Owned vendors — cascade each full vendor purge via the shared helper
                if (user.vendors && user.vendors.length > 0) {
                    for (const vendorRef of user.vendors) {
                        try {
                            const ownedVendor = await context.dataSources.cosmos.get_record<vendor_type>(
                                VENDOR_CONTAINER, vendorRef.id, vendorRef.id
                            )
                            if (ownedVendor) {
                                context.logger.logMessage(`[PURGE_CUSTOMER] Cascading vendor purge for ${ownedVendor.name} (${vendorRef.id})`)
                                await cascadeVendorPurgeRecords(vendorRef.id, ownedVendor, context)
                            }
                        } catch (err) {
                            context.logger.error(`[PURGE_CUSTOMER] Failed to cascade vendor ${vendorRef.id}: ${err}`)
                        }
                    }
                }

                // 2. Stripe customer (best-effort)
                if (user.stripe?.customerId) {
                    try {
                        await context.dataSources.stripe.callApi(HTTPMethod.delete, `customers/${user.stripe.customerId}`, null)
                        context.logger.logMessage(`[PURGE_CUSTOMER] Deleted Stripe customer ${user.stripe.customerId}`)
                    } catch (err) {
                        context.logger.error(`[PURGE_CUSTOMER] Failed to delete Stripe customer: ${err}`)
                    }
                }

                // 3. Main-Follow where user is follower; decrement followerCount on each target vendor.
                const followTargetIds = new Set<string>()
                try {
                    const follows = await context.dataSources.cosmos.run_query<any>("Main-Follow", {
                        query: "SELECT c.id, c.targetId FROM c WHERE c.followerId = @userId",
                        parameters: [{ name: "@userId", value: userId }]
                    }, true)
                    if (follows.length > 0) {
                        context.logger.logMessage(`[PURGE_CUSTOMER] Deleting ${follows.length} follow records`)
                        for (const follow of follows) {
                            try {
                                await context.dataSources.cosmos.purge_record("Main-Follow", follow.id, follow.targetId)
                                if (follow.targetId) followTargetIds.add(follow.targetId)
                            } catch (err) {
                                context.logger.error(`[PURGE_CUSTOMER] Failed to delete follow ${follow.id}: ${err}`)
                            }
                        }
                    }
                } catch (err) {
                    context.logger.error(`[PURGE_CUSTOMER] Failed to query Main-Follow: ${err}`)
                }
                for (const targetId of followTargetIds) {
                    try {
                        const targetVendor = await context.dataSources.cosmos.get_record<any>(VENDOR_CONTAINER, targetId, targetId)
                        if (targetVendor && typeof targetVendor.followerCount === "number") {
                            const newCount = Math.max(0, targetVendor.followerCount - 1)
                            await context.dataSources.cosmos.patch_record(
                                VENDOR_CONTAINER,
                                targetId,
                                targetId,
                                [{ op: "set", path: "/followerCount", value: newCount }],
                                context.userId || "CONSOLE_ADMIN"
                            )
                        }
                    } catch (err) {
                        context.logger.error(`[PURGE_CUSTOMER] Failed to decrement followerCount for ${targetId}: ${err}`)
                    }
                }

                // 4. Main-ShoppingCart (id=userId, partition=userId)
                try {
                    await context.dataSources.cosmos.purge_record("Main-ShoppingCart", userId, userId)
                    context.logger.logMessage(`[PURGE_CUSTOMER] Purged shopping cart for ${userId}`)
                } catch (err) {
                    context.logger.error(`[PURGE_CUSTOMER] Failed to purge shopping cart: ${err}`)
                }

                // 5. Main-PersonalSpace docs owned by this user
                try {
                    const personalDocs = await context.dataSources.cosmos.run_query<any>("Main-PersonalSpace", {
                        query: "SELECT c.id FROM c WHERE c.userId = @userId",
                        parameters: [{ name: "@userId", value: userId }]
                    }, true)
                    if (personalDocs.length > 0) {
                        context.logger.logMessage(`[PURGE_CUSTOMER] Deleting ${personalDocs.length} PersonalSpace docs (owner)`)
                        for (const doc of personalDocs) {
                            try {
                                await context.dataSources.cosmos.purge_record("Main-PersonalSpace", doc.id, userId)
                            } catch (err) {
                                context.logger.error(`[PURGE_CUSTOMER] Failed to delete PersonalSpace doc ${doc.id}: ${err}`)
                            }
                        }
                    }
                } catch (err) {
                    context.logger.error(`[PURGE_CUSTOMER] Failed to query Main-PersonalSpace (owner): ${err}`)
                }

                // 6. Main-PersonalSpace where user is reader (doc lives in another user's partition)
                try {
                    const readerDocs = await context.dataSources.cosmos.run_query<any>("Main-PersonalSpace", {
                        query: "SELECT c.id, c.userId FROM c WHERE c.readerId = @userId",
                        parameters: [{ name: "@userId", value: userId }]
                    }, true)
                    if (readerDocs.length > 0) {
                        context.logger.logMessage(`[PURGE_CUSTOMER] Deleting ${readerDocs.length} PersonalSpace docs (reader)`)
                        for (const doc of readerDocs) {
                            try {
                                await context.dataSources.cosmos.purge_record("Main-PersonalSpace", doc.id, doc.userId)
                            } catch (err) {
                                context.logger.error(`[PURGE_CUSTOMER] Failed to delete reader PersonalSpace doc ${doc.id}: ${err}`)
                            }
                        }
                    }
                } catch (err) {
                    context.logger.error(`[PURGE_CUSTOMER] Failed to query Main-PersonalSpace (reader): ${err}`)
                }

                // 7. Main-Bookings — match by userId OR customerEmail (partition: [type, customerEmail])
                try {
                    const bookings = await context.dataSources.cosmos.run_query<any>("Main-Bookings", {
                        query: "SELECT c.id, c.type, c.customerEmail FROM c WHERE c.userId = @userId OR c.customerEmail = @email",
                        parameters: [
                            { name: "@userId", value: userId },
                            { name: "@email", value: userEmail }
                        ]
                    }, true)
                    if (bookings.length > 0) {
                        context.logger.logMessage(`[PURGE_CUSTOMER] Deleting ${bookings.length} bookings`)
                        for (const booking of bookings) {
                            try {
                                await context.dataSources.cosmos.purge_record("Main-Bookings", booking.id, [booking.type, booking.customerEmail])
                            } catch (err) {
                                context.logger.error(`[PURGE_CUSTOMER] Failed to delete booking ${booking.id}: ${err}`)
                            }
                        }
                    }
                } catch (err) {
                    context.logger.error(`[PURGE_CUSTOMER] Failed to query Main-Bookings: ${err}`)
                }

                // 8. Tour-Waitlist (partition: [sessionRef.id, vendorId])
                try {
                    const waitlistEntries = await context.dataSources.cosmos.run_query<any>("Tour-Waitlist", {
                        query: "SELECT c.id, c.sessionRef, c.vendorId FROM c WHERE c.customerEmail = @email",
                        parameters: [{ name: "@email", value: userEmail }]
                    }, true)
                    if (waitlistEntries.length > 0) {
                        context.logger.logMessage(`[PURGE_CUSTOMER] Deleting ${waitlistEntries.length} waitlist entries`)
                        for (const entry of waitlistEntries) {
                            try {
                                await context.dataSources.cosmos.purge_record(
                                    "Tour-Waitlist",
                                    entry.id,
                                    [entry.sessionRef?.id, entry.vendorId]
                                )
                            } catch (err) {
                                context.logger.error(`[PURGE_CUSTOMER] Failed to delete waitlist entry ${entry.id}: ${err}`)
                            }
                        }
                    }
                } catch (err) {
                    context.logger.error(`[PURGE_CUSTOMER] Failed to query Tour-Waitlist: ${err}`)
                }

                // 9. Main-Cases owned by user + their offers + interactions
                try {
                    const cases = await context.dataSources.cosmos.run_query<any>("Main-Cases", {
                        query: "SELECT c.id FROM c WHERE c.userId = @userId",
                        parameters: [{ name: "@userId", value: userId }]
                    }, true)
                    for (const caseDoc of cases) {
                        try {
                            const offers = await context.dataSources.cosmos.run_query<any>("Main-CaseOffers", {
                                query: "SELECT c.id FROM c WHERE c.caseId = @caseId",
                                parameters: [{ name: "@caseId", value: caseDoc.id }]
                            }, true)
                            for (const offer of offers) {
                                try {
                                    await context.dataSources.cosmos.purge_record("Main-CaseOffers", offer.id, caseDoc.id)
                                } catch (err) {
                                    context.logger.error(`[PURGE_CUSTOMER] Failed to delete case offer ${offer.id}: ${err}`)
                                }
                            }
                        } catch (err) {
                            context.logger.error(`[PURGE_CUSTOMER] Failed to query Main-CaseOffers for case ${caseDoc.id}: ${err}`)
                        }

                        try {
                            const interactions = await context.dataSources.cosmos.run_query<any>("Main-CaseInteraction", {
                                query: "SELECT c.id FROM c WHERE c.caseRef.id = @caseId",
                                parameters: [{ name: "@caseId", value: caseDoc.id }]
                            }, true)
                            for (const interaction of interactions) {
                                try {
                                    await context.dataSources.cosmos.purge_record("Main-CaseInteraction", interaction.id, caseDoc.id)
                                } catch (err) {
                                    context.logger.error(`[PURGE_CUSTOMER] Failed to delete case interaction ${interaction.id}: ${err}`)
                                }
                            }
                        } catch (err) {
                            context.logger.error(`[PURGE_CUSTOMER] Failed to query Main-CaseInteraction for case ${caseDoc.id}: ${err}`)
                        }

                        try {
                            await context.dataSources.cosmos.purge_record("Main-Cases", caseDoc.id, caseDoc.id)
                        } catch (err) {
                            context.logger.error(`[PURGE_CUSTOMER] Failed to delete case ${caseDoc.id}: ${err}`)
                        }
                    }
                } catch (err) {
                    context.logger.error(`[PURGE_CUSTOMER] Failed to query Main-Cases: ${err}`)
                }

                // 9b. CaseInteractions posted by this user on someone else's case
                try {
                    const foreignInteractions = await context.dataSources.cosmos.run_query<any>("Main-CaseInteraction", {
                        query: "SELECT c.id, c.caseRef FROM c WHERE c.posted_by_userId = @userId",
                        parameters: [{ name: "@userId", value: userId }]
                    }, true)
                    if (foreignInteractions.length > 0) {
                        context.logger.logMessage(`[PURGE_CUSTOMER] Deleting ${foreignInteractions.length} foreign case interactions`)
                        for (const interaction of foreignInteractions) {
                            try {
                                await context.dataSources.cosmos.purge_record("Main-CaseInteraction", interaction.id, interaction.caseRef?.id)
                            } catch (err) {
                                context.logger.error(`[PURGE_CUSTOMER] Failed to delete foreign case interaction ${interaction.id}: ${err}`)
                            }
                        }
                    }
                } catch (err) {
                    context.logger.error(`[PURGE_CUSTOMER] Failed to query foreign Main-CaseInteraction: ${err}`)
                }

                // 10. Main-Orders placed by this user (partition: /orderId, which equals /id)
                try {
                    const orders = await context.dataSources.cosmos.run_query<any>(ORDER_CONTAINER, {
                        query: "SELECT c.id FROM c WHERE c.userId = @userId",
                        parameters: [{ name: "@userId", value: userId }]
                    }, true)
                    if (orders.length > 0) {
                        context.logger.logMessage(`[PURGE_CUSTOMER] Deleting ${orders.length} orders`)
                        for (const order of orders) {
                            try {
                                await context.dataSources.cosmos.purge_record(ORDER_CONTAINER, order.id, order.id)
                            } catch (err) {
                                context.logger.error(`[PURGE_CUSTOMER] Failed to delete order ${order.id}: ${err}`)
                            }
                        }
                    }
                } catch (err) {
                    context.logger.error(`[PURGE_CUSTOMER] Failed to query Main-Orders: ${err}`)
                }

                // 11. Main-PaymentLinks where this customer is the payer (partition: /createdBy)
                try {
                    const paymentLinks = await context.dataSources.cosmos.run_query<any>("Main-PaymentLinks", {
                        query: "SELECT c.id, c.createdBy FROM c WHERE c.customerEmail = @email",
                        parameters: [{ name: "@email", value: userEmail }]
                    }, true)
                    if (paymentLinks.length > 0) {
                        context.logger.logMessage(`[PURGE_CUSTOMER] Deleting ${paymentLinks.length} payment link references`)
                        for (const link of paymentLinks) {
                            try {
                                await context.dataSources.cosmos.purge_record("Main-PaymentLinks", link.id, link.createdBy)
                            } catch (err) {
                                context.logger.error(`[PURGE_CUSTOMER] Failed to delete payment link ${link.id}: ${err}`)
                            }
                        }
                    }
                } catch (err) {
                    context.logger.error(`[PURGE_CUSTOMER] Failed to query Main-PaymentLinks: ${err}`)
                }

                // 12. Main-LiveAssist queue entries for this customer (partition: sessionId via /partitionKey)
                try {
                    const queueEntries = await context.dataSources.cosmos.run_query<any>("Main-LiveAssist", {
                        query: "SELECT c.id, c.partitionKey FROM c WHERE c.docType = 'live-queue-entry' AND c.customerEmail = @email",
                        parameters: [{ name: "@email", value: userEmail }]
                    }, true)
                    if (queueEntries.length > 0) {
                        context.logger.logMessage(`[PURGE_CUSTOMER] Deleting ${queueEntries.length} live-queue-entry records`)
                        for (const entry of queueEntries) {
                            try {
                                await context.dataSources.cosmos.purge_record("Main-LiveAssist", entry.id, entry.partitionKey)
                            } catch (err) {
                                context.logger.error(`[PURGE_CUSTOMER] Failed to delete queue entry ${entry.id}: ${err}`)
                            }
                        }
                    }
                } catch (err) {
                    context.logger.error(`[PURGE_CUSTOMER] Failed to query Main-LiveAssist queue entries: ${err}`)
                }

                // 13. Main-ExpoMode expo-sale docs for this customer (partition: expoId via /partitionKey)
                try {
                    const expoSales = await context.dataSources.cosmos.run_query<any>("Main-ExpoMode", {
                        query: "SELECT c.id, c.partitionKey FROM c WHERE c.docType = 'expo-sale' AND c.customerEmail = @email",
                        parameters: [{ name: "@email", value: userEmail }]
                    }, true)
                    if (expoSales.length > 0) {
                        context.logger.logMessage(`[PURGE_CUSTOMER] Deleting ${expoSales.length} expo-sale records`)
                        for (const sale of expoSales) {
                            try {
                                await context.dataSources.cosmos.purge_record("Main-ExpoMode", sale.id, sale.partitionKey)
                            } catch (err) {
                                context.logger.error(`[PURGE_CUSTOMER] Failed to delete expo-sale ${sale.id}: ${err}`)
                            }
                        }
                    }
                } catch (err) {
                    context.logger.error(`[PURGE_CUSTOMER] Failed to query Main-ExpoMode expo-sale: ${err}`)
                }

                // 14. Main-VendorSettings testimonials and testimonial-requests keyed by clientEmail
                try {
                    const testimonials = await context.dataSources.cosmos.run_query<any>("Main-VendorSettings", {
                        query: "SELECT c.id, c.vendorId FROM c WHERE c.clientEmail = @email",
                        parameters: [{ name: "@email", value: userEmail }]
                    }, true)
                    if (testimonials.length > 0) {
                        context.logger.logMessage(`[PURGE_CUSTOMER] Deleting ${testimonials.length} testimonial records`)
                        for (const t of testimonials) {
                            try {
                                await context.dataSources.cosmos.purge_record("Main-VendorSettings", t.id, t.vendorId)
                            } catch (err) {
                                context.logger.error(`[PURGE_CUSTOMER] Failed to delete testimonial ${t.id}: ${err}`)
                            }
                        }
                    }
                } catch (err) {
                    context.logger.error(`[PURGE_CUSTOMER] Failed to query Main-VendorSettings testimonials: ${err}`)
                }

                // 15. Main-Comments posted by this user (composite partition [forObject.partition, forObject.id])
                try {
                    const postedComments = await context.dataSources.cosmos.run_query<any>("Main-Comments", {
                        query: "SELECT c.id, c.forObject FROM c WHERE c.posted_by_userId = @userId",
                        parameters: [{ name: "@userId", value: userId }]
                    }, true)
                    if (postedComments.length > 0) {
                        context.logger.logMessage(`[PURGE_CUSTOMER] Deleting ${postedComments.length} comments posted by user`)
                        for (const comment of postedComments) {
                            try {
                                await context.dataSources.cosmos.purge_record(
                                    "Main-Comments",
                                    comment.id,
                                    [comment.forObject?.partition, comment.forObject?.id]
                                )
                            } catch (err) {
                                context.logger.error(`[PURGE_CUSTOMER] Failed to delete comment ${comment.id}: ${err}`)
                            }
                        }
                    }
                } catch (err) {
                    context.logger.error(`[PURGE_CUSTOMER] Failed to query posted Main-Comments: ${err}`)
                }

                // 16. Main-Comments likes/dislikes referencing this user — strip the userId from both arrays
                try {
                    const ratedComments = await context.dataSources.cosmos.run_query<any>("Main-Comments", {
                        query: "SELECT c.id, c.forObject, c.liked_by, c.disliked_by FROM c WHERE ARRAY_CONTAINS(c.liked_by, @userId) OR ARRAY_CONTAINS(c.disliked_by, @userId)",
                        parameters: [{ name: "@userId", value: userId }]
                    }, true)
                    if (ratedComments.length > 0) {
                        context.logger.logMessage(`[PURGE_CUSTOMER] Scrubbing user from like/dislike arrays on ${ratedComments.length} comments`)
                        for (const comment of ratedComments) {
                            try {
                                const newLiked = Array.isArray(comment.liked_by)
                                    ? comment.liked_by.filter((id: string) => id !== userId)
                                    : []
                                const newDisliked = Array.isArray(comment.disliked_by)
                                    ? comment.disliked_by.filter((id: string) => id !== userId)
                                    : []
                                const ops: PatchOperation[] = [
                                    { op: "set", path: "/liked_by", value: newLiked },
                                    { op: "set", path: "/disliked_by", value: newDisliked }
                                ]
                                await context.dataSources.cosmos.patch_record(
                                    "Main-Comments",
                                    comment.id,
                                    [comment.forObject?.partition, comment.forObject?.id],
                                    ops,
                                    context.userId || "CONSOLE_ADMIN"
                                )
                            } catch (err) {
                                context.logger.error(`[PURGE_CUSTOMER] Failed to scrub comment ${comment.id}: ${err}`)
                            }
                        }
                    }
                } catch (err) {
                    context.logger.error(`[PURGE_CUSTOMER] Failed to query rated Main-Comments: ${err}`)
                }

                // 17. Main-Message posted by this user (composite partition [topicRef.partition, topicRef.id])
                try {
                    const postedMessages = await context.dataSources.cosmos.run_query<any>("Main-Message", {
                        query: "SELECT c.id, c.topicRef FROM c WHERE c.posted_by_userId = @userId",
                        parameters: [{ name: "@userId", value: userId }]
                    }, true)
                    if (postedMessages.length > 0) {
                        context.logger.logMessage(`[PURGE_CUSTOMER] Deleting ${postedMessages.length} messages posted by user`)
                        for (const message of postedMessages) {
                            try {
                                await context.dataSources.cosmos.purge_record(
                                    "Main-Message",
                                    message.id,
                                    [message.topicRef?.partition, message.topicRef?.id]
                                )
                            } catch (err) {
                                context.logger.error(`[PURGE_CUSTOMER] Failed to delete message ${message.id}: ${err}`)
                            }
                        }
                    }
                } catch (err) {
                    context.logger.error(`[PURGE_CUSTOMER] Failed to query posted Main-Message: ${err}`)
                }

                // 18. Main-Message deliver_to arrays referencing this user — strip user entries (best-effort)
                try {
                    const deliverMessages = await context.dataSources.cosmos.run_query<any>("Main-Message", {
                        query: "SELECT c.id, c.topicRef, c.deliver_to FROM c WHERE ARRAY_CONTAINS(c.deliver_to, {userId: @userId}, true)",
                        parameters: [{ name: "@userId", value: userId }]
                    }, true)
                    if (deliverMessages.length > 0) {
                        context.logger.logMessage(`[PURGE_CUSTOMER] Scrubbing user from deliver_to on ${deliverMessages.length} messages`)
                        for (const message of deliverMessages) {
                            try {
                                const newDeliverTo = Array.isArray(message.deliver_to)
                                    ? message.deliver_to.filter((d: any) => d?.userId !== userId)
                                    : message.deliver_to
                                await context.dataSources.cosmos.patch_record(
                                    "Main-Message",
                                    message.id,
                                    [message.topicRef?.partition, message.topicRef?.id],
                                    [{ op: "set", path: "/deliver_to", value: newDeliverTo }],
                                    context.userId || "CONSOLE_ADMIN"
                                )
                            } catch (err) {
                                context.logger.error(`[PURGE_CUSTOMER] Failed to scrub message ${message.id}: ${err}`)
                            }
                        }
                    }
                } catch (err) {
                    context.logger.error(`[PURGE_CUSTOMER] Failed to query deliver_to Main-Message: ${err}`)
                }

                // 19. Main-Listing moderate arrays referencing this user — strip the moderator entry
                try {
                    const moderatedListings = await context.dataSources.cosmos.run_query<any>("Main-Listing", {
                        query: "SELECT c.id, c.vendorId, c.moderate FROM c WHERE ARRAY_CONTAINS(c.moderate, {userId: @userId}, true)",
                        parameters: [{ name: "@userId", value: userId }]
                    }, true)
                    if (moderatedListings.length > 0) {
                        context.logger.logMessage(`[PURGE_CUSTOMER] Scrubbing user from moderate on ${moderatedListings.length} listings`)
                        for (const listing of moderatedListings) {
                            try {
                                const newModerate = Array.isArray(listing.moderate)
                                    ? listing.moderate.filter((m: any) => m?.userId !== userId)
                                    : listing.moderate
                                await context.dataSources.cosmos.patch_record(
                                    "Main-Listing",
                                    listing.id,
                                    listing.vendorId,
                                    [{ op: "set", path: "/moderate", value: newModerate }],
                                    context.userId || "CONSOLE_ADMIN"
                                )
                            } catch (err) {
                                context.logger.error(`[PURGE_CUSTOMER] Failed to scrub listing ${listing.id}: ${err}`)
                            }
                        }
                    }
                } catch (err) {
                    context.logger.error(`[PURGE_CUSTOMER] Failed to query moderated Main-Listing: ${err}`)
                }

                // 20. Auth table storage — mirror of purge_user cleanup
                try {
                    const tableStorage = context.dataSources.tableStorage

                    try {
                        await tableStorage.deleteEntity('auth', 'user', userId)
                        context.logger.logMessage(`[PURGE_CUSTOMER] Deleted user auth entry (pk=user)`)
                    } catch {
                        // Expected if user was created via a different auth flow
                    }

                    try {
                        await tableStorage.deleteEntity('auth', 'userByEmail', userEmail)
                        context.logger.logMessage(`[PURGE_CUSTOMER] Deleted userByEmail auth entry`)
                    } catch {
                        // Expected if user was created via a different auth flow
                    }

                    try {
                        const sessionIndex = await tableStorage.queryEntities<{ rowKey: string; sessionToken?: string }>(
                            'auth',
                            `PartitionKey eq 'sessionByUserId' and RowKey eq '${userId}'`
                        )
                        for (const indexEntry of sessionIndex) {
                            const sessionToken = indexEntry.sessionToken || indexEntry.rowKey
                            try {
                                await tableStorage.deleteEntity('auth', 'session', sessionToken)
                            } catch {
                                // Session may already be expired/deleted
                            }
                            try {
                                await tableStorage.deleteEntity('auth', 'sessionByUserId', userId)
                            } catch {
                                // Index entry may already be deleted
                            }
                        }
                    } catch {
                        // Sessions may not exist or already be cleaned up
                    }
                } catch (err) {
                    context.logger.logMessage(`[PURGE_CUSTOMER] Auth storage cleanup skipped: ${err}`)
                }

                // 21. Finally, delete the user document itself
                try {
                    await context.dataSources.cosmos.purge_record(USER_CONTAINER, userId, userId)
                    context.logger.logMessage(`[PURGE_CUSTOMER] Purged user document ${userId}`)
                } catch (err) {
                    context.logger.error(`[PURGE_CUSTOMER] Failed to purge user document ${userId}: ${err}`)
                }

                return {
                    code: "200",
                    success: true,
                    message: `Customer "${userEmail}" has been permanently deleted`
                }
            } catch (err: any) {
                return {
                    code: "500",
                    success: false,
                    message: err.message || "Failed to purge customer account"
                }
            }
        },

        blockVendorAccount: async (_: any, args: { vendorId: string, reason?: string }, context: serverContext) => {
            try {
                const vendor = await context.dataSources.cosmos.get_record<vendor_type>(
                    VENDOR_CONTAINER, args.vendorId, args.vendorId
                )

                if (!vendor) {
                    return { code: "404", success: false, message: "Vendor not found" }
                }

                const patchOps: PatchOperation[] = [
                    { op: "set", path: "/accountBlocked", value: true },
                    { op: "set", path: "/accountBlockedAt", value: DateTime.now().toISO() },
                ]

                if (args.reason) {
                    patchOps.push({ op: "set", path: "/accountBlockedReason", value: args.reason })
                }

                // Remove publishedAt to unpublish
                if (vendor.publishedAt) {
                    patchOps.push({ op: "remove", path: "/publishedAt" })
                }

                await context.dataSources.cosmos.patch_record(
                    VENDOR_CONTAINER,
                    args.vendorId,
                    args.vendorId,
                    patchOps,
                    context.userId || "CONSOLE_ADMIN"
                )

                // Set Stripe payouts to manual if vendor has a connected account
                if (vendor.stripe?.accountId) {
                    try {
                        await context.dataSources.stripe.callApi("POST", `accounts/${vendor.stripe.accountId}`, {
                            settings: {
                                payouts: {
                                    schedule: {
                                        interval: "manual"
                                    }
                                }
                            }
                        })
                    } catch (err) {
                        context.logger.error(`[BLOCK_VENDOR] Failed to set Stripe payouts to manual: ${err}`)
                    }
                }

                return {
                    code: "200",
                    success: true,
                    message: `Vendor "${vendor.name}" has been blocked`
                }
            } catch (err: any) {
                return {
                    code: "500",
                    success: false,
                    message: err.message || "Failed to block vendor account"
                }
            }
        },

        unblockVendorAccount: async (_: any, args: { vendorId: string }, context: serverContext) => {
            try {
                const vendor = await context.dataSources.cosmos.get_record<vendor_type>(
                    VENDOR_CONTAINER, args.vendorId, args.vendorId
                )

                if (!vendor) {
                    return { code: "404", success: false, message: "Vendor not found" }
                }

                const patchOps: PatchOperation[] = [
                    { op: "remove", path: "/accountBlocked" },
                    { op: "remove", path: "/accountBlockedAt" },
                    { op: "remove", path: "/accountBlockedReason" },
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
                    message: `Vendor "${vendor.name}" has been unblocked`
                }
            } catch (err: any) {
                return {
                    code: "500",
                    success: false,
                    message: err.message || "Failed to unblock vendor account"
                }
            }
        },

        addAccountNote: async (_: any, args: {
            accountId: string
            accountType: string
            note: { content: string; pinned?: boolean }
        }, context: serverContext) => {
            try {
                const container = getContainerForAccountType(args.accountType)
                const noteId = uuidv4()
                const noteData = {
                    content: args.note.content,
                    pinned: args.note.pinned || false,
                    createdBy: context.userEmail || context.userId || "system",
                    createdAt: new Date().toISOString(),
                }

                // First ensure adminNotes exists on the document
                const record = await context.dataSources.cosmos.get_record(container, args.accountId, args.accountId)
                if (!(record as any).adminNotes) {
                    await context.dataSources.cosmos.patch_record(
                        container, args.accountId, args.accountId,
                        [{ op: "set", path: "/adminNotes", value: {} }],
                        context.userId || "CONSOLE_ADMIN"
                    )
                }

                await context.dataSources.cosmos.patch_record(
                    container, args.accountId, args.accountId,
                    [{ op: "set", path: `/adminNotes/${noteId}`, value: noteData }],
                    context.userId || "CONSOLE_ADMIN"
                )

                // Re-read to return updated notes
                const updated = await context.dataSources.cosmos.get_record(container, args.accountId, args.accountId)
                return {
                    code: "200",
                    success: true,
                    message: "Note added",
                    notes: notesHashToArray((updated as any).adminNotes),
                }
            } catch (err: any) {
                return { code: "500", success: false, message: err.message || "Failed to add note", notes: null }
            }
        },

        deleteAccountNote: async (_: any, args: {
            accountId: string
            accountType: string
            noteId: string
        }, context: serverContext) => {
            try {
                const container = getContainerForAccountType(args.accountType)
                await context.dataSources.cosmos.patch_record(
                    container, args.accountId, args.accountId,
                    [{ op: "remove", path: `/adminNotes/${args.noteId}` }],
                    context.userId || "CONSOLE_ADMIN"
                )

                const updated = await context.dataSources.cosmos.get_record(container, args.accountId, args.accountId)
                return {
                    code: "200",
                    success: true,
                    message: "Note deleted",
                    notes: notesHashToArray((updated as any).adminNotes),
                }
            } catch (err: any) {
                return { code: "500", success: false, message: err.message || "Failed to delete note", notes: null }
            }
        },

        togglePinAccountNote: async (_: any, args: {
            accountId: string
            accountType: string
            noteId: string
        }, context: serverContext) => {
            try {
                const container = getContainerForAccountType(args.accountType)
                const record = await context.dataSources.cosmos.get_record(container, args.accountId, args.accountId)
                const notes = (record as any).adminNotes || {}
                const note = notes[args.noteId]
                if (!note) throw new Error("Note not found")

                await context.dataSources.cosmos.patch_record(
                    container, args.accountId, args.accountId,
                    [{ op: "set", path: `/adminNotes/${args.noteId}/pinned`, value: !note.pinned }],
                    context.userId || "CONSOLE_ADMIN"
                )

                const updated = await context.dataSources.cosmos.get_record(container, args.accountId, args.accountId)
                return {
                    code: "200",
                    success: true,
                    message: note.pinned ? "Note unpinned" : "Note pinned",
                    notes: notesHashToArray((updated as any).adminNotes),
                }
            } catch (err: any) {
                return { code: "500", success: false, message: err.message || "Failed to toggle pin", notes: null }
            }
        },
    }
}

const mergedResolvers = mergeDeep({}, resolvers, journeysResolvers)

export { mergedResolvers as resolvers }

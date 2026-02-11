import { serverContext } from "../../services/azFunction"
import { vendor_type, VendorDocType } from "../vendor/types"
import { VendorLifecycleStage, computeLifecycleStage } from "./types"
import { DateTime } from "luxon"

const VENDOR_CONTAINER = "Main-Vendor"
const USER_CONTAINER = "Main-User"
const ORDER_CONTAINER = "Main-Orders"
const LISTING_CONTAINER = "Main-Listing"
const COMMENTS_CONTAINER = "Main-Comments"
const FOLLOW_CONTAINER = "Main-Follow"

// Stage progression order for the happy path funnel
const FUNNEL_STAGE_ORDER = [
    VendorLifecycleStage.CREATED,
    VendorLifecycleStage.STRIPE_ONBOARDING,
    VendorLifecycleStage.FIRST_PAYOUT,
    VendorLifecycleStage.CARD_ADDED,
    VendorLifecycleStage.PUBLISHED,
    VendorLifecycleStage.BILLING_ACTIVE,
]

// Stage index for determining if a vendor has "reached" a given stage
const STAGE_INDEX: Record<string, number> = {
    [VendorLifecycleStage.CREATED]: 0,
    [VendorLifecycleStage.STRIPE_ONBOARDING]: 1,
    [VendorLifecycleStage.FIRST_PAYOUT]: 2,
    [VendorLifecycleStage.CARD_ADDED]: 3,
    [VendorLifecycleStage.PUBLISHED]: 4,
    [VendorLifecycleStage.BILLING_ACTIVE]: 5,
    // Problem states branch off from BILLING_ACTIVE level
    [VendorLifecycleStage.BILLING_FAILED]: 5,
    [VendorLifecycleStage.BILLING_BLOCKED]: 5,
}

function computeMedian(values: number[]): number | null {
    if (values.length === 0) return null
    const sorted = [...values].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2
}

function computeAverage(values: number[]): number | null {
    if (values.length === 0) return null
    return values.reduce((s, v) => s + v, 0) / values.length
}

function daysBetween(from: string, to: string): number | null {
    const start = DateTime.fromISO(from)
    const end = DateTime.fromISO(to)
    if (!start.isValid || !end.isValid) return null
    return end.diff(start, "days").days
}

function roundTo2(val: number | null): number | null {
    return val !== null ? Math.round(val * 100) / 100 : null
}

type VendorRow = vendor_type & { createdDate?: string }
type OrderRow = { id: string; createdDate?: string; customerId?: string; lines?: { merchantId: string }[] }
type ListingRow = { id: string; vendorId: string; type?: string; createdDate?: string }
type CommentRow = { id: string; vendorPartition?: string; posted_by_userId?: string; createdDate?: string }
type FollowRow = { id: string; followerId: string; followedAt?: string; targetId: string }
type UserRow = {
    id: string
    createdDate?: string
    requiresSetup?: boolean
    requiresInput?: boolean
    primarySpiritualInterest?: string
}

export const journeysResolvers = {
    Query: {
        consoleAccountJourneys: async (_: any, _args: any, context: serverContext) => {
            // 1. Parallel data fetch
            const [allVendors, allOrders, allListings, allComments, allUsers, allFollows] = await Promise.all([
                context.dataSources.cosmos.run_query<VendorRow>(VENDOR_CONTAINER, {
                    query: `SELECT c.id, c.docType, c.createdDate, c.publishedAt, c.subscription, c.stripe, c.practitioner FROM c`,
                    parameters: []
                }, true),
                context.dataSources.cosmos.run_query<OrderRow>(ORDER_CONTAINER, {
                    query: `SELECT c.id, c.createdDate, c.customer.id AS customerId, c.lines FROM c`,
                    parameters: []
                }, true),
                context.dataSources.cosmos.run_query<ListingRow>(LISTING_CONTAINER, {
                    query: `SELECT c.id, c.vendorId, c.type, c.createdDate FROM c WHERE c.type IN ('PRODUCT', 'SERVICE', 'TOUR')`,
                    parameters: []
                }, true),
                context.dataSources.cosmos.run_query<CommentRow>(COMMENTS_CONTAINER, {
                    query: `SELECT c.id, c.forObject.partition[0] AS vendorPartition, c.posted_by_userId, c.createdDate FROM c WHERE c.type = 'REVIEWS_AND_RATING'`,
                    parameters: []
                }, true),
                context.dataSources.cosmos.run_query<UserRow>(USER_CONTAINER, {
                    query: `SELECT c.id, c.createdDate, c.requiresSetup, c.requiresInput, c.primarySpiritualInterest FROM c`,
                    parameters: []
                }, true),
                context.dataSources.cosmos.run_query<FollowRow>(FOLLOW_CONTAINER, {
                    query: `SELECT c.id, c.followerId, c.followedAt, c.targetId FROM c WHERE c.targetType = 'MERCHANT'`,
                    parameters: []
                }, true),
            ])

            // ============================================
            // VENDOR FUNNEL
            // ============================================
            const totalVendors = allVendors.length
            let totalMerchants = 0
            let totalPractitioners = 0

            // Compute lifecycle stage for each vendor
            const vendorsWithStage = allVendors.map(v => {
                if (v.docType === VendorDocType.MERCHANT) totalMerchants++
                if (v.docType === VendorDocType.PRACTITIONER) totalPractitioners++
                return {
                    ...v,
                    lifecycleStage: computeLifecycleStage(v)
                }
            })

            // Build cumulative "reached" counts for each funnel stage
            // A vendor at stage X has "reached" all stages <= X
            const stageCounts: Record<string, { total: number; merchants: number; practitioners: number }> = {}
            for (const stage of FUNNEL_STAGE_ORDER) {
                stageCounts[stage] = { total: 0, merchants: 0, practitioners: 0 }
            }

            for (const v of vendorsWithStage) {
                const currentIndex = STAGE_INDEX[v.lifecycleStage] ?? 0
                for (const stage of FUNNEL_STAGE_ORDER) {
                    const stageIdx = STAGE_INDEX[stage]
                    if (currentIndex >= stageIdx) {
                        stageCounts[stage].total++
                        if (v.docType === VendorDocType.MERCHANT) stageCounts[stage].merchants++
                        if (v.docType === VendorDocType.PRACTITIONER) stageCounts[stage].practitioners++
                    }
                }
            }

            // Time-to-stage for PUBLISHED and BILLING_ACTIVE
            const publishedDays: number[] = []
            const billingActiveDays: number[] = []
            for (const v of vendorsWithStage) {
                if (!v.createdDate) continue
                if ((v as any).publishedAt) {
                    const days = daysBetween(v.createdDate, (v as any).publishedAt)
                    if (days !== null && days >= 0) publishedDays.push(days)
                }
                if (v.subscription?.billing_history && v.subscription.billing_history.length > 0) {
                    const successfulBills = v.subscription.billing_history
                        .filter((b: any) => b.billingStatus === "success")
                        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    if (successfulBills.length > 0) {
                        const days = daysBetween(v.createdDate, (successfulBills[0] as any).date)
                        if (days !== null && days >= 0) billingActiveDays.push(days)
                    }
                }
            }

            const timeToStageMap: Record<string, { median: number | null; average: number | null }> = {}
            for (const stage of FUNNEL_STAGE_ORDER) {
                if (stage === VendorLifecycleStage.PUBLISHED) {
                    timeToStageMap[stage] = { median: computeMedian(publishedDays), average: computeAverage(publishedDays) }
                } else if (stage === VendorLifecycleStage.BILLING_ACTIVE) {
                    timeToStageMap[stage] = { median: computeMedian(billingActiveDays), average: computeAverage(billingActiveDays) }
                } else {
                    timeToStageMap[stage] = { median: null, average: null }
                }
            }

            const stages = FUNNEL_STAGE_ORDER.map(stage => ({
                stage,
                count: stageCounts[stage].total,
                merchantCount: stageCounts[stage].merchants,
                practitionerCount: stageCounts[stage].practitioners,
                percentOfTotal: totalVendors > 0 ? roundTo2((stageCounts[stage].total / totalVendors) * 100) : 0,
                medianDaysToReach: roundTo2(timeToStageMap[stage].median),
                averageDaysToReach: roundTo2(timeToStageMap[stage].average),
            }))

            // Conversions between adjacent stages
            const conversions = []
            for (let i = 0; i < FUNNEL_STAGE_ORDER.length - 1; i++) {
                const fromStage = FUNNEL_STAGE_ORDER[i]
                const toStage = FUNNEL_STAGE_ORDER[i + 1]
                const fromCount = stageCounts[fromStage].total
                const toCount = stageCounts[toStage].total
                conversions.push({
                    fromStage,
                    toStage,
                    conversionRate: fromCount > 0 ? roundTo2((toCount / fromCount) * 100) : 0,
                    fromCount,
                    toCount,
                })
            }

            // Problem states: non-cumulative direct counts for BILLING_FAILED and BILLING_BLOCKED
            const PROBLEM_STAGES = [VendorLifecycleStage.BILLING_FAILED, VendorLifecycleStage.BILLING_BLOCKED]
            const problemCounts: Record<string, { total: number; merchants: number; practitioners: number }> = {}
            for (const stage of PROBLEM_STAGES) {
                problemCounts[stage] = { total: 0, merchants: 0, practitioners: 0 }
            }
            for (const v of vendorsWithStage) {
                if (PROBLEM_STAGES.includes(v.lifecycleStage as VendorLifecycleStage)) {
                    problemCounts[v.lifecycleStage].total++
                    if (v.docType === VendorDocType.MERCHANT) problemCounts[v.lifecycleStage].merchants++
                    if (v.docType === VendorDocType.PRACTITIONER) problemCounts[v.lifecycleStage].practitioners++
                }
            }
            const problemStates = PROBLEM_STAGES
                .filter(stage => problemCounts[stage].total > 0)
                .map(stage => ({
                    stage,
                    count: problemCounts[stage].total,
                    merchantCount: problemCounts[stage].merchants,
                    practitionerCount: problemCounts[stage].practitioners,
                    percentOfTotal: totalVendors > 0 ? roundTo2((problemCounts[stage].total / totalVendors) * 100) : 0,
                    medianDaysToReach: null,
                    averageDaysToReach: null,
                }))

            // ============================================
            // VENDOR MILESTONES
            // ============================================
            const sevenDaysAgo = DateTime.now().minus({ days: 7 }).toISO()!

            // First listing per vendor
            const firstListingByVendor = new Map<string, string>()
            for (const listing of allListings) {
                if (!listing.vendorId || !listing.createdDate) continue
                const existing = firstListingByVendor.get(listing.vendorId)
                if (!existing || listing.createdDate < existing) {
                    firstListingByVendor.set(listing.vendorId, listing.createdDate)
                }
            }

            // First order received per vendor (merchant)
            const firstOrderByVendor = new Map<string, string>()
            for (const order of allOrders) {
                if (!order.createdDate || !order.lines) continue
                for (const line of order.lines) {
                    if (!line.merchantId) continue
                    const existing = firstOrderByVendor.get(line.merchantId)
                    if (!existing || order.createdDate < existing) {
                        firstOrderByVendor.set(line.merchantId, order.createdDate)
                    }
                }
            }

            // First review per vendor
            const firstReviewByVendor = new Map<string, string>()
            for (const comment of allComments) {
                const vendorId = comment.vendorPartition
                if (!vendorId || !comment.createdDate) continue
                const existing = firstReviewByVendor.get(vendorId)
                if (!existing || comment.createdDate < existing) {
                    firstReviewByVendor.set(vendorId, comment.createdDate)
                }
            }

            // Build vendor milestones
            const vendorMilestones = buildVendorMilestones(allVendors, firstListingByVendor, firstOrderByVendor, firstReviewByVendor, sevenDaysAgo)

            // ============================================
            // CUSTOMER MILESTONES
            // ============================================

            // First order placed per customer
            const firstOrderByCustomer = new Map<string, string>()
            for (const order of allOrders) {
                if (!order.customerId || !order.createdDate) continue
                const existing = firstOrderByCustomer.get(order.customerId)
                if (!existing || order.createdDate < existing) {
                    firstOrderByCustomer.set(order.customerId, order.createdDate)
                }
            }

            // First follow per customer
            const firstFollowByCustomer = new Map<string, string>()
            for (const follow of allFollows) {
                if (!follow.followerId) continue
                const dateStr = follow.followedAt || ""
                if (!dateStr) continue
                const existing = firstFollowByCustomer.get(follow.followerId)
                if (!existing || dateStr < existing) {
                    firstFollowByCustomer.set(follow.followerId, dateStr)
                }
            }

            // First review left per customer (from comments where posted_by_userId matches)
            const firstReviewByCustomer = new Map<string, string>()
            for (const comment of allComments) {
                if (!comment.posted_by_userId || !comment.createdDate) continue
                const existing = firstReviewByCustomer.get(comment.posted_by_userId)
                if (!existing || comment.createdDate < existing) {
                    firstReviewByCustomer.set(comment.posted_by_userId, comment.createdDate)
                }
            }

            const customerMilestones = buildCustomerMilestones(allUsers, firstOrderByCustomer, firstFollowByCustomer, firstReviewByCustomer, sevenDaysAgo)

            return {
                vendorFunnel: {
                    stages,
                    problemStates,
                    conversions,
                    totalVendors,
                    totalMerchants,
                    totalPractitioners,
                },
                vendorMilestones,
                customerMilestones,
                totalCustomers: allUsers.length,
            }
        }
    }
}

function buildVendorMilestones(
    vendors: VendorRow[],
    firstListingByVendor: Map<string, string>,
    firstOrderByVendor: Map<string, string>,
    firstReviewByVendor: Map<string, string>,
    sevenDaysAgo: string,
) {
    const totalVendors = vendors.length
    const practitionerVendors = vendors.filter(v => v.docType === VendorDocType.PRACTITIONER)

    // Helper: count how many "first occurrence" dates fall within the last 7 days
    function countRecent(firstDateMap: Map<string, string>, ids: string[]): number {
        let recent = 0
        for (const id of ids) {
            const d = firstDateMap.get(id)
            if (d && d >= sevenDaysAgo) recent++
        }
        return recent
    }

    const milestones: {
        milestoneKey: string
        label: string
        description: string
        hasTimestamps: boolean
        compute: () => { count: number; eligible: number; days: number[]; recentCount: number | null }
    }[] = [
        {
            milestoneKey: "FIRST_LISTING",
            label: "First Listing Created",
            description: "Vendor has created their first product, service, or tour listing",
            hasTimestamps: true,
            compute: () => {
                const daysArr: number[] = []
                let count = 0
                for (const v of vendors) {
                    const firstDate = firstListingByVendor.get(v.id)
                    if (firstDate) {
                        count++
                        if (v.createdDate) {
                            const d = daysBetween(v.createdDate, firstDate)
                            if (d !== null && d >= 0) daysArr.push(d)
                        }
                    }
                }
                const vendorIds = vendors.map(v => v.id)
                return { count, eligible: totalVendors, days: daysArr, recentCount: countRecent(firstListingByVendor, vendorIds) }
            }
        },
        {
            milestoneKey: "FIRST_ORDER_RECEIVED",
            label: "First Order Received",
            description: "Vendor has received their first customer order",
            hasTimestamps: true,
            compute: () => {
                const daysArr: number[] = []
                let count = 0
                for (const v of vendors) {
                    const firstDate = firstOrderByVendor.get(v.id)
                    if (firstDate) {
                        count++
                        if (v.createdDate) {
                            const d = daysBetween(v.createdDate, firstDate)
                            if (d !== null && d >= 0) daysArr.push(d)
                        }
                    }
                }
                const vendorIds = vendors.map(v => v.id)
                return { count, eligible: totalVendors, days: daysArr, recentCount: countRecent(firstOrderByVendor, vendorIds) }
            }
        },
        {
            milestoneKey: "FIRST_REVIEW",
            label: "First Review Received",
            description: "Vendor has received their first customer review",
            hasTimestamps: true,
            compute: () => {
                const daysArr: number[] = []
                let count = 0
                for (const v of vendors) {
                    const firstDate = firstReviewByVendor.get(v.id)
                    if (firstDate) {
                        count++
                        if (v.createdDate) {
                            const d = daysBetween(v.createdDate, firstDate)
                            if (d !== null && d >= 0) daysArr.push(d)
                        }
                    }
                }
                const vendorIds = vendors.map(v => v.id)
                return { count, eligible: totalVendors, days: daysArr, recentCount: countRecent(firstReviewByVendor, vendorIds) }
            }
        },
        {
            milestoneKey: "STRIPE_CONNECTED",
            label: "Stripe Connected",
            description: "Vendor has connected their Stripe account for payments",
            hasTimestamps: false,
            compute: () => {
                let count = 0
                for (const v of vendors) {
                    if (v.stripe?.accountId) count++
                }
                return { count, eligible: totalVendors, days: [], recentCount: null }
            }
        },
        {
            milestoneKey: "FIRST_BILLING_PAYMENT",
            label: "First Billing Payment",
            description: "Vendor has made their first successful platform billing payment",
            hasTimestamps: true,
            compute: () => {
                const daysArr: number[] = []
                let count = 0
                const firstBillingByVendor = new Map<string, string>()
                for (const v of vendors) {
                    const history = v.subscription?.billing_history
                    if (history && history.length > 0) {
                        const successful = history
                            .filter((b: any) => b.billingStatus === "success")
                            .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        if (successful.length > 0) {
                            count++
                            const firstDate = (successful[0] as any).date
                            firstBillingByVendor.set(v.id, firstDate)
                            if (v.createdDate) {
                                const d = daysBetween(v.createdDate, firstDate)
                                if (d !== null && d >= 0) daysArr.push(d)
                            }
                        }
                    }
                }
                const vendorIds = vendors.map(v => v.id)
                return { count, eligible: totalVendors, days: daysArr, recentCount: countRecent(firstBillingByVendor, vendorIds) }
            }
        },
        {
            milestoneKey: "PRACTITIONER_VERIFIED",
            label: "Practitioner Verified",
            description: "Practitioner has completed identity and practice verification",
            hasTimestamps: false,
            compute: () => {
                let count = 0
                for (const v of practitionerVendors) {
                    if ((v as any).practitioner?.verification?.verifiedAt) count++
                }
                return { count, eligible: practitionerVendors.length, days: [], recentCount: null }
            }
        },
    ]

    return milestones.map(m => {
        const result = m.compute()
        return {
            milestoneKey: m.milestoneKey,
            label: m.label,
            description: m.description,
            achievedCount: result.count,
            totalEligible: result.eligible,
            achievedPercent: result.eligible > 0 ? roundTo2((result.count / result.eligible) * 100) : 0,
            medianDays: roundTo2(computeMedian(result.days)),
            averageDays: roundTo2(computeAverage(result.days)),
            recentCount: result.recentCount,
        }
    })
}

function buildCustomerMilestones(
    users: UserRow[],
    firstOrderByCustomer: Map<string, string>,
    firstFollowByCustomer: Map<string, string>,
    firstReviewByCustomer: Map<string, string>,
    sevenDaysAgo: string,
) {
    const totalUsers = users.length
    const userIds = users.map(u => u.id)

    function countRecent(firstDateMap: Map<string, string>, ids: string[]): number {
        let recent = 0
        for (const id of ids) {
            const d = firstDateMap.get(id)
            if (d && d >= sevenDaysAgo) recent++
        }
        return recent
    }

    const milestones: {
        milestoneKey: string
        label: string
        description: string
        compute: () => { count: number; eligible: number; days: number[]; recentCount: number | null }
    }[] = [
        {
            milestoneKey: "PROFILE_COMPLETED",
            label: "Profile Completed",
            description: "Customer has completed their profile setup",
            compute: () => {
                let count = 0
                for (const u of users) {
                    if (u.requiresSetup === false && u.requiresInput === false) count++
                }
                return { count, eligible: totalUsers, days: [], recentCount: null }
            }
        },
        {
            milestoneKey: "FIRST_ORDER_PLACED",
            label: "First Order Placed",
            description: "Customer has placed their first order on the platform",
            compute: () => {
                const daysArr: number[] = []
                let count = 0
                for (const u of users) {
                    const firstDate = firstOrderByCustomer.get(u.id)
                    if (firstDate) {
                        count++
                        if (u.createdDate) {
                            const d = daysBetween(u.createdDate, firstDate)
                            if (d !== null && d >= 0) daysArr.push(d)
                        }
                    }
                }
                return { count, eligible: totalUsers, days: daysArr, recentCount: countRecent(firstOrderByCustomer, userIds) }
            }
        },
        {
            milestoneKey: "SPIRITUAL_INTERESTS_SET",
            label: "Spiritual Interests Set",
            description: "Customer has configured their primary spiritual interest",
            compute: () => {
                let count = 0
                for (const u of users) {
                    if (u.primarySpiritualInterest) count++
                }
                return { count, eligible: totalUsers, days: [], recentCount: null }
            }
        },
        {
            milestoneKey: "FIRST_FOLLOW",
            label: "First Follow",
            description: "Customer has followed their first vendor on the platform",
            compute: () => {
                const daysArr: number[] = []
                let count = 0
                for (const u of users) {
                    const firstDate = firstFollowByCustomer.get(u.id)
                    if (firstDate) {
                        count++
                        if (u.createdDate) {
                            const d = daysBetween(u.createdDate, firstDate)
                            if (d !== null && d >= 0) daysArr.push(d)
                        }
                    }
                }
                return { count, eligible: totalUsers, days: daysArr, recentCount: countRecent(firstFollowByCustomer, userIds) }
            }
        },
        {
            milestoneKey: "FIRST_REVIEW_LEFT",
            label: "First Review Left",
            description: "Customer has left their first review on the platform",
            compute: () => {
                const daysArr: number[] = []
                let count = 0
                for (const u of users) {
                    const firstDate = firstReviewByCustomer.get(u.id)
                    if (firstDate) {
                        count++
                        if (u.createdDate) {
                            const d = daysBetween(u.createdDate, firstDate)
                            if (d !== null && d >= 0) daysArr.push(d)
                        }
                    }
                }
                return { count, eligible: totalUsers, days: daysArr, recentCount: countRecent(firstReviewByCustomer, userIds) }
            }
        },
    ]

    return milestones.map(m => {
        const result = m.compute()
        return {
            milestoneKey: m.milestoneKey,
            label: m.label,
            description: m.description,
            achievedCount: result.count,
            totalEligible: result.eligible,
            achievedPercent: result.eligible > 0 ? roundTo2((result.count / result.eligible) * 100) : 0,
            medianDays: roundTo2(computeMedian(result.days)),
            averageDays: roundTo2(computeAverage(result.days)),
            recentCount: result.recentCount,
        }
    })
}

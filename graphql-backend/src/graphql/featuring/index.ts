import { DateTime } from "luxon"
import { serverContext } from "../../services/azFunction"
import { v4 as uuid } from "uuid"
import { GraphQLError } from "graphql"
import { PatchOperation } from "@azure/cosmos"
import {
    featuring_relationship_type,
    FeaturingRequestStatus,
    FeaturingType,
    create_featuring_request_input,
    respond_featuring_request_input,
    update_featuring_relationship_input,
    featuring_request_response,
    featured_practitioner_type,
    featured_service_type,
    practitioner_discovery_response,
    configure_featuring_schedule_input,
    configure_featuring_pricing_input,
    featuring_delivery_context_type
} from "./types"
import { vendor_type, subscription_tier } from "../vendor/types"
import { service_type } from "../service/types"
import { getTierFeatures } from "../subscription/featureGates"

const CONTAINER = "Main-FeaturingRelationship"
const VENDOR_CONTAINER = "Main-Vendor"
const LISTING_CONTAINER = "Main-Listing"

// Helper to validate user has access to a vendor
async function validateVendorAccess(context: serverContext, vendorId: string): Promise<vendor_type> {
    if (!context.userId) {
        throw new GraphQLError("User must be logged in", { extensions: { code: "UNAUTHENTICATED" } })
    }

    const vendor = await context.dataSources.cosmos.get_record<vendor_type>(
        VENDOR_CONTAINER,
        vendorId,
        vendorId
    )

    if (!vendor) {
        throw new GraphQLError("Vendor not found", { extensions: { code: "NOT_FOUND" } })
    }

    // Check if user has access to this vendor
    const user = await context.dataSources.cosmos.get_record<any>(
        "Main-User",
        context.userId,
        context.userId
    )

    const hasAccess = user?.vendors?.some((v: any) => v.id === vendorId)
    if (!hasAccess) {
        throw new GraphQLError("You do not have access to this vendor", { extensions: { code: "FORBIDDEN" } })
    }

    return vendor
}

// Helper to get Stripe account country
async function getStripeAccountCountry(context: serverContext, accountId: string): Promise<string> {
    const account = await context.dataSources.stripe.callApi("GET", `accounts/${accountId}`)
    return account.data.country
}

const resolvers = {
    Query: {
        // Get all featuring relationships for a merchant (where they are the featuring merchant)
        merchantFeaturingRelationships: async (
            _: any,
            args: { merchantId: string },
            context: serverContext
        ): Promise<featuring_relationship_type[]> => {
            await validateVendorAccess(context, args.merchantId)

            const querySpec = {
                query: `SELECT * FROM c WHERE c.merchantId = @merchantId AND c.docType = 'FEATURING_RELATIONSHIP'`,
                parameters: [{ name: "@merchantId", value: args.merchantId }]
            }

            return await context.dataSources.cosmos.run_query<featuring_relationship_type>(
                CONTAINER,
                querySpec
            )
        },

        // Get all featuring relationships for a practitioner (where they are featured)
        practitionerFeaturingRelationships: async (
            _: any,
            args: { practitionerId: string },
            context: serverContext
        ): Promise<featuring_relationship_type[]> => {
            await validateVendorAccess(context, args.practitionerId)

            // Cross-partition query since partitioned by merchantId
            const querySpec = {
                query: `SELECT * FROM c WHERE c.practitionerId = @practitionerId AND c.docType = 'FEATURING_RELATIONSHIP'`,
                parameters: [{ name: "@practitionerId", value: args.practitionerId }]
            }

            return await context.dataSources.cosmos.run_query<featuring_relationship_type>(
                CONTAINER,
                querySpec
            )
        },

        // Get pending featuring requests for a practitioner to review
        pendingFeaturingRequests: async (
            _: any,
            args: { practitionerId: string },
            context: serverContext
        ): Promise<featuring_relationship_type[]> => {
            await validateVendorAccess(context, args.practitionerId)

            const querySpec = {
                query: `SELECT * FROM c
                        WHERE c.practitionerId = @practitionerId
                        AND c.docType = 'FEATURING_RELATIONSHIP'
                        AND c.requestStatus = 'PENDING'
                        ORDER BY c.requestedAt DESC`,
                parameters: [{ name: "@practitionerId", value: args.practitionerId }]
            }

            return await context.dataSources.cosmos.run_query<featuring_relationship_type>(
                CONTAINER,
                querySpec
            )
        },

        // Get active featured practitioners for a merchant's shopfront (public query)
        featuredPractitioners: async (
            _: any,
            args: { merchantId: string },
            context: serverContext
        ): Promise<featured_practitioner_type[]> => {
            // Public query - no auth required
            const querySpec = {
                query: `SELECT * FROM c
                        WHERE c.merchantId = @merchantId
                        AND c.docType = 'FEATURING_RELATIONSHIP'
                        AND c.requestStatus = 'ACCEPTED'
                        ORDER BY c.displayOrder ASC`,
                parameters: [{ name: "@merchantId", value: args.merchantId }]
            }

            const relationships = await context.dataSources.cosmos.run_query<featuring_relationship_type>(
                CONTAINER,
                querySpec
            )

            // Resolve practitioner and services for each relationship
            const results = await Promise.all(
                relationships.map(async (rel) => {
                    const practitioner = await context.dataSources.cosmos.get_record<vendor_type>(
                        VENDOR_CONTAINER,
                        rel.practitionerId,
                        rel.practitionerId
                    )

                    if (!practitioner) return null

                    // Get services based on featuring type
                    let services: service_type[] = []
                    if (rel.featuringType === FeaturingType.FULL_PROFILE) {
                        // Get all active services for practitioner
                        const servicesQuery = {
                            query: `SELECT * FROM c
                                    WHERE c.vendorId = @vendorId
                                    AND c.type = 'SERVICE'`,
                            parameters: [{ name: "@vendorId", value: rel.practitionerId }]
                        }
                        services = await context.dataSources.cosmos.run_query<service_type>(
                            LISTING_CONTAINER,
                            servicesQuery
                        )
                    } else if (rel.featuredServiceIds?.length) {
                        // Get only selected services
                        services = await Promise.all(
                            rel.featuredServiceIds.map(async (serviceId) => {
                                return await context.dataSources.cosmos.get_record<service_type>(
                                    LISTING_CONTAINER,
                                    serviceId,
                                    rel.practitionerId
                                )
                            })
                        ).then(results => results.filter((s): s is service_type => s !== null))
                    }

                    return {
                        relationship: rel,
                        practitioner,
                        services
                    }
                })
            )

            return results.filter((r): r is featured_practitioner_type => r !== null)
        },

        // Get featured services for a merchant's shopfront (flattened view)
        featuredServices: async (
            _: any,
            args: { merchantId: string },
            context: serverContext
        ): Promise<featured_service_type[]> => {
            // Use featuredPractitioners and flatten
            const featuredPractitioners = await resolvers.Query.featuredPractitioners(_, args, context)

            const flattenedServices: featured_service_type[] = []
            for (const fp of featuredPractitioners) {
                for (const service of fp.services) {
                    flattenedServices.push({
                        relationship: fp.relationship,
                        service,
                        practitioner: fp.practitioner
                    })
                }
            }

            return flattenedServices
        },

        // Browse practitioners available for featuring (discovery)
        discoverPractitioners: async (
            _: any,
            args: {
                merchantId: string
                modalities?: string[]
                specializations?: string[]
                search?: string
                limit?: number
                offset?: number
            },
            context: serverContext
        ): Promise<practitioner_discovery_response> => {
            await validateVendorAccess(context, args.merchantId)

            const limit = Math.min(args.limit || 20, 50)
            const offset = args.offset || 0

            // Build query for practitioners
            let whereConditions = [`c.docType = 'PRACTITIONER'`]
            const parameters: { name: string; value: any }[] = []

            if (args.modalities?.length) {
                whereConditions.push(`ARRAY_LENGTH(SetIntersect(c.practitioner.modalities, @modalities)) > 0`)
                parameters.push({ name: "@modalities", value: args.modalities })
            }

            if (args.specializations?.length) {
                whereConditions.push(`ARRAY_LENGTH(SetIntersect(c.practitioner.specializations, @specializations)) > 0`)
                parameters.push({ name: "@specializations", value: args.specializations })
            }

            if (args.search) {
                whereConditions.push(`CONTAINS(LOWER(c.name), LOWER(@search))`)
                parameters.push({ name: "@search", value: args.search })
            }

            // Count query
            const countQuery = {
                query: `SELECT VALUE COUNT(1) FROM c WHERE ${whereConditions.join(" AND ")}`,
                parameters
            }

            // Data query
            const dataQuery = {
                query: `SELECT * FROM c
                        WHERE ${whereConditions.join(" AND ")}
                        ORDER BY c.name ASC
                        OFFSET @offset LIMIT @limit`,
                parameters: [
                    ...parameters,
                    { name: "@offset", value: offset },
                    { name: "@limit", value: limit }
                ]
            }

            const [countResult, practitioners] = await Promise.all([
                context.dataSources.cosmos.run_query<number>(VENDOR_CONTAINER, countQuery),
                context.dataSources.cosmos.run_query<vendor_type>(VENDOR_CONTAINER, dataQuery)
            ])

            const totalCount = countResult[0] || 0

            // Enrich each practitioner with service count and price range
            const enrichedPractitioners = await Promise.all(
                practitioners.map(async (practitioner) => {
                    const servicesQuery = {
                        query: `SELECT c.price FROM c WHERE c.vendorId = @vendorId AND c.type = 'SERVICE'`,
                        parameters: [{ name: "@vendorId", value: practitioner.id }]
                    }
                    const services = await context.dataSources.cosmos.run_query<{ price?: { amount: number; currency: string } }>(
                        LISTING_CONTAINER,
                        servicesQuery
                    )

                    const prices = services
                        .filter(s => s.price?.amount != null)
                        .map(s => s.price!)

                    const priceRange = prices.length > 0 ? {
                        min: prices.reduce((min, p) => p.amount < min.amount ? p : min, prices[0]),
                        max: prices.reduce((max, p) => p.amount > max.amount ? p : max, prices[0])
                    } : undefined

                    return {
                        practitioner,
                        serviceCount: services.length,
                        priceRange
                    }
                })
            )

            return {
                practitioners: enrichedPractitioners,
                totalCount,
                hasMore: offset + practitioners.length < totalCount
            }
        }
    },

    Mutation: {
        // Merchant sends a featuring request to a practitioner
        createFeaturingRequest: async (
            _: any,
            args: { input: create_featuring_request_input },
            context: serverContext
        ): Promise<featuring_request_response> => {
            if (!context.userId) {
                throw new GraphQLError("User must be logged in", { extensions: { code: "UNAUTHENTICATED" } })
            }

            // Get current user to find their merchant
            const user = await context.dataSources.cosmos.get_record<any>(
                "Main-User",
                context.userId,
                context.userId
            )

            if (!user?.vendors?.length) {
                throw new GraphQLError("You must have a merchant account to feature practitioners",
                    { extensions: { code: "FORBIDDEN" } })
            }

            // user.vendors only contains { id, role } - need to look up actual vendor to check docType
            // Note: Merchants don't have docType set (it's undefined), only practitioners have docType = "PRACTITIONER"
            let merchantId: string | null = null
            for (const vendorRef of user.vendors) {
                const vendor = await context.dataSources.cosmos.get_record<vendor_type>(
                    VENDOR_CONTAINER,
                    vendorRef.id,
                    vendorRef.id
                )
                // A merchant is any vendor that is NOT a practitioner
                if (vendor && vendor.docType !== "PRACTITIONER") {
                    merchantId = vendor.id
                    break
                }
            }

            if (!merchantId) {
                throw new GraphQLError("You must have a merchant account to feature practitioners",
                    { extensions: { code: "FORBIDDEN" } })
            }

            // Get full merchant and practitioner records
            const [merchant, practitioner] = await Promise.all([
                context.dataSources.cosmos.get_record<vendor_type>(VENDOR_CONTAINER, merchantId, merchantId),
                context.dataSources.cosmos.get_record<vendor_type>(VENDOR_CONTAINER, args.input.practitionerId, args.input.practitionerId)
            ])

            if (!merchant) {
                throw new GraphQLError("Merchant not found", { extensions: { code: "NOT_FOUND" } })
            }

            // Check tier allows hosting practitioners
            if (merchant.subscription?.subscriptionTier) {
                const features = getTierFeatures(merchant.subscription.subscriptionTier as subscription_tier)
                if (!features.canHostPractitioners) {
                    throw new GraphQLError(
                        "Upgrade to Transcend to host practitioners on your storefront.",
                        { extensions: { code: "TIER_FEATURE_LOCKED" } }
                    )
                }
            }

            if (!practitioner || practitioner.docType !== "PRACTITIONER") {
                throw new GraphQLError("Practitioner not found", { extensions: { code: "NOT_FOUND" } })
            }

            // Validate both have Stripe accounts
            if (!merchant.stripe?.accountId) {
                throw new GraphQLError("Your merchant account must have Stripe setup to feature practitioners",
                    { extensions: { code: "STRIPE_NOT_CONFIGURED" } })
            }

            if (!practitioner.stripe?.accountId) {
                throw new GraphQLError("This practitioner has not completed their Stripe setup yet",
                    { extensions: { code: "STRIPE_NOT_CONFIGURED" } })
            }

            // Validate same region via Stripe accounts
            const [merchantCountry, practitionerCountry] = await Promise.all([
                getStripeAccountCountry(context, merchant.stripe.accountId),
                getStripeAccountCountry(context, practitioner.stripe.accountId)
            ])

            if (merchantCountry !== practitionerCountry) {
                throw new GraphQLError(
                    `Featured practitioners must be in the same region for automatic payments. Your store is in ${merchantCountry}, but this practitioner is in ${practitionerCountry}.`,
                    { extensions: { code: "REGION_MISMATCH" } }
                )
            }

            // Validate revenue share is reasonable (0-50% for merchant, typically)
            if (args.input.merchantRevenueShareBps < 0 || args.input.merchantRevenueShareBps > 5000) {
                throw new GraphQLError("Merchant revenue share must be between 0% and 50%",
                    { extensions: { code: "INVALID_SHARE" } })
            }

            // Check for existing active/pending relationship
            const existingQuery = {
                query: `SELECT * FROM c
                        WHERE c.merchantId = @merchantId
                        AND c.practitionerId = @practitionerId
                        AND c.docType = 'FEATURING_RELATIONSHIP'
                        AND c.requestStatus IN ('PENDING', 'ACCEPTED')`,
                parameters: [
                    { name: "@merchantId", value: merchantId },
                    { name: "@practitionerId", value: args.input.practitionerId }
                ]
            }

            const existing = await context.dataSources.cosmos.run_query<featuring_relationship_type>(
                CONTAINER,
                existingQuery
            )

            if (existing.length > 0) {
                const status = existing[0].requestStatus
                if (status === FeaturingRequestStatus.PENDING) {
                    throw new GraphQLError("You already have a pending request to this practitioner",
                        { extensions: { code: "DUPLICATE_REQUEST" } })
                }
                if (status === FeaturingRequestStatus.ACCEPTED) {
                    throw new GraphQLError("You already have an active featuring relationship with this practitioner",
                        { extensions: { code: "ALREADY_FEATURING" } })
                }
            }

            // If SELECTED_SERVICES, validate service IDs belong to practitioner
            if (args.input.featuringType === FeaturingType.SELECTED_SERVICES) {
                if (!args.input.featuredServiceIds?.length) {
                    throw new GraphQLError("You must select at least one service when featuring specific services",
                        { extensions: { code: "NO_SERVICES_SELECTED" } })
                }

                // Validate services exist and belong to practitioner
                for (const serviceId of args.input.featuredServiceIds) {
                    const service = await context.dataSources.cosmos.get_record<service_type>(
                        LISTING_CONTAINER,
                        serviceId,
                        args.input.practitionerId
                    )
                    if (!service) {
                        throw new GraphQLError(`Service ${serviceId} not found or does not belong to this practitioner`,
                            { extensions: { code: "INVALID_SERVICE" } })
                    }
                }
            }

            // Create the featuring relationship
            const relationshipId = `feat_${merchantId}_${args.input.practitionerId}`
            const now = DateTime.now().toISO()

            const relationship: featuring_relationship_type = {
                id: relationshipId,
                docType: "FEATURING_RELATIONSHIP",
                merchantId,
                practitionerId: args.input.practitionerId,
                merchantName: merchant.name,
                merchantSlug: merchant.slug,
                merchantLogo: merchant.logo?.url,
                practitionerName: practitioner.name,
                practitionerSlug: practitioner.slug,
                practitionerHeadline: practitioner.practitioner?.headline,
                practitionerAvatar: practitioner.logo?.url,
                featuringType: args.input.featuringType,
                featuredServiceIds: args.input.featuredServiceIds,
                merchantRevenueShareBps: args.input.merchantRevenueShareBps,
                practitionerRevenueShareBps: 10000 - args.input.merchantRevenueShareBps,
                requestStatus: FeaturingRequestStatus.PENDING,
                requestedAt: now,
                requestMessage: args.input.requestMessage,
                createdAt: now,
                updatedAt: now
            }

            await context.dataSources.cosmos.add_record(
                CONTAINER,
                relationship,
                merchantId, // Partition key
                context.userId
            )

            // TODO: Send notification email to practitioner

            return {
                code: "200",
                success: true,
                message: "Featuring request sent successfully",
                relationship
            }
        },

        // Practitioner responds to a featuring request
        respondToFeaturingRequest: async (
            _: any,
            args: { input: respond_featuring_request_input },
            context: serverContext
        ): Promise<featuring_request_response> => {
            if (!context.userId) {
                throw new GraphQLError("User must be logged in", { extensions: { code: "UNAUTHENTICATED" } })
            }

            // Parse relationship ID to get merchantId (partition key)
            const parts = args.input.relationshipId.split("_")
            if (parts.length !== 3 || parts[0] !== "feat") {
                throw new GraphQLError("Invalid relationship ID", { extensions: { code: "INVALID_ID" } })
            }
            const merchantId = parts[1]
            const practitionerId = parts[2]

            // Validate practitioner access
            await validateVendorAccess(context, practitionerId)

            // Get the relationship
            const relationship = await context.dataSources.cosmos.get_record<featuring_relationship_type>(
                CONTAINER,
                args.input.relationshipId,
                merchantId
            )

            if (!relationship) {
                throw new GraphQLError("Featuring request not found", { extensions: { code: "NOT_FOUND" } })
            }

            if (relationship.requestStatus !== FeaturingRequestStatus.PENDING) {
                throw new GraphQLError("This request has already been responded to",
                    { extensions: { code: "ALREADY_RESPONDED" } })
            }

            // Update the relationship
            const now = DateTime.now().toISO()
            const newStatus = args.input.accept
                ? FeaturingRequestStatus.ACCEPTED
                : FeaturingRequestStatus.REJECTED

            const patchOps: PatchOperation[] = [
                { op: "set", path: "/requestStatus", value: newStatus },
                { op: "set", path: "/respondedAt", value: now },
                { op: "set", path: "/updatedAt", value: now }
            ]

            if (args.input.responseMessage) {
                patchOps.push({ op: "set", path: "/responseMessage", value: args.input.responseMessage })
            }

            await context.dataSources.cosmos.patch_record(
                CONTAINER,
                args.input.relationshipId,
                merchantId,
                patchOps,
                context.userId
            )

            // Get updated relationship
            const updatedRelationship = await context.dataSources.cosmos.get_record<featuring_relationship_type>(
                CONTAINER,
                args.input.relationshipId,
                merchantId
            )

            // TODO: Send notification email to merchant

            return {
                code: "200",
                success: true,
                message: args.input.accept
                    ? "Featuring request accepted"
                    : "Featuring request declined",
                relationship: updatedRelationship || undefined
            }
        },

        // Update an active featuring relationship
        updateFeaturingRelationship: async (
            _: any,
            args: { input: update_featuring_relationship_input },
            context: serverContext
        ): Promise<featuring_request_response> => {
            if (!context.userId) {
                throw new GraphQLError("User must be logged in", { extensions: { code: "UNAUTHENTICATED" } })
            }

            // Parse relationship ID
            const parts = args.input.relationshipId.split("_")
            if (parts.length !== 3 || parts[0] !== "feat") {
                throw new GraphQLError("Invalid relationship ID", { extensions: { code: "INVALID_ID" } })
            }
            const merchantId = parts[1]

            // Validate merchant access (only merchant can update display settings)
            await validateVendorAccess(context, merchantId)

            const relationship = await context.dataSources.cosmos.get_record<featuring_relationship_type>(
                CONTAINER,
                args.input.relationshipId,
                merchantId
            )

            if (!relationship) {
                throw new GraphQLError("Featuring relationship not found", { extensions: { code: "NOT_FOUND" } })
            }

            if (relationship.requestStatus !== FeaturingRequestStatus.ACCEPTED) {
                throw new GraphQLError("Can only update active featuring relationships",
                    { extensions: { code: "NOT_ACTIVE" } })
            }

            const patchOps: PatchOperation[] = [
                { op: "set", path: "/updatedAt", value: DateTime.now().toISO() }
            ]

            if (args.input.displayOrder !== undefined) {
                patchOps.push({ op: "set", path: "/displayOrder", value: args.input.displayOrder })
            }

            if (args.input.highlighted !== undefined) {
                patchOps.push({ op: "set", path: "/highlighted", value: args.input.highlighted })
            }

            if (args.input.featuredServiceIds !== undefined) {
                patchOps.push({ op: "set", path: "/featuredServiceIds", value: args.input.featuredServiceIds })
            }

            // Revenue share changes require mutual agreement (not implemented in v1)
            if (args.input.merchantRevenueShareBps !== undefined) {
                throw new GraphQLError("Revenue share changes require mutual agreement. This feature is coming soon.",
                    { extensions: { code: "NOT_IMPLEMENTED" } })
            }

            await context.dataSources.cosmos.patch_record(
                CONTAINER,
                args.input.relationshipId,
                merchantId,
                patchOps,
                context.userId
            )

            const updatedRelationship = await context.dataSources.cosmos.get_record<featuring_relationship_type>(
                CONTAINER,
                args.input.relationshipId,
                merchantId
            )

            return {
                code: "200",
                success: true,
                message: "Featuring relationship updated",
                relationship: updatedRelationship || undefined
            }
        },

        // Terminate a featuring relationship (either party can do this)
        terminateFeaturingRelationship: async (
            _: any,
            args: { relationshipId: string; reason?: string },
            context: serverContext
        ): Promise<featuring_request_response> => {
            if (!context.userId) {
                throw new GraphQLError("User must be logged in", { extensions: { code: "UNAUTHENTICATED" } })
            }

            // Parse relationship ID
            const parts = args.relationshipId.split("_")
            if (parts.length !== 3 || parts[0] !== "feat") {
                throw new GraphQLError("Invalid relationship ID", { extensions: { code: "INVALID_ID" } })
            }
            const merchantId = parts[1]
            const practitionerId = parts[2]

            // Get user's vendors to determine who is terminating
            const user = await context.dataSources.cosmos.get_record<any>(
                "Main-User",
                context.userId,
                context.userId
            )

            const isMerchant = user?.vendors?.some((v: vendor_type) => v.id === merchantId)
            const isPractitioner = user?.vendors?.some((v: vendor_type) => v.id === practitionerId)

            if (!isMerchant && !isPractitioner) {
                throw new GraphQLError("You do not have access to this featuring relationship",
                    { extensions: { code: "FORBIDDEN" } })
            }

            const relationship = await context.dataSources.cosmos.get_record<featuring_relationship_type>(
                CONTAINER,
                args.relationshipId,
                merchantId
            )

            if (!relationship) {
                throw new GraphQLError("Featuring relationship not found", { extensions: { code: "NOT_FOUND" } })
            }

            if (relationship.requestStatus === FeaturingRequestStatus.TERMINATED) {
                throw new GraphQLError("This relationship has already been terminated",
                    { extensions: { code: "ALREADY_TERMINATED" } })
            }

            const now = DateTime.now().toISO()
            const terminatedBy = isMerchant ? "MERCHANT" : "PRACTITIONER"

            const patchOps: PatchOperation[] = [
                { op: "set", path: "/requestStatus", value: FeaturingRequestStatus.TERMINATED },
                { op: "set", path: "/terminatedAt", value: now },
                { op: "set", path: "/terminatedBy", value: terminatedBy },
                { op: "set", path: "/updatedAt", value: now }
            ]

            if (args.reason) {
                patchOps.push({ op: "set", path: "/terminationReason", value: args.reason })
            }

            await context.dataSources.cosmos.patch_record(
                CONTAINER,
                args.relationshipId,
                merchantId,
                patchOps,
                context.userId
            )

            const updatedRelationship = await context.dataSources.cosmos.get_record<featuring_relationship_type>(
                CONTAINER,
                args.relationshipId,
                merchantId
            )

            // TODO: Send notification email to other party

            return {
                code: "200",
                success: true,
                message: "Featuring relationship terminated",
                relationship: updatedRelationship || undefined
            }
        },

        // Configure store-specific schedule for a featuring relationship
        configureFeaturingSchedule: async (
            _: any,
            args: { input: configure_featuring_schedule_input },
            context: serverContext
        ): Promise<featuring_request_response> => {
            if (!context.userId) {
                throw new GraphQLError("User must be logged in", { extensions: { code: "UNAUTHENTICATED" } })
            }

            const parts = args.input.relationshipId.split("_")
            if (parts.length !== 3 || parts[0] !== "feat") {
                throw new GraphQLError("Invalid relationship ID", { extensions: { code: "INVALID_ID" } })
            }
            const merchantId = parts[1]

            await validateVendorAccess(context, merchantId)

            const relationship = await context.dataSources.cosmos.get_record<featuring_relationship_type>(
                CONTAINER, args.input.relationshipId, merchantId
            )

            if (!relationship) {
                throw new GraphQLError("Featuring relationship not found", { extensions: { code: "NOT_FOUND" } })
            }
            if (relationship.requestStatus !== FeaturingRequestStatus.ACCEPTED) {
                throw new GraphQLError("Can only configure active featuring relationships", { extensions: { code: "NOT_ACTIVE" } })
            }

            const patchOps: PatchOperation[] = [
                { op: "set", path: "/storeSchedule", value: args.input.storeSchedule },
                { op: "set", path: "/updatedAt", value: DateTime.now().toISO() }
            ]

            await context.dataSources.cosmos.patch_record(
                CONTAINER, args.input.relationshipId, merchantId, patchOps, context.userId
            )

            const updated = await context.dataSources.cosmos.get_record<featuring_relationship_type>(
                CONTAINER, args.input.relationshipId, merchantId
            )

            return {
                code: "200",
                success: true,
                message: "Schedule configured successfully",
                relationship: updated || undefined
            }
        },

        // Configure store-specific pricing for a featuring relationship
        configureFeaturingPricing: async (
            _: any,
            args: { input: configure_featuring_pricing_input },
            context: serverContext
        ): Promise<featuring_request_response> => {
            if (!context.userId) {
                throw new GraphQLError("User must be logged in", { extensions: { code: "UNAUTHENTICATED" } })
            }

            const parts = args.input.relationshipId.split("_")
            if (parts.length !== 3 || parts[0] !== "feat") {
                throw new GraphQLError("Invalid relationship ID", { extensions: { code: "INVALID_ID" } })
            }
            const merchantId = parts[1]
            const practitionerId = parts[2]

            await validateVendorAccess(context, merchantId)

            const relationship = await context.dataSources.cosmos.get_record<featuring_relationship_type>(
                CONTAINER, args.input.relationshipId, merchantId
            )

            if (!relationship) {
                throw new GraphQLError("Featuring relationship not found", { extensions: { code: "NOT_FOUND" } })
            }
            if (relationship.requestStatus !== FeaturingRequestStatus.ACCEPTED) {
                throw new GraphQLError("Can only configure active featuring relationships", { extensions: { code: "NOT_ACTIVE" } })
            }

            // Validate all service IDs belong to the practitioner
            for (const override of args.input.servicePriceOverrides) {
                const service = await context.dataSources.cosmos.get_record<service_type>(
                    LISTING_CONTAINER, override.serviceId, practitionerId
                )
                if (!service) {
                    throw new GraphQLError(
                        `Service ${override.serviceId} not found or does not belong to this practitioner`,
                        { extensions: { code: "INVALID_SERVICE" } }
                    )
                }
            }

            const patchOps: PatchOperation[] = [
                { op: "set", path: "/servicePriceOverrides", value: args.input.servicePriceOverrides },
                { op: "set", path: "/updatedAt", value: DateTime.now().toISO() }
            ]

            await context.dataSources.cosmos.patch_record(
                CONTAINER, args.input.relationshipId, merchantId, patchOps, context.userId
            )

            const updated = await context.dataSources.cosmos.get_record<featuring_relationship_type>(
                CONTAINER, args.input.relationshipId, merchantId
            )

            return {
                code: "200",
                success: true,
                message: "Pricing configured successfully",
                relationship: updated || undefined
            }
        },

        // Configure delivery context for a featuring relationship
        configureFeaturingDelivery: async (
            _: any,
            args: { input: { relationshipId: string; deliveryContext: featuring_delivery_context_type } },
            context: serverContext
        ): Promise<featuring_request_response> => {
            if (!context.userId) {
                throw new GraphQLError("User must be logged in", { extensions: { code: "UNAUTHENTICATED" } })
            }

            const parts = args.input.relationshipId.split("_")
            if (parts.length !== 3 || parts[0] !== "feat") {
                throw new GraphQLError("Invalid relationship ID", { extensions: { code: "INVALID_ID" } })
            }
            const merchantId = parts[1]

            await validateVendorAccess(context, merchantId)

            const relationship = await context.dataSources.cosmos.get_record<featuring_relationship_type>(
                CONTAINER, args.input.relationshipId, merchantId
            )

            if (!relationship) {
                throw new GraphQLError("Featuring relationship not found", { extensions: { code: "NOT_FOUND" } })
            }
            if (relationship.requestStatus !== FeaturingRequestStatus.ACCEPTED) {
                throw new GraphQLError("Can only configure active featuring relationships", { extensions: { code: "NOT_ACTIVE" } })
            }

            const patchOps: PatchOperation[] = [
                { op: "set", path: "/deliveryContext", value: args.input.deliveryContext },
                { op: "set", path: "/updatedAt", value: DateTime.now().toISO() }
            ]

            await context.dataSources.cosmos.patch_record(
                CONTAINER, args.input.relationshipId, merchantId, patchOps, context.userId
            )

            const updated = await context.dataSources.cosmos.get_record<featuring_relationship_type>(
                CONTAINER, args.input.relationshipId, merchantId
            )

            return {
                code: "200",
                success: true,
                message: "Delivery context configured successfully",
                relationship: updated || undefined
            }
        }
    }
}

export { resolvers }

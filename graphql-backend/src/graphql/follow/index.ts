import { DateTime } from "luxon"
import { serverContext } from "../../services/azFunction"
import { v4 as uuid } from "uuid"
import { follow_type } from "./types"
import { PatchOperation } from "@azure/cosmos"

const CONTAINER = "Main-Follow"

const resolvers = {
    Query: {
        isFollowing: async (_: any, args: { merchantId: string }, context: serverContext) => {
            if (!context.userId) return false

            const followId = `follow_${context.userId}_${args.merchantId}`
            try {
                const follow = await context.dataSources.cosmos.get_record<follow_type>(
                    CONTAINER,
                    followId,
                    args.merchantId
                )
                return follow?.status === "ACTIVE"
            } catch {
                return false
            }
        },

        myFollowing: async (_: any, _args: any, context: serverContext) => {
            if (!context.userId) throw new Error("User must be logged in")

            // Cross-partition query to get all merchants user follows
            const querySpec = {
                query: `SELECT c.targetId as merchantId, c.followedAt FROM c WHERE c.followerId = @userId AND c.targetType = 'MERCHANT'`,
                parameters: [{ name: "@userId", value: context.userId }]
            }

            const follows = await context.dataSources.cosmos.run_query<any>(CONTAINER, querySpec)

            // Fetch merchant details for each follow
            const results = await Promise.all(
                follows.map(async (follow: any) => {
                    try {
                        const vendor = await context.dataSources.cosmos.get_record<any>(
                            "Main-Vendor",
                            follow.merchantId,
                            follow.merchantId
                        )
                        return {
                            merchantId: follow.merchantId,
                            merchantName: vendor?.name || "Unknown",
                            merchantSlug: vendor?.slug || "",
                            merchantLogo: vendor?.logo || null,
                            followedAt: follow.followedAt
                        }
                    } catch {
                        return null
                    }
                })
            )

            return results.filter(r => r !== null)
        },

        merchantFollowers: async (_: any, args: { merchantId: string, limit?: number, offset?: number }, context: serverContext) => {
            const limit = args.limit || 50
            const offset = args.offset || 0

            // Single partition query - efficient
            const countQuery = {
                query: `SELECT VALUE COUNT(1) FROM c WHERE c.targetId = @merchantId AND c.targetType = 'MERCHANT'`,
                parameters: [{ name: "@merchantId", value: args.merchantId }]
            }

            const followersQuery = {
                query: `SELECT c.id, c.followerId as userId, c.followerName as userName, c.followerAvatar as userAvatar, c.followedAt
                        FROM c
                        WHERE c.targetId = @merchantId AND c.targetType = 'MERCHANT'
                        ORDER BY c.followedAt DESC
                        OFFSET @offset LIMIT @limit`,
                parameters: [
                    { name: "@merchantId", value: args.merchantId },
                    { name: "@offset", value: offset },
                    { name: "@limit", value: limit }
                ]
            }

            const [countResult, followers] = await Promise.all([
                context.dataSources.cosmos.run_query<number>(CONTAINER, countQuery),
                context.dataSources.cosmos.run_query<any>(CONTAINER, followersQuery)
            ])

            const totalCount = countResult[0] || 0

            return {
                followers,
                totalCount,
                hasMore: offset + followers.length < totalCount
            }
        }
    },

    Mutation: {
        followMerchant: async (_: any, args: { merchantId: string }, context: serverContext) => {
            if (!context.userId) throw new Error("User must be logged in to follow")

            const followId = `follow_${context.userId}_${args.merchantId}`

            // Check if already following
            try {
                const existing = await context.dataSources.cosmos.get_record<follow_type>(
                    CONTAINER,
                    followId,
                    args.merchantId
                )
                if (existing?.status === "ACTIVE") {
                    // Already following, get current count
                    const vendor = await context.dataSources.cosmos.get_record<any>(
                        "Main-Vendor",
                        args.merchantId,
                        args.merchantId
                    )
                    return {
                        code: "200",
                        success: true,
                        message: "Already following this merchant",
                        isFollowing: true,
                        followerCount: vendor?.followerCount || 0
                    }
                }
            } catch {
                // Not found, proceed to create
            }

            // Get user info for denormalization
            const user = await context.dataSources.cosmos.get_record<any>(
                "Main-User",
                context.userId,
                context.userId
            )

            // Create follow record
            const followRecord: follow_type = {
                id: followId,
                targetId: args.merchantId,
                targetType: "MERCHANT",
                followerId: context.userId,
                followerName: user?.name || `${user?.firstname || ""} ${user?.lastname || ""}`.trim() || "Anonymous",
                followerEmail: user?.email,
                followerAvatar: user?.avatar || undefined,
                followedAt: DateTime.now().toISO(),
                status: "ACTIVE"
            }

            await context.dataSources.cosmos.add_record(
                CONTAINER,
                followRecord,
                args.merchantId,
                context.userId
            )

            // Increment follower count on vendor
            const patchOps: PatchOperation[] = [
                { op: "incr", path: "/followerCount", value: 1 }
            ]

            try {
                await context.dataSources.cosmos.patch_record(
                    "Main-Vendor",
                    args.merchantId,
                    args.merchantId,
                    patchOps,
                    context.userId
                )
            } catch {
                // If followerCount doesn't exist, set it to 1
                await context.dataSources.cosmos.patch_record(
                    "Main-Vendor",
                    args.merchantId,
                    args.merchantId,
                    [{ op: "set", path: "/followerCount", value: 1 }],
                    context.userId
                )
            }

            // Get updated vendor
            const vendor = await context.dataSources.cosmos.get_record<any>(
                "Main-Vendor",
                args.merchantId,
                args.merchantId
            )

            return {
                code: "200",
                success: true,
                message: "Successfully followed merchant",
                isFollowing: true,
                followerCount: vendor?.followerCount || 1
            }
        },

        unfollowMerchant: async (_: any, args: { merchantId: string }, context: serverContext) => {
            if (!context.userId) throw new Error("User must be logged in to unfollow")

            const followId = `follow_${context.userId}_${args.merchantId}`

            // Delete follow record (soft delete)
            try {
                await context.dataSources.cosmos.delete_record(
                    CONTAINER,
                    followId,
                    args.merchantId,
                    context.userId
                )
            } catch {
                // Record didn't exist, that's fine
            }

            // Decrement follower count on vendor
            const patchOps: PatchOperation[] = [
                { op: "incr", path: "/followerCount", value: -1 }
            ]

            try {
                await context.dataSources.cosmos.patch_record(
                    "Main-Vendor",
                    args.merchantId,
                    args.merchantId,
                    patchOps,
                    context.userId
                )
            } catch {
                // Ignore if can't decrement
            }

            // Get updated vendor
            const vendor = await context.dataSources.cosmos.get_record<any>(
                "Main-Vendor",
                args.merchantId,
                args.merchantId
            )

            // Ensure count doesn't go negative
            const followerCount = Math.max(0, vendor?.followerCount || 0)

            return {
                code: "200",
                success: true,
                message: "Successfully unfollowed merchant",
                isFollowing: false,
                followerCount
            }
        }
    }
}

export { resolvers }

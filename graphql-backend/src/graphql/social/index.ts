import { DateTime } from "luxon"
import { serverContext } from "../../services/azFunction"
import { isNullOrWhiteSpace } from "../../utils/functions"
import { FeedActivity } from "./feedActivity"

const resolvers = {
    Query: {
        socialpost: async (_: any, args: { id: string, vendorId: string}, { dataSources }: serverContext) => {
            return await dataSources.cosmos.get_record("Main-SocialPost", args.id, args.vendorId)
        },

        myFeed: async (_: any, args: { limit?: number, offset?: number, activityTypes?: string[] }, context: serverContext) => {
            if (!context.userId) throw new Error("User must be logged in")

            const limit = args.limit || 20
            const offset = args.offset || 0

            // Get followed vendor IDs
            const followQuery = {
                query: `SELECT c.targetId as merchantId FROM c WHERE c.followerId = @userId AND c.targetType = 'MERCHANT'`,
                parameters: [{ name: "@userId", value: context.userId }]
            }
            const follows = await context.dataSources.cosmos.run_query<{ merchantId: string }>("Main-Follow", followQuery)

            if (follows.length === 0) {
                return { activities: [], hasMore: false, followingCount: 0 }
            }

            // Fetch feed activities from Main-SocialPost for each followed vendor
            const allActivities: FeedActivity[] = []

            await Promise.all(
                follows.map(async (f) => {
                    try {
                        let query = `SELECT * FROM c WHERE c.vendorId = @vendorId AND c.activityType != null`
                        const params: any[] = [{ name: "@vendorId", value: f.merchantId }]

                        // Filter by activity types if specified
                        if (args.activityTypes && args.activityTypes.length > 0) {
                            query += ` AND c.activityType IN (${args.activityTypes.map((_, i) => `@type${i}`).join(',')})`
                            args.activityTypes.forEach((t, i) => params.push({ name: `@type${i}`, value: t }))
                        }

                        query += ` ORDER BY c.publishedAt DESC OFFSET 0 LIMIT 50`

                        const activities = await context.dataSources.cosmos.run_query<FeedActivity>(
                            "Main-SocialPost",
                            { query, parameters: params },
                            true // ignoreStatus — feed activities don't use soft-delete status field
                        )
                        allActivities.push(...activities)
                    } catch { /* skip vendors that error */ }
                })
            )

            // Sort by date (newest first)
            allActivities.sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""))

            // Apply pagination
            const paginated = allActivities.slice(offset, offset + limit + 1)
            const hasMore = paginated.length > limit

            return {
                activities: paginated.slice(0, limit),
                hasMore,
                followingCount: follows.length
            }
        },

        exploreFeed: async (_: any, args: { limit?: number, offset?: number, category?: string }, context: serverContext) => {
            if (!context.userId) throw new Error("User must be logged in")

            const limit = args.limit || 20
            const offset = args.offset || 0

            // Get followed vendor IDs to exclude
            const followQuery = {
                query: `SELECT c.targetId as merchantId FROM c WHERE c.followerId = @userId AND c.targetType = 'MERCHANT'`,
                parameters: [{ name: "@userId", value: context.userId }]
            }
            const follows = await context.dataSources.cosmos.run_query<{ merchantId: string }>("Main-Follow", followQuery)
            const followedIds = new Set(follows.map(f => f.merchantId))

            // Get user's own vendor IDs to exclude
            const userVendors = await context.dataSources.cosmos.run_query<{ id: string }>(
                "Main-Vendor",
                {
                    query: `SELECT c.id FROM c WHERE ARRAY_CONTAINS(c.userIds, @userId)`,
                    parameters: [{ name: "@userId", value: context.userId }]
                }
            )
            userVendors.forEach(v => followedIds.add(v.id))

            // Fetch recent feed activities across all vendors (cross-partition)
            // Filter to only published vendors' content
            let query = `SELECT * FROM c WHERE c.activityType != null`
            const params: any[] = []

            // Category filter maps to activity types
            if (args.category) {
                const typeMap: Record<string, string[]> = {
                    'readings': ['NEW_SERVICE'],
                    'crystals': ['NEW_PRODUCT'],
                    'events': ['NEW_EVENT'],
                    'healing': ['NEW_SERVICE'],
                    'journeys': ['NEW_JOURNEY'],
                    'oracle': ['ORACLE_MESSAGE'],
                    'video': ['VIDEO_UPDATE'],
                }
                const types = typeMap[args.category]
                if (types) {
                    query += ` AND c.activityType IN (${types.map((_, i) => `@catType${i}`).join(',')})`
                    types.forEach((t, i) => params.push({ name: `@catType${i}`, value: t }))
                }
            }

            query += ` ORDER BY c.publishedAt DESC OFFSET 0 LIMIT ${offset + limit + 20}`

            const activities = await context.dataSources.cosmos.run_query<FeedActivity>(
                "Main-SocialPost",
                { query, parameters: params },
                true
            )

            // Filter out followed vendors and own vendors
            const filtered = activities.filter(a => !followedIds.has(a.vendorId))

            // Apply pagination
            const paginated = filtered.slice(offset, offset + limit + 1)
            const hasMore = paginated.length > limit

            return {
                activities: paginated.slice(0, limit),
                hasMore
            }
        }
    },
    Mutation: {
        create_textOnly_socialpost: async (_: any, args: { vendorId: string, socialPost: any }, { dataSources }: serverContext) => {
           var sp = args.socialPost
           sp.vendorId = args.vendorId
           if (DateTime.fromJSDate(sp.availableAfter) <= DateTime.now()) {
                sp.isPublished = true
           } else {
                sp.isPublished = false
           }

           sp.hashtags = sp.hashtags.map((h: string) => {
                return h.replace("#", "")
           }).filter((h: string) => !isNullOrWhiteSpace(h))

           sp.availableAfter = DateTime.fromJSDate(sp.availableAfter).toISO()
           if (sp.media != null) {
                sp.media = sp.media.map(({ url, ...media}: { url: URL }) => {
                    return {
                        ...media, url: url.toString(),
                    }
                })
            }
           await dataSources.cosmos.add_record("Main-SocialPost", sp, args.vendorId, "SYSTEM")

           return {
                code: "200",
                success: true,
                message: `Social Post ${sp.id} successfully created`,
                socialPost: await dataSources.cosmos.get_record("Main-SocialPost", sp.id, args.vendorId)
           }
        },
        update_socialpost: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            await context.dataSources.cosmos.update_record("Main-SocialPost", args.socialPost.id, args.socialPost.vendorId, args.socialPost, context.userId)

            return {
                code: "200",
                success: true,
                message: `Social Post ${args.socialPost.id} successfully updated`,
                socialPost: await context.dataSources.cosmos.get_record("Social Post", args.socialPost.id, args.socialPost.id)
            }
        },
        delete_socialpost: async (_: any, args: { id: string, vendorId: string}, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            await context.dataSources.cosmos.delete_record("Main-SocialPost", args.id, args.vendorId, context.userId)
            return {
                code: "200",
                success: true,
                message: `Social Post ${args.id} successfully deleted`
            }
        }
    },
    FeedActivity: {
        // Serialize metadata object to JSON string for transport
        metadata: (parent: FeedActivity) => {
            return parent.metadata ? JSON.stringify(parent.metadata) : null;
        }
    },
    SocialPost: {
        ref: async(parent: any, _: any, _context: serverContext) => {
            return {
                id: parent.id, partition: [parent.vendorId], container: "Main-SocialPost"
            }
        }
    },
    SocialPostContent: {
        __resolveType(obj: any) {
            if (obj.mainText) {
                return 'SocialPostTextOnlyContent';
              }
              if (obj.mediaField) {
                return 'SocialPostMediaContent';
              }
              return null;
        }
    }
}
export { resolvers }

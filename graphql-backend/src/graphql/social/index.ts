import { DateTime } from "luxon"
import { serverContext } from "../../services/azFunction"
import { isNullOrWhiteSpace } from "../../utils/functions"

const resolvers = {
    Query: {
        socialpost: async (_: any, args: { id: string, vendorId: string}, { dataSources }: serverContext) => {
            return await dataSources.cosmos.get_record("Main-SocialPost", args.id, args.vendorId)
        },
        myFeed: async (_: any, args: { limit?: number, offset?: number }, context: serverContext) => {
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
                return { posts: [], hasMore: false }
            }

            // Fetch vendors with their videos and oracle messages
            const allPosts: any[] = []
            const now = new Date().toISOString()
            await Promise.all(
                follows.map(async (f) => {
                    try {
                        const vendor = await context.dataSources.cosmos.get_record<any>("Main-Vendor", f.merchantId, f.merchantId)
                        if (!vendor) return

                        const vendorInfo = {
                            vendorId: vendor.id,
                            vendorName: vendor.name || "Unknown",
                            vendorSlug: vendor.slug || "",
                            vendorLogo: vendor.logo || null,
                            vendorDocType: vendor.docType || "MERCHANT"
                        }

                        // Add video updates (intentional posts, not profile gallery)
                        if (vendor.videoUpdates && vendor.videoUpdates.length > 0) {
                            for (const update of vendor.videoUpdates) {
                                allPosts.push({
                                    ...vendorInfo,
                                    postType: "VIDEO",
                                    video: { media: update.media, coverPhoto: update.coverPhoto },
                                    videoCaption: update.caption || null,
                                    videoPostedAt: update.postedAt,
                                    oracleMessage: null,
                                    _sortDate: update.postedAt
                                })
                            }
                        }

                        // Add active oracle message from practitioners
                        const oracle = vendor.practitioner?.oracleMessage
                        if (oracle && oracle.expiresAt > now) {
                            allPosts.push({
                                ...vendorInfo,
                                postType: "ORACLE",
                                video: null,
                                oracleMessage: oracle,
                                _sortDate: oracle.postedAt
                            })
                        }
                    } catch { /* skip vendors that can't be found */ }
                })
            )

            // Sort by date (newest first) - oracle messages with postedAt, videos without a clear date go after
            allPosts.sort((a, b) => (b._sortDate || "").localeCompare(a._sortDate || ""))

            // Apply pagination
            const paginated = allPosts.slice(offset, offset + limit + 1)
            const hasMore = paginated.length > limit

            return {
                posts: paginated.slice(0, limit),
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

           // we should remove any # from the hashtags
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
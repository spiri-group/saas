import { v4 as uuidv4 } from "uuid"
import { DateTime } from "luxon"
import { PatchOperation } from "@azure/cosmos"
import { serverContext } from "../../services/azFunction"
import { slugify } from "../../utils/functions"
import { RecordStatus } from "../../utils/database"
import { ListingTypes } from "../listing/types"
import { journey_track_type, journey_progress_type } from "./types"

const resolvers = {
    Query: {
        journey: async (_: any, args: any, { dataSources }: serverContext) => {
            return await dataSources.cosmos.get_record("Main-Listing", args.id, args.vendorId)
        },
        journeys: async (_: any, args: any, { dataSources }: serverContext) => {
            const includeDrafts = args.includeDrafts === true
            let query = `SELECT * FROM c WHERE c.vendorId = @vendorId AND c.type = 'JOURNEY'`
            if (!includeDrafts) {
                query += ` AND c.isLive = true`
            }
            query += ` ORDER BY c.createdDate DESC`
            return await dataSources.cosmos.run_query("Main-Listing", {
                query,
                parameters: [
                    { name: "@vendorId", value: args.vendorId }
                ]
            })
        },
        journeyTracks: async (_: any, args: any, { dataSources }: serverContext) => {
            const tracks = await dataSources.cosmos.run_query("Main-Listing", {
                query: `SELECT * FROM c WHERE c.journeyId = @journeyId AND c.vendorId = @vendorId AND c.docType = 'journeyTrack' ORDER BY c.trackNumber ASC`,
                parameters: [
                    { name: "@journeyId", value: args.journeyId },
                    { name: "@vendorId", value: args.vendorId }
                ]
            })
            return tracks
        },
        journeyProgress: async (_: any, args: any, { dataSources }: serverContext) => {
            const progressId = `jp:${args.journeyId}`
            try {
                return await dataSources.cosmos.get_record("Main-PersonalSpace", progressId, args.userId)
            } catch {
                return null
            }
        },
        myJourneys: async (_: any, args: any, { dataSources }: serverContext) => {
            const journeys = await dataSources.cosmos.run_query("Main-PersonalSpace", {
                query: `SELECT * FROM c WHERE c.userId = @userId AND c.docType = 'journeyProgress'`,
                parameters: [
                    { name: "@userId", value: args.userId }
                ]
            })
            return journeys
        }
    },
    Mutation: {
        create_journey: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call"

            const journeyId = args.input.id || uuidv4()

            // Generate unique slug
            let baseSlug = slugify(args.input.name)
            let finalSlug = baseSlug
            let counter = 1

            while (true) {
                const existingSlugs = await context.dataSources.cosmos.run_query("Main-Listing", {
                    query: "SELECT VALUE c.slug FROM c WHERE c.vendorId = @vendorId AND c.slug = @slug",
                    parameters: [
                        { name: "@vendorId", value: args.vendorId },
                        { name: "@slug", value: finalSlug }
                    ]
                }, true)

                if (existingSlugs.length === 0) break
                counter++
                finalSlug = `${baseSlug}-${counter}`
            }

            const price = args.input.pricing.collectionPrice
            const item = {
                id: journeyId,
                slug: finalSlug,
                type: ListingTypes.JOURNEY,
                vendorId: args.vendorId,
                name: args.input.name,
                description: args.input.description,
                thumbnail: args.input.thumbnail,
                isLive: false,
                ref: {
                    id: journeyId,
                    partition: [args.vendorId],
                    container: "Main-Listing"
                },
                status: RecordStatus.ACTIVE,
                displayScore: Math.random(),
                skus: [{
                    id: `${journeyId}-sku`,
                    price: {
                        amount: price.amount,
                        currency: price.currency
                    },
                    qty: "999"
                }],
                journeyStructure: args.input.journeyStructure,
                modalities: args.input.modalities || [],
                intention: args.input.intention || "",
                totalDurationSeconds: 0,
                trackCount: 0,
                pricing: args.input.pricing,
                difficulty: args.input.difficulty,
                spiritualInterests: args.input.spiritualInterests || [],
                recommendedCrystals: args.input.recommendedCrystals || [],
                recommendedTools: args.input.recommendedTools || [],
                previewTrackId: args.input.previewTrackId,
                stripe: {
                    tax_code: "txcd_10000000"
                }
            }

            await context.dataSources.cosmos.add_record("Main-Listing", item, item.vendorId, context.userId)

            return {
                code: "200",
                success: true,
                message: "Journey created successfully",
                journey: await context.dataSources.cosmos.get_record("Main-Listing", item.id, item.vendorId)
            }
        },
        update_journey: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call"

            const operations: PatchOperation[] = []
            const input = args.input

            if (input.name !== undefined) operations.push({ op: "set", path: "/name", value: input.name })
            if (input.description !== undefined) operations.push({ op: "set", path: "/description", value: input.description })
            if (input.thumbnail !== undefined) operations.push({ op: "set", path: "/thumbnail", value: input.thumbnail })
            if (input.journeyStructure !== undefined) operations.push({ op: "set", path: "/journeyStructure", value: input.journeyStructure })
            if (input.modalities !== undefined) operations.push({ op: "set", path: "/modalities", value: input.modalities })
            if (input.intention !== undefined) operations.push({ op: "set", path: "/intention", value: input.intention })
            if (input.difficulty !== undefined) operations.push({ op: "set", path: "/difficulty", value: input.difficulty })
            if (input.spiritualInterests !== undefined) operations.push({ op: "set", path: "/spiritualInterests", value: input.spiritualInterests })
            if (input.recommendedCrystals !== undefined) operations.push({ op: "set", path: "/recommendedCrystals", value: input.recommendedCrystals })
            if (input.recommendedTools !== undefined) operations.push({ op: "set", path: "/recommendedTools", value: input.recommendedTools })
            if (input.previewTrackId !== undefined) operations.push({ op: "set", path: "/previewTrackId", value: input.previewTrackId })
            if (input.isLive !== undefined) {
                operations.push({ op: "set", path: "/isLive", value: input.isLive })
            }
            if (input.pricing !== undefined) {
                operations.push({ op: "set", path: "/pricing", value: input.pricing })
                operations.push({ op: "set", path: "/skus", value: [{
                    id: `${input.id}-sku`,
                    price: {
                        amount: input.pricing.collectionPrice.amount,
                        currency: input.pricing.collectionPrice.currency
                    },
                    qty: "999"
                }]})
            }

            if (operations.length > 0) {
                await context.dataSources.cosmos.patch_record("Main-Listing", input.id, args.vendorId, operations, context.userId)
            }

            return {
                code: "200",
                success: true,
                message: "Journey updated successfully",
                journey: await context.dataSources.cosmos.get_record("Main-Listing", input.id, args.vendorId)
            }
        },
        upsert_journey_track: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call"

            const trackId = args.input.id || uuidv4()
            const isUpdate = args.input.id != null

            const track: journey_track_type = {
                id: trackId,
                journeyId: args.journeyId,
                vendorId: args.vendorId,
                docType: "journeyTrack",
                trackNumber: args.input.trackNumber,
                title: args.input.title,
                description: args.input.description || "",
                intention: args.input.intention,
                durationSeconds: args.input.durationSeconds,
                audioFile: args.input.audioFile,
                previewDurationSeconds: args.input.previewDurationSeconds,
                integrationPrompts: args.input.integrationPrompts || [],
                recommendedCrystals: args.input.recommendedCrystals || [],
                linkedProductIds: args.input.linkedProductIds || [],
                releaseDate: args.input.releaseDate
            }

            if (isUpdate) {
                await context.dataSources.cosmos.update_record("Main-Listing", trackId, args.vendorId, track, context.userId)
            } else {
                await context.dataSources.cosmos.add_record("Main-Listing", track, args.vendorId, context.userId)
            }

            // Recalculate journey totals
            await recalculateJourneyTotals(context, args.journeyId, args.vendorId)

            return {
                code: "200",
                success: true,
                message: isUpdate ? "Track updated successfully" : "Track added successfully",
                track: await context.dataSources.cosmos.get_record("Main-Listing", trackId, args.vendorId)
            }
        },
        delete_journey_track: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call"

            await context.dataSources.cosmos.update_status("Main-Listing", args.trackId, args.vendorId, "DELETED" as any, context.userId)

            // Recalculate journey totals
            await recalculateJourneyTotals(context, args.journeyId, args.vendorId)

            return {
                code: "200",
                success: true,
                message: "Track deleted successfully"
            }
        },
        reorder_journey_tracks: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call"

            const trackIds: string[] = args.trackIds
            for (let i = 0; i < trackIds.length; i++) {
                await context.dataSources.cosmos.patch_record("Main-Listing", trackIds[i], args.vendorId, [
                    { op: "set", path: "/trackNumber", value: i + 1 }
                ], context.userId)
            }

            return {
                code: "200",
                success: true,
                message: "Tracks reordered successfully",
                journey: await context.dataSources.cosmos.get_record("Main-Listing", args.journeyId, args.vendorId)
            }
        },
        update_journey_progress: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call"

            const input = args.input
            const progressId = `jp:${input.journeyId}`
            let progress: journey_progress_type

            try {
                progress = await context.dataSources.cosmos.get_record("Main-PersonalSpace", progressId, input.userId)
            } catch {
                // Progress record doesn't exist yet - this shouldn't happen after purchase
                throw new Error("Journey progress not found. Has the journey been purchased?")
            }

            // Update the specific track progress
            const trackIdx = progress.trackProgress.findIndex(tp => tp.trackId === input.trackId)
            if (trackIdx === -1) {
                // Add new track progress entry
                progress.trackProgress.push({
                    trackId: input.trackId,
                    completed: input.completed,
                    lastPositionSeconds: input.lastPositionSeconds,
                    completedDate: input.completed ? DateTime.now().toISO() : undefined
                })
            } else {
                progress.trackProgress[trackIdx].lastPositionSeconds = input.lastPositionSeconds
                if (input.completed && !progress.trackProgress[trackIdx].completed) {
                    progress.trackProgress[trackIdx].completed = true
                    progress.trackProgress[trackIdx].completedDate = DateTime.now().toISO()
                }
            }

            // Update current track number (highest completed + 1)
            const highestCompleted = progress.trackProgress
                .filter(tp => tp.completed)
                .length
            progress.currentTrackNumber = highestCompleted + 1

            // Check if entire journey is complete
            const journey = await context.dataSources.cosmos.get_record<any>("Main-Listing", input.journeyId, progress.vendorId)
            if (highestCompleted >= journey.trackCount && !progress.completedDate) {
                progress.completedDate = DateTime.now().toISO()
            }

            const operations: PatchOperation[] = [
                { op: "set", path: "/trackProgress", value: progress.trackProgress },
                { op: "set", path: "/currentTrackNumber", value: progress.currentTrackNumber }
            ]
            if (progress.completedDate) {
                operations.push({ op: "set", path: "/completedDate", value: progress.completedDate })
            }

            await context.dataSources.cosmos.patch_record("Main-PersonalSpace", progressId, input.userId, operations, context.userId)

            return await context.dataSources.cosmos.get_record("Main-PersonalSpace", progressId, input.userId)
        },
        add_track_reflection: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call"

            const input = args.input
            const progressId = `jp:${input.journeyId}`

            const progress: journey_progress_type = await context.dataSources.cosmos.get_record("Main-PersonalSpace", progressId, input.userId)

            const trackIdx = progress.trackProgress.findIndex(tp => tp.trackId === input.trackId)
            if (trackIdx === -1) {
                throw new Error("Track progress not found. Listen to the track first.")
            }

            progress.trackProgress[trackIdx].reflection = input.reflection

            await context.dataSources.cosmos.patch_record("Main-PersonalSpace", progressId, input.userId, [
                { op: "set", path: `/trackProgress/${trackIdx}/reflection`, value: input.reflection }
            ], context.userId)

            return await context.dataSources.cosmos.get_record("Main-PersonalSpace", progressId, input.userId)
        },
        set_rental_expiry: async (_: any, args: { journeyId: string, userId: string, expiresAt: string, accessType?: string }, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call"

            const progressId = `jp:${args.journeyId}`
            const operations: PatchOperation[] = [
                { op: "set", path: "/rentalExpiresAt", value: args.expiresAt }
            ]
            if (args.accessType) {
                operations.push({ op: "set", path: "/accessType", value: args.accessType })
            }

            await context.dataSources.cosmos.patch_record("Main-PersonalSpace", progressId, args.userId, operations, context.userId)

            return await context.dataSources.cosmos.get_record("Main-PersonalSpace", progressId, args.userId)
        }
    },
    Journey: {
        tracks: async (parent: any, _: any, { dataSources }: serverContext) => {
            const tracks = await dataSources.cosmos.run_query("Main-Listing", {
                query: `SELECT * FROM c WHERE c.journeyId = @journeyId AND c.vendorId = @vendorId AND c.docType = 'journeyTrack' ORDER BY c.trackNumber ASC`,
                parameters: [
                    { name: "@journeyId", value: parent.id },
                    { name: "@vendorId", value: parent.vendorId }
                ]
            })
            return tracks
        },
        vendor: async (parent: any, _: any, { dataSources }: serverContext) => {
            return await dataSources.cosmos.get_record("Main-Vendor", parent.vendorId, parent.vendorId)
        },
        ref: async (parent: any) => {
            return {
                id: parent.id,
                partition: [parent.vendorId],
                container: "Main-Listing"
            }
        }
    },
    JourneyTrack: {
        ref: async (parent: any) => {
            return {
                id: parent.id,
                partition: [parent.vendorId],
                container: "Main-Listing"
            }
        },
        linkedProducts: async (parent: any, _: any, { dataSources }: serverContext) => {
            if (!parent.linkedProductIds || parent.linkedProductIds.length === 0) return [];
            const products = [];
            for (const productId of parent.linkedProductIds) {
                try {
                    const product = await dataSources.cosmos.get_record("Main-Listing", productId, parent.vendorId);
                    products.push(product);
                } catch {
                    // Product may have been deleted — skip it
                }
            }
            return products;
        }
    },
    JourneyPricing: {
        allowRental: (parent: any) => parent.allowRental ?? false,
        rentalDurationDays: (parent: any) => parent.rentalDurationDays ?? null,
        rentalPrice: (parent: any) => parent.rentalPrice ?? null,
    },
    JourneyProgress: {
        accessType: (parent: any) => parent.accessType ?? "PURCHASE",
        journey: async (parent: any, _: any, { dataSources }: serverContext) => {
            return await dataSources.cosmos.get_record("Main-Listing", parent.journeyId, parent.vendorId)
        }
    }
}

async function recalculateJourneyTotals(context: serverContext, journeyId: string, vendorId: string) {
    const tracks = await context.dataSources.cosmos.run_query("Main-Listing", {
        query: `SELECT c.durationSeconds FROM c WHERE c.journeyId = @journeyId AND c.vendorId = @vendorId AND c.docType = 'journeyTrack'`,
        parameters: [
            { name: "@journeyId", value: journeyId },
            { name: "@vendorId", value: vendorId }
        ]
    })

    const totalDuration = tracks.reduce((sum: number, t: any) => sum + (t.durationSeconds || 0), 0)
    const trackCount = tracks.length

    await context.dataSources.cosmos.patch_record("Main-Listing", journeyId, vendorId, [
        { op: "set", path: "/totalDurationSeconds", value: totalDuration },
        { op: "set", path: "/trackCount", value: trackCount }
    ], "SYSTEM")
}

export { resolvers }

import { v4 as uuidv4 } from "uuid"
import { rrulestr } from "rrule"
import { DateTime } from "luxon"
import { HTTPMethod, PatchOperation } from "@azure/cosmos"
import { GraphQLError } from "graphql"
import { RecordStatus } from "../../utils/database"
import { isNullOrUndefined, isNullOrWhiteSpace, mergeDeep } from "../../utils/functions"
import { MutationResponse } from "../0_shared/types"
import { serverContext } from "../../services/azFunction"
import { activityList_type, tour_type } from "../eventandtour/types"
import { listing_type, ListingTypes } from "./types"
import { product_type } from "../product/types"

const resolvers = {
    Query: {
        catalogue: async (_: any, args: any, { dataSources }: serverContext, ___:any) => {

            var parameters: { name: string, value: string}[] = [
                { name: "@offset", value: args.offset ?? 0 },
                { name: "@limit", value: args.limit ?? 25 }
            ]

            var whereConditions: string[] = [
                "l.status = 'ACTIVE'",
            ]
            if (args.vendorId != null) {
                whereConditions.push("l.vendorId = @vendorId")
                parameters.push({ name: "@vendorId", value: args.vendorId})
            }
            if (args.types != null) {
                whereConditions.push(`ARRAY_CONTAINS(@types, l.type)`)
                parameters.push({ name: "@types", value: args.types})
            }
            if (!isNullOrWhiteSpace(args.search)) {
                whereConditions.push("CONTAINS(LOWER(l.name), @search)");
                parameters.push({ name: "@search", value: args.search.toLowerCase() });
            }

            // Filter for live products only (drafts are hidden from customers)
            // Products must be explicitly isLive=true, other listing types are shown regardless
            // Use includeDrafts=true to show draft products (for merchant view)
            if (args.includeDrafts !== true) {
                whereConditions.push("(l.type != 'PRODUCT' OR l.isLive = true)");
            }
            
            const totalCountQuery = `
                SELECT VALUE COUNT(1) FROM l
                ${whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : ""}
            `;
            const totalCountResult = await dataSources.cosmos.run_query("Main-Listing", {
                query: totalCountQuery,
                parameters
            }, true);
            const totalCount = totalCountResult[0];

            const query = `
                SELECT * FROM l
                ${whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : ""}
                ORDER BY l.displayScore DESC
                OFFSET @offset LIMIT @limit
            `;
            const listings = await dataSources.cosmos.run_query("Main-Listing", {
                query,
                parameters
            });

            return {
                listings,
                hasMore: args.offset + listings.length < totalCount,
                hasPrevious: args.offset > 0,
                totalCount: totalCount
            };
        },
        searchMerchantListings: async (_: any, args: any, { dataSources }: serverContext) => {
            // Search across all listing types for a specific merchant
            const parameters = [
                { name: "@merchantId", value: args.merchantId },
                { name: "@search", value: args.search.toLowerCase() }
            ];

            const query = `
                SELECT
                    l.id,
                    l.name as title,
                    l.type,
                    l.category,
                    l.status,
                    l.thumbnail
                FROM l
                WHERE l.vendorId = @merchantId
                AND CONTAINS(LOWER(l.name), @search)
                AND (l.type = 'TOUR' OR l.type = 'PRODUCT' OR l.type = 'SERVICE')
                ORDER BY l.name ASC
            `;

            const results = await dataSources.cosmos.run_query("Main-Listing", {
                query,
                parameters
            }, true);

            return results;
        },
        listing: async (_: any, args: any, { dataSources } : serverContext) => {
            const listing = await dataSources.cosmos.get_record("Main-Listing", args.id, args.vendorId)
            return listing
        },
        tour: async (_: any, args: any, { dataSources }: serverContext, ___: any) => {
            const tour = await dataSources.cosmos.get_record("Main-Listing", args.id, args.vendorId)
            return tour
        },
        livestream: async (_: any, args: any, { dataSources }: serverContext, ___: any) => {
            const livestream = await dataSources.cosmos.get_record("Main-Listing", args.id, args.vendorId)
            return livestream
        },
        prerecord: async (_: any, args: any, { dataSources }: serverContext, ___: any) => {
            const prerecord = await dataSources.cosmos.get_record("Main-Listing", args.id, args.vendorId)
            return prerecord
        },
        listingSchedule: async (_: any, args: any,  context : serverContext) => {
            return await context.dataSources.cosmos.get_record("Main-Listing", args.id, args.vendorId)
        },
        listingSchedules: async (_: any, args: any, context : serverContext) => {
            var parameters = [{ name: "@vendorId", value: args.vendorId}]
            var whereConditions = ["l.vendorId = @vendorId", "l.docType = 'schedule'"]
            
            if (args.date != null) {
               var dt = DateTime.fromJSDate(args.date)
               whereConditions.push(`ARRAY_CONTAINS(l.months, @month) AND ARRAY_CONTAINS(l.days, @day)`)
               parameters.push({ name: "@month", value: dt.month})
               parameters.push({ name: "@day", value: dt.day})
            }

            if (args.listingId != null) {
                whereConditions.push("l.listingId = @listingId")
                parameters.push({ name: "@listingId", value: args.listingId})
            }

            const query = `SELECT * FROM l WHERE ${whereConditions.join(" AND ")}`
            const data =  await context.dataSources.cosmos.run_query("Main-Listing", {
                query: query,
                parameters
            })
            return data
        },
        activityLists: async (_: any, args: any, context : serverContext) => {
            var parameters = [{ name: "@vendorId", value: args.vendorId}]
            var whereConditions = ["l.vendorId = @vendorId", "l.docType = 'schedule'"]
            
            if (args.listingId != null) {
                whereConditions.push("l.listingId = @listingId")
                parameters.push({ name: "@listingId", value: args.listingId})
            }

            if (args.scheduleIds != null) {
                whereConditions.push("ARRAY_CONTAINS(@scheduleIds , l.id)")
                parameters.push({ name: "@scheduleIds", value: args.scheduleIds})
            }

            const query = `SELECT l.activityListId, l.listingId, l.status FROM l WHERE ${whereConditions.join(" AND ")}`
            const schedules : {listingId: string, activityListId: string}[] =  await context.dataSources.cosmos.run_query("Main-Listing", {
                query: query,
                parameters
            })
            
            const alQuery = `SELECT al.name, al.ticketListId, al.activities, al.id, al.createdDate, al.createdBy, l.status, l.id as listingId, l.vendorId FROM l JOIN al in l.activityLists WHERE ARRAY_CONTAINS(@listingIds, l.id) AND ARRAY_CONTAINS(@activityListIds, al.id)`
            const activities = await context.dataSources.cosmos.run_query("Main-Listing", {
                query: alQuery,
                parameters: [
                    { name: "@listingIds", value: schedules.map(x => x.listingId) },
                    { name: "@activityListIds", value: schedules.map(x => x.activityListId) }
                ]
            })
            
            return activities
        },
        listingGrouping: async (_: any, args: any,  context : serverContext) => {
            return await context.dataSources.cosmos.get_record("Main-Listing", args.id, args.vendorId)
        },
        listingGroupings: async (_: any, args: any, context : serverContext) => {

            var parameters = [{ name: "@vendorId", value: args.vendorId}]
            var whereConditions = ["l.vendorId = @vendorId", "l.docType = 'grouping'"]

            if (args.types != null) {
                whereConditions.push(`ARRAY_CONTAINS(@types, l.type)`)
                parameters.push({ name: "@types", value: args.types})
            }

            const query = `SELECT * FROM l WHERE ${whereConditions.join(" AND ")}`
            const data =  await context.dataSources.cosmos.run_query("Main-Listing", {
                query: query,
                parameters
            })
            return data
        }
    },
    Mutation: {
        score_catalogue: async (_: any, args: any, { dataSources }: serverContext) => {
            const updateRandomField = async () => {
                const listings = await dataSources.cosmos.get_all<listing_type>("Main-Listing");
                for (const listing of listings) {
                    listing.displayScore = Math.random(); // Replace with recommendation score later
                    await dataSources.cosmos.patch_record("Main-Listing", listing.id, listing.vendorId, [
                        { op: "set", path: "/displayScore", value: listing.displayScore }
                    ], "SYSTEM")
                }
            };
            await updateRandomField()

            return {
                code: "200",
                success: true,
                message: "Catalogue scored successfully"
            }
        },
        schedule_listing: async (_: any, args: any, context: serverContext) : Promise<MutationResponse> => {
            if (context.userId == null) throw "User must be present for this call";

            var record = args.schedule
            record.vendorId = args.vendorId
            record.listingId = args.listingId
            record.id = uuidv4();
            record.sessionTitle = record.name;
            record.docType = 'schedule';
            
            // if we have dates, then we work out the months from dates provided rather than the recurrance rule
            var dates : Date[] = record.dates;
            if (dates == null) {
                if (record.recurrenceRule != null) {
                    // indexing time
                    var rule = rrulestr(record.recurrenceRule)
                    // take a sample period of the next 5 years to work out applicable months & days to help with filtering on cosmos for events
                    var sampleStartDate = DateTime.now().minus({ days: 15}).toJSDate()
                    var sampleEndDate = DateTime.now().plus({ years: 5}).toJSDate()
                    dates = rule.between(sampleStartDate, sampleEndDate, true)
                } else {
                    throw "Either dates or recurrenceRule must be provided"
                }
            }

            record.months = Array.from(new Set(dates.map((dt) => DateTime.fromJSDate(dt).month)))
            record.days = Array.from(new Set(dates.map((dt) => dt.getDate())))

            record.lastIndexed = DateTime.now().toISO();

            if (record.dates != null) {
                record.dates = record.dates.map((dt: Date) => DateTime.fromJSDate(dt).toISODate());
            }

            await context.dataSources.cosmos.add_record("Main-Listing", record, args.vendorId, context.userId)

            return {
                code: "200",
                success: true,
                message: `Schedule ${args.id} successfully scheduled`
            }
        },
        discontinue_listing: async (_: any, args: any, { dataSources }: serverContext, ___: any) : Promise<MutationResponse> => {
            await dataSources.cosmos.update_status("Main-Listing", args.id, args.vendorId, RecordStatus.INACTIVE, "SYSTEM")
            return {
                code: "200",
                success: true,
                message: `Listing ${args.id} successfully discontinued`
            }
        },
        delete_listing: async (_: any, args: any, { dataSources }: serverContext, ___: any) : Promise<MutationResponse> => {
            await dataSources.cosmos.update_status("Main-Listing", args.id, args.vendorId, RecordStatus.DELETED, "SYSTEM")
            return {
                code: "200",
                success: true,
                message: `Listing ${args.id} successfully discontinued`
            }
        },
        update_schedule: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            args.schedule.fromTime = DateTime.fromJSDate(args.schedule.fromTime).toISOTime();
            args.schedule.toTime = DateTime.fromJSDate(args.schedule.toTime).toISOTime();
            await context.dataSources.cosmos.update_record("Main-Listing", args.id, args.vendorId, args.schedule, context.userId)
            return {
                code: "200",
                success: true,
                message: `Schedule ${args.schedule.id} successfully updated`,
                schedule: await context.dataSources.cosmos.get_record("Main-Listing", args.id, args.vendorId)
            }
        },
        delete_schedule: async (_: any, args: { id: string, vendorId: string}, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            await context.dataSources.cosmos.delete_record("Main-Listing", args.id, args.vendorId, context.userId)

            return {
                code: "200",
                success: true,
                message: `Schedule ${args.id} successfully deleted`
            }
        },
        create_activitylist: async (_: any, args: any, context: serverContext) => {
            const activityList = args.activityList;
            activityList.id = uuidv4();
            activityList.createdDate = DateTime.now().toISO()
            activityList.createdBy = context.userId

            for (var activity of activityList.activities) {
                activity.id = uuidv4();
                activity.createdDate = DateTime.now().toISO()
                activity.createdBy = context.userId
            }

            var container = await context.dataSources.cosmos.get_container("Main-Listing")
            const operations : PatchOperation[] = [{ op: "add", path: `/activityLists/-`, value: activityList}]
            await container.item(args.listingId, args.vendorId).patch(operations)
          
            return {
              code: "200",
              message: "Activity List created successfully",
              impactedRecordRef: {
                id: activityList.id,
                partition: [args.vendorId]
              },
              tour: await context.dataSources.cosmos.get_record("Main-Listing", args.listingId, args.vendorId)
            }
        },
        update_activitylist: async (_: any, args: any, context: serverContext) => {
            const activityList = args.activityList;
            activityList.activities = activityList.activities.map((activity : any) => (
                {
                    ...activity,
                    modifiedDate : DateTime.now().toISO(),
                    modifiedBy : context.userId   
                }
            ))

            const tour = await context.dataSources.cosmos.get_record<{activityLists: activityList_type[]}>("Main-Listing", args.listingId, args.vendorId)
            const activityListIdx = tour.activityLists.findIndex(x => x.id == args.id)

            const activityListFromDB = tour.activityLists[activityListIdx]
            const finalActivityList = mergeDeep(activityListFromDB, activityList)
            
            var container = await context.dataSources.cosmos.get_container("Main-Listing")
            const operations : PatchOperation[] = [{ op: "replace", path: `/activityLists/${activityListIdx}`, value: finalActivityList}]
            await container.item(args.listingId, args.vendorId).patch(operations)

            return {
                code: "200",
                message: "Activity List updated successfully",
                impactedRecordRef: {
                    id: activityList.id,
                    partition: [args.vendorId]
                },
                tour: await context.dataSources.cosmos.get_record("Main-Listing", args.id, args.vendorId)
            }
        },
        upsert_listingGrouping: async (_: any, args: any, { dataSources: {cosmos}, userId}: serverContext ) => {
            if (userId == null) throw "User must be present for this call";

            var item = args.listingGrouping;
            item["id"] = item.id ?? uuidv4();
            item["vendorId"] = args.vendorId
            item["docType"] = 'grouping';

            // if the record already exists we update it
            if (await cosmos.record_exists("Main-Listing", item.id, item.vendorId)) {
                await cosmos.update_record("Main-Listing", item.id, item.vendorId, item, userId)
                return {
                    code: "200",
                    message: "Listing Grouping updated successfully",
                    listingGrouping: await cosmos.get_record("Main-Listing", item.id, item.vendorId)
                }
            } else {
                await cosmos.add_record("Main-Listing", item, item.vendorId, userId)
                return {
                    code: "200",
                    message: "Listing Grouping created successfully",
                    listingGrouping: await cosmos.get_record("Main-Listing", item.id, item.vendorId)
                }
            }
        },
        create_prerecord: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            var item = args.prerecord;
            item["vendorId"] = args.vendorId;
            item["isLive"] = false;

            item["type"] = item["type"] == "AUDIO" ? ListingTypes.PODCAST : ListingTypes.VIDEO

            item["datetime"] = DateTime.fromJSDate(item["datetime"]).toISO()
            item["thumbnail"]["url"] = item["thumbnail"]["url"].toString() 
            item["media_content"]["url"] = item["media_content"]["url"].toString()

            var createPreRecordAsProductStripe = await context.dataSources.stripe.callApi(HTTPMethod.post, "products", {
                "name": item.name,
                "metadata[vendorId]": args.vendorId,
                "metadata[listingId]": item.id,
                "metadata[listingType]": item.type,
                "metadata[isLive]": false,
            })
            if (createPreRecordAsProductStripe.status != 200) {
                throw new GraphQLError(`Error creating Prerecord as product in Stripe.`, {
                    extensions: { code: 'BAD_REQUEST'},
                  });
                }
            item.stripeId = createPreRecordAsProductStripe.data.id

            var createFullPriceAsPriceStripe = await context.dataSources.stripe.callApi(HTTPMethod.post, "prices", {
                "unit_amount": item.fullPrice * 100,
                "currency": item.currency,
                "nickname": "FullPrice",
                "product": createPreRecordAsProductStripe.data.id
            })
            if (createFullPriceAsPriceStripe.status != 200) {
                throw new GraphQLError(`Error creating Prerecord as product in Stripe.`, {
                    extensions: { code: 'BAD_REQUEST'},
                    });
            }
            item.fullPriceId = createFullPriceAsPriceStripe.data.id

            var createRentPriceAsPriceStripe = await context.dataSources.stripe.callApi(HTTPMethod.post, "prices", {
                "unit_amount": item.rentPrice * 100,
                "currency": item.currency,
                "nickname": "RentPrice",
                "product": createPreRecordAsProductStripe.data.id
            })
            if (createRentPriceAsPriceStripe.status != 200) {
                throw new GraphQLError(`Error creating Prerecord as product in Stripe.`, {
                    extensions: { code: 'BAD_REQUEST'},
                    });
            }
            item.rentPriceId = createRentPriceAsPriceStripe.data.id

            const fromDB = await context.dataSources.cosmos.add_record("Main-Listing", item, item["vendorId"], context.userId)

            return {
                code: 200,
                message: "Prerecord setup correctly.",
                livestream: fromDB
            }
        }
    },
    Listing: {
        thumbnail: async(parent: any, _: any, context: serverContext) => {
            if (isNullOrUndefined(parent.thumbnail)) {
                if (!isNullOrUndefined(parent.variants)) {
                    // take the first one with the condition isDefault = true
                    const variant = parent.variants.find((v: any) => v.isDefault)
                    return variant.thumbnail
                }
            }
            return parent.thumbnail
        },
        vendor: async(parent: any, _: any, context: serverContext) => {
            return await context.dataSources.cosmos.get_record("Main-Vendor", parent.vendorId, parent.vendorId)
        },
        skus: async(parent: any, _: any, __: serverContext) => {
            if (parent.type == "TOUR") {
              const tour = parent as tour_type
              const skus =
                tour.ticketVariants.map((variant) => ({
                    id: variant.id,
                    qty: variant.peopleCount.toString(),
                    price: variant.price
                }))
              return skus;
            } else if (parent.type == "PRODUCT") {
                const product = parent as product_type
                const skus =
                    product.variants.flatMap((variant) => ({
                        id: variant.id,
                        qty: 1,
                        price: variant.defaultPrice
                    }))
                return skus;
            } else if (parent.type == "SERVICE") {
                const skus : any[] = []
                return skus;
            } else {
                return (parent as listing_type).skus;
            }
        },
        conversationMessages: async(parent: listing_type, args: {limit? : number}, context: serverContext) => {
            const query = `SELECT ${args.limit != null ? `TOP ${args.limit}` : ""} * FROM l WHERE l.forObject.id = @listingId AND l.forObject.partition = @vendorId AND l.type = 'CONVERSATION' ORDER BY l.createdDate`
            const parameters = [
                { name: "@listingId", value: parent.id },
                { name: "@vendorId", value: parent.vendorId}
            ]
            const resp = await context.dataSources.cosmos.run_query("Main-Comments", {query, parameters})
            return resp.map((messsage) => ({
                base: messsage,
                ...messsage
            }));
        },
        questions: async(_: any, args: any, context: serverContext) => {
            const questions = await context.dataSources.cosmos.run_query("Main-ListingQuestionResponses", {
                query: `SELECT * FROM lqr WHERE lqr.listingId=@listingId and lqr.posted_by_userId=@userId ORDER BY lqr.dateCreatedUnix asc`,
                parameters: [{
                    name: "@listingId",
                    value: args.listingId
                }, {
                    name: "@userId",
                    value: context.userId
                }]
            })
            return questions
        },
        pricing_descriptor : async(parent: any) => {
              if (parent.type == ListingTypes.TOUR) {
                // aim: From $12.00
                return "TBA";
            } else if (parent.type == ListingTypes.PRODUCT) {
                // aim $8.00
                return "TBA";
              } else if (parent.type == ListingTypes.VIDEO) {
                // aim $8.00
                return "TBA";
              } else if (parent.type == ListingTypes.PODCAST) {
                // aim $6.00
                return "TBA";
              } else {
                return "NA";
              }
        },
        other_listings : async(parent: any, _args: any, context: serverContext, _info: any) => {
            let other_listings: unknown[] = []
            // grab the related lists first
            if (parent.related_listing_refs != undefined) {
                const related_listing_refs = parent.related_listing_refs
                for (var rlref of related_listing_refs) {
                    other_listings.push({
                    listing: await context.dataSources.cosmos.get_record("Main-Listing", rlref.id, rlref.partition),
                    isRelated: true,
                    source: 'vendor'
                    })
                }
            }
            // now grab the vendors listings that are the same type as this one
            const query = `SELECT * FROM l WHERE l.vendorId = @vendorId AND l.type = @type and l.id <> @listingId`
            const vendor_listings = (await context.dataSources.cosmos.run_query("Main-Listing", {
                query: query,
                parameters: [
                    { name: "@vendorId", value: parent.vendorId},
                    { name: "@type", value: parent.type },
                    { name: "@listingId", value: parent.id}
                ]
            })).map((listing: any) => {
                return {
                    listing,
                    isRelated: false,
                    source: 'vendor'
                }
            })
            other_listings = other_listings.concat(vendor_listings.filter((x: { listing: { id: any } }) => !other_listings.some((y: any) => y.listing.id == x.listing.id)))
            // now return
            return other_listings
        },
        ref: async(parent: any, _: any, _context: serverContext) => {
            return {
                id: parent.id, partition: [parent.vendorId], container: "Main-Listing"
            }
        }
    },
    PreRecord : {
        rentPrice: async (parent: any, _args: any, context: serverContext, _info: any) => await context.dataSources.stripe.retrievePrice(parent.rentPriceId),
        fullPrice: async (parent: any, _args: any, context: serverContext, _info: any) => await context.dataSources.stripe.retrievePrice(parent.fullPriceId),
        ref: async(parent: any, _: any, _context: serverContext) => {
            return {
                id: parent.id, partition: [parent.vendorId], container: "Main-Listing"
            }
        }
    },
    ListingSchedule : {
        tour: async(parent: any, _args:any, context: serverContext, _info: any) => {
            return await context.dataSources.cosmos.get_record("Main-Listing", parent.listingId, parent.vendorId)
        },
        activityList: async(parent: any, _args:any, context: serverContext, _info:any) => {
            const tour = await context.dataSources.cosmos.get_record<any>("Main-Listing", parent.listingId, parent.vendorId)
            var activityList = tour.activityLists.filter((x: any) => x.id == parent.activityListId)[0]
            activityList.listingId = parent.listingId;
            activityList.vendorId = parent.vendorId;
            return activityList;
        },
        ref: async(parent: any, _: any, _context: serverContext) => {
            return {
                id: parent.id, partition: [parent.vendorId], container: "Main-Listing"
            }
        }
    },
    ListingGrouping: {
        category_price_rank: async(_parent: any, _args: any, _context: serverContext) => {
            // const listings = parent.listings as string[]
            // const listings.map(async (listingId) => {
            //     var listing = await context.dataSources.cosmos.get_record<Listing>("Main-Listing", listingId, parent.vendorId)
            //     if (listing.type == ListingTypes.VIDEO) {
            //         const video = listing as any as prerecord_type
            //         const priceId = video.fullPriceId
            //         // TODO: get price from stripe
            //         const priceAmount = 0
            //         return priceAmount
            //     } else {
            //         return 0
            //     }
            // })
            // const price_rank = await context.dataSources.cosmos.run_query("Main-Listing", {
            //     query: `SELECT * FROM lqr WHERE lqr.vendorId=@vendorId ORDER BY lqr.overall_price DESC, lqr.dateCreatedUnix asc`,
            //     parameters: [{
            //         name: "@vendorId",
            //         value: parent.vendorId
            //     }]
            // })
            // return price_rank.findIndex(x => x.id == parent.id) + 1
            return 1
        },
        ref: async(parent: any, _: any, _context: serverContext) => {
            return {
                id: parent.id, partition: [parent.vendorId], container: "Main-Listing"
            }
        }
    }
}

export { resolvers }
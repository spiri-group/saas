import { v4 as uuidv4 } from 'uuid';
import { CommentTypes, recordref_type } from '../0_shared/types';
import { serverContext } from '../../services/azFunction';
import { flatten } from '../../utils/functions';
import { listing_type } from '../listing/types';
import { PatchOperationType } from '@azure/cosmos';

const primaryContainer = "Main-Comments"

const resolvers = {
    Query: {
        comment: async(_:any, args: { ref: recordref_type }, {dataSources}: serverContext, __:any ) => {
            let comment = await dataSources.cosmos.get_record(primaryContainer, args.ref.id, args.ref.partition)
            return comment;
        },
        comments: async(_:any, args: any, {dataSources}: serverContext, __:any ) => {
            const query = ` SELECT * FROM c
                    WHERE c.forObject.id = @forObjectId
                    AND c.forObject.partition = @partition
                    AND NOT IS_DEFINED(c.replyTo)
            `
            const parameters = [
                { name: "@forObjectId", value: args.forObject.id },
                { name: "@partition", value: args.forObject.partition[0] }
            ]

            let comments = await dataSources.cosmos.run_query(primaryContainer, { query, parameters }, true)
            return comments

        },
        replies: async(_:any, args: any, {dataSources}: serverContext, __:any ) => {
            const query = ` SELECT * FROM c
                    WHERE c.replyTo.id = @replyToId
                    AND c.replyTo.partition = @partition
            `
            const parameters = [
                { name: "@replyToId", value: args.replyTo.id },
                { name: "@partition", value: flatten(args.replyTo.partition) }
            ]

            let comments = await dataSources.cosmos.run_query(primaryContainer, { query, parameters }, true)
            return comments
        },
        review: async(_:any, args: { ref: recordref_type }, {dataSources}: serverContext, __:any ) => {
            let review = await dataSources.cosmos.get_record(primaryContainer, args.ref.id, args.ref.partition)
            return review;
        }
    },
    Mutation: {
        create_comment: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";
            var item : any = { text: args.text }
            
            item["id"] = uuidv4()
            item["forObject"] = args.forObject
            item["posted_by_userId"] = context.userId
            item["type"] = CommentTypes.COMMENT
            item["docType"] = "comment"
            item["liked_by"] = [];
            item["disliked_by"] = [];
            item["forObject"]["partition"] = flatten(item["forObject"]["partition"])

            const partition = [item.forObject.partition, item.forObject.id]

            await context.dataSources.cosmos.add_record("Main-Comments", item, partition, context.userId)
            return {
                code: "200",
                message: "Comment succesfully added",
                comment: await context.dataSources.cosmos.get_record("Main-Comments", item.id, partition)
            }
        },
        reply_to_comment: async (_:any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";
            var item : any = { text: args.text }

            item["id"] =  uuidv4()
            item["posted_by_userId"] = context.userId
            item["type"] = CommentTypes.COMMENT
            item["docType"] = "comment"
            item["liked_by"] = [];
            item["disliked_by"] = [];
            item["replyTo"] = args.replyTo
            
            // we want to find the original for object to store it in the same partition in the database
            const replyingTo = await context.dataSources.cosmos.get_record<any>("Main-Comments", item.replyTo.id, item.replyTo.partition)
            item["forObject"] = {
                container: replyingTo.forObject.container,
                id: replyingTo.forObject.id,
                partition: replyingTo.forObject.partition
            }
            const partition = [item.forObject.partition, item.forObject.id]

            // now we can flatten it
            item["replyTo"]["partition"] = flatten(item["replyTo"]["partition"])

            await context.dataSources.cosmos.add_record("Main-Comments", item, partition, context.userId)

            return {
                code: "200",
                message: "Message added to your conversation",
                comment: await context.dataSources.cosmos.get_record("Main-Comments", item["id"], partition)
            }
        },
        update_comment: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            const { id, listingRef, comment } = args;
            const partition  = [listingRef.partition[0], listingRef.id]
            await context.dataSources.cosmos.update_record("Main-Comments", id, partition, comment, context.userId);
          
            return {
              code: "200",
              message: `Reply ${id} successfully updated`,
              comment: await context.dataSources.cosmos.get_record("Main-Comments", id, partition),
            }
        },
        create_review: async (_: any, args: any, context: serverContext ) => {
            if (context.userId == null) throw "User must be present for this call";
            var item : any = args.review
            
            item["id"] = uuidv4()
            item["forObject"] = {
                id: args.objectId,
                partition: args.objectPartition,
                container: "Main-Listing"
            }
            item["posted_by_userId"] = context.userId
            item["type"] = CommentTypes.REVIEWS_AND_RATING
            item["docType"] = "comment"
            item["liked_by"] = [];
            item["disliked_by"] = [];
            item["isReported"] = false;

            const partition = [args.objectPartition, args.objectId]

            await context.dataSources.cosmos.add_record("Main-Comments", item, partition, context.userId)

            // we need to update the listing's overall rating
            // we also need to update the rating stats i.e. how many people have rated it for each rating
            
            // update the listings overall rating
            var averageRatingQuery = {
                query: `
                    SELECT avg(c.rating) as rating
                    FROM c 
                    Where c.forObject = @object
                        and c.type = 'REVIEWS_AND_RATING'`,
                parameters: [
                    { "name": "@object", value: item["forObject"]}
                ]
            }
            var numPeopleQuery = {
                query: `
                    SELECT COUNT(c.id) as numReviews
                    FROM c
                    WHERE c.forObject = @object
                    AND c.type = 'REVIEWS_AND_RATING'
                `,
                parameters: [
                    { "name": "@object", value: item["forObject"]}
                ]
            } 
            var rating_results = await context.dataSources.cosmos.run_query<{rating: number}>("Main-Comments", averageRatingQuery, true)
            var numPeople_results = (await context.dataSources.cosmos.run_query<{numReviews: number}>("Main-Comments", numPeopleQuery, true))

            const currentRatingStats = await context.dataSources.cosmos.run_query<any>("Main-Listing", {
                query: `
                    SELECT VALUE c.rating FROM c WHERE c.id = @id AND c.vendorId = @partition
                `, parameters: [
                    { name: "@id", value: item.forObject.id },
                    { name: "@partition", value: item.forObject.partition }
                ]
            }, true)

            let ratingStats = currentRatingStats[0] ?? { 
                "rating1": 0, 
                "rating2": 0, 
                "rating3": 0, 
                "rating4": 0, 
                "rating5": 0 
            }
            ratingStats[`rating${item.rating}`] += 1
            ratingStats["total_count"] = numPeople_results[0].numReviews
            ratingStats["average"] = (Math.ceil(rating_results[0].rating * 2) / 2).toFixed(2)

            const container = await context.dataSources.cosmos.get_container("Main-Listing")
            await container.item(args.objectId, args.objectPartition).patch([{
                "op": PatchOperationType.set,
                "path": "/rating",
                "value": ratingStats
            }])

            const review = await context.dataSources.cosmos.get_record<any>("Main-Comments", item.id, partition)

            return {
                code: "200",
                message: "Review added successfully",
                review: {
                    ...review,
                    base: review
                }
            }
        }
    },
    Listing: {
        reviews: async(parent: listing_type, args: { limit? : number }, context: serverContext) => {
            const query = `SELECT ${args.limit != null ? `TOP ${args.limit}` : ""} * FROM l WHERE l.forObject.id = @listingId AND l.forObject.partition = @vendorId AND l.type = 'REVIEWS_AND_RATING' ORDER BY l.createdDate`
            const parameters = [
                { name: "@listingId", value: parent.id },
                { name: "@vendorId", value: parent.vendorId}
            ]
            const resp = await context.dataSources.cosmos.run_query("Main-Comments", { query, parameters}, true)
            return resp.map((review) => ({
                ...review,
                base: review
            }));
        }
    },
    Comment: {
        posted_by: async(parent: any, _:any, context: serverContext) => {
            if (await context.dataSources.cosmos.record_exists("Main-User", parent.posted_by_userId, parent.posted_by_userId)) {
                let user = await context.dataSources.cosmos.get_record<any>("Main-User", parent.posted_by_userId, parent.posted_by_userId)
                user.name = `${user.firstname} ${user.lastname}`;
                user.isOwner = false;
                if (parent.type !== CommentTypes.REVIEWS_AND_RATING) {
                    // need to check if the user is a team member of the merchant who posted the for object if its a listing
                    if (parent.forObject.container == "Main-Listing") {
                        const findUserToVendor = user.vendors.find((v: {id: string}) => v.id == parent.forObject.partition)
                        if (findUserToVendor != null) {
                            user.isOwner = true
                            const vendor = await context.dataSources.cosmos.get_record<any>("Main-Vendor", findUserToVendor.id, findUserToVendor.id)
                            user.name = vendor.name
                        }
                    }
                }
                return user;
            } else {
                return null
            }
        },
        isReported: async(parent:any, _:any, context: serverContext) => {
            let parameters: any[] = [{ name: "@forObject", value: {
                id: parent.id,
                partition: [parent.forObject.partition, parent.forObject.id].join("|"),
                container: "Main-Comments"
            }}]
            let whereConditions = [
                "c.forObject = @forObject",
                "c.docType = \"report\""
            ]

            if (parent.posted_by_userId != context.userId) {
                // i didn't write the comment, have to check if i've reported it or not
                parameters.push({ name: "@userId", value: context.userId})
                whereConditions.push("c.posted_by_userId = @userId")
            }

            let query = {
                query: `SELECT * FROM c WHERE ${whereConditions.join(" AND ")}`,
                parameters
            }

            let results = await context.dataSources.cosmos.run_query(primaryContainer, query)

            return results.length > 0
        },
        replyCount: async(parent: any, _:any, context: serverContext) => {
            let query = {
                query: `SELECT * FROM c WHERE c.replyTo.id = @replyToId AND c.replyTo.partition = @partition`,
                parameters: [
                    { name: "@replyToId", value: parent.id },
                    { name: "@partition", value: flatten([parent.forObject.partition, parent.forObject.id]) }
                ]
            }
            let results = await context.dataSources.cosmos.run_query("Main-Comments", query)
            return results.length
        },
        ref: async(parent: any, _: any, _context: serverContext) => {
            return {
                id: parent.id, partition: [parent.forObject.partition, parent.forObject.id], container: "Main-Comments"
            }
        }
    },
    ConversationMessage: { 
    }
}

export {resolvers}
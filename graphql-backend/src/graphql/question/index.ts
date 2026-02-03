import { v4 as uuidv4 } from 'uuid';
import { DateTime } from "luxon";
import { serverContext } from '../../services/azFunction';

const resolvers = {
    Query: {
    },
    Mutation: {
        create_question: async (_: any, args: any, context: serverContext ) => {
            if (context.userId == null) throw "User must be present for this call";
            
            var item = args.question;
            item["id"] = uuidv4()
            item["posted_by_userId"] = context.userId
            item["dateCreatedUnix"] = DateTime.now().toUnixInteger()
            item["listingId"] = args.listingId

            
            return {
                code: "200",
                message: "Question created successfully",
                question: await context.dataSources.cosmos.add_record("Main-ListingQuestionResponses", item, item["listingId"], context.userId)
            }
        },
        update_question: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            await context.dataSources.cosmos.update_record("Main-ListingQuestionResponses", args.id, args.listingId, args.question, context.userId)

            return {
                code: "200",
                success: true,
                message: `Question ${args.question.id} successfully updated`,
                question: await context.dataSources.cosmos.get_record("Main-ListingQuestionResponses", args.id, args.listingId)
            }
        },
        delete_question: async (_: any, args: { id: string, listingId: string}, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            await context.dataSources.cosmos.delete_record("Main-ListingQuestionResponses", args.id, args.listingId, context.userId)

            return {
                code: "200",
                success: true,
                message: `Question ${args.id} successfully deleted`
            }
        }
    },
    Question: {
        posted_by: async(parent: any, _args: any, context: serverContext) => {
            if (await context.dataSources.cosmos.record_exists("Main-User", parent.posted_by_userId, parent.posted_by_userId)) {
                return await context.dataSources.cosmos.get_record("Main-User", parent.posted_by_userId, parent.posted_by_userId)
            } else {
                return null
            }
        },
        position: async(parent: any, _args: any, context: serverContext) => {
            const questions = await context.dataSources.cosmos.run_query("Main-ListingQuestionResponses", {
                query: `SELECT * FROM lqr WHERE lqr.listingId=@listingId ORDER BY lqr.price DESC, lqr.dateCreatedUnix asc`,
                parameters: [{
                    name: "@listingId",
                    value: parent.listingId
                }]
            })
            return questions.findIndex(x => x.id == parent.id) + 1
        },
        priceForTopFive: async(parent: any, _args: any, context: serverContext) => {
            const questions = await context.dataSources.cosmos.run_query("Main-ListingQuestionResponses", {
                query: `SELECT TOP 5 * FROM lqr WHERE lqr.listingId=@listingId ORDER BY lqr.price DESC, lqr.dateCreatedUnix asc`,
                parameters: [{
                    name: "@listingId",
                    value: parent.listingId
                }]
            }) 
            if (parent.price >= questions[2].price) {
                return null;
            } else {
                return Math.ceil((questions[2].price) * 1.10)
            }
        }
    }
}

export {resolvers}


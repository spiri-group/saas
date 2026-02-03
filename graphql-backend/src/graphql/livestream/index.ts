import { HTTPMethod } from "@azure/cosmos"
import { GraphQLError } from "graphql"
import { serverContext } from "../../services/azFunction"
import { ListingTypes } from "../listing/types"

const resolvers = {
    Query: {
        livestreams: async (_: any, __:any, { dataSources }: serverContext) => {
            return await dataSources.cosmos.get_all("Main-LiveStream")
        },
        livestream: async (_: any, args: any, { dataSources }: serverContext) => {
            return await dataSources.cosmos.get_record("Main-LiveStream", args.id, args.id)
        }
    }, 
    Mutation: {
        create_livestream: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            var item = args.livestream;
            item["type"] = item["type"] == "AUDIO" ? ListingTypes.PODCAST : ListingTypes.VIDEO
            item["isLive"] = true;
            item["vendorId"] = args.vendorId;

            var createLiveStreamQuestionAsProductStripe = await context.dataSources.stripe.callApi(HTTPMethod.post, "products", {
                "name": `${item.title} Questions`,
                "metadata[vendorId]": args.vendorId,
                "metadata[listingId]": item.id,
                "metadata[listingType]": item.type,
                "metadata[isLive]": true,
            })
            if (createLiveStreamQuestionAsProductStripe.status != 200) {
                throw new GraphQLError(`Error creating livestream as product in Stripe.`, {
                    extensions: { code: 'BAD_REQUEST'},
                  });
            }

            var createTicketAsPriceStripe = await context.dataSources.stripe.callApi(HTTPMethod.post, "prices", {
                "unit_amount": item.questionMode.price * 100,
                "currency": item.questionMode.currency,
                "product": createLiveStreamQuestionAsProductStripe.data.id
            })
            if (createTicketAsPriceStripe.status != 200) {
                throw new GraphQLError(`Error creating livestream as product in Stripe.`, {
                    extensions: { code: 'BAD_REQUEST'},
                    });
            }

            item.questionMode = {
                stripeId: createLiveStreamQuestionAsProductStripe.data.id,
                mode: item.questionMode.mode,
                priceId: createTicketAsPriceStripe.data.id
            }
            
            const fromDB = await context.dataSources.cosmos.add_record("Main-Listing", item, item["vendorId"], context.userId)

            return {
                code: 200,
                message: "LiveStream setup correctly.",
                livestream: fromDB
            }
        },
    },
    LiveStream: {
        ref: async(parent: any, _: any, _context: serverContext) => {
            return {
                id: parent.id, partition: [parent.vendorId], container: "Main-Listing"
            }
        }
    }
}

export { resolvers }
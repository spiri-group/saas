import { serverContext } from "../../services/azFunction";

const resolvers = {
    Query: {  
    },
    Wishlist: {
        ref: async (parent: any, _args: any, _context: serverContext, _info: any) => {
            return {
                id: parent.id, partition: [parent.id], container: "Main-Wishlist"
            }
        }
    },
    WishlistLine: {
        productRef: async (parent: any, _args: any, _context: serverContext, _info: any) => {
            return {
                id: parent.id, partition: [parent.id], container: "Main-Wishlist"
            }
        },
        listing: async (parent: any, _args: any, _context: serverContext, _info: any) => {
            if (parent.productRef.container == "Main-Listing") {
                return await _context.dataSources.cosmos.get_record("Main-Listing", parent.productRef.id, parent.productRef.partition);
            } else {
                return null;
            }
        }
    }
}

export {resolvers}
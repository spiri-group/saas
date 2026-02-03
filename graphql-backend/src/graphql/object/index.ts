import { PatchOperation } from "@azure/cosmos";
import { recordref_type } from "../0_shared/types";
import { serverContext } from "../../services/azFunction";

const resolvers = {
    Query: {
        object: async(_:any, args: {ref: recordref_type}, _context: serverContext) => args.ref
    },
    Mutation: {
        delete: async (_:any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";
            if (args.ref.container == null) throw "Container should be present on the ref"

            const id = args.id;
            const userId = context.userId;
          
            await context.dataSources.cosmos.delete_record(args.ref.container, args.ref.id, args.ref.partition, userId);
          
            return {
              code: "200",
              message: `Object ${id} marked as deleted in ${args.ref.container} successfully`
            }
        },
        add_like: async (_: any, args: { ref: recordref_type, like: boolean }, context: serverContext) => {
            if (args.ref.container == null) throw "Container should be present on the ref"

            let { liked_by, disliked_by } = await context.dataSources.cosmos.get_record<{ liked_by: string[], disliked_by: string[]}>(args.ref.container, args.ref.id, args.ref.partition)

            // Prepare the patch operations for the partial update
            const operations: PatchOperation[] = [];
            const container = await context.dataSources.cosmos.get_container(args.ref.container);

            if (liked_by == null) {
                liked_by = []
                await container.item(args.ref.id, args.ref.partition).patch([
                    { op: "set", value: liked_by, path: "/liked_by" }
                ]);
            }

            if (disliked_by == null) {
                disliked_by = []
                await container.item(args.ref.id, args.ref.partition).patch([
                    { op: "set", value: disliked_by, path: "/disliked_by" }
                ]);
            }
          
            if (args.like) {
              operations.push({
                op: "add",
                path: "/liked_by/-",
                value: context.userId
              });
              
              const dislikedByIndex = disliked_by.findIndex(x => x == context.userId)
                if (dislikedByIndex != -1) {
                    operations.push({
                        op: "remove",
                        path: `/disliked_by/${dislikedByIndex}`
                    });
                }
                } else {
                operations.push({
                    op: "add",
                    path: "/disliked_by/-",
                    value: context.userId
                });
              
              const likedByIndex = liked_by.findIndex(x => x == context.userId)
              if (likedByIndex != -1) {
                operations.push({
                    op: "remove",
                    path: `/liked_by/${likedByIndex}`
                  });
              }
            }
          
            // Perform the partial update using the patch operations
            await container.item(args.ref.id, args.ref.partition).patch(operations);
          
            // Get the updated comment document from the database
            const obj = await context.dataSources.cosmos.get_record<{ liked_by: string[], disliked_by: string[]}>(args.ref.container, args.ref.id, args.ref.partition)
          
            return {
              code: "200",
              message: "Like updated successfully",
              likeState: {
                count: obj.liked_by.length
              }
            };
        },
        review_helped: async (_: any, args: { ref: recordref_type, helped: boolean }, context: serverContext) => {
            //TODO: FIX THIS
            if (args.ref.container == null) throw "Container should be present on the ref"

            let { helped } = await context.dataSources.cosmos.get_record<{ helped: string[]}>(args.ref.container, args.ref.id, args.ref.partition)

            // Prepare the patch operations for the partial update
            const operations: PatchOperation[] = [];
            const container = await context.dataSources.cosmos.get_container(args.ref.container);

            if (helped == null) {
                helped = []
                await container.item(args.ref.id, args.ref.partition).patch([
                    { op: "set", value: helped, path: "/helped" }
                ]);
            }

            if (args.helped) {
              operations.push({
                op: "add",
                path: "/helped/-",
                value: context.userId
              })
              
              const helpedByIndex = helped.findIndex(x => x == context.userId)
              if (helpedByIndex != -1) {
                operations.push({
                    op: "remove",
                    path: `/helped/${helpedByIndex}`
                  })
              }
            }
            // Perform the partial update using the patch operations
            await container.item(args.ref.id, args.ref.partition).patch(operations);
          
            // Get the updated comment document from the database
            const obj = await context.dataSources.cosmos.get_record<{ helped: string[]}>(args.ref.container, args.ref.id, args.ref.partition)
          
            return {
              code: "200",
              message: "Review helped updated successfully",
              helpedState: {
                count: obj.helped.length
              }
            }
        }
    },
    Object: {
        liked: async(parent:any, _:any, context: serverContext) => {
            let query = {
                query: `SELECT * FROM c WHERE c.id = @objectId AND ARRAY_CONTAINS(c.liked_by, @userId)`,
                parameters: [
                    { name: "@userId", value: context.userId},
                    { name: "@objectId", value: parent.id}
                ]
            }

            let results = await context.dataSources.cosmos.run_query(parent.container, query)
            if (results.length == 1) return true;

            query = {
                query: `SELECT * FROM c WHERE c.id = @objectId AND ARRAY_CONTAINS(c.disliked_by, @userId)`,
                parameters: [
                    { name: "@userId", value: context.userId},
                    { name: "@objectId", value: parent.id}
                ]
            }
            results = await context.dataSources.cosmos.run_query(parent.container, query)
            if (results.length == 1) return false;

            return null
        },
        likeCount: async(parent:any, _:any, context: serverContext) => {
            let query = {
                query: `SELECT ARRAY_LENGTH(c.liked_by) as likeCount FROM c WHERE c.id = @objectId`,
                parameters: [
                    {name: "@objectId", value: parent.id}
                ]
            }
            let results = await context.dataSources.cosmos.run_query(parent.container, query, true)

            return results[0].likeCount
        },
        comments: async(parent: recordref_type, args: {limit?: number}, context: serverContext, _info: any) => {
            const results = await context.dataSources.cosmos.run_query("Main-Comments", {
                query: `SELECT ${args.limit != null ? `TOP ${args.limit}` : ""} * FROM c WHERE c.reply_to = @comment ORDER BY c.createdDate`,
                parameters: [{ name: "@comment", value: {
                    id: parent.id, partition: parent.partition, container:"Main-Comments"
                }}]
            }, true)
            return results
        },
        helped: async(parent:any, _:any, context: serverContext) => {
            let query = {
                query: `SELECT * FROM c WHERE c.id = @objectId AND ARRAY_CONTAINS(c.helped, @userId)`,
                parameters: [
                    { name: "@userId", value: context.userId},
                    { name: "@objectId", value: parent.id}
                ]
            }

            let results = await context.dataSources.cosmos.run_query(parent.container, query)
            if (results.length == 1) return true;

            return null
        },
        helpedCount: async(parent:any, _:any, context: serverContext) => {
            let query = {
                query: `SELECT ARRAY_LENGTH(c.helped) as helpCount FROM c WHERE c.id = @objectId`,
                parameters: [
                    {name: "@objectId", value: parent.id}
                ]
            }
            let results = await context.dataSources.cosmos.run_query(parent.container, query, true)

            return results[0].helpCount
        }
    }
}

export {resolvers}
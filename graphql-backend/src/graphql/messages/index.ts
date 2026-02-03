import { v4 as uuidv4 } from 'uuid';
import { recordref_type } from '../0_shared/types';
import { serverContext } from '../../services/azFunction';
import { flatten, isNullOrUndefined, isNullOrWhiteSpace, unflatten } from '../../utils/functions';
import { user_type } from '../user/types';
import { DateTime } from 'luxon';
import { vendor_type } from '../vendor/types';
import { DataAction } from '../../services/signalR';
import { case_type } from '../case/types';
import { merchants_users } from '../vendor';

const resolvers = {
    Query: {
        message: async(_:any, args: { ref: recordref_type }, {dataSources}: serverContext, __:any ) => {
            let message = await dataSources.cosmos.get_record("Main-Message", args.ref.id, args.ref.partition)
            return message;
        },
        messages: async(_:any, args: {forObject: recordref_type}, {dataSources}: serverContext, __:any) => {
            const flattenedPartition = flatten(args.forObject.partition);

            let messages = await dataSources.cosmos.run_query("Main-Message", {
                query: `
                    SELECT * FROM m
                    WHERE m.forObject.id = @forObjectId and m.forObject.partition = @forObjectPartition
                `,
                parameters: [{ name: "@forObjectId", value: args.forObject.id},
                             { name: "@forObjectPartition", value: flattenedPartition}]
            }, true) // Enable cross-partition query since messages are stored with partition [topicRef.partition, topicRef.id]

            return messages
        }
    },
    Mutation: {
        create_message: async (_: any, args: any, context: serverContext) => {    
            var item: any = { text: args.text, media: args.media};
            
            if (item.media) {
                item.media = await Promise.all(item.media.map(async (media) => {
                    const code = await context.dataSources.cosmos.generate_unique_code(
                        "MSG",
                        async () => {
                            const existingCodes = await context.dataSources.cosmos.run_query("Main-Message", {
                                query: `SELECT VALUE c.code FROM c`,
                                parameters: []
                            }, true);
                            return existingCodes
                        }
                    )
                    return {
                        ...media,
                        code
                    }
                }))
            }

            item["id"] = uuidv4()
            item["topicRef"] = args.forObject;
            item["topicRef"]["partition"] = flatten(item["topicRef"]["partition"])
            item["forObject"] = args.reply_to == null ? args.forObject : args.reply_to
            item["forObject"]["partition"] = flatten(item["forObject"]["partition"])
            item["deliver_to"] = args.deliver_to
            
            item["posted_by_vendorId"] = args.vendorId

            if (context.userId != null) {
                item["posted_by_userId"] = context.userId
                item["posted_by"] = {
                    id: context.userId,
                    partition: [context.userId],
                    container: "Main-User"
                }
            } else {
                item["posted_by"] = args.forObject
            }

            item["sentAt"] = DateTime.now().toISO()

            const partition = [item.topicRef.partition, item.topicRef.id]

            await context.dataSources.cosmos.add_record("Main-Message", item, partition, context.userId ?? "SYSTEM")

            // this is for the target object
            const targetObject = item["forObject"] as recordref_type
            const groupName = `chat-${targetObject.id}-${targetObject.partition}-${targetObject.container}`

            // first case id
            context.signalR.addDataMessage(
                "messages", 
                {
                    ref: {
                        id: item.id, 
                        partition: [item["topicRef"].partition, item["topicRef"].id], 
                        container: "Main-Message"
                    }
                }, 
                { 
                    action: DataAction.UPSERT,
                    group: groupName 
                })

            return {
                code: "200",
                message: "Chat added",
                chat: await context.dataSources.cosmos.get_record("Main-Message", item["id"], partition)
            }
        }
    },
    Message: {
        ref: async (parent: any, _: any, _context: serverContext) => {
            return {
                id: parent.id, 
                partition: [parent.forObject.partition, parent.forObject.id], 
                container: "Main-Message"
            } as recordref_type
        },
        reply_to: async(parent: any, _:any, context: serverContext) => {
            if (parent.reply_to == null) return null;
            if (await context.dataSources.cosmos.record_exists("Main-Message", parent.reply_to.id, parent.reply_to.partition)) {
                return await context.dataSources.cosmos.get_record("Main-Message", parent.reply_to.id, parent.reply_to.partition)
            } else {
                return null
            }
        },
        posted_by: async(parent: 
            { topicRef: recordref_type, 
              posted_by_vendorId?: string, 
              posted_by_userId?: string,
              posted_by_system?: boolean }, _:any, context: serverContext) => {
            if (parent.posted_by_system) {
                return {
                    ref: undefined,
                    name: "SpiriVerse"
                }
            } else  if (!isNullOrWhiteSpace(parent.posted_by_vendorId)) {
                if(parent.topicRef.container?.toLowerCase().includes("case")) {
                    if (!isNullOrWhiteSpace(context.userId)) {
                        const userVendors = await context.dataSources.cosmos.run_query<{ id: string }[]>("Main-User",{
                            query: `
                                SELECT VALUE c.vendors FROM c where c.id = @userId
                            `,
                            parameters: [
                                { name: "@userId", value: context.userId}
                            ]
                        }, true)

                        if (userVendors[0].some(x => x.id == parent.posted_by_vendorId)) {
                            const vendorRecord = await context.dataSources.cosmos.get_record("Main-Vendor", parent.posted_by_vendorId as string, parent.posted_by_vendorId as string);
                            return {
                                ref: {
                                    id: parent.posted_by_vendorId,
                                    partition: [parent.posted_by_vendorId],
                                    container: "Main-Vendor"
                                },
                                name: (vendorRecord as vendor_type).name
                            }
                        } else {
                            return {
                                ref: {
                                    id: parent.posted_by_vendorId,
                                    partition: [parent.posted_by_vendorId],
                                    container: "Main-Vendor"
                                },
                                name: "Merchant"
                            }
                        }

                    } else {
                        return {
                            ref: {
                                id: parent.posted_by_vendorId,
                                partition: [parent.posted_by_vendorId],
                                container: "Main-Vendor"
                            },
                            name: "Merchant"
                        }
                    }
                } else {
                    return {
                        ref: {
                            id: parent.posted_by_vendorId,
                            partition: [parent.posted_by_vendorId],
                            container: "Main-Vendor"
                        },
                        name: "Merchant"
                    }
                } 
            } else if (!isNullOrWhiteSpace(parent.posted_by_userId)) {
                if(parent.topicRef.container?.toLowerCase().includes("case")) {
                    return {
                       ref: {
                            id: parent.posted_by_userId,
                            partition: [parent.posted_by_userId],
                            container: "Main-User"
                       },
                       name: "Client"
                    }
                } else {
                    const userRecord = await context.dataSources.cosmos.get_record<user_type>("Main-User", context.userId as string, context.userId as string)
                    return {
                        ref: {
                            id: parent.posted_by_userId,
                            partition: [parent.posted_by_userId],
                            container: "Main-User"
                        },
                        name: userRecord.firstname
                    }
                }
            } else {
                // most likely posted by a guest, so handle accordingly
                if(parent.topicRef.container?.toLowerCase().includes("case")) {
                    return {
                        ref: {
                            id: parent.topicRef.id,
                            partition: unflatten(parent.topicRef.partition),
                            container: parent.topicRef.container
                        },
                        name: "Client"
                    }
                } else {
                    throw `No user / vendor found for this non case message`
                }
            }
        },
        posted_by_user: async(parent: any, _:any, context: serverContext) => {
            if (!isNullOrWhiteSpace(parent.posted_by_userId) && await context.dataSources.cosmos.record_exists("Main-User", parent.posted_by_userId, parent.posted_by_userId)) {
                const usr = await context.dataSources.cosmos.get_record<user_type>("Main-User", parent.posted_by_userId, parent.posted_by_userId)
                if (!isNullOrUndefined(parent.forObject.container) && parent.forObject.container.includes("Listing")) {
                    const listing = await context.dataSources.cosmos.get_record<{ type: string, moderate?: {userId: string, alias: string }[] }>(parent.forObject.container, parent.forObject.id, parent.forObject.partition)
                    if (listing.type == "LIVESTREAM") {
                        // are they a moderator?
                        if (listing.moderate != null && listing.moderate.filter(x => x.userId == usr.id).length > 0) {
                            return {
                                ...usr,
                                firstname: listing.moderate.filter(x => x.userId == usr.id)[0].alias
                            }
                        } else {
                            return usr
                        }
                    } else {
                        return usr
                    }
                } else {
                    return usr
                }
            } else {
                return null
            }
        },
        posted_by_vendor: async(parent: any, _:any, context: serverContext) => {
            if (parent.posted_by_vendorId == null) return null;
            if (await context.dataSources.cosmos.record_exists("Main-Vendor", parent.posted_by_vendorId, parent.posted_by_vendorId)) {
                return await context.dataSources.cosmos.get_record("Main-Vendor", parent.posted_by_vendorId, parent.posted_by_vendorId)
            } else {
                return null
            }
        }
    },
    DeliverTo: {
        user: async (parent: any, _: any, context: serverContext) => {
            if (await context.dataSources.cosmos.record_exists("Main-User", parent.userId, parent.userId)) {
                return await context.dataSources.cosmos.get_record("Main-User", parent.userId, parent.userId)
            } else {
                throw "User not found"
            }   
        }
    }
}

export {resolvers}
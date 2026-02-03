
import { v4 as uuidv4 } from 'uuid';
import { recordref_type } from '../0_shared/types';
import { serverContext } from '../../services/azFunction';
import { listing_type } from '../listing/types';
import { flatten } from '../../utils/functions';
import { PatchOperation } from '@azure/cosmos';

const primaryContainer = "Main-Comments";

const resolvers = {
    Query: {
        report: async(_:any, args: {id:string, partition: string[]}, {dataSources}: serverContext, __:any ) => {
            let report = await dataSources.cosmos.get_record(primaryContainer, args.id, args.partition)
            return report;
        },
        reports: async(_:any, args: {forObject: recordref_type}, {dataSources}: serverContext, __:any) => {

            let reports = await dataSources.cosmos.run_query(primaryContainer, {
                query: `
                    SELECT * FROM r
                    WHERE r.forObject = @forObject
                    AND r.docType = "report"
                `,
                parameters: [{ name: "@forObject", value: args.forObject}]
            })

            return reports
        },
        reportReasons: async(_:any, args: { objectType: string, defaultLocale: string }, {dataSources}: serverContext, __:any) => {
            let defaultLocale = args.defaultLocale ?? "EN"

            let reasons = await dataSources.cosmos.run_query("System-Settings", {
                query: `
                    SELECT VALUE o FROM c
                    JOIN o in c.options
                    WHERE c.id = "reportReasons${args.objectType}"
                `
            })

            return reasons.map((reason) => {
                return {
                    id: reason.id,
                    defaultLabel: reason.localizations.filter((x: any) => x.locale == defaultLocale)[0].value,
                    otherLocales: reason.localizations.filter((x: any) => x.locale != defaultLocale),
                    status: reason.status
                }
            })
        }
    },
    Mutation: {
        create_report: async (_: any, args: { report: any, forObject: recordref_type, container: string}, context: serverContext ) => {
            if (context.userId == null) throw "User must be present for this call";
            var item : any = args.report

            item ["id"] = uuidv4()
            item["posted_by_userId"] = context.userId
            item["forObject"] = { ...args.forObject }
            item["forObject"]["partition"] = flatten(item["forObject"]["partition"])
            item["docType"] = "report"

            const partition = [item.forObject.partition, item.forObject.id]
            await context.dataSources.cosmos.add_record(primaryContainer, item, partition, context.userId);

            const operations: PatchOperation[] = [
                { op: "set", path: '/isReported', value: true }
            ];
            const container = await context.dataSources.cosmos.get_container("Main-Comments")
            await container.item(args.forObject.id, args.forObject.partition).patch(operations)

            return {
                code: "200",
                message: "Report added",
                report: await context.dataSources.cosmos.get_record(primaryContainer, item["id"], partition)
            }
        }
    },
    Report: {
        posted_by: async(parent: any, _:any, context: serverContext) => {
            if (await context.dataSources.cosmos.record_exists("Main-User", parent.posted_by_userId, parent.posted_by_userId)) {
                return await context.dataSources.cosmos.get_record("Main-User", parent.posted_by_userId, parent.posted_by_userId)
            } else {
                return null
            }
        },
        reasons: async(parent: { reasonIds: string[]}, _args:any, context: serverContext, _info: any) => {
            let defaultLocale = "EN"

            const reasons = await context.dataSources.cosmos.run_query("System-Settings", {
              query:  `
                SELECT o.* FROM c
                JOIN o in c.options
                WHERE   c.id = "reportReasons"
                        o.id in @reasonIds
              `,
              parameters: [
                { name: "@reasonIds", value: parent.reasonIds }
              ]
            }, true)

            return reasons.map((reason) => {
                return {
                    id: reason.id,
                    defaultLabel: reason.localizations.filter((x: any) => x.locale == defaultLocale)[0].value,
                    otherLocales: reason.localizations.filter((x: any) => x.locale != defaultLocale),
                    status: reason.status
                }
            })
        },
        ref: async(parent: any, _: any, _context: serverContext) => {
            return {
                id: parent.id, partition: [parent.forObject.partition, parent.forObject.id], container: primaryContainer
            }
        }
    },
    Listing: {
        reportReasons: async(parent: listing_type , _args: { limit? : number }, context: serverContext) => {
            let defaultLocale = "EN"

            let id = ""
            if (parent.type == "TOUR") id = "reportReasonsTour"

            if (id == "") throw `Can't find reasons for listing type ${parent.type}`

            const reasons = await context.dataSources.cosmos.run_query("System-Settings", {
              query:  `
                SELECT VALUE o FROM c
                JOIN o in c.options
                WHERE   c.id = @reportReasonId
              `,
              parameters: [
                { name: "@reportReasonId", value: id}
              ]
            }, true)

            return reasons.map((reason) => {
                return {
                    id: reason.id,
                    defaultLabel: reason.localizations.filter((x: any) => x.locale == defaultLocale)[0].value,
                    otherLocales: reason.localizations.filter((x: any) => x.locale != defaultLocale),
                    status: reason.status
                }
            })
        }
    }
}

export { resolvers }

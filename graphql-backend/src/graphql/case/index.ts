import { v4 as uuidv4 } from 'uuid'
import { currency_amount_type, recordref_type } from "../0_shared/types";
import { serverContext } from "../../services/azFunction";
import { DateTime, Duration } from "luxon";
import { CaseOfferType, caseInteraction_type, caseOffer_type, case_type } from "./types";
import { resolve_optionid } from "../choices";
import { vendor_type } from "../vendor/types";
import { generate_order_no } from "../order";
import { user_type } from "../user/types";
import { order_type } from "../order/types";
import { isEmpty, isNullOrUndefined, isNullOrWhiteSpace, LogManager } from "../../utils/functions";
import { DataAction, signalRManager } from '../../services/signalR';
import { merchants_users } from '../vendor';
import { sender_details } from '../../client/email_templates';
import { CosmosDataSource } from '../../utils/database';
import { PatchOperation, PatchOperationType } from '@azure/cosmos';
import { user_business_logic } from '../user';

const resolvers = {
    Query: {
        case: async (_: any, args: {
            caseId?: string, 
            trackingCode?: string
        }, { dataSources, signalR, userId } : serverContext) => {
            if (args.caseId == undefined && args.trackingCode == undefined) {
                throw "You must supply either a case id or tracking code to find a case"
            }

            var caseFromDb = undefined as case_type | undefined;

            if (args.caseId) {
                caseFromDb = await dataSources.cosmos.get_record<case_type>("Main-Cases", args.caseId, args.caseId)
            } else if (args.trackingCode) {
                var results = await dataSources.cosmos.run_query("Main-Cases", {
                    query: "SELECT * FROM c WHERE c.trackingCode=@trackingCode",
                    parameters: [
                        { name: "@trackingCode", value: args.trackingCode}
                    ]
                    }, true)
                if (results.length == 0) return undefined;

                caseFromDb = results[0];
            }

            if (caseFromDb == undefined) {
                return undefined;
            }
            
            if (caseFromDb.caseStatus == "NEW"
                && userId != caseFromDb.userId
            ) {
                caseFromDb.location.formattedAddress = "hidden"
            }
            
            return caseFromDb;
        },
        cases: async (_: any,
            args: {
                statuses: string[],
                religionId?: string,
                madeOffer?: boolean,
                zipCode?: number
            },
            context: serverContext, __: any) => {

            let where_conditions = []
            let parameters = []

            let vendors = [] as { id: string, role: string }[]
            if (context.userId != null) {
                var { vendors: userVendors } = await context.dataSources.cosmos.get_record<{ vendors: { id: string, role: string }[] }>("Main-User", context.userId, context.userId)
                vendors = userVendors
            }

            if (args.madeOffer != null) {
                if (vendors.length == 0) {
                    throw "You must be a vendor to filter by madeOffer"
                }                

                const casesWithOffers = await context.dataSources.cosmos.run_query<string>("Main-CaseOffers", {
                    query: `
                        SELECT VALUE c.caseId
                        FROM c WHERE ARRAY_CONTAINS(@merchantIds, c.merchantId)
                    `,
                    parameters: [
                        { name: "@merchantIds", value: vendors.map(x => x.id)}
                    ]
                }, true)

                where_conditions.push(`${args.madeOffer ? "" : "NOT"} ARRAY_CONTAINS(@caseIds, c.id)`)
                parameters.push({ name: "@caseIds", value: casesWithOffers })
            }
            
            // lets add n all our where conditions
            if (args.statuses != null && args.statuses.length > 0) {
                where_conditions.push("ARRAY_CONTAINS(@status, c.caseStatus)")
                parameters.push({ name: "@status", value: args.statuses })
            }

            if (args.religionId != null) {
                where_conditions.push("c.religionId = @religionId")
                parameters.push({ name: "@religionId", value: args.religionId })
            }

            if (args.zipCode != null && args.zipCode > 0) {
                where_conditions.push("CONTAINS(c.location.formattedAddress,@zipCode)")
                parameters.push({ name: "@zipCode", value: args.zipCode })
            }

            let casesFromDb = await context.dataSources.cosmos.run_query("Main-Cases", {
                query: `SELECT * FROM c WHERE ${where_conditions.join(" AND ")}`,
                parameters
            }, true)

            // we need to change the formattedAddress to hidden for all New cases
            for (var c of casesFromDb) {
                if (c.caseStatus == "NEW") {
                    c.location.formattedAddress = "hidden"
                }
            }

            if (vendors.length > 0) {
                // for all not New cases we need to check if the user is allowed to see them
                // they would need to belong to the vendor that is managing the case
                casesFromDb = casesFromDb.filter(x => x.caseStatus == "NEW" || vendors.some(v => x.managedBy.includes(v.id)))
            } else {
                // we should only return the cases that are new
                casesFromDb = casesFromDb.filter(x => x.caseStatus == "NEW")
            }
            
            return casesFromDb;
            
        },   
        caseOffer: async (_: any, args: {ref: recordref_type}, { dataSources }: serverContext, ___: any) => {
            const caseOffer = await dataSources.cosmos.get_record("Main-CaseOffers", args.ref.id, args.ref.partition)
            return caseOffer
        },
        caseOffers: async (_: any, args: { merchantId?: string, caseId?: string }, { dataSources: { cosmos }, userId }: serverContext) => {
            let where_conditions = [
                `c.type = "APPLICATION"`
            ]
            let parameters = []
          
            if (userId != null) {
              // 1. Find all my merchants
              const user = await cosmos.get_record<{ vendors: { id: string }[] }>("Main-User", userId, userId);
              let myMerchantIds = user.vendors.map(x => x.id);
          
              if (args.merchantId) {
                if (!myMerchantIds.includes(args.merchantId)) {
                  throw "You do not have access to the requested merchant";
                } else {
                  myMerchantIds = [args.merchantId];
                }
              }
          
              where_conditions.push("ARRAY_CONTAINS(@merchantIds, c.merchantId)")
              parameters.push({ name: "@merchantIds", value: myMerchantIds })
            }
          
            if (args.caseId) {
              where_conditions.push("c.caseId = @caseId");
              parameters.push({ name: "@caseId", value: args.caseId })
            }
          
            if (!args.caseId && !userId) {
              throw "You must be either logged in or pass a case to view offers"
            }
          
            // Finally we can do the query
            const myOffers = await cosmos.run_query("Main-CaseOffers", {
              query: `
                SELECT VALUE c
                FROM c 
                WHERE IS_NULL(c.acceptedOn)
                AND IS_NULL(c.rejectedOn)
                AND ${where_conditions.join(" AND ")}
              `,
              parameters
            }, true)
          
            return myOffers
        },                
        casePayments: async(_:any, _args: any, context: serverContext, __:any) => {
            const payments = await context.dataSources.cosmos.run_query("Main-Cases", {
                    query: "SELECT c.id as 'caseId', c.userId as 'userId', m.id as 'merchantId', iv.createdDate as createdDate, iv.stripe FROM c JOIN m in c.merchants JOIN iv in m.invoices WHERE iv.userId=@userId",
                    parameters: [
                        {name: "@userId", value: context.userId}
                    ]
                }
            , true)
            return payments.map((payment) => ({...payment, type: "CaseInvoice"}))
        }
    },
    Mutation: {
        upsert_case: async (_: any, args: any, context: serverContext) => {  
            var item = args.case;
            var userId = context.userId;
            
            const existingCase = isNullOrWhiteSpace(userId) ? false : await context.dataSources.cosmos.record_exists("Main-Cases", item.id, item.id)
        
            if (existingCase) {
                
                await context.dataSources.cosmos.update_record("Main-Cases", item.id, item.id, item, context.userId ?? "GUEST")

                const caseDB = await context.dataSources.cosmos.get_record<case_type>("Main-Cases", item.id, item.id)

                context.signalR.addNotificationMessage(
                    `Case ${caseDB.code} has succesfully updated.`,
                    {
                        userId, status: "success"
                    }
                )
        
                return {
                    code: 200,
                    message: "Case has been updated",
                    case: await context.dataSources.cosmos.get_record("Main-Cases", item.id, item.id)
                }

            } else {

                // assign the user based on the contact email they provided
                // if we can't find a user to that email provision a new user
                var customerEmail = args.case.contact.email
                const userResp = await context.dataSources.cosmos.run_query<user_type>("Main-User", {
                    query: `SELECT * FROM c WHERE c.email = @email`,
                    parameters: [{ name: "@email", value: customerEmail }]
                })
                if (userResp.length == 0) {
                    // we'll need to provision a new user
                    item["userId"] = await user_business_logic.create(customerEmail, context.dataSources.cosmos)
                } else {
                    item["userId"] = userResp[0].id
                }

                var ttl = Duration.fromObject({ days: 1 }).as("seconds")

                item["trackingCode"] = uuidv4()
                item["caseStatus"] = "CREATED"
                item["ttl"] = ttl
                item["code"] = await context.dataSources.cosmos.generate_unique_code(
                    "CS",
                    async () => {
                        const existingCodes = await context.dataSources.cosmos.run_query("Main-Cases", {
                            query: `SELECT VALUE c.code FROM c`,
                            parameters: []
                        }, true);
                        return existingCodes;
                    }
                )

                for (var affectedPerson of item.affectedPeople) { 
                    affectedPerson.id = uuidv4();
                }

                for (var affectedArea of item.affectedAreas) { 
                    affectedArea.id = uuidv4();
                }

                const lines = [
                    {
                        id: uuidv4(),
                        forObject: {
                            id: item.id,
                            partition: [item.id],
                            container: "Main-Cases"
                        },
                        price_log: [{
                            datetime: DateTime.now().toISO(),
                            type: "CHARGE",
                            status: "SUCCESS",
                            price: {
                                amount: 500,
                                quantity: 1,
                                currency: "AUD"
                            }  
                        }],
                        stripe: {},
                        target: "CASE-CREATE",
                        merchantId: "SPIRIVERSE"
                    }
                ]

                if (!isNullOrUndefined(item.urgencyFee)) {
                    // we need to add a charge for the urgency fee
                    lines.push({
                        id: uuidv4(),
                        forObject: {
                            id: item.id,
                            partition: [item.id],
                            container: "Main-Cases"
                        },
                        price_log: [{
                            datetime: DateTime.now().toISO(),
                            type: "CHARGE",
                            status: "SUCCESS",
                            price: {
                                amount: item.urgencyFee.defaultPrice.amount,
                                quantity: 1,
                                currency: "AUD"
                            }  
                        }],
                        stripe: {},
                        target: "CASE-URGENCY-FEE",
                        merchantId: "SPIRIVERSE"
                    })
                }
                
                // create the order
                const order = {
                    id: uuidv4(),
                    code: await generate_order_no(customerEmail, context.dataSources.cosmos),
                    userId: context.userId,
                    customerEmail,
                    lines,
                    payments: [],
                    ttl
                }

                await context.dataSources.cosmos.add_record("Main-Orders", order, order.id, context.userId ?? "GUEST")

                // create the setup intent for the order
                var stripeCustomer = await context.dataSources.stripe.resolveCustomer(customerEmail)
                const intent = await context.dataSources.stripe
                    .callApi("POST", "setup_intents", {
                        customer: stripeCustomer.id,
                        metadata: {
                            target: "Main-Orders",
                            orderId: order.id,
                            customerEmail
                        }
                })
                if (intent.status != 200) throw "Error creating payment intent in stripe"

                item.stripe = {
                    setupIntentId: intent.data["id"],
                    setupIntentSecret: intent.data["client_secret"]
                }

                item["stripeIntents"] = {
                    create: intent.data["id"]
                }

                // finally create the case
                await context.dataSources.cosmos.add_record("Main-Cases", item, item.id, item["userId"])

                return {
                    code: "200",
                    message: `Case ${args.id} added`,
                    case: await context.dataSources.cosmos.get_record("Main-Cases", item.id, item.id)
                }
            }
        },   
        upsert_caseOffer: async(_: any, args: {
            offer: {
                id: string,
                merchantId: string,
                caseId: string,
                description: string,
                type: CaseOfferType,
                price: currency_amount_type
            }
        }, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call"
        
            const offerExists = await context.dataSources.cosmos.record_exists("Main-CaseOffers", args.offer.id, args.offer.caseId)

            if (offerExists) {
                const existingCaseOffer = await context.dataSources.cosmos.get_record<caseOffer_type>("Main-CaseOffers", args.offer.id, args.offer.caseId)
                
                await context.dataSources.cosmos.patch_record("Main-CaseOffers", args.offer.id, args.offer.caseId, [
                    { op: "set", value: args.offer.description, path: "/description" }
                ], context.userId)
    
                if (existingCaseOffer.type == "RELEASE" && existingCaseOffer.clientRequested) {
                    await context.dataSources.cosmos.patch_record("Main-CaseOffers", args.offer.id, args.offer.caseId, [
                        { op: "set", value: true, path: "/merchantResponded" }
                    ], context.userId)
                }
    
                // Handle the price update
                if (args.offer.price != undefined && args.offer.price.amount > 0) {
                    const caseDB = await context.dataSources.cosmos.get_record<case_type>("Main-Cases", args.offer.caseId, args.offer.caseId)
                    const customerEmail = caseDB.contact.email
    
                    const orderResp = await context.dataSources.cosmos.run_query<order_type>("Main-Orders", {
                        query: `SELECT VALUE o FROM o JOIN l in o.lines WHERE l.forObject.id = @forObjectId AND o.customerEmail = @customerEmail`,
                        parameters: [
                            { name: "@customerEmail", value: customerEmail },
                            { name: "@forObjectId", value: args.offer.id }
                        ]
                    }, true)
    
                    if (orderResp.length == 0) {
                        const offerRef = {
                            id: args.offer.id,
                            partition: [args.offer.caseId],
                            container: "Main-CaseOffers"
                        }

                        const order = {
                            id: uuidv4(),
                            code: await generate_order_no(customerEmail, context.dataSources.cosmos),
                            userId: context.userId,
                            customerEmail,
                            lines: [
                                {
                                    id: uuidv4(),
                                    forObject: offerRef,
                                    price_log: [{
                                        datetime: DateTime.now().toISO(),
                                        type: "CHARGE",
                                        status: "AWAITING_PAYMENT",
                                        price: {
                                            amount: args.offer.price.amount,
                                            quantity: 1,
                                            currency: "AUD"
                                        }  
                                    }],
                                    paid_status_log: [],
                                    type: existingCaseOffer.type,
                                    stripe: {},
                                    target: "CASE-OFFER-RELEASE",
                                    merchantId: existingCaseOffer.merchantId
                                }
                            ],
                            payments: []
                        }
            
                        await context.dataSources.cosmos.add_record("Main-Orders", order, order.id, context.userId ?? "GUEST")

                        const stripeCustomer = await context.dataSources.stripe.resolveCustomer(customerEmail)
                        const intent = await context.dataSources.stripe.callApi("POST", "setup_intents", {
                            customer: stripeCustomer.id,
                            metadata: {
                                target: "Main-Orders",
                                orderId: order.id,
                                customerEmail
                            }
                        })
                        if (intent.status !== 200) throw "Error creating payment intent in stripe";
            
                        const stripe = {
                            setupIntentId: intent.data["id"],
                            setupIntentSecret: intent.data["client_secret"]
                        }

                        const caseId = caseDB.id
                        await context.dataSources.cosmos.patch_record("Main-Cases", caseId, caseId, [
                            { op: "set", path: `/stripeIntents/${existingCaseOffer.type.toLowerCase()}`, value: intent.data["id"] }
                        ], "STRIPE")
            
                        await context.dataSources.cosmos.patch_record("Main-CaseOffers", existingCaseOffer.id, args.offer.caseId, [
                            { op: "set", path: "/stripe", value: stripe }
                        ], "GUEST")
                    }
    
                    const order = orderResp[0]

                    await context.dataSources.cosmos.patch_record("Main-Orders", order.id, order.id, [
                        { op: "set", value: args.offer.price.amount, path: "/lines/0/price_log/0/price/amount"}
                    ], context.userId)

                    context.signalR.addDataMessage(
                        "update_caseOffer",
                        { id: args.offer.id, merchantId: args.offer.merchantId },
                        { action: DataAction.UPSERT}
                    )

                    await context.dataSources.email.sendEmail(
                        sender_details.from,
                        caseDB.contact.email,
                        "d-980f773959ad471188b1fd6c5324cd6a",
                        {
                            case: {
                                code: caseDB.code 
                            }
                        }                     
                    )
                }
    
                return {
                    code: 200,
                    message: `Offer ${existingCaseOffer.code} for case ${args.offer.caseId} successfully updated`,
                    offer: await context.dataSources.cosmos.get_record("Main-CaseOffers", args.offer.id, args.offer.caseId)
                }

            } else {
                
                // Step 1: Retrieve the case this offer refers to
                const caseDB = await context.dataSources.cosmos.get_record<case_type>("Main-Cases", args.offer.caseId, args.offer.caseId)
                
                const {price, ...rest} = args.offer

                const record = {
                    ...rest,
                    code: await context.dataSources.cosmos.generate_unique_code(
                        "CO",
                        async () => {
                            const existingCodes = await context.dataSources.cosmos.run_query("Main-CaseOffers", {
                                query: `SELECT VALUE c.code FROM c WHERE c.merchantId = @merchantId`,
                                parameters: [{ name: "@merchantId", value: args.offer.merchantId }]
                            }, true);
                            return existingCodes;
                        }
                    ),
                    acceptedOn: null,
                    rejectedOn: null
                }
        
                await context.dataSources.cosmos.add_record("Main-CaseOffers", record, args.offer.caseId, context.userId)
        
                let target = ""
                if (record.type === "RELEASE") {
                    target = "CASE-OFFER-RELEASE"
                } else if (record.type === "CLOSE") {
                    target = "CASE-OFFER-CLOSE"
                }
                
                // if they've given a price we need to create an order for it that the customer will pay
                if (price != undefined && price.amount > 0 && ["CLOSE", "RELEASE"].includes(record.type)) {
                    const offerRef = {
                        id: record.id,
                        partition: [args.offer.caseId],
                        container: "Main-CaseOffers"
                    }
        
                    // Step 2: Resolve the customer from the case
                    const customerEmail = caseDB.contact.email;
                    const stripeCustomer = await context.dataSources.stripe.resolveCustomer(customerEmail)
        
                    const order = {
                        id: uuidv4(),
                        code: await generate_order_no(customerEmail, context.dataSources.cosmos),
                        userId: context.userId,
                        customerEmail,
                        lines: [
                            {
                                id: uuidv4(),
                                forObject: offerRef,
                                price_log: [{
                                    datetime: DateTime.now().toISO(),
                                    type: "CHARGE",
                                    status: record.type == "APPLICATION" ? "SUCCESS" : "AWAITING_PAYMENT",
                                    price: {
                                        amount: price.amount,
                                        quantity: 1,
                                        currency: "AUD"
                                    }  
                                }],
                                paid_status_log: [],
                                type: record.type,
                                stripe: {},
                                target: target,
                                merchantId: record.merchantId
                            }
                        ],
                        payments: []
                    }
        
                    await context.dataSources.cosmos.add_record("Main-Orders", order, order.id, context.userId ?? "GUEST")
        
                    const intent = await context.dataSources.stripe.callApi("POST", "setup_intents", {
                        customer: stripeCustomer.id,
                        metadata: {
                            target: "Main-Orders",
                            orderId: order.id,
                            customerEmail
                        }
                    })
                    if (intent.status !== 200) throw "Error creating payment intent in stripe";
        
                    const stripe = {
                        setupIntentId: intent.data["id"],
                        setupIntentSecret: intent.data["client_secret"]
                    }

                    const caseId = caseDB.id
                    await context.dataSources.cosmos.patch_record("Main-Cases", caseId, caseId, [
                        { op: "set", path: `/stripeIntents/${record.type.toLowerCase()}`, value: intent.data["id"] }
                    ], "STRIPE")
        
                    await context.dataSources.cosmos.patch_record("Main-CaseOffers", record.id, args.offer.caseId, [
                        { op: "set", path: "/stripe", value: stripe }
                    ], "GUEST")
                }

                const merchantUsers = await merchants_users(context.dataSources.cosmos, [args.offer.merchantId])
                if (record.type == "APPLICATION") {

                    // send an email to the customer saying there's a new APPLICATION offer
                    await context.dataSources.email.sendEmail(
                        sender_details.from,
                        caseDB.contact.email,
                        "CASE_APPLICATION_CREATED_CUSTOMER",
                        {
                            case: {
                                code: caseDB.code 
                            },
                            caseOffer: {
                                code: record.code  
                            }
                        }                     
                    )

                    // send a confirmation email that the application was created successfully to the merchant
                    await context.dataSources.email.sendEmailToMany(
                        sender_details.from,
                        merchantUsers,
                        "CASE_APPLICATION_CREATED_MERCHANT",
                        {
                            case: {
                                code: caseDB.code 
                            },
                            caseOffer: {
                                code: record.code  
                            }
                        }, (user) => user.email
                    )

                    // add notification to customer
                    context.signalR.addNotificationMessage(
                        `Woohoo! A new offer has been made for your case ${caseDB.code}. Track the case to view it.`,
                        {
                            userId: caseDB.trackingCode, status: "success"
                        }
                    )

                } else if (record.type == "RELEASE") {

                    if (args.offer.price == undefined || args.offer.price.amount === 0) {
                        
                        await case_business_logic.release_case(args.offer.caseId, context.dataSources.cosmos, context.signalR, context.logger)

                        // we need to accept the offer automatically
                        await context.dataSources.cosmos.patch_record("Main-CaseOffers", record.id, args.offer.caseId, [
                            { op: "set", path: "/acceptedOn", value: DateTime.now().toISO() }
                        ], context.userId)

                        context.signalR.addNotificationMessage(
                            `Your case ${caseDB.code} has been released by your investigator and is now open for new applicants.`,
                            {
                                userId: caseDB.trackingCode, status: "success"
                            }
                        )

                    } else {

                        // send an email to the customer saying there's a new RELEASE offer
                        await context.dataSources.email.sendEmail(
                            sender_details.from,
                            caseDB.contact.email,
                            "CASE_RELEASE_CREATED_CUSTOMER",
                            {
                                case: {
                                    code: caseDB.code 
                                },
                                caseOffer: {
                                    code: record.code  
                                }
                            }                     
                        )

                        // send a confirmation email that the application was created successfully to the merchant
                        await context.dataSources.email.sendEmailToMany(
                            sender_details.from,
                            merchantUsers,
                            "CASE_RELEASE_CREATED_MERCHANT",
                            {
                                case: {
                                    code: caseDB.code 
                                },
                                caseOffer: {
                                    code: record.code  
                                }
                            }, (user) => user.email
                        )

                        // send notification to customer
                        context.signalR.addNotificationMessage(
                            `A release offer has been made for your case ${caseDB.code}. Track the case to approve it.`,
                            {
                                userId: caseDB.trackingCode, status: "success"
                            }
                        )

                    }

                    

                } else if (record.type == "CLOSE") {

                    // send an email to the customer saying there's a new CLOSE offer
                    await context.dataSources.email.sendEmail(
                        sender_details.from,
                        caseDB.contact.email,
                        "CASE_CLOSE_CREATED_CUSTOMER",
                        {
                            case: {
                                code: caseDB.code 
                            },
                            caseOffer: {
                                code: record.code  
                            }
                        }                     
                    )

                    // send a confirmation email that the application was created successfully to the merchant
                    await context.dataSources.email.sendEmailToMany(
                        sender_details.from,
                        merchantUsers,
                        "CASE_CLOSE_CREATED_MERCHANT",
                        {
                            case: {
                                code: caseDB.code 
                            },
                            caseOffer: {
                                code: record.code  
                            }
                        }, (user) => user.email
                    )

                    // add notification to customer
                    context.signalR.addNotificationMessage(
                        `An offer to the close your case ${caseDB.code} has been made. Track the case to approve it.`,
                        {
                           userId: caseDB.trackingCode, status: "success"
                        }
                    )
                }

                context.signalR.addDataMessage(
                    "caseOffer",
                    { id: args.offer.id, merchantId: args.offer.merchantId },
                    { action: DataAction.UPSERT, group: `offer-${args.offer.id}`}
                )

                return {
                    code: "200",
                    message: `Offer for case ${record.id} successfully submitted - type ${record.type}`,
                    offer: await context.dataSources.cosmos.get_record("Main-CaseOffers", record.id, args.offer.caseId)
                }
            }
        },                
        create_activity_log: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call"
    
            var activityLog: any = args.interaction
        
            activityLog["id"] = uuidv4()
            activityLog["type"] = "ACTIVITY";
            activityLog["posted_by_userId"] = context.userId
            activityLog["posted_by_vendorId"] = args.vendorId
            activityLog["caseRef"] = args.caseRef
            activityLog["code"] = await context.dataSources.cosmos.generate_unique_code(
                "CI",
                async () => {
                    const existingCodes = await context.dataSources.cosmos.run_query("Main-CaseInteraction", {
                        query: `SELECT VALUE c.code FROM c`,
                        parameters: []
                    }, true);
                    return existingCodes;
                }
            )

            // we need to encode dates as strings for cosmos
            activityLog["conductedAtDate"] = DateTime.fromJSDate(activityLog["conductedAtDate"]).toISO()
            
            //TODO: to change for multi vendor later
            activityLog["participants"] = [
                {vendorId: args.vendorId, userId: context.userId}
            ]
        
            if (activityLog.media != null) {
              activityLog.media = activityLog.media.map(({ url, ...media }: { url: URL }) => {
                return {
                  ...media,
                  url: url.toString(),
                }
              })
            }
        
            await context.dataSources.cosmos.add_record("Main-CaseInteraction", activityLog, activityLog["caseRef"]["id"], context.userId)
        
            // we want to send an email to the contact of the case that an activity has been logged
            const caseRecord = await context.dataSources.cosmos.get_record<case_type>("Main-Cases", activityLog["caseRef"]["id"], activityLog["caseRef"]["id"])
            await context.dataSources.email.sendEmail(
                sender_details.from,
                caseRecord.contact.email,
                "CASE_ACTIVITY_LOGGER_CUSTOMER",
                {
                    case: {
                        code: caseRecord.code
                    }
                }
            )

            return {
                code: "200",
                message: "Activity log created",
                caseInteraction: await context.dataSources.cosmos.get_record("Main-CaseInteraction", activityLog["id"],activityLog["caseRef"]["id"])
            }
        },
        add_case_comment: async(_: any, args:any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            var item : any = {
                id: uuidv4(),
                type: "CASE_COMMENT",
                posted_by_userId: context.userId,
                posted_by_vendorId: args.vendorId,
                caseRef: args.caseRef,
                conductedAtDate: DateTime.now().toISO(),
                code: await context.dataSources.cosmos.generate_unique_code(
                    "CC",
                    async () => {
                        const existingCodes = await context.dataSources.cosmos.run_query("Main-CaseInteraction", {
                            query: `SELECT VALUE c.code FROM c`,
                            parameters: []
                        }, true);
                        return existingCodes;
                    }
                ),
                ...args.interaction
            }

            if (item.media != null) {
                item.media = item.media.map(({ url, ...media}: { url: URL }) => {
                    return {
                        ...media, url: url.toString(),
                    }
                })
            }

            await context.dataSources.cosmos.add_record("Main-CaseInteraction", item, item["caseRef"]["id"], context.userId)

            return {
                code: "200",
                message: "Comment added to activity log",
                caseInteraction: await context.dataSources.cosmos.get_record("Main-CaseInteraction", item["id"], item["caseRef"]["id"])
            }
        },
        create_caseInvoice: async (_: any, args: {merchantId: string, caseRef: recordref_type, invoice: any}, context: serverContext) => {
            if (context.userId == null) throw "Only a user can create an invoice for a case"

            const caseRecord = await context.dataSources.cosmos.get_record<case_type>("Main-Cases", args.caseRef.id, args.caseRef.partition)
            let customerEmail = caseRecord.contact.email

            const orderId = uuidv4()

            // create the setup intent that points to below
            var stripeCustomer = await context.dataSources.stripe.resolveCustomer(customerEmail)
            const intent = await context.dataSources.stripe
                .callApi("POST", "setup_intents", {
                    customer: stripeCustomer.id,
                    metadata: {
                        target: "Main-Orders",
                        orderId,
                        customerEmail
                    }
            })
            if (intent.status != 200) throw "Error creating payment intent in stripe"

            // quickly create the order
            const order = {
                id: orderId,
                code: await generate_order_no(customerEmail, context.dataSources.cosmos),
                userId: context.userId,
                customerEmail,
                lines: args.invoice.lines.map((line: any) => {
                    return {
                        id: uuidv4(),
                        forObject: args.caseRef,
                        sale_price: line.amount,
                        interactionId: line.interactionId,
                        quantity: 1,
                        description: line.invoiceDescription,
                        userId: args.invoice.userId,
                        merchantId: args.merchantId,
                        stripe: {},
                        target: "CASE-INTERACTION"
                    }
                }),
                payments: [],
                stripe: {
                    setupIntentId: intent.data["id"],
                    setupIntentSecret: intent.data["client_secret"]
                }
            }

            await context.dataSources.cosmos.add_record("Main-Orders", order, order.id, context.userId)
        
            return {
                code: "200",
                message: `Case invoice successfully created`,
                invoice: await context.dataSources.cosmos.get_record("Main-Orders", order.id, order.id)
            }
        },
        request_release_case: async (_: any, args: { ref: recordref_type }, context: serverContext) => {
            // TODO: ONLY THE CLIENT SHOULD BE ABLE TO REQUEST
        
            // Retrieve the updated case from the database
            const caseFromDB = await context.dataSources.cosmos.get_record<case_type>("Main-Cases", args.ref.id, args.ref.partition)
            // Patch the record in the database
            await context.dataSources.cosmos.patch_record("Main-Cases", args.ref.id, args.ref.partition, [
                { op: "set", value: "PENDING", path: "/release_status" }
            ], "GUEST")

            let merchantId: string | undefined

            if (caseFromDB.merchants && caseFromDB.merchants.length > 0) {
                merchantId = caseFromDB.merchants[0].id
            } else if (caseFromDB.managedBy && caseFromDB.managedBy.length > 0) {
                merchantId = caseFromDB.managedBy[0]
            } if (!merchantId) {
                throw new Error("No merchantId found for the case.")
            }

            const record = {
                id: uuidv4(),
                code: await context.dataSources.cosmos.generate_unique_code(
                    "CO",
                    async () => {
                        const existingCodes = await context.dataSources.cosmos.run_query("Main-CaseOffers", {
                            query: `SELECT VALUE c.code FROM c WHERE c.merchantId = @merchantId`,
                            parameters: [{ name: "@merchantId", value: merchantId}]
                        }, true)
                        return existingCodes
                    }
                ),
                acceptedOn: null,
                rejectedOn: null,
                type: "RELEASE",
                caseId: caseFromDB.id,
                merchantId: merchantId,
                merchantResponded: false,
                clientRequested: true
            }
        
            await context.dataSources.cosmos.add_record("Main-CaseOffers", record, args.ref.id, context.userId)
        
            // Query to get all the merchant's users related to the case
            const merchantUsers = await context.dataSources.cosmos.run_query<user_type>("Main-User", {
                query: `
                    SELECT VALUE c
                    FROM c
                    JOIN v IN c.vendors
                    WHERE ARRAY_CONTAINS(@merchantIds, v.id)
                `,
                parameters: [
                    { name: "@merchantIds", value: caseFromDB.managedBy }
                ]
            }, true)

            // Send notifications to the merchant's
            for (const user of merchantUsers) {
                context.signalR.addNotificationMessage(
                    `Case ${caseFromDB.code} requested to change investigator. Release process started. Please finalise your offer.`,
                    {
                        userId: user.id, status: "info"
                    }
                )
            }

            // TODO: fix this because this notif still not showing in track case page 
            context.signalR.addNotificationMessage(
                `Request to change investigator for case ${caseFromDB.code} has been successfully submitted.`,
                {
                    userId: caseFromDB.id, status: "success"
                }
            )

            context.signalR.addDataMessage(
                "caseOffer",
                { id: args.ref.id },
                { action: DataAction.UPSERT, group: `offer-${args.ref.id}`}
            )

            await context.dataSources.email.sendEmailToMany(
                sender_details.from,
                merchantUsers,
                "CASE_REQUEST_NEW_INVESTIGATOR_MERCHANT",
                {
                    merchant: {
                        name: merchantUsers[0].name 
                    },
                    case: {
                        code: caseFromDB.code 
                    }
                }, (user) => user.email
            )

            return {
                code: "200",
                message: `Request new investigator for case ${record.id} successfully submitted`,
                offer: await context.dataSources.cosmos.get_record("Main-CaseOffers", record.id, args.ref.id)
            }
        },
        accept_caseOffer: async (_:any, args: { 
            ref: recordref_type
        }, context: serverContext) => {
            
            const caseId = args.ref.partition[0]
            const case_offer = await context.dataSources.cosmos.get_record<caseOffer_type>("Main-CaseOffers", args.ref.id, args.ref.partition)

            if (case_offer.type == "APPLICATION") {
                await context.dataSources.cosmos.patch_record("Main-CaseOffers", args.ref.id, caseId, [
                    { op: "set", value: DateTime.now().toISO(), path: "/acceptedOn"}
                ], "GUEST")
                
                await context.dataSources.cosmos.patch_record("Main-Cases", caseId, caseId, [
                    { op: "set", value: "ACTIVE", path: "/caseStatus"},
                    { op: "set", value: [case_offer.merchantId], path: "/managedBy"},
                    { op: "set", value: [case_offer.merchantId], path: "/merchantIds"}
                ], "GUEST")

                var caseOffersRequiringPatching = await context.dataSources.cosmos.run_query<caseOffer_type>("Main-CaseOffers", {
                    query: `SELECT VALUE c
                    FROM c
                    WHERE IS_NULL(c.acceptedOn)
                    AND c.caseId = @caseId`,
                    parameters: [
                        { name: "@caseId", value: caseId}
                    ]
                }, true)

                for(var caseOffer of caseOffersRequiringPatching) {
                    // patch rejectedOn for each case
                    await context.dataSources.cosmos.patch_record("Main-CaseOffers", caseOffer.id, caseOffer.caseId, [
                        { op: "set", value: DateTime.now().toISO(), path: "/rejectedOn"}
                    ], "GUEST")
                }

                const caseFromDB = await context.dataSources.cosmos.get_record<case_type>("Main-Cases", caseId, caseId)
                // we need to get all the merchant's users who's applying for the case
                const users = await context.dataSources.cosmos.run_query<user_type>("Main-User", {
                    query: `
                        SELECT VALUE c
                        FROM c
                        JOIN v in c.vendors
                        WHERE v.id = @merchantId
                    `,
                    parameters: [
                        { name: "@merchantId", value: case_offer.merchantId }
                    ]
                }, true)

                const merchantUserIds = users.map(x => x.id);
                for(var userId of merchantUserIds) {
                    context.signalR.addNotificationMessage(
                        `Case ${caseFromDB.code} successfully accepted.`, 
                        { userId, status:"success" }
                    )

                    context.signalR.addDataMessage(
                        "caseApplications",
                        { id: args.ref.id, merchantId: case_offer.merchantId },
                        { action: DataAction.DELETE, userId }
                    )

                    context.signalR.addDataMessage(
                        "assignedCases",
                        { id: caseId },
                        { action: DataAction.UPSERT, userId }
                    )
                }

                await context.dataSources.email.sendEmail(
                    sender_details.from,
                    caseFromDB.contact.email,
                    "CASE_APPLICATION_OFFER_ACCEPTED_CUSTOMER",
                    {
                        case: {
                            code: caseFromDB.code 
                        }
                    }                     
                )
                
                await context.dataSources.email.sendEmailToMany(
                    sender_details.from,
                    await merchants_users(context.dataSources.cosmos, caseFromDB.managedBy),
                    "CASE_APPLICATION_OFFER_ACCEPTED_MERCHANT",
                    {
                        case: {
                            code: caseFromDB.code 
                        }
                    }, (user) => user.email
                )
            } else {
                // we need to check if theres an order for this case offer
                // if the order is paid / there is no order then we can accept the offer
                
                const caseRecord = await context.dataSources.cosmos.get_record<case_type>("Main-Cases", case_offer.caseId, case_offer.caseId)
                const customerEmail = caseRecord.contact.email
                // now we find the order via looking at the lines for object
                const order = await context.dataSources.cosmos.run_query<order_type>("Main-Orders", {
                    query: `
                        SELECT VALUE o
                        FROM o
                        JOIN l in o.lines
                        WHERE l.forObject.id = @offerId
                            AND o.customerEmail = @customerEmail
                    `,
                    parameters: [
                        { name: "@offerId", value: case_offer.id },
                        { name: "@customerEmail", value: customerEmail}
                    ]
                }, true)  

                if (order.length > 0) {
                    const all_lines_paid = order[0].lines.every((line) => line.paid_status_log != undefined && line.paid_status_log.length > 0 && line.paid_status_log[0].label == "PAID")
                    if (!all_lines_paid) throw `All lines in the order for case offer ${case_offer.id} must be paid before accepting the offer`
                } 

                await case_business_logic.release_case(case_offer.caseId, context.dataSources.cosmos, context.signalR, context.logger)

            }

            return {
                code: "200",
                message: `Offer ${args.ref.id} for case ${caseId} successfully accepted`,
                offer: await context.dataSources.cosmos.get_record("Main-CaseOffers", args.ref.id, caseId)
            }
        },
        reject_caseOffer: async (_:any, args: { 
            ref: recordref_type
        }, context: serverContext) => {
            
            const caseId = args.ref.partition[0]
            const caseFromDB = await context.dataSources.cosmos.get_record<case_type>("Main-Cases", caseId, caseId)

            await context.dataSources.cosmos.patch_record("Main-CaseOffers", args.ref.id, caseId, [
                { op: "set", value: DateTime.now().toISO(), path: "/rejectedOn"}
            ], "GUEST")

            await context.dataSources.email.sendEmail(
                sender_details.from,
                caseFromDB.contact.email,
                "CASE_APPLICATION_OFFER_REJECTED_CUSTOMER",
                {
                    case: {
                        code: caseFromDB.code 
                    }
                }                     
            )
            
            // look up case offer in database
            const offer = await context.dataSources.cosmos.get_record<caseOffer_type>("Main-CaseOffers", args.ref.id, caseId)

            await context.dataSources.email.sendEmailToMany(
                sender_details.from,
                await merchants_users(context.dataSources.cosmos, [offer.merchantId]),
                "CASE_APPLICATION_OFFER_REJECTED_MERCHANT",
                {
                    case: {
                        code: caseFromDB.code 
                    }
                }, (user) => user.email
            )

            return {
                code: "200",
                message: `Offer ${args.ref.id} for case ${caseId} successfully rejected`,
                offer: await context.dataSources.cosmos.get_record("Main-CaseOffers", args.ref.id, caseId)
            }
        },
        cancel_request: async (_:any, args:any, context: serverContext) => {

            const caseFromDB = await context.dataSources.cosmos.get_record<case_type>("Main-Cases", args.ref.id, args.ref.partition)
            
            await context.dataSources.cosmos.patch_record("Main-Cases", args.ref.id, args.ref.partition, [
                { op: "set", value: "CANCELLED", path: "/release_status" }
            ], "GUEST")

            const merchantUsers = await context.dataSources.cosmos.run_query<user_type>("Main-User", {
                query: `
                    SELECT VALUE c
                    FROM c
                    JOIN v IN c.vendors
                    WHERE ARRAY_CONTAINS(@merchantIds, v.id)
                `,
                parameters: [
                    { name: "@merchantIds", value: caseFromDB.managedBy }
                ]
            }, true)
            
            await context.dataSources.email.sendEmailToMany(
                sender_details.from,
                merchantUsers,
                "CASE_REQUEST_NEW_INVESTIGATOR_CANCELLED",
                {
                    case: {
                        code: caseFromDB.code 
                    }
                }, (user) => user.email
            )

        },
        close_case: async(_: any, { ref: recordref_type }, context: serverContext) => {
            // it must be an authenticated user
            if (context.userId == null) throw "User must be present for this call"

            const caseFromDB = await context.dataSources.cosmos.get_record<case_type>("Main-Cases", recordref_type.id, recordref_type.partition)

            // user must either be from one of the merchants who manage the case
            // or the user who created the case
            if (caseFromDB.userId != context.userId) {
                const usersForMerchants = await merchants_users(context.dataSources.cosmos, caseFromDB.managedBy)
                if (!usersForMerchants.some(x => x.id == context.userId)) {
                    throw "User must be the creator of the case or a merchant managing the case to close it"
                }
            }

            // great we can close the case

            await case_business_logic.close_case(recordref_type.id, context.dataSources.cosmos, context.signalR, context.logger)

        }
    },
    Case: {
        ref: async(parent: any, _: any, _context: serverContext) => {
            return {
                id: parent.id, partition: [parent.id], container: "Main-Cases"
            }
        },
        category: async(parent: {categoryId: string}, _args: any, context: serverContext, _info: any) => {
            let defaultLocale = "EN"

            const categories = await context.dataSources.cosmos.run_query("System-Settings", {
              query:  `
                SELECT VALUE o FROM c
                JOIN o in c.options
                WHERE c.id = "helpRequestCategory"
                AND o.id = @categoryId
              `,
              parameters: [
                { name: "@categoryId", value: parent.categoryId }
              ]
            }, true)
            
            if (categories.length == 0) throw `Could not find an option set for help request category.`
            const category = categories[0]

            return {
                id: category.id, 
                defaultLabel: category.localizations.filter((x: any) => x.locale == defaultLocale)[0].value,
                otherLocales: category.localizations.filter((x: any) => x.locale != defaultLocale),
                status: category.status
            }
        },
        religion: async(parent: {religionId: string}, _args: any, context: serverContext, _info: any) => {
            let defaultLocale = "EN"

            const religions = await context.dataSources.cosmos.run_query("System-Settings", {
              query:  `
                SELECT VALUE o FROM c
                JOIN o in c.options
                WHERE c.id = "religions"
                AND o.id = @religionId
              `,
              parameters: [
                { name: "@religionId", value: parent.religionId }
              ]
            }, true)
            
            if (religions.length == 0) throw `Could not find an option set for religion.`
            const religion = religions[0]

            return {
                id: religion.id, 
                defaultLabel: religion.localizations.filter((x: any) => x.locale == defaultLocale)[0].value,
                otherLocales: religion.localizations.filter((x: any) => x.locale != defaultLocale),
                status: religion.status
            }
        },
        locatedFromMe:async (_parent: any, _:any, _context: serverContext) => {
            return {
                value: 3.5,
                units: "km"
            }
        },
        myRole: async (parent: any, _:any, context: serverContext) => {
            if(context.userId == null) throw "A user must be present to check if case is assigned to them"
            var { vendors } = await context.dataSources.cosmos.get_record<{ vendors: { id: string, role: string }[] }>("Main-User", context.userId, context.userId)  
            if (parent.managedBy != null && vendors.some(x => parent.managedBy.includes(x.id))) {
                return "MANAGER"
            } else if (parent.merchants != null && vendors.some(x => parent.merchants.some((m:any) => m.id == x.id))) {
                return "COLLABORATOR"
            } else return null
        },
        interactions:async (parent: any, { types } : { types?: string[]}, context: serverContext) => {
            // if they're not a manager or collaborator we should return an empty array
            // if (context.userId == null) throw "A user must be present to check if case is assigned to them"
            // var { vendors } = await context.dataSources.cosmos.get_record<{ vendors: { id: string, role: string }[] }>("Main-User", context.userId, context.userId)
            // if (
            //     (parent.managedBy != null && !vendors.some(x => parent.managedBy.includes(x.id))) ||
            //     (parent.merchants != null && !vendors.some(x => parent.merchants.some((m:any) => m.id == x.id))) 
            // ) {
            //     return []
            // }
            
            // otherwise we good
            var interactions = await context.dataSources.cosmos.get_all<any>("Main-CaseInteraction", parent.id)

            if (types != null) {
                interactions = interactions.filter(x =>  types.includes(x.type))
            }

            return interactions.sort((a: caseInteraction_type, b: caseInteraction_type) => {
                var aDt = DateTime.fromISO(b.conductedAtDate)
                var bDt = DateTime.fromISO(a.conductedAtDate)
                return aDt < bDt ? -1 : aDt > bDt ? 1 : 0
            });
        },
        startedFrom: async (parent: any, _: any, context: serverContext) => {
            const { unitId, amount } = parent.startedFrom
            const option = await resolve_optionid({ field: "unit", optionId: unitId, defaultLocale: "EN"}, context);
            
            return {
                unitId,
                amount,
                descriptor: `${amount} ${option.defaultLabel}${amount > 1 ? "s": ""} ago`         
            }   
        },
        merchants: async (parent: any, _: any, context: serverContext) => {
            const merchants = await context.dataSources.cosmos.run_query<vendor_type>("Main-Vendor", {
                query: "SELECT * FROM c WHERE ARRAY_CONTAINS(@merchantIds, c.id)",
                parameters: [
                    { name: "@merchantIds", value: parent.merchantIds}
                ]
            }, true)

            return merchants;
        },
        balance: async(parent: any, _: any, context: serverContext) => {
            // this hould add up all the outstanding invoices
            const invoices = await context.dataSources.cosmos.run_query<order_type>("Main-Orders", {
                query: `
                    SELECT VALUE c 
                    FROM c 
                    JOIN l in c.lines 
                    WHERE 
                        c.forObject.id = @caseId
                        AND l.target = @target`,
                parameters: [
                    { name: '@caseId', value: parent.id },
                    { name: '@target', value: "CASE-INVOICE-LINE" }
                ]
            }, true)

            const total = invoices.reduce((acc, invoice) => {
                const outstanding = 
                    invoice.lines
                           .filter(x =>  
                                !isEmpty(x.price_log) 
                                && (x.paid_status_log.some(y => y.label == "PAID") == false)
                           )
                           .map((line) => {
                              const price = line.price_log.reduce((prev, pl) => prev + pl.price.amount, 0)
                              return price;
                           })
                
                return acc + outstanding.reduce((acc, x) => acc + x, 0)
            }, 0)

            return {
                amount: total,
                currency: "AUD"
            }
        },
        releaseOffer: async (parent: case_type, _: any, context: serverContext) => {

            const offers = await context.dataSources.cosmos.run_query<caseOffer_type>("Main-CaseOffers", {
                query: `
                    SELECT VALUE c
                    FROM c
                    WHERE c.caseId = @caseId
                          and c.type = 'RELEASE'
                          and IS_NULL(c.acceptedOn)
                          and IS_NULL(c.rejectedOn)`,
                parameters: [
                    { name: "@caseId", value: parent.id}
                ]
            }, true)

            return offers[0]
        }, 
        closeOffer: async (parent: case_type, _: any, context: serverContext) => {

            const offers = await context.dataSources.cosmos.run_query<caseOffer_type>("Main-CaseOffers", {
                query: `
                    SELECT VALUE c
                    FROM c
                    WHERE c.caseId = @caseId 
                          and c.type = 'CLOSE'
                          and IS_NULL(c.acceptedOn)
                          and IS_NULL(c.rejectedOn)`,
                parameters: [
                    { name: "@caseId", value: parent.id}
                ]
            }, true)

            return offers[0]
        },
        stripeIntent: async (parent: case_type, { id } : { id: string }, _: serverContext) => {
            if (parent.stripeIntents.close.id == id) return parent.stripeIntents.close
            else if (parent.stripeIntents.release.id == id) return parent.stripeIntents.release
            else if (parent.stripeIntents.create.id == id) return parent.stripeIntents.create
            else throw "Id does not match any intents";
        }
    },
    CasePayment: {
        case: async (parent: any, _: any, context: serverContext) => {
            var caseDb = await context.dataSources.cosmos.get_record<any>("Main-Cases", parent.caseId, parent.userId) 
            return caseDb
        },
        merchant: async (parent: any, _: any, context: serverContext) => {
            var vendor = await context.dataSources.cosmos.get_record<any>("Main-Vendor", parent.merchantId, parent.merchantId) 
            return vendor
        }
    },
    CaseInteraction: {
        posted_by_vendor: async (parent: any, _: any, context: serverContext) => {
            var posted_by_vendor = await context.dataSources.cosmos.get_record<any>("Main-Vendor", parent.posted_by_vendorId, parent.posted_by_vendorId) 
            return posted_by_vendor
        },
        posted_by_user: async (parent: any, _: any, context: serverContext) => {
            var posted_by_user = await context.dataSources.cosmos.get_record<any>("Main-User", parent.posted_by_userId, parent.posted_by_userId) 
            return posted_by_user
        },
        message: async (parent: any, _: any, context: serverContext) => {
            const { type, posted_by_userId, posted_by_vendorId, ...interaction } = parent

            var message = "";

            var posted_by = await context.dataSources.cosmos.get_record<any>("Main-User", posted_by_userId, posted_by_userId)
            var posted_by_vendor = await context.dataSources.cosmos.get_record<any>("Main-Vendor", posted_by_vendorId, posted_by_vendorId) 

            switch (type) {
                case "CASE_COMMENT":
                    message = `${posted_by.firstname} (${posted_by_vendor.name}) noted “${interaction.title}”`;
                    break
                case "ACTIVITY":
                    const participants = parent.participants as { userId: string, vendorId: string }[] | null
                    if (participants == null) {
                        message = `The activity \"${interaction.title}\" was performed`
                    } else {
                        const participantsNames = await Promise.all(participants.map(async ({ userId, vendorId }) => {
                            var user = await context.dataSources.cosmos.get_record<any>("Main-User", userId, userId)
                            var vendor = await context.dataSources.cosmos.get_record<any>("Main-Vendor", vendorId, vendorId)
                            return `${user.firstname} (${vendor.name})`
                        }))
                        message = `${ participantsNames.join(",") } conducted \"${interaction.title}\"`
                    }
                    break
                case "RECORD_FEE" :
                    message = `A fee of ${interaction.fee} has been requested from the customer.`
                    break
                default:
                    message = `No message template for type ${type}`;
                    break
            }

            return message
        },
        ref: async (parent: any, _: any, _context: serverContext) => {
           return {
                id: parent.id, partition: [parent.caseRef.id], container: "Main-CaseInteraction"
           } 
        }
    },
    CaseOffer: {
        ref: async(parent:any, _:any, _context:serverContext) => {
            return {
                id: parent.id, partition: [parent.caseId], container: "Main-CaseOffers"
            }
        },
        merchant: async (parent: any, _: any, context: serverContext) => {
            if (!isNullOrWhiteSpace(parent.merchantId)) {
                const merchantRecord = await context.dataSources.cosmos.get_record("Main-Vendor", parent.merchantId as string, parent.merchantId as string)
                return {
                    ref: {
                        id: parent.merchantId,
                        partition: [parent.merchantId],
                        container: "Main-Merchant"
                    },
                    name: (merchantRecord as vendor_type).name
                }
            } else {
                return null
            }
        },
        case: async(parent: any, _: any, context: serverContext) => {
            const caseRecord = await context.dataSources.cosmos.get_record("Main-Cases", parent.caseId, parent.caseId)
            return caseRecord
        },
        order: async(parent: any, _: any, context: serverContext) => {
            // if the offer is an application we don't have an order
            if (parent.type == "APPLICATION") return null; 
            if (parent.merchantResponded != null && parent.merchantResponded == false) return null;
            // lets work out the customer email from the case
            const caseRecord = await context.dataSources.cosmos.get_record<case_type>("Main-Cases", parent.caseId, parent.caseId)
            const customerEmail = caseRecord.contact.email
            // now we find the order via looking at the lines for object
            const order = await context.dataSources.cosmos.run_query<order_type>("Main-Orders", {
                query: `
                    SELECT VALUE o
                    FROM o
                    JOIN l in o.lines
                    WHERE l.forObject.id = @offerId
                          AND o.customerEmail = @customerEmail
                `,
                parameters: [
                    { name: "@offerId", value: parent.id },
                    { name: "@customerEmail", value: customerEmail}
                ]
            }, true)  

            return order.length > 0 ? order[0] : null
        },
    },
    Fee: {
        activities: async (parent: any, _: any, context: serverContext) => {
            const activities = await context.dataSources.cosmos.run_query<any>("Main-CaseInteraction", {
                query: `
                    SELECT * FROM c WHERE ARRAY_CONTAINS(@activityIds, c.id)
                `,
                parameters: [
                    {
                        name: "@activityIds",
                        value: parent.activityIds
                    }
                ]
            }, true)
            return activities
        }
    },
    StartedFrom: {
        unit: async(parent: any, _: any, context: serverContext) => {
            return await resolve_optionid({ defaultLocale: "EN", optionId: parent.unitId, field: "unit"}, context)
        }
    }
}

export const case_business_logic = {
    release_case: async (caseId: string, cosmos: CosmosDataSource, signalR: signalRManager, logger: LogManager) => {
        const caseFromDB = await cosmos.get_record<case_type>("Main-Cases", caseId, caseId)
        const merchantUserIds = (await merchants_users(cosmos, caseFromDB.managedBy)).map(x => x.id)

        let operations : PatchOperation[] = [
            { op: "set", value: "NEW", path: "/caseStatus"},
            { op: "set", value: [], path: "/managedBy"},
            { op: "set", value: [], path: "/merchantIds"}
        ]

        if (caseFromDB.release_status !== undefined) {
            operations.push({ op: "remove", path: "/release_status"})
        }

        await cosmos.patch_record("Main-Cases", 
            caseId, caseId, 
            operations, "STRIPE"
        )

        logger.logMessage(`Sending realtime notification to update the case status to RELEASE`);
        signalR.addDataMessage("caseStatus",
        {
            id: caseFromDB.trackingCode,
            status: caseFromDB.caseStatus
        }, { action: DataAction.UPSERT, userId: caseFromDB.trackingCode })
        
        for(var userId of merchantUserIds) {
            signalR.addNotificationMessage(
                `Case ${caseFromDB.code} successfully released. New investigator will now be found`, 
                { userId, status: "success" })
        }
    },
    close_case: async (caseId: string, cosmos: CosmosDataSource, signalR: signalRManager, logger: LogManager) => {
        const caseFromDB = await cosmos.get_record<case_type>("Main-Cases", caseId, caseId)
        const merchantUserIds = (await merchants_users(cosmos, caseFromDB.managedBy)).map(x => x.id)

        let operations : PatchOperation[] = [
            { op: "set", value: "CLOSED", path: "/caseStatus"}
        ]

        if (caseFromDB.release_status !== undefined) {
            operations.push({ op: "remove", path: "/release_status"})
        }

        await cosmos.patch_record("Main-Cases", 
            caseId, caseId, 
            operations, "STRIPE"
        )

        logger.logMessage(`Sending realtime notification to update the case status to CLOSED`);
        signalR.addDataMessage("caseStatus",
        {
            id: caseFromDB.trackingCode,
            status: caseFromDB.caseStatus
        }, { action: DataAction.UPSERT, userId: caseFromDB.trackingCode })
        
        for(var userId of merchantUserIds) {
            signalR.addNotificationMessage(
                `Case ${caseFromDB.code} successfully closed.`, 
                { userId, status: "success" })
        }
    }
}

export { resolvers }
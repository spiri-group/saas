import { HTTPMethod, PatchOperation } from "@azure/cosmos";
import { serverContext } from "../../services/azFunction";
import { v4 as uuidv4 } from 'uuid';
import { GraphQLError } from 'graphql';
import { address_type, user_type } from "./types";
import { isNullOrUndefined, isNullOrWhiteSpace, mergeDeep } from "../../utils/functions";
import { CosmosDataSource } from "../../utils/database";

const resolvers = {
    Query: {
        me: async (_: any, __: any, context: serverContext) => {
            if (context.userId == null) return null;
            
            let dbUser = await context.dataSources.cosmos.get_record("Main-User", context.userId, context.userId)
            if (dbUser == null) {
                // we will create them with default currency
                dbUser = await context.dataSources.cosmos.add_record("Main-User", {
                    id: context.userId,
                    requiresSetup: true,
                    currency: "USD"
                }, context.userId, context.userId);
            }

            return dbUser;
        },
        user: async (_: any, args: any, context: serverContext) => {
            if (args.email == null && args.id == null) throw "Must provide either email or id to query user";

            if (args.id != null) {
                if (await context.dataSources.cosmos.record_exists("Main-User", args.id, args.id)) {
                    return await context.dataSources.cosmos.get_record("Main-User", args.id, args.id)
                } else {
                    return null
                }
            } else if (args.email != null) {
                const query = `SELECT * FROM l WHERE l.email = @email`
                const parameters = [{ name: "@email", value: args.email }]
                const result = await context.dataSources.cosmos.run_query("Main-User", {
                    query: query,
                    parameters
                })

                if (result.length > 0) {
                    return result[0]
                }
            }

            return null;
        },     
        users: async (_: any, args: any, context: serverContext) => {
            if (args.emails == null) throw "Must provide a list of emails to resolve";
            
            const query = `SELECT * FROM l WHERE ARRAY_CONTAINS(@emails, l.email, true)`
            const parameters = [{ name: "@emails", value: args.emails }]
            const result = await context.dataSources.cosmos.run_query("Main-User", {
                query: query,
                parameters
            })

            if (result.length > 0) {
                return result
            }

            return null;
        },
        customers: async (_: any, __: any, context: serverContext) => {
            return await context.dataSources.cosmos.get_all("Main-User")
        },
        customer: async (_: any, args: any, __: any, context: serverContext) => {
            return await context.dataSources.cosmos.get_record("Main-User", args.id, args.id)
        },
        userAddress: async (_: any, args: {
            userId: string;
            addressId: string;
        }, context: serverContext) => {
            const user = await context.dataSources.cosmos.get_record<user_type>("Main-User", args.userId, args.userId)
            return user.addresses.find(x => x.id === args.addressId)
        }
    },
    Mutation: {
        create_user: async(_: any, _args: any, context: serverContext) => {
            if (context.userEmail == null) throw "Create user requires an email";

            await user_business_logic.create(context.userEmail, context.dataSources.cosmos)            
            
            return true
        },
        update_user: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            // Check if this is a full profile update (has name/address) or a partial update (e.g., spiritual interests only)
            const isFullProfileUpdate = args.customer.firstname && args.customer.lastname;

            const address = isFullProfileUpdate ? {
                firstname: args.customer.firstname,
                lastname: args.customer.lastname,
                phoneNumber: args.customer.phoneNumber,
                address: args.customer.address,
                isDefault: true
            } : null;

            delete args.customer.address
            delete args.customer.phoneNumber

            await context.dataSources.cosmos.update_record("Main-User", args.customer.id, args.customer.id, args.customer, context.userId)
            const user = await context.dataSources.cosmos.get_record<user_type>("Main-User", args.customer.id, args.customer.id)

            // Only create Stripe customer if this is a full profile update with name
            if (user.stripe == null && isFullProfileUpdate) {

                // lets also create the user in stripe just in case they want to make personal purchases
                var createStripeCustomerAccountResp = await context.dataSources.stripe.callApi(HTTPMethod.post, "customers", {
                    "email": user.email,
                    "name": user.firstname + " " + user.lastname
                })
                if (createStripeCustomerAccountResp.status != 200) {
                    throw new GraphQLError(`Error creating customer in Stripe.`, {
                        extensions: { code: 'BAD_REQUEST'},
                    });
                }

                const userContainer = await context.dataSources.cosmos.get_container("Main-User")
                const operations : PatchOperation[] = [
                    { op: "add", path: `/stripe`,
                        value:  {
                            customerId: createStripeCustomerAccountResp.data.id,
                        }
                    }
                ]
                await userContainer.item(user.id, user.id).patch(operations)
            }

            // Only update requiresInput and address for full profile updates
            if (user.requiresInput && isFullProfileUpdate && address) {
                const userContainer = await context.dataSources.cosmos.get_container("Main-User")
                const operations : PatchOperation[] = [
                    { op: "set", path: `/requiresInput`, value: false },
                    { op: "set", path: `/addresses`, value: [{
                        id: uuidv4(),
                        ...address
                    }]}
                ]
                await userContainer.item(user.id, user.id).patch(operations)
            }

            return {
                code: "200",
                success: true,
                message: `Customer ${args.customer.id} successfully updated`,
                customer: await context.dataSources.cosmos.get_record("Main-User", args.customer.id, args.customer.id)
            }
        },
        delete_user: async (_: any, args: { userId: string }, context: serverContext) => {
            // Verify user is authenticated
            if (context.userId == null) {
                throw new GraphQLError('User must be authenticated to delete a user', {
                    extensions: { code: 'UNAUTHENTICATED' },
                });
            }

            // Verify the current user is deleting their own account
            if (context.userId !== args.userId) {
                throw new GraphQLError('You can only delete your own account', {
                    extensions: { code: 'FORBIDDEN' },
                });
            }

            // Get the user to verify it exists
            const user = await context.dataSources.cosmos.get_record<user_type>(
                "Main-User",
                args.userId,
                args.userId
            );

            if (!user) {
                throw new GraphQLError(`User with ID ${args.userId} not found`, {
                    extensions: { code: 'NOT_FOUND' },
                });
            }

            // Check if user has any active vendors
            if (user.vendors && user.vendors.length > 0) {
                throw new GraphQLError(
                    'Cannot delete user with active vendors. Please delete all vendors first.',
                    {
                        extensions: { code: 'BAD_REQUEST' },
                    }
                );
            }

            // Delete the user document
            await context.dataSources.cosmos.delete_record(
                "Main-User",
                args.userId,
                args.userId,
                context.userId
            );

            return {
                code: '200',
                success: true,
                message: `User ${user.email} (${args.userId}) successfully deleted`
            };
        },
        purge_user: async (_: any, args: { userId: string }, context: serverContext) => {
            // This mutation is for TEST CLEANUP ONLY
            // It bypasses vendor checks and also cleans up auth entries

            // Verify user is authenticated
            if (context.userId == null) {
                throw new GraphQLError('User must be authenticated to purge a user', {
                    extensions: { code: 'UNAUTHENTICATED' },
                });
            }

            // Verify the current user is purging their own account
            if (context.userId !== args.userId) {
                throw new GraphQLError('You can only purge your own account', {
                    extensions: { code: 'FORBIDDEN' },
                });
            }

            // Get the user to verify it exists
            const user = await context.dataSources.cosmos.get_record<user_type>(
                "Main-User",
                args.userId,
                args.userId
            );

            if (!user) {
                return {
                    code: '404',
                    success: false,
                    message: `User ${args.userId} not found - may already be deleted`
                };
            }

            context.logger.logMessage(`[PURGE] Starting purge for user: ${user.email} (${args.userId})`);

            // HARD DELETE associated vendors (if any) - no error if this fails
            if (user.vendors && user.vendors.length > 0) {
                context.logger.logMessage(`[PURGE] Purging ${user.vendors.length} vendors for user ${user.email}`);
                for (const vendorRef of user.vendors) {
                    try {
                        // Fetch full vendor to get Stripe IDs
                        const vendor = await context.dataSources.cosmos.get_record<any>(
                            "Main-Vendor",
                            vendorRef.id,
                            vendorRef.id
                        );

                        // Delete Stripe accounts before purging vendor
                        if (vendor?.stripe?.accountId) {
                            try {
                                await context.dataSources.stripe.callApi(HTTPMethod.delete, `accounts/${vendor.stripe.accountId}`, null);
                                context.logger.logMessage(`[PURGE] Deleted Stripe connected account ${vendor.stripe.accountId}`);
                            } catch (stripeError) {
                                context.logger.error(`[PURGE] Failed to delete Stripe account ${vendor.stripe.accountId}: ${stripeError}`);
                            }
                        }
                        if (vendor?.stripe?.customerId) {
                            try {
                                await context.dataSources.stripe.callApi(HTTPMethod.delete, `customers/${vendor.stripe.customerId}`, null);
                                context.logger.logMessage(`[PURGE] Deleted Stripe customer ${vendor.stripe.customerId}`);
                            } catch (stripeError) {
                                context.logger.error(`[PURGE] Failed to delete Stripe customer ${vendor.stripe.customerId}: ${stripeError}`);
                            }
                        }

                        // CASCADE DELETE: Purge all listings for this vendor
                        try {
                            const listings = await context.dataSources.cosmos.get_all<{ id: string }>("Main-Listing", vendorRef.id);
                            if (listings.length > 0) {
                                context.logger.logMessage(`[PURGE] Deleting ${listings.length} listings for vendor ${vendorRef.id}`);
                                for (const listing of listings) {
                                    try {
                                        await context.dataSources.cosmos.purge_record("Main-Listing", listing.id, vendorRef.id);
                                    } catch (err) {
                                        context.logger.error(`[PURGE] Failed to delete listing ${listing.id}: ${err}`);
                                    }
                                }
                            }
                        } catch (listingError) {
                            context.logger.error(`[PURGE] Failed to clean up listings for vendor ${vendorRef.id}: ${listingError}`);
                        }

                        // CASCADE DELETE: Purge all social posts for this vendor
                        try {
                            const socialPosts = await context.dataSources.cosmos.get_all<{ id: string }>("Main-SocialPost", vendorRef.id);
                            if (socialPosts.length > 0) {
                                context.logger.logMessage(`[PURGE] Deleting ${socialPosts.length} social posts for vendor ${vendorRef.id}`);
                                for (const post of socialPosts) {
                                    try {
                                        await context.dataSources.cosmos.purge_record("Main-SocialPost", post.id, vendorRef.id);
                                    } catch (err) {
                                        context.logger.error(`[PURGE] Failed to delete social post ${post.id}: ${err}`);
                                    }
                                }
                            }
                        } catch (socialError) {
                            context.logger.error(`[PURGE] Failed to clean up social posts for vendor ${vendorRef.id}: ${socialError}`);
                        }

                        // CASCADE DELETE: Purge all vendor settings (testimonials) for this vendor
                        try {
                            const vendorSettings = await context.dataSources.cosmos.get_all<{ id: string }>("Main-VendorSettings", vendorRef.id);
                            if (vendorSettings.length > 0) {
                                context.logger.logMessage(`[PURGE] Deleting ${vendorSettings.length} vendor settings for vendor ${vendorRef.id}`);
                                for (const setting of vendorSettings) {
                                    try {
                                        await context.dataSources.cosmos.purge_record("Main-VendorSettings", setting.id, vendorRef.id);
                                    } catch (err) {
                                        context.logger.error(`[PURGE] Failed to delete vendor setting ${setting.id}: ${err}`);
                                    }
                                }
                            }
                        } catch (settingsError) {
                            context.logger.error(`[PURGE] Failed to clean up vendor settings for vendor ${vendorRef.id}: ${settingsError}`);
                        }

                        // CASCADE DELETE: Purge all bookings for this vendor
                        try {
                            const vendorBookingsQuery = {
                                query: "SELECT c.id, c.type, c.customerEmail FROM c WHERE c.vendorId = @vendorId",
                                parameters: [{ name: "@vendorId", value: vendorRef.id }]
                            };
                            const vendorBookings = await context.dataSources.cosmos.run_query<{ id: string; type: string; customerEmail: string }>("Main-Bookings", vendorBookingsQuery);
                            if (vendorBookings.length > 0) {
                                context.logger.logMessage(`[PURGE] Deleting ${vendorBookings.length} bookings for vendor ${vendorRef.id}`);
                                for (const booking of vendorBookings) {
                                    try {
                                        await context.dataSources.cosmos.purge_record("Main-Bookings", booking.id, [booking.type, booking.customerEmail]);
                                    } catch (err) {
                                        context.logger.error(`[PURGE] Failed to delete booking ${booking.id}: ${err}`);
                                    }
                                }
                            }
                        } catch (bookingsError) {
                            context.logger.error(`[PURGE] Failed to clean up bookings for vendor ${vendorRef.id}: ${bookingsError}`);
                        }

                        await context.dataSources.cosmos.purge_record(
                            "Main-Vendor",
                            vendorRef.id,
                            vendorRef.id
                        );
                        context.logger.logMessage(`[PURGE] Purged vendor ${vendorRef.id}`);
                    } catch (error) {
                        context.logger.error(`[PURGE] Failed to purge vendor ${vendorRef.id}: ${error}`);
                        // Continue anyway - we want to purge the user even if vendor deletion fails
                    }
                }
            }

            // HARD DELETE all PersonalSpace documents for this user (reading requests, journals, etc.)
            try {
                const personalSpaceQuery = {
                    query: "SELECT c.id FROM c WHERE c.userId = @userId",
                    parameters: [{ name: "@userId", value: args.userId }]
                };
                const personalSpaceDocs = await context.dataSources.cosmos.run_query<{ id: string }>(
                    "Main-PersonalSpace",
                    personalSpaceQuery
                );

                if (personalSpaceDocs.length > 0) {
                    context.logger.logMessage(`[PURGE] Deleting ${personalSpaceDocs.length} PersonalSpace documents for user ${user.email}`);
                    for (const doc of personalSpaceDocs) {
                        try {
                            await context.dataSources.cosmos.purge_record(
                                "Main-PersonalSpace",
                                doc.id,
                                args.userId // partition key is userId
                            );
                        } catch (docError) {
                            context.logger.error(`[PURGE] Failed to delete PersonalSpace doc ${doc.id}: ${docError}`);
                        }
                    }
                    context.logger.logMessage(`[PURGE] Deleted PersonalSpace documents`);
                }
            } catch (error) {
                context.logger.error(`[PURGE] Failed to clean up PersonalSpace: ${error}`);
                // Continue anyway - we still want to purge the user
            }

            // CASCADE DELETE: Purge all orders placed by this user (cross-partition query)
            try {
                const ordersQuery = {
                    query: "SELECT c.id FROM c WHERE c.userId = @userId AND c.docType = 'ORDER'",
                    parameters: [{ name: "@userId", value: args.userId }]
                };
                const orders = await context.dataSources.cosmos.run_query<{ id: string }>(
                    "Main-Orders",
                    ordersQuery
                );

                if (orders.length > 0) {
                    context.logger.logMessage(`[PURGE] Deleting ${orders.length} orders for user ${user.email}`);
                    for (const order of orders) {
                        try {
                            // Orders are partitioned by their own ID
                            await context.dataSources.cosmos.purge_record("Main-Orders", order.id, order.id);
                        } catch (orderError) {
                            context.logger.error(`[PURGE] Failed to delete order ${order.id}: ${orderError}`);
                        }
                    }
                    context.logger.logMessage(`[PURGE] Deleted orders`);
                }
            } catch (error) {
                context.logger.error(`[PURGE] Failed to clean up orders: ${error}`);
                // Continue anyway - we still want to purge the user
            }

            // CASCADE DELETE: Purge all bookings made by this user as customer (cross-partition query)
            try {
                const bookingsQuery = {
                    query: "SELECT c.id, c.type, c.customerEmail FROM c WHERE c.customerEmail = @email",
                    parameters: [{ name: "@email", value: user.email }]
                };
                const bookings = await context.dataSources.cosmos.run_query<{ id: string; type: string; customerEmail: string }>(
                    "Main-Bookings",
                    bookingsQuery
                );

                if (bookings.length > 0) {
                    context.logger.logMessage(`[PURGE] Deleting ${bookings.length} bookings for user ${user.email}`);
                    for (const booking of bookings) {
                        try {
                            // Bookings are partitioned by [type, customerEmail]
                            await context.dataSources.cosmos.purge_record("Main-Bookings", booking.id, [booking.type, booking.customerEmail]);
                        } catch (bookingError) {
                            context.logger.error(`[PURGE] Failed to delete booking ${booking.id}: ${bookingError}`);
                        }
                    }
                    context.logger.logMessage(`[PURGE] Deleted bookings`);
                }
            } catch (error) {
                context.logger.error(`[PURGE] Failed to clean up bookings: ${error}`);
                // Continue anyway - we still want to purge the user
            }

            // HARD DELETE the user document from Cosmos DB
            await context.dataSources.cosmos.purge_record(
                "Main-User",
                args.userId,
                args.userId
            );

            context.logger.logMessage(`[PURGE] Deleted user document from Cosmos DB`);

            // Clean up Azure Table Storage auth entries (for test cleanup)
            // Auth.js azure-tables-adapter schema:
            // - Users: pk='user' rk=userId, pk='userByEmail' rk=email
            // - Sessions: pk='session' rk=sessionToken, pk='sessionByUserId' rk=userId
            try {
                const tableStorage = context.dataSources.tableStorage;

                // Delete user entries from auth table
                try {
                    await tableStorage.deleteEntity('auth', 'user', args.userId);
                    context.logger.logMessage(`[PURGE] Deleted user auth entry (pk=user)`);
                } catch (error) {
                    // Expected if user was created via different auth flow
                }

                // Delete userByEmail index entry
                try {
                    await tableStorage.deleteEntity('auth', 'userByEmail', user.email);
                    context.logger.logMessage(`[PURGE] Deleted userByEmail auth entry`);
                } catch (error) {
                    // Expected if user was created via different auth flow
                }

                // Find sessions via sessionByUserId index and delete them
                try {
                    // First get session tokens from the sessionByUserId index
                    const sessionIndex = await tableStorage.queryEntities<{ rowKey: string; sessionToken?: string }>('auth', `PartitionKey eq 'sessionByUserId' and RowKey eq '${args.userId}'`);
                    context.logger.logMessage(`[PURGE] Found ${sessionIndex.length} session index entries`);

                    for (const indexEntry of sessionIndex) {
                        const sessionToken = indexEntry.sessionToken || indexEntry.rowKey;
                        // Delete the main session entry
                        try {
                            await tableStorage.deleteEntity('auth', 'session', sessionToken);
                            context.logger.logMessage(`[PURGE] Deleted session ${sessionToken}`);
                        } catch (e) {
                            // Session may already be expired/deleted
                        }
                        // Delete the sessionByUserId index entry
                        try {
                            await tableStorage.deleteEntity('auth', 'sessionByUserId', args.userId);
                        } catch (e) {
                            // Index entry may already be deleted
                        }
                    }
                } catch (error) {
                    // Sessions may not exist or already be cleaned up
                }
            } catch (error) {
                // Auth storage cleanup is best-effort - continue anyway
                context.logger.logMessage(`[PURGE] Auth storage cleanup skipped: ${error}`);
            }

            context.logger.logMessage(`[PURGE] Successfully purged user: ${user.email} (${args.userId})`);

            return {
                code: '200',
                success: true,
                message: `User ${user.email} (${args.userId}) successfully purged (Cosmos DB + Auth Storage)`
            };
        },
        upsert_address: async(_, args, context: serverContext) => {
            
            const user = await context.dataSources.cosmos.get_record<user_type>("Main-User", args.customerId, args.customerId)
            const existingAddressIndex = isNullOrWhiteSpace(args.address.id) ? -1 : user.addresses.findIndex(x => x.id === args.address.id)
            const addressId = args.address.id ?? uuidv4()

            let opPerformed = undefined as "added" | "updated" | undefined
            if (existingAddressIndex !== -1) {
                opPerformed = "updated"

                const mergedAddress = mergeDeep(
                    user.addresses[existingAddressIndex],
                    args.address
                )

                await context.dataSources.cosmos.patch_record("Main-User", args.customerId, args.customerId, [
                    {
                        op: "set",
                        path: `/addresses/${existingAddressIndex}`,
                        value: mergedAddress
                    }
                ], context.userId)
                
            } else {
                opPerformed = "added"
    
                await context.dataSources.cosmos.patch_record("Main-User", args.customerId, args.customerId, [
                    {
                        op: "add",
                        path: "/addresses/-",
                        value: {
                            id: addressId,
                            ...args.address,
                            isDefault: false
                        }
                    }
                ], context.userId)
            }

            const updatedUser = await context.dataSources.cosmos.get_record<user_type>("Main-User", args.customerId, args.customerId)
            const updatedAddress = updatedUser.addresses.find(x => x.id === addressId)
    
            return {
                code: 200,
                message: `Address ${addressId} successfully ${opPerformed} for user ${args.customerId}`,
                address: updatedAddress
            }
        },
        remove_address: async (_: any, args: { customerId: string; addressId: string }, context: serverContext) => {
           
            const user = await context.dataSources.cosmos.get_record<user_type>("Main-User", args.customerId, args.customerId)
            const existingAddressIndex = user.addresses.findIndex(x => x.id === args.addressId)
        
            await context.dataSources.cosmos.patch_record("Main-User", args.customerId, args.customerId, 
            [
                {
                    op: "remove",
                    path: `/addresses/${existingAddressIndex}`
                }
            ], context.userId)
        
            return {
                code: "200",
                success: true,
                message: `Address ${args.addressId} successfully removed`
            }
        },                
        set_default_address: async (_: any, args:  { customerId: string; addressId: string }, context: serverContext) => {
            const user = await context.dataSources.cosmos.get_record<user_type>("Main-User", args.customerId, args.customerId);
            const currentDefaultIndex = user.addresses.findIndex(x => x.isDefault)
            const newDefaultIndex = user.addresses.findIndex(x => x.id === args.addressId)
            
            if (newDefaultIndex !== -1) {
                const operations = []

                if (currentDefaultIndex !== -1) {
                    operations.push({
                        op: "set",
                        path: `/addresses/${currentDefaultIndex}/isDefault`,
                        value: false
                    })
                }
                
                operations.push({
                    op: "set",
                    path: `/addresses/${newDefaultIndex}/isDefault`,
                    value: true
                })
                
                await context.dataSources.cosmos.patch_record("Main-User", args.customerId, args.customerId, operations, context.userId)
                
                return {
                    code: "200",
                    success: true,
                    message: `Address ${args.addressId} successfully set as default`
                }
            } 
        }, 
        upsert_deliveryInstructions: async (_, args: { customerId: string, addressId: string, deliveryInstructions: any }, context: serverContext) => {
            const user = await context.dataSources.cosmos.get_record<user_type>("Main-User", args.customerId, args.customerId)
            const existingAddressIndex = args.addressId ? user.addresses.findIndex(x => x.id === args.addressId) : -1
        
            if (existingAddressIndex === -1) {
                throw new GraphQLError(`Address ${args.addressId} not found for user ${args.customerId}`, {
                    extensions: { code: 'BAD_REQUEST' }
                })
            }
        
            let opPerformed = undefined as "added" | "updated" | undefined;
        
            if (existingAddressIndex !== -1) {
                opPerformed = "updated"
        
                const mergedDeliveryInstructions = mergeDeep(
                    user.addresses[existingAddressIndex].deliveryInstructions|| {},
                    args.deliveryInstructions
                )
    
                await context.dataSources.cosmos.patch_record("Main-User", args.customerId, args.customerId, [
                    {
                        op: "set",
                        path: `/addresses/${existingAddressIndex}/deliveryInstructions`,
                        value: mergedDeliveryInstructions
                    }
                ], context.userId)
        
            } else {
                opPerformed = "added";
        
                await context.dataSources.cosmos.patch_record("Main-User", args.customerId, args.customerId, [
                    {
                        op: "add",
                        path: `/addresses/${existingAddressIndex}/deliveryInstructions`,
                        value: args.deliveryInstructions
                    }
                ], context.userId)
            }
        
            const updatedUser = await context.dataSources.cosmos.get_record<user_type>("Main-User", args.customerId, args.customerId)
            const updatedAddress = updatedUser.addresses.find(x => x.id === args.addressId)
        
            return {
                code: 200,
                message: `Delivery instructions for address ${args.addressId} successfully ${opPerformed} for customer ${args.customerId}`,
                address: updatedAddress
            }
        },
        // User card management mutations
        create_user_card_setup_intent: async (_: any, args: { userId: string }, context: serverContext) => {
            if (context.userId == null) {
                throw new GraphQLError('User must be authenticated', {
                    extensions: { code: 'UNAUTHENTICATED' },
                });
            }

            // Verify the user is creating a setup intent for their own account
            if (context.userId !== args.userId) {
                throw new GraphQLError('You can only create setup intents for your own account', {
                    extensions: { code: 'FORBIDDEN' },
                });
            }

            const user = await context.dataSources.cosmos.get_record<user_type>(
                "Main-User",
                args.userId,
                args.userId
            );

            if (!user) {
                throw new GraphQLError('User not found', {
                    extensions: { code: 'NOT_FOUND' },
                });
            }

            // If user doesn't have a Stripe customer ID, create one
            let stripeCustomerId = user.stripe?.customerId;
            if (!stripeCustomerId) {
                const createCustomerResp = await context.dataSources.stripe.callApi(
                    HTTPMethod.post,
                    'customers',
                    {
                        email: user.email,
                        name: `${user.firstname || ''} ${user.lastname || ''}`.trim() || user.email,
                        metadata: {
                            userId: args.userId,
                            type: 'personal_space_user'
                        }
                    }
                );

                if (createCustomerResp.status !== 200) {
                    throw new GraphQLError('Failed to create Stripe customer', {
                        extensions: { code: 'INTERNAL_SERVER_ERROR' },
                    });
                }

                stripeCustomerId = createCustomerResp.data.id;

                // Store the customer ID on the user
                await context.dataSources.cosmos.patch_record(
                    "Main-User",
                    args.userId,
                    args.userId,
                    [{ op: "add", path: "/stripe", value: { customerId: stripeCustomerId } }],
                    context.userId
                );
            }

            // Create setup intent for the customer
            const setupIntentResp = await context.dataSources.stripe.callApi(
                HTTPMethod.post,
                'setup_intents',
                {
                    customer: stripeCustomerId,
                    payment_method_types: ['card'],
                    usage: 'off_session',
                    metadata: {
                        userId: args.userId,
                        purpose: 'user_payment_method'
                    }
                }
            );

            if (setupIntentResp.status !== 200) {
                throw new GraphQLError('Failed to create card setup intent', {
                    extensions: { code: 'INTERNAL_SERVER_ERROR' },
                });
            }

            return {
                code: '200',
                success: true,
                message: 'Card setup intent created',
                clientSecret: setupIntentResp.data.client_secret
            };
        },
        delete_user_card: async (_: any, args: { userId: string; paymentMethodId: string }, context: serverContext) => {
            if (context.userId == null) {
                throw new GraphQLError('User must be authenticated', {
                    extensions: { code: 'UNAUTHENTICATED' },
                });
            }

            if (context.userId !== args.userId) {
                throw new GraphQLError('You can only delete cards from your own account', {
                    extensions: { code: 'FORBIDDEN' },
                });
            }

            const user = await context.dataSources.cosmos.get_record<user_type>(
                "Main-User",
                args.userId,
                args.userId
            );

            if (!user?.stripe?.customerId) {
                throw new GraphQLError('User has no payment methods', {
                    extensions: { code: 'NOT_FOUND' },
                });
            }

            // Detach the payment method from the customer
            const detachResp = await context.dataSources.stripe.callApi(
                HTTPMethod.post,
                `payment_methods/${args.paymentMethodId}/detach`,
                {}
            );

            if (detachResp.status !== 200) {
                throw new GraphQLError('Failed to delete payment method', {
                    extensions: { code: 'INTERNAL_SERVER_ERROR' },
                });
            }

            return {
                code: '200',
                success: true,
                message: 'Payment method deleted successfully'
            };
        },
        set_default_user_card: async (_: any, args: { userId: string; paymentMethodId: string }, context: serverContext) => {
            if (context.userId == null) {
                throw new GraphQLError('User must be authenticated', {
                    extensions: { code: 'UNAUTHENTICATED' },
                });
            }

            if (context.userId !== args.userId) {
                throw new GraphQLError('You can only set default cards for your own account', {
                    extensions: { code: 'FORBIDDEN' },
                });
            }

            const user = await context.dataSources.cosmos.get_record<user_type>(
                "Main-User",
                args.userId,
                args.userId
            );

            if (!user?.stripe?.customerId) {
                throw new GraphQLError('User has no payment methods', {
                    extensions: { code: 'NOT_FOUND' },
                });
            }

            // Set default payment method on Stripe customer
            const updateResp = await context.dataSources.stripe.callApi(
                HTTPMethod.post,
                `customers/${user.stripe.customerId}`,
                {
                    'invoice_settings[default_payment_method]': args.paymentMethodId
                }
            );

            if (updateResp.status !== 200) {
                throw new GraphQLError('Failed to set default payment method', {
                    extensions: { code: 'INTERNAL_SERVER_ERROR' },
                });
            }

            return {
                code: '200',
                success: true,
                message: 'Default payment method updated successfully'
            };
        },

        /**
         * TEST ONLY: Add a test card to a user's Stripe customer account.
         * Uses Stripe's test token tok_visa for a test Visa card.
         * ONLY works in Stripe test mode.
         */
        add_test_card_for_user: async (_: any, args: { userId: string }, context: serverContext) => {
            if (context.userId == null) {
                throw new GraphQLError('User must be authenticated', {
                    extensions: { code: 'UNAUTHENTICATED' },
                });
            }

            // Verify the user is adding a card to their own account
            if (context.userId !== args.userId) {
                throw new GraphQLError('You can only add cards to your own account', {
                    extensions: { code: 'FORBIDDEN' },
                });
            }

            const user = await context.dataSources.cosmos.get_record<user_type>(
                "Main-User",
                args.userId,
                args.userId
            );

            if (!user) {
                return {
                    success: false,
                    message: 'User not found'
                };
            }

            // If user doesn't have a Stripe customer ID, create one
            let stripeCustomerId = user.stripe?.customerId;
            if (!stripeCustomerId) {
                const createCustomerResp = await context.dataSources.stripe.callApi(
                    HTTPMethod.post,
                    'customers',
                    {
                        email: user.email,
                        name: `${user.firstname || ''} ${user.lastname || ''}`.trim() || user.email,
                        metadata: {
                            userId: args.userId,
                            type: 'personal_space_user'
                        }
                    }
                );

                if (createCustomerResp.status !== 200) {
                    return {
                        success: false,
                        message: 'Failed to create Stripe customer'
                    };
                }

                stripeCustomerId = createCustomerResp.data.id;

                // Store the customer ID on the user
                user.stripe = { customerId: stripeCustomerId };
                await context.dataSources.cosmos.update_record(
                    "Main-User",
                    args.userId,
                    args.userId,
                    user,
                    context.userId
                );
            }

            // Create a payment method using Stripe's test token
            // tok_visa is a Stripe test token that creates a test Visa card
            const createPmResp = await context.dataSources.stripe.callApi(
                HTTPMethod.post,
                'payment_methods',
                {
                    type: 'card',
                    'card[token]': 'tok_visa'
                }
            );

            if (createPmResp.status !== 200) {
                return {
                    success: false,
                    message: 'Failed to create test payment method'
                };
            }

            const paymentMethodId = createPmResp.data.id;

            // Attach the payment method to the customer
            const attachResp = await context.dataSources.stripe.callApi(
                HTTPMethod.post,
                `payment_methods/${paymentMethodId}/attach`,
                {
                    customer: stripeCustomerId
                }
            );

            if (attachResp.status !== 200) {
                return {
                    success: false,
                    message: 'Failed to attach payment method to customer'
                };
            }

            // Set as default payment method
            await context.dataSources.stripe.callApi(
                HTTPMethod.post,
                `customers/${stripeCustomerId}`,
                {
                    'invoice_settings[default_payment_method]': paymentMethodId
                }
            );

            return {
                success: true,
                message: 'Test card added successfully',
                paymentMethodId
            };
        }
    },
    User: {
        vendors: async (parent: { vendors: any[]; }, _args: any, context: serverContext, _info: any) => {
            if (parent.vendors == null || parent.vendors.length == 0) return []
            return parent.vendors.map(async v => 
                    await context.dataSources.cosmos.get_record("Main-Vendor", v.id, v.id)
                );
        },
        name: (parent: { firstname: string, lastname: string}, _args: any, _context: serverContext, _info: any) => {
            return `${parent.firstname} ${parent.lastname}`;
        },
        phoneNumber: (parent: { addresses: address_type[] }, _args: any, _context: serverContext, _info: any) => {
            if (isNullOrUndefined(parent.addresses) || parent.addresses.length == 0) return undefined;
            // we can assume that the phone number is the same on the default address
            return parent.addresses.find(x => x.isDefault).phoneNumber;
        },
        pinned: async (_parent: any, _: any, context: serverContext) => {
            if (context.userId == null) throw "User not logged in";
            // Fetch the pins from the container "Main-Pinned"
            // fetch pins from the container "Main-Pinned" where the partition key is the user id
            const pins = await context.dataSources.cosmos.get_all("Main-Pinned",  context.userId);
            return pins
        },
        lastViewed: async (parent: any, _: any, _context: serverContext) => {
            //resolvers for lastViewed
            if (parent.lastViewed) {
                return parent.lastViewed
              }
              return null;
        },
        orders: async (_: any, args: any, { userId, dataSources }: serverContext) => {
            if (userId == null) throw "User not logged in";
            var parameters = [{ name: "@userId", value: userId }]
            var whereConditions = ["l.userId = @userId"]
            var joinConditions = []

            if (args.orderStatus != null && args.orderStatus.length > 0) {
                whereConditions.push(`ARRAY_CONTAINS(@orderStatus, l.orderStatus)`);
                parameters.push({ name: "@orderStatus", value: args.orderStatus });
            }

            if (isNullOrUndefined(args.vendorId)) {
                joinConditions.push(`JOIN l in o.lines`)
                whereConditions.push(`l.merchantId = @vendorId`)
                parameters.push({ name: "@vendorId", value: args.vendorId });
            }
            
            if (whereConditions.length > 0) {
                const query = `SELECT * FROM o ${joinConditions.join(" AND ")} WHERE ${whereConditions.join(" AND ")}`
                return dataSources.cosmos.run_query("Main-Orders", {
                    query: query,
                    parameters
                })
            } else {
                return dataSources.cosmos.get_all("Main-Orders")
            } 
        },
        tickets: async (_: any, args: any, { userId, dataSources }: serverContext) => {
            if (userId == null) throw "User not logged in";
            var parameters = [{ name: "@userId", value: userId }]
            var whereConditions = ["l.userId = @userId"]

            if (args.ticketStatus != null && args.ticketStatus.length > 0) {
                whereConditions.push(`ARRAY_CONTAINS(@ticketStatus, l.ticketStatus)`);
                parameters.push({ name: "@ticketStatus", value: args.ticketStatus });
            }
            
            if (whereConditions.length > 0) {
                const query = `SELECT * FROM l WHERE ${whereConditions.join(" AND ")}`
                return dataSources.cosmos.run_query("Main-Tickets", {
                    query: query,
                    parameters
                })
            } else {
                return dataSources.cosmos.get_all("Main-Tickets")
            } 
        },
        feed: async (_parent: any, _: any, context: serverContext) => { 
            if (context.userId == null) throw "User not logged in";
            const feed = await context.dataSources.cosmos.get_all("Main-Feed",  context.userId);
            return feed;
        },
        cases: async (_: any, args: any, { userId, dataSources }: serverContext) => {
            if (userId == null) throw "User not logged in";
            var parameters = [{ name: "@userId", value: userId }]
            var whereConditions = ["l.userId = @userId"]

            if (args.caseStatus != null && args.caseStatus.length > 0) {
                whereConditions.push(`ARRAY_CONTAINS(@caseStatus, l.caseStatus)`);
                parameters.push({ name: "@caseStatus", value: args.caseStatus });
            }

            const query = `SELECT * FROM l WHERE ${whereConditions.join(" AND ")}`
            return dataSources.cosmos.run_query("Main-Cases", {
                query: query,
                parameters
            })
        },
        wishlists: async (_parent: any, _: any, context: serverContext) => { 
            if (context.userId == null) throw "User not logged in";
            const wishlist = await context.dataSources.cosmos.get_all("Main-Wishlist",  context.userId);
            return wishlist;
        },
        cards: async (parent: user_type, _: any, context: serverContext) => {
            if (context.userId == null) throw "User not logged in";

            if (!parent.stripe?.customerId) {
                return [];
            }

            try {
                const response = await context.dataSources.stripe.callApi(HTTPMethod.get, `customers/${parent.stripe.customerId}/payment_methods`, {
                    type: "card"
                });

                if (response.status === 200) {
                    return response.data.data
                        .filter((pm: any) => pm.card) // Only payment methods with card property
                        .map((pm: any) => ({
                            id: pm.card.id,
                            paymentMethodId: pm.id,
                            brand: pm.card.brand,
                            last4: pm.card.last4,
                            exp_month: pm.card.exp_month,
                            exp_year: pm.card.exp_year,
                            funding: pm.card.funding,
                            country: pm.card.country
                        }));
                }

                return [];
            } catch (error) {
                context.logger?.error(`Error fetching payment methods for customer ${parent.stripe.customerId}:`, error);
                return [];
            }
        },
        religion: async (parent: any, _: any, context: serverContext) => {
            if (!parent.religionId) return null;

            try {
                // Religions are stored in System-SettingTrees with "religions" as the partition key (configId)
                const religion = await context.dataSources.cosmos.get_record("System-SettingTrees", parent.religionId, "religions") as any;
                return {
                    id: religion.id,
                    name: religion.label
                };
            } catch (error) {
                context.logger?.error(`Error fetching religion for religionId ${parent.religionId}:`, error);
                return null;
            }
        }
    },
    Customer: {
        ref: async (parent: any, _args: any, _context: serverContext, _info: any) => {
            return {
                id: parent.id, partition: [parent.id], container: "Main-User"
            }
        }
    },
    Feed: {
        user: async (parent: any, _: any, context: serverContext) => {
            return await context.dataSources.cosmos.get_record("Main-User", parent.userId, parent.userId)
        }
    }
}

export const user_business_logic = {
    create: async (userEmail: string, cosmos: CosmosDataSource) => {
        const userId = uuidv4()
        const userQuery = await cosmos.run_query('Main-User', { query: 'SELECT c.id FROM c WHERE c.email = @email', parameters: [{ name:"@email", value: userEmail }] }, true);
        if (userQuery.length == 0) {
            await cosmos.add_record("Main-User", {
                id: userId,
                email: userEmail,
                requiresInput: true,
                currency: "USD"
            }, userId, "SYSTEM")
        } else {
            // this shouldn't error as this is used by the client to check if the user exists
            // if the user exists we don't create them we just return the id
            return userQuery[0].id
        }

        return userId
    }
}

export { resolvers }
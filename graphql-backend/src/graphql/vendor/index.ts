import { HTTPMethod, PatchOperation } from '@azure/cosmos';
import { GraphQLError } from 'graphql';
import { v4 as uuidv4 } from 'uuid';
import { DateTime } from "luxon";
import { generate_human_friendly_id, isNullOrUndefined, isNullOrWhiteSpace, mergeDeep, slugify } from '../../utils/functions';
import { serverContext } from '../../services/azFunction';
import { socialpost_type } from '../social/types';
import { vendor_type, plan_type, merchant_card_status, merchant_subscription_payment_status, VendorDocType, PractitionerAvailability, practitioner_profile_type } from './types';
import { user_type } from '../user/types';
import { sender_details } from '../../client/email_templates';
import { googleplace_type, recordref_type } from '../0_shared/types';
import { ReadingRequestManager } from '../reading-request/manager';

const resolvers = {
    Query: {
        vendors: async (_: any, args: { search?: string }, context: serverContext) => {
            if (!args.search) {
                return await context.dataSources.cosmos.get_all("Main-Vendor");
            }
        
            const search = args.search.toLowerCase();
        
            return await context.dataSources.cosmos.run_query("Main-Vendor", {
                query: `
                    SELECT DISTINCT VALUE c
                    FROM c
                    JOIN d IN c.descriptions
                    JOIN l IN c.locations
                    WHERE 
                        CONTAINS(LOWER(c.name), @search) OR
                        CONTAINS(LOWER(d.title), @search) OR
                        CONTAINS(LOWER(d.body), @search) OR
                        CONTAINS(LOWER(l.address.formattedAddress), @search) OR
                        EXISTS (
                            SELECT VALUE s FROM s IN l.services 
                            WHERE CONTAINS(LOWER(s), @search)
                        )
                `,
                parameters: [
                    { name: "@search", value: search }
                ]
            }, true);
        },        
        // we need a way of fetching the vendors id from a setup intent and secret
        vendorFromSubscriptionSetupIntent: async (_: any, args: {setupIntentId: string, setupIntentSecret: string}, context: serverContext) => {
            const setupIntent = {
                id: args.setupIntentId,
                secret: args.setupIntentSecret
            }

            const order = await context.dataSources.cosmos.run_query("Main-Orders", {
                query: "SELECT c.id FROM c WHERE c.stripe.setupIntentId = @setupIntentId AND c.stripe.setupIntentSecret = @setupIntentSecret",
                parameters: [
                    { name: "@setupIntentId", value: setupIntent.id },
                    { name: "@setupIntentSecret", value: setupIntent.secret }
                ]
            }, true)

            if (order.length == 0) {
                throw new GraphQLError(`Order not found for setup intent ${setupIntent.id}`)
            }

            const vendor = await context.dataSources.cosmos.run_query("Main-Vendor", {
                query: "SELECT c.id, c.slug, c.name FROM c WHERE c.subscription.orderId = @orderId",
                parameters: [
                    { name: "@orderId", value: order[0].id }
                ]
            }, true)

            if (vendor.length == 0) {
                throw new GraphQLError(`Vendor not found for order ${order[0].id}`);
            }   

            return vendor[0];
        },
        vendor: async (_: any, args: { id: string }, context : serverContext) => {
            var vendor = await context.dataSources.cosmos.get_record("Main-Vendor", args.id, args.id)
            return vendor;
        },
        vendorIdFromSlug: async (_: any, args: any, context : serverContext) => {
            const requiresEncoding = args.requiresEncoding ?? false;
            let slugToCheck = args.slug;
            if (requiresEncoding) {
                slugToCheck = slugify(args.slug)
            }
            
            var vendorId = await context.dataSources.cosmos.run_query("Main-Vendor", {
                query: "SELECT VALUE c.id FROM c WHERE c.slug = @slug",
                parameters: [{ name: "@slug", value: slugToCheck }]
            }, true)

            if (vendorId.length == 0) {
                return {
                    merchantId: null,
                    slug: slugToCheck,
                    available: true
                }
            } else {
                return {
                    merchantId: vendorId[0],
                    slug: slugToCheck,
                    available: false
                }
            }
        },
        productReturnPolicies: async(_: any, { merchantId, listingType, country }: any, context: serverContext) => {
            protect_via_merchant_access(context.dataSources.cosmos, context.userId, merchantId);

            let params = [{ name: "@merchantId", value: merchantId }]
            let whereConditions = ["c.vendorId = @merchantId", "c.type = 'PRODUCT_RETURN_POLICY'"]

            if (!isNullOrUndefined(listingType)) {
                params.push({ name: "@listingType", value: listingType })
                whereConditions.push("c.listingType = @listingType")
            }
            if (!isNullOrUndefined(country)) {
                params.push({ name: "@country", value: country })
                whereConditions.push("c.country = @country")
            }
            const whereClause = whereConditions.join(" AND ")

            return await context.dataSources.cosmos.run_query("Main-VendorSettings", {
                query: `SELECT * FROM c WHERE ${whereClause}`,
                parameters: params
            })
        },
        productReturnPolicy: async(_: any, { merchantId, policyId }: any, context: serverContext) => {
            protect_via_merchant_access(context.dataSources.cosmos, context.userId, merchantId);

            const policy = await context.dataSources.cosmos.get_record("Main-VendorSettings", policyId, merchantId)

            if (policy == null) {
                throw new GraphQLError(`Product return policy ${policyId} not found for vendor ${merchantId}`)
            }

            return policy;
        },
        serviceCancellationPolicies: async(_: any, { merchantId, serviceCategory }: any, context: serverContext) => {
            protect_via_merchant_access(context.dataSources.cosmos, context.userId, merchantId);

            let params = [{ name: "@merchantId", value: merchantId }]
            let whereConditions = ["c.vendorId = @merchantId", "c.type = 'SERVICE_CANCELLATION_POLICY'"]

            if (!isNullOrUndefined(serviceCategory)) {
                params.push({ name: "@serviceCategory", value: serviceCategory })
                whereConditions.push("c.serviceCategory = @serviceCategory")
            }
            const whereClause = whereConditions.join(" AND ")

            return await context.dataSources.cosmos.run_query("Main-VendorSettings", {
                query: `SELECT * FROM c WHERE ${whereClause}`,
                parameters: params
            })
        },
        serviceCancellationPolicy: async(_: any, { merchantId, policyId }: any, context: serverContext) => {
            protect_via_merchant_access(context.dataSources.cosmos, context.userId, merchantId);

            const policy = await context.dataSources.cosmos.get_record("Main-VendorSettings", policyId, merchantId)

            if (policy == null) {
                throw new GraphQLError(`Service cancellation policy ${policyId} not found for vendor ${merchantId}`)
            }

            return policy;
        },

        // Practitioner queries
        practitioner: async (_: any, args: { slug: string }, context: serverContext) => {
            const results = await context.dataSources.cosmos.run_query<vendor_type>("Main-Vendor", {
                query: "SELECT * FROM c WHERE c.slug = @slug AND c.docType = @docType",
                parameters: [
                    { name: "@slug", value: args.slug },
                    { name: "@docType", value: VendorDocType.PRACTITIONER }
                ]
            }, true);

            if (results.length === 0) {
                return null;
            }

            return results[0];
        },

        practitioners: async (_: any, args: {
            modalities?: string[],
            specializations?: string[],
            minRating?: number,
            acceptingClients?: boolean,
            verifiedOnly?: boolean,
            search?: string,
            sort?: string,
            limit?: number,
            offset?: number
        }, context: serverContext) => {
            const limit = args.limit || 20;
            const offset = args.offset || 0;

            // Build dynamic query
            let whereConditions = ["c.docType = @docType"];
            let parameters: any[] = [
                { name: "@docType", value: VendorDocType.PRACTITIONER }
            ];

            // Filter by modalities
            if (args.modalities && args.modalities.length > 0) {
                whereConditions.push("EXISTS(SELECT VALUE m FROM m IN c.practitioner.modalities WHERE ARRAY_CONTAINS(@modalities, m))");
                parameters.push({ name: "@modalities", value: args.modalities });
            }

            // Filter by specializations
            if (args.specializations && args.specializations.length > 0) {
                whereConditions.push("EXISTS(SELECT VALUE s FROM s IN c.practitioner.specializations WHERE ARRAY_CONTAINS(@specializations, s))");
                parameters.push({ name: "@specializations", value: args.specializations });
            }

            // Filter by minimum rating
            if (args.minRating) {
                whereConditions.push("c.readingRating.average >= @minRating");
                parameters.push({ name: "@minRating", value: args.minRating });
            }

            // Filter by accepting clients
            if (args.acceptingClients === true) {
                whereConditions.push("c.practitioner.acceptingNewClients = true");
            }

            // Filter by verified only
            if (args.verifiedOnly === true) {
                whereConditions.push("c.practitioner.verification.practitionerVerified = true");
            }

            // Search by name, headline, bio
            if (args.search) {
                const searchLower = args.search.toLowerCase();
                whereConditions.push("(CONTAINS(LOWER(c.name), @search) OR CONTAINS(LOWER(c.practitioner.headline), @search) OR CONTAINS(LOWER(c.practitioner.bio), @search))");
                parameters.push({ name: "@search", value: searchLower });
            }

            const whereClause = whereConditions.join(" AND ");

            // Determine sort order
            let orderBy = "c._ts DESC"; // Default: newest
            switch (args.sort) {
                case "RATING_HIGH":
                    orderBy = "c.readingRating.average DESC";
                    break;
                case "REVIEWS_MOST":
                    orderBy = "c.readingRating.total_count DESC";
                    break;
                case "NEWEST":
                    orderBy = "c._ts DESC";
                    break;
            }

            // Get total count
            const countResults = await context.dataSources.cosmos.run_query<number>("Main-Vendor", {
                query: `SELECT VALUE COUNT(1) FROM c WHERE ${whereClause}`,
                parameters
            }, true);
            const total = countResults[0] || 0;

            // Get practitioners with pagination
            const practitioners = await context.dataSources.cosmos.run_query<vendor_type>("Main-Vendor", {
                query: `SELECT * FROM c WHERE ${whereClause} ORDER BY ${orderBy} OFFSET ${offset} LIMIT ${limit}`,
                parameters
            }, true);

            return {
                practitioners,
                total,
                hasMore: offset + practitioners.length < total
            };
        },

        featuredPractitionersByModality: async (_: any, args: { modality: string, limit?: number }, context: serverContext) => {
            const limit = args.limit || 6;

            const practitioners = await context.dataSources.cosmos.run_query<vendor_type>("Main-Vendor", {
                query: `
                    SELECT * FROM c
                    WHERE c.docType = @docType
                    AND ARRAY_CONTAINS(c.practitioner.modalities, @modality)
                    AND c.practitioner.acceptingNewClients = true
                    ORDER BY c.readingRating.average DESC
                    OFFSET 0 LIMIT ${limit}
                `,
                parameters: [
                    { name: "@docType", value: VendorDocType.PRACTITIONER },
                    { name: "@modality", value: args.modality }
                ]
            }, true);

            return practitioners;
        },

        // Get all conversations for a practitioner (Message Center)
        practitionerConversations: async (_: any, args: { practitionerId: string }, context: serverContext) => {
            if (context.userId == null) {
                throw new GraphQLError("User must be logged in", {
                    extensions: { code: 'UNAUTHORIZED' },
                });
            }

            // Verify user has access to this practitioner
            await protect_via_merchant_access(context.dataSources.cosmos, context.userId, args.practitionerId);

            // Query all messages for this practitioner's conversations
            // Messages are stored with forObject.partition = practitionerId
            // We query by forObject.partition and container to find all conversation messages
            const messages = await context.dataSources.cosmos.run_query<any>("Main-Message", {
                query: `
                    SELECT * FROM m
                    WHERE m.forObject.partition = @practitionerId
                    AND m.forObject.container = 'Main-Conversation'
                    ORDER BY m.sentAt DESC
                `,
                parameters: [
                    { name: "@practitionerId", value: args.practitionerId }
                ]
            }, true);

            // Group messages by conversationId (forObject.id)
            const conversationMap = new Map<string, any[]>();
            for (const message of messages) {
                const convId = message.forObject?.id;
                if (!convId) continue;
                if (!conversationMap.has(convId)) {
                    conversationMap.set(convId, []);
                }
                conversationMap.get(convId)!.push(message);
            }

            // Build conversation summaries
            const conversations = [];
            for (const [conversationId, convMessages] of conversationMap) {
                // Extract customer ID from conversation ID (format: conv-{customerId}-{practitionerId})
                // Or get it from the customerId field if present
                let customerId = convMessages.find(m => m.customerId)?.customerId;
                if (!customerId && conversationId.startsWith('conv-')) {
                    // Parse from conversation ID
                    const parts = conversationId.split('-');
                    if (parts.length >= 3) {
                        // conv-{customerId}-{practitionerId} - customerId might contain dashes (UUID)
                        // So we need to reconstruct it properly
                        customerId = parts.slice(1, -1).join('-');
                        // If practitionerId is at the end, we need to exclude it
                        // Actually the format is conv-{customerId}-{practitionerId}
                        // where both are UUIDs, so we need a smarter approach
                        // Let's find the posted_by_userId from customer messages instead
                        customerId = convMessages.find(m => m.posted_by_userId && !m.posted_by_vendorId)?.posted_by_userId;
                    }
                }
                if (!customerId) continue;

                // Fetch customer info
                const customer = await context.dataSources.cosmos.get_record<user_type>("Main-User", customerId, customerId);
                if (!customer) continue;

                // Sort messages by date, get the latest
                const sortedMessages = convMessages.sort((a, b) =>
                    DateTime.fromISO(b.sentAt).toMillis() - DateTime.fromISO(a.sentAt).toMillis()
                );
                const lastMessage = sortedMessages[0];

                conversations.push({
                    conversationId,
                    customer,
                    lastMessage,
                    messageCount: convMessages.length,
                    lastMessageAt: lastMessage.sentAt
                });
            }

            // Sort by last message date
            conversations.sort((a, b) =>
                DateTime.fromISO(b.lastMessageAt).toMillis() - DateTime.fromISO(a.lastMessageAt).toMillis()
            );

            return conversations;
        },

        // Get conversation for a customer with a specific practitioner
        customerConversation: async (_: any, args: { practitionerId: string }, context: serverContext) => {
            if (context.userId == null) {
                throw new GraphQLError("User must be logged in", {
                    extensions: { code: 'UNAUTHORIZED' },
                });
            }

            // Verify practitioner exists
            const practitioner = await context.dataSources.cosmos.get_record<vendor_type>("Main-Vendor", args.practitionerId, args.practitionerId);
            if (!practitioner) {
                throw new GraphQLError(`Practitioner not found`, {
                    extensions: { code: 'NOT_FOUND' },
                });
            }

            // Build the conversation ID
            const conversationId = `conv-${context.userId}-${args.practitionerId}`;

            // Build the forObject reference for ChatControl
            const forObject: recordref_type = {
                id: conversationId,
                partition: [args.practitionerId],
                container: "Main-Conversation"
            };

            // Fetch messages for this conversation
            // Try both topicRef.id and forObject.id since they should be the same
            const messages = await context.dataSources.cosmos.run_query<any>("Main-Message", {
                query: `
                    SELECT * FROM m
                    WHERE m.topicRef.id = @conversationId
                    OR m.forObject.id = @conversationId
                    ORDER BY m.sentAt ASC
                `,
                parameters: [
                    { name: "@conversationId", value: conversationId }
                ]
            }, true);

            return {
                conversationId,
                practitioner,
                messages,
                forObject
            };
        },

        // Practitioner testimonial queries
        practitionerTestimonials: async (_: any, args: { practitionerId: string }, context: serverContext) => {
            // Get all testimonials for a practitioner from Main-VendorSettings
            // Don't use ignoreStatus - we want to filter out deleted testimonials
            const testimonials = await context.dataSources.cosmos.run_query("Main-VendorSettings", {
                query: `SELECT * FROM c WHERE c.vendorId = @practitionerId AND c.type = 'TESTIMONIAL' ORDER BY c.createdAt DESC`,
                parameters: [
                    { name: "@practitionerId", value: args.practitionerId }
                ]
            });

            return testimonials;
        },

        testimonialRequest: async (_: any, args: { token: string }, context: serverContext) => {
            // Look up testimonial request by token
            const requests = await context.dataSources.cosmos.run_query<any>("Main-VendorSettings", {
                query: `SELECT * FROM c WHERE c.type = 'TESTIMONIAL_REQUEST' AND c.token = @token`,
                parameters: [
                    { name: "@token", value: args.token }
                ]
            }, true);

            if (requests.length === 0) {
                return null;
            }

            const request = requests[0];

            // Check if expired
            const now = new Date();
            const expiresAt = new Date(request.expiresAt);
            if (now > expiresAt && request.requestStatus !== 'SUBMITTED') {
                return {
                    practitionerId: request.practitionerId,
                    practitionerName: request.practitionerName || 'Unknown',
                    practitionerSlug: request.practitionerSlug || '',
                    practitionerThumbnail: request.practitionerThumbnail,
                    clientName: request.clientName,
                    requestStatus: 'EXPIRED',
                    expiresAt: request.expiresAt
                };
            }

            // Fetch practitioner details for display
            const practitioner = await context.dataSources.cosmos.get_record<vendor_type>("Main-Vendor", request.practitionerId, request.practitionerId);

            return {
                practitionerId: request.practitionerId,
                practitionerName: practitioner?.name || request.practitionerName || 'Unknown',
                practitionerSlug: practitioner?.slug || request.practitionerSlug || '',
                practitionerThumbnail: practitioner?.thumbnail?.image?.media?.url || null,
                clientName: request.clientName,
                requestStatus: request.requestStatus,
                expiresAt: request.expiresAt
            };
        },

        recommendedVendors: async (_: any, args: { limit?: number }, context: serverContext) => {
            if (!context.userId) throw new Error("User must be logged in")

            const limit = args.limit || 10

            // Get user profile for matching signals
            const user = await context.dataSources.cosmos.get_record<any>("Main-User", context.userId, context.userId)
            const primaryInterest = user?.primarySpiritualInterest
            const secondaryInterests = user?.secondarySpiritualInterests || []
            const userReligionId = user?.religion?.id || null
            const openToOther = user?.openToOtherExperiences !== false // default true if not set
            const userLocation = user?.address?.point?.coordinates || null

            // Get followed vendor IDs to exclude
            const follows = await context.dataSources.cosmos.run_query<{ merchantId: string }>("Main-Follow", {
                query: `SELECT c.targetId as merchantId FROM c WHERE c.followerId = @userId AND c.targetType = 'MERCHANT'`,
                parameters: [{ name: "@userId", value: context.userId }]
            })
            const followedIds = follows.map(f => f.merchantId)

            // Also exclude user's own vendors
            const ownVendorIds = (user?.vendors || []).map((v: any) => v.id || v.vendorId).filter(Boolean)
            const excludeIds = new Set([...followedIds, ...ownVendorIds])

            // Map spiritual interests to practitioner modalities
            const interestToModality: Record<string, string[]> = {
                MEDIUMSHIP: ["MEDIUMSHIP", "CHANNELING", "PAST_LIFE", "SPIRIT_COMMUNICATION"],
                PARANORMAL: ["MEDIUMSHIP", "CHANNELING", "AKASHIC_RECORDS", "PAST_LIFE"],
                CRYSTALS: ["CRYSTAL_HEALING", "ENERGY_HEALING", "SOUND_HEALING"],
                WITCHCRAFT: ["TAROT", "ORACLE", "AKASHIC_RECORDS"],
                ENERGY: ["REIKI", "ENERGY_HEALING", "SOUND_HEALING", "BREATHWORK", "CRYSTAL_HEALING"],
                HERBALISM: ["ENERGY_HEALING", "COACHING", "SOUND_HEALING"],
                FAITH: ["COACHING", "COUNSELING", "ENERGY_HEALING", "BREATHWORK"]
            }

            // Map spiritual interests to practitioner specializations
            const interestToSpecialization: Record<string, string[]> = {
                MEDIUMSHIP: ["SPIRIT_COMMUNICATION", "GRIEF_LOSS", "PAST_LIVES"],
                PARANORMAL: ["SPIRIT_COMMUNICATION", "PAST_LIVES", "ANCESTRAL_HEALING"],
                CRYSTALS: ["HEALTH_WELLNESS", "SPIRITUAL_AWAKENING", "SELF_DISCOVERY"],
                WITCHCRAFT: ["SHADOW_WORK", "SELF_DISCOVERY", "SPIRITUAL_AWAKENING"],
                ENERGY: ["HEALTH_WELLNESS", "SPIRITUAL_AWAKENING", "SELF_DISCOVERY"],
                HERBALISM: ["HEALTH_WELLNESS", "SELF_DISCOVERY"],
                FAITH: ["SPIRITUAL_AWAKENING", "LIFE_PURPOSE", "GRIEF_LOSS", "RELATIONSHIPS"]
            }

            const allInterests = [primaryInterest, ...secondaryInterests].filter(Boolean)
            const matchModalities = [...new Set(allInterests.flatMap((i: string) => interestToModality[i] || []))]
            const matchSpecializations = [...new Set(allInterests.flatMap((i: string) => interestToSpecialization[i] || []))]

            // Helper to build a result entry with scoring
            const buildResult = (v: any, reason: string, score: number) => ({
                id: v.id,
                name: v.name || "Unknown",
                slug: v.slug || "",
                logo: v.logo || null,
                docType: v.docType || "MERCHANT",
                followerCount: v.followerCount || 0,
                headline: v.practitioner?.headline || v.intro || null,
                modalities: v.practitioner?.modalities || [],
                matchReason: reason,
                _score: score
            })

            // Helper to calculate distance in km between two lat/lng points
            const distanceKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
                const R = 6371
                const dLat = (lat2 - lat1) * Math.PI / 180
                const dLng = (lng2 - lng1) * Math.PI / 180
                const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
                return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
            }

            // Fetch a broad pool of candidates
            const candidateQuery = {
                query: `SELECT * FROM c WHERE (c.docType = 'PRACTITIONER' OR c.docType = 'MERCHANT') ORDER BY c.followerCount DESC OFFSET 0 LIMIT @fetchLimit`,
                parameters: [
                    { name: "@fetchLimit", value: limit * 5 }
                ]
            }
            const candidates = await context.dataSources.cosmos.run_query<any>("Main-Vendor", candidateQuery, true)

            const scored: any[] = []

            for (const v of candidates) {
                if (excludeIds.has(v.id)) continue

                let score = 0
                const reasons: string[] = []
                const vendorModalities: string[] = v.practitioner?.modalities || []
                const vendorSpecializations: string[] = v.practitioner?.specializations || []

                // Religion match (strong signal)
                if (userReligionId && v.religionId === userReligionId) {
                    score += 30
                    reasons.push("Shares your faith")
                }

                // If user is NOT open to other experiences, skip vendors of different religions
                if (!openToOther && userReligionId && v.religionId && v.religionId !== userReligionId) {
                    continue
                }

                // Modality match
                const modalityOverlap = vendorModalities.filter(m => matchModalities.includes(m)).length
                if (modalityOverlap > 0) {
                    score += modalityOverlap * 15
                    reasons.push("Based on your interests")
                }

                // Specialization match
                const specOverlap = vendorSpecializations.filter(s => matchSpecializations.includes(s)).length
                if (specOverlap > 0) {
                    score += specOverlap * 10
                }

                // Proximity bonus (if both have location data)
                if (userLocation && v.locations?.length > 0) {
                    for (const loc of v.locations) {
                        const vendorCoords = loc.address?.point?.coordinates
                        if (vendorCoords) {
                            const dist = distanceKm(userLocation.lat, userLocation.lng, vendorCoords.lat, vendorCoords.lng)
                            if (dist < 50) {
                                score += 20
                                reasons.push("Near you")
                            } else if (dist < 200) {
                                score += 10
                            }
                            break // only check first location
                        }
                    }
                }

                // Popularity baseline
                score += Math.min((v.followerCount || 0), 50)

                if (reasons.length === 0) {
                    reasons.push("Popular on SpiriVerse")
                }

                scored.push(buildResult(v, reasons[0], score))
            }

            // Sort by score descending, take top N
            scored.sort((a, b) => b._score - a._score)

            return scored.slice(0, limit).map(({ _score, ...rest }) => rest)
        }
    },
    Mutation: {
        create_draft_merchant: async (_: any, args: { merchantId: string }, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            // Create a minimal draft merchant record
            // This just reserves the merchantId for this user
            // The actual merchant details will be filled in by create_vendor mutation
            const draftMerchant = {
                id: args.merchantId,
                userId: context.userId,
                status: "DRAFT",
                createdAt: new Date().toISOString(),
            };

            // Store in a temporary collection or just return the ID
            // For now, we just return the ID - the actual merchant will be created by create_vendor
            // The frontend will use this ID in the form

            return {
                id: args.merchantId
            };
        },
        create_vendor: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            var { subscription, ...vendorInput } = args.vendor;
            // assume the merchant does not have any team members at sign up
            vendorInput["teamMembers"] = [];
            vendorInput["descriptions"] = [];
            vendorInput["locations"] = [];
            vendorInput["social"] = {
                style: "SOLID",
                platforms: []
            };
            vendorInput["onStart"] = "welcome";
            vendorInput["profileVisibility"] = {
                contactInformation: true,
                locations: true,
                teamMembers: true,
                sections: true
            };
            vendorInput["storage"] = {
                usedBytes: 0
            };

            const vendorCountry = vendorInput.country as string;
            const vendorState = vendorInput.state as string | undefined;

            // validate the email, phone
            // quick regex check the email inputted
            let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/
            if (!vendorInput.email.match(emailRegex)) {
                throw new GraphQLError(`${vendorInput.email} is not a valid email`, {
                    extensions: { code: 'BAD_REQUEST'},
                  });
            }
            // twilio validate phone number, not that we're not verifying it
            // if (!await context.dataSources.twilio.validatePhoneNumber(item.phoneNumber)) {
            //     throw new GraphQLError(`${item.phoneNumber} is not a valid phone number`, {
            //         extensions: { code: 'BAD_REQUEST'},
            //     });
            // }

            // we need to create the slug for the vendor
            vendorInput["slug"] = !isNullOrWhiteSpace(vendorInput["slug"]) ? vendorInput["slug"] : slugify(vendorInput.name)

            // we need to check that no other ACTIVE vendor has the same slug
            const vendorSlugs = await context.dataSources.cosmos.run_query("Main-Vendor", {
                query: "SELECT VALUE c.name FROM c WHERE c.slug = @slug",
                parameters: [{ name: "@slug", value: vendorInput.slug }]
            })
            if (vendorSlugs.length > 0) {
                const vendor_name = vendorSlugs[0]
                context.logger.error(`Vendor slug ${vendorInput.slug} already taken by ${vendor_name}`);
                throw new GraphQLError(`Vendor slug ${vendorInput.slug} already taken, must be unique.`, {
                    extensions: { code: 'BAD_REQUEST'},
                });
            }
            
            // we will move the email and the phone number into the contact
            vendorInput["contact"] = {
                internal: {
                },
                public: {
                    email: vendorInput.email
                }
            }
            delete vendorInput.email

            vendorInput["subscription"] = {
                payment_retry_count: 0,
                last_payment_date: null,
                card_status: merchant_card_status.not_saved,
                payment_status: merchant_subscription_payment_status.not_attempted,
                // Deferred subscription model: first payout triggers card requirement
                first_payout_received: false,
                payouts_blocked: false,
                plans: subscription?.plans || []
            }

            await context.dataSources.cosmos.add_record("Main-Vendor", vendorInput, vendorInput.id, context.userId)
            
            // create the vendor as a customer in stripe - so they can be put on their subscription
            var createStripeMerchantAsCustomerAccountResp = await context.dataSources.stripe.callApi(HTTPMethod.post, "customers", {
                "email": vendorInput.contact.public.email,
                "name": vendorInput.name,
                "address": {
                    country: vendorCountry,
                    ...(vendorState && { state: vendorState })
                }
            })
            if (createStripeMerchantAsCustomerAccountResp.status != 200) {
                throw new GraphQLError(`Error creating customer in Stripe.`, {
                    extensions: { code: 'BAD_REQUEST'},
                });
            }

            // create an account in stripe - so they can list products
            // Payouts start enabled - will be switched to manual after first payout until card is added
            var createStripeAccountResp = await context.dataSources.stripe.callApi("POST", "accounts", {
                "email": vendorInput.contact.public.email,
                "country": vendorCountry,
                "type": "custom",
                "business_type": "individual",
                "business_profile": {
                    name: vendorInput.name,
                    mcc: 5815, // Digital Goods Media – Books, Movies, Music
                    url: `https://www.spiriverse.com/m/${vendorInput.slug}`,
                    support_email: vendorInput.contact.public.email,
                },
                "requested_capabilities": ["card_payments", "transfers"]
            })

            if (createStripeAccountResp.status != 200) {
                throw new GraphQLError(`Error creating account in Stripe.`, {
                    extensions: { code: 'BAD_REQUEST'},
                });
            }

            // Update the vendor in the database with the stripe IDs
            // Note: No subscription order or SetupIntent created at signup
            // Subscription billing starts once merchant receives payouts >= Essentials threshold
            const vendorContainer = await context.dataSources.cosmos.get_container("Main-Vendor")
            const operations : PatchOperation[] = [
                { op: "add", path: `/stripe`,
                    value: {
                        customerId: createStripeMerchantAsCustomerAccountResp.data.id,
                        accountId: createStripeAccountResp.data.id
                    }
                }
            ]
            await vendorContainer.item(vendorInput.id, vendorInput.id).patch(operations)

            // Add the vendor to the user with a patch
            const user = await context.dataSources.cosmos.get_record<user_type>("Main-User", context.userId, context.userId);
            const vendorAssignment = { id: vendorInput.id, role: "ADMIN" }
            if (user.vendors == null) {
                await context.dataSources.cosmos.patch_record("Main-User", context.userId, context.userId, [
                    { "op": "set", "path": "/vendors", "value": [vendorAssignment] }
                ], context.userId)
            } else {
                await context.dataSources.cosmos.patch_record("Main-User", context.userId, context.userId, [
                    { "op": "add", "path": "/vendors/-", "value": vendorAssignment }
                ], context.userId)
            }

            // we need to update the tax settings for the merchant account
            var stripe_merchant_ds = context.dataSources.stripe.asConnectedAccount(createStripeAccountResp.data.id)
            var updateTaxSettingsResp = await stripe_merchant_ds.callApi("POST", `tax/settings`, {
                "defaults": {
                    "tax_code": "txcd_10000000",
                    "tax_behavior": "exclusive"
                },
                "head_office": {
                    "address": {
                        "country": vendorCountry,
                        ...(vendorState && { state: vendorState })
                    }
                }
            })

            if (updateTaxSettingsResp.status != 200) {
                throw new GraphQLError(`Error updating tax settings in Stripe.`, {
                    extensions: { code: 'BAD_REQUEST'},
                });
            }

            // Now retrieve the final record
            const merchantRecord = await context.dataSources.cosmos.get_record("Main-Vendor", vendorInput.id, vendorInput.id)

            return {
                code: "200",
                success: true,
                message: `Vendor ${vendorInput.id} successfully created`,
                vendor: merchantRecord,
                order: null, // No order created at signup - subscription starts after payout threshold
                stripeAccountId: createStripeAccountResp.data.id
            }
        },

        // Practitioner mutations
        create_practitioner: async (_: any, args: { input: any }, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            const { input } = args;
            const { subscription } = input;
            const practitionerId = uuidv4();

            // DEBUG: Log every create_practitioner call
            context.logger.logMessage(`[CREATE_PRACTITIONER] Called with slug="${input.slug}", userId="${context.userId}", timestamp=${Date.now()}`);

            // Validate slug uniqueness (only check ACTIVE vendors, not soft-deleted ones)
            const existingSlugs = await context.dataSources.cosmos.run_query("Main-Vendor", {
                query: "SELECT VALUE c.name FROM c WHERE c.slug = @slug",
                parameters: [{ name: "@slug", value: input.slug }]
            });

            context.logger.logMessage(`[CREATE_PRACTITIONER] Slug check for "${input.slug}": found ${existingSlugs.length} existing records`);

            if (existingSlugs.length > 0) {
                context.logger.logMessage(`[CREATE_PRACTITIONER] REJECTING slug="${input.slug}" - already taken by: ${JSON.stringify(existingSlugs)}`);
                throw new GraphQLError(`Profile URL "${input.slug}" is already taken. Please choose another.`, {
                    extensions: { code: 'BAD_REQUEST' },
                });
            }

            // Validate email
            const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
            if (!input.email.match(emailRegex)) {
                throw new GraphQLError(`${input.email} is not a valid email`, {
                    extensions: { code: 'BAD_REQUEST' },
                });
            }

            // Build the practitioner profile
            const practitionerProfile: practitioner_profile_type = {
                pronouns: input.pronouns,
                headline: input.headline,
                bio: input.bio,
                modalities: input.modalities,
                specializations: input.specializations,
                gifts: [],
                tools: [],
                training: [],
                availability: PractitionerAvailability.ACCEPTING_CLIENTS,
                acceptingNewClients: true,
                verification: {
                    identityVerified: false,
                    practitionerVerified: false
                }
            };

            // Build the practitioner vendor record
            const practitioner: Partial<vendor_type> = {
                id: practitionerId,
                name: input.name,
                slug: input.slug,
                docType: VendorDocType.PRACTITIONER,
                practitioner: practitionerProfile,
                currency: input.currency,
                country: input.country,
                followerCount: 0,
                intro: "",
                contact: {
                    internal: { email: input.email, phoneNumber: { raw: "", displayAs: "", value: "" } },
                    public: { email: input.email, phoneNumber: { raw: "", displayAs: "", value: "" } }
                },
                teamMembers: [],
                descriptions: [],
                locations: [],
                social: { style: "SOLID", platforms: [] },
                logo: input.logo,
                thumbnail: input.thumbnail,
                banner: input.banner,
                readingRating: {
                    total_count: 0,
                    average: 0,
                    rating1: 0,
                    rating2: 0,
                    rating3: 0,
                    rating4: 0,
                    rating5: 0
                },
                // Subscription: same deferred billing model as merchants
                subscription: {
                    payment_retry_count: 0,
                    last_payment_date: null,
                    card_status: merchant_card_status.not_saved,
                    payment_status: merchant_subscription_payment_status.not_attempted,
                    // Deferred subscription model: first payout triggers card requirement
                    first_payout_received: false,
                    payouts_blocked: false,
                    plans: subscription?.plans || []
                }
            };

            // Save to database
            await context.dataSources.cosmos.add_record("Main-Vendor", practitioner, practitionerId, context.userId);

            // Create a Stripe Customer for the practitioner (for subscription billing)
            const practitionerCountry = input.country || 'AU';
            const createStripeCustomerResp = await context.dataSources.stripe.callApi(HTTPMethod.post, "customers", {
                "email": input.email,
                "name": input.name,
                "address": {
                    country: practitionerCountry
                }
            });
            if (createStripeCustomerResp.status != 200) {
                console.error('[create_practitioner] Stripe customer creation failed:', createStripeCustomerResp.data);
                throw new GraphQLError(`Error creating Stripe customer for practitioner.`, {
                    extensions: { code: 'BAD_REQUEST' },
                });
            }

            // Create a Stripe Connect account for the practitioner (so they can sell services)
            const createStripeAccountResp = await context.dataSources.stripe.callApi("POST", "accounts", {
                "email": input.email,
                "country": practitionerCountry,
                "type": "custom",
                "business_type": "individual",
                "business_profile": {
                    name: input.name,
                    mcc: 8999, // Professional Services
                    url: `https://www.spiriverse.com/p/${input.slug}`,
                    support_email: input.email,
                },
                "requested_capabilities": ["card_payments", "transfers"]
            });

            if (createStripeAccountResp.status != 200) {
                console.error('[create_practitioner] Stripe account creation failed:', createStripeAccountResp.data);
                throw new GraphQLError(`Error creating Stripe account for practitioner.`, {
                    extensions: { code: 'BAD_REQUEST' },
                });
            }

            // Update the practitioner with Stripe IDs (customerId for billing, accountId for payouts)
            await context.dataSources.cosmos.patch_record("Main-Vendor", practitionerId, practitionerId, [
                { op: "add", path: "/stripe", value: {
                    customerId: createStripeCustomerResp.data.id,
                    accountId: createStripeAccountResp.data.id
                } }
            ], context.userId);

            // Add to user's vendors
            const user = await context.dataSources.cosmos.get_record<user_type>("Main-User", context.userId, context.userId);
            const vendorAssignment = { id: practitionerId, role: "ADMIN" };

            if (user.vendors == null) {
                await context.dataSources.cosmos.patch_record("Main-User", context.userId, context.userId, [
                    { op: "set", path: "/vendors", value: [vendorAssignment] }
                ], context.userId);
            } else {
                await context.dataSources.cosmos.patch_record("Main-User", context.userId, context.userId, [
                    { op: "add", path: "/vendors/-", value: vendorAssignment }
                ], context.userId);
            }

            const savedPractitioner = await context.dataSources.cosmos.get_record("Main-Vendor", practitionerId, practitionerId);

            context.logger.logMessage(`[CREATE_PRACTITIONER] SUCCESS - Created practitioner slug="${input.slug}", id="${practitionerId}"`);

            return {
                code: "200",
                success: true,
                message: `Practitioner profile "${input.name}" created successfully`,
                practitioner: savedPractitioner
            };
        },

        sendMessageToPractitioner: async (_: any, args: { practitionerId: string, message: string }, context: serverContext) => {
            if (context.userId == null) {
                throw new GraphQLError("User must be logged in to send a message", {
                    extensions: { code: 'UNAUTHORIZED' },
                });
            }

            const { practitionerId, message } = args;

            // Verify practitioner exists
            const practitioner = await context.dataSources.cosmos.get_record<vendor_type>("Main-Vendor", practitionerId, practitionerId);
            if (!practitioner) {
                throw new GraphQLError(`Practitioner with ID ${practitionerId} not found`, {
                    extensions: { code: 'NOT_FOUND' },
                });
            }

            // Create a unique conversation ID for this customer-practitioner pair
            // This ensures each customer has their own separate conversation thread
            const conversationId = `conv-${context.userId}-${practitionerId}`;

            const messageId = uuidv4();
            const now = DateTime.now().toISO();

            // The forObject identifies the conversation thread
            const forObject: recordref_type = {
                id: conversationId,
                partition: [practitionerId], // Partition by practitioner for efficient querying
                container: "Main-Conversation"
            };

            const messageRecord = {
                id: messageId,
                text: message,
                forObject: {
                    ...forObject,
                    partition: practitionerId // flatten for storage
                },
                topicRef: {
                    ...forObject,
                    partition: practitionerId // flatten for storage
                },
                // Store practitioner ID for Message Center queries
                practitionerId: practitionerId,
                // Store customer ID for conversation identification
                customerId: context.userId,
                posted_by_userId: context.userId,
                posted_by: {
                    id: context.userId,
                    partition: [context.userId],
                    container: "Main-User"
                },
                sentAt: now
            };

            // Partition: [practitionerId, conversationId] - keeps all conversations for a practitioner together
            const partition = [practitionerId, conversationId];
            await context.dataSources.cosmos.add_record("Main-Message", messageRecord, partition, context.userId);

            return {
                code: "200",
                success: true,
                message: "Message sent successfully",
                conversationId: conversationId
            };
        },

        update_practitioner: async (_: any, args: { input: any }, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            const { input } = args;
            await protect_via_merchant_access(context.dataSources.cosmos, context.userId, input.id);

            // Get existing practitioner
            const existing = await context.dataSources.cosmos.get_record<vendor_type>("Main-Vendor", input.id, input.id);
            if (!existing) {
                throw new GraphQLError(`Practitioner with ID ${input.id} not found`, {
                    extensions: { code: 'NOT_FOUND' },
                });
            }

            if (existing.docType !== VendorDocType.PRACTITIONER) {
                throw new GraphQLError(`Record ${input.id} is not a practitioner profile`, {
                    extensions: { code: 'BAD_REQUEST' },
                });
            }

            // Check slug uniqueness if being changed (only check ACTIVE vendors)
            if (input.slug && input.slug !== existing.slug) {
                const existingSlugs = await context.dataSources.cosmos.run_query("Main-Vendor", {
                    query: "SELECT VALUE c.id FROM c WHERE c.slug = @slug AND c.id != @id",
                    parameters: [
                        { name: "@slug", value: input.slug },
                        { name: "@id", value: input.id }
                    ]
                });

                if (existingSlugs.length > 0) {
                    throw new GraphQLError(`Profile URL "${input.slug}" is already taken.`, {
                        extensions: { code: 'BAD_REQUEST' },
                    });
                }
            }

            // Update fields
            const updateData: any = {};
            if (input.name) updateData.name = input.name;
            if (input.slug) updateData.slug = input.slug;
            if (input.logo) updateData.logo = input.logo;
            if (input.thumbnail) updateData.thumbnail = input.thumbnail;
            if (input.banner) updateData.banner = input.banner;
            if (input.intro) updateData.intro = input.intro;
            if (input.website) updateData.website = input.website;
            if (input.contact) updateData.contact = input.contact;

            await context.dataSources.cosmos.update_record("Main-Vendor", input.id, input.id, updateData, context.userId);

            const updatedPractitioner = await context.dataSources.cosmos.get_record("Main-Vendor", input.id, input.id);

            return {
                code: "200",
                success: true,
                message: `Practitioner profile updated successfully`,
                practitioner: updatedPractitioner
            };
        },

        update_practitioner_profile: async (_: any, args: { practitionerId: string, profile: any }, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            await protect_via_merchant_access(context.dataSources.cosmos, context.userId, args.practitionerId);

            // Get existing practitioner
            const existing = await context.dataSources.cosmos.get_record<vendor_type>("Main-Vendor", args.practitionerId, args.practitionerId);
            if (!existing) {
                throw new GraphQLError(`Practitioner with ID ${args.practitionerId} not found`, {
                    extensions: { code: 'NOT_FOUND' },
                });
            }

            if (existing.docType !== VendorDocType.PRACTITIONER) {
                throw new GraphQLError(`Record ${args.practitionerId} is not a practitioner profile`, {
                    extensions: { code: 'BAD_REQUEST' },
                });
            }

            // Merge new profile fields with existing
            const updatedProfile: practitioner_profile_type = {
                ...existing.practitioner!,
                ...args.profile,
                verification: existing.practitioner?.verification || {
                    identityVerified: false,
                    practitionerVerified: false
                }
            };

            // Patch the practitioner field
            const container = await context.dataSources.cosmos.get_container("Main-Vendor");
            await container.item(args.practitionerId, args.practitionerId).patch([
                { op: "set", path: "/practitioner", value: updatedProfile }
            ]);

            const updatedPractitioner = await context.dataSources.cosmos.get_record("Main-Vendor", args.practitionerId, args.practitionerId);

            return {
                code: "200",
                success: true,
                message: `Practitioner profile details updated successfully`,
                practitioner: updatedPractitioner
            };
        },

        update_practitioner_audio_intro: async (_: any, args: { practitionerId: string, audioIntro: any }, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            await protect_via_merchant_access(context.dataSources.cosmos, context.userId, args.practitionerId);

            // Get existing practitioner
            const existing = await context.dataSources.cosmos.get_record<vendor_type>("Main-Vendor", args.practitionerId, args.practitionerId);
            if (!existing) {
                throw new GraphQLError(`Practitioner with ID ${args.practitionerId} not found`, {
                    extensions: { code: 'NOT_FOUND' },
                });
            }

            if (existing.docType !== VendorDocType.PRACTITIONER) {
                throw new GraphQLError(`Record ${args.practitionerId} is not a practitioner profile`, {
                    extensions: { code: 'BAD_REQUEST' },
                });
            }

            // Update the audio intro in practitioner profile
            const updatedProfile = {
                ...existing.practitioner!,
                audioIntro: args.audioIntro
            };

            // Patch the practitioner field
            const container = await context.dataSources.cosmos.get_container("Main-Vendor");
            await container.item(args.practitionerId, args.practitionerId).patch([
                { op: "set", path: "/practitioner", value: updatedProfile }
            ]);

            const updatedPractitioner = await context.dataSources.cosmos.get_record("Main-Vendor", args.practitionerId, args.practitionerId);

            return {
                code: "200",
                success: true,
                message: `Practitioner audio introduction updated successfully`,
                practitioner: updatedPractitioner
            };
        },

        update_practitioner_oracle_message: async (_: any, args: { practitionerId: string, oracleMessage: any }, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            await protect_via_merchant_access(context.dataSources.cosmos, context.userId, args.practitionerId);

            // Get existing practitioner
            const existing = await context.dataSources.cosmos.get_record<vendor_type>("Main-Vendor", args.practitionerId, args.practitionerId);
            if (!existing) {
                throw new GraphQLError(`Practitioner with ID ${args.practitionerId} not found`, {
                    extensions: { code: 'NOT_FOUND' },
                });
            }

            if (existing.docType !== VendorDocType.PRACTITIONER) {
                throw new GraphQLError(`Record ${args.practitionerId} is not a practitioner profile`, {
                    extensions: { code: 'BAD_REQUEST' },
                });
            }

            // Build the oracle message with timestamps
            let oracleMessage = null;
            if (args.oracleMessage) {
                const now = new Date();
                const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
                oracleMessage = {
                    id: args.oracleMessage.id || `oracle-${Date.now()}`,
                    audio: args.oracleMessage.audio,
                    message: args.oracleMessage.message || null,
                    postedAt: now.toISOString(),
                    expiresAt: expiresAt.toISOString()
                };
            }

            // Update the oracle message in practitioner profile
            const updatedProfile = {
                ...existing.practitioner!,
                oracleMessage: oracleMessage
            };

            // Patch the practitioner field
            const container = await context.dataSources.cosmos.get_container("Main-Vendor");
            await container.item(args.practitionerId, args.practitionerId).patch([
                { op: "set", path: "/practitioner", value: updatedProfile }
            ]);

            const updatedPractitioner = await context.dataSources.cosmos.get_record("Main-Vendor", args.practitionerId, args.practitionerId);

            return {
                code: "200",
                success: true,
                message: oracleMessage ? `Daily oracle message posted successfully` : `Daily oracle message removed successfully`,
                practitioner: updatedPractitioner
            };
        },

        update_practitioner_pinned_reviews: async (_: any, args: { practitionerId: string, pinnedReviewIds: string[] }, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            await protect_via_merchant_access(context.dataSources.cosmos, context.userId, args.practitionerId);

            // Get existing practitioner
            const existing = await context.dataSources.cosmos.get_record<vendor_type>("Main-Vendor", args.practitionerId, args.practitionerId);
            if (!existing) {
                throw new GraphQLError(`Practitioner with ID ${args.practitionerId} not found`, {
                    extensions: { code: 'NOT_FOUND' },
                });
            }

            if (existing.docType !== VendorDocType.PRACTITIONER) {
                throw new GraphQLError(`Record ${args.practitionerId} is not a practitioner profile`, {
                    extensions: { code: 'BAD_REQUEST' },
                });
            }

            // Limit to maximum 3 pinned reviews
            const pinnedReviewIds = args.pinnedReviewIds.slice(0, 3);

            // Update the pinned reviews in practitioner profile
            const updatedProfile = {
                ...existing.practitioner!,
                pinnedReviewIds: pinnedReviewIds
            };

            // Patch the practitioner field
            const container = await context.dataSources.cosmos.get_container("Main-Vendor");
            await container.item(args.practitionerId, args.practitionerId).patch([
                { op: "set", path: "/practitioner", value: updatedProfile }
            ]);

            const updatedPractitioner = await context.dataSources.cosmos.get_record("Main-Vendor", args.practitionerId, args.practitionerId);

            return {
                code: "200",
                success: true,
                message: `Pinned testimonials updated successfully`,
                practitioner: updatedPractitioner
            };
        },

        // Linked Shopfronts mutations
        link_shopfront_to_practitioner: async (_: any, args: { practitionerId: string, merchantId: string }, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            await protect_via_merchant_access(context.dataSources.cosmos, context.userId, args.practitionerId);

            // Get practitioner
            const practitioner = await context.dataSources.cosmos.get_record<vendor_type>("Main-Vendor", args.practitionerId, args.practitionerId);
            if (!practitioner || practitioner.docType !== VendorDocType.PRACTITIONER) {
                throw new GraphQLError(`Practitioner with ID ${args.practitionerId} not found`, {
                    extensions: { code: 'NOT_FOUND' },
                });
            }

            // Get merchant to link
            const merchant = await context.dataSources.cosmos.get_record<vendor_type>("Main-Vendor", args.merchantId, args.merchantId);
            if (!merchant) {
                throw new GraphQLError(`Merchant with ID ${args.merchantId} not found`, {
                    extensions: { code: 'NOT_FOUND' },
                });
            }

            // Verify user owns the merchant too
            await protect_via_merchant_access(context.dataSources.cosmos, context.userId, args.merchantId);

            // Get existing linked shopfronts or initialize empty array
            const existingShopfronts = practitioner.practitioner?.linkedShopfronts || [];

            // Check if already linked
            if (existingShopfronts.some(s => s.merchantId === args.merchantId)) {
                return {
                    code: "400",
                    success: false,
                    message: `Shopfront is already linked to this practitioner`,
                    practitioner: practitioner
                };
            }

            // Add new linked shopfront
            const newShopfront = {
                merchantId: merchant.id,
                merchantSlug: merchant.slug,
                merchantName: merchant.name,
                merchantLogo: merchant.logo?.url || null,
                displayOrder: existingShopfronts.length
            };

            const updatedShopfronts = [...existingShopfronts, newShopfront];

            // Update practitioner profile
            const updatedProfile = {
                ...practitioner.practitioner!,
                linkedShopfronts: updatedShopfronts
            };

            const container = await context.dataSources.cosmos.get_container("Main-Vendor");
            await container.item(args.practitionerId, args.practitionerId).patch([
                { op: "set", path: "/practitioner", value: updatedProfile }
            ]);

            const updatedPractitioner = await context.dataSources.cosmos.get_record("Main-Vendor", args.practitionerId, args.practitionerId);

            return {
                code: "200",
                success: true,
                message: `Shopfront linked successfully`,
                practitioner: updatedPractitioner
            };
        },

        unlink_shopfront_from_practitioner: async (_: any, args: { practitionerId: string, merchantId: string }, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            await protect_via_merchant_access(context.dataSources.cosmos, context.userId, args.practitionerId);

            // Get practitioner
            const practitioner = await context.dataSources.cosmos.get_record<vendor_type>("Main-Vendor", args.practitionerId, args.practitionerId);
            if (!practitioner || practitioner.docType !== VendorDocType.PRACTITIONER) {
                throw new GraphQLError(`Practitioner with ID ${args.practitionerId} not found`, {
                    extensions: { code: 'NOT_FOUND' },
                });
            }

            // Get existing linked shopfronts
            const existingShopfronts = practitioner.practitioner?.linkedShopfronts || [];

            // Remove the shopfront
            const updatedShopfronts = existingShopfronts
                .filter(s => s.merchantId !== args.merchantId)
                .map((s, index) => ({ ...s, displayOrder: index })); // Reorder

            // Update practitioner profile
            const updatedProfile = {
                ...practitioner.practitioner!,
                linkedShopfronts: updatedShopfronts
            };

            const container = await context.dataSources.cosmos.get_container("Main-Vendor");
            await container.item(args.practitionerId, args.practitionerId).patch([
                { op: "set", path: "/practitioner", value: updatedProfile }
            ]);

            const updatedPractitioner = await context.dataSources.cosmos.get_record("Main-Vendor", args.practitionerId, args.practitionerId);

            return {
                code: "200",
                success: true,
                message: `Shopfront unlinked successfully`,
                practitioner: updatedPractitioner
            };
        },

        update_linked_shopfront_order: async (_: any, args: { practitionerId: string, merchantId: string, displayOrder: number }, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            await protect_via_merchant_access(context.dataSources.cosmos, context.userId, args.practitionerId);

            // Get practitioner
            const practitioner = await context.dataSources.cosmos.get_record<vendor_type>("Main-Vendor", args.practitionerId, args.practitionerId);
            if (!practitioner || practitioner.docType !== VendorDocType.PRACTITIONER) {
                throw new GraphQLError(`Practitioner with ID ${args.practitionerId} not found`, {
                    extensions: { code: 'NOT_FOUND' },
                });
            }

            // Get existing linked shopfronts
            const existingShopfronts = practitioner.practitioner?.linkedShopfronts || [];

            // Find and update the shopfront order
            const shopfrontIndex = existingShopfronts.findIndex(s => s.merchantId === args.merchantId);
            if (shopfrontIndex === -1) {
                throw new GraphQLError(`Shopfront ${args.merchantId} is not linked to this practitioner`, {
                    extensions: { code: 'NOT_FOUND' },
                });
            }

            // Update display order
            const updatedShopfronts = existingShopfronts.map(s =>
                s.merchantId === args.merchantId ? { ...s, displayOrder: args.displayOrder } : s
            ).sort((a, b) => a.displayOrder - b.displayOrder);

            // Update practitioner profile
            const updatedProfile = {
                ...practitioner.practitioner!,
                linkedShopfronts: updatedShopfronts
            };

            const container = await context.dataSources.cosmos.get_container("Main-Vendor");
            await container.item(args.practitionerId, args.practitionerId).patch([
                { op: "set", path: "/practitioner", value: updatedProfile }
            ]);

            const updatedPractitioner = await context.dataSources.cosmos.get_record("Main-Vendor", args.practitionerId, args.practitionerId);

            return {
                code: "200",
                success: true,
                message: `Shopfront order updated successfully`,
                practitioner: updatedPractitioner
            };
        },

        // Testimonial mutations
        create_testimonial_request: async (_: any, args: { practitionerId: string, clientEmail?: string, clientName?: string }, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            await protect_via_merchant_access(context.dataSources.cosmos, context.userId, args.practitionerId);

            // Get practitioner details
            const practitioner = await context.dataSources.cosmos.get_record<vendor_type>("Main-Vendor", args.practitionerId, args.practitionerId);
            if (!practitioner) {
                throw new GraphQLError(`Practitioner with ID ${args.practitionerId} not found`, {
                    extensions: { code: 'NOT_FOUND' },
                });
            }

            if (practitioner.docType !== VendorDocType.PRACTITIONER) {
                throw new GraphQLError(`Record ${args.practitionerId} is not a practitioner profile`, {
                    extensions: { code: 'BAD_REQUEST' },
                });
            }

            // Generate a unique token for the request link
            const token = generate_human_friendly_id('TM', 16);

            // Create the testimonial request
            const requestId = uuidv4();
            const now = new Date();
            const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

            const testimonialRequest = {
                id: requestId,
                vendorId: args.practitionerId,
                type: 'TESTIMONIAL_REQUEST',
                practitionerId: args.practitionerId,
                practitionerName: practitioner.name,
                practitionerSlug: practitioner.slug,
                token: token,
                clientEmail: args.clientEmail || null,
                clientName: args.clientName || null,
                requestStatus: 'PENDING',
                createdAt: now.toISOString(),
                expiresAt: expiresAt.toISOString(),
                submittedAt: null
            };

            await context.dataSources.cosmos.add_record("Main-VendorSettings", testimonialRequest, args.practitionerId, context.userId);

            // Build the submission URL
            const baseUrl = process.env.FRONTEND_URL || 'https://spiriverse.com';
            const submissionUrl = `${baseUrl}/testimonial/submit?token=${token}`;

            return {
                code: "200",
                success: true,
                message: "Testimonial request created successfully",
                request: testimonialRequest,
                submissionUrl: submissionUrl
            };
        },

        submit_testimonial: async (_: any, args: { token: string, input: { clientName: string, rating: number, headline: string, text: string, relationship?: string } }, context: serverContext) => {
            // Look up the testimonial request by token (no auth required - using token-based access)
            const requests = await context.dataSources.cosmos.run_query<any>("Main-VendorSettings", {
                query: `SELECT * FROM c WHERE c.type = 'TESTIMONIAL_REQUEST' AND c.token = @token`,
                parameters: [
                    { name: "@token", value: args.token }
                ]
            }, true);

            if (requests.length === 0) {
                throw new GraphQLError("Invalid or expired testimonial request link", {
                    extensions: { code: 'NOT_FOUND' },
                });
            }

            const request = requests[0];

            // Check if already submitted
            if (request.requestStatus === 'SUBMITTED') {
                throw new GraphQLError("This testimonial has already been submitted", {
                    extensions: { code: 'BAD_REQUEST' },
                });
            }

            // Check if expired
            const now = new Date();
            const expiresAt = new Date(request.expiresAt);
            if (now > expiresAt) {
                throw new GraphQLError("This testimonial request has expired", {
                    extensions: { code: 'BAD_REQUEST' },
                });
            }

            // Validate rating
            if (args.input.rating < 1 || args.input.rating > 5) {
                throw new GraphQLError("Rating must be between 1 and 5", {
                    extensions: { code: 'BAD_REQUEST' },
                });
            }

            // Create the testimonial
            const testimonialId = uuidv4();
            const testimonial = {
                id: testimonialId,
                vendorId: request.practitionerId,
                type: 'TESTIMONIAL',
                practitionerId: request.practitionerId,
                clientName: args.input.clientName,
                clientEmail: request.clientEmail || null,
                rating: args.input.rating,
                headline: args.input.headline,
                text: args.input.text,
                relationship: args.input.relationship || null,
                createdAt: now.toISOString(),
                requestId: request.id
            };

            await context.dataSources.cosmos.add_record("Main-VendorSettings", testimonial, request.practitionerId, "GUEST");

            // Update the request status to SUBMITTED
            const container = await context.dataSources.cosmos.get_container("Main-VendorSettings");
            await container.item(request.id, request.practitionerId).patch([
                { op: "set", path: "/requestStatus", value: "SUBMITTED" },
                { op: "set", path: "/submittedAt", value: now.toISOString() },
                { op: "set", path: "/testimonialId", value: testimonialId }
            ]);

            return {
                code: "200",
                success: true,
                message: "Thank you for your testimonial!",
                testimonial: testimonial
            };
        },

        delete_testimonial: async (_: any, args: { practitionerId: string, testimonialId: string }, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            await protect_via_merchant_access(context.dataSources.cosmos, context.userId, args.practitionerId);

            // Delete the testimonial
            await context.dataSources.cosmos.delete_record("Main-VendorSettings", args.testimonialId, args.practitionerId, context.userId);

            return {
                code: "200",
                success: true,
                message: "Testimonial deleted successfully"
            };
        },

        update_practitioner_pinned_testimonials: async (_: any, args: { practitionerId: string, pinnedTestimonialIds: string[] }, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            await protect_via_merchant_access(context.dataSources.cosmos, context.userId, args.practitionerId);

            // Get existing practitioner
            const existing = await context.dataSources.cosmos.get_record<vendor_type>("Main-Vendor", args.practitionerId, args.practitionerId);
            if (!existing) {
                throw new GraphQLError(`Practitioner with ID ${args.practitionerId} not found`, {
                    extensions: { code: 'NOT_FOUND' },
                });
            }

            if (existing.docType !== VendorDocType.PRACTITIONER) {
                throw new GraphQLError(`Record ${args.practitionerId} is not a practitioner profile`, {
                    extensions: { code: 'BAD_REQUEST' },
                });
            }

            // Limit to maximum 3 pinned testimonials
            const pinnedTestimonialIds = args.pinnedTestimonialIds.slice(0, 3);

            // Update the pinned testimonials in practitioner profile
            const updatedProfile = {
                ...existing.practitioner!,
                pinnedTestimonialIds: pinnedTestimonialIds
            };

            // Patch the practitioner field
            const container = await context.dataSources.cosmos.get_container("Main-Vendor");
            await container.item(args.practitionerId, args.practitionerId).patch([
                { op: "set", path: "/practitioner", value: updatedProfile }
            ]);

            const updatedPractitioner = await context.dataSources.cosmos.get_record("Main-Vendor", args.practitionerId, args.practitionerId);

            return {
                code: "200",
                success: true,
                message: `Pinned testimonials updated successfully`,
                practitioner: updatedPractitioner
            };
        },

        update_vendor: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            const result = await context.dataSources.cosmos.update_record("Main-Vendor", args.vendor.id, args.vendor.id, args.vendor, context.userId)

            return {
                code: "200",
                success: true,
                message: `Vendor ${args.vendor.id} successfully updated`,
                vendor: await context.dataSources.cosmos.get_record("Main-Vendor", args.vendor.id, args.vendor.id)
            }
        },
        update_merchant_theme: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";
            const merchantId = args.merchantId

            // we need to remove socialStyle and then apply a patch to the social property after the core update
            const tmpStyle = args.theme.socialStyle;
            delete args.theme.socialStyle;

            await context.dataSources.cosmos.update_record("Main-Vendor", merchantId, merchantId, args.theme, context.userId)

            // now patch the background image or logo if they were not provided
            // this would mean the person wants to remove the image
            if (args.theme.background.image == null) {
                await context.dataSources.cosmos.patch_record("Main-Vendor", merchantId, merchantId, [
                    { op: "set", path: "/background/image", value: null}
                ], context.userId)
            }
            if (args.theme.logo == null) {
                await context.dataSources.cosmos.patch_record("Main-Vendor", merchantId, merchantId, [
                    { op: "set", path: "/logo", value: null}
                ], context.userId)
            }
            if (!isNullOrWhiteSpace(tmpStyle)) {
                await context.dataSources.cosmos.patch_record("Main-Vendor", merchantId, merchantId, [
                    { op: "set", path: "/social/style", value: tmpStyle}
                ], context.userId)
            }

            return {
                code: "200",
                success: true,
                message: `Theme for vendor ${merchantId} successfully updated`,
                vendor: await context.dataSources.cosmos.get_record("Main-Vendor", merchantId, merchantId)
            }
        },
        update_merchant_descriptions: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";
            const merchantId = args.merchantId

            const container = await context.dataSources.cosmos.get_container("Main-Vendor")
            const operations : PatchOperation[] = [
                { op: "set", path: '/descriptions', value: args.descriptions}
            ]
            await container.item(merchantId, merchantId).patch(operations)
            
            return {
                code: "200",
                success: true,
                message: `Descriptions for vendor ${merchantId} successfully updated`,
                vendor: await context.dataSources.cosmos.get_record("Main-Vendor", merchantId, merchantId)
            }
        },
        update_merchant_locations: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            const merchantId = args.merchantId
            const container = await context.dataSources.cosmos.get_container("Main-Vendor")
            const operations : PatchOperation[] = [
                { op: "set", path: '/locations', value: args.locations}
            ]
            await container.item(merchantId, merchantId).patch(operations)

            return {
                code: "200",
                success: true,
                message: `Locations for vendor ${merchantId} successfully updated`,
                vendor: await context.dataSources.cosmos.get_record("Main-Vendor", merchantId, merchantId)
            }
        },
        update_merchant_intro: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            let intro = args.intro;
            if (!isNullOrWhiteSpace(intro)) {
                // we want to remove any trailing
                //<p dir=\"ltr\" class=\"editor-paragraph\"><br></p>
                intro = intro.replace(/<p dir="ltr" class="editor-paragraph"><br><\/p>$/, "")
            }

            const merchantId = args.merchantId
            const container = await context.dataSources.cosmos.get_container("Main-Vendor")
            const operations : PatchOperation[] = [
                { op: "set", path: '/intro', value: intro}
            ]
            await container.item(merchantId, merchantId).patch(operations)

            return {
                code: "200",
                success: true,
                message: `Intro for vendor ${merchantId} successfully updated`,
                vendor: await context.dataSources.cosmos.get_record("Main-Vendor", merchantId, merchantId)
            }
        },
        update_merchant_promise_banner: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            let promiseBanner = args.promiseBanner;
            if (!isNullOrWhiteSpace(promiseBanner)) {
                // Remove any trailing empty paragraphs
                promiseBanner = promiseBanner.replace(/<p dir="ltr" class="editor-paragraph"><br><\/p>$/, "")
            }

            const merchantId = args.merchantId
            const container = await context.dataSources.cosmos.get_container("Main-Vendor")
            const operations : PatchOperation[] = [
                { op: "set", path: '/promiseBanner', value: promiseBanner}
            ]
            await container.item(merchantId, merchantId).patch(operations)

            return {
                code: "200",
                success: true,
                message: `Promise banner for vendor ${merchantId} successfully updated`,
                vendor: await context.dataSources.cosmos.get_record("Main-Vendor", merchantId, merchantId)
            }
        },
        update_merchant_banner_config: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            const merchantId = args.merchantId
            const bannerConfig = args.bannerConfig

            const container = await context.dataSources.cosmos.get_container("Main-Vendor")
            const operations : PatchOperation[] = [
                { op: "set", path: '/bannerConfig', value: bannerConfig}
            ]
            await container.item(merchantId, merchantId).patch(operations)

            return {
                code: "200",
                success: true,
                message: `Banner configuration for vendor ${merchantId} successfully updated`,
                vendor: await context.dataSources.cosmos.get_record("Main-Vendor", merchantId, merchantId)
            }
        },
        update_merchant_video: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            const merchantId = args.merchantId
            const video = args.video
            const videoSettings = args.videoSettings

            // Get current vendor to access existing videos
            const vendor = await context.dataSources.cosmos.get_record<vendor_type>("Main-Vendor", merchantId, merchantId)
            
            // Add new video to beginning of array and keep only latest 5
            const videos = video ? [video, ...(vendor.videos || [])].slice(0, 5) : vendor.videos

            const container = await context.dataSources.cosmos.get_container("Main-Vendor")
            const operations : PatchOperation[] = [
                { op: "set", path: '/videos', value: videos}
            ]

            // Only update videoSettings if provided
            if (videoSettings) {
                operations.push({ op: "set", path: '/videoSettings', value: videoSettings})
            }

            await container.item(merchantId, merchantId).patch(operations)

            return {
                code: "200",
                success: true,
                message: `Videos for vendor ${merchantId} successfully updated`,
                vendor: await context.dataSources.cosmos.get_record("Main-Vendor", merchantId, merchantId)
            }
        },
        update_teamMembers: async (_: any, args: any, context: serverContext) => {
            // this endpoint assumes that we can update via replacing the entire team member list
            if (context.userId == null) throw "User must be present for this call";

            // ensure that all team members have an id otherwise throw error
            if (args.teamMembers.filter((x: any) => x.id == null).length > 0) {
                throw new GraphQLError(`All team members must have an id for updating`, {
                    extensions: { code: 'BAD_REQUEST'},
                  });
            }

            const operations : PatchOperation[] =
            [
                { op: "set", path: '/teamMembers', value: args.teamMembers}
            ];
            const container = await context.dataSources.cosmos.get_container("Main-Vendor")
            await container.item(args.merchantId, args.merchantId).patch(operations)
            
            // now retrieve it
            const vendor = await context.dataSources.cosmos.get_record<vendor_type>("Main-Vendor", args.merchantId, args.merchantId)

            return {
                code: "200",
                success: true,
                message: `Team members of vendor ${args.merchantId} successfully updated`,
                teamMembers: vendor.teamMembers
            }
        },
        update_merchant_socials: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            const merchantId = args.merchantId
            context.logger.logMessage(`Updating social URLs for merchant ${merchantId}: ${JSON.stringify(args.socials)}`);

            const container = await context.dataSources.cosmos.get_container("Main-Vendor")

            const operations : PatchOperation[] = [
                { op: "set", path: '/social', value: {
                    style: args.style,
                    platforms: args.socials
                }}
            ]
            await container.item(merchantId, merchantId).patch(operations)

            const updatedVendor = await context.dataSources.cosmos.get_record<vendor_type>("Main-Vendor", merchantId, merchantId);
            context.logger.logMessage(`Social URLs saved for merchant ${merchantId}: ${JSON.stringify(updatedVendor.social)}`);

            return {
                code: "200",
                success: true,
                message: `Socials for vendor ${merchantId} successfully updated`,
                vendor: updatedVendor
            }
        },
        upsert_product_return_policies: async (_: any, args: any, context: serverContext) => {
            var logger = context.logger;
            var logID = generate_human_friendly_id("LG");
            logger.logMessage(`Request to upsert product return policies for vendor ${args.merchantId} by user ${context.userId}`, logID);

            // this will just add a record
            if (context.userId == null) throw "User must be present for this call";

            const merchantId = args.merchantId
            await protect_via_merchant_access(context.dataSources.cosmos, context.userId, merchantId)

            // we need to add type: "PRODUCT_RETURN_POLICY" to all of the incoming policies
            const policies = args.policies.map((policy) => ({
                ...policy,
                type: "PRODUCT_RETURN_POLICY",
                vendorId: merchantId,
                updatedDate: DateTime.now().toISO()
            }))

            // now we need to add them in first check do they exist already, if they do we do an update otherwise we just add_record
            const existingPolicies = await context.dataSources.cosmos.run_query("Main-VendorSettings", {
                query: "SELECT VALUE c.id FROM c WHERE c.vendorId = @merchantId AND c.type = 'PRODUCT_RETURN_POLICY'",
                parameters: [{ name: "@merchantId", value: merchantId }]
            }, true)

            for (const policy of policies) {
                if (existingPolicies.includes(policy.id)) {
                    await context.dataSources.cosmos.update_record("Main-VendorSettings", policy.id, merchantId, policy, context.userId)
                } else {
                    await context.dataSources.cosmos.add_record("Main-VendorSettings", policy, merchantId, context.userId)
                }
            }

            logger.logMessage(`Product return policies for vendor ${merchantId} successfully updated`, logID);

            return {
                code: "200",
                success: true,
                message: `Product return policies for vendor ${merchantId} successfully updated`,
                policies: await context.dataSources.cosmos.run_query("Main-VendorSettings", {
                    query: "SELECT * FROM c WHERE c.vendorId = @merchantId AND c.type = 'PRODUCT_RETURN_POLICY'",
                    parameters: [{ name: "@merchantId", value: merchantId }]
                }, false)
            }
        },
        delete_product_return_policy: async (_: any, args: { policyId: string, merchantId: string }, context: serverContext) => {
            protect_via_merchant_access(context.dataSources.cosmos, context.userId, args.merchantId);

            // if its attached to a listing we need to make it inactive
            const resp = await context.dataSources.cosmos.run_query("Main-Listing", {
                query: "SELECT VALUE c.id FROM c WHERE c.productReturnPolicyId = @policyId",
                parameters: [{ name: "@policyId", value: args.policyId }]
            }, true);
            // otherwise we can remove it from the container
            if (resp.length > 0) {
                // do a soft delete
                await context.dataSources.cosmos.delete_record("Main-VendorSettings", args.policyId, args.merchantId, context.userId)
            } else {
                // we can do a hard delete
                await context.dataSources.cosmos.purge_record("Main-VendorSettings", args.policyId, args.merchantId)
            }

            return {
                code: "200",
                message: `Product return policy ${args.policyId} successfully deleted`,
                success: true
            }
        },
        upsert_service_cancellation_policies: async (_: any, args: any, context: serverContext) => {
            var logger = context.logger;
            var logID = generate_human_friendly_id("LG");
            logger.logMessage(`Request to upsert service cancellation policies for vendor ${args.merchantId} by user ${context.userId}`, logID);

            if (context.userId == null) throw "User must be present for this call";

            const merchantId = args.merchantId
            await protect_via_merchant_access(context.dataSources.cosmos, context.userId, merchantId)

            // Add type: "SERVICE_CANCELLATION_POLICY" to all of the incoming policies
            const policies = args.policies.map((policy) => ({
                ...policy,
                type: "SERVICE_CANCELLATION_POLICY",
                vendorId: merchantId,
                updatedDate: DateTime.now().toISO()
            }))

            // Check if policies exist already, if they do we update otherwise we add_record
            const existingPolicies = await context.dataSources.cosmos.run_query("Main-VendorSettings", {
                query: "SELECT VALUE c.id FROM c WHERE c.vendorId = @merchantId AND c.type = 'SERVICE_CANCELLATION_POLICY'",
                parameters: [{ name: "@merchantId", value: merchantId }]
            }, true)

            for (const policy of policies) {
                if (existingPolicies.includes(policy.id)) {
                    await context.dataSources.cosmos.update_record("Main-VendorSettings", policy.id, merchantId, policy, context.userId)
                } else {
                    await context.dataSources.cosmos.add_record("Main-VendorSettings", policy, merchantId, context.userId)
                }
            }

            logger.logMessage(`Service cancellation policies for vendor ${merchantId} successfully updated`, logID);

            return {
                code: "200",
                success: true,
                message: `Service cancellation policies for vendor ${merchantId} successfully updated`,
                policies: await context.dataSources.cosmos.run_query("Main-VendorSettings", {
                    query: "SELECT * FROM c WHERE c.vendorId = @merchantId AND c.type = 'SERVICE_CANCELLATION_POLICY'",
                    parameters: [{ name: "@merchantId", value: merchantId }]
                }, false)
            }
        },
        delete_service_cancellation_policy: async (_: any, args: { policyId: string, merchantId: string }, context: serverContext) => {
            protect_via_merchant_access(context.dataSources.cosmos, context.userId, args.merchantId);

            // Check if policy is attached to any services
            const resp = await context.dataSources.cosmos.run_query("Main-Listing", {
                query: "SELECT VALUE c.id FROM c WHERE c.cancellationPolicyId = @policyId",
                parameters: [{ name: "@policyId", value: args.policyId }]
            }, true);

            // If attached to services, do soft delete; otherwise hard delete
            if (resp.length > 0) {
                await context.dataSources.cosmos.delete_record("Main-VendorSettings", args.policyId, args.merchantId, context.userId)
            } else {
                await context.dataSources.cosmos.purge_record("Main-VendorSettings", args.policyId, args.merchantId)
            }

            return {
                code: "200",
                message: `Service cancellation policy ${args.policyId} successfully deleted`,
                success: true
            }
        },
        setPaymentAsDefaultForVendor: async (_: any, args: {vendorId: string, paymentMethodId: string}, context: serverContext) => {

            var vendor = await context.dataSources.cosmos.get_record<any>("Main-Vendor", args.vendorId, args.vendorId);

            var setDefaultResp = await context.dataSources.stripe.callApi(HTTPMethod.post, `customers/${vendor.stripe.customerId}`, {
                "invoice_settings[default_payment_method]": args.paymentMethodId
            })
            if (setDefaultResp.status != 200) {
                throw new GraphQLError(`Error setting account default.`, {
                    extensions: { code: 'BAD_REQUEST'},
                  });
            }

            var defaultPaymentMethodResp = await context.dataSources.stripe.callApi(HTTPMethod.get, `payment_methods/${args.paymentMethodId}`, null)
            if (defaultPaymentMethodResp.status == 200) {
                const type = defaultPaymentMethodResp.data.type;
                var descriptor = "";
                if (type == "card") descriptor = `Card XXX${defaultPaymentMethodResp.data.card.last4}`
                const paymentMethodObj = {
                    defaultPaymentMethod: {
                        type,
                        descriptor
                    }
                }

                // now just patch cosmos to remove the setup intent secret
                var container = await context.dataSources.cosmos.get_container("Main-Vendor")
                const operations : PatchOperation[] = [{ op: "remove", path: `/stripe/setupIntent`}]
                await container.item(args.vendorId, args.vendorId).patch(operations)

                return {
                    code: "200",
                    success: true,
                    message: `Default payment method updated for vendor ${args.vendorId}`,
                    vendor: {
                        id: args.vendorId,
                        defaultPaymentMethodResp :  paymentMethodObj
                    }
                }
            }
            else {
                return {
                    code: "500",
                    success: true,
                    message: `Couldn't find payment method as default`
                }
            }
            
        },
        attachBankAccount: async (_: any, 
            args: {
                vendorId: string, 
                bankTokenId: string,
                physicalAddress: string, 
                taxId: string,
                legalName:string,
                ip_address: string
            }, context: serverContext) => {
            const vendor = await context.dataSources.cosmos.get_record<any>("Main-Vendor", args.vendorId, args.vendorId);

            try {
              // Attach the bank account to the Stripe account
              await context.dataSources.stripe.callApi("POST", `accounts/${vendor.stripe.accountId}/external_accounts`, {
                external_account: args.bankTokenId
              })

              // accept the stripe terms for connected account
              await context.dataSources.stripe.callApi("POST", `accounts/${vendor.stripe.accountId}`, {
                tos_acceptance: {
                    date: Math.round(DateTime.local().valueOf() / 1000),
                    ip: args.ip_address
                }
              })

              return {
                code: "200",
                success: true,
                message: `Default payment method updated for vendor ${args.vendorId}`
              }

            } catch (error) {
              
                return {
                    code: "500",
                    success: false,
                    message: error
                }

            }
        },
        updateBusinessProfile: async (_: any, 
            args: {
                vendorId: string, 
                physicalAddress: string, 
                taxId: string,
                legalName:string,
            }, context: serverContext) => {
            const vendor = await context.dataSources.cosmos.get_record<any>("Main-Vendor", args.vendorId, args.vendorId);

            try {

              // accept the stripe terms for connected account
              await context.dataSources.stripe.callApi("POST", `accounts/${vendor.stripe.accountId}`, {
                
              })

              return {
                code: "200",
                success: true,
                message: `Default payment method updated for vendor ${args.vendorId}`
              }

            } catch (error) {
              
                return {
                    code: "500",
                    success: false,
                    message: error
                }

            }
        },
        clearMerchantWelcomeMessage: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            const container = await context.dataSources.cosmos.get_container("Main-Vendor")
            await container.item(args.vendorId, args.vendorId).patch([
                { op: "remove", path: "/onStart"}
            ])

            return {
                code: "200",
                success: true,
                message: `Welcome message for vendor ${args.vendorId} successfully removed`
            }
        },
        deleteOrphanedStripeAssets: async (_: any, args: any, context: serverContext) => {
            const db_vendors = await context.dataSources.cosmos.get_all<vendor_type>("Main-Vendor");
            
            let stripe_assets_impacted_count = 0;

            const iterate_and_delete_accounts = async (accounts: any[]) => {
                for (const account of accounts) {
                    if (!db_vendors.some((x: any) => x.stripe.accountId == account.id)) {
                        await context.dataSources.stripe.callApi(HTTPMethod.delete, `accounts/${account.id}`, null)
                        stripe_assets_impacted_count += 1;
                    }
                }
            }

            const iterate_and_delete_customers = async (customers: any[]) => {
                for (const customer of customers) {
                    if (!db_vendors.some((x: any) => x.stripe.customerId == customer.id)) {
                        await context.dataSources.stripe.callApi(HTTPMethod.delete, `customers/${customer.id}`, null)
                        stripe_assets_impacted_count += 1;
                    }
                }
            }

            let stripe_accounts_resp = await context.dataSources.stripe.callApi(HTTPMethod.get, "accounts", null)
            while(stripe_accounts_resp.data.has_more) {
                iterate_and_delete_accounts(stripe_accounts_resp.data.data)
                stripe_accounts_resp = await context.dataSources.stripe.callApi(HTTPMethod.get, "accounts", {starting_after: stripe_accounts_resp.data.data[stripe_accounts_resp.data.data.length - 1].id})
            }
            // now do one more for the last page
            iterate_and_delete_accounts(stripe_accounts_resp.data.data)

            // now we delete out the vendors customer accounts that are oprhaned
            let stripe_customers_resp = await context.dataSources.stripe.callApi(HTTPMethod.get, "customers", null)
            while(stripe_customers_resp.data.has_more) {
                iterate_and_delete_customers(stripe_customers_resp.data.data)
                stripe_customers_resp = await context.dataSources.stripe.callApi(HTTPMethod.get, "customers", {starting_after: stripe_customers_resp.data.data[stripe_customers_resp.data.data.length - 1].id})
            }
            // now do one more for the last page
            iterate_and_delete_customers(stripe_customers_resp.data.data)

            return stripe_assets_impacted_count;
        },
        /**
         * Complete Stripe onboarding for a test merchant account.
         * This uses Stripe's test values to fill in all required verification data.
         * ONLY works in test mode - will fail in production.
         *
         * Uses Stripe test values:
         * - DOB: 1901-01-01 (successful match)
         * - SSN: 000000000 (successful match)
         * - Address: address_full_match (successful validation)
         * - Phone: 0000000000 (successful validation)
         */
        complete_stripe_test_onboarding: async (_: any, args: { merchantId: string }, context: serverContext) => {
            // Verify user is authenticated
            if (context.userId == null) {
                throw new GraphQLError('User must be authenticated', {
                    extensions: { code: 'UNAUTHENTICATED' },
                });
            }

            // Get the vendor to get the Stripe account ID
            const vendor = await context.dataSources.cosmos.get_record<vendor_type>(
                "Main-Vendor",
                args.merchantId,
                args.merchantId
            );

            if (!vendor) {
                throw new GraphQLError(`Vendor with ID ${args.merchantId} not found`, {
                    extensions: { code: 'NOT_FOUND' },
                });
            }

            if (!vendor.stripe?.accountId) {
                throw new GraphQLError('Vendor does not have a Stripe account', {
                    extensions: { code: 'BAD_REQUEST' },
                });
            }

            const stripeAccountId = vendor.stripe.accountId;

            // Get current account state to see what's required
            const accountResp = await context.dataSources.stripe.callApi(
                HTTPMethod.get,
                `accounts/${stripeAccountId}`
            );

            if (accountResp.status !== 200) {
                throw new GraphQLError('Failed to retrieve Stripe account', {
                    extensions: { code: 'INTERNAL_SERVER_ERROR' },
                });
            }

            const currentlyDue = accountResp.data.requirements?.currently_due || [];
            console.log(`[complete_stripe_test_onboarding] Currently due for ${stripeAccountId}:`, currentlyDue);

            // Get the vendor's country for proper address formatting
            const vendorCountry = vendor.country || 'AU';

            // Build country-specific test address
            // Using Stripe's documented test values for successful verification
            const getTestAddress = (country: string) => {
                switch (country) {
                    case 'US':
                        return {
                            line1: 'address_full_match',
                            city: 'San Francisco',
                            state: 'CA',
                            postal_code: '94111',
                            country: 'US'
                        };
                    case 'AU':
                        return {
                            line1: 'address_full_match',
                            city: 'Sydney',
                            state: 'NSW',
                            postal_code: '2000',
                            country: 'AU'
                        };
                    case 'GB':
                        return {
                            line1: 'address_full_match',
                            city: 'London',
                            postal_code: 'SW1A 1AA',
                            country: 'GB'
                        };
                    case 'CA':
                        return {
                            line1: 'address_full_match',
                            city: 'Toronto',
                            state: 'ON',
                            postal_code: 'M5V 1J2',
                            country: 'CA'
                        };
                    default:
                        // Default to matching the vendor's country
                        return {
                            line1: 'address_full_match',
                            city: 'Test City',
                            postal_code: '12345',
                            country: country
                        };
                }
            };

            // Build the update payload with test values for all commonly required fields
            const updatePayload: any = {
                business_profile: {
                    mcc: '5815', // Digital Goods Media
                    url: `https://www.spiriverse.com/m/${vendor.slug}`,
                    product_description: 'Spiritual services and digital products',
                },
                individual: {
                    first_name: 'Test',
                    last_name: 'Merchant',
                    email: vendor.contact?.public?.email || `test-${args.merchantId}@example.com`,
                    phone: '0000000000', // Stripe test value for successful validation
                    dob: {
                        day: 1,
                        month: 1,
                        year: 1901 // Stripe test value for successful match
                    },
                    address: getTestAddress(vendorCountry)
                },
                tos_acceptance: {
                    date: Math.floor(Date.now() / 1000),
                    ip: '127.0.0.1'
                },
                settings: {
                    payouts: {
                        schedule: {
                            interval: 'manual' // For test accounts, use manual payouts
                        }
                    }
                }
            };

            // Add country-specific ID verification
            // US requires SSN, other countries may require different ID types
            // For non-US countries, using DOB year 1901 should trigger successful verification
            // See: https://docs.stripe.com/connect/testing#test-verification-addresses
            if (vendorCountry === 'US') {
                updatePayload.individual.ssn_last_4 = '0000';
                updatePayload.individual.id_number = '000000000';
            }

            // For all countries: Ensure we're using the test values that bypass verification
            // DOB of 1901-01-01 combined with address_full_match should work

            // Update the account with test data
            const updateResp = await context.dataSources.stripe.callApi(
                HTTPMethod.post,
                `accounts/${stripeAccountId}`,
                updatePayload
            );

            if (updateResp.status !== 200) {
                console.error('[complete_stripe_test_onboarding] Update failed:', updateResp.data);
                throw new GraphQLError(`Failed to update Stripe account: ${JSON.stringify(updateResp.data?.error?.message || updateResp.data)}`, {
                    extensions: { code: 'INTERNAL_SERVER_ERROR' },
                });
            }

            // Create a Person with representative relationship for identity verification
            console.log('[complete_stripe_test_onboarding] Creating representative person...');

            // Check if representative already exists
            const existingPersons = await context.dataSources.stripe.callApi(
                HTTPMethod.get,
                `accounts/${stripeAccountId}/persons`
            );

            const hasRepresentative = existingPersons.data?.data?.some(
                (p: any) => p.relationship?.representative === true
            );

            if (!hasRepresentative) {
                const personPayload: any = {
                    first_name: 'Test',
                    last_name: 'Merchant',
                    email: vendor.contact?.public?.email || `test-${args.merchantId}@example.com`,
                    phone: '0000000000',
                    dob: {
                        day: 1,
                        month: 1,
                        year: 1901 // Stripe test value for successful verification
                    },
                    address: getTestAddress(vendorCountry),
                    relationship: {
                        representative: true,
                        executive: true,
                        title: 'Owner'
                    }
                };

                // Add country-specific ID for the person
                if (vendorCountry === 'US') {
                    personPayload.ssn_last_4 = '0000';
                    personPayload.id_number = '000000000';
                }

                const personResp = await context.dataSources.stripe.callApi(
                    HTTPMethod.post,
                    `accounts/${stripeAccountId}/persons`,
                    personPayload
                );

                if (personResp.status !== 200) {
                    console.error('[complete_stripe_test_onboarding] Person creation failed:', personResp.data);
                    // Don't throw - continue and report status
                } else {
                    console.log('[complete_stripe_test_onboarding] Representative person created:', personResp.data.id);
                }
            } else {
                console.log('[complete_stripe_test_onboarding] Representative already exists, skipping');
            }

            // Always add a test external account (bank) for payouts
            // This is required for charges to be enabled on most connected accounts
            console.log('[complete_stripe_test_onboarding] Adding test bank account...');

            // Use country-specific test bank account tokens
            // See: https://docs.stripe.com/connect/testing#test-bank-account-tokens
            const getTestBankToken = (country: string) => {
                switch (country) {
                    case 'US': return 'btok_us_verified';
                    case 'AU': return 'btok_au';
                    case 'GB': return 'btok_gb';
                    case 'CA': return 'btok_ca';
                    default: return 'btok_us_verified'; // Fallback
                }
            };

            // Check if external account already exists
            const existingExternalAccounts = await context.dataSources.stripe.callApi(
                HTTPMethod.get,
                `accounts/${stripeAccountId}/external_accounts`
            );

            const hasExternalAccount = existingExternalAccounts.data?.data?.length > 0;

            if (!hasExternalAccount) {
                const bankResp = await context.dataSources.stripe.callApi(
                    HTTPMethod.post,
                    `accounts/${stripeAccountId}/external_accounts`,
                    {
                        external_account: getTestBankToken(vendorCountry)
                    }
                );

                if (bankResp.status !== 200) {
                    console.error('[complete_stripe_test_onboarding] Bank account add failed:', bankResp.data);
                    // Don't throw - continue and report status
                } else {
                    console.log('[complete_stripe_test_onboarding] Bank account added successfully');
                }
            } else {
                console.log('[complete_stripe_test_onboarding] External account already exists, skipping');
            }

            // Retrieve final account state
            const finalAccountResp = await context.dataSources.stripe.callApi(
                HTTPMethod.get,
                `accounts/${stripeAccountId}`
            );

            const chargesEnabled = finalAccountResp.data?.charges_enabled || false;
            const payoutsEnabled = finalAccountResp.data?.payouts_enabled || false;
            const disabledReason = finalAccountResp.data?.requirements?.disabled_reason;
            const eventuallyDue = finalAccountResp.data?.requirements?.eventually_due || [];
            const pendingVerification = finalAccountResp.data?.requirements?.pending_verification || [];

            console.log(`[complete_stripe_test_onboarding] disabled_reason: ${disabledReason}`);
            console.log(`[complete_stripe_test_onboarding] eventually_due: ${eventuallyDue.join(', ')}`);
            console.log(`[complete_stripe_test_onboarding] pending_verification: ${pendingVerification.join(', ')}`);
            const remainingRequirements = finalAccountResp.data?.requirements?.currently_due || [];

            console.log(`[complete_stripe_test_onboarding] Final state - charges: ${chargesEnabled}, payouts: ${payoutsEnabled}, remaining: ${remainingRequirements.join(', ')}`);

            return {
                code: '200',
                success: chargesEnabled,
                message: chargesEnabled
                    ? 'Stripe onboarding completed successfully'
                    : `Onboarding incomplete. Remaining requirements: ${remainingRequirements.join(', ')}`,
                chargesEnabled,
                payoutsEnabled
            };
        },
        /**
         * Add a test card to a merchant's Stripe customer account.
         * Uses Stripe's test token pm_card_visa for a test Visa card.
         * ONLY works in test mode.
         */
        add_test_card: async (_: any, args: { merchantId: string }, context: serverContext) => {
            // Verify user is authenticated
            if (context.userId == null) {
                throw new GraphQLError('User must be authenticated', {
                    extensions: { code: 'UNAUTHENTICATED' },
                });
            }

            // Get the vendor to get the Stripe customer ID
            const vendor = await context.dataSources.cosmos.get_record<vendor_type>(
                "Main-Vendor",
                args.merchantId,
                args.merchantId
            );

            if (!vendor) {
                throw new GraphQLError(`Vendor with ID ${args.merchantId} not found`, {
                    extensions: { code: 'NOT_FOUND' },
                });
            }

            if (!vendor.stripe?.customerId) {
                throw new GraphQLError('Vendor does not have a Stripe customer account', {
                    extensions: { code: 'BAD_REQUEST' },
                });
            }

            const stripeCustomerId = vendor.stripe.customerId;
            console.log(`[add_test_card] Adding test card for customer ${stripeCustomerId}`);

            // Create a payment method using Stripe's test token
            // See: https://docs.stripe.com/testing#cards
            const createPmResp = await context.dataSources.stripe.callApi(
                HTTPMethod.post,
                'payment_methods',
                {
                    type: 'card',
                    card: {
                        token: 'tok_visa' // Stripe test token for Visa card
                    }
                }
            );

            if (createPmResp.status !== 200) {
                console.error('[add_test_card] Failed to create payment method:', createPmResp.data);
                throw new GraphQLError('Failed to create test payment method', {
                    extensions: { code: 'INTERNAL_SERVER_ERROR' },
                });
            }

            const paymentMethodId = createPmResp.data.id;
            console.log(`[add_test_card] Created payment method: ${paymentMethodId}`);

            // Attach the payment method to the customer
            const attachResp = await context.dataSources.stripe.callApi(
                HTTPMethod.post,
                `payment_methods/${paymentMethodId}/attach`,
                {
                    customer: stripeCustomerId
                }
            );

            if (attachResp.status !== 200) {
                console.error('[add_test_card] Failed to attach payment method:', attachResp.data);
                throw new GraphQLError('Failed to attach test card to customer', {
                    extensions: { code: 'INTERNAL_SERVER_ERROR' },
                });
            }

            const card = attachResp.data.card;
            console.log(`[add_test_card] ✅ Card attached: ${card.brand} ****${card.last4}`);

            return {
                code: '200',
                success: true,
                message: 'Test card added successfully',
                card: {
                    id: paymentMethodId,
                    last4: card.last4,
                    brand: card.brand,
                    exp_month: card.exp_month,
                    exp_year: card.exp_year
                }
            };
        },
        /**
         * Create a SetupIntent for adding a new card to a merchant's Stripe customer account.
         * Returns the clientSecret needed by Stripe Elements on the frontend.
         */
        create_card_setup_intent: async (_: any, args: { merchantId: string }, context: serverContext) => {
            // Verify user is authenticated
            if (context.userId == null) {
                throw new GraphQLError('User must be authenticated', {
                    extensions: { code: 'UNAUTHENTICATED' },
                });
            }

            // Get the vendor to get the Stripe customer ID
            const vendor = await context.dataSources.cosmos.get_record<vendor_type>(
                "Main-Vendor",
                args.merchantId,
                args.merchantId
            );

            if (!vendor) {
                throw new GraphQLError(`Vendor with ID ${args.merchantId} not found`, {
                    extensions: { code: 'NOT_FOUND' },
                });
            }

            if (!vendor.stripe?.customerId) {
                throw new GraphQLError('Vendor does not have a Stripe customer account', {
                    extensions: { code: 'BAD_REQUEST' },
                });
            }

            const stripeCustomerId = vendor.stripe.customerId;
            console.log(`[create_card_setup_intent] Creating SetupIntent for customer ${stripeCustomerId}`);

            // Create a SetupIntent to save the card for future use
            const setupIntentResp = await context.dataSources.stripe.callApi(
                HTTPMethod.post,
                'setup_intents',
                {
                    customer: stripeCustomerId,
                    payment_method_types: ['card'],
                    usage: 'off_session', // Allow using this card for future payments
                    metadata: {
                        merchantId: args.merchantId,
                        purpose: 'merchant_payment_method'
                    }
                }
            );

            if (setupIntentResp.status !== 200) {
                console.error('[create_card_setup_intent] Failed to create SetupIntent:', setupIntentResp.data);
                throw new GraphQLError('Failed to create card setup', {
                    extensions: { code: 'INTERNAL_SERVER_ERROR' },
                });
            }

            console.log(`[create_card_setup_intent] ✅ SetupIntent created: ${setupIntentResp.data.id}`);

            return {
                code: '200',
                success: true,
                message: 'Card setup intent created',
                clientSecret: setupIntentResp.data.client_secret
            };
        },
        delete_vendor: async (_: any, args: { vendorId: string }, context: serverContext) => {
            // Verify user is authenticated
            if (context.userId == null) {
                throw new GraphQLError('User must be authenticated to delete a vendor', {
                    extensions: { code: 'UNAUTHENTICATED' },
                });
            }

            // Get the vendor to verify it exists and user has permission
            const vendor = await context.dataSources.cosmos.get_record<vendor_type>(
                "Main-Vendor",
                args.vendorId,
                args.vendorId
            );

            if (!vendor) {
                throw new GraphQLError(`Vendor with ID ${args.vendorId} not found`, {
                    extensions: { code: 'NOT_FOUND' },
                });
            }

            // Verify the current user owns this vendor
            const user = await context.dataSources.cosmos.get_record<user_type>(
                "Main-User",
                context.userId,
                context.userId
            );

            const ownsVendor = user.vendors?.some((v: any) => v.id === args.vendorId);
            if (!ownsVendor) {
                throw new GraphQLError('You do not have permission to delete this vendor', {
                    extensions: { code: 'FORBIDDEN' },
                });
            }

            // Delete the vendor document
            await context.dataSources.cosmos.delete_record(
                "Main-Vendor",
                args.vendorId,
                args.vendorId,
                context.userId
            );

            // Remove vendor from user's vendors array
            const userPatchOps: PatchOperation[] = [
                {
                    op: 'set',
                    path: '/vendors',
                    value: user.vendors?.filter((v: any) => v.id !== args.vendorId) || []
                }
            ];

            await context.dataSources.cosmos.patch_record(
                "Main-User",
                context.userId,
                context.userId,
                userPatchOps,
                context.userId
            );

            return {
                code: '200',
                success: true,
                message: `Vendor ${vendor.name} (${args.vendorId}) successfully deleted`
            };
        },
        purge_vendor: async (_: any, args: { vendorId: string }, context: serverContext) => {
            // Verify user is authenticated
            if (context.userId == null) {
                throw new GraphQLError('User must be authenticated to purge a vendor', {
                    extensions: { code: 'UNAUTHENTICATED' },
                });
            }

            // Get the vendor to verify it exists and user has permission
            const vendor = await context.dataSources.cosmos.get_record<vendor_type>(
                "Main-Vendor",
                args.vendorId,
                args.vendorId
            );

            if (!vendor) {
                throw new GraphQLError(`Vendor with ID ${args.vendorId} not found`, {
                    extensions: { code: 'NOT_FOUND' },
                });
            }

            // Verify the current user owns this vendor
            const user = await context.dataSources.cosmos.get_record<user_type>(
                "Main-User",
                context.userId,
                context.userId
            );

            if (!user) {
                throw new GraphQLError(`User ${context.userId} not found`, {
                    extensions: { code: 'NOT_FOUND' },
                });
            }

            const ownsVendor = user.vendors?.some((v: any) => v.id === args.vendorId);
            if (!ownsVendor) {
                throw new GraphQLError('You do not have permission to purge this vendor', {
                    extensions: { code: 'FORBIDDEN' },
                });
            }

            // Delete Stripe accounts before purging vendor document
            if (vendor.stripe?.accountId) {
                try {
                    await context.dataSources.stripe.callApi(HTTPMethod.delete, `accounts/${vendor.stripe.accountId}`, null);
                    context.logger.logMessage(`[PURGE] Deleted Stripe connected account ${vendor.stripe.accountId}`);
                } catch (error) {
                    context.logger.error(`[PURGE] Failed to delete Stripe account ${vendor.stripe.accountId}: ${error}`);
                    // Continue anyway - we still want to purge the vendor
                }
            }
            if (vendor.stripe?.customerId) {
                try {
                    await context.dataSources.stripe.callApi(HTTPMethod.delete, `customers/${vendor.stripe.customerId}`, null);
                    context.logger.logMessage(`[PURGE] Deleted Stripe customer ${vendor.stripe.customerId}`);
                } catch (error) {
                    context.logger.error(`[PURGE] Failed to delete Stripe customer ${vendor.stripe.customerId}: ${error}`);
                    // Continue anyway - we still want to purge the vendor
                }
            }

            // CASCADE DELETE: Purge all listings for this vendor
            try {
                const listings = await context.dataSources.cosmos.get_all<{ id: string }>("Main-Listing", args.vendorId);
                if (listings.length > 0) {
                    context.logger.logMessage(`[PURGE] Deleting ${listings.length} listings for vendor ${args.vendorId}`);
                    for (const listing of listings) {
                        try {
                            await context.dataSources.cosmos.purge_record("Main-Listing", listing.id, args.vendorId);
                        } catch (err) {
                            context.logger.error(`[PURGE] Failed to delete listing ${listing.id}: ${err}`);
                        }
                    }
                }
            } catch (error) {
                context.logger.error(`[PURGE] Failed to clean up listings: ${error}`);
            }

            // CASCADE DELETE: Purge all social posts for this vendor
            try {
                const socialPosts = await context.dataSources.cosmos.get_all<{ id: string }>("Main-SocialPost", args.vendorId);
                if (socialPosts.length > 0) {
                    context.logger.logMessage(`[PURGE] Deleting ${socialPosts.length} social posts for vendor ${args.vendorId}`);
                    for (const post of socialPosts) {
                        try {
                            await context.dataSources.cosmos.purge_record("Main-SocialPost", post.id, args.vendorId);
                        } catch (err) {
                            context.logger.error(`[PURGE] Failed to delete social post ${post.id}: ${err}`);
                        }
                    }
                }
            } catch (error) {
                context.logger.error(`[PURGE] Failed to clean up social posts: ${error}`);
            }

            // CASCADE DELETE: Purge all vendor settings (testimonials, testimonial requests) for this vendor
            try {
                const vendorSettings = await context.dataSources.cosmos.get_all<{ id: string }>("Main-VendorSettings", args.vendorId);
                if (vendorSettings.length > 0) {
                    context.logger.logMessage(`[PURGE] Deleting ${vendorSettings.length} vendor settings for vendor ${args.vendorId}`);
                    for (const setting of vendorSettings) {
                        try {
                            await context.dataSources.cosmos.purge_record("Main-VendorSettings", setting.id, args.vendorId);
                        } catch (err) {
                            context.logger.error(`[PURGE] Failed to delete vendor setting ${setting.id}: ${err}`);
                        }
                    }
                }
            } catch (error) {
                context.logger.error(`[PURGE] Failed to clean up vendor settings: ${error}`);
            }

            // CASCADE DELETE: Purge all bookings for this vendor (cross-partition query)
            try {
                const bookingsQuery = {
                    query: "SELECT c.id, c.type, c.customerEmail FROM c WHERE c.vendorId = @vendorId",
                    parameters: [{ name: "@vendorId", value: args.vendorId }]
                };
                const bookings = await context.dataSources.cosmos.run_query<{ id: string; type: string; customerEmail: string }>("Main-Bookings", bookingsQuery);
                if (bookings.length > 0) {
                    context.logger.logMessage(`[PURGE] Deleting ${bookings.length} bookings for vendor ${args.vendorId}`);
                    for (const booking of bookings) {
                        try {
                            // Bookings are partitioned by [type, customerEmail]
                            await context.dataSources.cosmos.purge_record("Main-Bookings", booking.id, [booking.type, booking.customerEmail]);
                        } catch (err) {
                            context.logger.error(`[PURGE] Failed to delete booking ${booking.id}: ${err}`);
                        }
                    }
                }
            } catch (error) {
                context.logger.error(`[PURGE] Failed to clean up bookings: ${error}`);
            }

            // CASCADE DELETE: Purge reading requests where this vendor is the reader (practitioner)
            try {
                const readingRequestsQuery = {
                    query: "SELECT c.id, c.userId FROM c WHERE c.docType = 'READING_REQUEST' AND c.readerId = @vendorId",
                    parameters: [{ name: "@vendorId", value: args.vendorId }]
                };
                const readingRequests = await context.dataSources.cosmos.run_query<{ id: string; userId: string }>("Main-PersonalSpace", readingRequestsQuery);
                if (readingRequests.length > 0) {
                    context.logger.logMessage(`[PURGE] Deleting ${readingRequests.length} reading requests for practitioner ${args.vendorId}`);
                    for (const request of readingRequests) {
                        try {
                            // PersonalSpace is partitioned by userId
                            await context.dataSources.cosmos.purge_record("Main-PersonalSpace", request.id, request.userId);
                        } catch (err) {
                            context.logger.error(`[PURGE] Failed to delete reading request ${request.id}: ${err}`);
                        }
                    }
                }
            } catch (error) {
                context.logger.error(`[PURGE] Failed to clean up reading requests: ${error}`);
            }

            // HARD DELETE the vendor document (purge, not soft delete)
            await context.dataSources.cosmos.purge_record(
                "Main-Vendor",
                args.vendorId,
                args.vendorId
            );

            // Remove vendor from user's vendors array
            const userPatchOps: PatchOperation[] = [
                {
                    op: 'set',
                    path: '/vendors',
                    value: user.vendors?.filter((v: any) => v.id !== args.vendorId) || []
                }
            ];

            await context.dataSources.cosmos.patch_record(
                "Main-User",
                context.userId,
                context.userId,
                userPatchOps,
                context.userId
            );

            return {
                code: '200',
                success: true,
                message: `Vendor ${vendor.name} (${args.vendorId}) successfully purged`
            };
        },
        sendMerchantRequest: async (_: any, args: any, context: serverContext) => {
            var customer = {} as any;
            if (context.userId == null) {
                if (args.customerDetails == null) throw "User information must be present for this call";
                customer = args.customerDetails;
            } else {
                customer = await context.dataSources.cosmos.get_record<user_type>("Main-User", context.userId, context.userId)
                
                customer = {
                    name: `${customer.firstname} ${customer.lastname}`,
                    email: customer.email,
                    phone: customer.phoneNumber
                }
            }

            customer.phone = !isNullOrWhiteSpace(customer.phone) ? customer.phone : "Not provided"

            const merchant = await context.dataSources.cosmos.get_record<vendor_type>("Main-Vendor", args.merchantId, args.merchantId)

            // send the email and we'll cc the user
            await context.dataSources.email.sendEmail(
                sender_details.from,
                merchant.contact.public.email,
                "MERCHANT_REQUEST",
                {
                    customer,
                    merchant: { name: merchant.name },
                    request: args.request
                },
                [customer.email])

            return {
                code: "200",
                success: true,
                message: `Merchant request sent to ${merchant.contact.public.email}`
            }
        },
        update_profile_visibility: async (_: any, args: any, context: serverContext) => {
            if (context.userId == null) throw "User must be present for this call";

            const merchantId = args.merchantId;
            protect_via_merchant_access(context.dataSources.cosmos, context.userId, merchantId);

            const container = await context.dataSources.cosmos.get_container("Main-Vendor");
            const operations: PatchOperation[] = [
                { op: "set", path: '/profileVisibility', value: args.visibility }
            ];
            await container.item(merchantId, merchantId).patch(operations);

            return {
                code: "200",
                success: true,
                message: `Profile visibility for vendor ${merchantId} successfully updated`,
                vendor: await context.dataSources.cosmos.get_record("Main-Vendor", merchantId, merchantId)
            };
        }
    },
    Vendor: {
        listings: async(parent: any, _: any, context: serverContext) => {
            return await context.dataSources.cosmos.get_all("Main-Listing", parent.id);
        },
        stripe: async (parent: any, _: any, context: serverContext) => {
            // we try to update with the default payment method if its been set
            if (parent.stripe != null) {
                try {
                    var getCustomerResp = await context.dataSources.stripe.callApi(HTTPMethod.get, `customers/${parent.stripe.customerId}`, null)
                    if (getCustomerResp.status == 200) {
                        var defaultPaymentMethodId = getCustomerResp.data.invoice_settings.default_payment_method;
                        if (defaultPaymentMethodId != null) {
                            var defaultPaymentMethodResp = await context.dataSources.stripe.callApi(HTTPMethod.get, `payment_methods/${defaultPaymentMethodId}`, null)
                            if (defaultPaymentMethodResp.status == 200) {
                                const type = defaultPaymentMethodResp.data.type;
                                var descriptor = "";
                                if (type == "card") descriptor = `Card XXX${defaultPaymentMethodResp.data.card.last4}`
                                const paymentMethodObj = {
                                    defaultPaymentMethod: {
                                        type,
                                        descriptor
                                    }
                                }
                                return mergeDeep(parent.stripe, paymentMethodObj)
                            } else {
                                return parent.stripe
                            }
                        }
                        else {
                            return parent.stripe;
                        }
                    } else {
                        return parent.stripe;
                    }
                } catch (error) {
                    // If Stripe API call fails (e.g., customer doesn't exist), just return the raw data
                    context.logger?.warn(`Failed to fetch Stripe customer data for ${parent.stripe.customerId}:`, error);
                    return parent.stripe;
                }
            } else {
                return parent.stripe;
            }
        },
        socialPosts: async(parent: any, _: any, context: serverContext) => {
            return await (await context.dataSources.cosmos.get_all<socialpost_type>("Main-SocialPost", parent.id))
                .sort(x => DateTime.fromISO(x.availableAfter).toUnixInteger() * -1);
        },
        stripe_business: async(parent: any, _: any, context: serverContext) => {
            if (parent.stripe != null) {
                var getCustomerResp = await context.dataSources.stripe.callApi(HTTPMethod.get, `accounts/${parent.stripe.accountId}`, null)
                if (getCustomerResp.status == 200) {
                    return {
                        vendorId: parent.id,
                        id: parent.stripe.accountId,
                        country: getCustomerResp.data.country,
                        currency: getCustomerResp.data.default_currency,
                        disabled_reason: getCustomerResp.data.requirements.disabled_reason,
                        charges_enabled: getCustomerResp.data.charges_enabled,
                        payouts_enabled: getCustomerResp.data.payouts_enabled,
                        currently_due: getCustomerResp.data.requirements.currently_due,
                        past_due: getCustomerResp.data.requirements.past_due
                    }
                }
            }
            return null;
        },
        customers: async(parent: vendor_type, _:any, context: serverContext) => {
            const bookingUsers = await context.dataSources.cosmos.run_query("Main-Bookings", {
                query: "SELECT DISTINCT VALUE c.userId FROM c WHERE c.vendorId = @vendorId",
                parameters: [
                    { name: "@vendorId", value: parent.id}
                ]
            }, true)

            const caseUsers = await context.dataSources.cosmos.run_query("Main-Cases", {
                query: "SELECT DISTINCT VALUE c.userId FROM c WHERE c.vendorId = @vendorId",
                parameters: [
                    { name: "@vendorId", value: parent.id}
                ]
            }, true)

            const orderUsers = await context.dataSources.cosmos.run_query("Main-Orders", {
                query: `
                    SELECT DISTINCT VALUE c.userId
                    FROM c
                    JOIN l IN c.lines
                    WHERE l.merchantId = @merchantId
                `, 
                parameters: [
                    { name: "@merchantId", value: parent.id }
                ]
            }, true)

            // add caseUsers, etc here 
            // get a distinct list of users
            const merchantUserIds = [
                ...new Set([
                    ...bookingUsers,
                    ...caseUsers,
                    ...orderUsers
                ])
            ]

            const users = await context.dataSources.cosmos.run_query("Main-User", {
                query: "SELECT c.id, c.email, c.firstname, c.lastname FROM c WHERE ARRAY_CONTAINS(@userIds, c.id)",
                parameters: [
                    { name: "@userIds", value: merchantUserIds}
                ]
            }, true)

            // order by the email
            return users.sort((a: any, b: any) => a.email.localeCompare(b.email))
        },
        hasRole: async(parent: vendor_type, args: { role: string }, { dataSources: { cosmos }, userId } : serverContext) => {
            if (isNullOrWhiteSpace(args.role)) return true;

            const user_vendors = await cosmos.run_query<{
                vendors: { id: string, role: string }[]
            }>("Main-User", {
                query: `
                    SELECT c.vendors
                    FROM c 
                    WHERE c.id = @userId
                `,
                parameters: [
                    { name: "@userId", value: userId }
                ]
            })

            if (user_vendors.length === 0) return false;

            const vendors = user_vendors[0].vendors;

            const hasRole = vendors && vendors.some(v => v.role === args.role && v.id === parent.id);

            return hasRole;
        },
        ref: async(parent: any, _: any, _context: serverContext) => {
            return {
                id: parent.id, partition: [parent.id], container: "Main-Vendor"
            }
        },
        cards: async (parent: vendor_type, _: any, context: serverContext) => {
            if (!context.userId) throw "User must be present for this call";

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
                            id: pm.id,
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
                context.logger?.error(`Error fetching payment methods for merchant ${parent.id}:`, error);
                return [];
            }
        },
        readingRating: async (parent: vendor_type, _: any, context: serverContext) => {
            // Only compute reading ratings for practitioners
            if (parent.docType !== VendorDocType.PRACTITIONER) {
                return null;
            }

            try {
                const readingRequestManager = new ReadingRequestManager(context.dataSources.cosmos);
                return await readingRequestManager.getPractitionerReadingRating(parent.id);
            } catch (error) {
                context.logger?.error(`Error fetching reading rating for practitioner ${parent.id}:`, error);
                return null;
            }
        }
    },
    VendorUser: {
        vendor: async (parent: any, _: any, context: serverContext) => {
            return await context.dataSources.cosmos.get_record("Main-Vendor", parent.vendorId, parent.vendorId)
        },
        user: async (parent: any, _: any, context: serverContext) => {
            return await context.dataSources.cosmos.get_record("Main-User", parent.userId, parent.userId)
        }
    },
    QuestionMode : {
        price: async (parent: any, _: any, context: serverContext) => await context.dataSources.stripe.retrievePrice(parent.priceId)
    },
    StripeBusinessAccount: {
        token: async(parent: any, args: any, context: serverContext) => {
            if (isNullOrUndefined(args.components)) throw "We need to know the components your trying to render";

            // they send args.components like [tax_registrations]
            // need to transform to dictionary like { tax_registrations: { enabled: true }}
            var components = args.components.reduce((acc: any, x: string) => {
                acc[x] = { enabled: true }
                return acc
            }, {})

            const token_resp = await context.dataSources.stripe.callApi(HTTPMethod.post, "account_sessions", {
                "account": parent.id,
                "components": components
            });

            if (token_resp.status != 200) {
                throw new GraphQLError(`Error creating account session.`, {
                    extensions: { code: 'BAD_REQUEST'},
                });
            }

            return token_resp.data.client_secret;
        },
        onboarding_link: async(parent: any, args: any, context: serverContext) => {
            if (isNullOrWhiteSpace(parent.disabled_reason)) return null;
            if (args.return_url == null) throw "Need to know where to send the user after success"
            
            var createOnboardingLinkResp = await context.dataSources.stripe.callApi(HTTPMethod.post, "account_links", {
                "account": parent.id,
                "refresh_url": args.return_url,
                "return_url": args.return_url,
                "type": "account_onboarding"
            })

            return createOnboardingLinkResp.data
        },
        onboarding_status: async(parent: any, _args: any, context: serverContext) => {
            var vendorAccount = await context.dataSources.stripe.callApi(HTTPMethod.get, `accounts/${parent.id}`)
            var isReady = vendorAccount.data.requirements.currently_due.length == 0 
                          && vendorAccount.data.requirements.eventually_due.length == 0
            return isReady
        },
        update_link: async(parent: any, args: any, context: serverContext) => {
            if (args.return_url == null) throw "Need to know where to send the user after success"

            // if the account is not ready then they need to onboard first
            var vendorAccount = await context.dataSources.stripe.callApi(HTTPMethod.get, `accounts/${parent.id}`)
            var isReady = vendorAccount.data.requirements.currently_due.length == 0 
                          && vendorAccount.data.requirements.eventually_due.length == 0
            if (!isReady) return null;
            
            var createOnboardingLinkResp = await context.dataSources.stripe.callApi(HTTPMethod.post, "account_links", {
                "account": parent.id,
                "refresh_url": args.return_url,
                "return_url": args.return_url,
                "type": "account_update"
            })

            return createOnboardingLinkResp.data
        }
    }
}

export const protect_via_merchant_access = async (cosmosClient: serverContext["dataSources"]["cosmos"], userId: string | null, merchantId: string) => {
    if (userId == null) throw "User must be present for this call";
    // check that they have access to the merchant
    const resp = await cosmosClient.run_query("Main-User", {
        query: "SELECT VALUE c.vendors FROM c WHERE c.id = @userId",
        parameters: [{ name: "@userId", value: userId }]
    }, true)
    if (resp.length < 1) throw `Vendor roles for user ${userId} could not be found.`
    const vendor_roles = resp[0]; 
    if (vendor_roles.find((x: any) => x.id == merchantId) == null) {
        throw new GraphQLError(`User ${userId} does not have access to merchant ${merchantId}`, {
            extensions: { code: 'BAD_REQUEST'},
          });
    }
}

export const merchants_users = async (cosmosClient: serverContext["dataSources"]["cosmos"], merchantIds: string[]) => {
    const users = await cosmosClient.run_query<user_type>("Main-User", {
        query: `
            SELECT VALUE c
            FROM c
            JOIN v in c.vendors
            WHERE ARRAY_CONTAINS(@merchantIds, v.id)
        `,
        parameters: [
            { name: "@merchantIds", value: merchantIds}
        ]
    }, true)
    return users;
}

const generate_vendor_no = async (customerEmail: string, cosmosClient: serverContext["dataSources"]["cosmos"]) => {
    const existingVendorNos = await cosmosClient.run_query("Main-Orders", {
        query: `SELECT VALUE c.vendor_no FROM c WHERE c.customerEmail = @customerEmail`,
        parameters: [{name: "@customerEmail", value: customerEmail}]
    }, true)

    var vendor_no = "";
    var maxDigits = 24;
    var attempts = 0;
    var maxAttempts = 500;

    while (isNullOrWhiteSpace(vendor_no) || existingVendorNos.includes(vendor_no) && attempts < maxAttempts) {
        vendor_no = generate_human_friendly_id("VD", maxDigits);
        maxDigits += 1; // opens the search space to wider for the uniqueness
        attempts++;
    }

    if (attempts == maxAttempts) {
        return uuidv4()
    }

    return vendor_no;
}

export { resolvers, generate_vendor_no }
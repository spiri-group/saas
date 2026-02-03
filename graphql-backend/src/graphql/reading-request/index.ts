import { serverContext } from "../../services/azFunction";
import { ReadingRequestManager } from "./manager";
import { createQueryResolver } from "../../utils/resolvers";
import { user_type } from "../user/types";
import { vendor_type } from "../vendor/types";
import { PersonalSpaceManager } from "../personal-space/manager";
import {
  spread_type,
  reading_request_status,
  reading_request_type,
  reading_review_type,
  create_reading_request_input,
  claim_reading_request_input,
  fulfill_reading_request_input,
  review_reading_request_input,
} from "./types";

const manager = (context: serverContext) => new ReadingRequestManager(context.dataSources.cosmos);

export const readingRequestResolvers = {
  Query: {
    spreadConfigs: createQueryResolver(
      (ds) => ds.getSpreadConfigs()
    )(manager),

    myReadingRequests: createQueryResolver(
      (ds, args: { userId: string; status?: reading_request_status }) =>
        ds.getMyReadingRequests(args.userId, args.status)
    )(manager),

    readingRequest: createQueryResolver(
      (ds, args: { id: string; userId: string }) =>
        ds.getReadingRequest(args.id, args.userId)
    )(manager),

    availableReadingRequests: createQueryResolver(
      (ds, args: { limit?: number; offset?: number }) =>
        ds.getAvailableReadingRequests(args.limit, args.offset)
    )(manager),

    claimedReadingRequests: createQueryResolver(
      (ds, args: { readerId: string }) =>
        ds.getClaimedReadingRequests(args.readerId)
    )(manager),

    myCompletedReadings: createQueryResolver(
      (ds, args: { userId: string }) =>
        ds.getMyCompletedReadings(args.userId)
    )(manager),

    practitionerReviews: async (_: unknown, { practitionerId }: { practitionerId: string }, context: serverContext) => {
      const ds = manager(context);

      // 1. Get reviews from SpiriReading requests (embedded on request documents)
      const requests = await ds.getPractitionerReviews(practitionerId);
      const spiriReadingReviews = requests
        .filter(req => req.review)
        .map(req => ({
          id: req.review!.id || req.id,
          rating: req.review!.rating,
          headline: req.review!.headline,
          text: req.review!.text,
          createdAt: req.review!.createdAt,
          userName: req.userName
        }));

      // 2. Get reviews from Main-Comments for services owned by this practitioner
      // First, get all service listing IDs for this practitioner
      const services = await context.dataSources.cosmos.run_query<{ id: string }>("Main-Listing", {
        query: "SELECT c.id FROM c WHERE c.vendorId = @vendorId AND c.category IN ('READING', 'HEALING', 'COACHING')",
        parameters: [{ name: "@vendorId", value: practitionerId }]
      }, true);

      const serviceIds = services.map(s => s.id);

      let serviceReviews: Array<{
        id: string;
        rating: number;
        headline: string;
        text: string;
        createdAt: string;
        userName?: string;
      }> = [];

      if (serviceIds.length > 0) {
        // Query Main-Comments for reviews on these services
        // Note: This uses cross-partition query since reviews are partitioned by [forObject.partition, forObject.id]
        const comments = await context.dataSources.cosmos.run_query<{
          id: string;
          rating: number;
          headline: string;
          text: string;
          createdDate: string;
          posted_by_userId: string;
          type: string;
          forObject: { id: string };
        }>("Main-Comments", {
          query: `SELECT * FROM c WHERE c.type = 'REVIEWS_AND_RATING' AND ARRAY_CONTAINS(@serviceIds, c.forObject.id)`,
          parameters: [{ name: "@serviceIds", value: serviceIds }]
        }, true);

        // Get user names for the reviewers
        const userIds = [...new Set(comments.map(c => c.posted_by_userId))];
        const users = await Promise.all(
          userIds.map(async (userId) => {
            const user = await context.dataSources.cosmos.get_record<{ id: string; firstname?: string; lastname?: string }>(
              "Main-User", userId, userId
            );
            return { userId, name: user?.firstname ? `${user.firstname} ${user.lastname || ''}`.trim() : 'Anonymous' };
          })
        );
        const userNameMap = new Map(users.map(u => [u.userId, u.name]));

        serviceReviews = comments.map(comment => ({
          id: comment.id,
          rating: comment.rating,
          headline: comment.headline,
          text: comment.text,
          createdAt: comment.createdDate,
          userName: userNameMap.get(comment.posted_by_userId) || 'Anonymous'
        }));
      }

      // 3. Combine and sort by date (newest first)
      const allReviews = [...spiriReadingReviews, ...serviceReviews];
      allReviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return allReviews;
    },
  },

  Mutation: {
    createReadingRequest: async (_: unknown, { input }: { input: create_reading_request_input }, context: serverContext) => {
      if (!context.userId) throw new Error("User must be authenticated");

      // Get user details
      const user = await context.dataSources.cosmos.get_record<user_type>("Main-User", input.userId, input.userId);
      if (!user) {
        return { success: false, message: "User not found" };
      }

      // Create or resolve Stripe customer
      const stripeCustomer = await context.dataSources.stripe.resolveCustomer(user.email);

      const ds = manager(context);

      // If user provided an existing payment method, use it directly
      if (input.paymentMethodId) {
        // Verify the payment method belongs to this customer
        const pmResp = await context.dataSources.stripe.callApi("GET", `payment_methods/${input.paymentMethodId}`);
        if (pmResp.status !== 200) {
          return { success: false, message: "Invalid payment method" };
        }
        if (pmResp.data.customer !== stripeCustomer.id) {
          return { success: false, message: "Payment method does not belong to this user" };
        }

        // Create request with existing payment method (no setup intent needed)
        return ds.createReadingRequestWithSavedCard(
          input,
          user.email,
          user.firstname && user.lastname ? `${user.firstname} ${user.lastname}` : undefined,
          stripeCustomer.id,
          input.paymentMethodId
        );
      }

      // Create Stripe setup intent for new payment method
      const intent = await context.dataSources.stripe.callApi("POST", "setup_intents", {
        customer: stripeCustomer.id,
        metadata: {
          target: "READING_REQUEST",
          userId: input.userId,
          spreadType: input.spreadType,
          topic: input.topic,
          customerEmail: user.email
        }
      });

      if (intent.status !== 200) {
        return { success: false, message: "Error creating payment setup in Stripe" };
      }

      return ds.createReadingRequest(
        input,
        user.email,
        user.firstname && user.lastname ? `${user.firstname} ${user.lastname}` : undefined,
        stripeCustomer.id,
        intent.data["id"],
        intent.data["client_secret"]
      );
    },

    markReadingRequestPaid: async (_: unknown, { requestId }: { requestId: string }, context: serverContext) => {
      const ds = manager(context);
      return ds.markReadingRequestPaid(requestId);
    },

    claimReadingRequest: async (_: unknown, { input }: { input: claim_reading_request_input }, context: serverContext) => {
      if (!context.userId) throw new Error("User must be authenticated");

      const { requestId, readerId } = input;
      const { cosmos } = context.dataSources;

      // 1. Find the reading request (must be AWAITING_CLAIM)
      const querySpec = {
        query: "SELECT * FROM c WHERE c.id = @id AND c.docType = @docType AND c.requestStatus = @reqStatus",
        parameters: [
          { name: "@id", value: requestId },
          { name: "@docType", value: "READING_REQUEST" },
          { name: "@reqStatus", value: "AWAITING_CLAIM" }
        ]
      };

      const results = await cosmos.run_query<reading_request_type>("Main-PersonalSpace", querySpec);
      if (results.length === 0) {
        return { success: false, message: "Reading request not found or already claimed" };
      }

      const request = results[0];

      // 2. Verify the reader's (merchant's) has a connected Stripe account (needed for later fulfillment)
      const merchant = await cosmos.get_record<vendor_type>("Main-Vendor", readerId, readerId);
      if (!merchant) {
        return { success: false, message: "Reader merchant not found" };
      }
      if (!merchant.stripe?.accountId) {
        return { success: false, message: "Reader does not have a connected Stripe account" };
      }

      // 3. Verify payment method is available (will be charged on fulfillment)
      if (!request.stripe?.paymentMethodId && !request.stripe?.setupIntentId) {
        return { success: false, message: "No payment method saved for this request" };
      }

      // 4. Lock the reading request to this reader (no payment yet - that happens on fulfillment)
      // Set a shotclock deadline - reader has 24 hours to fulfill
      const shotclockHours = 24;
      const claimDeadline = new Date(Date.now() + shotclockHours * 60 * 60 * 1000).toISOString();

      const ds = manager(context);
      const result = await ds.claimReadingRequest(input, claimDeadline);

      // TODO: Broadcast via SignalR that this request has been claimed
      // so other readers see it disappear from their Request Bank in real-time

      return result;
    },

    fulfillReadingRequest: async (_: unknown, { input }: { input: fulfill_reading_request_input }, context: serverContext) => {
      if (!context.userId) throw new Error("User must be authenticated");

      const { requestId, readerId } = input;
      const { cosmos, stripe } = context.dataSources;

      // 1. Find the claimed reading request
      const querySpec = {
        query: "SELECT * FROM c WHERE c.id = @id AND c.docType = @docType AND c.claimedBy = @readerId AND c.requestStatus = @reqStatus",
        parameters: [
          { name: "@id", value: requestId },
          { name: "@docType", value: "READING_REQUEST" },
          { name: "@readerId", value: readerId },
          { name: "@reqStatus", value: "CLAIMED" }
        ]
      };

      const results = await cosmos.run_query<reading_request_type>("Main-PersonalSpace", querySpec);
      if (results.length === 0) {
        return { success: false, message: "Reading request not found or not claimed by you" };
      }

      const request = results[0];

      // 2. Get the reader's (merchant's) connected Stripe account
      const merchant = await cosmos.get_record<vendor_type>("Main-Vendor", readerId, readerId);
      if (!merchant) {
        return { success: false, message: "Reader merchant not found" };
      }
      if (!merchant.stripe?.accountId) {
        return { success: false, message: "Reader does not have a connected Stripe account" };
      }

      const connectedAccountId = merchant.stripe.accountId;

      // 3. Get the payment method - either from saved card or from setup intent
      let paymentMethodId: string;

      if (request.stripe?.paymentMethodId) {
        // User used a saved card - payment method is stored directly
        paymentMethodId = request.stripe.paymentMethodId;
      } else if (request.stripe?.setupIntentId) {
        // User added a new card via setup intent - retrieve payment method from it
        const setupIntentResp = await stripe.callApi("GET", `setup_intents/${request.stripe.setupIntentId}`);
        if (setupIntentResp.status !== 200 || !setupIntentResp.data.payment_method) {
          return { success: false, message: "Could not retrieve saved payment method" };
        }
        paymentMethodId = setupIntentResp.data.payment_method;
      } else {
        return { success: false, message: "No payment method saved for this request" };
      }

      // 4. Clone the payment method to the connected account
      const connectedStripe = stripe.asConnectedAccount(connectedAccountId);
      const clonedPaymentMethodResp = await connectedStripe.callApi("POST", "payment_methods", {
        customer: request.stripeCustomerId,
        payment_method: paymentMethodId
      });

      if (clonedPaymentMethodResp.status !== 200) {
        context.logger.error(`Failed to clone payment method: ${JSON.stringify(clonedPaymentMethodResp.data)}`);
        return { success: false, message: "Failed to clone payment method to reader's account" };
      }

      const clonedPaymentMethodId = clonedPaymentMethodResp.data.id;

      // 5. Create payment intent on the connected account with application fee
      const paymentIntentResp = await connectedStripe.callApi("POST", "payment_intents", {
        amount: request.price,
        currency: merchant.currency || "aud",
        payment_method: clonedPaymentMethodId,
        application_fee_amount: request.platformFee,
        confirm: true, // Immediately capture the payment
        metadata: {
          target: "READING_REQUEST",
          readingRequestId: requestId,
          userId: request.userId,
          readerId: readerId,
          spreadType: request.spreadType
        }
      });

      if (paymentIntentResp.status !== 200) {
        context.logger.error(`Failed to create payment intent: ${JSON.stringify(paymentIntentResp.data)}`);
        return { success: false, message: `Payment failed: ${paymentIntentResp.data?.error?.message || "Unknown error"}` };
      }

      const paymentIntent = paymentIntentResp.data;

      // Check payment was successful
      if (paymentIntent.status !== "succeeded") {
        return { success: false, message: `Payment not completed. Status: ${paymentIntent.status}` };
      }

      // 6. Update the reading request with fulfillment info and payment details
      const ds = manager(context);
      const result = await ds.fulfillReadingRequestWithPayment(input, {
        paymentMethodId: clonedPaymentMethodId,
        paymentIntentId: paymentIntent.id,
        chargeId: paymentIntent.latest_charge,
        connectedAccountId
      });

      // 7. Update the user's personal symbol dictionary with symbols from the reading
      // This tracks symbols the user encounters across all their readings
      if (result.success && input.cards && input.cards.length > 0) {
        try {
          const personalSpaceManager = new PersonalSpaceManager(cosmos);
          await personalSpaceManager.updateSymbolsFromSpiriReading(
            request.userId,
            input.cards.map(c => c.name),
            readerId // The reader is the authenticated user making this call
          );
          context.logger.logMessage(`Updated symbol dictionary for user ${request.userId} with ${input.cards.length} cards`);
        } catch (symbolError) {
          // Log but don't fail the fulfillment if symbol update fails
          context.logger.error(`Failed to update user symbols: ${symbolError}`);
        }
      }

      return result;
    },

    cancelReadingRequest: async (_: unknown, { requestId, userId }: { requestId: string; userId: string }, context: serverContext) => {
      if (!context.userId) throw new Error("User must be authenticated");
      const ds = manager(context);
      return ds.cancelReadingRequest(requestId, userId);
    },

    releaseReadingRequest: async (_: unknown, { requestId, readerId }: { requestId: string; readerId: string }, context: serverContext) => {
      if (!context.userId) throw new Error("User must be authenticated");
      const ds = manager(context);
      return ds.releaseReadingRequest(requestId, readerId);
    },

    reviewReadingRequest: async (_: unknown, { input }: { input: review_reading_request_input }, context: serverContext) => {
      if (!context.userId) throw new Error("User must be authenticated");

      const { requestId, userId, rating, headline, text } = input;
      const { cosmos } = context.dataSources;

      // Validate rating is 1-5
      if (rating < 1 || rating > 5) {
        return { success: false, message: "Rating must be between 1 and 5" };
      }

      // 1. Find the reading request and verify it's fulfilled
      const request = await cosmos.get_record<reading_request_type>("Main-PersonalSpace", requestId, userId);
      if (!request) {
        return { success: false, message: "Reading request not found" };
      }

      if (request.userId !== userId) {
        return { success: false, message: "You can only review your own readings" };
      }

      if (request.requestStatus !== "FULFILLED") {
        return { success: false, message: "You can only review fulfilled readings" };
      }

      if (request.review) {
        return { success: false, message: "You have already reviewed this reading" };
      }

      // 2. Get user's name for the review
      const user = await cosmos.get_record<user_type>("Main-User", userId, userId);
      const userName = user?.firstname && user?.lastname
        ? `${user.firstname} ${user.lastname}`
        : user?.firstname || "Anonymous";

      // 3. Create the review object
      const now = new Date().toISOString();
      const review: reading_review_type = {
        id: `review-${requestId}`,
        rating,
        headline,
        text,
        createdAt: now,
        userId,
        userName,
      };

      // 4. Update the reading request with the review
      await cosmos.patch_record(
        "Main-PersonalSpace",
        requestId,
        userId,
        [
          { op: "set", path: "/review", value: review },
          { op: "set", path: "/updatedAt", value: now },
        ],
        context.userId
      );

      // 5. Update reader's rating stats on their vendor profile
      if (request.claimedBy) {
        try {
          const vendor = await cosmos.get_record<vendor_type>("Main-Vendor", request.claimedBy, request.claimedBy);
          if (vendor) {
            // Initialize or update reading ratings
            const currentReadingRating = vendor.readingRating || {
              total_count: 0,
              average: 0,
              rating1: 0,
              rating2: 0,
              rating3: 0,
              rating4: 0,
              rating5: 0,
            };

            // Increment the appropriate rating bucket
            const ratingKey = `rating${rating}` as keyof typeof currentReadingRating;
            const newRatingCount = (currentReadingRating[ratingKey] as number) + 1;
            const newTotalCount = currentReadingRating.total_count + 1;

            // Calculate new average
            const oldSum = currentReadingRating.average * currentReadingRating.total_count;
            const newAverage = (oldSum + rating) / newTotalCount;

            const updatedRating = {
              ...currentReadingRating,
              [ratingKey]: newRatingCount,
              total_count: newTotalCount,
              average: Math.round(newAverage * 100) / 100, // Round to 2 decimal places
            };

            await cosmos.patch_record(
              "Main-Vendor",
              request.claimedBy,
              request.claimedBy,
              [{ op: "set", path: "/readingRating", value: updatedRating }],
              context.userId
            );
          }
        } catch (error) {
          // Don't fail the review if we can't update vendor stats
          context.logger.warn(`Failed to update vendor reading rating: ${error}`);
        }
      }

      return {
        success: true,
        message: "Review submitted successfully",
        review,
      };
    },
  },

  ReadingRequest: {
    ref: async (parent: any) => {
      return {
        id: parent.id,
        partition: [parent.id],
        container: "Main-PersonalSpace"
      };
    }
  }
};

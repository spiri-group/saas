import { CosmosDataSource } from "../../utils/database";
import { v4 as uuid } from "uuid";
import { DateTime } from "luxon";
import {
  reading_request_type,
  reading_request_status,
  spread_type,
  create_reading_request_input,
  claim_reading_request_input,
  fulfill_reading_request_input,
  reading_request_response,
  reading_card_type,
  SPREAD_CONFIGS,
  spread_config
} from "./types";
import { user_type } from "../user/types";
import { extractSymbolsFromCard } from "../personal-space/tarot-symbols";
import { getSpiriverseFeeConfig, getTargetFeeConfig } from "../../utils/functions";

export class ReadingRequestManager {
  private containerName = "Main-PersonalSpace";
  private cosmos: CosmosDataSource;

  constructor(cosmos: CosmosDataSource) {
    this.cosmos = cosmos;
  }

  // ============================================
  // Spread Config Queries
  // ============================================

  async getSpreadConfigs(): Promise<spread_config[]> {
    return SPREAD_CONFIGS;
  }

  // ============================================
  // Reading Request Queries
  // ============================================

  async getMyReadingRequests(userId: string, status?: reading_request_status): Promise<reading_request_type[]> {
    let query = "SELECT * FROM c WHERE c.userId = @userId AND c.docType = @docType";
    const parameters: { name: string; value: any }[] = [
      { name: "@userId", value: userId },
      { name: "@docType", value: "READING_REQUEST" }
    ];

    if (status) {
      query += " AND c.requestStatus = @reqStatus";
      parameters.push({ name: "@reqStatus", value: status });
    }

    query += " ORDER BY c.createdAt DESC";

    return await this.cosmos.run_query<reading_request_type>(this.containerName, { query, parameters });
  }

  async getReadingRequest(id: string, userId: string): Promise<reading_request_type | null> {
    // First try to get by userId (requester viewing their own)
    let request = await this.cosmos.get_record_by_doctype<reading_request_type>(
      this.containerName,
      id,
      userId,
      "READING_REQUEST"
    );

    // If not found, might be a reader viewing a claimed request
    if (!request) {
      const querySpec = {
        query: "SELECT * FROM c WHERE c.id = @id AND c.docType = @docType AND c.claimedBy = @readerId",
        parameters: [
          { name: "@id", value: id },
          { name: "@docType", value: "READING_REQUEST" },
          { name: "@readerId", value: userId }
        ]
      };
      const results = await this.cosmos.run_query<reading_request_type>(this.containerName, querySpec);
      request = results.length > 0 ? results[0] : null;
    }

    return request;
  }

  async getAvailableReadingRequests(limit: number = 20, offset: number = 0): Promise<reading_request_type[]> {
    const querySpec = {
      query: `SELECT * FROM c WHERE c.docType = @docType AND c.requestStatus = @reqStatus ORDER BY c.createdAt ASC OFFSET ${offset} LIMIT ${limit}`,
      parameters: [
        { name: "@docType", value: "READING_REQUEST" },
        { name: "@reqStatus", value: "AWAITING_CLAIM" }
      ]
    };

    return await this.cosmos.run_query<reading_request_type>(this.containerName, querySpec);
  }

  async getClaimedReadingRequests(readerId: string): Promise<reading_request_type[]> {
    const querySpec = {
      query: "SELECT * FROM c WHERE c.docType = @docType AND c.claimedBy = @readerId AND c.requestStatus = @reqStatus ORDER BY c.claimedAt ASC",
      parameters: [
        { name: "@docType", value: "READING_REQUEST" },
        { name: "@readerId", value: readerId },
        { name: "@reqStatus", value: "CLAIMED" }
      ]
    };

    return await this.cosmos.run_query<reading_request_type>(this.containerName, querySpec);
  }

  async getMyCompletedReadings(userId: string): Promise<reading_request_type[]> {
    const querySpec = {
      query: "SELECT * FROM c WHERE c.userId = @userId AND c.docType = @docType AND c.requestStatus = @reqStatus ORDER BY c.fulfilledAt DESC",
      parameters: [
        { name: "@userId", value: userId },
        { name: "@docType", value: "READING_REQUEST" },
        { name: "@reqStatus", value: "FULFILLED" }
      ]
    };

    return await this.cosmos.run_query<reading_request_type>(this.containerName, querySpec);
  }

  // ============================================
  // Reading Request Mutations
  // ============================================

  /**
   * Create a reading request in PENDING_PAYMENT state.
   * User needs to complete the setup intent flow, then webhook updates status to AWAITING_CLAIM.
   * Payment method is saved via setup intent, but charge happens when merchant claims.
   * The stripe setup intent is created by the resolver and passed in.
   */
  async createReadingRequest(
    input: create_reading_request_input,
    userEmail: string,
    userName: string | undefined,
    stripeCustomerId: string,
    stripeSetupIntentId: string,
    stripeSetupIntentSecret: string
  ): Promise<reading_request_response> {
    const spreadConfig = SPREAD_CONFIGS.find(c => c.type === input.spreadType);
    if (!spreadConfig) {
      return {
        success: false,
        message: `Invalid spread type: ${input.spreadType}`
      };
    }

    const id = uuid();
    const now = DateTime.now().toISO();
    const feeConfig = await getSpiriverseFeeConfig({ cosmos: this.cosmos });
    const targetFee = getTargetFeeConfig('reading-request', feeConfig);
    const platformFee = Math.floor(spreadConfig.price * (targetFee.percent / 100)) + (targetFee.fixed || 0);
    const readerPayout = spreadConfig.price - platformFee;
    // Set expiry for 30 days if no reader claims it
    const expiresAt = DateTime.now().plus({ days: 30 }).toISO();

    const readingRequest: Omit<reading_request_type, '_id'> = {
      id,
      docType: 'READING_REQUEST',
      userId: input.userId,
      userEmail,
      userName,
      spreadType: input.spreadType,
      topic: input.topic,
      context: input.context,
      price: spreadConfig.price,
      platformFee,
      readerPayout,
      stripe: {
        setupIntentId: stripeSetupIntentId,
        setupIntentSecret: stripeSetupIntentSecret,
      },
      stripeCustomerId,
      requestStatus: 'PENDING_PAYMENT', // Waiting for SetupIntent to succeed (webhook will update to AWAITING_CLAIM)
      createdAt: now!,
      updatedAt: now!,
      expiresAt: expiresAt!
    };

    await this.cosmos.add_record<reading_request_type>(
      this.containerName,
      readingRequest,
      input.userId,
      input.userId
    );

    return {
      success: true,
      message: "Please complete payment to submit your request.",
      readingRequest: readingRequest as reading_request_type
    };
  }

  /**
   * Create a reading request using an already-saved payment method.
   * No setup intent needed - the payment method ID is stored directly.
   */
  async createReadingRequestWithSavedCard(
    input: create_reading_request_input,
    userEmail: string,
    userName: string | undefined,
    stripeCustomerId: string,
    paymentMethodId: string
  ): Promise<reading_request_response> {
    const spreadConfig = SPREAD_CONFIGS.find(c => c.type === input.spreadType);
    if (!spreadConfig) {
      return {
        success: false,
        message: `Invalid spread type: ${input.spreadType}`
      };
    }

    const id = uuid();
    const now = DateTime.now().toISO();
    const feeConfig = await getSpiriverseFeeConfig({ cosmos: this.cosmos });
    const targetFee = getTargetFeeConfig('reading-request', feeConfig);
    const platformFee = Math.floor(spreadConfig.price * (targetFee.percent / 100)) + (targetFee.fixed || 0);
    const readerPayout = spreadConfig.price - platformFee;
    // Set expiry for 30 days if no reader claims it
    const expiresAt = DateTime.now().plus({ days: 30 }).toISO();

    const readingRequest: Omit<reading_request_type, '_id'> = {
      id,
      docType: 'READING_REQUEST',
      userId: input.userId,
      userEmail,
      userName,
      spreadType: input.spreadType,
      topic: input.topic,
      context: input.context,
      price: spreadConfig.price,
      platformFee,
      readerPayout,
      stripe: {
        paymentMethodId, // Already saved, no setup intent needed
      },
      stripeCustomerId,
      requestStatus: 'AWAITING_CLAIM', // Waiting for a reader to claim (payment captured on claim)
      createdAt: now!,
      updatedAt: now!,
      expiresAt: expiresAt!
    };

    await this.cosmos.add_record<reading_request_type>(
      this.containerName,
      readingRequest,
      input.userId,
      input.userId
    );

    return {
      success: true,
      message: "Reading request submitted using your saved card! A reader will claim your request soon.",
      readingRequest: readingRequest as reading_request_type
    };
  }

  async markReadingRequestPaid(requestId: string): Promise<reading_request_response> {
    // Find the request (need to query since we don't know the userId)
    const querySpec = {
      query: "SELECT * FROM c WHERE c.id = @id AND c.docType = @docType",
      parameters: [
        { name: "@id", value: requestId },
        { name: "@docType", value: "READING_REQUEST" }
      ]
    };

    const results = await this.cosmos.run_query<reading_request_type>(this.containerName, querySpec);
    if (results.length === 0) {
      return {
        success: false,
        message: "Reading request not found"
      };
    }

    const request = results[0];
    if (request.requestStatus !== 'PENDING_PAYMENT') {
      return {
        success: false,
        message: `Cannot mark as paid. Current status: ${request.requestStatus}`
      };
    }

    const now = DateTime.now().toISO();
    const expiresAt = DateTime.now().plus({ days: 7 }).toISO(); // Expires in 7 days if not claimed

    await this.cosmos.patch_record(
      this.containerName,
      requestId,
      request.userId,
      [
        { op: "set", path: "/requestStatus", value: "AWAITING_CLAIM" },
        { op: "set", path: "/paidAt", value: now },
        { op: "set", path: "/expiresAt", value: expiresAt },
        { op: "set", path: "/updatedAt", value: now }
      ],
      "SYSTEM"
    );

    const updatedRequest = await this.getReadingRequest(requestId, request.userId);

    return {
      success: true,
      message: "Reading request is now available in the request bank",
      readingRequest: updatedRequest!
    };
  }

  /**
   * Claim a reading request - locks it to the reader without charging.
   * Payment happens when the reader fulfills the reading.
   */
  async claimReadingRequest(input: claim_reading_request_input, claimDeadline: string): Promise<reading_request_response> {
    const querySpec = {
      query: "SELECT * FROM c WHERE c.id = @id AND c.docType = @docType AND c.requestStatus = @reqStatus",
      parameters: [
        { name: "@id", value: input.requestId },
        { name: "@docType", value: "READING_REQUEST" },
        { name: "@reqStatus", value: "AWAITING_CLAIM" }
      ]
    };

    const results = await this.cosmos.run_query<reading_request_type>(this.containerName, querySpec);
    if (results.length === 0) {
      return {
        success: false,
        message: "Reading request not found or already claimed"
      };
    }

    const request = results[0];
    const now = DateTime.now().toISO();

    await this.cosmos.patch_record(
      this.containerName,
      input.requestId,
      request.userId,
      [
        { op: "set", path: "/requestStatus", value: "CLAIMED" },
        { op: "set", path: "/claimedBy", value: input.readerId },
        { op: "set", path: "/claimedAt", value: now },
        { op: "set", path: "/claimDeadline", value: claimDeadline },
        { op: "set", path: "/updatedAt", value: now }
      ],
      input.readerId
    );

    const updatedRequest = await this.getReadingRequest(input.requestId, request.userId);

    return {
      success: true,
      message: "Reading request claimed - you have 24 hours to fulfill it",
      readingRequest: updatedRequest!
    };
  }

  /**
   * Claim a reading request after payment has been successfully captured.
   * This is the new flow where payment is charged when the reader claims.
   */
  async claimReadingRequestWithPayment(
    input: claim_reading_request_input,
    paymentInfo: {
      paymentMethodId: string;
      paymentIntentId: string;
      chargeId: string;
      connectedAccountId: string;
    }
  ): Promise<reading_request_response> {
    const querySpec = {
      query: "SELECT * FROM c WHERE c.id = @id AND c.docType = @docType AND c.requestStatus = @reqStatus",
      parameters: [
        { name: "@id", value: input.requestId },
        { name: "@docType", value: "READING_REQUEST" },
        { name: "@reqStatus", value: "AWAITING_CLAIM" }
      ]
    };

    const results = await this.cosmos.run_query<reading_request_type>(this.containerName, querySpec);
    if (results.length === 0) {
      return {
        success: false,
        message: "Reading request not found or already claimed"
      };
    }

    const request = results[0];
    const now = DateTime.now().toISO();

    await this.cosmos.patch_record(
      this.containerName,
      input.requestId,
      request.userId,
      [
        { op: "set", path: "/requestStatus", value: "CLAIMED" },
        { op: "set", path: "/claimedBy", value: input.readerId },
        { op: "set", path: "/claimedAt", value: now },
        { op: "set", path: "/paidAt", value: now },
        { op: "set", path: "/stripe/paymentMethodId", value: paymentInfo.paymentMethodId },
        { op: "set", path: "/stripe/paymentIntentId", value: paymentInfo.paymentIntentId },
        { op: "set", path: "/stripe/chargeId", value: paymentInfo.chargeId },
        { op: "set", path: "/stripe/connectedAccountId", value: paymentInfo.connectedAccountId },
        { op: "set", path: "/updatedAt", value: now }
      ],
      input.readerId
    );

    const updatedRequest = await this.getReadingRequest(input.requestId, request.userId);

    return {
      success: true,
      message: "Reading request claimed and payment captured successfully",
      readingRequest: updatedRequest!
    };
  }

  /**
   * @deprecated Use fulfillReadingRequestWithPayment instead for the new payment-on-fulfillment flow
   */
  async fulfillReadingRequest(input: fulfill_reading_request_input): Promise<reading_request_response> {
    // Find the claimed request
    const querySpec = {
      query: "SELECT * FROM c WHERE c.id = @id AND c.docType = @docType AND c.claimedBy = @readerId AND c.requestStatus = @reqStatus",
      parameters: [
        { name: "@id", value: input.requestId },
        { name: "@docType", value: "READING_REQUEST" },
        { name: "@readerId", value: input.readerId },
        { name: "@reqStatus", value: "CLAIMED" }
      ]
    };

    const results = await this.cosmos.run_query<reading_request_type>(this.containerName, querySpec);
    if (results.length === 0) {
      return {
        success: false,
        message: "Reading request not found or not claimed by you"
      };
    }

    const request = results[0];
    const now = DateTime.now().toISO();

    await this.cosmos.patch_record(
      this.containerName,
      input.requestId,
      request.userId,
      [
        { op: "set", path: "/requestStatus", value: "FULFILLED" },
        { op: "set", path: "/photoUrl", value: input.photoUrl },
        { op: "set", path: "/cards", value: input.cards },
        { op: "set", path: "/overallMessage", value: input.overallMessage },
        { op: "set", path: "/fulfilledAt", value: now },
        { op: "set", path: "/updatedAt", value: now }
      ],
      input.readerId
    );

    const updatedRequest = await this.getReadingRequest(input.requestId, request.userId);

    return {
      success: true,
      message: "Reading fulfilled successfully",
      readingRequest: updatedRequest!
    };
  }

  /**
   * Fulfill a reading request and charge the customer.
   * This is the new flow where payment is captured on fulfillment.
   */
  async fulfillReadingRequestWithPayment(
    input: fulfill_reading_request_input,
    paymentInfo: {
      paymentMethodId: string;
      paymentIntentId: string;
      chargeId: string;
      connectedAccountId: string;
    }
  ): Promise<reading_request_response> {
    // Find the claimed request
    const querySpec = {
      query: "SELECT * FROM c WHERE c.id = @id AND c.docType = @docType AND c.claimedBy = @readerId AND c.requestStatus = @reqStatus",
      parameters: [
        { name: "@id", value: input.requestId },
        { name: "@docType", value: "READING_REQUEST" },
        { name: "@readerId", value: input.readerId },
        { name: "@reqStatus", value: "CLAIMED" }
      ]
    };

    const results = await this.cosmos.run_query<reading_request_type>(this.containerName, querySpec);
    if (results.length === 0) {
      return {
        success: false,
        message: "Reading request not found or not claimed by you"
      };
    }

    const request = results[0];
    const now = DateTime.now().toISO();

    // Extract symbols from each card name
    const cardsWithSymbols: reading_card_type[] = input.cards.map(card => ({
      ...card,
      symbols: extractSymbolsFromCard(card.name)
    }));

    await this.cosmos.patch_record(
      this.containerName,
      input.requestId,
      request.userId,
      [
        { op: "set", path: "/requestStatus", value: "FULFILLED" },
        { op: "set", path: "/photoUrl", value: input.photoUrl },
        { op: "set", path: "/cards", value: cardsWithSymbols },
        { op: "set", path: "/overallMessage", value: input.overallMessage },
        { op: "set", path: "/fulfilledAt", value: now },
        { op: "set", path: "/paidAt", value: now },
        { op: "set", path: "/stripe/paymentMethodId", value: paymentInfo.paymentMethodId },
        { op: "set", path: "/stripe/paymentIntentId", value: paymentInfo.paymentIntentId },
        { op: "set", path: "/stripe/chargeId", value: paymentInfo.chargeId },
        { op: "set", path: "/stripe/connectedAccountId", value: paymentInfo.connectedAccountId },
        { op: "set", path: "/updatedAt", value: now }
      ],
      input.readerId
    );

    const updatedRequest = await this.getReadingRequest(input.requestId, request.userId);

    // TODO: Notify user that their reading is ready

    return {
      success: true,
      message: "Reading fulfilled and payment captured successfully",
      readingRequest: updatedRequest!
    };
  }

  async cancelReadingRequest(requestId: string, userId: string): Promise<reading_request_response> {
    const request = await this.getReadingRequest(requestId, userId);
    if (!request) {
      return {
        success: false,
        message: "Reading request not found"
      };
    }

    if (request.userId !== userId) {
      return {
        success: false,
        message: "You can only cancel your own reading requests"
      };
    }

    if (request.requestStatus === 'CLAIMED' || request.requestStatus === 'FULFILLED') {
      return {
        success: false,
        message: `Cannot cancel a ${request.requestStatus.toLowerCase()} request`
      };
    }

    const now = DateTime.now().toISO();

    await this.cosmos.patch_record(
      this.containerName,
      requestId,
      userId,
      [
        { op: "set", path: "/requestStatus", value: "CANCELLED" },
        { op: "set", path: "/updatedAt", value: now }
      ],
      userId
    );

    // TODO: Process refund if already paid

    const updatedRequest = await this.getReadingRequest(requestId, userId);

    return {
      success: true,
      message: "Reading request cancelled",
      readingRequest: updatedRequest!
    };
  }

  async releaseReadingRequest(requestId: string, readerId: string): Promise<reading_request_response> {
    // Find the claimed request
    const querySpec = {
      query: "SELECT * FROM c WHERE c.id = @id AND c.docType = @docType AND c.claimedBy = @readerId AND c.requestStatus = @reqStatus",
      parameters: [
        { name: "@id", value: requestId },
        { name: "@docType", value: "READING_REQUEST" },
        { name: "@readerId", value: readerId },
        { name: "@reqStatus", value: "CLAIMED" }
      ]
    };

    const results = await this.cosmos.run_query<reading_request_type>(this.containerName, querySpec);
    if (results.length === 0) {
      return {
        success: false,
        message: "Reading request not found or not claimed by you"
      };
    }

    const request = results[0];
    const now = DateTime.now().toISO();

    await this.cosmos.patch_record(
      this.containerName,
      requestId,
      request.userId,
      [
        { op: "set", path: "/requestStatus", value: "AWAITING_CLAIM" },
        { op: "remove", path: "/claimedBy" },
        { op: "remove", path: "/claimedAt" },
        { op: "set", path: "/updatedAt", value: now }
      ],
      readerId
    );

    const updatedRequest = await this.getReadingRequest(requestId, request.userId);

    return {
      success: true,
      message: "Reading request released back to the bank",
      readingRequest: updatedRequest!
    };
  }

  // ============================================
  // Practitioner Reading Rating Aggregation
  // ============================================

  /**
   * Get aggregated reading ratings for a practitioner (reader).
   * This calculates the rating distribution from all fulfilled reading requests
   * that have reviews where this practitioner was the reader.
   */
  async getPractitionerReadingRating(practitionerId: string): Promise<{
    total_count: number;
    average: number;
    rating1: number;
    rating2: number;
    rating3: number;
    rating4: number;
    rating5: number;
  }> {
    // Query all fulfilled requests where this practitioner was the reader and has a review
    const querySpec = {
      query: `SELECT c.review.rating FROM c
              WHERE c.docType = @docType
              AND c.claimedBy = @practitionerId
              AND c.requestStatus = @reqStatus
              AND IS_DEFINED(c.review)
              AND c.review != null`,
      parameters: [
        { name: "@docType", value: "READING_REQUEST" },
        { name: "@practitionerId", value: practitionerId },
        { name: "@reqStatus", value: "FULFILLED" }
      ]
    };

    const results = await this.cosmos.run_query<{ rating: number }>(this.containerName, querySpec);

    // Initialize rating distribution
    const ratingCounts = {
      rating1: 0,
      rating2: 0,
      rating3: 0,
      rating4: 0,
      rating5: 0
    };

    let totalRating = 0;

    for (const result of results) {
      if (result.rating >= 1 && result.rating <= 5) {
        const ratingKey = `rating${result.rating}` as keyof typeof ratingCounts;
        ratingCounts[ratingKey]++;
        totalRating += result.rating;
      }
    }

    const totalCount = results.length;
    const average = totalCount > 0 ? totalRating / totalCount : 0;

    return {
      total_count: totalCount,
      average: Math.round(average * 100) / 100, // Round to 2 decimal places
      ...ratingCounts
    };
  }

  /**
   * Get all fulfilled reading requests with reviews for a practitioner.
   * Used to display reviews on the practitioner's public profile.
   */
  async getPractitionerReviews(practitionerId: string, limit: number = 10, offset: number = 0): Promise<reading_request_type[]> {
    const querySpec = {
      query: `SELECT * FROM c
              WHERE c.docType = @docType
              AND c.claimedBy = @practitionerId
              AND c.requestStatus = @reqStatus
              AND IS_DEFINED(c.review)
              AND c.review != null
              ORDER BY c.review.createdAt DESC
              OFFSET ${offset} LIMIT ${limit}`,
      parameters: [
        { name: "@docType", value: "READING_REQUEST" },
        { name: "@practitionerId", value: practitionerId },
        { name: "@reqStatus", value: "FULFILLED" }
      ]
    };

    return await this.cosmos.run_query<reading_request_type>(this.containerName, querySpec);
  }
}

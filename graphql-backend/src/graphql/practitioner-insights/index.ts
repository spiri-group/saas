import { serverContext } from "../../services/azFunction";
import { RecordStatus } from "../0_shared/types";
import { v4 as uuidv4 } from "uuid";
import {
  practitioner_insight_type,
  PERSONAL_SPACE_CONTAINER,
  PRACTITIONER_INSIGHT_DOC_TYPE,
  create_practitioner_insight_input,
  update_practitioner_insight_input,
  practitioner_insight_filters,
  agree_with_insight_input,
  report_insight_input,
  moderate_insight_input,
  insight_status,
} from "./types";

const resolvers = {
  Query: {
    // Get all approved insights for a specific crystal
    insightsForCrystal: async (
      _: any,
      args: { crystalId: string; filters?: practitioner_insight_filters },
      context: serverContext
    ) => {
      const limit = args.filters?.limit || 50;
      const offset = args.filters?.offset || 0;

      let query = `SELECT * FROM c
                   WHERE c.docType = @docType
                   AND c.crystalId = @crystalId
                   AND c.insightStatus = 'approved'
                   AND c.status = 'ACTIVE'`;
      const parameters: { name: string; value: any }[] = [
        { name: "@docType", value: PRACTITIONER_INSIGHT_DOC_TYPE },
        { name: "@crystalId", value: args.crystalId },
      ];

      if (args.filters?.insightType) {
        query += ` AND c.insightType = @insightType`;
        parameters.push({ name: "@insightType", value: args.filters.insightType });
      }

      query += ` ORDER BY c.agreeCount DESC, c.createdAt DESC`;
      query += ` OFFSET @offset LIMIT @limit`;
      parameters.push({ name: "@offset", value: offset });
      parameters.push({ name: "@limit", value: limit });

      const insights = await context.dataSources.cosmos.run_query<practitioner_insight_type>(
        PERSONAL_SPACE_CONTAINER,
        { query, parameters },
        true
      );

      // Get total count
      const countQuery = `SELECT VALUE COUNT(1) FROM c
                          WHERE c.docType = @docType
                          AND c.crystalId = @crystalId
                          AND c.insightStatus = 'approved'
                          AND c.status = 'ACTIVE'`;
      const countParams = [
        { name: "@docType", value: PRACTITIONER_INSIGHT_DOC_TYPE },
        { name: "@crystalId", value: args.crystalId },
      ];
      const countResult = await context.dataSources.cosmos.run_query<number>(
        PERSONAL_SPACE_CONTAINER,
        { query: countQuery, parameters: countParams },
        true
      );

      return {
        insights,
        totalCount: countResult[0] || 0,
      };
    },

    // Get all insights by a specific practitioner
    practitionerInsights: async (
      _: any,
      args: { practitionerId: string; filters?: practitioner_insight_filters },
      context: serverContext
    ) => {
      const limit = args.filters?.limit || 50;
      const offset = args.filters?.offset || 0;

      let query = `SELECT * FROM c
                   WHERE c.docType = @docType
                   AND c.practitionerId = @practitionerId
                   AND c.status = 'ACTIVE'`;
      const parameters: { name: string; value: any }[] = [
        { name: "@docType", value: PRACTITIONER_INSIGHT_DOC_TYPE },
        { name: "@practitionerId", value: args.practitionerId },
      ];

      if (args.filters?.crystalId) {
        query += ` AND c.crystalId = @crystalId`;
        parameters.push({ name: "@crystalId", value: args.filters.crystalId });
      }

      if (args.filters?.insightType) {
        query += ` AND c.insightType = @insightType`;
        parameters.push({ name: "@insightType", value: args.filters.insightType });
      }

      if (args.filters?.insightStatus) {
        query += ` AND c.insightStatus = @insightStatus`;
        parameters.push({ name: "@insightStatus", value: args.filters.insightStatus });
      }

      query += ` ORDER BY c.createdAt DESC`;
      query += ` OFFSET @offset LIMIT @limit`;
      parameters.push({ name: "@offset", value: offset });
      parameters.push({ name: "@limit", value: limit });

      const insights = await context.dataSources.cosmos.run_query<practitioner_insight_type>(
        PERSONAL_SPACE_CONTAINER,
        { query, parameters },
        true
      );

      return {
        insights,
        totalCount: insights.length,
      };
    },

    // Get pending insights for moderation (admin only)
    pendingInsights: async (
      _: any,
      args: { limit?: number; offset?: number },
      context: serverContext
    ) => {
      // TODO: Add admin role check here
      const limit = args.limit || 50;
      const offset = args.offset || 0;

      const query = `SELECT * FROM c
                     WHERE c.docType = @docType
                     AND c.insightStatus = 'pending'
                     AND c.status = 'ACTIVE'
                     ORDER BY c.createdAt ASC
                     OFFSET @offset LIMIT @limit`;
      const parameters = [
        { name: "@docType", value: PRACTITIONER_INSIGHT_DOC_TYPE },
        { name: "@offset", value: offset },
        { name: "@limit", value: limit },
      ];

      const insights = await context.dataSources.cosmos.run_query<practitioner_insight_type>(
        PERSONAL_SPACE_CONTAINER,
        { query, parameters },
        true
      );

      // Get total count
      const countQuery = `SELECT VALUE COUNT(1) FROM c
                          WHERE c.docType = @docType
                          AND c.insightStatus = 'pending'
                          AND c.status = 'ACTIVE'`;
      const countParams = [
        { name: "@docType", value: PRACTITIONER_INSIGHT_DOC_TYPE },
      ];
      const countResult = await context.dataSources.cosmos.run_query<number>(
        PERSONAL_SPACE_CONTAINER,
        { query: countQuery, parameters: countParams },
        true
      );

      return {
        insights,
        totalCount: countResult[0] || 0,
      };
    },

    // Get a single insight by ID
    practitionerInsight: async (
      _: any,
      args: { id: string; userId: string },
      context: serverContext
    ) => {
      try {
        return await context.dataSources.cosmos.get_record<practitioner_insight_type>(
          PERSONAL_SPACE_CONTAINER,
          args.id,
          args.userId
        );
      } catch {
        return null;
      }
    },

    // Get insights that the current user has agreed with
    agreedInsights: async (
      _: any,
      args: { userId: string; limit?: number },
      context: serverContext
    ) => {
      const limit = args.limit || 50;

      const query = `SELECT * FROM c
                     WHERE c.docType = @docType
                     AND ARRAY_CONTAINS(c.agreedBy, @userId)
                     AND c.status = 'ACTIVE'
                     ORDER BY c.updatedAt DESC
                     OFFSET 0 LIMIT @limit`;
      const parameters = [
        { name: "@docType", value: PRACTITIONER_INSIGHT_DOC_TYPE },
        { name: "@userId", value: args.userId },
        { name: "@limit", value: limit },
      ];

      return await context.dataSources.cosmos.run_query<practitioner_insight_type>(
        PERSONAL_SPACE_CONTAINER,
        { query, parameters },
        true
      );
    },

    // Get flagged insights for review (admin only)
    flaggedInsights: async (
      _: any,
      args: { limit?: number; offset?: number },
      context: serverContext
    ) => {
      // TODO: Add admin role check here
      const limit = args.limit || 50;
      const offset = args.offset || 0;

      const query = `SELECT * FROM c
                     WHERE c.docType = @docType
                     AND c.insightStatus = 'flagged'
                     AND c.status = 'ACTIVE'
                     ORDER BY c.reportCount DESC, c.createdAt ASC
                     OFFSET @offset LIMIT @limit`;
      const parameters = [
        { name: "@docType", value: PRACTITIONER_INSIGHT_DOC_TYPE },
        { name: "@offset", value: offset },
        { name: "@limit", value: limit },
      ];

      const insights = await context.dataSources.cosmos.run_query<practitioner_insight_type>(
        PERSONAL_SPACE_CONTAINER,
        { query, parameters },
        true
      );

      // Get total count
      const countQuery = `SELECT VALUE COUNT(1) FROM c
                          WHERE c.docType = @docType
                          AND c.insightStatus = 'flagged'
                          AND c.status = 'ACTIVE'`;
      const countParams = [
        { name: "@docType", value: PRACTITIONER_INSIGHT_DOC_TYPE },
      ];
      const countResult = await context.dataSources.cosmos.run_query<number>(
        PERSONAL_SPACE_CONTAINER,
        { query: countQuery, parameters: countParams },
        true
      );

      return {
        insights,
        totalCount: countResult[0] || 0,
      };
    },
  },

  Mutation: {
    // Create a new insight
    createInsight: async (
      _: any,
      args: { input: create_practitioner_insight_input },
      context: serverContext
    ) => {
      if (!context.userId) {
        return {
          success: false,
          message: "User must be authenticated to create an insight",
          insight: null,
        };
      }

      // Verify the user is creating insight for themselves
      if (context.userId !== args.input.userId) {
        return {
          success: false,
          message: "Cannot create insight for another user",
          insight: null,
        };
      }

      const now = new Date().toISOString();
      const id = uuidv4();

      const insight: practitioner_insight_type = {
        id,
        userId: args.input.userId,
        docType: "PRACTITIONER_INSIGHT",
        crystalId: args.input.crystalId,
        practitionerId: args.input.userId,
        insightType: args.input.insightType,
        content: args.input.content,
        agreeCount: 0,
        agreedBy: [],
        insightStatus: "pending", // New insights start as pending
        reportCount: 0,
        status: RecordStatus.ACTIVE,
        createdAt: now,
        updatedAt: now,
      };

      await context.dataSources.cosmos.add_record(
        PERSONAL_SPACE_CONTAINER,
        insight,
        args.input.userId,
        context.userId
      );

      return {
        success: true,
        message: "Insight created successfully. It will be visible after moderation.",
        insight,
      };
    },

    // Update an existing insight
    updateInsight: async (
      _: any,
      args: { input: update_practitioner_insight_input },
      context: serverContext
    ) => {
      if (!context.userId) {
        return {
          success: false,
          message: "User must be authenticated to update an insight",
          insight: null,
        };
      }

      // Verify the user owns the insight
      if (context.userId !== args.input.userId) {
        return {
          success: false,
          message: "Cannot update another user's insight",
          insight: null,
        };
      }

      try {
        const existing = await context.dataSources.cosmos.get_record<practitioner_insight_type>(
          PERSONAL_SPACE_CONTAINER,
          args.input.id,
          args.input.userId
        );

        if (!existing) {
          return {
            success: false,
            message: "Insight not found",
            insight: null,
          };
        }

        const now = new Date().toISOString();
        const updated: practitioner_insight_type = {
          ...existing,
          insightType: args.input.insightType || existing.insightType,
          content: args.input.content || existing.content,
          // Reset to pending if content changed (re-moderation required)
          insightStatus: args.input.content && args.input.content !== existing.content
            ? "pending"
            : existing.insightStatus,
          updatedAt: now,
        };

        await context.dataSources.cosmos.update_record(
          PERSONAL_SPACE_CONTAINER,
          args.input.id,
          args.input.userId,
          updated,
          context.userId
        );

        const message = args.input.content && args.input.content !== existing.content
          ? "Insight updated successfully. It will need to be re-approved by a moderator."
          : "Insight updated successfully";

        return {
          success: true,
          message,
          insight: updated,
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to update insight: ${error}`,
          insight: null,
        };
      }
    },

    // Delete an insight
    deleteInsight: async (
      _: any,
      args: { id: string; userId: string },
      context: serverContext
    ) => {
      if (!context.userId) {
        return {
          success: false,
          message: "User must be authenticated to delete an insight",
        };
      }

      // Verify the user owns the insight
      if (context.userId !== args.userId) {
        return {
          success: false,
          message: "Cannot delete another user's insight",
        };
      }

      try {
        await context.dataSources.cosmos.delete_record(
          PERSONAL_SPACE_CONTAINER,
          args.id,
          args.userId,
          context.userId
        );

        return {
          success: true,
          message: "Insight deleted successfully",
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to delete insight: ${error}`,
        };
      }
    },

    // Agree with an insight
    agreeWithInsight: async (
      _: any,
      args: { input: agree_with_insight_input },
      context: serverContext
    ) => {
      if (!context.userId) {
        return {
          success: false,
          message: "User must be authenticated to agree with an insight",
          insight: null,
          alreadyAgreed: false,
        };
      }

      try {
        const existing = await context.dataSources.cosmos.get_record<practitioner_insight_type>(
          PERSONAL_SPACE_CONTAINER,
          args.input.insightId,
          args.input.insightOwnerId
        );

        if (!existing) {
          return {
            success: false,
            message: "Insight not found",
            insight: null,
            alreadyAgreed: false,
          };
        }

        // Cannot agree with own insight
        if (existing.practitionerId === context.userId) {
          return {
            success: false,
            message: "Cannot agree with your own insight",
            insight: existing,
            alreadyAgreed: false,
          };
        }

        // Check if already agreed
        if (existing.agreedBy.includes(context.userId)) {
          return {
            success: true,
            message: "You have already agreed with this insight",
            insight: existing,
            alreadyAgreed: true,
          };
        }

        const now = new Date().toISOString();
        const updated: practitioner_insight_type = {
          ...existing,
          agreeCount: existing.agreeCount + 1,
          agreedBy: [...existing.agreedBy, context.userId],
          updatedAt: now,
        };

        await context.dataSources.cosmos.update_record(
          PERSONAL_SPACE_CONTAINER,
          args.input.insightId,
          args.input.insightOwnerId,
          updated,
          context.userId
        );

        return {
          success: true,
          message: "Agreement recorded successfully",
          insight: updated,
          alreadyAgreed: false,
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to agree with insight: ${error}`,
          insight: null,
          alreadyAgreed: false,
        };
      }
    },

    // Remove agreement from an insight
    removeAgreement: async (
      _: any,
      args: { input: agree_with_insight_input },
      context: serverContext
    ) => {
      if (!context.userId) {
        return {
          success: false,
          message: "User must be authenticated to remove agreement",
          insight: null,
          alreadyAgreed: false,
        };
      }

      try {
        const existing = await context.dataSources.cosmos.get_record<practitioner_insight_type>(
          PERSONAL_SPACE_CONTAINER,
          args.input.insightId,
          args.input.insightOwnerId
        );

        if (!existing) {
          return {
            success: false,
            message: "Insight not found",
            insight: null,
            alreadyAgreed: false,
          };
        }

        // Check if not agreed
        if (!existing.agreedBy.includes(context.userId)) {
          return {
            success: true,
            message: "You have not agreed with this insight",
            insight: existing,
            alreadyAgreed: false,
          };
        }

        const now = new Date().toISOString();
        const updated: practitioner_insight_type = {
          ...existing,
          agreeCount: Math.max(0, existing.agreeCount - 1),
          agreedBy: existing.agreedBy.filter((id) => id !== context.userId),
          updatedAt: now,
        };

        await context.dataSources.cosmos.update_record(
          PERSONAL_SPACE_CONTAINER,
          args.input.insightId,
          args.input.insightOwnerId,
          updated,
          context.userId
        );

        return {
          success: true,
          message: "Agreement removed successfully",
          insight: updated,
          alreadyAgreed: false,
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to remove agreement: ${error}`,
          insight: null,
          alreadyAgreed: false,
        };
      }
    },

    // Report an insight
    reportInsight: async (
      _: any,
      args: { input: report_insight_input },
      context: serverContext
    ) => {
      if (!context.userId) {
        return {
          success: false,
          message: "User must be authenticated to report an insight",
          alreadyReported: false,
        };
      }

      try {
        const existing = await context.dataSources.cosmos.get_record<practitioner_insight_type>(
          PERSONAL_SPACE_CONTAINER,
          args.input.insightId,
          args.input.insightOwnerId
        );

        if (!existing) {
          return {
            success: false,
            message: "Insight not found",
            alreadyReported: false,
          };
        }

        // Check if already reported by this user
        if (existing.reportedBy?.includes(context.userId)) {
          return {
            success: true,
            message: "You have already reported this insight",
            alreadyReported: true,
          };
        }

        const now = new Date().toISOString();
        const newReportCount = existing.reportCount + 1;

        // Auto-flag if report count exceeds threshold
        const newStatus: insight_status = newReportCount >= 3 ? "flagged" : existing.insightStatus;

        const updated: practitioner_insight_type = {
          ...existing,
          reportCount: newReportCount,
          reportedBy: [...(existing.reportedBy || []), context.userId],
          insightStatus: newStatus,
          updatedAt: now,
        };

        await context.dataSources.cosmos.update_record(
          PERSONAL_SPACE_CONTAINER,
          args.input.insightId,
          args.input.insightOwnerId,
          updated,
          context.userId
        );

        return {
          success: true,
          message: "Report submitted successfully. Thank you for helping keep our community safe.",
          alreadyReported: false,
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to report insight: ${error}`,
          alreadyReported: false,
        };
      }
    },

    // Moderate an insight (admin only)
    moderateInsight: async (
      _: any,
      args: { input: moderate_insight_input },
      context: serverContext
    ) => {
      if (!context.userId) {
        return {
          success: false,
          message: "User must be authenticated to moderate insights",
          insight: null,
        };
      }

      // TODO: Add admin role check here
      // For now, we'll allow any authenticated user to moderate
      // In production, add: if (!isAdmin(context.userId)) { return error }

      try {
        const existing = await context.dataSources.cosmos.get_record<practitioner_insight_type>(
          PERSONAL_SPACE_CONTAINER,
          args.input.insightId,
          args.input.insightOwnerId
        );

        if (!existing) {
          return {
            success: false,
            message: "Insight not found",
            insight: null,
          };
        }

        const now = new Date().toISOString();
        const updated: practitioner_insight_type = {
          ...existing,
          insightStatus: args.input.newStatus,
          moderationNotes: args.input.moderationNotes,
          moderatedBy: context.userId,
          moderatedAt: now,
          updatedAt: now,
        };

        await context.dataSources.cosmos.update_record(
          PERSONAL_SPACE_CONTAINER,
          args.input.insightId,
          args.input.insightOwnerId,
          updated,
          context.userId
        );

        const statusMessage = {
          approved: "Insight has been approved and is now visible",
          flagged: "Insight has been flagged for further review",
          removed: "Insight has been removed",
          pending: "Insight has been set back to pending",
        };

        return {
          success: true,
          message: statusMessage[args.input.newStatus] || "Moderation action completed",
          insight: updated,
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to moderate insight: ${error}`,
          insight: null,
        };
      }
    },
  },

  // Type resolver for PractitionerInsight
  PractitionerInsight: {
    ref: (insight: practitioner_insight_type) => ({
      id: insight.id,
      partition: [insight.userId],
      container: PERSONAL_SPACE_CONTAINER,
    }),
  },
};

export { resolvers };

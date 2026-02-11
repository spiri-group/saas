import { serverContext } from "../../services/azFunction";
import { LegalDocument } from "../legal/types";
import { UserConsent, RecordConsentInput } from "./types";

const container = 'System-Settings';

const SCOPE_DOCUMENT_TYPES: Record<string, string[]> = {
  site: ['terms-of-service', 'privacy-policy'],
  checkout: ['refund-policy', 'payment-terms'],
  'merchant-onboarding': ['merchant-terms', 'acceptable-use-policy', 'intellectual-property-policy'],
  'service-checkout': ['spiritual-services-disclaimer'],
};

const resolvers = {
  Query: {
    checkOutstandingConsents: async (_: any, args: { scope: string }, context: serverContext) => {
      if (!context.userId) {
        throw new Error('Authentication required');
      }

      const requiredTypes = SCOPE_DOCUMENT_TYPES[args.scope];
      if (!requiredTypes) {
        throw new Error(`Invalid scope: ${args.scope}`);
      }

      // Fetch current published documents for the required types
      const typeList = requiredTypes.map(t => `"${t}"`).join(',');
      const query = `SELECT * FROM c WHERE c.docType = 'legal-document' AND c.isPublished = true AND c.documentType IN (${typeList})`;

      const documents = await context.dataSources.cosmos.run_query<LegalDocument>(
        container,
        { query, parameters: [] },
        true
      );

      if (documents.length === 0) {
        return [];
      }

      // Fetch user's consent records from Table Storage
      let userConsents: UserConsent[] = [];
      try {
        userConsents = await context.dataSources.tableStorage.queryEntities<UserConsent>(
          `PartitionKey eq '${context.userId}'`
        );
      } catch {
        // No consent records yet - that's fine
      }

      // Find outstanding consents
      const outstanding = [];
      for (const doc of documents) {
        const consent = userConsents.find(c => c.rowKey === doc.documentType);
        if (!consent || consent.version < doc.version) {
          outstanding.push({
            documentType: doc.documentType,
            documentId: doc.id,
            title: doc.title,
            content: doc.content,
            version: doc.version,
            effectiveDate: doc.effectiveDate,
            placeholders: doc.placeholders,
          });
        }
      }

      return outstanding;
    },

    userConsents: async (_: any, __: any, context: serverContext) => {
      if (!context.userId) {
        throw new Error('Authentication required');
      }

      try {
        const consents = await context.dataSources.tableStorage.queryEntities<UserConsent>(
          `PartitionKey eq '${context.userId}'`
        );

        return consents.map(c => ({
          documentType: c.rowKey,
          documentId: c.documentId,
          version: c.version,
          consentedAt: c.consentedAt,
          consentContext: c.consentContext,
          documentTitle: c.documentTitle,
        }));
      } catch {
        return [];
      }
    },
  },

  Mutation: {
    recordConsents: async (_: any, args: { inputs: RecordConsentInput[] }, context: serverContext) => {
      if (!context.userId) {
        throw new Error('Authentication required');
      }

      const now = new Date().toISOString();

      for (const input of args.inputs) {
        const entity: UserConsent = {
          partitionKey: context.userId,
          rowKey: input.documentType,
          documentId: input.documentId,
          version: input.version,
          consentedAt: now,
          consentContext: input.consentContext as "site-modal" | "checkout",
          documentTitle: input.documentTitle,
        };

        await context.dataSources.tableStorage.upsertEntity(entity);
      }

      return true;
    },
  },
};

export { resolvers };

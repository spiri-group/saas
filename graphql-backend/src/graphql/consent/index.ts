import { serverContext } from "../../services/azFunction";
import { LegalDocument } from "../legal/types";
import { UserConsent, RecordConsentInput } from "./types";

const container = 'System-Settings';
const CONSENT_TABLE = 'UserConsents';

const SCOPE_DOCUMENT_TYPES: Record<string, string[]> = {
  site: ['terms-of-service', 'privacy-policy'],
  checkout: ['refund-policy', 'payment-terms'],
  'merchant-onboarding': ['merchant-terms', 'acceptable-use-policy', 'intellectual-property-policy', 'subscription-terms'],
  'service-checkout': ['spiritual-services-disclaimer'],
};

const resolvers = {
  Query: {
    checkOutstandingConsents: async (_: any, args: { scope: string; market?: string }, context: serverContext) => {
      if (!context.userId) {
        throw new Error('Authentication required');
      }

      const requiredTypes = SCOPE_DOCUMENT_TYPES[args.scope];
      if (!requiredTypes) {
        throw new Error(`Invalid scope: ${args.scope}`);
      }

      // Fetch current published documents for the required types
      // When market is provided, fetch both global base docs and market-specific supplements
      const typeList = requiredTypes.map(t => `"${t}"`).join(',');
      let query: string;
      const parameters: { name: string; value: any }[] = [];

      if (args.market) {
        query = `SELECT * FROM c WHERE c.docType = 'legal-document' AND c.isPublished = true AND c.documentType IN (${typeList}) AND (c.market = 'global' OR c.market = @market)`;
        parameters.push({ name: '@market', value: args.market });
      } else {
        query = `SELECT * FROM c WHERE c.docType = 'legal-document' AND c.isPublished = true AND c.documentType IN (${typeList}) AND c.market = 'global'`;
      }

      const documents = await context.dataSources.cosmos.run_query<LegalDocument>(
        container,
        { query, parameters },
        true
      );

      if (documents.length === 0) {
        return [];
      }

      // Separate into base docs and supplements
      const baseDocs = documents.filter(d => !d.parentDocumentId);
      const supplements = documents.filter(d => !!d.parentDocumentId);

      // Fetch user's consent records from Table Storage
      let userConsents: UserConsent[] = [];
      try {
        userConsents = await context.dataSources.tableStorage.queryEntities<UserConsent>(
          CONSENT_TABLE,
          `PartitionKey eq '${context.userId}'`
        );
      } catch {
        // No consent records yet - that's fine
      }

      // Find outstanding consents
      const outstanding = [];
      for (const doc of baseDocs) {
        const baseConsent = userConsents.find(c => c.rowKey === doc.documentType);
        const baseOutstanding = !baseConsent || baseConsent.version < doc.version;

        // Find matching supplement for this document type and market
        const supplement = supplements.find(s => s.parentDocumentId === doc.id);
        let supplementOutstanding = false;

        if (supplement) {
          const supplementRowKey = `${doc.documentType}::${supplement.market}`;
          const supplementConsent = userConsents.find(c => c.rowKey === supplementRowKey);
          supplementOutstanding = !supplementConsent || supplementConsent.version < supplement.version;
        }

        // If either base or supplement needs consent, include in response
        if (baseOutstanding || supplementOutstanding) {
          outstanding.push({
            documentType: doc.documentType,
            documentId: doc.id,
            title: doc.title,
            content: doc.content,
            version: doc.version,
            effectiveDate: doc.effectiveDate,
            placeholders: doc.placeholders,
            supplementContent: supplement?.content,
            supplementDocumentId: supplement?.id,
            supplementVersion: supplement?.version,
            supplementTitle: supplement?.title,
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
          CONSENT_TABLE,
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
        // Record base document consent
        const entity: UserConsent = {
          partitionKey: context.userId,
          rowKey: input.documentType,
          documentId: input.documentId,
          version: input.version,
          consentedAt: now,
          consentContext: input.consentContext as "site-modal" | "checkout",
          documentTitle: input.documentTitle,
        };

        await context.dataSources.tableStorage.upsertEntity(CONSENT_TABLE, entity);

        // If supplement is present, also record supplement consent
        if (input.supplementDocumentId && input.supplementVersion) {
          // Derive market from the supplement document ID (e.g., "terms-of-service-AU" → "AU")
          const marketMatch = input.supplementDocumentId.match(/-([A-Z]{2})$/);
          if (marketMatch) {
            const supplementEntity: UserConsent = {
              partitionKey: context.userId,
              rowKey: `${input.documentType}::${marketMatch[1]}`,
              documentId: input.supplementDocumentId,
              version: input.supplementVersion,
              consentedAt: now,
              consentContext: input.consentContext as "site-modal" | "checkout",
              documentTitle: `${input.documentTitle} (${marketMatch[1]} Supplement)`,
            };

            await context.dataSources.tableStorage.upsertEntity(CONSENT_TABLE, supplementEntity);
          }
        }
      }

      return true;
    },
  },
};

export { resolvers };

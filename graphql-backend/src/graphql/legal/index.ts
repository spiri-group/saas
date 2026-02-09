import { serverContext } from "../../services/azFunction";
import { LegalDocument, LegalDocumentInput, LegalDocumentVersion } from "./types";

const container = 'System-Settings';
const partition = 'legal-document';
const versionPartition = 'legal-document-version';

function hasContentChanged(existing: LegalDocument, input: LegalDocumentInput): boolean {
  return (
    existing.title !== input.title ||
    existing.content !== input.content ||
    existing.market !== input.market ||
    existing.isPublished !== (input.isPublished !== undefined ? input.isPublished : true) ||
    existing.effectiveDate !== (input.effectiveDate || existing.effectiveDate)
  );
}

const resolvers = {
  Query: {
    legalDocuments: async (_: any, args: { market?: string; documentType?: string }, context: serverContext) => {
      try {
        let query = "SELECT * FROM c WHERE c.docType = 'legal-document'";
        const parameters: { name: string; value: any }[] = [];

        if (args.market) {
          query += " AND c.market = @market";
          parameters.push({ name: "@market", value: args.market });
        }

        if (args.documentType) {
          query += " AND c.documentType = @documentType";
          parameters.push({ name: "@documentType", value: args.documentType });
        }

        query += " ORDER BY c.documentType ASC, c.market ASC";

        const documents = await context.dataSources.cosmos.run_query<LegalDocument>(
          container,
          { query, parameters },
          true
        );

        return documents;
      } catch (error) {
        console.error('Failed to get legal documents:', error);
        throw new Error('Failed to retrieve legal documents');
      }
    },

    legalDocument: async (_: any, args: { id: string }, context: serverContext) => {
      try {
        const document = await context.dataSources.cosmos.get_record<LegalDocument>(
          container,
          args.id,
          partition
        );

        if (!document) {
          return null;
        }

        return document;
      } catch (error) {
        console.error(`Failed to get legal document ${args.id}:`, error);
        return null;
      }
    },

    legalDocumentVersions: async (_: any, args: { documentId: string }, context: serverContext) => {
      try {
        const query = "SELECT * FROM c WHERE c.docType = 'legal-document-version' AND c.documentId = @documentId ORDER BY c.version DESC";
        const parameters = [{ name: "@documentId", value: args.documentId }];

        const versions = await context.dataSources.cosmos.run_query<LegalDocumentVersion>(
          container,
          { query, parameters },
          true
        );

        return versions;
      } catch (error) {
        console.error(`Failed to get versions for ${args.documentId}:`, error);
        throw new Error('Failed to retrieve document versions');
      }
    },

    legalDocumentVersion: async (_: any, args: { id: string }, context: serverContext) => {
      try {
        const version = await context.dataSources.cosmos.get_record<LegalDocumentVersion>(
          container,
          args.id,
          versionPartition
        );

        if (!version) {
          return null;
        }

        return version;
      } catch (error) {
        console.error(`Failed to get legal document version ${args.id}:`, error);
        return null;
      }
    },
  },

  Mutation: {
    upsertLegalDocument: async (_: any, args: { input: LegalDocumentInput }, context: serverContext) => {
      try {
        const { input } = args;
        const now = new Date().toISOString();

        // Check if document exists
        let existingDocument: LegalDocument | null = null;
        try {
          existingDocument = await context.dataSources.cosmos.get_record<LegalDocument>(
            container,
            input.id,
            partition
          );
        } catch (error) {
          // Document doesn't exist, will create new
        }

        // If document exists and content has changed, snapshot the old version
        if (existingDocument && hasContentChanged(existingDocument, input)) {
          const versionSnapshot: LegalDocumentVersion = {
            docType: "legal-document-version",
            id: `${existingDocument.id}-v${existingDocument.version}`,
            documentId: existingDocument.id,
            version: existingDocument.version,
            title: existingDocument.title,
            content: existingDocument.content,
            market: existingDocument.market,
            isPublished: existingDocument.isPublished,
            effectiveDate: existingDocument.effectiveDate,
            changeSummary: input.changeSummary || "No description provided",
            createdAt: existingDocument.createdAt,
            supersededAt: now,
            supersededBy: context.userId || 'system',
          };

          await context.dataSources.cosmos.upsert_record(
            container,
            versionSnapshot.id,
            versionSnapshot,
            versionPartition
          );
        }

        const document: LegalDocument = {
          docType: "legal-document",
          id: input.id,
          documentType: input.documentType,
          title: input.title,
          content: input.content,
          market: input.market,
          version: existingDocument ? existingDocument.version + 1 : 1,
          isPublished: input.isPublished !== undefined ? input.isPublished : true,
          effectiveDate: input.effectiveDate || now,
          changeSummary: input.changeSummary || (existingDocument ? undefined : "Initial document"),
          createdAt: existingDocument?.createdAt || now,
          updatedAt: now,
          updatedBy: context.userId || 'system'
        };

        await context.dataSources.cosmos.upsert_record(
          container,
          document.id,
          document,
          partition
        );

        return document;
      } catch (error) {
        console.error('Failed to upsert legal document:', error);
        throw new Error('Failed to save legal document');
      }
    },

    deleteLegalDocument: async (_: any, args: { id: string }, context: serverContext) => {
      try {
        await context.dataSources.cosmos.purge_record(
          container,
          args.id,
          partition
        );
        return true;
      } catch (error) {
        console.error(`Failed to delete legal document ${args.id}:`, error);
        throw new Error('Failed to delete legal document');
      }
    },

    restoreLegalDocumentVersion: async (_: any, args: { documentId: string; versionId: string }, context: serverContext) => {
      try {
        // Get the version to restore
        const versionToRestore = await context.dataSources.cosmos.get_record<LegalDocumentVersion>(
          container,
          args.versionId,
          versionPartition
        );

        if (!versionToRestore) {
          throw new Error(`Version ${args.versionId} not found`);
        }

        // Get the current document
        const currentDocument = await context.dataSources.cosmos.get_record<LegalDocument>(
          container,
          args.documentId,
          partition
        );

        if (!currentDocument) {
          throw new Error(`Document ${args.documentId} not found`);
        }

        const now = new Date().toISOString();
        const changeSummary = `Restored from v${versionToRestore.version}`;

        // Snapshot current version before overwriting
        const currentSnapshot: LegalDocumentVersion = {
          docType: "legal-document-version",
          id: `${currentDocument.id}-v${currentDocument.version}`,
          documentId: currentDocument.id,
          version: currentDocument.version,
          title: currentDocument.title,
          content: currentDocument.content,
          market: currentDocument.market,
          isPublished: currentDocument.isPublished,
          effectiveDate: currentDocument.effectiveDate,
          changeSummary,
          createdAt: currentDocument.createdAt,
          supersededAt: now,
          supersededBy: context.userId || 'system',
        };

        await context.dataSources.cosmos.upsert_record(
          container,
          currentSnapshot.id,
          currentSnapshot,
          versionPartition
        );

        // Create new version with restored content
        const restoredDocument: LegalDocument = {
          docType: "legal-document",
          id: currentDocument.id,
          documentType: currentDocument.documentType,
          title: versionToRestore.title,
          content: versionToRestore.content,
          market: versionToRestore.market,
          version: currentDocument.version + 1,
          isPublished: versionToRestore.isPublished,
          effectiveDate: versionToRestore.effectiveDate,
          changeSummary,
          createdAt: currentDocument.createdAt,
          updatedAt: now,
          updatedBy: context.userId || 'system'
        };

        await context.dataSources.cosmos.upsert_record(
          container,
          restoredDocument.id,
          restoredDocument,
          partition
        );

        return restoredDocument;
      } catch (error) {
        console.error('Failed to restore legal document version:', error);
        throw new Error('Failed to restore document version');
      }
    },
  }
};

export { resolvers };

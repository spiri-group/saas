import { serverContext } from "../../services/azFunction";
import { EmailTemplate, EmailTemplateInput, EmailHeaderFooter, EmailHeaderFooterInput } from "./types";
import { v4 as uuidv4 } from "uuid";
import { BlobServiceClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';

const container = 'System-Settings';
const templatePartition = 'email-template';
const headerFooterPartition = 'email-header-footer';
const emailAssetsContainer = 'public';
const emailAssetsPrefix = 'email-templates';

const resolvers = {
  Query: {
    emailTemplates: async (_: any, args: { category?: string }, context: serverContext) => {
      try {
        let query = "SELECT * FROM c WHERE c.docType = 'email-template'";
        const parameters: { name: string; value: any }[] = [];

        if (args.category) {
          query += " AND c.category = @category";
          parameters.push({ name: "@category", value: args.category });
        }

        query += " ORDER BY c.name ASC";

        const templates = await context.dataSources.cosmos.run_query(
          container,
          { query, parameters },
          true
        );

        return templates;
      } catch (error) {
        console.error('Failed to get email templates:', error);
        throw new Error('Failed to retrieve email templates');
      }
    },

    emailTemplate: async (_: any, args: { id: string }, context: serverContext) => {
      try {
        const template = await context.dataSources.cosmos.get_record(
          container,
          args.id,
          templatePartition
        );

        if (!template) {
          return null;
        }

        return template;
      } catch (error) {
        console.error(`Failed to get email template ${args.id}:`, error);
        return null;
      }
    },

    emailHeadersFooters: async (_: any, args: { type?: string }, context: serverContext) => {
      try {
        let query = "SELECT * FROM c WHERE c.docType = 'email-header-footer'";
        const parameters: { name: string; value: any }[] = [];

        if (args.type) {
          query += " AND c.type = @type";
          parameters.push({ name: "@type", value: args.type });
        }

        query += " ORDER BY c.name ASC";

        const items = await context.dataSources.cosmos.run_query(
          container,
          { query, parameters },
          true
        );

        return items;
      } catch (error) {
        console.error('Failed to get email headers/footers:', error);
        throw new Error('Failed to retrieve email headers/footers');
      }
    },

    emailHeaderFooter: async (_: any, args: { id: string }, context: serverContext) => {
      try {
        const item = await context.dataSources.cosmos.get_record(
          container,
          args.id,
          headerFooterPartition
        );

        if (!item) {
          return null;
        }

        return item;
      } catch (error) {
        console.error(`Failed to get email header/footer ${args.id}:`, error);
        return null;
      }
    },

    emailAssets: async (_: any, args: { prefix?: string; maxResults?: number }, context: serverContext) => {
      try {
        const credential = new DefaultAzureCredential();
        const storageName = context.dataSources.storage.storageName;
        const blobEndpoint = `https://${storageName}.blob.core.windows.net`;
        const blobServiceClient = new BlobServiceClient(blobEndpoint, credential);
        const containerClient = blobServiceClient.getContainerClient(emailAssetsContainer);

        // Check if the container exists
        const containerExists = await containerClient.exists();
        if (!containerExists) {
          console.error(`Container "${emailAssetsContainer}" does not exist.`);
          throw new Error(`Container "${emailAssetsContainer}" does not exist.`);
        }

        const blobs: Array<{
          name: string;
          url: string;
          size: number;
          lastModified: string;
          contentType?: string;
        }> = [];

        // Use provided prefix or default to 'templates'
        const blobPrefix = args.prefix || emailAssetsPrefix;
        const maxResults = args.maxResults || 50;

        // List blobs with optional prefix filter
        const listOptions = {
          prefix: blobPrefix,
          includeMetadata: true,
        };

        let count = 0;
        for await (const blob of containerClient.listBlobsFlat(listOptions)) {
          if (count >= maxResults) break;

          const blobClient = containerClient.getBlobClient(blob.name);

          blobs.push({
            name: blob.name,
            url: blobClient.url,
            size: blob.properties.contentLength || 0,
            lastModified: blob.properties.lastModified?.toISOString() || new Date().toISOString(),
            contentType: blob.properties.contentType,
          });

          count++;
        }

        // Sort by lastModified descending (newest first)
        blobs.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());

        console.log(`Listed ${blobs.length} email assets from container "${emailAssetsContainer}" with prefix "${blobPrefix}"`);

        return blobs;
      } catch (error) {
        console.error('Failed to list email assets:', error);
        throw new Error('Failed to retrieve email assets');
      }
    }
  },

  Mutation: {
    upsertEmailTemplate: async (_: any, args: { input: EmailTemplateInput }, context: serverContext) => {
      try {
        const { input } = args;
        const now = new Date().toISOString();

        // Check if template exists
        let existingTemplate: EmailTemplate | null = null;
        try {
          existingTemplate = await context.dataSources.cosmos.get_record(
            container,
            input.id,
            templatePartition
          );
        } catch (error) {
          // Template doesn't exist, will create new
        }

        const template: EmailTemplate = {
          docType: "email-template",
          id: input.id,
          name: input.name,
          subject: input.subject,
          html: input.html,
          variables: input.variables || [],
          category: input.category,
          description: input.description,
          isActive: input.isActive !== undefined ? input.isActive : true,
          headerId: input.headerId,
          footerId: input.footerId,
          createdAt: existingTemplate?.createdAt || now,
          updatedAt: now,
          updatedBy: context.userId || 'system'
        };

        await context.dataSources.cosmos.upsert_record(
          container,
          template.id,
          template,
          templatePartition
        );

        return template;
      } catch (error) {
        console.error('Failed to upsert email template:', error);
        throw new Error('Failed to save email template');
      }
    },

    deleteEmailTemplate: async (_: any, args: { id: string }, context: serverContext) => {
      try {
        await context.dataSources.cosmos.purge_record(
          container,
          args.id,
          templatePartition
        );
        return true;
      } catch (error) {
        console.error(`Failed to delete email template ${args.id}:`, error);
        throw new Error('Failed to delete email template');
      }
    },

    upsertEmailHeaderFooter: async (_: any, args: { input: EmailHeaderFooterInput }, context: serverContext) => {
      try {
        const { input } = args;
        const now = new Date().toISOString();
        const id = input.id || uuidv4();

        // Check if item exists
        let existingItem: EmailHeaderFooter | null = null;
        if (input.id) {
          try {
            existingItem = await context.dataSources.cosmos.get_record(
              container,
              input.id,
              headerFooterPartition
            );
          } catch (error) {
            // Item doesn't exist, will create new
          }
        }

        // If setting as default, unset other defaults of the same type
        if (input.isDefault) {
          const query = `SELECT * FROM c WHERE c.docType = 'email-header-footer' AND c.type = @type AND c.isDefault = true AND c.id != @id`;
          const parameters = [
            { name: "@type", value: input.type },
            { name: "@id", value: id }
          ];

          const existingDefaults = await context.dataSources.cosmos.run_query(
            container,
            { query, parameters },
            true
          );

          // Unset isDefault for all existing defaults
          for (const item of existingDefaults) {
            await context.dataSources.cosmos.upsert_record(
              container,
              item.id,
              { ...item, isDefault: false, updatedAt: now },
              headerFooterPartition
            );
          }
        }

        const item: EmailHeaderFooter = {
          docType: "email-header-footer",
          id: id,
          name: input.name,
          type: input.type,
          content: input.content,
          description: input.description,
          isDefault: input.isDefault !== undefined ? input.isDefault : false,
          isActive: input.isActive !== undefined ? input.isActive : true,
          createdAt: existingItem?.createdAt || now,
          updatedAt: now,
          updatedBy: context.userId || 'system'
        };

        await context.dataSources.cosmos.upsert_record(
          container,
          item.id,
          item,
          headerFooterPartition
        );

        return item;
      } catch (error) {
        console.error('Failed to upsert email header/footer:', error);
        throw new Error('Failed to save email header/footer');
      }
    },

    deleteEmailHeaderFooter: async (_: any, args: { id: string }, context: serverContext) => {
      try {
        // First, check if this header/footer is being used by any templates
        const headerQuery = `SELECT * FROM c WHERE c.docType = 'email-template' AND c.headerId = @id`;
        const footerQuery = `SELECT * FROM c WHERE c.docType = 'email-template' AND c.footerId = @id`;
        const parameters = [{ name: "@id", value: args.id }];

        const [templatesUsingAsHeader, templatesUsingAsFooter] = await Promise.all([
          context.dataSources.cosmos.run_query(
            container,
            { query: headerQuery, parameters },
            true
          ),
          context.dataSources.cosmos.run_query(
            container,
            { query: footerQuery, parameters },
            true
          )
        ]);

        const templatesInUse = [...templatesUsingAsHeader, ...templatesUsingAsFooter];

        if (templatesInUse.length > 0) {
          const templateNames = templatesInUse.map(t => t.name).join(', ');
          throw new Error(
            `Cannot delete this header/footer because it is currently being used by ${templatesInUse.length} template(s): ${templateNames}`
          );
        }

        // If not in use, proceed with deletion
        await context.dataSources.cosmos.purge_record(
          container,
          args.id,
          headerFooterPartition
        );
        return true;
      } catch (error) {
        console.error(`Failed to delete email header/footer ${args.id}:`, error);
        // Re-throw the error so the user gets the validation message
        throw error;
      }
    },

    deleteEmailAsset: async (_: any, args: { name: string }, context: serverContext) => {
      try {
        const credential = new DefaultAzureCredential();
        const storageName = context.dataSources.storage.storageName;
        const blobEndpoint = `https://${storageName}.blob.core.windows.net`;
        const blobServiceClient = new BlobServiceClient(blobEndpoint, credential);
        const containerClient = blobServiceClient.getContainerClient(emailAssetsContainer);

        // Check if the container exists
        const containerExists = await containerClient.exists();
        if (!containerExists) {
          console.error(`Container "${emailAssetsContainer}" does not exist.`);
          throw new Error(`Container "${emailAssetsContainer}" does not exist.`);
        }

        // Get the blob client
        const blobClient = containerClient.getBlobClient(args.name);

        // Check if blob exists
        const blobExists = await blobClient.exists();
        if (!blobExists) {
          throw new Error(`Asset "${args.name}" not found.`);
        }

        // Delete the blob
        await blobClient.delete();

        console.log(`Deleted email asset: ${args.name}`);
        return true;
      } catch (error) {
        console.error(`Failed to delete email asset ${args.name}:`, error);
        throw new Error(error instanceof Error ? error.message : 'Failed to delete email asset');
      }
    }
  }
};

export { resolvers };

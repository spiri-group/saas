import { serverContext } from "../../services/azFunction";
import { EmailTemplate, EmailTemplateInput, EmailHeaderFooter, EmailHeaderFooterInput } from "./types";
import {
  SentEmailEntity,
  SendAdHocEmailInput,
  AiMessageInput,
  SENT_EMAILS_TABLE,
  entityToSentEmail,
} from "./adhocTypes";
import { buildAdHocEmailHtml, generateEmailWithAi } from "./adhocEmail";
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

    sentEmails: async (_: any, args: { limit?: number; offset?: number; search?: string }, context: serverContext) => {
      try {
        const userId = context.userId || 'system';
        const filter = `PartitionKey eq '${userId}'`;
        const entities = await context.dataSources.tableStorage.queryEntities<SentEmailEntity>(
          SENT_EMAILS_TABLE,
          filter
        );

        let results = entities.map(entityToSentEmail);

        // Sort by createdAt DESC
        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Search filter
        if (args.search) {
          const search = args.search.toLowerCase();
          results = results.filter(
            (e) =>
              e.subject.toLowerCase().includes(search) ||
              e.recipients.some((r) => r.toLowerCase().includes(search))
          );
        }

        // Pagination
        const offset = args.offset || 0;
        const limit = args.limit || 50;
        results = results.slice(offset, offset + limit);

        return results;
      } catch (error) {
        console.error('Failed to get sent emails:', error);
        throw new Error('Failed to retrieve sent emails');
      }
    },

    previewAdHocEmail: async (_: any, args: { bodyHtml: string }) => {
      return buildAdHocEmailHtml(args.bodyHtml);
    },

    generateAdHocEmail: async (_: any, args: { messages: AiMessageInput[] }, context: serverContext) => {
      try {
        const apiKey = await context.dataSources.vault.get('anthropic-api-key');
        if (!apiKey) {
          throw new Error('AI service not configured. Set anthropic-api-key in Key Vault.');
        }

        const result = await generateEmailWithAi(
          args.messages.map((m) => ({ role: m.role, content: m.content })),
          apiKey
        );
        return result;
      } catch (error) {
        console.error('Failed to generate email:', error);
        throw error;
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
    },

    sendAdHocEmail: async (_: any, args: { input: SendAdHocEmailInput }, context: serverContext) => {
      try {
        const { input } = args;
        const userId = context.userId || 'system';
        const userEmail = context.userEmail || 'system@spiriverse.com';
        const now = new Date().toISOString();
        const id = uuidv4();

        // Build the branded HTML
        const htmlSnapshot = buildAdHocEmailHtml(input.bodyHtml);

        const isScheduled = !!input.scheduledFor && new Date(input.scheduledFor) > new Date();

        // If not scheduled, send immediately
        if (!isScheduled) {
          const allCc = (input.cc || []).filter(Boolean) as string[];
          const allBcc = (input.bcc || []).filter(Boolean) as string[];

          for (let i = 0; i < input.recipients.length; i++) {
            // Only include CC/BCC on the first email to avoid duplicates
            await context.dataSources.email.sendRawHtmlEmail(
              'noreply@spiriverse.com',
              input.recipients[i],
              input.subject,
              htmlSnapshot,
              i === 0 ? allCc : [],
              i === 0 ? allBcc : []
            );
          }
        }

        // If sending from a draft, delete the draft first
        if (input.draftId) {
          try {
            await context.dataSources.tableStorage.deleteEntity(SENT_EMAILS_TABLE, userId, input.draftId);
          } catch {
            // Draft may already be gone, that's fine
          }
        }

        // Store in Table Storage
        const entity: SentEmailEntity = {
          partitionKey: userId,
          rowKey: id,
          sentByEmail: userEmail,
          recipients: JSON.stringify(input.recipients),
          cc: JSON.stringify(input.cc || []),
          bcc: JSON.stringify(input.bcc || []),
          subject: input.subject,
          bodyHtml: input.bodyHtml,
          htmlSnapshot,
          emailStatus: isScheduled ? 'SCHEDULED' : 'SENT',
          scheduledFor: input.scheduledFor || undefined,
          sentAt: isScheduled ? undefined : now,
          createdAt: now,
        };

        await context.dataSources.tableStorage.createEntity(SENT_EMAILS_TABLE, entity);

        return entityToSentEmail(entity);
      } catch (error) {
        console.error('Failed to send ad-hoc email:', error);
        throw new Error('Failed to send email');
      }
    },

    cancelScheduledEmail: async (_: any, args: { id: string }, context: serverContext) => {
      try {
        const userId = context.userId || 'system';

        const entity = await context.dataSources.tableStorage.getEntity<SentEmailEntity>(
          SENT_EMAILS_TABLE,
          userId,
          args.id
        );

        if (!entity) {
          throw new Error('Email not found');
        }

        if (entity.emailStatus !== 'SCHEDULED') {
          throw new Error('Only scheduled emails can be cancelled');
        }

        await context.dataSources.tableStorage.updateEntity(SENT_EMAILS_TABLE, {
          partitionKey: userId,
          rowKey: args.id,
          emailStatus: 'CANCELLED',
        });

        return true;
      } catch (error) {
        console.error(`Failed to cancel scheduled email ${args.id}:`, error);
        throw error;
      }
    },

    saveEmailDraft: async (_: any, args: { input: { id?: string; recipients?: string[]; cc?: string[]; bcc?: string[]; subject?: string; bodyHtml?: string } }, context: serverContext) => {
      try {
        const { input } = args;
        const userId = context.userId || 'system';
        const userEmail = context.userEmail || 'system@spiriverse.com';
        const now = new Date().toISOString();
        const id = input.id || uuidv4();

        const entity: SentEmailEntity = {
          partitionKey: userId,
          rowKey: id,
          sentByEmail: userEmail,
          recipients: JSON.stringify(input.recipients || []),
          cc: JSON.stringify(input.cc || []),
          bcc: JSON.stringify(input.bcc || []),
          subject: input.subject || '',
          bodyHtml: input.bodyHtml || '',
          htmlSnapshot: '',
          emailStatus: 'DRAFT',
          createdAt: now,
        };

        await context.dataSources.tableStorage.upsertEntity(SENT_EMAILS_TABLE, entity);

        return entityToSentEmail(entity);
      } catch (error) {
        console.error('Failed to save email draft:', error);
        throw new Error('Failed to save draft');
      }
    },

    deleteEmailDraft: async (_: any, args: { id: string }, context: serverContext) => {
      try {
        const userId = context.userId || 'system';
        await context.dataSources.tableStorage.deleteEntity(SENT_EMAILS_TABLE, userId, args.id);
        return true;
      } catch (error) {
        console.error(`Failed to delete email draft ${args.id}:`, error);
        throw error;
      }
    },
  }
};

export { resolvers };

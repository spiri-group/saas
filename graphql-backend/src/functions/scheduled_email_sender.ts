/**
 * Scheduled email sender - processes emails with emailStatus = 'SCHEDULED'
 * that are due to be sent (scheduledFor <= now).
 */
import { AzureEmailDataSource } from "../services/azureEmail";
import { TableStorageDataSource } from "../services/tablestorage";
import { LogManager } from "../utils/functions";
import { SentEmailEntity, SENT_EMAILS_TABLE } from "../graphql/email/adhocTypes";

export async function runScheduledEmailSender(
    tableStorage: TableStorageDataSource,
    email: AzureEmailDataSource,
    logger: LogManager
): Promise<void> {
    const now = new Date().toISOString();
    logger.logMessage(`ScheduledEmailSender :: Checking for emails due before ${now}`);

    // Query for scheduled emails that are due
    const filter = `emailStatus eq 'SCHEDULED' and scheduledFor le '${now}'`;
    const entities = await tableStorage.queryEntities<SentEmailEntity>(SENT_EMAILS_TABLE, filter);

    logger.logMessage(`ScheduledEmailSender :: Found ${entities.length} email(s) to send`);

    for (const entity of entities) {
        try {
            const recipients: string[] = JSON.parse(entity.recipients || "[]");
            const cc: string[] = JSON.parse(entity.cc || "[]");
            const bcc: string[] = JSON.parse(entity.bcc || "[]");

            for (let i = 0; i < recipients.length; i++) {
                // Only include CC/BCC on the first email to avoid duplicates
                await email.sendRawHtmlEmail(
                    "noreply@spiriverse.com",
                    recipients[i],
                    entity.subject,
                    entity.htmlSnapshot,
                    i === 0 ? cc : [],
                    i === 0 ? bcc : []
                );
            }

            // Mark as sent
            await tableStorage.updateEntity(SENT_EMAILS_TABLE, {
                partitionKey: entity.partitionKey,
                rowKey: entity.rowKey,
                emailStatus: "SENT",
                sentAt: new Date().toISOString(),
            });

            logger.logMessage(`ScheduledEmailSender :: Sent email ${entity.rowKey} to ${recipients.join(", ")}`);
        } catch (error) {
            logger.logMessage(`ScheduledEmailSender :: Failed to send email ${entity.rowKey}: ${error}`);

            // Mark as failed
            try {
                await tableStorage.updateEntity(SENT_EMAILS_TABLE, {
                    partitionKey: entity.partitionKey,
                    rowKey: entity.rowKey,
                    emailStatus: "FAILED",
                });
            } catch (updateError) {
                logger.logMessage(`ScheduledEmailSender :: Failed to update status for ${entity.rowKey}: ${updateError}`);
            }
        }
    }

    logger.logMessage("ScheduledEmailSender :: Complete");
}

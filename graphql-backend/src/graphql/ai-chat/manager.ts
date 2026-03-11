import { TableEntity } from "@azure/data-tables";
import { DateTime } from "luxon";
import { v4 as uuidv4 } from "uuid";
import { TableStorageDataSource } from "../../services/tablestorage";
import { AiConversation, AiMessage } from "./types";

const CONVERSATIONS_TABLE = "AiChatConversations";
const MESSAGES_TABLE = "AiChatMessages";

// --- Table entities ---

interface ConversationEntity extends TableEntity {
    partitionKey: string;   // "console"
    rowKey: string;         // invertedTimestamp_id (newest first)
    id: string;
    title: string;
    messageCount: number;
    createdDate: string;
    updatedDate: string;
}

interface MessageEntity extends TableEntity {
    partitionKey: string;   // conversationId
    rowKey: string;         // padded message number "00001"
    id: string;
    conversationId: string;
    role: string;
    content: string;
    createdDate: string;
}

// --- Helpers ---

function invertedTimestamp(date: DateTime): string {
    const max = 9999999999999;
    return (max - date.toMillis()).toString().padStart(13, '0');
}

function entityToConversation(e: ConversationEntity): AiConversation {
    return {
        id: e.id,
        title: e.title,
        messageCount: e.messageCount ?? 0,
        createdDate: e.createdDate,
        updatedDate: e.updatedDate,
    };
}

function entityToMessage(e: MessageEntity): AiMessage {
    return {
        id: e.id,
        conversationId: e.conversationId,
        role: e.role as 'user' | 'assistant',
        content: e.content,
        createdDate: e.createdDate,
    };
}

// --- Manager ---

export const AiChatManager = {

    async createConversation(tableStorage: TableStorageDataSource, title: string): Promise<AiConversation> {
        const now = DateTime.now();
        const id = uuidv4();

        const entity: ConversationEntity = {
            partitionKey: "console",
            rowKey: `${invertedTimestamp(now)}_${id}`,
            id,
            title,
            messageCount: 0,
            createdDate: now.toISO()!,
            updatedDate: now.toISO()!,
        };

        await tableStorage.createEntity(CONVERSATIONS_TABLE, entity);
        return entityToConversation(entity);
    },

    async getConversation(tableStorage: TableStorageDataSource, id: string): Promise<AiConversation | null> {
        const entities = await tableStorage.queryEntities<ConversationEntity>(
            CONVERSATIONS_TABLE,
            `PartitionKey eq 'console' and id eq '${id}'`
        );
        return entities.length > 0 ? entityToConversation(entities[0]) : null;
    },

    async listConversations(tableStorage: TableStorageDataSource): Promise<AiConversation[]> {
        const entities = await tableStorage.queryEntities<ConversationEntity>(
            CONVERSATIONS_TABLE,
            `PartitionKey eq 'console'`
        );
        // Already sorted newest-first by inverted timestamp rowKey
        return entities.map(entityToConversation);
    },

    async renameConversation(tableStorage: TableStorageDataSource, id: string, title: string): Promise<AiConversation | null> {
        const entities = await tableStorage.queryEntities<ConversationEntity>(
            CONVERSATIONS_TABLE,
            `PartitionKey eq 'console' and id eq '${id}'`
        );
        if (entities.length === 0) return null;

        const entity = entities[0];
        await tableStorage.updateEntity(CONVERSATIONS_TABLE, {
            partitionKey: entity.partitionKey,
            rowKey: entity.rowKey,
            title,
            updatedDate: DateTime.now().toISO()!,
        } as ConversationEntity);

        return this.getConversation(tableStorage, id);
    },

    async deleteConversation(tableStorage: TableStorageDataSource, id: string): Promise<boolean> {
        // Delete conversation entity
        const entities = await tableStorage.queryEntities<ConversationEntity>(
            CONVERSATIONS_TABLE,
            `PartitionKey eq 'console' and id eq '${id}'`
        );
        if (entities.length === 0) return false;

        await tableStorage.deleteEntity(CONVERSATIONS_TABLE, entities[0].partitionKey, entities[0].rowKey);

        // Delete all messages in the conversation
        const messages = await tableStorage.queryEntities<MessageEntity>(
            MESSAGES_TABLE,
            `PartitionKey eq '${id}'`
        );
        for (const msg of messages) {
            await tableStorage.deleteEntity(MESSAGES_TABLE, msg.partitionKey, msg.rowKey);
        }

        return true;
    },

    async addMessage(
        tableStorage: TableStorageDataSource,
        conversationId: string,
        role: 'user' | 'assistant',
        content: string,
        messageNumber: number
    ): Promise<AiMessage> {
        const now = DateTime.now();
        const id = uuidv4();

        const entity: MessageEntity = {
            partitionKey: conversationId,
            rowKey: messageNumber.toString().padStart(5, '0'),
            id,
            conversationId,
            role,
            content,
            createdDate: now.toISO()!,
        };

        await tableStorage.createEntity(MESSAGES_TABLE, entity);

        // Update conversation message count and updatedDate
        const convEntities = await tableStorage.queryEntities<ConversationEntity>(
            CONVERSATIONS_TABLE,
            `PartitionKey eq 'console' and id eq '${conversationId}'`
        );
        if (convEntities.length > 0) {
            await tableStorage.updateEntity(CONVERSATIONS_TABLE, {
                partitionKey: convEntities[0].partitionKey,
                rowKey: convEntities[0].rowKey,
                messageCount: messageNumber,
                updatedDate: now.toISO()!,
            } as ConversationEntity);
        }

        return entityToMessage(entity);
    },

    async getMessages(tableStorage: TableStorageDataSource, conversationId: string): Promise<AiMessage[]> {
        const entities = await tableStorage.queryEntities<MessageEntity>(
            MESSAGES_TABLE,
            `PartitionKey eq '${conversationId}'`
        );
        // Sorted by rowKey (padded message number) = chronological order
        return entities.map(entityToMessage);
    },
};

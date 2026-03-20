export interface AiConversation {
    id: string;
    title: string;
    createdDate: string;
    updatedDate: string;
    messageCount: number;
    createdByUserId?: string;
    createdByEmail?: string;
}

export interface AiMessage {
    id: string;
    conversationId: string;
    role: 'user' | 'assistant';
    content: string;
    createdDate: string;
    senderUserId?: string;
    senderEmail?: string;
}

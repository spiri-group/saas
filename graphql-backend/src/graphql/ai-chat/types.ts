export interface AiConversation {
    id: string;
    title: string;
    createdDate: string;
    updatedDate: string;
    messageCount: number;
}

export interface AiMessage {
    id: string;
    conversationId: string;
    role: 'user' | 'assistant';
    content: string;
    createdDate: string;
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

export type AiConversation = {
    id: string;
    title: string;
    createdDate: string;
    updatedDate: string;
    messageCount: number;
};

export type AiMessage = {
    id: string;
    conversationId: string;
    role: 'user' | 'assistant';
    content: string;
    createdDate: string;
};

export const useAiConversations = () => {
    return useQuery({
        queryKey: ['ai-conversations'],
        queryFn: async () => {
            const response = await gql<{
                aiConversations: AiConversation[];
            }>(`
                query GetAiConversations {
                    aiConversations {
                        id
                        title
                        createdDate
                        updatedDate
                        messageCount
                    }
                }
            `);
            return response.aiConversations || [];
        },
    });
};

export const useAiMessages = (conversationId: string | null) => {
    return useQuery({
        queryKey: ['ai-messages', conversationId],
        queryFn: async () => {
            const response = await gql<{
                aiMessages: AiMessage[];
            }>(`
                query GetAiMessages($conversationId: ID!) {
                    aiMessages(conversationId: $conversationId) {
                        id
                        conversationId
                        role
                        content
                        createdDate
                    }
                }
            `, { conversationId });
            return response.aiMessages || [];
        },
        enabled: !!conversationId,
    });
};

export const useAiSendMessage = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { conversationId?: string; message: string }) => {
            const response = await gql<{
                aiSendMessage: {
                    message: AiMessage;
                    reply: AiMessage;
                    conversation: AiConversation;
                };
            }>(`
                mutation AiSendMessage($conversationId: ID, $message: String!) {
                    aiSendMessage(conversationId: $conversationId, message: $message) {
                        message {
                            id
                            conversationId
                            role
                            content
                            createdDate
                        }
                        reply {
                            id
                            conversationId
                            role
                            content
                            createdDate
                        }
                        conversation {
                            id
                            title
                            createdDate
                            updatedDate
                            messageCount
                        }
                    }
                }
            `, data);
            return response.aiSendMessage;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
            queryClient.invalidateQueries({ queryKey: ['ai-messages', data.conversation.id] });
        },
    });
};

export const useAiRenameConversation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { id: string; title: string }) => {
            const response = await gql<{
                aiRenameConversation: AiConversation;
            }>(`
                mutation AiRenameConversation($id: ID!, $title: String!) {
                    aiRenameConversation(id: $id, title: $title) {
                        id
                        title
                        createdDate
                        updatedDate
                        messageCount
                    }
                }
            `, data);
            return response.aiRenameConversation;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
        },
    });
};

export const useAiDeleteConversation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const response = await gql<{
                aiDeleteConversation: boolean;
            }>(`
                mutation AiDeleteConversation($id: ID!) {
                    aiDeleteConversation(id: $id)
                }
            `, { id });
            return response.aiDeleteConversation;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
        },
    });
};

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';
import { useRealTimeQueryList } from '@/components/utils/RealTime/useRealTimeQueryList';
import { useSignalRConnection } from '@/components/utils/SignalRProvider';
import { useCallback, useEffect, useRef, useState } from 'react';

export type AiConversation = {
    id: string;
    title: string;
    createdDate: string;
    updatedDate: string;
    messageCount: number;
    createdByUserId?: string;
    createdByEmail?: string;
};

export type AiMessage = {
    id: string;
    conversationId: string;
    role: 'user' | 'assistant';
    content: string;
    createdDate: string;
    senderUserId?: string;
    senderEmail?: string;
};

export type TypingUser = {
    email: string;
    displayName: string;
};

export const useAiConversations = () => {
    return useRealTimeQueryList<AiConversation>({
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
                        createdByUserId
                        createdByEmail
                    }
                }
            `);
            return response.aiConversations || [];
        },
        realtimeEvent: 'ai-chat-conversation',
        selectId: (conv) => conv.id,
        signalRGroup: 'ai-chat-list',
    });
};

export const useAiMessages = (conversationId: string | null) => {
    return useRealTimeQueryList<AiMessage>({
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
                        senderUserId
                        senderEmail
                    }
                }
            `, { conversationId });
            return response.aiMessages || [];
        },
        realtimeEvent: 'ai-chat-message',
        selectId: (msg) => msg.id,
        signalRGroup: conversationId ? `ai-chat-${conversationId}` : undefined,
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
                            senderUserId
                            senderEmail
                        }
                        reply {
                            id
                            conversationId
                            role
                            content
                            createdDate
                            senderUserId
                            senderEmail
                        }
                        conversation {
                            id
                            title
                            createdDate
                            updatedDate
                            messageCount
                            createdByUserId
                            createdByEmail
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
                        createdByUserId
                        createdByEmail
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

// --- Typing indicator hook ---

const hubUrl =
    process.env.NEXT_PUBLIC_server_endpoint != undefined &&
    !process.env.NEXT_PUBLIC_server_endpoint.includes('localhost')
        ? `${process.env.NEXT_PUBLIC_server_endpoint}`
        : "http://127.0.0.1:7071/api";

const hubCode = process.env.NEXT_PUBLIC_server_endpoint_code == undefined ? "" : `code=${process.env.NEXT_PUBLIC_server_endpoint_code}`;

function getBroadcastUrl() {
    let url = `${hubUrl}/aiChatBroadcast`;
    if (hubCode) url += `?${hubCode}`;
    return url;
}

export const useAiTypingIndicator = (conversationId: string | null, currentUserEmail: string | null) => {
    const signalR = useSignalRConnection();
    const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
    const typingTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
    const lastSentRef = useRef<number>(0);

    // Listen for typing events from other users
    useEffect(() => {
        if (!signalR?.connection || !conversationId) return;

        const handler = (data: { email: string; displayName: string }) => {
            // Ignore own typing
            if (data.email === currentUserEmail) return;

            setTypingUsers(prev => {
                const exists = prev.find(u => u.email === data.email);
                if (!exists) return [...prev, { email: data.email, displayName: data.displayName }];
                return prev;
            });

            // Clear existing timeout for this user
            const existing = typingTimeouts.current.get(data.email);
            if (existing) clearTimeout(existing);

            // Remove after 3 seconds of no typing
            const timeout = setTimeout(() => {
                setTypingUsers(prev => prev.filter(u => u.email !== data.email));
                typingTimeouts.current.delete(data.email);
            }, 3000);
            typingTimeouts.current.set(data.email, timeout);
        };

        signalR.connection.on('ai-chat-typing', handler);
        return () => {
            signalR.connection?.off('ai-chat-typing', handler);
            // Clear all timeouts
            typingTimeouts.current.forEach(t => clearTimeout(t));
            typingTimeouts.current.clear();
            setTypingUsers([]);
        };
    }, [signalR?.connection, conversationId, currentUserEmail]);

    // Send typing indicator (debounced to every 2 seconds)
    const sendTyping = useCallback(() => {
        if (!conversationId || !currentUserEmail) return;

        const now = Date.now();
        if (now - lastSentRef.current < 2000) return;
        lastSentRef.current = now;

        const displayName = currentUserEmail.split('@')[0];
        const capitalizedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

        fetch(getBroadcastUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                target: 'ai-chat-typing',
                group: `ai-chat-${conversationId}`,
                data: { email: currentUserEmail, displayName: capitalizedName },
            }),
        }).catch(() => { /* typing indicator is best-effort */ });
    }, [conversationId, currentUserEmail]);

    return { typingUsers, sendTyping };
};

// --- AI thinking indicator hook (broadcasts when AI is processing a request) ---

export const useAiThinkingIndicator = (conversationId: string | null, currentUserEmail: string | null) => {
    const signalR = useSignalRConnection();
    const [isThinking, setIsThinking] = useState(false);
    const [senderName, setSenderName] = useState<string>("");
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Listen for thinking events from other users
    useEffect(() => {
        if (!signalR?.connection || !conversationId) return;

        const handleStart = (data: { email: string; displayName: string }) => {
            if (data.email === currentUserEmail) return;
            setIsThinking(true);
            setSenderName(data.displayName);

            // Auto-clear after 60 seconds (safety timeout)
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
                setIsThinking(false);
            }, 60000);
        };

        const handleDone = (data: { email: string }) => {
            if (data.email === currentUserEmail) return;
            setIsThinking(false);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };

        signalR.connection.on('ai-chat-thinking-start', handleStart);
        signalR.connection.on('ai-chat-thinking-done', handleDone);
        return () => {
            signalR.connection?.off('ai-chat-thinking-start', handleStart);
            signalR.connection?.off('ai-chat-thinking-done', handleDone);
            setIsThinking(false);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [signalR?.connection, conversationId, currentUserEmail]);

    const broadcastThinking = useCallback(() => {
        if (!conversationId || !currentUserEmail) return;
        const displayName = currentUserEmail.split('@')[0];
        const capitalizedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

        fetch(getBroadcastUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                target: 'ai-chat-thinking-start',
                group: `ai-chat-${conversationId}`,
                data: { email: currentUserEmail, displayName: capitalizedName },
            }),
        }).catch(() => {});
    }, [conversationId, currentUserEmail]);

    const clearThinking = useCallback(() => {
        if (!conversationId || !currentUserEmail) return;

        fetch(getBroadcastUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                target: 'ai-chat-thinking-done',
                group: `ai-chat-${conversationId}`,
                data: { email: currentUserEmail },
            }),
        }).catch(() => {});
    }, [conversationId, currentUserEmail]);

    return { isThinking, senderName, broadcastThinking, clearThinking };
};

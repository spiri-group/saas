import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

interface ConversationCustomer {
    id: string;
    firstname: string;
    lastname?: string;
    email?: string;
}

interface ConversationMessage {
    id: string;
    text: string;
    sentAt: string;
    posted_by_user?: {
        id: string;
        firstname: string;
    };
    posted_by_vendor?: {
        id: string;
        name: string;
    };
}

export interface PractitionerConversation {
    conversationId: string;
    customer: ConversationCustomer;
    lastMessage: ConversationMessage | null;
    messageCount: number;
    lastMessageAt: string | null;
}

export const usePractitionerConversations = (practitionerId: string) => {
    return useQuery({
        queryKey: ['practitioner-conversations', practitionerId],
        queryFn: async () => {
            const response = await gql<{
                practitionerConversations: PractitionerConversation[];
            }>(`
                query GetPractitionerConversations($practitionerId: ID!) {
                    practitionerConversations(practitionerId: $practitionerId) {
                        conversationId
                        customer {
                            id
                            firstname
                            lastname
                            email
                        }
                        lastMessage {
                            id
                            text
                            sentAt
                            posted_by_user {
                                id
                                firstname
                            }
                            posted_by_vendor {
                                id
                                name
                            }
                        }
                        messageCount
                        lastMessageAt
                    }
                }
            `, { practitionerId });
            return response.practitionerConversations;
        },
        enabled: !!practitionerId,
    });
};

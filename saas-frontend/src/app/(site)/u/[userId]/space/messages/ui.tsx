'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Clock, Store } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import ChatControl from '@/components/ux/ChatControl';
import { useCustomerMessages } from './hooks/UseCustomerMessages';
import { CommunicationModeType, message_type } from '@/utils/spiriverse';

type Props = {
    userId: string;
};

const UI: React.FC<Props> = ({ userId }) => {
    const [selectedConversation, setSelectedConversation] = useState<any>(null);

    const messagesQuery = useCustomerMessages(userId);
    const messages = messagesQuery.data || [];

    // Group messages by merchant
    const messagesByMerchant = messages.reduce((acc: any, message: message_type) => {
        const merchantKey = message.ref?.partition?.[0] || 'unknown';
        if (!acc[merchantKey]) {
            acc[merchantKey] = {
                merchantId: merchantKey,
                merchantName: message.posted_by_vendor?.name || 'Unknown Merchant',
                messages: [],
                lastMessage: message,
                hasUnread: false,
                forObject: {
                    id: merchantKey,
                    partition: [merchantKey],
                    container: "Main-Vendor"
                }
            };
        }
        acc[merchantKey].messages.push(message);

        if (new Date(message.sentAt) > new Date(acc[merchantKey].lastMessage.sentAt)) {
            acc[merchantKey].lastMessage = message;
        }

        return acc;
    }, {});

    const conversations = Object.values(messagesByMerchant).sort((a: any, b: any) =>
        new Date(b.lastMessage.sentAt).getTime() - new Date(a.lastMessage.sentAt).getTime()
    );

    const getMessageTime = (sentAt: string) => {
        const date = new Date(sentAt);
        const now = new Date();
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

        if (diffInHours < 24) {
            return format(date, 'HH:mm');
        } else if (diffInHours < 168) {
            return format(date, 'EEE HH:mm');
        } else {
            return format(date, 'MMM dd');
        }
    };

    return (
        <div className="min-h-screen-minus-nav flex flex-col p-4 md:p-6" data-testid="messages-page">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-indigo-500/20 rounded-xl">
                    <MessageCircle className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                    <h1 className="text-xl font-light text-white">Messages</h1>
                    <p className="text-slate-400 text-sm">Conversations with merchants and practitioners</p>
                </div>
            </div>

            {/* Content */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl flex-grow overflow-hidden">
                {conversations.length === 0 ? (
                    <div className="text-center py-16">
                        <MessageCircle className="w-12 h-12 text-indigo-400/40 mx-auto mb-6" />
                        <h2 className="text-xl font-light text-white mb-2">No messages yet</h2>
                        <p className="text-slate-400 text-sm max-w-sm mx-auto">
                            Conversations with merchants and practitioners will appear here
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col md:flex-row h-[calc(100vh-220px)]">
                        {/* Conversations list */}
                        <div className="w-full md:w-72 lg:w-80 border-b md:border-b-0 md:border-r border-white/10 overflow-y-auto">
                            <div className="p-3">
                                <p className="text-xs text-slate-500 uppercase tracking-wider px-2 mb-2">
                                    Conversations ({conversations.length})
                                </p>
                                <div className="space-y-1">
                                    {conversations.map((conversation: any) => (
                                        <button
                                            key={conversation.merchantId}
                                            data-testid={`conversation-${conversation.merchantId}`}
                                            className={cn(
                                                "w-full p-2.5 rounded-lg text-left transition-all",
                                                selectedConversation?.merchantId === conversation.merchantId
                                                    ? "bg-indigo-500/20 border border-indigo-400/30"
                                                    : "hover:bg-white/5 border border-transparent"
                                            )}
                                            onClick={() => setSelectedConversation(conversation)}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-grow">
                                                    <div className="flex items-center gap-1.5">
                                                        <Store className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                                        <span className="text-sm text-white font-medium truncate">
                                                            {conversation.merchantName}
                                                        </span>
                                                        {conversation.hasUnread && (
                                                            <Badge className="text-[10px] px-1 py-0 bg-indigo-500">New</Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-500 truncate mt-0.5 pl-5">
                                                        {conversation.lastMessage.text}
                                                    </p>
                                                </div>
                                                <span className="text-[10px] text-slate-600 shrink-0">
                                                    {getMessageTime(conversation.lastMessage.sentAt)}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Chat area */}
                        <div className="flex-grow flex flex-col min-h-0">
                            {selectedConversation ? (
                                <>
                                    <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                                        <Store className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm text-white font-medium">{selectedConversation.merchantName}</span>
                                    </div>
                                    <div className="flex-grow p-4 min-h-0">
                                        <ChatControl
                                            forObject={selectedConversation.forObject}
                                            title={`Chat with ${selectedConversation.merchantName}`}
                                            defaultMode={CommunicationModeType.PLATFORM}
                                            allowResponseCodes={false}
                                            readonly={false}
                                            userId={userId}
                                            vendorSettings={{
                                                withCompanyLogo: true,
                                                withCompanyName: true,
                                                withUserName: true
                                            }}
                                            withDiscussion={false}
                                            withTitle={false}
                                            withAttachments={true}
                                            className="h-full"
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center justify-center flex-grow">
                                    <div className="text-center">
                                        <MessageCircle className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                                        <p className="text-sm text-slate-500">Select a conversation</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UI;

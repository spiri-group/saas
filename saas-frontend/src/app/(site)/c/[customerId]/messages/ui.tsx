'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Users, Clock, Store } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import ChatControl from '@/components/ux/ChatControl';
import { useCustomerMessages } from './hooks/UseCustomerMessages';
import { CommunicationModeType, message_type } from '@/utils/spiriverse';

type Props = {
    customerId: string;
};

const CustomerMessageCenter: React.FC<Props> = ({ customerId }) => {
    const [selectedConversation, setSelectedConversation] = useState<any>(null);
    
    const messagesQuery = useCustomerMessages(customerId);
    const messages = messagesQuery.data || [];

    // Group messages by merchant (topicRef - the conversation topic)
    const messagesByMerchant = messages.reduce((acc: any, message: message_type) => {
        // Use topicRef to identify the conversation topic (should be the merchant)
        const merchantKey = message.ref?.partition?.[0] || 'unknown';
        if (!acc[merchantKey]) {
            acc[merchantKey] = {
                merchantId: merchantKey,
                merchantName: message.posted_by_vendor?.name || 'Unknown Merchant',
                messages: [],
                lastMessage: message,
                hasUnread: false, // We'll implement read status later
                forObject: {
                    id: merchantKey,
                    partition: [merchantKey],
                    container: "Main-Vendor"
                }
            };
        }
        acc[merchantKey].messages.push(message);
        
        // Update last message if this one is newer
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
        } else if (diffInHours < 168) { // 7 days
            return format(date, 'EEE HH:mm');
        } else {
            return format(date, 'MMM dd, HH:mm');
        }
    };

    return (
        <div className="container mx-auto p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold flex items-center">
                    <MessageCircle className="mr-2" />
                    My Messages
                </h1>
                <p className="text-muted-foreground">
                    View and respond to messages from merchants
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Conversations List */}
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center">
                                <Users className="w-5 h-5 mr-2" />
                                Conversations ({conversations.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {conversations.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>No conversations yet</p>
                                    <p className="text-sm">Messages from merchants will appear here</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {conversations.map((conversation: any) => (
                                        <div
                                            key={conversation.merchantId}
                                            className={cn(
                                                "p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors",
                                                selectedConversation?.merchantId === conversation.merchantId && "bg-muted ring-2 ring-primary/20"
                                            )}
                                            onClick={() => setSelectedConversation(conversation)}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center space-x-2">
                                                        <Store className="w-4 h-4 text-muted-foreground" />
                                                        <h4 className="font-medium truncate">
                                                            {conversation.merchantName}
                                                        </h4>
                                                        {conversation.hasUnread && (
                                                            <Badge variant="default" className="text-xs px-1.5 py-0.5">
                                                                New
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-muted-foreground truncate mt-1">
                                                        {conversation.lastMessage.text}
                                                    </p>
                                                </div>
                                                <div className="text-xs text-muted-foreground ml-2">
                                                    <Clock className="w-3 h-3 inline mr-1" />
                                                    {getMessageTime(conversation.lastMessage.sentAt)}
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-2">
                                                {conversation.messages.length} message{conversation.messages.length === 1 ? '' : 's'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Chat Control Area */}
                <div className="lg:col-span-2">
                    {selectedConversation ? (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <Store className="w-5 h-5" />
                                        <span>
                                            Conversation with {selectedConversation.merchantName}
                                        </span>
                                    </div>
                                    <Badge variant="outline">
                                        {selectedConversation.messages.length} messages
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="h-[600px] p-6">
                                    <ChatControl
                                        forObject={selectedConversation.forObject}
                                        title={`Chat with ${selectedConversation.merchantName}`}
                                        defaultMode={CommunicationModeType.PLATFORM}
                                        allowResponseCodes={false}
                                        readonly={false}
                                        userId={customerId}
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
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardContent className="flex items-center justify-center py-12">
                                <div className="text-center text-muted-foreground">
                                    <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                    <h3 className="text-lg font-medium mb-2">No conversation selected</h3>
                                    <p>Select a conversation from the left to view and reply to messages</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CustomerMessageCenter;
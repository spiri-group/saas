'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MessageCircle, Users, Clock, MessageSquarePlus, Loader2 } from 'lucide-react';
import ChatControl from '@/components/ux/ChatControl';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { usePractitionerConversations, PractitionerConversation } from './hooks/UsePractitionerConversations';
import { useCreateConversation } from './hooks/UseCreateConversation';
import { CommunicationModeType } from '@/utils/spiriverse';
import { Textarea } from '@/components/ui/textarea';

type Props = {
    merchantId: string;
};

const MessageCenter: React.FC<Props> = ({ merchantId }) => {
    const [selectedConversation, setSelectedConversation] = useState<PractitionerConversation | null>(null);
    const [showNewConversation, setShowNewConversation] = useState(false);
    const [newConversationData, setNewConversationData] = useState({
        customerEmail: '',
        subject: '',
        message: ''
    });

    const conversationsQuery = usePractitionerConversations(merchantId);
    const createConversationMutation = useCreateConversation();

    const conversations = conversationsQuery.data || [];

    const handleStartConversation = async () => {
        if (!newConversationData.customerEmail.trim() ||
            !newConversationData.subject.trim() ||
            !newConversationData.message.trim()) return;

        try {
            await createConversationMutation.mutateAsync({
                customerEmail: newConversationData.customerEmail,
                subject: newConversationData.subject,
                message: newConversationData.message,
                merchantId: merchantId
            });

            setNewConversationData({ customerEmail: '', subject: '', message: '' });
            setShowNewConversation(false);
            conversationsQuery.refetch();
        } catch (error) {
            console.error('Failed to start conversation:', error);
        }
    };

    const getMessageTime = (sentAt: string | null) => {
        if (!sentAt) return '';
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

    // Build forObject for ChatControl based on conversation
    const getForObject = (conversation: PractitionerConversation) => {
        return {
            id: conversation.conversationId,
            partition: [merchantId],
            container: "Main-Conversation"
        };
    };

    return (
        <div className="container mx-auto p-6" data-testid="message-center">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold flex items-center" data-testid="message-center-heading">
                        <MessageCircle className="mr-2" />
                        Message Center
                    </h1>
                    <p className="text-muted-foreground">
                        Manage customer messages and conversations
                    </p>
                </div>
                <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
                    <DialogTrigger asChild>
                        <Button data-testid="start-conversation-btn">
                            <MessageSquarePlus className="w-4 h-4 mr-2" />
                            Start Conversation
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Start New Conversation</DialogTitle>
                            <DialogDescription>
                                Send a message to a customer to start a new conversation.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="customer-email">Customer Email</Label>
                                <Input
                                    id="customer-email"
                                    data-testid="new-conversation-email"
                                    type="email"
                                    value={newConversationData.customerEmail}
                                    onChange={(e) => setNewConversationData(prev => ({
                                        ...prev,
                                        customerEmail: e.target.value
                                    }))}
                                    placeholder="customer@example.com"
                                />
                            </div>
                            <div>
                                <Label htmlFor="subject">Subject</Label>
                                <Input
                                    id="subject"
                                    data-testid="new-conversation-subject"
                                    value={newConversationData.subject}
                                    onChange={(e) => setNewConversationData(prev => ({
                                        ...prev,
                                        subject: e.target.value
                                    }))}
                                    placeholder="Message subject"
                                />
                            </div>
                            <div>
                                <Label htmlFor="message">Message</Label>
                                <Textarea
                                    id="message"
                                    data-testid="new-conversation-message"
                                    value={newConversationData.message}
                                    onChange={(e) => setNewConversationData(prev => ({
                                        ...prev,
                                        message: e.target.value
                                    }))}
                                    placeholder="Type your message here..."
                                    rows={4}
                                />
                            </div>
                            <div className="flex justify-end space-x-2">
                                <Button variant="outline" onClick={() => setShowNewConversation(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    data-testid="send-new-conversation-btn"
                                    onClick={handleStartConversation}
                                    disabled={createConversationMutation.isPending}
                                >
                                    {createConversationMutation.isPending ? 'Sending...' : 'Send Message'}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
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
                            {conversationsQuery.isLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : conversations.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground" data-testid="no-conversations">
                                    <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>No conversations yet</p>
                                    <p className="text-sm">Customer messages will appear here</p>
                                </div>
                            ) : (
                                <div className="space-y-2" data-testid="conversations-list">
                                    {conversations.map((conversation) => (
                                        <div
                                            key={conversation.conversationId}
                                            data-testid={`conversation-item-${conversation.customer.id}`}
                                            className={cn(
                                                "p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors",
                                                selectedConversation?.conversationId === conversation.conversationId && "bg-muted ring-2 ring-primary/20"
                                            )}
                                            onClick={() => setSelectedConversation(conversation)}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center space-x-2">
                                                        <h4 className="font-medium truncate" data-testid="customer-name">
                                                            {conversation.customer.firstname || 'Unknown'} {conversation.customer.lastname || ''}
                                                        </h4>
                                                    </div>
                                                    {conversation.lastMessage && (
                                                        <p className="text-sm text-muted-foreground truncate mt-1">
                                                            {conversation.lastMessage.text}
                                                        </p>
                                                    )}
                                                </div>
                                                {conversation.lastMessageAt && (
                                                    <div className="text-xs text-muted-foreground ml-2">
                                                        <Clock className="w-3 h-3 inline mr-1" />
                                                        {getMessageTime(conversation.lastMessageAt)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-2">
                                                {conversation.messageCount} message{conversation.messageCount === 1 ? '' : 's'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Chat Control Area */}
                <div className="lg:col-span-2" data-testid="chat-area">
                    {selectedConversation ? (
                        <Card data-testid="active-conversation">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span data-testid="conversation-with-name">
                                        Conversation with {selectedConversation.customer.firstname || 'Unknown'} {selectedConversation.customer.lastname || ''}
                                    </span>
                                    <Badge variant="outline" data-testid="message-count-badge">
                                        {selectedConversation.messageCount} messages
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="h-[600px] p-6" data-testid="chat-control-container">
                                    <ChatControl
                                        forObject={getForObject(selectedConversation)}
                                        title={`Chat with ${selectedConversation.customer.firstname || 'Customer'}`}
                                        defaultMode={CommunicationModeType.PLATFORM}
                                        allowResponseCodes={false}
                                        readonly={false}
                                        merchantId={merchantId}
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
                        <Card data-testid="no-conversation-selected">
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

export default MessageCenter;

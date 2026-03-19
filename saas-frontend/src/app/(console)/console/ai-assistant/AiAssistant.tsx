"use client";

import { useState, useRef, useEffect } from "react";
import {
    Plus,
    Send,
    Trash2,
    Pencil,
    Check,
    X,
    MessageSquare,
    Bot,
    User,
    Loader2,
    PanelLeftOpen,
} from "lucide-react";
import {
    useAiConversations,
    useAiMessages,
    useAiSendMessage,
    useAiRenameConversation,
    useAiDeleteConversation,
    AiMessage,
} from "./hooks/UseAiChat";

function formatDate(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
}

function MessageBubble({ message }: { message: AiMessage }) {
    const isUser = message.role === "user";

    return (
        <div
            data-testid={`message-${message.id}`}
            className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
        >
            <div
                className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                    isUser
                        ? "bg-console-primary/20"
                        : "bg-purple-500/20"
                }`}
            >
                {isUser ? (
                    <User className="h-4 w-4 text-console-primary" />
                ) : (
                    <Bot className="h-4 w-4 text-purple-400" />
                )}
            </div>
            <div
                className={`flex-1 max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                    isUser
                        ? "bg-console-primary/10 text-console"
                        : "console-surface border border-console text-console-secondary"
                }`}
            >
                <div className="whitespace-pre-wrap break-words">{message.content}</div>
            </div>
        </div>
    );
}

export default function AiAssistant() {
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [inputValue, setInputValue] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [optimisticMessages, setOptimisticMessages] = useState<AiMessage[]>([]);
    const [chatSidebarOpen, setChatSidebarOpen] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const conversations = useAiConversations();
    const messages = useAiMessages(activeConversationId);
    const sendMessage = useAiSendMessage();
    const renameConversation = useAiRenameConversation();
    const deleteConversation = useAiDeleteConversation();

    // Combine real + optimistic messages
    const allMessages = [
        ...(messages.data || []),
        ...optimisticMessages,
    ];

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [allMessages.length]);

    // Focus input when conversation changes
    useEffect(() => {
        inputRef.current?.focus();
    }, [activeConversationId]);

    const handleSend = async () => {
        const text = inputValue.trim();
        if (!text || sendMessage.isPending) return;

        setInputValue("");

        // Optimistic user message
        const optimisticUser: AiMessage = {
            id: `optimistic-user-${Date.now()}`,
            conversationId: activeConversationId || "",
            role: "user",
            content: text,
            createdDate: new Date().toISOString(),
        };
        setOptimisticMessages([optimisticUser]);

        try {
            const result = await sendMessage.mutateAsync({
                conversationId: activeConversationId || undefined,
                message: text,
            });

            // Switch to the conversation (important for new conversations)
            setActiveConversationId(result.conversation.id);
            setOptimisticMessages([]);
        } catch {
            // Keep optimistic message visible on error so user can see what failed
            setOptimisticMessages([
                optimisticUser,
                {
                    id: `optimistic-error-${Date.now()}`,
                    conversationId: activeConversationId || "",
                    role: "assistant",
                    content: "Sorry, something went wrong. Please try again.",
                    createdDate: new Date().toISOString(),
                },
            ]);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleNewChat = () => {
        setActiveConversationId(null);
        setOptimisticMessages([]);
        setInputValue("");
        inputRef.current?.focus();
    };

    const handleDelete = async (id: string) => {
        await deleteConversation.mutateAsync(id);
        if (activeConversationId === id) {
            setActiveConversationId(null);
            setOptimisticMessages([]);
        }
    };

    const handleRenameStart = (id: string, currentTitle: string) => {
        setEditingId(id);
        setEditTitle(currentTitle);
    };

    const handleRenameConfirm = async () => {
        if (!editingId || !editTitle.trim()) return;
        await renameConversation.mutateAsync({ id: editingId, title: editTitle.trim() });
        setEditingId(null);
    };

    return (
        <div className="h-full flex relative">
            {/* Mobile sidebar overlay */}
            {chatSidebarOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/60 z-40"
                    onClick={() => setChatSidebarOpen(false)}
                />
            )}

            {/* Conversation Sidebar — drawer on mobile */}
            <div className={`
                fixed md:static inset-y-0 left-0 z-50
                w-64 flex-shrink-0 console-surface border-r border-console flex flex-col
                transform transition-transform duration-200 ease-in-out
                ${chatSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="p-3 border-b border-console flex items-center gap-2">
                    <button
                        data-testid="new-chat-btn"
                        onClick={() => {
                            handleNewChat();
                            setChatSidebarOpen(false);
                        }}
                        className="flex-1 flex items-center gap-2 px-3 py-2 text-sm font-medium text-console-primary bg-console-primary/10 hover:bg-console-primary/20 rounded-lg transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        New Chat
                    </button>
                    <button
                        className="md:hidden p-2 text-console-muted hover:text-console rounded-lg"
                        onClick={() => setChatSidebarOpen(false)}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto py-2">
                    {conversations.data?.map((conv) => (
                        <div
                            key={conv.id}
                            data-testid={`conversation-${conv.id}`}
                            className={`group flex items-center gap-2 px-3 py-2 mx-2 rounded-lg cursor-pointer transition-colors ${
                                activeConversationId === conv.id
                                    ? "bg-console-primary/10 text-console-primary"
                                    : "text-console-muted hover:text-console hover:bg-console-surface-hover"
                            }`}
                            onClick={() => {
                                setActiveConversationId(conv.id);
                                setOptimisticMessages([]);
                                setChatSidebarOpen(false);
                            }}
                        >
                            <MessageSquare className="h-4 w-4 flex-shrink-0" />

                            {editingId === conv.id ? (
                                <div className="flex-1 flex items-center gap-1">
                                    <input
                                        data-testid="rename-input"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") handleRenameConfirm();
                                            if (e.key === "Escape") setEditingId(null);
                                        }}
                                        className="flex-1 bg-transparent text-sm text-console border-b border-console-primary outline-none"
                                        autoFocus
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRenameConfirm();
                                        }}
                                        className="text-green-400 hover:text-green-300"
                                    >
                                        <Check className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingId(null);
                                        }}
                                        className="text-red-400 hover:text-red-300"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm truncate">{conv.title}</p>
                                        <p className="text-[10px] text-console-muted/60">
                                            {formatDate(conv.updatedDate)}
                                        </p>
                                    </div>
                                    <div className="hidden group-hover:flex items-center gap-1">
                                        <button
                                            data-testid={`rename-${conv.id}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRenameStart(conv.id, conv.title);
                                            }}
                                            className="text-console-muted hover:text-console p-0.5"
                                        >
                                            <Pencil className="h-3 w-3" />
                                        </button>
                                        <button
                                            data-testid={`delete-${conv.id}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(conv.id);
                                            }}
                                            className="text-console-muted hover:text-red-400 p-0.5"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}

                    {conversations.data?.length === 0 && (
                        <p className="px-4 py-6 text-xs text-console-muted/60 text-center">
                            No conversations yet
                        </p>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile: open conversation list */}
                <div className="md:hidden flex items-center gap-2 px-4 py-2 border-b border-console">
                    <button
                        data-testid="open-chat-sidebar-btn"
                        onClick={() => setChatSidebarOpen(true)}
                        className="p-2 text-console-muted hover:text-console rounded-lg"
                    >
                        <PanelLeftOpen className="h-4 w-4" />
                    </button>
                    <span className="text-xs text-console-muted truncate">
                        {activeConversationId
                            ? conversations.data?.find((c) => c.id === activeConversationId)?.title || "Chat"
                            : "New Chat"}
                    </span>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4">
                    {allMessages.length === 0 && !sendMessage.isPending && (
                        <div className="flex-1 flex items-center justify-center h-full">
                            <div className="text-center">
                                <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                                    <Bot className="h-8 w-8 text-purple-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-console mb-1">
                                    SpiriVerse Assistant
                                </h3>
                                <p className="text-sm text-console-muted max-w-md">
                                    Ask questions about the platform, brainstorm ideas, draft content, or get help with operations.
                                </p>
                            </div>
                        </div>
                    )}

                    {allMessages.map((msg) => (
                        <MessageBubble key={msg.id} message={msg} />
                    ))}

                    {sendMessage.isPending && optimisticMessages.length > 0 && (
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                                <Loader2 className="h-4 w-4 text-purple-400 animate-spin" />
                            </div>
                            <div className="console-surface border border-console rounded-xl px-4 py-3">
                                <div className="flex items-center gap-2 text-sm text-console-muted">
                                    <span>Thinking</span>
                                    <span className="animate-pulse">...</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="border-t border-console p-4">
                    <div className="flex items-end gap-3">
                        <textarea
                            ref={inputRef}
                            data-testid="chat-input"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a message..."
                            rows={1}
                            className="flex-1 resize-none bg-console-surface border border-console rounded-xl px-4 py-3 text-sm text-console placeholder:text-console-muted/50 focus:outline-none focus:border-console-primary transition-colors"
                            style={{
                                minHeight: "44px",
                                maxHeight: "160px",
                                height: "auto",
                            }}
                            onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = "auto";
                                target.style.height = `${Math.min(target.scrollHeight, 160)}px`;
                            }}
                        />
                        <button
                            data-testid="send-btn"
                            onClick={handleSend}
                            disabled={!inputValue.trim() || sendMessage.isPending}
                            className="flex-shrink-0 h-11 w-11 rounded-xl bg-console-primary text-white flex items-center justify-center hover:bg-console-primary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            {sendMessage.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                    <p className="mt-2 text-[10px] text-console-muted/40 text-center">
                        Powered by Claude Haiku 4.5 via Azure AI Foundry
                    </p>
                </div>
            </div>
        </div>
    );
}

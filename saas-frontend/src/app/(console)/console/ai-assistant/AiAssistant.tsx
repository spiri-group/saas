"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
    Users,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    useAiConversations,
    useAiMessages,
    useAiSendMessage,
    useAiRenameConversation,
    useAiDeleteConversation,
    useAiTypingIndicator,
    useAiThinkingIndicator,
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

function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getDisplayName(email?: string): string {
    if (!email) return "Unknown";
    const name = email.split("@")[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
}

function getInitials(email?: string): string {
    if (!email) return "?";
    const name = email.split("@")[0];
    return name.charAt(0).toUpperCase();
}

// Deterministic color from email for "other user" avatars
const USER_COLORS = [
    { bg: "bg-blue-500/20", text: "text-blue-400" },
    { bg: "bg-green-500/20", text: "text-green-400" },
    { bg: "bg-amber-500/20", text: "text-amber-400" },
    { bg: "bg-pink-500/20", text: "text-pink-400" },
    { bg: "bg-cyan-500/20", text: "text-cyan-400" },
    { bg: "bg-orange-500/20", text: "text-orange-400" },
];

function getUserColor(email?: string) {
    if (!email) return USER_COLORS[0];
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
        hash = ((hash << 5) - hash + email.charCodeAt(i)) | 0;
    }
    return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

// --- Determine which sender "owns" a message for grouping purposes ---
function getMessageSenderKey(message: AiMessage, currentUserEmail?: string): string {
    if (message.role === "assistant") return "__assistant__";
    if (message.senderEmail) return message.senderEmail;
    // Pre-existing messages with no sender treated as current user
    return currentUserEmail || "__unknown__";
}

function MessageBubble({
    message,
    currentUserEmail,
    isGroupStart,
    isGroupEnd,
}: {
    message: AiMessage;
    currentUserEmail?: string;
    isGroupStart: boolean;
    isGroupEnd: boolean;
}) {
    const isAssistant = message.role === "assistant";
    const isCurrentUser = message.role === "user" && (
        message.senderEmail === currentUserEmail || !message.senderEmail
    );
    const isOtherUser = message.role === "user" && !isCurrentUser;

    const color = getUserColor(message.senderEmail);

    return (
        <div
            data-testid={`message-${message.id}`}
            className={`flex gap-3 ${isCurrentUser ? "flex-row-reverse" : ""} ${
                !isGroupStart ? (isCurrentUser ? "mr-11" : "ml-11") : ""
            }`}
        >
            {/* Avatar — only on first message in a group */}
            {isGroupStart ? (
                <div
                    className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                        isAssistant
                            ? "bg-purple-500/20"
                            : isCurrentUser
                            ? "bg-console-primary/20"
                            : `${color.bg}`
                    }`}
                >
                    {isAssistant ? (
                        <Bot className="h-4 w-4 text-purple-400" />
                    ) : isCurrentUser ? (
                        <User className="h-4 w-4 text-console-primary" />
                    ) : (
                        <span className={color.text}>{getInitials(message.senderEmail)}</span>
                    )}
                </div>
            ) : null}
            <div className="flex-1 max-w-[80%] flex flex-col">
                {/* Sender name — only on first message in a group */}
                {isGroupStart && isOtherUser && (
                    <p className={`text-xs font-medium mb-0.5 ${color.text}`}>
                        {getDisplayName(message.senderEmail)}
                    </p>
                )}
                {isGroupStart && isCurrentUser && message.senderEmail && (
                    <p className={`text-xs font-medium mb-0.5 text-console-primary/70 ${isCurrentUser ? "text-right" : ""}`}>
                        You
                    </p>
                )}
                <div
                    className={`rounded-xl px-4 py-3 text-sm ${
                        isCurrentUser
                            ? "bg-console-primary/10 text-console"
                            : isOtherUser
                            ? "bg-slate-700/50 border border-slate-600/50 text-console-secondary"
                            : "console-surface border border-console text-console-secondary"
                    }`}
                >
                    {isAssistant ? (
                        <div className="prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-headings:my-2 prose-pre:my-2 prose-code:text-purple-300 prose-code:bg-purple-500/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-a:text-console-primary prose-strong:text-console">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {message.content}
                            </ReactMarkdown>
                        </div>
                    ) : (
                        <div className="whitespace-pre-wrap break-words">{message.content}</div>
                    )}
                </div>
                {/* Timestamp — only on last message in a group */}
                {isGroupEnd && (
                    <p className={`text-[10px] text-console-muted/40 mt-0.5 ${isCurrentUser ? "text-right" : ""}`}>
                        {formatTime(message.createdDate)}
                    </p>
                )}
            </div>
        </div>
    );
}

function TypingIndicator({ typingUsers }: { typingUsers: { email: string; displayName: string }[] }) {
    if (typingUsers.length === 0) return null;

    const names = typingUsers.map((u) => u.displayName);
    const text =
        names.length === 1
            ? `${names[0]} is typing`
            : `${names.join(" and ")} are typing`;

    return (
        <div className="flex items-center gap-2 px-4 py-1.5">
            <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-console-muted/50 animate-pulse" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-console-muted/50 animate-pulse" style={{ animationDelay: "300ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-console-muted/50 animate-pulse" style={{ animationDelay: "600ms" }} />
            </div>
            <span className="text-xs text-console-muted/60">{text}...</span>
        </div>
    );
}

export default function AiAssistant() {
    const { data: session } = useSession();
    const currentUserEmail = session?.user?.email || null;

    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [inputValue, setInputValue] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [optimisticMessages, setOptimisticMessages] = useState<AiMessage[]>([]);
    const [chatSidebarOpen, setChatSidebarOpen] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const conversations = useAiConversations();
    const messages = useAiMessages(activeConversationId);
    const sendMessage = useAiSendMessage();
    const renameConversation = useAiRenameConversation();
    const deleteConversation = useAiDeleteConversation();
    const { typingUsers, sendTyping } = useAiTypingIndicator(activeConversationId, currentUserEmail);
    const { isThinking, senderName: thinkingSender, broadcastThinking, clearThinking } = useAiThinkingIndicator(activeConversationId, currentUserEmail);

    // Combine real + optimistic messages
    const allMessages = useMemo(() => [
        ...(messages.data || []),
        ...optimisticMessages,
    ], [messages.data, optimisticMessages]);

    // Pre-compute message grouping
    const messageGroups = useMemo(() => {
        return allMessages.map((msg, i) => {
            const prevKey = i > 0 ? getMessageSenderKey(allMessages[i - 1], currentUserEmail || undefined) : null;
            const nextKey = i < allMessages.length - 1 ? getMessageSenderKey(allMessages[i + 1], currentUserEmail || undefined) : null;
            const currentKey = getMessageSenderKey(msg, currentUserEmail || undefined);
            return {
                isGroupStart: currentKey !== prevKey,
                isGroupEnd: currentKey !== nextKey,
            };
        });
    }, [allMessages, currentUserEmail]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [allMessages.length]);

    // Focus input when conversation changes
    useEffect(() => {
        inputRef.current?.focus();
    }, [activeConversationId]);

    // Clear active conversation if it gets deleted remotely
    useEffect(() => {
        if (activeConversationId && conversations.data && conversations.data.length > 0) {
            const exists = conversations.data.some((c) => c.id === activeConversationId);
            if (!exists) {
                setActiveConversationId(null);
                setOptimisticMessages([]);
            }
        }
    }, [conversations.data, activeConversationId]);

    const handleSend = async () => {
        const text = inputValue.trim();
        if (!text || sendMessage.isPending) return;

        setInputValue("");
        // Reset textarea height
        if (inputRef.current) {
            inputRef.current.style.height = "auto";
        }

        // Optimistic user message
        const optimisticUser: AiMessage = {
            id: `optimistic-user-${Date.now()}`,
            conversationId: activeConversationId || "",
            role: "user",
            content: text,
            createdDate: new Date().toISOString(),
            senderEmail: currentUserEmail || undefined,
        };
        setOptimisticMessages([optimisticUser]);

        broadcastThinking();

        try {
            const result = await sendMessage.mutateAsync({
                conversationId: activeConversationId || undefined,
                message: text,
            });

            clearThinking();
            // Switch to the conversation (important for new conversations)
            setActiveConversationId(result.conversation.id);
            setOptimisticMessages([]);
        } catch {
            clearThinking();
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

    const handleDeleteConfirm = async () => {
        if (!deleteConfirmId) return;
        const id = deleteConfirmId;
        setDeleteConfirmId(null);
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
                                            {conv.createdByEmail && (
                                                <span>{getDisplayName(conv.createdByEmail)} &middot; </span>
                                            )}
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
                                                setDeleteConfirmId(conv.id);
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
                <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-1.5">
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
                                <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-console-muted/50">
                                    <Users className="h-3.5 w-3.5" />
                                    <span>Conversations are shared with all admins</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {allMessages.map((msg, i) => (
                        <MessageBubble
                            key={msg.id}
                            message={msg}
                            currentUserEmail={currentUserEmail || undefined}
                            isGroupStart={messageGroups[i]?.isGroupStart ?? true}
                            isGroupEnd={messageGroups[i]?.isGroupEnd ?? true}
                        />
                    ))}

                    {/* AI thinking — visible to sender */}
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

                    {/* AI thinking — visible to other users via SignalR */}
                    {isThinking && !sendMessage.isPending && (
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                                <Loader2 className="h-4 w-4 text-purple-400 animate-spin" />
                            </div>
                            <div className="console-surface border border-console rounded-xl px-4 py-3">
                                <div className="flex items-center gap-2 text-sm text-console-muted">
                                    <span>Thinking for {thinkingSender}</span>
                                    <span className="animate-pulse">...</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Typing indicator */}
                <TypingIndicator typingUsers={typingUsers} />

                {/* Input Area */}
                <div className="border-t border-console p-4">
                    <div className="flex items-end gap-3">
                        <textarea
                            ref={inputRef}
                            data-testid="chat-input"
                            value={inputValue}
                            onChange={(e) => {
                                setInputValue(e.target.value);
                                sendTyping();
                            }}
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

            {/* Delete confirmation dialog */}
            <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete conversation</DialogTitle>
                        <DialogDescription>
                            This will permanently delete this shared conversation for all admins. This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-3 sm:gap-0">
                        <button
                            data-testid="delete-cancel-btn"
                            onClick={() => setDeleteConfirmId(null)}
                            className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-console-muted bg-console-surface border border-console rounded-lg hover:text-console hover:bg-console-surface-hover transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            data-testid="delete-confirm-btn"
                            onClick={handleDeleteConfirm}
                            disabled={deleteConversation.isPending}
                            className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                            {deleteConversation.isPending ? "Deleting..." : "Delete"}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

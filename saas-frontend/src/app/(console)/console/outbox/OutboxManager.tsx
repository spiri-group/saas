"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Bot,
  User,
  Loader2,
  Clock,
  Eye,
  Copy,
  XCircle,
  Search,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Code,
  Save,
  FileEdit,
  Trash2,
  Pencil,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import UseSentEmails, { SentEmail } from "./hooks/UseSentEmails";
import UseSendAdHocEmail from "./hooks/UseSendAdHocEmail";
import UseGenerateAdHocEmail from "./hooks/UseGenerateAdHocEmail";
import UsePreviewAdHocEmail from "./hooks/UsePreviewAdHocEmail";
import UseCancelScheduledEmail from "./hooks/UseCancelScheduledEmail";
import UseRescheduleEmail from "./hooks/UseRescheduleEmail";
import UseSaveEmailDraft from "./hooks/UseSaveEmailDraft";
import UseDeleteEmailDraft from "./hooks/UseDeleteEmailDraft";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const COMMON_TIMEZONES = [
  { label: "AEST (Sydney)", value: "Australia/Sydney" },
  { label: "ACST (Adelaide)", value: "Australia/Adelaide" },
  { label: "AWST (Perth)", value: "Australia/Perth" },
  { label: "NZST (Auckland)", value: "Pacific/Auckland" },
  { label: "GMT (London)", value: "Europe/London" },
  { label: "EST (New York)", value: "America/New_York" },
  { label: "PST (Los Angeles)", value: "America/Los_Angeles" },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function formatInTimezone(isoUtc: string, timezone: string): string {
  return new Date(isoUtc).toLocaleString("en-AU", { timeZone: timezone });
}

function validateEmails(emails: string[]): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const email of emails) {
    if (EMAIL_REGEX.test(email)) {
      valid.push(email);
    } else {
      invalid.push(email);
    }
  }
  return { valid, invalid };
}

function getStatusBadge(emailStatus: string) {
  switch (emailStatus) {
    case "DRAFT":
      return <Badge variant="warning" dark>Draft</Badge>;
    case "SENT":
      return <Badge variant="success" dark>Sent</Badge>;
    case "SCHEDULED":
      return <Badge variant="info" dark>Scheduled</Badge>;
    case "FAILED":
      return <Badge variant="danger" dark>Failed</Badge>;
    case "CANCELLED":
      return <Badge variant="secondary" dark>Cancelled</Badge>;
    default:
      return <Badge variant="secondary" dark>{emailStatus}</Badge>;
  }
}

export default function OutboxManager() {
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");

  // Email compose state
  const [recipients, setRecipients] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [editingHtml, setEditingHtml] = useState(false);
  const [htmlEditValue, setHtmlEditValue] = useState("");
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);

  // Schedule state
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleTimezone, setScheduleTimezone] = useState("Australia/Sydney");

  // Confirmation dialog
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [pendingScheduledFor, setPendingScheduledFor] = useState<string | undefined>(undefined);

  // Cancel confirmation
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);

  // Reschedule state
  const [rescheduleEmailId, setRescheduleEmailId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleTimezone, setRescheduleTimezone] = useState("Australia/Sydney");

  // Preview state
  const [previewHtml, setPreviewHtml] = useState("");
  const [visualEditing, setVisualEditing] = useState(false);
  const visualEditorRef = useRef<HTMLDivElement>(null);

  // History state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [viewEmail, setViewEmail] = useState<SentEmail | null>(null);
  const [showHistory, setShowHistory] = useState(true);

  // Mobile tab state
  const [mobileTab, setMobileTab] = useState<"compose" | "preview">("compose");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const composeRef = useRef<HTMLDivElement>(null);

  // Hooks
  const sentEmails = UseSentEmails(debouncedSearch || undefined);
  const sendEmail = UseSendAdHocEmail();
  const generateEmail = UseGenerateAdHocEmail();
  const previewEmail = UsePreviewAdHocEmail();
  const cancelEmail = UseCancelScheduledEmail();
  const rescheduleEmail = UseRescheduleEmail();
  const saveDraft = UseSaveEmailDraft();
  const deleteDraft = UseDeleteEmailDraft();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.length]);

  // Update preview when bodyHtml changes
  useEffect(() => {
    if (bodyHtml) {
      previewEmail.mutate(bodyHtml, {
        onSuccess: (html) => setPreviewHtml(html),
      });
    } else {
      setPreviewHtml("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodyHtml]);

  const parseRecipients = (text: string): string[] =>
    text
      .split(/[,\n]+/)
      .map((e) => e.trim())
      .filter(Boolean);

  const handleReset = useCallback(() => {
    setRecipients("");
    setCc("");
    setBcc("");
    setShowCcBcc(false);
    setSubject("");
    setBodyHtml("");
    setChatMessages([]);
    setPreviewHtml("");
    setEditingHtml(false);
    setHtmlEditValue("");
    setVisualEditing(false);
    setEditingDraftId(null);
  }, []);

  const handleChatSend = async () => {
    const text = chatInput.trim();
    if (!text || generateEmail.isPending) return;

    setChatInput("");

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    };
    const updatedMessages = [...chatMessages, userMessage];
    setChatMessages(updatedMessages);

    try {
      const aiMessages = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const result = await generateEmail.mutateAsync(aiMessages);

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: `Generated email: "${result.subject}"`,
      };
      setChatMessages([...updatedMessages, assistantMessage]);

      // Update compose fields
      setSubject(result.subject);
      setBodyHtml(result.bodyHtml);
      setEditingHtml(false);
      setVisualEditing(false);
    } catch {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "Sorry, something went wrong generating the email. Please try again.",
      };
      setChatMessages([...updatedMessages, errorMessage]);
    }
  };

  const handleChatKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleChatSend();
    }
  };

  const handleToggleHtmlEdit = () => {
    if (editingHtml) {
      // Save edits
      setBodyHtml(htmlEditValue);
      setEditingHtml(false);
    } else {
      // Start editing
      setVisualEditing(false);
      setHtmlEditValue(bodyHtml);
      setEditingHtml(true);
    }
  };

  const handleToggleVisualEdit = () => {
    if (visualEditing) {
      // Save visual edits
      if (visualEditorRef.current) {
        setBodyHtml(visualEditorRef.current.innerHTML);
      }
      setVisualEditing(false);
    } else {
      setEditingHtml(false);
      setVisualEditing(true);
    }
  };

  const handleSendNow = () => {
    // Save any pending visual edits before sending
    if (visualEditing && visualEditorRef.current) {
      setBodyHtml(visualEditorRef.current.innerHTML);
      setVisualEditing(false);
    }
    const recipientList = parseRecipients(recipients);
    if (recipientList.length === 0) {
      toast.error("Please add at least one recipient");
      return;
    }
    const { invalid } = validateEmails(recipientList);
    if (invalid.length > 0) {
      toast.error(`Invalid email address${invalid.length > 1 ? "es" : ""}: ${invalid.join(", ")}`);
      return;
    }
    if (!subject.trim()) {
      toast.error("Please add a subject line");
      return;
    }
    if (!bodyHtml.trim()) {
      toast.error("Please generate or write email content first");
      return;
    }
    setPendingScheduledFor(undefined);
    setShowSendConfirm(true);
  };

  const handleSchedule = () => {
    // Save any pending visual edits before scheduling
    if (visualEditing && visualEditorRef.current) {
      setBodyHtml(visualEditorRef.current.innerHTML);
      setVisualEditing(false);
    }
    const recipientList = parseRecipients(recipients);
    if (recipientList.length === 0) {
      toast.error("Please add at least one recipient");
      return;
    }
    const { invalid } = validateEmails(recipientList);
    if (invalid.length > 0) {
      toast.error(`Invalid email address${invalid.length > 1 ? "es" : ""}: ${invalid.join(", ")}`);
      return;
    }
    if (!subject.trim()) {
      toast.error("Please add a subject line");
      return;
    }
    if (!bodyHtml.trim()) {
      toast.error("Please generate or write email content first");
      return;
    }
    setShowScheduleDialog(true);
  };

  const handleScheduleConfirm = () => {
    if (!scheduleDate || !scheduleTime) {
      toast.error("Please select a date and time");
      return;
    }

    // Build a Date in the selected timezone by computing the offset
    const localDateTimeStr = `${scheduleDate}T${scheduleTime}:00`;

    // Use Intl to compute the offset for the chosen timezone at that local time
    const tempDate = new Date(localDateTimeStr);
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: scheduleTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(tempDate);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || "00";

    // Reconstruct what the same instant looks like in the target timezone
    const nowInTz = new Date(
      `${getPart("year")}-${getPart("month")}-${getPart("day")}T${getPart("hour")}:${getPart("minute")}:${getPart("second")}`
    );
    // Difference between browser-local and timezone interpretation gives us the offset
    const offsetMs = tempDate.getTime() - nowInTz.getTime();

    // The scheduled UTC time = local time string interpreted as browser-local + offset correction
    const scheduledUtc = new Date(new Date(localDateTimeStr).getTime() + offsetMs);

    if (scheduledUtc <= new Date()) {
      toast.error("Scheduled time must be in the future");
      return;
    }

    setPendingScheduledFor(scheduledUtc.toISOString());
    setShowScheduleDialog(false);
    setShowSendConfirm(true);
  };

  const handleConfirmSend = async () => {
    const recipientList = parseRecipients(recipients);
    const ccList = cc ? parseRecipients(cc) : [];
    const bccList = bcc ? parseRecipients(bcc) : [];

    try {
      await sendEmail.mutateAsync({
        recipients: recipientList,
        cc: ccList.length > 0 ? ccList : undefined,
        bcc: bccList.length > 0 ? bccList : undefined,
        subject,
        bodyHtml,
        scheduledFor: pendingScheduledFor,
        draftId: editingDraftId || undefined,
      });

      toast.success(
        pendingScheduledFor ? "Email scheduled successfully" : "Email sent successfully"
      );
      setShowSendConfirm(false);
      handleReset();
    } catch {
      toast.error("Failed to send email");
    }
  };

  const handleClone = (email: SentEmail) => {
    setSubject(email.subject);
    setBodyHtml(email.bodyHtml);
    setRecipients(email.recipients.join(", "));
    setChatMessages([]);
    setEditingHtml(false);
    setEditingDraftId(null);
    toast.success("Email cloned to compose area");
    composeRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSaveDraft = async () => {
    if (!subject.trim() && !bodyHtml.trim() && !recipients.trim()) {
      toast.error("Nothing to save");
      return;
    }
    try {
      const result = await saveDraft.mutateAsync({
        id: editingDraftId || undefined,
        recipients: parseRecipients(recipients),
        cc: cc ? parseRecipients(cc) : [],
        bcc: bcc ? parseRecipients(bcc) : [],
        subject,
        bodyHtml,
      });
      setEditingDraftId(result.id);
      toast.success(editingDraftId ? "Draft updated" : "Draft saved");
    } catch {
      toast.error("Failed to save draft");
    }
  };

  const handleLoadDraft = (email: SentEmail) => {
    setSubject(email.subject);
    setBodyHtml(email.bodyHtml);
    setRecipients(email.recipients.join(", "));
    setCc(email.cc.join(", "));
    setBcc(email.bcc.join(", "));
    setShowCcBcc(email.cc.length > 0 || email.bcc.length > 0);
    setChatMessages([]);
    setEditingHtml(false);
    setEditingDraftId(email.id);
    composeRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleDeleteDraft = async (id: string) => {
    try {
      await deleteDraft.mutateAsync(id);
      if (editingDraftId === id) handleReset();
      toast.success("Draft deleted");
    } catch {
      toast.error("Failed to delete draft");
    }
  };

  const handleCancelConfirm = async () => {
    if (!cancelConfirmId) return;
    try {
      await cancelEmail.mutateAsync(cancelConfirmId);
      toast.success("Scheduled email cancelled");
    } catch {
      toast.error("Failed to cancel email");
    }
    setCancelConfirmId(null);
  };

  const handleOpenReschedule = (email: SentEmail) => {
    // Pre-fill with the current scheduled time
    if (email.scheduledFor) {
      const d = new Date(email.scheduledFor);
      const localDate = d.toLocaleDateString("en-CA", { timeZone: rescheduleTimezone }); // YYYY-MM-DD
      const localTime = d.toLocaleTimeString("en-GB", { timeZone: rescheduleTimezone, hour: "2-digit", minute: "2-digit", hour12: false });
      setRescheduleDate(localDate);
      setRescheduleTime(localTime);
    }
    setRescheduleEmailId(email.id);
  };

  const handleRescheduleConfirm = async () => {
    if (!rescheduleEmailId || !rescheduleDate || !rescheduleTime) {
      toast.error("Please select a date and time");
      return;
    }
    try {
      // Same timezone conversion as handleScheduleConfirm
      const localDateTimeStr = `${rescheduleDate}T${rescheduleTime}:00`;
      const tempDate = new Date(localDateTimeStr);
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: rescheduleTimezone,
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
      });
      const parts = formatter.formatToParts(tempDate);
      const getPart = (type: string) => parts.find((p) => p.type === type)?.value || "00";
      const nowInTz = new Date(
        `${getPart("year")}-${getPart("month")}-${getPart("day")}T${getPart("hour")}:${getPart("minute")}:${getPart("second")}`
      );
      const offsetMs = tempDate.getTime() - nowInTz.getTime();
      const scheduledUtc = new Date(new Date(localDateTimeStr).getTime() + offsetMs);

      if (scheduledUtc <= new Date()) {
        toast.error("Scheduled time must be in the future");
        return;
      }

      await rescheduleEmail.mutateAsync({
        id: rescheduleEmailId,
        scheduledFor: scheduledUtc.toISOString(),
      });
      toast.success("Email rescheduled");
      setRescheduleEmailId(null);
    } catch {
      toast.error("Failed to reschedule email");
    }
  };

  const recipientList = parseRecipients(recipients);
  const ccList = cc ? parseRecipients(cc) : [];
  const bccList = bcc ? parseRecipients(bcc) : [];
  const hasComposeContent = !!(recipients || subject || bodyHtml || chatMessages.length > 0);

  return (
    <div data-testid="outbox-manager" className="h-full flex flex-col">
      {/* Main content area */}
      <div className="flex-1 flex min-h-0">
        {/* Mobile tab switcher */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-slate-900 border-t border-slate-700 flex">
          <button
            data-testid="mobile-tab-compose"
            onClick={() => setMobileTab("compose")}
            className={`flex-1 py-3 text-sm font-medium ${
              mobileTab === "compose"
                ? "text-purple-400 border-b-2 border-purple-400"
                : "text-slate-400"
            }`}
          >
            Compose
          </button>
          <button
            data-testid="mobile-tab-preview"
            onClick={() => setMobileTab("preview")}
            className={`flex-1 py-3 text-sm font-medium ${
              mobileTab === "preview"
                ? "text-purple-400 border-b-2 border-purple-400"
                : "text-slate-400"
            }`}
          >
            Preview
          </button>
        </div>

        {/* Left: AI Chat + Compose */}
        <div
          ref={composeRef}
          className={`flex-1 flex flex-col min-w-0 border-r border-slate-700 ${
            mobileTab !== "compose" ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Recipients + Subject + Reset */}
          <div className="p-4 border-b border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="block text-xs font-medium text-slate-400">To</label>
                {editingDraftId && (
                  <Badge variant="warning" dark>Draft</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {hasComposeContent && (
                  <button
                    data-testid="save-draft-btn"
                    onClick={handleSaveDraft}
                    disabled={saveDraft.isPending}
                    className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                    title="Save as draft"
                  >
                    {saveDraft.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Save className="h-3 w-3" />
                    )}
                    Save Draft
                  </button>
                )}
                {hasComposeContent && (
                  <button
                    data-testid="reset-compose-btn"
                    onClick={handleReset}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                    title="Start new email"
                  >
                    <RotateCcw className="h-3 w-3" />
                    New
                  </button>
                )}
              </div>
            </div>
            <textarea
              data-testid="recipients-input"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="email@example.com (one per line or comma-separated)"
              rows={2}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500 resize-none"
            />

            <button
              data-testid="toggle-cc-bcc"
              onClick={() => setShowCcBcc(!showCcBcc)}
              className="text-xs text-purple-400 hover:text-purple-300"
            >
              {showCcBcc ? "Hide CC/BCC" : "Show CC/BCC"}
            </button>

            {showCcBcc && (
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">CC</label>
                  <input
                    data-testid="cc-input"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    placeholder="CC recipients (comma-separated)"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">BCC</label>
                  <input
                    data-testid="bcc-input"
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                    placeholder="BCC recipients (comma-separated)"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Subject</label>
              <input
                data-testid="subject-input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject (auto-filled by AI)"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {chatMessages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="mx-auto mb-3 h-14 w-14 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                    <Bot className="h-7 w-7 text-purple-400" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-200 mb-1">
                    AI Email Writer
                  </h3>
                  <p className="text-xs text-slate-400 max-w-xs">
                    Describe the email you want to send. AI will generate a professionally
                    formatted email with SpiriVerse branding.
                  </p>
                </div>
              </div>
            )}

            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center ${
                    msg.role === "user" ? "bg-blue-500/20" : "bg-purple-500/20"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User className="h-3.5 w-3.5 text-blue-400" />
                  ) : (
                    <Bot className="h-3.5 w-3.5 text-purple-400" />
                  )}
                </div>
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-blue-600/20 text-slate-200"
                      : "bg-slate-800 border border-slate-700 text-slate-300"
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                </div>
              </div>
            ))}

            {generateEmail.isPending && (
              <div className="flex gap-2.5">
                <div className="flex-shrink-0 h-7 w-7 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Loader2 className="h-3.5 w-3.5 text-purple-400 animate-spin" />
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2">
                  <span className="text-sm text-slate-400">Writing email<span className="animate-pulse">...</span></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat input */}
          <div className="border-t border-slate-700 p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={chatInputRef}
                data-testid="chat-input"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleChatKeyDown}
                placeholder="Describe the email you want to send..."
                rows={1}
                className="flex-1 resize-none bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                style={{ minHeight: "40px", maxHeight: "120px" }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                }}
              />
              <button
                data-testid="chat-send-btn"
                onClick={handleChatSend}
                disabled={!chatInput.trim() || generateEmail.isPending}
                className="flex-shrink-0 h-10 w-10 rounded-xl bg-purple-600 text-white flex items-center justify-center hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {generateEmail.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-1.5 text-[10px] text-slate-500 text-center">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>

        {/* Right: Live Email Preview */}
        <div
          className={`flex-1 flex flex-col min-w-0 ${
            mobileTab !== "preview" ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-slate-300">Email Preview</h3>
              {bodyHtml && (
                <>
                  <button
                    data-testid="toggle-visual-edit"
                    onClick={handleToggleVisualEdit}
                    className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${
                      visualEditing
                        ? "text-purple-300 bg-purple-600/20"
                        : "text-slate-400 hover:text-slate-300 hover:bg-slate-800"
                    }`}
                    title={visualEditing ? "Save edits" : "Edit content visually"}
                  >
                    <Pencil className="h-3 w-3" />
                    {visualEditing ? "Save" : "Edit"}
                  </button>
                  <button
                    data-testid="toggle-html-edit"
                    onClick={handleToggleHtmlEdit}
                    className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${
                      editingHtml
                        ? "text-purple-300 bg-purple-600/20"
                        : "text-slate-400 hover:text-slate-300 hover:bg-slate-800"
                    }`}
                    title={editingHtml ? "Save HTML edits" : "Edit HTML source"}
                  >
                    <Code className="h-3 w-3" />
                    {editingHtml ? "Save" : "HTML"}
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                data-testid="schedule-btn"
                onClick={handleSchedule}
                disabled={!bodyHtml || sendEmail.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Clock className="h-3.5 w-3.5" />
                Schedule
              </button>
              <button
                data-testid="send-now-btn"
                onClick={handleSendNow}
                disabled={!bodyHtml || sendEmail.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {sendEmail.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Send Now
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-slate-950 p-4">
            {editingHtml ? (
              <textarea
                data-testid="html-editor"
                value={htmlEditValue}
                onChange={(e) => setHtmlEditValue(e.target.value)}
                className="w-full h-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-300 font-mono resize-none focus:outline-none focus:border-purple-500"
                spellCheck={false}
              />
            ) : visualEditing ? (
              <div className="h-full flex flex-col">
                <div className="text-xs text-slate-500 mb-2 flex items-center gap-1.5">
                  <Pencil className="h-3 w-3" />
                  Click on any text to edit. Delete or retype as needed.
                </div>
                <div
                  ref={visualEditorRef}
                  data-testid="visual-editor"
                  contentEditable
                  suppressContentEditableWarning
                  dangerouslySetInnerHTML={{ __html: bodyHtml }}
                  className="flex-1 bg-white rounded-lg p-6 text-black overflow-auto focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  style={{ minHeight: "500px" }}
                />
              </div>
            ) : previewHtml ? (
              <iframe
                data-testid="email-preview-iframe"
                srcDoc={previewHtml}
                sandbox="allow-same-origin"
                className="w-full h-full border-0 rounded-lg bg-white"
                title="Email preview"
                style={{ minHeight: "500px" }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                Email preview will appear here after AI generates content
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sent History */}
      <div className="border-t border-slate-700">
        <button
          data-testid="toggle-history"
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800/50 transition-colors"
        >
          <span>Sent History</span>
          {showHistory ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </button>

        {showHistory && (
          <div className="px-4 pb-4">
            <div className="mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <input
                  data-testid="history-search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by subject or recipient..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="overflow-auto max-h-64 rounded-lg border border-slate-700">
              <table className="w-full text-sm table-fixed">
                <thead>
                  <tr className="bg-slate-800/50 text-slate-400 text-xs">
                    <th className="text-left px-3 py-2 font-medium w-[140px]">Date</th>
                    <th className="text-left px-3 py-2 font-medium w-[200px]">To</th>
                    <th className="text-left px-3 py-2 font-medium">Subject</th>
                    <th className="text-left px-3 py-2 font-medium w-[90px]">Status</th>
                    <th className="text-right px-3 py-2 font-medium w-[90px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sentEmails.data?.map((email) => (
                    <tr
                      key={email.id}
                      data-testid={`sent-email-${email.id}`}
                      className="border-t border-slate-700/50 hover:bg-slate-800/30"
                    >
                      <td className="px-3 py-2 text-slate-400 whitespace-nowrap text-xs truncate">
                        {formatDate(email.sentAt || email.createdAt)}
                      </td>
                      <td className="px-3 py-2 text-slate-300 truncate">
                        {email.recipients.join(", ")}
                      </td>
                      <td className="px-3 py-2 text-slate-300 truncate">
                        {email.subject}
                      </td>
                      <td className="px-3 py-2">{getStatusBadge(email.emailStatus)}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          {email.emailStatus === "DRAFT" ? (
                            <>
                              <button
                                data-testid={`edit-draft-${email.id}`}
                                onClick={() => handleLoadDraft(email)}
                                className="p-1 text-slate-400 hover:text-purple-400 transition-colors"
                                title="Edit draft"
                              >
                                <FileEdit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                data-testid={`delete-draft-${email.id}`}
                                onClick={() => handleDeleteDraft(email.id)}
                                disabled={deleteDraft.isPending}
                                className="p-1 text-slate-400 hover:text-red-400 transition-colors disabled:opacity-40"
                                title="Delete draft"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                data-testid={`view-email-${email.id}`}
                                onClick={() => setViewEmail(email)}
                                className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
                                title="View email"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              <button
                                data-testid={`clone-email-${email.id}`}
                                onClick={() => handleClone(email)}
                                className="p-1 text-slate-400 hover:text-purple-400 transition-colors"
                                title="Clone email"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                              {email.emailStatus === "SCHEDULED" && (
                                <>
                                  <button
                                    data-testid={`reschedule-email-${email.id}`}
                                    onClick={() => handleOpenReschedule(email)}
                                    className="p-1 text-slate-400 hover:text-purple-400 transition-colors"
                                    title="Reschedule email"
                                  >
                                    <Clock className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    data-testid={`cancel-email-${email.id}`}
                                    onClick={() => setCancelConfirmId(email.id)}
                                    disabled={cancelEmail.isPending}
                                    className="p-1 text-slate-400 hover:text-red-400 transition-colors disabled:opacity-40"
                                    title="Cancel scheduled email"
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {sentEmails.data?.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-slate-500 text-xs">
                        No emails sent yet
                      </td>
                    </tr>
                  )}

                  {sentEmails.isLoading && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center">
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400 mx-auto" />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Send Confirmation Dialog */}
      <Dialog open={showSendConfirm} onOpenChange={setShowSendConfirm}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-slate-200">
          <DialogHeader>
            <DialogTitle>
              {pendingScheduledFor ? "Schedule Email" : "Send Email"}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {pendingScheduledFor
                ? `This email will be sent at ${formatInTimezone(pendingScheduledFor, scheduleTimezone)} (${COMMON_TIMEZONES.find((t) => t.value === scheduleTimezone)?.label || scheduleTimezone})`
                : "This email will be sent immediately"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 text-sm">
            <div>
              <span className="text-slate-400">To: </span>
              <span className="text-slate-200">
                {recipientList.join(", ")}
                {recipientList.length > 1 && (
                  <span className="text-slate-400 ml-1">({recipientList.length} recipients)</span>
                )}
              </span>
            </div>
            {ccList.length > 0 && (
              <div>
                <span className="text-slate-400">CC: </span>
                <span className="text-slate-200">{ccList.join(", ")}</span>
              </div>
            )}
            {bccList.length > 0 && (
              <div>
                <span className="text-slate-400">BCC: </span>
                <span className="text-slate-200">{bccList.join(", ")}</span>
              </div>
            )}
            <div>
              <span className="text-slate-400">Subject: </span>
              <span className="text-slate-200">{subject}</span>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-2">
            <button
              data-testid="cancel-send-btn"
              onClick={() => setShowSendConfirm(false)}
              className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              data-testid="confirm-send-btn"
              onClick={handleConfirmSend}
              disabled={sendEmail.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-500 disabled:opacity-40 transition-colors flex items-center gap-2"
            >
              {sendEmail.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {pendingScheduledFor ? "Schedule" : "Send"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="sm:max-w-sm bg-slate-900 border-slate-700 text-slate-200">
          <DialogHeader>
            <DialogTitle>Schedule Send</DialogTitle>
            <DialogDescription className="text-slate-400">
              Choose when this email should be sent.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Date</label>
              <input
                data-testid="schedule-date-input"
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Time</label>
              <input
                data-testid="schedule-time-input"
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Timezone</label>
              <select
                data-testid="schedule-timezone-select"
                value={scheduleTimezone}
                onChange={(e) => setScheduleTimezone(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-2">
            <button
              data-testid="cancel-schedule-btn"
              onClick={() => setShowScheduleDialog(false)}
              className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              data-testid="confirm-schedule-btn"
              onClick={handleScheduleConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-500 transition-colors flex items-center gap-2"
            >
              <Clock className="h-3.5 w-3.5" />
              Schedule
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Scheduled Email Confirmation Dialog */}
      <Dialog open={!!cancelConfirmId} onOpenChange={() => setCancelConfirmId(null)}>
        <DialogContent className="sm:max-w-sm bg-slate-900 border-slate-700 text-slate-200">
          <DialogHeader>
            <DialogTitle>Cancel Scheduled Email</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to cancel this scheduled email? This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex gap-2 sm:gap-2">
            <button
              data-testid="cancel-cancel-btn"
              onClick={() => setCancelConfirmId(null)}
              className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors"
            >
              Keep Scheduled
            </button>
            <button
              data-testid="confirm-cancel-btn"
              onClick={handleCancelConfirm}
              disabled={cancelEmail.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-500 disabled:opacity-40 transition-colors flex items-center gap-2"
            >
              {cancelEmail.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Cancel Email
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={!!rescheduleEmailId} onOpenChange={(open) => !open && setRescheduleEmailId(null)}>
        <DialogContent className="sm:max-w-sm bg-slate-900 border-slate-700 text-slate-200">
          <DialogHeader>
            <DialogTitle>Reschedule Email</DialogTitle>
            <DialogDescription className="text-slate-400">
              Choose a new date and time for this email.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Date</label>
              <input
                data-testid="reschedule-date-input"
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Time</label>
              <input
                data-testid="reschedule-time-input"
                type="time"
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Timezone</label>
              <select
                data-testid="reschedule-timezone-select"
                value={rescheduleTimezone}
                onChange={(e) => setRescheduleTimezone(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-2">
            <button
              data-testid="cancel-reschedule-btn"
              onClick={() => setRescheduleEmailId(null)}
              className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              data-testid="confirm-reschedule-btn"
              onClick={handleRescheduleConfirm}
              disabled={rescheduleEmail.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-500 disabled:opacity-40 transition-colors flex items-center gap-2"
            >
              {rescheduleEmail.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <Clock className="h-3.5 w-3.5" />
              Reschedule
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Email Dialog */}
      <Dialog open={!!viewEmail} onOpenChange={() => setViewEmail(null)}>
        <DialogContent className="sm:max-w-2xl max-w-[95vw] bg-slate-900 border-slate-700 text-slate-200 max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{viewEmail?.subject}</DialogTitle>
            <DialogDescription className="text-slate-400">
              Sent to {viewEmail?.recipients.join(", ")} on{" "}
              {viewEmail?.sentAt ? formatDate(viewEmail.sentAt) : formatDate(viewEmail?.createdAt || "")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            {viewEmail?.htmlSnapshot && (
              <iframe
                data-testid="view-email-iframe"
                srcDoc={viewEmail.htmlSnapshot}
                sandbox="allow-same-origin"
                className="w-full border-0 rounded-lg bg-white"
                title="Email view"
                style={{ minHeight: "400px" }}
              />
            )}
          </div>

          <DialogFooter>
            <button
              data-testid="close-view-btn"
              onClick={() => setViewEmail(null)}
              className="px-5 py-2.5 text-sm font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors"
            >
              Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

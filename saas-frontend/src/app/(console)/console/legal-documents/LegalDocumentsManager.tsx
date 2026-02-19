"use client";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  FileText,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  Check,
  X,
  Clock,
  Save,
  ChevronLeft,
  ChevronRight,
  Keyboard,
  History,
  Info,
  Settings2,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import UseLegalDocuments from "./hooks/UseLegalDocuments";
import UseUpsertLegalDocument from "./hooks/UseUpsertLegalDocument";
import UseDeleteLegalDocument from "./hooks/UseDeleteLegalDocument";
import UseLegalDocumentVersions from "./hooks/UseLegalDocumentVersions";
import UseRestoreLegalDocumentVersion from "./hooks/UseRestoreLegalDocumentVersion";
import {
  LegalDocument,
  LegalDocumentInput,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_INFO,
  MARKET_LABELS,
  MARKET_OPTIONS,
} from "./types";
import { markdownToHtml } from "@/utils/markdownToHtml";
import { resolvePlaceholders } from "@/utils/resolvePlaceholders";
import UseLegalPlaceholders from "@/hooks/UseLegalPlaceholders";
import UseUpsertLegalPlaceholders from "./hooks/UseUpsertLegalPlaceholders";
import PlaceholderEditor from "./PlaceholderEditor";
import HistoryTab from "./HistoryTab";

type ViewMode = "list" | "edit";
type EditorTab = "preview" | "edit" | "history" | "supplements";

export default function LegalDocumentsManager() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [editorTab, setEditorTab] = useState<EditorTab>("edit");
  const [selectedDocument, setSelectedDocument] =
    useState<LegalDocument | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Editor state
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editDocumentType, setEditDocumentType] = useState("terms-of-service");
  const [editIsPublished, setEditIsPublished] = useState(true);
  const [editEffectiveDate, setEditEffectiveDate] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editPlaceholders, setEditPlaceholders] = useState<Record<string, string>>({});
  const [showPlaceholderDialog, setShowPlaceholderDialog] = useState(false);

  // Dialog state
  const [showGlobalPlaceholders, setShowGlobalPlaceholders] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);
  const [showChangeSummaryDialog, setShowChangeSummaryDialog] = useState(false);
  const [changeSummary, setChangeSummary] = useState("");
  const [documentToDelete, setDocumentToDelete] =
    useState<LegalDocument | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const pendingAction = useRef<(() => void) | null>(null);

  const { data: globalPlaceholders } = UseLegalPlaceholders();
  const upsertPlaceholdersMutation = UseUpsertLegalPlaceholders();
  const [editGlobalPlaceholders, setEditGlobalPlaceholders] = useState<Record<string, string>>({});
  const [globalPlaceholdersInitialized, setGlobalPlaceholdersInitialized] = useState(false);

  // Sync global placeholders from server into local edit state
  if (globalPlaceholders && !globalPlaceholdersInitialized) {
    setEditGlobalPlaceholders(globalPlaceholders);
    setGlobalPlaceholdersInitialized(true);
  }

  const { data: documents, isLoading, error } = UseLegalDocuments();
  const upsertMutation = UseUpsertLegalDocument();
  const deleteMutation = UseDeleteLegalDocument();
  const restoreMutation = UseRestoreLegalDocumentVersion();
  const { data: versions, isLoading: versionsLoading } =
    UseLegalDocumentVersions(selectedDocument?.id);

  // Track seen document versions in localStorage
  const SEEN_KEY = "legal-docs-seen-versions";
  const [seenVersions, setSeenVersions] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(localStorage.getItem(SEEN_KEY) || "{}");
    } catch {
      return {};
    }
  });
  const seenInitialized = useRef(false);

  // On first load with documents, seed localStorage if empty (so nothing highlights on first visit)
  if (documents && !seenInitialized.current) {
    seenInitialized.current = true;
    if (Object.keys(seenVersions).length === 0) {
      const initial: Record<string, number> = {};
      for (const doc of documents) {
        initial[doc.id] = doc.version;
      }
      localStorage.setItem(SEEN_KEY, JSON.stringify(initial));
      setSeenVersions(initial);
    }
  }

  const markDocSeen = (docId: string, version: number) => {
    setSeenVersions((prev) => {
      const next = { ...prev, [docId]: version };
      localStorage.setItem(SEEN_KEY, JSON.stringify(next));
      return next;
    });
  };

  const isDocUpdated = (docId: string, version: number) => {
    return seenVersions[docId] !== undefined && version > seenVersions[docId];
  };

  // Filter to base documents only (no supplements) + search
  const filteredDocuments = useMemo(() => {
    if (!documents) return documents;
    let filtered = documents.filter((doc) => !doc.parentDocumentId);
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (doc) =>
          doc.title.toLowerCase().includes(query) ||
          doc.documentType.toLowerCase().includes(query) ||
          doc.id.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [documents, searchQuery]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      // Ctrl+S / Cmd+S works even when focused on inputs
      if (
        event.key.toLowerCase() === "s" &&
        (event.ctrlKey || event.metaKey)
      ) {
        event.preventDefault();
        if (viewMode === "edit" && hasUnsavedChanges) {
          handleSaveClick();
        }
        return;
      }

      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (isInput) return;

      switch (event.key.toLowerCase()) {
        case "n":
          event.preventDefault();
          setShowCreateDialog(true);
          break;
        case "escape":
          event.preventDefault();
          if (viewMode === "edit") {
            guardUnsavedChanges(handleBackToList);
          }
          break;
        case "h":
          if (viewMode === "edit") {
            event.preventDefault();
            setEditorTab("history");
          }
          break;
        case "?":
          event.preventDefault();
          setShowShortcutsDialog(true);
          break;
      }
    },
    [viewMode, hasUnsavedChanges]
  );

  const handleEditDocument = (doc: LegalDocument, forceTab?: EditorTab) => {
    markDocSeen(doc.id, doc.version);
    setSelectedDocument(doc);
    setEditTitle(doc.title);
    setEditContent(doc.content);
    setEditDocumentType(doc.documentType);
    setEditIsPublished(doc.isPublished);
    setEditEffectiveDate(doc.effectiveDate?.split("T")[0] || "");
    setEditPlaceholders(doc.placeholders || {});
    setHasUnsavedChanges(false);
    setEditorTab(forceTab ?? (doc.isPublished ? "preview" : "edit"));
    setViewMode("edit");
  };

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedDocument(null);
    setHasUnsavedChanges(false);
    setShowPlaceholderDialog(false);
  };

  const guardUnsavedChanges = (action: () => void) => {
    if (hasUnsavedChanges) {
      pendingAction.current = action;
      setShowUnsavedDialog(true);
    } else {
      action();
    }
  };

  const handleDiscardChanges = () => {
    setShowUnsavedDialog(false);
    setHasUnsavedChanges(false);
    if (pendingAction.current) {
      pendingAction.current();
      pendingAction.current = null;
    }
  };

  const handleSaveClick = () => {
    if (!selectedDocument) return;
    setChangeSummary("");
    setShowChangeSummaryDialog(true);
  };

  const handleSaveWithSummary = async () => {
    if (!selectedDocument || !changeSummary.trim()) return;

    const input: LegalDocumentInput = {
      id: selectedDocument.id,
      documentType: editDocumentType,
      title: editTitle,
      content: editContent,
      market: selectedDocument.market,
      isPublished: editIsPublished,
      effectiveDate: editEffectiveDate
        ? new Date(editEffectiveDate).toISOString()
        : undefined,
      changeSummary: changeSummary.trim(),
      placeholders: editPlaceholders,
      parentDocumentId: selectedDocument.parentDocumentId,
      supplementOrder: selectedDocument.supplementOrder,
    };

    try {
      const result = await upsertMutation.mutateAsync(input);
      setSelectedDocument(result);
      setHasUnsavedChanges(false);
      setShowChangeSummaryDialog(false);
      setChangeSummary("");
    } catch {
      // Error handled by mutation
    }
  };

  const handleCreateDocument = async (formData: {
    id: string;
    documentType: string;
    title: string;
    market?: string;
    parentDocumentId?: string;
  }) => {
    const input: LegalDocumentInput = {
      id: formData.id,
      documentType: formData.documentType,
      title: formData.title,
      content: `# ${formData.title}\n\n**Effective Date:** [EFFECTIVE_DATE]\n\nContent goes here...`,
      market: formData.market || "global",
      isPublished: false,
      changeSummary: "Initial document",
      parentDocumentId: formData.parentDocumentId,
    };

    try {
      const result = await upsertMutation.mutateAsync(input);
      setShowCreateDialog(false);
      handleEditDocument(result);
    } catch {
      // Error handled by mutation
    }
  };

  const handleDeleteDocument = async () => {
    if (!documentToDelete) return;
    try {
      await deleteMutation.mutateAsync(documentToDelete.id);
      setShowDeleteDialog(false);
      setDocumentToDelete(null);
      if (selectedDocument?.id === documentToDelete.id) {
        handleBackToList();
      }
    } catch {
      // Error handled by mutation
    }
  };

  const confirmDelete = (doc: LegalDocument) => {
    setDocumentToDelete(doc);
    setShowDeleteDialog(true);
  };

  const handleRestoreVersion = async (version: { id: string }) => {
    if (!selectedDocument) return;
    try {
      const result = await restoreMutation.mutateAsync({
        documentId: selectedDocument.id,
        versionId: version.id,
      });
      setSelectedDocument(result);
      setHasUnsavedChanges(false);
      handleEditDocument(result);
    } catch {
      // Error handled by mutation
    }
  };

  // Render list view
  if (viewMode === "list") {
    return (
      <div
        className="h-full flex flex-col overflow-hidden"
        onKeyDown={handleKeyDown}
        tabIndex={0}
        data-testid="legal-documents-manager"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-console">
          <div className="flex items-center space-x-3">
            <FileText className="h-5 w-5 text-console-primary" />
            <div>
              <h2 className="text-lg font-semibold text-console">
                Legal Documents
              </h2>
              <p className="text-xs text-console-muted">
                {filteredDocuments?.length || 0} document
                {filteredDocuments?.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowGlobalPlaceholders(true)}
              className="p-2 text-console-muted hover:text-console hover:bg-console-surface-hover rounded-lg console-interactive"
              title="Global placeholders"
              data-testid="global-placeholders-btn"
            >
              <Settings2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowShortcutsDialog(true)}
              className="p-2 text-console-muted hover:text-console hover:bg-console-surface-hover rounded-lg console-interactive"
              title="Keyboard shortcuts (?)"
              data-testid="shortcuts-btn"
            >
              <Keyboard className="h-4 w-4" />
            </button>
            <Button
              onClick={() => setShowCreateDialog(true)}
              size="sm"
              className="bg-console-primary hover:bg-console-primary/90"
              data-testid="create-document-btn"
            >
              <Plus className="h-4 w-4 mr-1" />
              New Document
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-console">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-console-muted" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-console-surface border-console text-console text-sm"
              data-testid="search-input"
            />
          </div>
        </div>

        {/* Document list */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-console-spin rounded-full h-6 w-6 border-2 border-console-primary border-t-transparent"></div>
              <span className="ml-3 text-console-muted text-sm">
                Loading documents...
              </span>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-red-400 text-sm">Failed to load documents</p>
            </div>
          )}

          {!isLoading && !error && filteredDocuments?.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-console-muted mx-auto mb-4" />
              <p className="text-console-muted text-sm">
                {searchQuery
                  ? "No documents match your search"
                  : "No legal documents found"}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-4">
            {filteredDocuments?.map((doc) => {
              const docTypeInfo = DOCUMENT_TYPE_INFO[doc.documentType];
              const supplementCount = documents?.filter(
                (d) => d.parentDocumentId === doc.id
              ).length || 0;
              const hasUpdate = isDocUpdated(doc.id, doc.version);
              return (
                <Card
                  key={doc.id}
                  className={`group console-surface border-console hover:border-console-primary/30 transition-colors cursor-pointer w-[280px] flex-shrink-0 ${hasUpdate ? "ring-1 ring-blue-500/40" : ""}`}
                  data-testid={`document-card-${doc.id}`}
                  onClick={() => handleEditDocument(doc)}
                >
                  <CardContent className="p-5 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={doc.isPublished ? "default" : "secondary"}
                          className={`text-xs ${
                            doc.isPublished
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                          }`}
                        >
                          {doc.isPublished ? "Published" : "Draft"}
                        </Badge>
                        {hasUpdate && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-blue-500/15 text-blue-400 border-blue-500/30"
                            data-testid={`updated-badge-${doc.id}`}
                          >
                            Updated
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditDocument(doc, "preview");
                          }}
                          className="p-1 text-console-muted hover:text-console hover:bg-console-surface-hover rounded-md transition-colors"
                          title="Preview"
                          data-testid={`preview-btn-${doc.id}`}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmDelete(doc);
                          }}
                          className="p-1 text-console-muted hover:text-red-400 hover:bg-console-surface-hover rounded-md transition-colors"
                          title="Delete"
                          data-testid={`delete-btn-${doc.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <h3 className="text-base font-semibold text-console mb-1">
                      {doc.title}
                    </h3>
                    {docTypeInfo && (
                      <p className="text-sm text-console-muted mb-3 line-clamp-2">
                        {docTypeInfo.purpose}
                      </p>
                    )}
                    <div className="mt-auto flex items-center flex-wrap gap-2">
                      {supplementCount > 0 && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/30"
                          data-testid={`supplement-count-${doc.id}`}
                        >
                          {supplementCount} supplement{supplementCount !== 1 ? "s" : ""}
                        </Badge>
                      )}
                      {docTypeInfo && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-console-primary/10 text-console-primary border-console-primary/20"
                        >
                          {docTypeInfo.usedIn}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-console-muted mt-3 pt-3 border-t border-console">
                      <span>v{doc.version}</span>
                      <span className="text-console-muted/40">·</span>
                      <span>{new Date(doc.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Create Dialog */}
        <CreateDocumentDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSubmit={handleCreateDocument}
          isPending={upsertMutation.isPending}
          existingIds={documents?.map((d) => d.id) || []}
          existingDocuments={documents || []}
        />

        {/* Delete Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="sm:max-w-md console-surface border-console">
            <DialogHeader>
              <DialogTitle className="text-console">
                Delete Document
              </DialogTitle>
              <DialogDescription className="text-console-muted">
                Are you sure you want to delete &quot;
                {documentToDelete?.title}&quot;? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                className="border-console text-console"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteDocument}
                disabled={deleteMutation.isPending}
                data-testid="confirm-delete-btn"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Shortcuts Dialog */}
        <Dialog
          open={showShortcutsDialog}
          onOpenChange={setShowShortcutsDialog}
        >
          <DialogContent className="sm:max-w-md console-surface border-console">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2 text-console">
                <Keyboard className="h-5 w-5 text-console-primary" />
                <span>Keyboard Shortcuts</span>
              </DialogTitle>
              <DialogDescription className="text-console-muted">
                Shortcuts don&apos;t work when typing in text fields.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              {[
                { key: "N", desc: "New document" },
                { key: "Ctrl+S", desc: "Save (in editor)" },
                { key: "H", desc: "History tab (in editor)" },
                { key: "Esc", desc: "Back to list / close" },
                { key: "?", desc: "Show shortcuts" },
              ].map(({ key, desc }) => (
                <div
                  key={key}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-console-muted">{desc}</span>
                  <kbd className="px-2 py-1 bg-console-surface border border-console rounded text-console text-xs font-mono">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Global Placeholders Dialog */}
        <Dialog
          open={showGlobalPlaceholders}
          onOpenChange={setShowGlobalPlaceholders}
        >
          <DialogContent className="sm:max-w-xl console-surface border-console">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2 text-console">
                <Settings2 className="h-5 w-5 text-console-primary" />
                <span>Global Placeholders</span>
              </DialogTitle>
              <DialogDescription className="text-console-muted">
                These placeholders are available in all legal documents. Use <code className="px-1 py-0.5 bg-console-surface rounded text-[11px]">[KEY]</code> in document content.
              </DialogDescription>
            </DialogHeader>
            <PlaceholderEditor
              placeholders={editGlobalPlaceholders}
              onChange={setEditGlobalPlaceholders}
              onSave={() => upsertPlaceholdersMutation.mutate(editGlobalPlaceholders)}
              isSaving={upsertPlaceholdersMutation.isPending}
              label="Global Placeholders"
              description="Available in all documents. Use [KEY] in content."
              testIdPrefix="global-placeholders"
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Edit mode
  if (viewMode === "edit" && selectedDocument) {
    const docTypeInfo = DOCUMENT_TYPE_INFO[editDocumentType];

    return (
      <div
        className="h-full flex flex-col overflow-hidden"
        onKeyDown={handleKeyDown}
        tabIndex={0}
        data-testid="document-editor"
      >
        {/* Editor header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-console">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                if (selectedDocument.parentDocumentId) {
                  // Navigate back to parent's Supplements tab
                  const parentDoc = documents?.find(
                    (d) => d.id === selectedDocument.parentDocumentId
                  );
                  if (parentDoc) {
                    guardUnsavedChanges(() => {
                      handleEditDocument(parentDoc, "supplements");
                    });
                    return;
                  }
                }
                guardUnsavedChanges(handleBackToList);
              }}
              className="p-1.5 text-console-muted hover:text-console hover:bg-console-surface-hover rounded-md transition-colors"
              data-testid="back-to-list-btn"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              {selectedDocument.parentDocumentId ? (
                <div className="flex items-center space-x-1.5 mb-0.5" data-testid="supplement-breadcrumb">
                  <button
                    onClick={() => {
                      const parentDoc = documents?.find(
                        (d) => d.id === selectedDocument.parentDocumentId
                      );
                      if (parentDoc) {
                        guardUnsavedChanges(() => {
                          handleEditDocument(parentDoc, "supplements");
                        });
                      }
                    }}
                    className="text-xs text-console-primary hover:underline"
                  >
                    {documents?.find((d) => d.id === selectedDocument.parentDocumentId)?.title || "Parent Document"}
                  </button>
                  <ChevronRight className="h-3 w-3 text-console-muted" />
                  <span className="text-xs text-console-muted">
                    {MARKET_LABELS[selectedDocument.market] || selectedDocument.market} Supplement
                  </span>
                </div>
              ) : null}
              <h2 className="text-sm font-semibold text-console">
                {editTitle || "Untitled"}
              </h2>
              <p className="text-xs text-console-muted">
                v{selectedDocument.version}
                {hasUnsavedChanges && (
                  <span className="text-amber-400 ml-2">
                    (unsaved changes)
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Tabs
              value={editorTab}
              onValueChange={(v) => setEditorTab(v as EditorTab)}
            >
              <TabsList data-testid="editor-tabs">
                <TabsTrigger value="preview" data-testid="preview-tab">
                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                  Preview
                </TabsTrigger>
                <TabsTrigger value="edit" data-testid="edit-tab">
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </TabsTrigger>
                <TabsTrigger value="history" data-testid="history-tab">
                  <History className="h-3.5 w-3.5 mr-1.5" />
                  History
                </TabsTrigger>
                {!selectedDocument.parentDocumentId && (
                  <TabsTrigger value="supplements" data-testid="supplements-tab">
                    <Globe className="h-3.5 w-3.5 mr-1.5" />
                    Supplements
                  </TabsTrigger>
                )}
              </TabsList>
            </Tabs>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowPlaceholderDialog(true)}
                className="p-2 text-console-muted hover:text-console hover:bg-console-surface-hover rounded-lg transition-colors"
                title="Document placeholders"
                data-testid="placeholder-settings-btn"
              >
                <Settings2 className="h-4 w-4" />
              </button>
              <Button
                size="sm"
                onClick={handleSaveClick}
                disabled={upsertMutation.isPending || !hasUnsavedChanges}
                className="bg-console-primary hover:bg-console-primary/90"
                data-testid="save-btn"
              >
                <Save className="h-4 w-4 mr-1" />
                {upsertMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>

        {editorTab === "edit" && (
          <>
            {/* Metadata bar */}
            <div className="flex items-center space-x-4 px-6 py-3 border-b border-console bg-console-surface/50">
              <div className="flex items-center space-x-2">
                <label className="text-xs text-console-muted">Title:</label>
                <Input
                  value={editTitle}
                  onChange={(e) => {
                    setEditTitle(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="h-8 w-64 bg-console-surface border-console text-console text-sm"
                  data-testid="edit-title-input"
                />
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-xs text-console-muted">
                  Effective:
                </label>
                <Input
                  type="date"
                  value={editEffectiveDate}
                  onChange={(e) => {
                    setEditEffectiveDate(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="h-8 w-40 bg-console-surface border-console text-console text-sm"
                  data-testid="edit-effective-date-input"
                />
              </div>
              <button
                onClick={() => {
                  setEditIsPublished(!editIsPublished);
                  setHasUnsavedChanges(true);
                }}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  editIsPublished
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                }`}
                data-testid="toggle-published-btn"
              >
                {editIsPublished ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <X className="h-3 w-3" />
                )}
                <span>{editIsPublished ? "Published" : "Draft"}</span>
              </button>
            </div>

            {/* Document info bar */}
            {docTypeInfo && (
              <div className="flex items-center space-x-3 px-6 py-2.5 border-b border-console bg-console-surface/30">
                <Info className="h-4 w-4 text-console-primary/60 flex-shrink-0" />
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-console-primary/10 text-console-primary">
                  {docTypeInfo.usedIn}
                </span>
                <span className="text-xs text-console-muted">
                  {docTypeInfo.purpose}
                </span>
                {docTypeInfo.marketNotes && (
                  <>
                    <span className="w-px h-3 bg-console-muted/50 inline-block" />
                    <span className="text-[10px] text-console-muted/60">
                      {docTypeInfo.marketNotes}
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Document Placeholders Dialog */}
            <Dialog
              open={showPlaceholderDialog}
              onOpenChange={setShowPlaceholderDialog}
            >
              <DialogContent className="sm:max-w-xl console-surface border-console">
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-2 text-console">
                    <Settings2 className="h-5 w-5 text-console-primary" />
                    <span>Document Placeholders</span>
                  </DialogTitle>
                  <DialogDescription className="text-console-muted">
                    Placeholders specific to this document. Overrides globals with the same key. Use <code className="px-1 py-0.5 bg-console-surface rounded text-[11px]">[KEY]</code> in content.
                  </DialogDescription>
                </DialogHeader>
                <PlaceholderEditor
                  placeholders={editPlaceholders}
                  onChange={(p) => {
                    setEditPlaceholders(p);
                    setHasUnsavedChanges(true);
                  }}
                  label="Document Placeholders"
                  description="Specific to this document. Overrides globals with the same key."
                  testIdPrefix="doc-placeholders"
                />
              </DialogContent>
            </Dialog>

            {/* Markdown editor */}
            <div className="flex-1 min-h-0 p-6">
              <Textarea
                value={editContent}
                onChange={(e) => {
                  setEditContent(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="h-full w-full bg-console-surface border-console text-console text-sm font-mono resize-none"
                placeholder="Write your legal document content in Markdown..."
                data-testid="edit-content-textarea"
              />
            </div>
          </>
        )}

        {editorTab === "preview" && (
          <PreviewWithToc
            editContent={editContent}
            globalPlaceholders={globalPlaceholders || {}}
            editPlaceholders={editPlaceholders}
            selectedDocument={selectedDocument}
            documents={documents}
            onEditSupplement={(supplement) => handleEditDocument(supplement, "edit")}
          />
        )}

        {editorTab === "history" && (
          <HistoryTab
            document={selectedDocument}
            versions={versions}
            versionsLoading={versionsLoading}
            globalPlaceholders={globalPlaceholders || {}}
            editPlaceholders={editPlaceholders}
            editContent={editContent}
            onRestore={handleRestoreVersion}
            isRestoring={restoreMutation.isPending}
          />
        )}

        {editorTab === "supplements" && !selectedDocument.parentDocumentId && (
          <div className="flex-1 overflow-y-auto p-6" data-testid="supplements-tab-content">
            {(() => {
              const supplements = documents?.filter(
                (d) => d.parentDocumentId === selectedDocument.id
              ) || [];
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-console">Country Supplements</h3>
                      <p className="text-xs text-console-muted mt-0.5">
                        Manage country-specific additions. Preview tab shows all supplements inline.
                      </p>
                    </div>
                    <Button
                      onClick={() => setShowCreateDialog(true)}
                      size="sm"
                      className="bg-console-primary hover:bg-console-primary/90"
                      data-testid="add-supplement-btn"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Supplement
                    </Button>
                  </div>
                  {supplements.length === 0 ? (
                    <div className="text-center py-8">
                      <Globe className="h-10 w-10 text-console-muted mx-auto mb-3" />
                      <p className="text-sm text-console-muted">
                        No country supplements yet
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {supplements.map((supplement) => (
                        <div
                          key={supplement.id}
                          className="flex items-center justify-between px-4 py-3 rounded-lg border border-console hover:border-console-primary/30 transition-colors"
                          data-testid={`supplement-card-${supplement.id}`}
                        >
                          <div className="flex items-center space-x-3">
                            <Badge
                              variant="outline"
                              className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30"
                            >
                              {MARKET_LABELS[supplement.market] || supplement.market}
                            </Badge>
                            <Badge
                              variant={supplement.isPublished ? "default" : "secondary"}
                              className={`text-xs ${
                                supplement.isPublished
                                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                  : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                              }`}
                            >
                              {supplement.isPublished ? "Published" : "Draft"}
                            </Badge>
                            <span className="text-xs text-console-muted">
                              v{supplement.version} · {new Date(supplement.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleEditDocument(supplement, "edit")}
                              className="px-2.5 py-1 text-xs text-console-primary hover:bg-console-surface-hover rounded-md transition-colors"
                              data-testid={`edit-supplement-btn-${supplement.id}`}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => confirmDelete(supplement)}
                              className="p-1 text-console-muted hover:text-red-400 hover:bg-console-surface-hover rounded-md transition-colors"
                              data-testid={`delete-supplement-btn-${supplement.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Change Summary Dialog */}
        <Dialog
          open={showChangeSummaryDialog}
          onOpenChange={setShowChangeSummaryDialog}
        >
          <DialogContent className="sm:max-w-lg console-surface border-console">
            <DialogHeader>
              <DialogTitle className="text-console">
                Describe Your Changes
              </DialogTitle>
              <DialogDescription className="text-console-muted">
                Provide a brief summary of what changed and why. This will be
                recorded in the version history.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Textarea
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
                placeholder="e.g., Updated wording in section 3, Added refund timeframe for AU customers..."
                className="bg-console-surface border-console text-console text-sm min-h-[100px]"
                autoFocus
                data-testid="change-summary-input"
              />
              {selectedDocument.changeSummary && (
                <p className="text-xs text-console-muted">
                  Previous change: {selectedDocument.changeSummary}
                </p>
              )}
            </div>
            <DialogFooter className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowChangeSummaryDialog(false)}
                className="border-console text-console"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveWithSummary}
                disabled={
                  upsertMutation.isPending || !changeSummary.trim()
                }
                className="bg-console-primary hover:bg-console-primary/90"
                data-testid="confirm-save-btn"
              >
                {upsertMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Unsaved changes guard dialog */}
        <Dialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
          <DialogContent className="sm:max-w-md console-surface border-console">
            <DialogHeader>
              <DialogTitle className="text-console">
                Unsaved Changes
              </DialogTitle>
              <DialogDescription className="text-console-muted">
                You have unsaved changes. Do you want to discard them?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowUnsavedDialog(false);
                  pendingAction.current = null;
                }}
                className="border-console text-console"
              >
                Keep Editing
              </Button>
              <Button
                variant="destructive"
                onClick={handleDiscardChanges}
                data-testid="discard-changes-btn"
              >
                Discard Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return null;
}

// Preview with table of contents sidebar and reading progress
function PreviewWithToc({
  editContent,
  globalPlaceholders,
  editPlaceholders,
  selectedDocument,
  documents,
  onEditSupplement,
}: {
  editContent: string;
  globalPlaceholders: Record<string, string>;
  editPlaceholders: Record<string, string>;
  selectedDocument: LegalDocument;
  documents: LegalDocument[] | undefined;
  onEditSupplement: (doc: LegalDocument) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);

  // Parse headings from markdown
  const headings = useMemo(() => {
    const result: { level: number; text: string; id: string }[] = [];
    for (const line of editContent.split("\n")) {
      const match = line.match(/^(#{1,3})\s+(.+)/);
      if (!match) continue;
      const level = match[1].length;
      const text = match[2]
        .replace(/\*\*/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .trim();
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      result.push({ level, text, id });
    }

    // Add supplement sections
    if (!selectedDocument.parentDocumentId) {
      const supplements =
        documents?.filter(
          (d) => d.parentDocumentId === selectedDocument.id && d.content
        ) || [];
      for (const s of supplements) {
        const label = MARKET_LABELS[s.market] || s.market;
        result.push({
          level: 1,
          text: `${label} Supplement`,
          id: `supplement-${s.id}`,
        });
      }
    }

    return result;
  }, [editContent, selectedDocument, documents]);

  // Add IDs to rendered HTML headings for TOC navigation
  const renderedHtml = useMemo(() => {
    const resolved = resolvePlaceholders(
      editContent,
      globalPlaceholders,
      editPlaceholders
    );
    let html = markdownToHtml(resolved);
    html = html.replace(
      /<(h[1-3])>([\s\S]*?)<\/h[1-3]>/g,
      (_match, tag, content) => {
        const text = content.replace(/<[^>]+>/g, "");
        const id = text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        return `<${tag} id="${id}">${content}</${tag}>`;
      }
    );
    return html;
  }, [editContent, globalPlaceholders, editPlaceholders]);

  // Scroll tracking: progress bar + active heading
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const maxScroll = scrollHeight - clientHeight;
      setScrollProgress(maxScroll > 0 ? scrollTop / maxScroll : 0);

      // Find active heading
      const headingEls = el.querySelectorAll("h1[id], h2[id], h3[id]");
      let active: string | null = null;
      for (const heading of headingEls) {
        const rect = heading.getBoundingClientRect();
        const containerRect = el.getBoundingClientRect();
        if (rect.top - containerRect.top <= 80) {
          active = heading.id;
        }
      }
      setActiveHeadingId(active);
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => el.removeEventListener("scroll", handleScroll);
  }, [renderedHtml]);

  const scrollToHeading = (id: string) => {
    const el = scrollRef.current?.querySelector(`#${CSS.escape(id)}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const supplements = !selectedDocument.parentDocumentId
    ? documents?.filter(
        (d) => d.parentDocumentId === selectedDocument.id && d.content
      ) || []
    : [];

  const wordCount = editContent.split(/\s+/).length;
  const readMins = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="flex-1 flex flex-col min-h-0" data-testid="editor-preview-content">
      {/* Progress bar */}
      <div className="h-0.5 bg-console-surface flex-shrink-0">
        <div
          className="h-full bg-console-primary transition-all duration-150"
          style={{ width: `${Math.round(scrollProgress * 100)}%` }}
        />
      </div>

      <div className="flex-1 flex min-h-0">
        {/* TOC sidebar */}
        {headings.length > 0 && (
          <div className="w-56 flex-shrink-0 border-r border-console overflow-y-auto p-4" data-testid="preview-toc">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-medium text-console-muted uppercase tracking-wider">
                Contents
              </span>
              <span className="text-[10px] text-console-muted">
                ~{readMins} min read
              </span>
            </div>
            <nav className="space-y-0.5">
              {(() => {
                const activeIdx = headings.findIndex(
                  (x) => x.id === activeHeadingId
                );
                return headings.map((h, i) => {
                  const isActive = activeHeadingId === h.id;
                  const isRead = activeIdx >= 0 && i < activeIdx;
                  return (
                    <button
                      key={`${h.id}-${i}`}
                      onClick={() => scrollToHeading(h.id)}
                      className={`block w-full text-left text-xs py-1 px-1.5 rounded-sm transition-all duration-200 truncate ${
                        h.level === 1 ? "font-medium" : ""
                      } ${
                        h.level === 2 ? "pl-4" : ""
                      } ${
                        h.level === 3 ? "pl-7" : ""
                      } ${
                        isActive
                          ? "text-console-primary bg-console-primary/10 border-l-2 border-console-primary"
                          : isRead
                          ? "text-console-primary/50 border-l-2 border-console-primary/25"
                          : "text-console-muted hover:text-console border-l-2 border-transparent"
                      }`}
                      title={h.text}
                    >
                      {h.text}
                    </button>
                  );
                });
              })()}
            </nav>
          </div>
        )}

        {/* Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6">
          <div
            className="prose prose-invert prose-sm max-w-none
              prose-headings:text-console prose-p:text-console-secondary-foreground
              prose-a:text-console-primary prose-strong:text-console
              prose-li:text-console-secondary-foreground prose-th:text-console
              prose-td:text-console-secondary-foreground prose-table:border-console
              prose-hr:border-console prose-headings:scroll-mt-4"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />

          {supplements.map((supplement) => (
            <div
              key={supplement.id}
              id={`supplement-${supplement.id}`}
              className="mt-8"
              data-testid={`preview-supplement-${supplement.id}`}
            >
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-console">
                <Badge
                  variant="outline"
                  className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30"
                >
                  {MARKET_LABELS[supplement.market] || supplement.market}
                </Badge>
                <span className="text-sm font-medium text-console-muted">
                  Country Supplement
                </span>
                {!supplement.isPublished && (
                  <Badge
                    variant="secondary"
                    className="text-xs bg-amber-500/20 text-amber-400 border-amber-500/30"
                  >
                    Draft
                  </Badge>
                )}
                <button
                  onClick={() => onEditSupplement(supplement)}
                  className="ml-auto text-xs text-console-primary hover:underline"
                  data-testid={`edit-supplement-${supplement.id}`}
                >
                  Edit
                </button>
              </div>
              <div
                className="prose prose-invert prose-sm max-w-none
                  prose-headings:text-console prose-p:text-console-secondary-foreground
                  prose-a:text-console-primary prose-strong:text-console
                  prose-li:text-console-secondary-foreground prose-th:text-console
                  prose-td:text-console-secondary-foreground prose-table:border-console
                  prose-hr:border-console"
                dangerouslySetInnerHTML={{
                  __html: markdownToHtml(
                    resolvePlaceholders(
                      supplement.content,
                      globalPlaceholders,
                      supplement.placeholders || {}
                    )
                  ),
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Create document dialog
function CreateDocumentDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  existingIds,
  existingDocuments,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    id: string;
    documentType: string;
    title: string;
    market?: string;
    parentDocumentId?: string;
  }) => void;
  isPending: boolean;
  existingIds: string[];
  existingDocuments: LegalDocument[];
}) {
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState("terms-of-service");
  const [isSupplement, setIsSupplement] = useState(false);
  const [supplementMarket, setSupplementMarket] = useState("AU");
  const [parentDocumentId, setParentDocumentId] = useState("");

  // Base documents that can be parents for supplements
  const baseDocuments = existingDocuments.filter((d) => !d.parentDocumentId && d.market === "global");

  const id = isSupplement ? `${parentDocumentId || documentType}-${supplementMarket}` : documentType;
  const isDuplicate = existingIds.includes(id);
  const docTypeInfo = DOCUMENT_TYPE_INFO[documentType];
  const parentDoc = baseDocuments.find((d) => d.id === parentDocumentId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDuplicate) return;

    const defaultTitle = isSupplement
      ? `${DOCUMENT_TYPE_LABELS[parentDoc?.documentType || documentType] || documentType} — ${MARKET_LABELS[supplementMarket]} Supplement`
      : DOCUMENT_TYPE_LABELS[documentType] || documentType;

    onSubmit({
      id,
      documentType: isSupplement ? (parentDoc?.documentType || documentType) : documentType,
      title: title || defaultTitle,
      market: isSupplement ? supplementMarket : "global",
      parentDocumentId: isSupplement ? (parentDocumentId || undefined) : undefined,
    });
    setTitle("");
    setDocumentType("terms-of-service");
    setIsSupplement(false);
    setSupplementMarket("AU");
    setParentDocumentId("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md console-surface border-console">
        <DialogHeader>
          <DialogTitle className="text-console">
            Create Legal Document
          </DialogTitle>
          <DialogDescription className="text-console-muted">
            Add a new legal document or country supplement.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Document type toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSupplement(false)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                !isSupplement
                  ? "bg-console-primary/20 text-console-primary border border-console-primary/30"
                  : "text-console-muted border border-console hover:bg-console-surface-hover"
              }`}
              data-testid="create-base-doc-btn"
            >
              Base Document
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSupplement(true);
                if (baseDocuments.length > 0 && !parentDocumentId) {
                  setParentDocumentId(baseDocuments[0].id);
                }
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                isSupplement
                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                  : "text-console-muted border border-console hover:bg-console-surface-hover"
              }`}
              data-testid="create-supplement-btn"
            >
              Country Supplement
            </button>
          </div>

          {isSupplement ? (
            <>
              <div className="space-y-2">
                <label className="text-xs font-medium text-console-muted">
                  Parent Document
                </label>
                <select
                  value={parentDocumentId}
                  onChange={(e) => setParentDocumentId(e.target.value)}
                  className="w-full h-9 px-3 bg-console-surface border border-console rounded-md text-console text-sm"
                  data-testid="create-parent-select"
                >
                  {baseDocuments.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-console-muted">
                  Market
                </label>
                <select
                  value={supplementMarket}
                  onChange={(e) => setSupplementMarket(e.target.value)}
                  className="w-full h-9 px-3 bg-console-surface border border-console rounded-md text-console text-sm"
                  data-testid="create-market-select"
                >
                  {MARKET_OPTIONS.filter((m) => m !== "global").map((m) => (
                    <option key={m} value={m}>{MARKET_LABELS[m]}</option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-medium text-console-muted">
                Document Type
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full h-9 px-3 bg-console-surface border border-console rounded-md text-console text-sm"
                data-testid="create-document-type-select"
              >
                {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {docTypeInfo && (
                <p className="text-xs text-console-muted">
                  {docTypeInfo.purpose}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-medium text-console-muted">
              Title (optional override)
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                isSupplement
                  ? `${DOCUMENT_TYPE_LABELS[parentDoc?.documentType || ""] || ""} — ${MARKET_LABELS[supplementMarket]} Supplement`
                  : DOCUMENT_TYPE_LABELS[documentType] || ""
              }
              className="bg-console-surface border-console text-console text-sm"
              data-testid="create-title-input"
            />
          </div>
          <div className="text-xs text-console-muted">
            Document ID:{" "}
            <code className="px-1.5 py-0.5 bg-console-surface rounded">
              {id}
            </code>
            {isDuplicate && (
              <span className="text-red-400 ml-2">
                A document with this ID already exists
              </span>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-console text-console"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || isDuplicate}
              className="bg-console-primary hover:bg-console-primary/90"
              data-testid="create-submit-btn"
            >
              {isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


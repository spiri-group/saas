"use client";
import { useState, useMemo, useCallback, useRef } from "react";
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
  Keyboard,
  History,
  RotateCcw,
  Info,
  Settings2,
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
  LegalDocumentVersion,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_INFO,
} from "./types";
import { markdownToHtml } from "@/utils/markdownToHtml";
import { resolvePlaceholders } from "@/utils/resolvePlaceholders";
import UseLegalPlaceholders from "@/hooks/UseLegalPlaceholders";
import UseUpsertLegalPlaceholders from "./hooks/UseUpsertLegalPlaceholders";
import PlaceholderEditor from "./PlaceholderEditor";

type ViewMode = "list" | "edit" | "version-preview";
type EditorTab = "preview" | "edit";

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
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [changeSummary, setChangeSummary] = useState("");
  const [documentToDelete, setDocumentToDelete] =
    useState<LegalDocument | null>(null);
  const [selectedVersion, setSelectedVersion] =
    useState<LegalDocumentVersion | null>(null);
  const [versionToRestore, setVersionToRestore] =
    useState<LegalDocumentVersion | null>(null);
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

  // Filter documents by search
  const filteredDocuments = useMemo(() => {
    if (!documents || !searchQuery.trim()) return documents;
    const query = searchQuery.toLowerCase();
    return documents.filter(
      (doc) =>
        doc.title.toLowerCase().includes(query) ||
        doc.documentType.toLowerCase().includes(query) ||
        doc.id.toLowerCase().includes(query)
    );
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
          if (viewMode === "version-preview") {
            setViewMode("edit");
            setSelectedVersion(null);
          } else if (viewMode === "edit") {
            guardUnsavedChanges(handleBackToList);
          }
          break;
        case "h":
          if (viewMode === "edit") {
            event.preventDefault();
            setShowVersionHistory(true);
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
    setSelectedDocument(doc);
    setEditTitle(doc.title);
    setEditContent(doc.content);
    setEditDocumentType(doc.documentType);
    setEditIsPublished(doc.isPublished);
    setEditEffectiveDate(doc.effectiveDate?.split("T")[0] || "");
    setEditPlaceholders(doc.placeholders || {});
    setHasUnsavedChanges(false);
    setSelectedVersion(null);
    setEditorTab(forceTab ?? (doc.isPublished ? "preview" : "edit"));
    setViewMode("edit");
  };

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedDocument(null);
    setSelectedVersion(null);
    setHasUnsavedChanges(false);
    setShowVersionHistory(false);
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
  }) => {
    const input: LegalDocumentInput = {
      id: formData.id,
      documentType: formData.documentType,
      title: formData.title,
      content: `# ${formData.title}\n\n**Effective Date:** [EFFECTIVE_DATE]\n\nContent goes here...`,
      market: "global",
      isPublished: false,
      changeSummary: "Initial document",
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

  const handleViewVersion = (version: LegalDocumentVersion) => {
    setSelectedVersion(version);
    setShowVersionHistory(false);
    setViewMode("version-preview");
  };

  const handleRestoreClick = (version: LegalDocumentVersion) => {
    setVersionToRestore(version);
    setShowRestoreConfirm(true);
  };

  const handleRestoreConfirm = async () => {
    if (!selectedDocument || !versionToRestore) return;
    try {
      const result = await restoreMutation.mutateAsync({
        documentId: selectedDocument.id,
        versionId: versionToRestore.id,
      });
      setSelectedDocument(result);
      setShowRestoreConfirm(false);
      setVersionToRestore(null);
      setSelectedVersion(null);
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
        <div className="flex items-center px-6 py-3 border-b border-console">
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

          <div className="grid gap-3">
            {filteredDocuments?.map((doc) => {
              const docTypeInfo = DOCUMENT_TYPE_INFO[doc.documentType];
              return (
                <Card
                  key={doc.id}
                  className="console-surface border-console hover:border-console-primary/30 transition-colors cursor-pointer"
                  data-testid={`document-card-${doc.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => handleEditDocument(doc)}
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-sm font-medium text-console truncate">
                            {doc.title}
                          </h3>
                          <Badge
                            variant={doc.isPublished ? "default" : "secondary"}
                            className={`text-[10px] ${
                              doc.isPublished
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                            }`}
                          >
                            {doc.isPublished ? "Published" : "Draft"}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-console-muted">
                          <span>v{doc.version}</span>
                          <span className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {new Date(doc.updatedAt).toLocaleDateString()}
                            </span>
                          </span>
                          <span>by {doc.updatedBy}</span>
                        </div>
                        {docTypeInfo && (
                          <div className="flex items-center space-x-2 mt-1.5">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-console-primary/10 text-console-primary">
                              {docTypeInfo.usedIn}
                            </span>
                            <span className="text-xs text-console-muted">
                              {docTypeInfo.marketNotes}
                            </span>
                          </div>
                        )}
                        {doc.changeSummary && (
                          <p className="text-[10px] text-console-muted/50 mt-0.5 truncate italic">
                            Last change: {doc.changeSummary}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-1 ml-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditDocument(doc, "preview");
                          }}
                          className="p-1.5 text-console-muted hover:text-console hover:bg-console-surface-hover rounded-md transition-colors"
                          title="Preview"
                          data-testid={`preview-btn-${doc.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditDocument(doc, "edit");
                          }}
                          className="p-1.5 text-console-muted hover:text-console hover:bg-console-surface-hover rounded-md transition-colors"
                          title="Edit"
                          data-testid={`edit-btn-${doc.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmDelete(doc);
                          }}
                          className="p-1.5 text-console-muted hover:text-red-400 hover:bg-console-surface-hover rounded-md transition-colors"
                          title="Delete"
                          data-testid={`delete-btn-${doc.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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
                { key: "H", desc: "Version history (in editor)" },
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

  // Version preview mode
  if (viewMode === "version-preview" && selectedDocument && selectedVersion) {
    return (
      <div
        className="h-full flex flex-col overflow-hidden"
        onKeyDown={handleKeyDown}
        tabIndex={0}
        data-testid="version-preview"
      >
        <div className="flex items-center justify-between px-6 py-3 border-b border-console">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setViewMode("edit");
                setSelectedVersion(null);
                setShowVersionHistory(true);
              }}
              className="p-1.5 text-console-muted hover:text-console hover:bg-console-surface-hover rounded-md transition-colors"
              data-testid="back-to-history-btn"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <h2 className="text-sm font-semibold text-console">
                {selectedVersion.title}
              </h2>
              <p className="text-xs text-console-muted">
                Version {selectedVersion.version} (read-only)
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => handleRestoreClick(selectedVersion)}
            className="bg-amber-600 hover:bg-amber-700"
            data-testid="restore-version-btn"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Restore This Version
          </Button>
        </div>

        {/* Version metadata bar */}
        <div className="flex items-center space-x-4 px-6 py-2.5 border-b border-console bg-amber-500/5">
          <div className="flex items-center space-x-2 text-xs">
            <History className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-amber-400 font-medium">
              Historical Version
            </span>
          </div>
          <span className="text-xs text-console-muted">
            Superseded on{" "}
            {new Date(selectedVersion.supersededAt).toLocaleDateString(
              undefined,
              { year: "numeric", month: "short", day: "numeric" }
            )}{" "}
            by {selectedVersion.supersededBy}
          </span>
          <span className="text-xs text-console-muted italic">
            &quot;{selectedVersion.changeSummary}&quot;
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            <div
              className="prose prose-invert prose-sm max-w-none
                prose-headings:text-console prose-p:text-console-secondary
                prose-a:text-console-primary prose-strong:text-console
                prose-li:text-console-secondary prose-th:text-console
                prose-td:text-console-secondary prose-table:border-console
                prose-hr:border-console"
              dangerouslySetInnerHTML={{
                __html: markdownToHtml(resolvePlaceholders(selectedVersion.content, globalPlaceholders || {}, selectedVersion.placeholders)),
              }}
            />
          </div>
        </div>

        {/* Restore confirmation dialog */}
        <Dialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
          <DialogContent className="sm:max-w-md console-surface border-console">
            <DialogHeader>
              <DialogTitle className="text-console">
                Restore Version {versionToRestore?.version}?
              </DialogTitle>
              <DialogDescription className="text-console-muted">
                This will create a new version with the content from v
                {versionToRestore?.version}. The current version will be
                preserved in the history.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowRestoreConfirm(false)}
                className="border-console text-console"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRestoreConfirm}
                disabled={restoreMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700"
                data-testid="confirm-restore-btn"
              >
                {restoreMutation.isPending ? "Restoring..." : "Restore"}
              </Button>
            </DialogFooter>
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
              onClick={() => guardUnsavedChanges(handleBackToList)}
              className="p-1.5 text-console-muted hover:text-console hover:bg-console-surface-hover rounded-md transition-colors"
              data-testid="back-to-list-btn"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
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
              <button
                onClick={() => setShowVersionHistory(true)}
                className="p-2 text-console-muted hover:text-console hover:bg-console-surface-hover rounded-lg transition-colors"
                title="Version history (H)"
                data-testid="version-history-btn"
              >
                <History className="h-4 w-4" />
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

        {editorTab === "edit" ? (
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
                <span className="text-[1px] text-console-muted/30">|</span>
                <span className="text-xs text-console-secondary">
                  {docTypeInfo.marketNotes}
                </span>
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
        ) : (
          /* Preview tab - full width rendered content */
          <div
            className="flex-1 overflow-y-auto p-6"
            data-testid="editor-preview-content"
          >
            <div
              className="prose prose-invert prose-sm max-w-none
                prose-headings:text-console prose-p:text-console-secondary
                prose-a:text-console-primary prose-strong:text-console
                prose-li:text-console-secondary prose-th:text-console
                prose-td:text-console-secondary prose-table:border-console
                prose-hr:border-console"
              dangerouslySetInnerHTML={{
                __html: markdownToHtml(resolvePlaceholders(editContent, globalPlaceholders || {}, editPlaceholders)),
              }}
            />
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
                placeholder="e.g., Updated privacy policy for new analytics tracking, Added CCPA section for California compliance..."
                className="bg-console-surface border-console text-console text-sm min-h-[100px]"
                autoFocus
                data-testid="change-summary-input"
              />
              {selectedDocument.changeSummary && (
                <p className="text-[10px] text-console-muted/50">
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

        {/* Version History Dialog */}
        <Dialog
          open={showVersionHistory}
          onOpenChange={setShowVersionHistory}
        >
          <DialogContent className="sm:max-w-2xl console-surface border-console max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2 text-console">
                <History className="h-5 w-5 text-console-primary" />
                <span>Version History</span>
              </DialogTitle>
              <DialogDescription className="text-console-muted">
                {selectedDocument.title}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {/* Current version */}
              <div className="p-3 rounded-lg bg-console-primary/10 border border-console-primary/20">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-console-primary/20 text-console-primary border-console-primary/30 text-[10px]">
                      v{selectedDocument.version}
                    </Badge>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                      Current
                    </Badge>
                  </div>
                  <span className="text-[10px] text-console-muted">
                    {new Date(selectedDocument.updatedAt).toLocaleDateString(
                      undefined,
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </span>
                </div>
                <p className="text-xs text-console">
                  {selectedDocument.title}
                </p>
                <div className="flex items-center space-x-3 mt-1">
                  <span className="text-[10px] text-console-muted">
                    by {selectedDocument.updatedBy}
                  </span>
                </div>
                {selectedDocument.changeSummary && (
                  <p className="text-[10px] text-console-muted/70 mt-1 italic">
                    {selectedDocument.changeSummary}
                  </p>
                )}
              </div>

              {/* Historical versions */}
              {versionsLoading && (
                <div className="flex items-center justify-center py-6">
                  <div className="animate-console-spin rounded-full h-5 w-5 border-2 border-console-primary border-t-transparent"></div>
                  <span className="ml-2 text-console-muted text-xs">
                    Loading versions...
                  </span>
                </div>
              )}

              {!versionsLoading && (!versions || versions.length === 0) && (
                <div className="text-center py-6">
                  <History className="h-8 w-8 text-console-muted/30 mx-auto mb-2" />
                  <p className="text-xs text-console-muted/50">
                    No previous versions
                  </p>
                </div>
              )}

              {versions?.map((version) => {
                return (
                  <div
                    key={version.id}
                    className="p-3 rounded-lg bg-console-surface hover:bg-console-surface-hover border border-console transition-colors group"
                    data-testid={`version-entry-${version.id}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant="secondary"
                          className="bg-console-surface border-console text-console-muted text-[10px]"
                        >
                          v{version.version}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleViewVersion(version)}
                          className="px-2 py-1 text-[10px] text-console-muted hover:text-console hover:bg-console-surface-hover rounded transition-colors"
                          data-testid={`view-version-${version.id}`}
                        >
                          <Eye className="h-3 w-3 inline mr-1" />
                          View
                        </button>
                        <button
                          onClick={() => handleRestoreClick(version)}
                          className="px-2 py-1 text-[10px] text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded transition-colors"
                          data-testid={`restore-version-${version.id}`}
                        >
                          <RotateCcw className="h-3 w-3 inline mr-1" />
                          Restore
                        </button>
                        <span className="text-[10px] text-console-muted">
                          {new Date(
                            version.supersededAt
                          ).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-console-secondary">
                      {version.title}
                    </p>
                    <div className="flex items-center space-x-3 mt-1">
                      <span className="text-[10px] text-console-muted">
                        Replaced by {version.supersededBy}
                      </span>
                    </div>
                    <p className="text-[10px] text-console-muted/70 mt-1 italic">
                      {version.changeSummary}
                    </p>
                  </div>
                );
              })}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowVersionHistory(false)}
                className="border-console text-console"
                data-testid="close-version-history-btn"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Restore confirmation dialog (from history panel) */}
        <Dialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
          <DialogContent className="sm:max-w-md console-surface border-console">
            <DialogHeader>
              <DialogTitle className="text-console">
                Restore Version {versionToRestore?.version}?
              </DialogTitle>
              <DialogDescription className="text-console-muted">
                This will create a new version with the content from v
                {versionToRestore?.version}. The current version will be
                preserved in the history.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowRestoreConfirm(false)}
                className="border-console text-console"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRestoreConfirm}
                disabled={restoreMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700"
                data-testid="confirm-restore-btn"
              >
                {restoreMutation.isPending ? "Restoring..." : "Restore"}
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

// Create document dialog
function CreateDocumentDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  existingIds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    id: string;
    documentType: string;
    title: string;
  }) => void;
  isPending: boolean;
  existingIds: string[];
}) {
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState("terms-of-service");

  const id = documentType;
  const isDuplicate = existingIds.includes(id);
  const docTypeInfo = DOCUMENT_TYPE_INFO[documentType];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDuplicate) return;
    onSubmit({
      id,
      documentType,
      title: title || DOCUMENT_TYPE_LABELS[documentType] || documentType,
    });
    setTitle("");
    setDocumentType("terms-of-service");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md console-surface border-console">
        <DialogHeader>
          <DialogTitle className="text-console">
            Create Legal Document
          </DialogTitle>
          <DialogDescription className="text-console-muted">
            Add a new legal document to the platform.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              <p className="text-[10px] text-console-muted/60">
                {docTypeInfo.purpose}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-console-muted">
              Title (optional override)
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={DOCUMENT_TYPE_LABELS[documentType] || ""}
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


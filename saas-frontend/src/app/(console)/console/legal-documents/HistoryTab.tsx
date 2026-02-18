"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Clock, History, RotateCcw } from "lucide-react";
import { useState } from "react";
import { markdownToHtml } from "@/utils/markdownToHtml";
import { resolvePlaceholders } from "@/utils/resolvePlaceholders";
import {
  LegalDocument,
  LegalDocumentVersion,
} from "./types";

interface HistoryTabProps {
  document: LegalDocument;
  versions: LegalDocumentVersion[] | undefined;
  versionsLoading: boolean;
  globalPlaceholders: Record<string, string>;
  editPlaceholders: Record<string, string>;
  editContent: string;
  onRestore: (version: LegalDocumentVersion) => Promise<void>;
  isRestoring: boolean;
}

export default function HistoryTab({
  document,
  versions,
  versionsLoading,
  globalPlaceholders,
  editPlaceholders,
  editContent,
  onRestore,
  isRestoring,
}: HistoryTabProps) {
  const [selectedVersion, setSelectedVersion] =
    useState<LegalDocumentVersion | null>(null);
  const [versionToRestore, setVersionToRestore] =
    useState<LegalDocumentVersion | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  const handleRestoreClick = (version: LegalDocumentVersion) => {
    setVersionToRestore(version);
    setShowRestoreConfirm(true);
  };

  const handleRestoreConfirm = async () => {
    if (!versionToRestore) return;
    await onRestore(versionToRestore);
    setShowRestoreConfirm(false);
    setVersionToRestore(null);
    setSelectedVersion(null);
  };

  // Content to preview: selected version or current document
  const previewContent = selectedVersion
    ? selectedVersion.content
    : editContent;
  const previewPlaceholders = selectedVersion
    ? selectedVersion.placeholders || {}
    : editPlaceholders;

  return (
    <div className="flex-1 flex min-h-0" data-testid="history-tab">
      {/* Left panel - Version timeline */}
      <div className="w-[35%] border-r border-console overflow-y-auto">
        <div className="p-4 space-y-2">
          {/* Current version */}
          <button
            type="button"
            onClick={() => setSelectedVersion(null)}
            className={`w-full text-left p-3 rounded-lg border transition-colors ${
              !selectedVersion
                ? "bg-console-primary/10 border-console-primary/30"
                : "bg-console-surface hover:bg-console-surface-hover border-console"
            }`}
            data-testid="history-current-version"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-2">
                <Badge className="bg-console-primary/20 text-console-primary border-console-primary/30 text-[10px]">
                  v{document.version}
                </Badge>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                  Current
                </Badge>
              </div>
            </div>
            <div className="flex items-center space-x-2 mt-1.5 text-xs text-console-muted">
              <Clock className="h-3 w-3" />
              <span>
                {new Date(document.updatedAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <span>by {document.updatedBy}</span>
            </div>
            {document.changeSummary && (
              <p className="text-xs text-console-muted mt-1 italic truncate">
                &quot;{document.changeSummary}&quot;
              </p>
            )}
          </button>

          {/* Loading state */}
          {versionsLoading && (
            <div className="flex items-center justify-center py-6">
              <div className="animate-console-spin rounded-full h-5 w-5 border-2 border-console-primary border-t-transparent"></div>
              <span className="ml-2 text-console-muted text-xs">
                Loading versions...
              </span>
            </div>
          )}

          {/* No versions */}
          {!versionsLoading && (!versions || versions.length === 0) && (
            <div className="text-center py-6">
              <History className="h-8 w-8 text-console-muted mx-auto mb-2" />
              <p className="text-xs text-console-muted">
                No previous versions
              </p>
            </div>
          )}

          {/* Historical versions */}
          {versions?.map((version) => {
            const isSelected = selectedVersion?.id === version.id;
            return (
              <div
                key={version.id}
                className={`p-3 rounded-lg border transition-colors ${
                  isSelected
                    ? "bg-console-primary/10 border-console-primary/30"
                    : "bg-console-surface hover:bg-console-surface-hover border-console"
                }`}
                data-testid={`version-entry-${version.id}`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedVersion(version)}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between mb-1">
                    <Badge
                      variant="secondary"
                      className="bg-console-surface border-console text-console-muted text-[10px]"
                    >
                      v{version.version}
                    </Badge>
                    <span className="text-xs text-console-muted">
                      {new Date(version.supersededAt).toLocaleDateString(
                        undefined,
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }
                      )}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 mt-1 text-xs text-console-muted">
                    <span>by {version.supersededBy}</span>
                  </div>
                  {version.changeSummary && (
                    <p className="text-xs text-console-muted mt-1 italic truncate">
                      &quot;{version.changeSummary}&quot;
                    </p>
                  )}
                </button>
                <div className="mt-2 pt-2 border-t border-console">
                  <button
                    onClick={() => handleRestoreClick(version)}
                    className="flex items-center space-x-1 px-2 py-1 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded transition-colors"
                    data-testid={`restore-version-${version.id}`}
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Restore</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right panel - Content preview */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Metadata bar for historical versions */}
        {selectedVersion && (
          <div className="flex items-center justify-between px-6 py-2.5 border-b border-console bg-amber-500/5">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-xs">
                <History className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-amber-400 font-medium">
                  Historical Version (v{selectedVersion.version})
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
            </div>
            <Button
              size="sm"
              onClick={() => handleRestoreClick(selectedVersion)}
              className="bg-amber-600 hover:bg-amber-700"
              data-testid="restore-version-btn"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Restore This Version
            </Button>
          </div>
        )}

        {/* Rendered content */}
        <div
          className="flex-1 overflow-y-auto p-6"
          data-testid="history-content-preview"
        >
          <div className="max-w-4xl mx-auto">
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
                    previewContent,
                    globalPlaceholders,
                    previewPlaceholders
                  )
                ),
              }}
            />
          </div>
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
              {versionToRestore?.version}. The current version will be preserved
              in the history.
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
              disabled={isRestoring}
              className="bg-amber-600 hover:bg-amber-700"
              data-testid="confirm-restore-btn"
            >
              {isRestoring ? "Restoring..." : "Restore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

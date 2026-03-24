"use client";

import { useState } from "react";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Pencil, Trash2, Star, ArrowLeft, FileCheck } from "lucide-react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import {
  useTermsAndConditions,
  useUpsertTerms,
  useDeleteTerms,
  TermsDocument,
} from "./hooks/UseTermsAndConditions";

type Props = {
  practitionerId: string;
};

type EditingDoc = {
  id: string;
  title: string;
  content: string;
  isDefault: boolean;
  isNew: boolean;
};

export default function TermsAndConditionsManager({ practitionerId }: Props) {
  const { data: documents, isLoading } = useTermsAndConditions(practitionerId);
  const upsertTerms = useUpsertTerms();
  const deleteTerms = useDeleteTerms();

  const [editing, setEditing] = useState<EditingDoc | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleNew = () => {
    setEditing({
      id: uuidv4(),
      title: "",
      content: "",
      isDefault: !documents || documents.length === 0,
      isNew: true,
    });
  };

  const handleEdit = (doc: TermsDocument) => {
    setEditing({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      isDefault: doc.isDefault || false,
      isNew: false,
    });
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.title.trim()) {
      toast.error("Please add a title");
      return;
    }
    if (!editing.content.trim()) {
      toast.error("Please add the terms content");
      return;
    }

    try {
      await upsertTerms.mutateAsync({
        merchantId: practitionerId,
        documents: [
          {
            id: editing.id,
            title: editing.title.trim(),
            content: editing.content.trim(),
            isDefault: editing.isDefault,
          },
        ],
      });
      toast.success(editing.isNew ? "Terms & conditions created" : "Terms & conditions updated");
      setEditing(null);
    } catch {
      toast.error("Failed to save terms & conditions");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTerms.mutateAsync({ merchantId: practitionerId, documentId: id });
      toast.success("Terms & conditions deleted");
      setDeleteConfirmId(null);
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleSetDefault = async (doc: TermsDocument) => {
    try {
      await upsertTerms.mutateAsync({
        merchantId: practitionerId,
        documents: [{ id: doc.id, title: doc.title, content: doc.content, isDefault: true }],
      });
      toast.success(`"${doc.title}" set as default`);
    } catch {
      toast.error("Failed to update default");
    }
  };

  // Editing view
  if (editing) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>{editing.isNew ? "New Terms & Conditions" : "Edit Terms & Conditions"}</DialogTitle>
          <DialogDescription className="text-slate-400">
            {editing.isNew
              ? "Create a terms & conditions document that clients agree to before booking."
              : "Update this terms & conditions document."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Title</label>
            <Input
              dark
              data-testid="tc-title-input"
              value={editing.title}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              placeholder='e.g. "Booking Terms" or "Reading Agreement"'
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Terms & Conditions</label>
            <Textarea
              dark
              data-testid="tc-content-input"
              value={editing.content}
              onChange={(e) => setEditing({ ...editing, content: e.target.value })}
              placeholder="Type or paste your terms and conditions here..."
              rows={12}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              data-testid="tc-default-checkbox"
              checked={editing.isDefault}
              onChange={(e) => setEditing({ ...editing, isDefault: e.target.checked })}
              className="rounded border-slate-600 bg-slate-800 text-purple-500 focus:ring-purple-500"
            />
            <span className="text-sm text-slate-300">Set as default for new services and journeys</span>
          </label>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            data-testid="tc-back-btn"
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
            onClick={() => setEditing(null)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Button
            data-testid="tc-save-btn"
            onClick={handleSave}
            disabled={upsertTerms.isPending}
            className="bg-purple-600 hover:bg-purple-500"
          >
            {upsertTerms.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {editing.isNew ? "Create" : "Save Changes"}
          </Button>
        </DialogFooter>
      </>
    );
  }

  // List view
  return (
    <>
      <DialogHeader>
        <DialogTitle>Terms & Conditions</DialogTitle>
        <DialogDescription className="text-slate-400">
          Create terms that clients must agree to before booking your services or purchasing journeys.
        </DialogDescription>
      </DialogHeader>

      <div className="py-2 min-h-[200px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : documents && documents.length > 0 ? (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                data-testid={`tc-doc-${doc.id}`}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-700 bg-slate-800/50 hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileCheck className="h-5 w-5 text-slate-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-200 truncate">{doc.title}</span>
                      {doc.isDefault && <Badge variant="info" dark>Default</Badge>}
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {doc.content.substring(0, 80)}{doc.content.length > 80 ? "..." : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                  {!doc.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      data-testid={`tc-set-default-${doc.id}`}
                      onClick={() => handleSetDefault(doc)}
                      className="text-slate-400 hover:text-amber-400 h-8 w-8 p-0"
                      title="Set as default"
                    >
                      <Star className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid={`tc-edit-${doc.id}`}
                    onClick={() => handleEdit(doc)}
                    className="text-slate-400 hover:text-purple-400 h-8 w-8 p-0"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {deleteConfirmId === doc.id ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        data-testid={`tc-confirm-delete-${doc.id}`}
                        onClick={() => handleDelete(doc.id)}
                        disabled={deleteTerms.isPending}
                        className="text-red-400 hover:text-red-300 text-xs h-8 px-2"
                      >
                        {deleteTerms.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Delete"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirmId(null)}
                        className="text-slate-500 text-xs h-8 px-2"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      data-testid={`tc-delete-${doc.id}`}
                      onClick={() => setDeleteConfirmId(doc.id)}
                      className="text-slate-400 hover:text-red-400 h-8 w-8 p-0"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileCheck className="h-10 w-10 text-slate-600 mb-3" />
            <p className="text-sm text-slate-400 mb-1">No terms & conditions yet</p>
            <p className="text-xs text-slate-500 max-w-xs">
              Create your first document so clients agree to your terms before booking.
            </p>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button
          data-testid="tc-new-btn"
          onClick={handleNew}
          className="bg-purple-600 hover:bg-purple-500"
        >
          <Plus className="h-4 w-4 mr-1" />
          New Terms & Conditions
        </Button>
      </DialogFooter>
    </>
  );
}

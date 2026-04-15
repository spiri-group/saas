"use client";

import { useState } from "react";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, ArrowLeft, FileCheck } from "lucide-react";
import CancelDialogButton from "@/components/ux/CancelDialogButton";
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
      toast.success(`"${doc.title}" is now your default`);
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
              ? "Write the terms your clients will need to agree to before they can book with you."
              : "Make changes to this document. Existing bookings keep the version they agreed to."}
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
              placeholder={"For example:\n\n- All readings are for entertainment and spiritual guidance purposes only.\n- Cancellations must be made at least 24 hours before your scheduled session.\n- Refunds are not available for completed sessions.\n- Session recordings are confidential and will not be shared."}
              rows={12}
            />
            <p className="text-xs text-slate-500 mt-1">
              Tip: Include your cancellation policy, refund policy, and any disclaimers about your services.
            </p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-slate-700 bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
            <input
              type="checkbox"
              data-testid="tc-default-checkbox"
              checked={editing.isDefault}
              onChange={(e) => setEditing({ ...editing, isDefault: e.target.checked })}
              className="mt-0.5 rounded border-slate-600 bg-slate-800 text-purple-500 focus:ring-purple-500"
            />
            <div>
              <span className="text-sm text-slate-200 font-medium">Use as default</span>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically applies to any new services or journeys you create.
              </p>
            </div>
          </label>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            data-testid="tc-back-btn"
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700 h-11 px-5"
            onClick={() => setEditing(null)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Button
            data-testid="tc-save-btn"
            onClick={handleSave}
            disabled={upsertTerms.isPending}
            className="bg-purple-600 hover:bg-purple-500 h-11 px-6"
          >
            {upsertTerms.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {editing.isNew ? "Create" : "Save Changes"}
          </Button>
        </DialogFooter>
      </>
    );
  }

  // Delete confirmation view
  if (deleteConfirmId) {
    const docToDelete = documents?.find((d) => d.id === deleteConfirmId);
    return (
      <>
        <DialogHeader>
          <DialogTitle>Delete Terms & Conditions</DialogTitle>
          <DialogDescription className="text-slate-400">
            Are you sure you want to delete &quot;{docToDelete?.title}&quot;? Services using this document will no longer show terms at checkout.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            data-testid="tc-cancel-delete-btn"
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700 h-11 px-5"
            onClick={() => setDeleteConfirmId(null)}
          >
            Keep It
          </Button>
          <Button
            data-testid="tc-confirm-delete-btn"
            onClick={() => handleDelete(deleteConfirmId)}
            disabled={deleteTerms.isPending}
            className="bg-red-600 hover:bg-red-500 h-11 px-6"
          >
            {deleteTerms.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Delete
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
          Protect yourself by setting terms that clients agree to before booking your services.
        </DialogDescription>
      </DialogHeader>

      <div className="py-2 min-h-[200px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : documents && documents.length > 0 ? (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                data-testid={`tc-doc-${doc.id}`}
                className="rounded-lg border border-slate-700 bg-slate-800/50 overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <FileCheck className="h-5 w-5 text-purple-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-slate-200">{doc.title}</span>
                    {doc.isDefault && <Badge variant="info" dark>Default</Badge>}
                  </div>
                  <p className="text-xs text-slate-500 ml-7 line-clamp-2">
                    {doc.content.substring(0, 150)}{doc.content.length > 150 ? "..." : ""}
                  </p>
                </div>
                <div className="flex border-t border-slate-700">
                  <button
                    data-testid={`tc-edit-${doc.id}`}
                    onClick={() => handleEdit(doc)}
                    className="flex-1 py-2.5 text-sm text-slate-400 hover:text-purple-400 hover:bg-slate-800 transition-colors"
                  >
                    Edit
                  </button>
                  {!doc.isDefault && (
                    <button
                      data-testid={`tc-set-default-${doc.id}`}
                      onClick={() => handleSetDefault(doc)}
                      className="flex-1 py-2.5 text-sm text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors border-l border-slate-700"
                    >
                      Make Default
                    </button>
                  )}
                  <button
                    data-testid={`tc-delete-${doc.id}`}
                    onClick={() => setDeleteConfirmId(doc.id)}
                    className="flex-1 py-2.5 text-sm text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors border-l border-slate-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileCheck className="h-12 w-12 text-slate-600 mb-4" />
            <p className="text-base text-slate-300 mb-2">No terms & conditions yet</p>
            <p className="text-sm text-slate-500 max-w-sm">
              Setting up terms protects you and your clients. Include things like your cancellation policy, session disclaimers, and refund rules.
            </p>
          </div>
        )}
      </div>

      <DialogFooter className="flex gap-2 sm:gap-2">
        <CancelDialogButton label="Close" />
        <Button
          data-testid="tc-new-btn"
          onClick={handleNew}
          className="bg-purple-600 hover:bg-purple-500 h-11 px-6"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Terms & Conditions
        </Button>
      </DialogFooter>
    </>
  );
}

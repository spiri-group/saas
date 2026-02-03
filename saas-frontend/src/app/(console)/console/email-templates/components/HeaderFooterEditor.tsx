"use client";
import { useState, useEffect } from "react";
import { X, Eye, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { EmailHeaderFooter } from "../types";
import UseUpsertEmailHeaderFooter from "../hooks/UseUpsertEmailHeaderFooter";
import EmailContentBuilder, { EmailStructure, EmailPreview } from "./EmailContentBuilder";
import UnsavedChangesDialog from "./UnsavedChangesDialog";

interface HeaderFooterEditorProps {
  open: boolean;
  onClose: () => void;
  editingItem: EmailHeaderFooter | null;
  type: "header" | "footer";
}

export default function HeaderFooterEditor({
  open,
  onClose,
  editingItem,
  type
}: HeaderFooterEditorProps) {
  const [name, setName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [emailStructure, setEmailStructure] = useState<EmailStructure | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const upsertMutation = UseUpsertEmailHeaderFooter();

  // Handle Escape key to close editor
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleCloseClick();
      }
    };

    if (open) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, activeTab, hasChanges]);

  // Reset when item changes
  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name || "");
      setIsDefault(editingItem.isDefault || false);
      setIsActive(editingItem.isActive);
      // Parse content if it exists
      try {
        if (editingItem.content) {
          setEmailStructure(JSON.parse(editingItem.content) as EmailStructure);
        }
      } catch (e) {
        console.error("Failed to parse content", e);
        setEmailStructure(undefined);
      }
      setHasChanges(false);
    } else {
      setName("");
      setIsDefault(false);
      setIsActive(true);
      setEmailStructure(undefined);
      setHasChanges(false);
    }
  }, [editingItem]);

  // Track changes to any fields
  useEffect(() => {
    const nameChanged = name !== (editingItem?.name || "");
    const defaultChanged = isDefault !== (editingItem?.isDefault || false);
    const activeChanged = isActive !== (editingItem?.isActive ?? true);
    const structureChanged = emailStructure !== undefined && JSON.stringify(emailStructure) !== editingItem?.content;

    setHasChanges(nameChanged || defaultChanged || activeChanged || structureChanged);
  }, [name, isDefault, isActive, emailStructure, editingItem]);

  const handleClose = () => {
    setName("");
    setIsDefault(false);
    setIsActive(true);
    setEmailStructure(undefined);
    setHasChanges(false);
    onClose();
  };

  const handleCloseClick = () => {
    // If in preview mode, just go back to edit
    if (activeTab === "preview") {
      setActiveTab("edit");
      return;
    }

    // If in edit mode, check for unsaved changes
    if (hasChanges) {
      setShowUnsavedDialog(true);
    } else {
      handleClose();
    }
  };

  const handleConfirmClose = () => {
    setShowUnsavedDialog(false);
    handleClose();
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Please enter a name");
      return;
    }

    if (!emailStructure) {
      toast.error("Please configure the content");
      return;
    }

    const content = JSON.stringify(emailStructure);

    upsertMutation.mutate({
      id: editingItem?.id,
      name: name.trim(),
      type: type,
      content: content,
      isDefault: isDefault,
      isActive: isActive,
    }, {
      onSuccess: () => {
        toast.success(`${type === "header" ? "Header" : "Footer"} ${editingItem ? "updated" : "created"} successfully`);
        setHasChanges(false);
        handleClose();
      },
      onError: (error: any) => {
        const errorMessage = error?.message || `Failed to ${editingItem ? "update" : "create"} ${type}`;
        toast.error(errorMessage);
      }
    });
  };

  const isPending = upsertMutation.isPending;

  if (!open) return null;

  return (
    <div className="flex-1 border-l border-slate-800 bg-slate-950 flex flex-col max-h-screen">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {editingItem ? `Edit ${type}` : `Create ${type}`}
              </h2>
              <p className="text-xs text-slate-400 capitalize mt-1">
                {type === "header" ? "Email header (logo, navigation)" : "Email footer (unsubscribe, social links)"}
              </p>
            </div>

            {/* Name */}
            <div className="flex items-center gap-2">
              <Label className="text-slate-400 text-xs whitespace-nowrap">Name:</Label>
              <Input
                placeholder={`e.g., Company ${type === "header" ? "Logo Header" : "Standard Footer"}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-slate-900 border-slate-700 h-8 text-sm text-white"
              />
            </div>

            {/* Switches */}
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={isDefault}
                  onCheckedChange={setIsDefault}
                  id="default-switch"
                />
                <Label htmlFor="default-switch" className="text-xs text-slate-400 cursor-pointer">
                  Set as Default
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  id="active-switch"
                />
                <Label htmlFor="active-switch" className="text-xs text-slate-400 cursor-pointer">
                  Active
                </Label>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "edit" | "preview")} className="flex items-center gap-2">
              <TabsList>
                <TabsTrigger value="edit" className="flex items-center gap-2">
                  <Edit3 className="h-3 w-3" />
                  Edit
                </TabsTrigger>
                <TabsTrigger value="preview" className="flex items-center gap-2">
                  <Eye className="h-3 w-3" />
                  Preview
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <button
              onClick={handleCloseClick}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              title={activeTab === "preview" ? "Back to edit" : "Close editor"}
            >
              <X className="h-4 w-4 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Content Builder with Preview */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "edit" | "preview")} className="h-full flex flex-col">
          <TabsContent value="edit" className="flex-1 min-h-0 overflow-hidden mt-0">
            <EmailContentBuilder
              value={emailStructure}
              onChange={setEmailStructure}
            />
          </TabsContent>

          <TabsContent value="preview" className="flex-1 min-h-0 overflow-hidden mt-0">
            <EmailPreview structure={emailStructure} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Action Buttons - Always visible at bottom */}
      <div className="p-4 border-t border-slate-800 bg-slate-950 flex-shrink-0">
        <div className="flex space-x-3">
          <Button
            onClick={handleCloseClick}
            className="flex-1 border border-slate-600 text-slate-300 bg-transparent hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isPending || !emailStructure || !name.trim()}
            className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
          >
            {isPending ? 'Saving...' : (editingItem ? 'Update' : 'Create')}
          </Button>
        </div>
      </div>

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onOpenChange={setShowUnsavedDialog}
        onConfirm={handleConfirmClose}
      />
    </div>
  );
}

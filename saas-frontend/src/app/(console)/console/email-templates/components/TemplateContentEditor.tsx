"use client";
import { useState, useEffect } from "react";
import { X, Eye, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmailTemplate } from "../types";
import UseUpsertEmailTemplate from "../hooks/UseUpsertEmailTemplate";
import UseEmailHeadersFooters from "../hooks/UseEmailHeadersFooters";
import EmailContentBuilder, { EmailStructure, EmailPreview } from "./EmailContentBuilder";
import VariablePicker from "./EmailContentBuilder/VariablePicker";
import UnsavedChangesDialog from "./UnsavedChangesDialog";

interface TemplateContentEditorProps {
  open: boolean;
  onClose: () => void;
  template: EmailTemplate;
  onHasChanges?: (hasChanges: boolean) => void;
}

export default function TemplateContentEditor({
  open,
  onClose,
  template,
  onHasChanges
}: TemplateContentEditorProps) {
  const [emailStructure, setEmailStructure] = useState<EmailStructure | undefined>(undefined);
  const [originalStructure, setOriginalStructure] = useState<EmailStructure | undefined>(undefined);
  const [subject, setSubject] = useState("");
  const [headerId, setHeaderId] = useState<string | undefined>(undefined);
  const [footerId, setFooterId] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const upsertMutation = UseUpsertEmailTemplate();
  const headers = UseEmailHeadersFooters("header");
  const footers = UseEmailHeadersFooters("footer");

  // Helper to insert variable into subject at cursor position
  const handleInsertSubjectVariable = (variable: string) => {
    const inputElement = document.querySelector('input[name="email-subject"]') as HTMLInputElement;

    if (inputElement && typeof inputElement.selectionStart === 'number') {
      const cursorPos = inputElement.selectionStart;
      const newValue =
        subject.substring(0, cursorPos) +
        variable +
        subject.substring(cursorPos);

      setSubject(newValue);

      setTimeout(() => {
        inputElement.focus();
        inputElement.setSelectionRange(cursorPos + variable.length, cursorPos + variable.length);
      }, 0);
    } else {
      setSubject(subject + variable);
    }
  };

  // Handle Escape key for preview mode
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeTab === 'preview') {
        e.preventDefault();
        e.stopPropagation();
        setActiveTab('edit');
      }
    };

    if (activeTab === 'preview') {
      window.addEventListener('keydown', handleEscape, { capture: true });
      return () => window.removeEventListener('keydown', handleEscape, { capture: true });
    }
  }, [activeTab]);

  // Reset when template changes
  useEffect(() => {
    if (template) {
      setSubject(template.subject || "");
      setHeaderId(template.headerId);
      setFooterId(template.footerId);
      
      // Parse HTML back to email structure if it exists
      if (template.html) {
        try {
          // The HTML contains the JSON structure in a comment
          const jsonMatch = template.html.match(/<!-- Email Structure -->\s*(\{[\s\S]*\})/);
          if (jsonMatch) {
            const structure = JSON.parse(jsonMatch[1]);
            setEmailStructure(structure);
            setOriginalStructure(structure);
          } else {
            setEmailStructure(undefined);
            setOriginalStructure(undefined);
          }
        } catch (e) {
          console.error("Failed to parse template structure", e);
          setEmailStructure(undefined);
          setOriginalStructure(undefined);
        }
      } else {
        setEmailStructure(undefined);
        setOriginalStructure(undefined);
      }
      
      setHasChanges(false);
    }
  }, [template]);

  // Track changes to any fields
  useEffect(() => {
    if (template) {
      const subjectChanged = subject !== (template.subject || "");
      const headerChanged = headerId !== template.headerId;
      const footerChanged = footerId !== template.footerId;
      
      // Compare structure by stringifying (simple but effective for detecting changes)
      const structureChanged = JSON.stringify(emailStructure) !== JSON.stringify(originalStructure);

      const changed = subjectChanged || headerChanged || footerChanged || structureChanged;
      setHasChanges(changed);
      onHasChanges?.(changed);
    }
  }, [subject, headerId, footerId, emailStructure, originalStructure, template, onHasChanges]);

  const handleClose = () => {
    setSubject("");
    setEmailStructure(undefined);
    setOriginalStructure(undefined);
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
    if (!emailStructure) return;

    // TODO: Convert email structure to HTML
    const html = `<!-- Email Structure -->\n${JSON.stringify(emailStructure, null, 2)}`;

    upsertMutation.mutate({
      id: template.id,
      name: template.name,
      subject: subject,
      html: html,
      variables: [], // TODO: Extract variables from content blocks
      category: template.category || undefined,
      description: template.description || undefined,
      isActive: template.isActive,
      headerId: headerId,
      footerId: footerId,
    }, {
      onSuccess: () => {
        setHasChanges(false);
        handleClose();
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
              <h2 className="text-lg font-semibold text-white">{template.name}</h2>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-xs text-slate-500">
                  <span className="font-mono">{template.id}</span>
                </p>
                {template.category && (
                  <>
                    <span className="text-slate-600">•</span>
                    <p className="text-xs text-slate-400 capitalize">{template.category}</p>
                  </>
                )}
              </div>
            </div>

            {/* Subject Line - Inline in header */}
            <div className="flex items-center gap-2">
              <Label className="text-slate-400 text-xs whitespace-nowrap">Subject:</Label>
              <div className="flex-1 flex items-center gap-2">
                <Input
                  name="email-subject"
                  placeholder="e.g., Your order confirmation"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="bg-slate-900 border-slate-700 h-8 text-sm text-white flex-1"
                />
                <VariablePicker
                  onInsert={handleInsertSubjectVariable}
                  size="sm"
                />
              </div>
            </div>

            {/* Header & Footer Selection */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <Label className="text-slate-400 text-xs whitespace-nowrap">Header:</Label>
                <Select value={headerId || "none"} onValueChange={(v) => setHeaderId(v === "none" ? undefined : v)}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 h-8 text-xs text-white">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    <SelectItem value="none" className="text-white">None</SelectItem>
                    {headers.data?.filter(h => h.isActive).map(header => (
                      <SelectItem key={header.id} value={header.id} className="text-white">
                        {header.name} {header.isDefault && "(Default)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-slate-400 text-xs whitespace-nowrap">Footer:</Label>
                <Select value={footerId || "none"} onValueChange={(v) => setFooterId(v === "none" ? undefined : v)}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 h-8 text-xs text-white">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    <SelectItem value="none" className="text-white">None</SelectItem>
                    {footers.data?.filter(f => f.isActive).map(footer => (
                      <SelectItem key={footer.id} value={footer.id} className="text-white">
                        {footer.name} {footer.isDefault && "(Default)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

      {/* Email Content Builder with Preview */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "edit" | "preview")} className="h-full flex flex-col">
          <TabsContent value="edit" className="flex-1 min-h-0 overflow-hidden mt-0">
            <EmailContentBuilder
              value={emailStructure}
              onChange={setEmailStructure}
              isActive={activeTab === "edit"}
              currentStep={currentStep}
              onStepChange={setCurrentStep}
            />
          </TabsContent>

          <TabsContent value="preview" className="flex-1 min-h-0 overflow-hidden mt-0">
            <EmailPreview
              structure={emailStructure}
              subject={subject}
              headerId={headerId}
              footerId={footerId}
            />
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
            disabled={isPending || !emailStructure}
            className="flex-1 bg-purple-600 text-white hover:bg-purple-700"
          >
            {isPending ? 'Saving...' : 'Save Template'}
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

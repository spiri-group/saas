"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Trash2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { EmailTemplate } from "../types";
import UseUpsertEmailTemplate from "../hooks/UseUpsertEmailTemplate";
import UseDeleteEmailTemplate from "../hooks/UseDeleteEmailTemplate";

const metadataSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  category: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean()
});

type MetadataForm = z.infer<typeof metadataSchema>;

const CATEGORIES = [
  { value: "account", label: "Account & Authentication" },
  { value: "merchant", label: "Merchant Operations" },
  { value: "orders", label: "Orders & Payments" },
  { value: "shipping", label: "Shipping & Logistics" },
  { value: "events", label: "Tours & Events" },
  { value: "cases", label: "Case Management" },
  { value: "support", label: "Support & Notifications" },
  { value: "billing", label: "Payment & Billing" },
  { value: "marketing", label: "Marketing & Engagement" }
];

interface TemplateMetadataEditorProps {
  open: boolean;
  onClose: () => void;
  editingTemplate?: EmailTemplate | null;
}

export default function TemplateMetadataEditor({
  open,
  onClose,
  editingTemplate
}: TemplateMetadataEditorProps) {
  const [deleteDialog, setDeleteDialog] = useState(false);

  const upsertMutation = UseUpsertEmailTemplate();
  const deleteMutation = UseDeleteEmailTemplate();

  const isEditing = !!editingTemplate;

  // Handle Escape key to close editor
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deleteDialog) {
        event.preventDefault();
        handleClose();
      }
    };

    if (open) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, deleteDialog]);

  const form = useForm<MetadataForm>({
    resolver: zodResolver(metadataSchema),
    defaultValues: {
      name: "",
      category: "",
      description: "",
      isActive: true
    }
  });

  // Helper function to generate ID from display name
  const generateId = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .trim()
      .replace(/\s+/g, '-'); // Replace spaces with hyphens (kebab-case)
  };

  // Reset form when editingTemplate changes
  useEffect(() => {
    if (editingTemplate) {
      form.reset({
        name: editingTemplate.name,
        category: editingTemplate.category || "",
        description: editingTemplate.description || "",
        isActive: editingTemplate.isActive
      });
    } else {
      form.reset({
        name: "",
        category: "",
        description: "",
        isActive: true
      });
    }
  }, [editingTemplate, form]);

  const handleClose = () => {
    form.reset();
    setDeleteDialog(false);
    onClose();
  };

  const onSubmit = (data: MetadataForm) => {
    // Generate ID from name (or use existing ID if editing)
    const templateId = editingTemplate?.id || generateId(data.name);

    // For new templates, create with empty content that will be configured later
    // For existing templates, preserve existing content
    upsertMutation.mutate({
      id: templateId,
      name: data.name,
      subject: editingTemplate?.subject || "",
      html: editingTemplate?.html || "",
      variables: editingTemplate?.variables || [],
      category: data.category || undefined,
      description: data.description || undefined,
      isActive: data.isActive
    }, {
      onSuccess: () => {
        handleClose();
      }
    });
  };

  const handleDelete = () => {
    if (editingTemplate) {
      deleteMutation.mutate(editingTemplate.id, {
        onSuccess: () => {
          handleClose();
        }
      });
    }
  };

  const isPending = upsertMutation.isPending || deleteMutation.isPending;

  if (!open) return null;

  return (
    <>
      <div className="w-96 border-l border-slate-800 bg-slate-950 p-6 flex flex-col max-h-screen">
        <div className="space-y-6 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {isEditing ? 'Edit Template' : 'Create Template'}
              </h2>
              <p className="text-sm text-slate-400">
                {isEditing
                  ? 'Update template metadata'
                  : 'Step 1: Basic information'
                }
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="h-4 w-4 text-slate-400" />
            </button>
          </div>

          {isEditing && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 mb-4">
              <p className="text-xs text-slate-400">
                Template ID: <span className="font-mono text-slate-300">{editingTemplate.id}</span>
              </p>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => {
                  const previewId = !isEditing && field.value ? generateId(field.value) : null;

                  return (
                    <FormItem>
                      <FormLabel className="text-slate-300">Template Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Refund Approved"
                          {...field}
                          disabled={isEditing}
                          autoFocus={!isEditing}
                        />
                      </FormControl>
                      {!isEditing && previewId && (
                        <div className="mt-2 bg-purple-500/10 border border-purple-500/20 rounded px-2 py-1.5">
                          <p className="text-xs text-purple-300">
                            ID: <span className="font-mono text-purple-200">{previewId}</span>
                          </p>
                        </div>
                      )}
                      <FormDescription className="text-xs text-slate-500">
                        {isEditing
                          ? 'Template name is locked after creation'
                          : 'The ID will be auto-generated from this name'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="When is this template used?"
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-slate-500">
                      Optional description to help staff understand when to use this template
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-700 p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-slate-300">Active</FormLabel>
                      <FormDescription className="text-xs text-slate-500">
                        Enable this template for use in the system
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {!isEditing && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <p className="text-xs text-blue-400">
                    💡 After creating the template, click &quot;Configure Content&quot; to set up the email subject, variables, and HTML.
                  </p>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <Button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 border border-slate-600 text-slate-300 bg-transparent hover:bg-slate-800"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 bg-purple-600 text-white hover:bg-purple-700"
                >
                  {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Template'}
                </Button>
              </div>

              {isEditing && (
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDeleteDialog(true)}
                    disabled={isPending}
                    className="w-full border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Template
                  </Button>
                </div>
              )}
            </form>
          </Form>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Email Template
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              <p className="text-slate-300">
                Are you sure you want to delete{' '}
                <strong className="text-white">&quot;{editingTemplate?.name}&quot;</strong>?
              </p>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <p className="text-amber-400 text-sm font-medium mb-2">⚠️ Warning</p>
                <p className="text-amber-300/90 text-sm">
                  If this template is currently being used in your system, deleting it may cause issues with sending emails.
                  Please ensure this template is not actively referenced before proceeding.
                </p>
              </div>
              <p className="text-red-400 font-semibold text-sm">
                This action cannot be undone.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialog(false)}
              disabled={isPending}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {isPending ? 'Deleting...' : 'Delete Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

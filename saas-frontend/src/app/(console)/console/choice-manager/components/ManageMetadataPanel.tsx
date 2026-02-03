"use client";
import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Settings, X, Edit } from "lucide-react";
import MetadataFieldEditor from "./MetadataFieldEditor";
import {
  Form} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { metadata_schema_type, metadata_field_type } from "@/utils/spiriverse";

const metadataSchemaForm = z.object({
  fields: z.array(z.object({
    id: z.string().min(1, "Field ID is required"),
    name: z.string().min(1, "Field name is required"),
    type: z.enum(['TEXT', 'NUMBER', 'BOOLEAN', 'DATE', 'PERCENTAGE', 'CURRENCY']),
    required: z.boolean()
  }))
});

type MetadataSchemaForm = z.infer<typeof metadataSchemaForm>;
type MetadataFieldForm = {
  id: string;
  name: string;
  type: metadata_field_type;
  required: boolean;
};

type EditingFieldState = {
  field: MetadataFieldForm;
  index: number;
  isNew: boolean;
  actualFieldId?: string;
};

const FIELD_TYPE_OPTIONS: { value: metadata_field_type; label: string }[] = [
  { value: 'TEXT', label: 'Text' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'BOOLEAN', label: 'Boolean' },
  { value: 'DATE', label: 'Date' },
  { value: 'PERCENTAGE', label: 'Percentage' },
  { value: 'CURRENCY', label: 'Currency' }
];

interface ManageMetadataPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSchema?: metadata_schema_type;
  onSave: (schema: metadata_schema_type) => void;
}


export default function ManageMetadataPanel({
  open,
  onOpenChange,
  currentSchema,
  onSave
}: ManageMetadataPanelProps) {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<EditingFieldState | null>(null);

  const form = useForm<MetadataSchemaForm>({
    resolver: zodResolver(metadataSchemaForm),
    defaultValues: {
      fields: currentSchema?.fields || []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "fields"
  });



  const addField = () => {
    const newField: MetadataFieldForm = {
      id: '',
      name: '',
      type: 'TEXT' as const,
      required: false
    };

    setEditingField({ field: newField, index: -1, isNew: true });
    setEditModalOpen(true);
  };

  const editField = (index: number) => {
    const field = fields[index];
    const schemaField = currentSchema?.fields[index];
    setEditingField({ field, index, isNew: false, actualFieldId: schemaField?.id });
    setEditModalOpen(true);
  };

  const handleRemoveField = (index: number) => {
    const currentFields = form.getValues('fields');
    const updatedFields = currentFields.filter((_, i) => i !== index);

    const schema: metadata_schema_type = {
      fields: updatedFields
    };

    onSave(schema);
    remove(index);
  };

  const handleSaveFieldModal = (data: MetadataFieldForm) => {
    if (!editingField) return;

    const currentFields = form.getValues('fields');
    let updatedFields;

    if (editingField.isNew) {
      // Add new field
      updatedFields = [...currentFields, data];
      append(data);
    } else {
      // Update existing field
      updatedFields = currentFields.map((field, i) =>
        i === editingField.index ? data : field
      );
      form.setValue(`fields.${editingField.index}`, data);
    }

    // Save to database
    const schema: metadata_schema_type = {
      fields: updatedFields
    };

    onSave(schema);

    // Close modal
    setEditModalOpen(false);
    setEditingField(null);
  };

  const handleCancelModal = () => {
    setEditModalOpen(false);
    setEditingField(null);
  };

  const handleClose = () => {
    form.reset();
    setEditModalOpen(false);
    setEditingField(null);
    onOpenChange(false);
  };
  
  if (!open) return null;

  return (
    <div className="w-80 border-l border-slate-800 bg-slate-950 p-6 flex flex-col h-full">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Manage Metadata</span>
            </h2>
            <p className="text-sm text-slate-400">
              Define custom fields for your categories
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0 hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form */}
        <Form {...form}>
          <div className="flex-1 flex flex-col space-y-6">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-slate-300">Schema Fields</h3>
                <Button
                  type="button"
                  onClick={addField}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Field
                </Button>
              </div>

              {/* Fields List */}
              <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
                {!currentSchema?.fields || currentSchema.fields.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Settings className="h-12 w-12 mx-auto mb-3 text-slate-600" />
                    <p className="text-sm mb-3">No fields defined</p>
                    <Button
                      type="button"
                      onClick={addField}
                      size="sm"
                      className="text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add First Field
                    </Button>
                  </div>
                ) : (
                  currentSchema.fields.map((field, index) => (
                    <div key={field.id || index} className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-white">{field.name || 'Unnamed Field'}</span>
                            {field.required && (
                              <span className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">Required</span>
                            )}
                          </div>
                          <div className="flex items-center space-x-3 mt-1">
                            <span className="text-xs text-slate-400 font-mono" title={`Full ID: ${field.id}`}>
                              {field.id || 'no-id'}
                            </span>
                            <span className="text-xs text-slate-500">•</span>
                            <span className="text-xs text-slate-400">
                              {FIELD_TYPE_OPTIONS.find(opt => opt.value === field.type)?.label || field.type}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => editField(index)}
                            className="h-8 w-8 p-0 hover:bg-slate-700"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveField(index)}
                            className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Form>
      </div>

      {/* Metadata Field Editor */}
      <MetadataFieldEditor
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        field={editingField?.field || null}
        actualFieldId={editingField?.actualFieldId}
        isNew={editingField?.isNew || false}
        onSave={handleSaveFieldModal}
        onCancel={handleCancelModal}
      />
    </div>
  );
}
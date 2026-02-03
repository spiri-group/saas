"use client";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { metadata_field_type } from "@/utils/spiriverse";

const metadataFieldSchema = z.object({
  id: z.string().min(1, "Field ID is required"),
  name: z.string().min(1, "Field name is required"),
  type: z.enum(['TEXT', 'NUMBER', 'BOOLEAN', 'DATE', 'PERCENTAGE', 'CURRENCY']),
  required: z.boolean()
});

type MetadataFieldForm = z.infer<typeof metadataFieldSchema>;

interface MetadataFieldEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field?: MetadataFieldForm | null;
  actualFieldId?: string;
  isNew?: boolean;
  onSave: (field: MetadataFieldForm) => void;
  onCancel: () => void;
}

const FIELD_TYPE_OPTIONS: { value: metadata_field_type; label: string; description: string }[] = [
  { value: 'TEXT', label: 'Text', description: 'Simple text input' },
  { value: 'NUMBER', label: 'Number', description: 'Numeric input' },
  { value: 'BOOLEAN', label: 'Boolean', description: 'True/false toggle' },
  { value: 'DATE', label: 'Date', description: 'Date picker' },
  { value: 'PERCENTAGE', label: 'Percentage', description: 'Percentage with % symbol' },
  { value: 'CURRENCY', label: 'Currency', description: 'Currency amount with symbol' }
];

export default function MetadataFieldEditor({
  open,
  onOpenChange,
  field,
  actualFieldId,
  isNew = false,
  onSave,
  onCancel
}: MetadataFieldEditorProps) {
  const isEditing = !isNew;

  const form = useForm<MetadataFieldForm>({
    resolver: zodResolver(metadataFieldSchema),
    defaultValues: field || {
      id: '',
      name: '',
      type: 'TEXT' as const,
      required: false
    }
  });

  const generateFieldId = (name: string): string => {
    return name.toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  const handleSubmit = (data: MetadataFieldForm) => {
    // Generate ID if it's a new field and no ID is provided
    if (!data.id && data.name) {
      data.id = generateFieldId(data.name);
    }

    onSave(data);
  };

  const handleCancel = () => {
    form.reset();
    onCancel();
  };

  // Reset form when field prop changes
  React.useEffect(() => {
    if (field) {
      form.reset(field);
    } else {
      form.reset({
        id: '',
        name: '',
        type: 'TEXT' as const,
        required: false
      });
    }
  }, [field, form]);

  // Auto-generate ID for new fields when name changes
  React.useEffect(() => {
    if (isNew) {
      const subscription = form.watch((value, { name: fieldName }) => {
        if (fieldName === 'name' && value.name) {
          const generatedId = generateFieldId(value.name);
          form.setValue('id', generatedId);
        }
      });
      return () => subscription.unsubscribe();
    }
  }, [form, isNew]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Field' : 'Add New Field'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the metadata field configuration.'
              : 'Define a new metadata field for your categories.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-slate-300">Field Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., Priority"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="id"
              render={({ field: formField }) => (
                <FormItem>
                  <FormLabel className="text-sm text-slate-300">
                    {isNew ? 'Field ID (auto-generated)' : 'Field ID'}
                  </FormLabel>
                  <div className="rounded-md border border-slate-700 bg-slate-900/50 px-3 py-2">
                    <span className="font-mono text-sm text-slate-400">
                      {isNew
                        ? (formField.value || 'Will be generated from field name')
                        : (actualFieldId || 'no-id')
                      }
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Use this ID to reference the field in your code
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-slate-300">Data Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FIELD_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex flex-col">
                            <span>{option.label}</span>
                            <span className="text-xs text-slate-500">{option.description}</span>
                          </div>
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
              name="required"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-3 gap-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm text-slate-300">Required Field</FormLabel>
                    <p className="text-xs text-slate-400">
                      Make this field mandatory for all categories
                    </p>
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Switch
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          console.log('Switch toggled:', checked);
                          field.onChange(checked);
                        }}
                        className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-slate-600 [&>span]:bg-white [&>span]:border [&>span]:border-slate-300"
                      />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="flex-row gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button type="submit">
                {isEditing ? 'Save Changes' : 'Add Field'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
"use client";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
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
import { choice_option_type, RecordStatus, Locale } from "@/utils/spiriverse";

const optionSchema = z.object({
  id: z.string().min(1, "Option ID is required"),
  enLabel: z.string().min(1, "English label is required")
});

type OptionForm = z.infer<typeof optionSchema>;

interface AddOptionPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  configId: string;
  editingOption?: choice_option_type | null;
  isEditing?: boolean;
  onSave: (option: choice_option_type) => void;
}

export default function AddOptionPanel({
  open,
  onOpenChange,
  editingOption,
  isEditing = false,
  onSave
}: AddOptionPanelProps) {

  const form = useForm<OptionForm>({
    resolver: zodResolver(optionSchema),
    defaultValues: {
      id: "",
      enLabel: ""
    }
  });

  // Reset form when editingOption changes
  useEffect(() => {
    if (editingOption) {
      // Try to get English localization, fallback to defaultLabel
      const enLabel = editingOption.localizations.find(l => l.locale === Locale.EN)?.value || editingOption.defaultLabel || "";
      form.reset({
        id: editingOption.id,
        enLabel: enLabel
      });
    } else {
      form.reset({
        id: "",
        enLabel: ""
      });
    }
  }, [editingOption, form]);

  const generateId = (label: string): string => {
    return label
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '') // Remove special characters except spaces
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
  };

  const handleLabelChange = (value: string) => {
    form.setValue("enLabel", value);
    // Auto-generate ID if not editing an existing option
    if (!isEditing) {
      const generatedId = generateId(value);
      form.setValue("id", generatedId);
      // Trigger validation for the ID field
      form.trigger("id");
    }
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  const onSubmit = (data: OptionForm) => {
    const option: choice_option_type = {
      id: data.id,
      defaultLabel: data.enLabel,
      status: RecordStatus.ACTIVE, // Always start as ACTIVE
      localizations: [
        {
          locale: Locale.EN,
          value: data.enLabel
        }
      ]
    };

    onSave(option);
    handleClose();
  };

  const isValid = form.formState.isValid;

  if (!open) return null;

  return (
    <div className="w-80 border-l border-slate-800 bg-slate-950 p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {isEditing ? 'Edit Option' : 'Add Option'}
            </h2>
            <p className="text-sm text-slate-400">
              {isEditing
                ? `Editing "${editingOption?.defaultLabel}"`
                : 'Create a new choice option'
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="enLabel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">English Label</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., House Haunting"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleLabelChange(e.target.value);
                      }}
                      onPaste={(e) => {
                        // Delay to ensure paste content is processed
                        setTimeout(() => {
                          const target = e.target as HTMLInputElement;
                          field.onChange({ target: { value: target.value } });
                          handleLabelChange(target.value);
                          // Trigger validation to update isValid state
                          form.trigger();
                        }, 0);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Generated ID</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="font-mono bg-slate-800 text-slate-400"
                      disabled={isEditing} // Don't allow ID changes when editing
                      readOnly={!isEditing} // Make it read-only for new items to show auto-generation
                    />
                  </FormControl>
                  {isEditing && (
                    <p className="text-xs text-amber-400 mt-1">
                      ⚠️ ID cannot be changed after creation. To change the ID, delete this option and create a new one.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />


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
                disabled={!isValid}
                className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
              >
                {isEditing ? 'Save Changes' : 'Add Option'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
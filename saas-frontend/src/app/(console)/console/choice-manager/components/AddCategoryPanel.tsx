"use client";
import { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import ComboBox from "@/components/ux/ComboBox";
import PercentageInput from "@/components/ux/PercentageInput";
import CurrencyInput from "@/components/ux/CurrencyInput";
import UseCreateCategory from "../hooks/UseCreateCategory";
import UseUpdateCategory from "../hooks/UseUpdateCategory";
import UseChoiceRootNodes from "../hooks/UseChoiceRootNodes";
import { choice_node_type, recordref_type, choice_config_type } from "@/utils/spiriverse";

type PositionType = 'AT_START' | 'BEFORE' | 'AFTER' | 'AT_END';

const categorySchema = z.object({
  defaultLabel: z.string().min(1, "Category name is required"),
  icon: z.string().optional(),
  metadata: z.record(z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.date(),
    z.object({ // for currency amounts
      amount: z.number(),
      currency: z.string()
    })
  ])).optional(),
  placement: z.object({
    type: z.enum(['AT_START', 'BEFORE', 'AFTER', 'AT_END']),
    referenceNodeId: z.string().optional()
  }).refine((data) => {
    // If placement is 'before' or 'after', referenceNodeId is required
    if ((data.type === 'BEFORE' || data.type === 'AFTER') && !data.referenceNodeId) {
      return false;
    }
    return true;
  }, {
    message: "Reference node is required for 'before' and 'after' placement",
    path: ["referenceNodeId"]
  })
});

type CategoryForm = z.infer<typeof categorySchema>;

const PLACEMENT_OPTIONS: { value: PositionType; label: string }[] = [
  { value: 'AT_START', label: 'At start' },
  { value: 'BEFORE', label: 'Before' },
  { value: 'AFTER', label: 'After' },
  { value: 'AT_END', label: 'At end' }
];

interface AddCategoryPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  configRef: recordref_type;
  config: choice_config_type;
  parentNode?: choice_node_type | null;
  editingNode?: choice_node_type | null;
  isEditing?: boolean;
}

export default function AddCategoryPanel({
  open,
  onOpenChange,
  configRef,
  config,
  parentNode,
  editingNode,
  isEditing = false
}: AddCategoryPanelProps) {
  const [selectedPlacement, setSelectedPlacement] = useState<PositionType>('AT_END');
  
  const { data: choiceRootNodes } = UseChoiceRootNodes(configRef);
  
  // Get sibling nodes for the reference selection, sorted by sortOrder
  const siblingNodes = (parentNode?.children?.filter(node => node.id !== editingNode?.id) ||
    (choiceRootNodes && !parentNode ? choiceRootNodes.filter(node => node.id !== editingNode?.id) : []))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const form = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      defaultLabel: "",
      icon: "",
      metadata: {},
      placement: {
        type: 'AT_END',
        referenceNodeId: undefined
      }
    }
  });

  // Reset form when editingNode changes
  useEffect(() => {
    if (editingNode) {
      form.reset({
        defaultLabel: editingNode.label,
        icon: editingNode.icon || "",
        metadata: editingNode.metadata || {},
        placement: {
          type: 'AT_END',
          referenceNodeId: undefined
        }
      });
    } else {
      form.reset({
        defaultLabel: "",
        icon: "",
        metadata: {},
        placement: {
          type: 'AT_END',
          referenceNodeId: undefined
        }
      });
    }
    setSelectedPlacement('AT_END');
  }, [editingNode, form]);

  const handleClose = () => {
    form.reset();
    setSelectedPlacement('AT_END');
    onOpenChange(false);
  };
  
  // Update form when placement type changes
  const handlePlacementChange = (placement: PositionType) => {
    setSelectedPlacement(placement);
    const currentFormValue = form.getValues('placement');
    form.setValue('placement', {
      type: placement,
      referenceNodeId: (placement === 'BEFORE' || placement === 'AFTER') ? currentFormValue.referenceNodeId : undefined
    });
  };

  const createMutation = UseCreateCategory(configRef, handleClose);
  const updateMutation = UseUpdateCategory(configRef, handleClose);


  const sanitizeMetadata = (metadata?: Record<string, any>) => {
    if (!metadata) return undefined;
    const sanitized: Record<string, string | number | boolean | Date> = {};
    Object.entries(metadata).forEach(([key, value]) => {
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        value instanceof Date
      ) {
        sanitized[key] = value;
      } else if (
        value &&
        typeof value === "object" &&
        "amount" in value &&
        "currency" in value
      ) {
        sanitized[key] = `${value.amount} ${value.currency}`;
      }
    });
    return sanitized;
  };

  const onSubmit = (data: CategoryForm) => {
    const sanitizedMetadata = sanitizeMetadata(data.metadata);
    if (isEditing && editingNode) {
      updateMutation.mutate({
        id: editingNode.id,
        input: {
          defaultLabel: data.defaultLabel,
          icon: data.icon,
          metadata: sanitizedMetadata
        }
      });
    } else {
      createMutation.mutate({
        defaultLabel: data.defaultLabel,
        parentRef: parentNode ? parentNode.ref : undefined,
        icon: data.icon,
        metadata: sanitizedMetadata,
        placement: data.placement
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isValid = form.formState.isValid;

  if (!open) return null;

  return (
    <div className="w-80 border-l border-slate-800 bg-slate-950 p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {isEditing ? 'Edit Category' : 'Add Category'}
            </h2>
            <p className="text-sm text-slate-400">
              {isEditing 
                ? `Editing "${editingNode?.label}"`
                : parentNode 
                  ? `Adding child to "${parentNode.label}"` 
                  : 'Adding root category'
              }
              {!isEditing && siblingNodes.length > 0 && (
                <span className="block mt-1">
                  {siblingNodes.length} existing {siblingNodes.length === 1 ? 'category' : 'categories'}
                </span>
              )}
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
              name="defaultLabel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Category Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter category name"
                      {...field}
                      onPaste={(e) => {
                        // Delay to ensure paste content is processed
                        setTimeout(() => {
                          const target = e.target as HTMLInputElement;
                          field.onChange({ target: { value: target.value } });
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
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Icon (optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter icon name" 
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Metadata Fields Section */}
            {config.metadataSchema && config.metadataSchema.fields.length > 0 && (
              <div className="space-y-4">
                <div className="pt-4 border-t border-slate-700">
                  <h3 className="text-sm font-medium text-slate-300 mb-3">Metadata</h3>
                  <div className="space-y-3">
                    {config.metadataSchema.fields.map((fieldSchema) => (
                      <FormField
                        key={fieldSchema.id}
                        control={form.control}
                        name={`metadata.${fieldSchema.id}`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-300">
                              {fieldSchema.name}
                              {fieldSchema.required && <span className="text-red-400 ml-1">*</span>}
                            </FormLabel>
                            <FormControl>
                              {fieldSchema.type === 'TEXT' ? (
                                <Input
                                  placeholder={`Enter ${fieldSchema.name.toLowerCase()}`}
                                  value={typeof field.value === 'string' || typeof field.value === 'number'
                                    ? field.value
                                    : ''}
                                  onChange={field.onChange}
                                />
                              ) : fieldSchema.type === 'NUMBER' ? (
                                <Input
                                  type="number"
                                  placeholder={`Enter ${fieldSchema.name.toLowerCase()}`}
                                  value={
                                    typeof field.value === 'string' || typeof field.value === 'number'
                                      ? field.value
                                      : ''
                                  }
                                  onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                />
                              ) : fieldSchema.type === 'BOOLEAN' ? (
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    checked={Boolean(field.value)}
                                    onCheckedChange={field.onChange}
                                  />
                                  <span className="text-sm text-slate-400">
                                    {field.value ? 'Yes' : 'No'}
                                  </span>
                                </div>
                              ) : fieldSchema.type === 'DATE' ? (
                                <Input
                                  type="date"
                                  value={
                                    field.value &&
                                    typeof field.value !== 'boolean' &&
                                    (typeof field.value === 'string' ||
                                     typeof field.value === 'number' ||
                                     field.value instanceof Date)
                                      ? new Date(field.value).toISOString().split('T')[0]
                                      : ''
                                  }
                                  onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : '')}
                                />
                              ) : fieldSchema.type === 'PERCENTAGE' ? (
                                <PercentageInput
                                  value={typeof field.value === 'number' ? field.value : 0}
                                  onChange={field.onChange}
                                  placeholder={`Enter ${fieldSchema.name.toLowerCase()}`}
                                  glass={false}
                                />
                              ) : fieldSchema.type === 'CURRENCY' ? (
                                <CurrencyInput
                                  value={
                                    field.value && typeof field.value === 'object' && 'amount' in field.value
                                      ? field.value
                                      : { amount: 0, currency: 'USD' }
                                  }
                                  onChange={({ amount, currency }) =>
                                    field.onChange({ amount, currency })
                                  }
                                  placeholder={`Enter ${fieldSchema.name.toLowerCase()}`}
                                  glass={false}
                                />
                              ) : null}
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!isEditing && (
              <FormField
                  control={form.control}
                  name="placement.type"
                  render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Position</FormLabel>
                    <FormControl>
                      <ComboBox
                        items={PLACEMENT_OPTIONS}
                        value={PLACEMENT_OPTIONS.find(opt => opt.value === selectedPlacement)}
                        onChange={(item) => {
                          field.onChange(item.value);
                          handlePlacementChange(item.value);
                        }}
                        fieldMapping={{
                          labelColumn: 'label',
                          keyColumn: 'value'
                        }}
                        placeholder="Select position"
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />)}

              {(selectedPlacement === 'BEFORE' || selectedPlacement === 'AFTER') && siblingNodes.length > 0 && (
                <FormField
                  control={form.control}
                  name="placement.referenceNodeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">
                        {selectedPlacement === 'BEFORE' ? 'Before which category?' : 'After which category?'}
                      </FormLabel>
                      <FormControl>
                        <ComboBox
                          items={siblingNodes}
                          value={siblingNodes.find(node => node.id === field.value)}
                          onChange={(item) => {
                            field.onChange(item.id);
                          }}
                          fieldMapping={{
                            labelColumn: 'label',
                            keyColumn: 'id'
                          }}
                          placeholder={`Select a category`}
                          className="w-full"
                          withSearch={siblingNodes.length > 5}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                disabled={!isValid || isPending}
                className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
              >
                {isPending 
                  ? 'Saving...' 
                  : isEditing 
                    ? 'Save Changes' 
                    : 'Add Category'
                }
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
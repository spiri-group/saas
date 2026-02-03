"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import UseCreateChoiceConfig from "../hooks/UseCreateChoiceConfig";

const newConfigSchema = z.object({
  label: z.string().min(1, "Label is required"),
  kind: z.enum(["FLAT", "HIERARCHICAL"], {
    required_error: "Please select a configuration type",
  }),
  backing: z.string().min(1, "Backing identifier is required"),
});

type NewConfigFormData = z.infer<typeof newConfigSchema>;

interface NewConfigurationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NewConfigurationModal({ open, onOpenChange }: NewConfigurationModalProps) {
  const [isBackingManuallyEdited, setIsBackingManuallyEdited] = useState(false);
  const createConfigMutation = UseCreateChoiceConfig();

  const form = useForm<NewConfigFormData>({
    resolver: zodResolver(newConfigSchema),
    defaultValues: {
      label: "",
      kind: "FLAT",
      backing: "",
    },
  });

  // Helper function to generate backing from label
  const generateBacking = (label: string): string => {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters except spaces
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  };

  const handleLabelChange = (value: string) => {
    form.setValue("label", value);
    // Only auto-generate backing if it hasn't been manually edited
    if (!isBackingManuallyEdited) {
      form.setValue("backing", generateBacking(value));
    }
  };

  const handleBackingChange = (value: string) => {
    setIsBackingManuallyEdited(true);
    form.setValue("backing", value);
  };

  const onSubmit = async (data: NewConfigFormData) => {
    try {
      await createConfigMutation.mutateAsync({
        id: data.backing, // The backing field is now the ID
        label: data.label,
        kind: data.kind,
      });
      
      // Reset form and close modal
      form.reset();
      setIsBackingManuallyEdited(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create config:', error);
    }
  };

  const handleClose = () => {
    form.reset();
    setIsBackingManuallyEdited(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Configuration</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter configuration label" 
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleLabelChange(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="kind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select configuration type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="FLAT">Flat List</SelectItem>
                      <SelectItem value="HIERARCHICAL">Hierarchical</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="backing"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Internal ID</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Auto-generated from label (editable)" 
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleBackingChange(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Used internally to identify this configuration. Auto-generated from label but can be customized.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button"
                variant="outline" 
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={!form.formState.isValid || createConfigMutation.isPending}
              >
                {createConfigMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
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
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PercentageInput from "@/components/ux/PercentageInput";
import CurrencyInput from "@/components/ux/CurrencyInput";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FeeConfig } from "../FeesManager";
import UseUpdateFees from "../hooks/UseUpdateFees";

const feeSchema = z.object({
  key: z.string().min(1, "Fee key is required").regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens allowed"),
  percent: z.number().min(0, "Percentage must be 0 or greater").max(1, "Percentage must be 1 (100%) or less"),
  fixed: z.number().min(0, "Fixed amount must be 0 or greater"),
  currency: z.string().min(3, "Currency code is required").max(3, "Currency code must be 3 characters")
}).refine((data) => data.percent > 0 || data.fixed > 0, {
  message: "Either percentage or fixed amount must be greater than 0",
  path: ["percent"]
});

type FeeForm = z.infer<typeof feeSchema>;

const CURRENCIES = [
  { value: "AUD", label: "AUD - Australian Dollar" },
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "JPY", label: "JPY - Japanese Yen" },
];

interface FeeEditorProps {
  open: boolean;
  onClose: () => void;
  editingFee?: { key: string; config: FeeConfig } | null;
}

export default function FeeEditor({
  open,
  onClose,
  editingFee
}: FeeEditorProps) {
  const [deleteDialog, setDeleteDialog] = useState(false);
  const { updateFee, deleteFee } = UseUpdateFees();

  const isEditing = !!editingFee;

  const form = useForm<FeeForm>({
    resolver: zodResolver(feeSchema),
    defaultValues: {
      key: "",
      percent: 0,
      fixed: 0,
      currency: "AUD"
    }
  });

  // Reset form when editingFee changes
  useEffect(() => {
    if (editingFee) {
      form.reset({
        key: editingFee.key,
        percent: editingFee.config.percent,
        fixed: editingFee.config.fixed || 0, // Fixed is already in smallest units from backend
        currency: editingFee.config.currency
      });
    } else {
      form.reset({
        key: "",
        percent: 0,
        fixed: 0,
        currency: "AUD"
      });
    }
  }, [editingFee, form]);

  const handleClose = () => {
    form.reset();
    setDeleteDialog(false);
    onClose();
  };

  const onSubmit = (data: FeeForm) => {
    updateFee.mutate({
      key: data.key,
      config: {
        percent: data.percent,
        fixed: data.fixed,
        currency: data.currency
      }
    }, {
      onSuccess: () => {
        handleClose();
      }
    });
  };

  const handleDelete = () => {
    if (editingFee) {
      deleteFee.mutate({ key: editingFee.key }, {
        onSuccess: () => {
          handleClose();
        }
      });
    }
  };

  const isValid = form.formState.isValid;
  const isPending = updateFee.isPending || deleteFee.isPending;

  if (!open) return null;

  return (
    <>
      <div className="w-80 border-l border-slate-800 bg-slate-950 p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {isEditing ? 'Edit Fee Configuration' : 'Add Fee Configuration'}
              </h2>
              <p className="text-sm text-slate-400">
                {isEditing
                  ? `Editing "${editingFee?.key}"`
                  : 'Create a new fee configuration'
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
                name="key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Fee Key</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., product-purchase-100"
                        {...field}
                        className="font-mono"
                        disabled={isEditing} // Don't allow key changes when editing
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
                    <FormDescription className="text-xs text-slate-500">
                      Unique identifier for this fee type (lowercase, hyphens allowed)
                    </FormDescription>
                    {isEditing && (
                      <p className="text-xs text-amber-400 mt-1">
                        ⚠️ Key cannot be changed after creation. To change the key, delete this fee and create a new one.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Fee Percentage</FormLabel>
                    <FormControl>
                      <PercentageInput
                        placeholder="5"
                        value={field.value}
                        onChange={field.onChange}
                        min={0}
                        max={100}
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-slate-500">
                      Optional percentage fee (e.g., 5% for 5%, 8% for 8%)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fixed"
                render={({ field }) => {
                  const currentCurrency = form.watch("currency");
                  const currencyValue = {
                    amount: field.value || 0, // CurrencyInput expects smallest units
                    currency: currentCurrency
                  };

                  return (
                    <FormItem>
                      <FormLabel className="text-slate-300">Fixed Amount</FormLabel>
                      <FormControl>
                        <CurrencyInput
                          placeholder="2.50"
                          value={currencyValue}
                          glass={false}
                          onChange={({ amount }) => {
                            // CurrencyInput handles smallest units internally
                            field.onChange(amount || 0);
                          }}
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-slate-500">
                        Optional fixed fee amount (e.g., 2.50 for $2.50)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Currency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CURRENCIES.map((currency) => (
                          <SelectItem key={currency.value} value={currency.value}>
                            {currency.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                  disabled={!isValid || isPending}
                  className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                >
                  {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Fee'}
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
                    Delete Fee Configuration
                  </Button>
                </div>
              )}
            </form>
          </Form>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Fee Configuration</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the fee configuration for{' '}
              <strong>&quot;{editingFee?.key}&quot;</strong>?
              <br />
              <br />
              <span className="text-red-600 font-medium">This action cannot be undone.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialog(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Gift, Package, AlertTriangle, Plus, Minus } from "lucide-react";
import { UseInventoryAdjustment } from "../_hooks/UseInventoryAdjustment";
import { toast } from "sonner";

interface InventoryAdjustmentDialogProps {
  merchantId: string;
  variantId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function InventoryAdjustmentDialog({
  merchantId,
  variantId,
  open,
  onOpenChange,
}: InventoryAdjustmentDialogProps) {
  const { form, mutation } = UseInventoryAdjustment(merchantId);

  // Set variant ID when dialog opens with a specific variant
  useEffect(() => {
    if (open && variantId) {
      form.setValue("variant_id", variantId);
    }
  }, [open, variantId, form]);

  const onSubmit = async (data: any) => {
    try {
      const result = await mutation.mutateAsync(data);
      toast.success(result.message);
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast.error(error.message || "Failed to adjust inventory");
    }
  };

  const reasonOptions = [
    { value: "RESTOCK", label: "Restock", icon: Package, description: "Add new inventory" },
    { value: "GIFTED", label: "Gifted", icon: Gift, description: "Given as gift" },
    { value: "DAMAGED", label: "Damaged", icon: AlertTriangle, description: "Damaged goods" },
    { value: "LOST", label: "Lost", icon: AlertTriangle, description: "Lost inventory" },
    { value: "FOUND", label: "Found", icon: Package, description: "Found inventory" },
    { value: "CORRECTION", label: "Correction", icon: Package, description: "Correction of error" },
  ];

  const selectedReason = form.watch("reason");
  const deltaValue = form.watch("delta");

  const handleQuickAdjust = (amount: number) => {
    form.setValue("delta", amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Make Inventory Adjustment</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Variant Selection */}
            <FormField
              control={form.control}
              name="variant_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variant *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter variant ID"
                      {...field}
                      disabled={!!variantId} // Disable if variant is pre-selected
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reason Selection */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {reasonOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <option.icon className="h-4 w-4" />
                            <div>
                              <div className="font-medium">{option.label}</div>
                              <div className="text-xs text-muted-foreground">
                                {option.description}
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quantity Change */}
            <FormField
              control={form.control}
              name="delta"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity Change *</FormLabel>
                  <div className="space-y-2">
                    {/* Quick adjustment buttons */}
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAdjust(-1)}
                        className="gap-1"
                      >
                        <Minus className="h-3 w-3" />
                        -1
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAdjust(-5)}
                        className="gap-1"
                      >
                        <Minus className="h-3 w-3" />
                        -5
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAdjust(1)}
                        className="gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        +1
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAdjust(5)}
                        className="gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        +5
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAdjust(10)}
                        className="gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        +10
                      </Button>
                    </div>

                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Enter quantity change"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                        {deltaValue !== 0 && (
                          <Badge variant={deltaValue > 0 ? "default" : "destructive"}>
                            {deltaValue > 0 ? `+${deltaValue}` : deltaValue}
                          </Badge>
                        )}
                      </div>
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Recipient (for gifts) */}
            {selectedReason === "GIFTED" && (
              <FormField
                control={form.control}
                name="recipient"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipient</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Who received the gift?"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional details (optional)"
                      {...field}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="flex-1"
              >
                {mutation.isPending ? "Adjusting..." : "Make Adjustment"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { gql } from "@/lib/services/gql";

export const InventoryAdjustmentSchema = z.object({
  variant_id: z.string().min(1, "Please select a variant"),
  delta: z.number().int().refine((val) => val !== 0, "Quantity change cannot be zero"),
  reason: z.enum(["ADJUSTMENT", "GIFTED", "DAMAGED", "LOST", "FOUND", "RESTOCK", "CORRECTION"]),
  recipient: z.string().optional(),
  notes: z.string().optional(),
});

export type InventoryAdjustmentInput = z.infer<typeof InventoryAdjustmentSchema>;

interface InventoryTransaction {
  id: string;
  variant_id: string;
  product_id: string;
  vendor_id: string;
  delta: number;
  qty_before: number;
  qty_after: number;
  reason: string;
  source?: string;
  reference_id?: string;
  recipient?: string;
  notes?: string;
  created_at: string;
  created_by: string;
}

interface InventoryAlert {
  id: string;
  variant_id: string;
  alert_type: string;
  current_qty: number;
  status: string;
  created_at: string;
}

export const UseInventoryAdjustment = (merchantId: string) => {
  const queryClient = useQueryClient();

  const form = useForm<InventoryAdjustmentInput>({
    resolver: zodResolver(InventoryAdjustmentSchema),
    defaultValues: {
      variant_id: "",
      delta: 0,
      reason: "ADJUSTMENT",
      recipient: "",
      notes: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (adjustment: InventoryAdjustmentInput) => {
      const response = await gql<{
        adjustInventory: {
          code: number;
          success: boolean;
          message: string;
          transaction: InventoryTransaction;
          alert?: InventoryAlert;
        };
      }>(`
        mutation AdjustInventory($vendorId: String!, $adjustment: InventoryAdjustmentInput!) {
          adjustInventory(vendorId: $vendorId, adjustment: $adjustment) {
            code
            success
            message
            transaction {
              id
              variant_id
              product_id
              vendor_id
              delta
              qty_before
              qty_after
              reason
              source
              recipient
              notes
              created_at
              created_by
            }
            alert {
              id
              variant_id
              alert_type
              current_qty
              status
              created_at
            }
          }
        }
      `, {
        vendorId: merchantId,
        adjustment
      });
      return response.adjustInventory;
    },
    onSuccess: () => {
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["inventory-overview", merchantId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-alerts", merchantId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-transactions", merchantId] });
      queryClient.invalidateQueries({ queryKey: ["product-inventory", merchantId] });
      
      // Reset form
      form.reset();
    },
  });

  return {
    form,
    mutation,
    schema: InventoryAdjustmentSchema,
  };
};
import { useQuery } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";

interface InventoryTransaction {
  id: string;
  vendorId: string;
  product_id: string;
  variant_id: string;
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
  variant?: {
    id: string;
    name: string;
  };
  product?: {
    id: string;
    name: string;
  };
}

export const UseTransactionHistory = (
  merchantId: string, 
  variantId?: string, 
  limit: number = 50
) => {
  return useQuery({
    queryKey: ["inventory-transactions", merchantId, variantId, limit],
    queryFn: async () => {
      const response = await gql<{
        inventoryTransactions: InventoryTransaction[];
      }>(`
        query InventoryTransactions($vendorId: String!, $variantId: String, $limit: Int) {
          inventoryTransactions(vendorId: $vendorId, variantId: $variantId, limit: $limit) {
            id
            vendorId
            product_id
            variant_id
            delta
            qty_before
            qty_after
            reason
            source
            reference_id
            recipient
            notes
            created_at
            created_by
            variant {
              id
              name
            }
            product {
              id
              name
            }
          }
        }
      `, {
        vendorId: merchantId,
        ...(variantId && { variantId }),
        limit
      });
      return response.inventoryTransactions;
    },
    enabled: !!merchantId,
  });
};
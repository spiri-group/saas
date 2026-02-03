import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gql } from "@/lib/services/gql";

interface InventoryAlert {
  id: string;
  variant_id: string;
  product_id: string;
  vendor_id: string;
  alert_type: string;
  threshold?: number;
  current_qty: number;
  status: string;
  created_at: string;
  acknowledged: boolean;
  acknowledged_at?: string;
  acknowledged_by?: string;
  variant?: {
    id: string;
    name: string;
  };
  product?: {
    id: string;
    name: string;
  };
}

export const UseStockAlerts = (merchantId: string, status?: string) => {
  return useQuery({
    queryKey: ["inventory-alerts", merchantId, status],
    queryFn: async () => {
      const response = await gql<{
        inventoryAlerts: InventoryAlert[];
      }>(`
        query InventoryAlerts($vendorId: String!, $status: String) {
          inventoryAlerts(vendorId: $vendorId, status: $status) {
            id
            variant_id
            product_id
            vendor_id
            alert_type
            threshold
            current_qty
            status
            created_at
            acknowledged
            acknowledged_at
            acknowledged_by
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
        ...(status && { status })
      });
      return response.inventoryAlerts;
    },
    enabled: !!merchantId,
    refetchInterval: 60000, // Refetch every minute
  });
};

export const UseAcknowledgeAlert = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ merchantId, alertId }: { merchantId: string; alertId: string }) => {
      const response = await gql<{
        acknowledgeInventoryAlert: {
          success: boolean;
          message: string;
          alert: InventoryAlert;
        };
      }>(`
        mutation AcknowledgeInventoryAlert($vendorId: String!, $alertId: String!) {
          acknowledgeInventoryAlert(vendorId: $vendorId, alertId: $alertId) {
            success
            message
            alert {
              id
              status
              acknowledged
              acknowledged_at
              acknowledged_by
            }
          }
        }
      `, {
        vendorId: merchantId,
        alertId
      });
      return response.acknowledgeInventoryAlert;
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch alerts
      queryClient.invalidateQueries({ 
        queryKey: ["inventory-alerts", variables.merchantId] 
      });
    },
  });
};
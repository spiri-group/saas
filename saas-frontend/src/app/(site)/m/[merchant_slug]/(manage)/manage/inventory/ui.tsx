"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import withProtection from "@/components/ux/HOC/withProtection";
import HasMerchantAccess from "../../../../_hooks/HasMerchantAccess";

import InventoryOverview from "./_components/InventoryOverview";
import ProductInventoryTable from "./_components/ProductInventoryTable";
import InventoryAdjustmentDialog from "./_components/InventoryAdjustmentDialog";

interface InventoryUIProps {
  merchantId: string;
}

const InventoryUIComponent = ({ merchantId }: InventoryUIProps) => {
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  const handleAdjustInventory = (variantId?: string) => {
    setSelectedVariantId(variantId || null);
    setAdjustmentDialogOpen(true);
  };

  return (
    <div className="space-y-6 m-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory Overview</h1>
          <p className="text-muted-foreground">
            Track and manage your product inventory
          </p>
        </div>
        <Button onClick={() => handleAdjustInventory()} className="gap-2">
          <Plus className="h-4 w-4" />
          Make Adjustment
        </Button>
      </div>

      {/* Overview Cards */}
      <InventoryOverview merchantId={merchantId} />

      {/* Current Inventory Table */}
      <ProductInventoryTable 
        merchantId={merchantId}
        onAdjustInventory={handleAdjustInventory}
      />

      {/* Adjustment Dialog */}
      <InventoryAdjustmentDialog
        merchantId={merchantId}
        variantId={selectedVariantId}
        open={adjustmentDialogOpen}
        onOpenChange={setAdjustmentDialogOpen}
      />
    </div>
  );
}

const InventoryUI = withProtection<InventoryUIProps>(InventoryUIComponent, HasMerchantAccess);

export default InventoryUI;
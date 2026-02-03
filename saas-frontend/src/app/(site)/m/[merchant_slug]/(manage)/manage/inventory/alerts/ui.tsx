"use client";

import withProtection from "@/components/ux/HOC/withProtection";
import HasMerchantAccess from "../../../../../_hooks/HasMerchantAccess";
import StockAlerts from "../_components/StockAlerts";

interface AlertsUIProps {
  merchantId: string;
}

const AlertsUIComponent = ({ merchantId }: AlertsUIProps) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory Alerts</h1>
          <p className="text-muted-foreground">
            Monitor low stock and out-of-stock notifications
          </p>
        </div>
      </div>

      {/* Alerts Content */}
      <StockAlerts merchantId={merchantId} />
    </div>
  );
}

const AlertsUI = withProtection<AlertsUIProps>(AlertsUIComponent, HasMerchantAccess);

export default AlertsUI;
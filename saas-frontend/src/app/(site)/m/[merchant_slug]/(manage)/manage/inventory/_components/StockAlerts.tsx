import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle, Clock, TrendingDown } from "lucide-react";
import { UseStockAlerts, UseAcknowledgeAlert } from "../_hooks/UseStockAlerts";
import { toast } from "sonner";
import Spinner from "@/components/ui/spinner";

interface StockAlertsProps {
  merchantId: string;
}

export default function StockAlerts({ merchantId }: StockAlertsProps) {
  const [activeTab, setActiveTab] = useState("OPEN");
  
  const { data: alerts, isLoading, error } = UseStockAlerts(merchantId, activeTab);
  const acknowledgeAlert = UseAcknowledgeAlert();

  const handleAcknowledge = async (alertId: string) => {
    try {
      await acknowledgeAlert.mutateAsync({ merchantId, alertId });
      toast.success("Alert acknowledged successfully");
    } catch {
      toast.error("Failed to acknowledge alert");
    }
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'OUT_OF_STOCK':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'LOW_STOCK':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getAlertBadge = (alertType: string) => {
    switch (alertType) {
      case 'OUT_OF_STOCK':
        return <Badge variant="destructive">Out of Stock</Badge>;
      case 'LOW_STOCK':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          Low Stock
        </Badge>;
      default:
        return <Badge variant="outline">{alertType}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="destructive" className="gap-1">
          <Clock className="h-3 w-3" />
          Open
        </Badge>;
      case 'ACKED':
        return <Badge variant="secondary" className="gap-1">
          <CheckCircle className="h-3 w-3" />
          Acknowledged
        </Badge>;
      case 'CLOSED':
        return <Badge variant="default" className="gap-1">
          <CheckCircle className="h-3 w-3" />
          Closed
        </Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stock Alerts</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Spinner />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stock Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            Error loading alerts
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Stock Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="OPEN">Open</TabsTrigger>
            <TabsTrigger value="ACKED">Acknowledged</TabsTrigger>
            <TabsTrigger value="CLOSED">Closed</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {!alerts || alerts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No {activeTab.toLowerCase()} alerts
              </div>
            ) : (
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-start gap-3">
                      {getAlertIcon(alert.alert_type)}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {alert.product?.name || 'Unknown Product'}
                          </span>
                          <span className="text-muted-foreground">
                            - {alert.variant?.name || 'Unknown Variant'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          {getAlertBadge(alert.alert_type)}
                          {getStatusBadge(alert.status)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Current quantity: <span className="font-medium">{alert.current_qty}</span>
                          {alert.threshold && (
                            <> • Threshold: <span className="font-medium">{alert.threshold}</span></>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(alert.created_at).toLocaleString()}
                          {alert.acknowledged_at && (
                            <> • Acknowledged: {new Date(alert.acknowledged_at).toLocaleString()}</>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {alert.status === 'OPEN' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAcknowledge(alert.id)}
                          disabled={acknowledgeAlert.isPending}
                          className="gap-1"
                        >
                          <CheckCircle className="h-3 w-3" />
                          Acknowledge
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
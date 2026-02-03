'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import useShipments from "./_hooks/useDeliveries";
import { DateTime } from "luxon";
import DeliveryDialog from "./_components/DeliveryDialog";
import TrackingStatusBadge from "./_components/TrackingStatusBadge";
import { OverrideShippingStatusButton } from "./_components/OverrideDeliveryStatus";
import { ArchiveDeliveryButton } from "./_components/ArchiveDelivery";

type Props = {
  merchantId: string;
};

function DeliveriesLayout({ merchantId }: Props) {
  const { data: shipments, isLoading } = useShipments({ merchantId });

  const [selectedDelivery, setSelectedDelivery] = useState<{
    id: string;
    orderRef: { id: string; partition: string };
  } | null>(null);

  return (
    <div className="flex flex-col h-screen p-4 space-y-4">
      <h1 className="text-2xl font-bold">Deliveries</h1>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 overflow-auto">
          {shipments?.map((shipment) => (
            <Card key={shipment.id}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold">
                  {shipment.code}
                </CardTitle>
                <div className="flex flex-row gap-2">
                <TrackingStatusBadge
                      event={shipment.trackingStatus}
                    />
                <OverrideShippingStatusButton 
                  orderRef={shipment.orderRef!}
                  shipmentId={shipment.id}
                  currentStatusCode={shipment.trackingStatus?.status_code}
                  variant="ghost"
                  size="xs"
                />
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Carrier:</span>{" "}
                  {shipment.carrierInfo?.name} ({shipment.carrierInfo?.service?.name})
                </div>
                <div>
                  <span className="font-medium">Status:</span>{" "}
                  {shipment.label?.tracking_status ?? "N/A"}
                </div>
                <div>
                  <span className="font-medium">ETA:</span>{" "}
                  {shipment.finalizedConfiguration?.estimated_delivery_date
                    ? DateTime.fromISO(shipment.finalizedConfiguration.estimated_delivery_date).toLocaleString(DateTime.DATE_FULL)
                    : "Unknown"}
                </div>
                <div className="flex flex-row gap-2 mt-6">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSelectedDelivery({
                        id: shipment.id,
                        orderRef: shipment.orderRef!,
                      });
                    }}
                  >
                    View Details
                  </Button>
                  <ArchiveDeliveryButton
                        orderRef={shipment.orderRef!}
                        shipmentId={shipment.id}
                        statusCode={shipment.trackingStatus?.status_code}
                        className="flex-grow"
                      />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {selectedDelivery &&
      <DeliveryDialog
        open={!!selectedDelivery}
        onOpenChange={(open) => {
          if (!open) setSelectedDelivery(null);
        }}
        merchantId={merchantId}
        selectedDelivery={selectedDelivery}
      />
      }
    </div>
  );
}

const UI: React.FC<{ merchantId: string }> = ({ merchantId }) => {
  return <DeliveriesLayout merchantId={merchantId} />;
};

export default UI;
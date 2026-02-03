'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";
import { DateTime } from "luxon";
import useDelivery from "../_hooks/useDelivery";
import useInterfaceSize from "@/components/ux/useInterfaceSize";
import { flatten } from "@/lib/functions";
import PDFViewButton from "@/app/(site)/components/0_PDFS/_components/PDFViewButton";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import TrackingStatusBadge from "./TrackingStatusBadge";
import { ArchiveDeliveryButton } from "./ArchiveDelivery";
import { ChatLayout } from "@/components/ux/ChatControl/layout";
import { CommunicationModeType } from "@/utils/spiriverse";
import ChatToggleButton from "@/components/ux/ChatControl/button";
import { OverrideShippingStatusButton } from "./OverrideDeliveryStatus";

type DeliveryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  merchantId: string;
  selectedDelivery: {
    id: string;
    orderRef: {
      id: string;
      partition: string;
    };
  };
};

function DeliveryDialog({
  open,
  onOpenChange,
  selectedDelivery,
}: DeliveryDialogProps) {
  const { isMobile } = useInterfaceSize();
  const { data: shipment, isLoading } = useDelivery({
    orderRef: selectedDelivery.orderRef,
    shipmentId: selectedDelivery.id,
    merchantId: selectedDelivery.orderRef.partition[0],
    enabled: open && !!selectedDelivery.id
  });
  const [copied, setCopied] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const DialogFrame = isMobile ? Drawer : Dialog;
  const DialogFrameContent = isMobile ? DrawerContent : DialogContent;
  const DialogFrameHeader = isMobile ? DrawerHeader : DialogHeader;
  const DialogFrameTitle = isMobile ? DrawerTitle : DialogTitle;

  function getAggregatedItems() {
    const itemMap = new Map<string, { name: string; quantity: number }>();

    shipment?.finalizedConfiguration?.boxes.forEach((box) => {
      box.items.forEach((item) => {
        if (item.forObject === "inherit") return;
        const key = `${item.forObject.id}::${flatten(
          item.forObject.partition
        )}::${item.variantId}`;
        if (itemMap.has(key)) {
          itemMap.get(key)!.quantity += item.quantity;
        } else {
          itemMap.set(key, {
            name: item.name,
            quantity: item.quantity,
          });
        }
      });
    });

    return Array.from(itemMap.values());
  }

  const aggregatedItems = shipment ? getAggregatedItems() : [];
  const totalWeight =
    shipment?.finalizedConfiguration?.boxes.reduce(
      (sum, box) => sum + box.used_weight,
      0
    ) ?? 0;
  const boxCount = shipment?.finalizedConfiguration?.boxes.length ?? 0;

  const pdfUrl = (url: string): string => {
    return `/api/proxy-label?url=${encodeURIComponent(url)}`;
  };

  const labelPdfUrl = shipment?.label?.label_download?.pdf;

  const trackingStatus_description = shipment?.trackingStatus?.description
    ?.replace(/\b[Yy]our\b(?!\s+package)/g, "The recipient's")
    .replace(/\b[Yy]our package\b/g, "The package")
    .replace(/\b[Yy]ou're\b/g, "The recipient is")
    .replace(/\b[Yy]ou\b/g, "The recipient");

  return (
    <DialogFrame open={open} onOpenChange={onOpenChange}>
      <DialogFrameContent className="max-w-[960px] h-[640px] w-full">
        {isLoading ? (
          <div className="p-4 text-sm text-muted-foreground">
            Loading shipment details...
          </div>
        ) : shipment ? (
          <ChatLayout
              open={chatOpen}
              onOpenChange={setChatOpen}
              chatProps={{
                defaultMode: CommunicationModeType.PLATFORM,
                forObject: { id: shipment.id, partition: [shipment.orderRef!.id, shipment.orderRef!.partition[0]] },
                merchantId: shipment.orderRef!.partition[0],
                withDiscussion: false,
                withAttachments: true,
                withTitle: false,
                allowResponseCodes: false,
                vendorSettings: {
                  withUserName: false,
                  withCompanyLogo: false,
                  withCompanyName: false,
                },
              }}
            >
            <div className="flex flex-col h-full min-h-0">
              <DialogFrameHeader className="flex flex-row items-center pb-2">
                <DialogFrameTitle>Delivery: {shipment?.code}</DialogFrameTitle>
                <ChatToggleButton 
                  className="ml-auto"
                  onClick={() => setChatOpen(!chatOpen)}
                />
              </DialogFrameHeader>
              <div className="flex-grow min-h-0 flex flex-col gap-6 px-2 pt-2">
                <section className="flex flex-col md:flex-row md:gap-6">
                  <div className="flex-1 space-y-3">
                    <h3 className="text-base font-semibold">Carrier Info</h3>
                    <div className="text-sm">
                      {shipment.carrierInfo?.name} —{" "}
                      {shipment.carrierInfo?.service?.name}
                    </div>
                    <div className="text-sm">
                      To: {" "}
                      {shipment.sendTo?.name ? `${shipment.sendTo.name}, ` : ""}
                      {shipment.sendTo?.city}, {shipment.sendTo?.country}
                    </div>

                    {labelPdfUrl && (
                      <div className="pt-2">
                        <PDFViewButton
                          fileName={`label-${shipment.code}.pdf`}
                          pdfUrl={pdfUrl(labelPdfUrl)}
                          label="View Label PDF"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-3 mt-4 md:mt-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold">Tracking</h3>
                      <div className="flex flex-row gap-2">
                        <TrackingStatusBadge size={"lg"} delay={0.6} event={shipment.trackingStatus} />
                        <OverrideShippingStatusButton 
                          orderRef={shipment.orderRef!}
                          shipmentId={shipment.id}
                          currentStatusCode={shipment.trackingStatus?.status_code}
                          variant="ghost"
                          size="xs"
                        />
                      </div>
                    </div>

                    {shipment.label?.tracking_number && shipment.label?.tracking_url && (
                      <div className="flex items-center gap-2 text-sm">
                        <a
                          href={shipment.label.tracking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline"
                        >
                          {shipment.label.tracking_number}
                        </a>
                        <CopyToClipboard
                          text={shipment.label.tracking_number}
                          onCopy={() => {
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                        >
                          <button type="button" aria-label="Copy tracking number">
                            {copied ? (
                              <CheckIcon size={14} className="text-green-600" />
                            ) : (
                              <CopyIcon size={14} />
                            )}
                          </button>
                        </CopyToClipboard>
                      </div>
                    )}

                    {shipment.trackingStatus && (
                      <p className="text-sm mb-3">
                        {trackingStatus_description}
                      </p>
                    )}

                    {shipment.trackingStatus?.occurred_at && (
                      <div className="text-xs text-muted-foreground">
                        Last update:{" "}
                        {DateTime.fromISO(shipment.trackingStatus.occurred_at).toLocaleString(
                          DateTime.DATETIME_MED
                        )}
                      </div>
                    )}

                  </div>
                </section>

                <Separator />

                <section className="flex-grow min-h-0 flex flex-col md:flex-row md:gap-6 px-2 mb-2">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold">Packed Items</h3>
                      {boxCount > 0 && (
                        <div className="text-muted-foreground">
                          {boxCount} {boxCount === 1 ? "box" : "boxes"}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 text-sm">
                      {aggregatedItems.length > 0 ? (
                        aggregatedItems.map((item, i) => (
                          <div key={i}>
                            {item.quantity} × {item.name}
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          No items found.
                        </div>
                      )}
                    </div>

                    {totalWeight > 0 && (
                      <div className="text-sm text-muted-foreground pt-2">
                        Total weight: {totalWeight.toFixed(1)}kg
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 mt-6 md:mt-0">
                    <h3 className="text-base font-semibold">Tracking Events</h3>
                    <div className="space-y-4 text-sm max-h-[300px] overflow-y-auto pr-1">
                      {shipment.trackingEvents?.length ? (
                        shipment.trackingEvents
                          .slice()
                          .sort(
                            (a, b) =>
                              new Date(b.occurred_at).getTime() -
                              new Date(a.occurred_at).getTime()
                          )
                          .map((event, i) => {
                            const isLatest = i === 0;
                            return (
                              <div
                                key={i}
                                className={`border rounded p-2 space-y-1 ${
                                  isLatest ? "bg-muted/50" : ""
                                }`}
                                {...(isLatest
                                  ? { title: "Most recent update" }
                                  : {})}
                              >
                                <div className="font-medium">
                                  {event.status_code}: {event.status_description}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {DateTime.fromISO(event.occurred_at).toLocaleString(
                                    DateTime.DATETIME_MED
                                  )}
                                </div>
                                {event.location && (
                                  <div className="text-xs">{event.location}</div>
                                )}
                              </div>
                            );
                          })
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          No tracking events yet.
                        </div>
                      )}
                    </div>
                  </div>
                </section>
                <ArchiveDeliveryButton
                    orderRef={shipment.orderRef!}
                    shipmentId={shipment.id}
                    statusCode={shipment.trackingStatus?.status_code}
                    className="w-full mt-auto"
                  />
              </div>
            </div>
          </ChatLayout>
        ) : (
          <div className="p-4 text-sm text-destructive">Shipment not found</div>
        )}
      </DialogFrameContent>
    </DialogFrame>
  );
}

export default DeliveryDialog;


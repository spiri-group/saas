'use client';

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
} from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import useInterfaceSize from "@/components/ux/useInterfaceSize";
import RefundStatusBadge from "@/components/ux/RefundStatusBadge";
import CurrencySpan from "@/components/ux/CurrencySpan";
import { ChatLayout } from "@/components/ux/ChatControl/layout";
import ChatToggleButton from "@/components/ux/ChatControl/button";
import { PaymentLayout } from "@/components/ux/PaymentLayout";
import StripePayment from "@/app/(site)/components/StripePayment";
import { CommunicationModeType } from "@/utils/spiriverse";
import { MerchantRefundRequest } from "../_hooks/useMerchantRefunds";
import { DateTime } from "luxon";
import PDFViewButton from "@/app/(site)/components/0_PDFS/_components/PDFViewButton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import UseApproveRefund from "../hooks/UseApproveRefund";
import UseRejectRefund from "../hooks/UseRejectRefund";
import UseRequestBetterEvidence from "../hooks/UseRequestBetterEvidence";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";

type ProcessRefundDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  refund: MerchantRefundRequest;
  merchantId: string;
};

// If you already have a backend enum, mirror the values here.
// Adjust to your real set if different.
type RefundStatus =
  | "PENDING"
  | "REQUIRES_INFO"
  | "APPROVED"
  | "REJECTED"
  | "REFUNDED"
  | "CANCELLED";

function ProcessRefundDialog({
  open,
  onOpenChange,
  refund,
  merchantId,
}: ProcessRefundDialogProps) {
  const { isMobile } = useInterfaceSize();
  const [chatOpen, setChatOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [showBetterEvidenceForm, setShowBetterEvidenceForm] = useState(false);
  const [evidenceMessage, setEvidenceMessage] = useState("");
  
  const approveRefund = UseApproveRefund(merchantId);
  const rejectRefund = UseRejectRefund(merchantId);
  const requestBetterEvidence = UseRequestBetterEvidence(merchantId);

  const DialogFrame = isMobile ? Drawer : Dialog;
  const DialogFrameContent = isMobile ? DrawerContent : DialogContent;
  const DialogFrameHeader = isMobile ? DrawerHeader : DialogHeader;
  const DialogFrameTitle = isMobile ? DrawerTitle : DialogTitle;

  // ---- helpers -------------------------------------------------------------
  const status = refund.refund_status as RefundStatus;

  const isActionable = (s: RefundStatus) =>
    s === "PENDING" || s === "REQUIRES_INFO";

  const isFinalized = (s: RefundStatus) =>
    s === "APPROVED" || s === "REJECTED" || s === "REFUNDED" || s === "CANCELLED";

  const hasLabels = (r: MerchantRefundRequest) =>
    (r.returnShippingLabels?.length ?? 0) > 0;

  // Merchant should pay only when we have an estimate, no labels yet,
  // and refund is approved (or otherwise in the correct state for label generation).
  // If your flow allows label payment pre-approval, relax this guard.
  const canPayForLabel = (r: MerchantRefundRequest) =>
    !!r.returnShippingEstimate && !hasLabels(r) && status === "APPROVED";

  const currency = refund.lines[0]?.price.currency || "USD";

  // helpers
  const totalRefundAmount = refund.lines.reduce(
    (total, line) => total + line.refund_quantity * line.price.amount,
    0
  );

  // Treat “estimate present & no labels yet” as merchant-paid label in your current model.
  // If you actually track payer, replace this with: refund.returnShippingEstimate.payer === 'merchant'
  const merchantPaysLabel = !!refund.returnShippingEstimate;

  const labelCost = refund.returnShippingEstimate?.cost?.amount ?? 0;

    // ↓ FIX: don't subtract label cost from the customer’s amount
  const amountToCustomer = totalRefundAmount;

    // ↓ New: what the merchant is actually out of pocket
  const merchantOutOfPocket = totalRefundAmount + (merchantPaysLabel ? labelCost : 0);

  const orderDate = DateTime.fromISO(refund.order.createdDate);

  const pdfUrl = (url: string): string =>
    `/api/proxy-label?url=${encodeURIComponent(url)}`;

  // Action handlers
  const handleApprove = async () => {
    await approveRefund.mutation.mutateAsync({
      id: refund.orderId,
      partition: refund.order.customerEmail,
      container: "Main-Orders"
    });
    onOpenChange(false);
  };

  const handleReject = async () => {
    await rejectRefund.mutation.mutateAsync({
      id: refund.orderId,
      partition: refund.order.customerEmail,
      container: "Main-Orders"
    });
    onOpenChange(false);
  };

  const handleRequestBetterEvidence = async () => {
    if (!evidenceMessage.trim()) return;
    
    await requestBetterEvidence.mutation.mutateAsync({
      orderRef: {
        id: refund.orderId,
        partition: refund.order.customerEmail,
        container: "Main-Orders"
      },
      message: evidenceMessage
    });
    
    setShowBetterEvidenceForm(false);
    setEvidenceMessage("");
    onOpenChange(false);
  };

  // -------------------------------------------------------------------------

  const itemsCount = refund.lines.length;
  const itemsSubtotal = totalRefundAmount; // same calc you already have

  return (
    <DialogFrame open={open} onOpenChange={onOpenChange}>
      <DialogFrameContent className="max-w-[960px] h-[660px] w-full">
        <ChatLayout
          open={chatOpen}
          onOpenChange={setChatOpen}
          chatProps={{
            defaultMode: CommunicationModeType.PLATFORM,
            forObject: { id: refund.id, partition: [refund.order.id] },
            merchantId,
            withDiscussion: false,
            withAttachments: true,
            withTitle: false,
            allowResponseCodes: false,
            vendorSettings: { withUserName: true, withCompanyLogo: false, withCompanyName: false },
          }}
        >
          <PaymentLayout
            open={paymentOpen}
            onOpenChange={setPaymentOpen}
            paymentContent={
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-4">Pay for Return Label</h3>
                <StripePayment
                  orderRef={{ id: refund.order.id, partition: [merchantId] }}
                  type="PAYMENT"
                  amount={{ amount: labelCost, currency }}
                  payButtonTitle="Pay for Return Label"
                  items={[{
                    name: "Return Shipping Label",
                    quantity: 1,
                    price: { amount: labelCost, currency }
                  }]}
                  clientSecret={refund.stripe?.setupIntentSecret}
                  stripeAccountId={refund.stripe?.accountId}
                  onCancel={() => setPaymentOpen(false)}
                  onAlter={() => setPaymentOpen(false)}
                />
              </div>
            }
          >
          <div className="flex flex-col h-full min-h-0">
            <DialogFrameHeader className="flex flex-row items-center pb-2">
              <DialogFrameTitle className="flex-grow">
                {/* Title reflects state */}
                {isActionable(status) ? "Process Refund" : "Refund Details"} — Order #{refund.order.code}
              </DialogFrameTitle>
              <div className="flex items-center gap-2">
                <RefundStatusBadge status={refund.refund_status} />
                <ChatToggleButton
                  className="ml-2"
                  onClick={() => setChatOpen(!chatOpen)}
                  label="Chat with Customer"
                />
              </div>
            </DialogFrameHeader>

            <div className="flex-grow min-h-0 flex flex-col gap-4 px-2 pt-2 overflow-auto">
              {/* Customer Info */}
              <section className="space-y-2">
                <h3 className="text-base font-semibold">Customer Information</h3>
                <div className="text-sm space-y-1">
                  <div>
                    <span className="font-medium">Email:</span> {refund.order.customerEmail}
                  </div>
                  <div>
                    <span className="font-medium">Order Date:</span>{" "}
                    {orderDate.toLocaleString(DateTime.DATETIME_MED)}
                  </div>
                </div>
              </section>

              <Separator />

              {/* Money summary merchants care about */}
              <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded border">
                    <div className="text-xs text-muted-foreground">Amount to customer</div>
                    <div className="font-medium">
                    <CurrencySpan withAnimation={false} value={{ amount: amountToCustomer, currency }} />
                    </div>
                </div>

                <div className="p-3 rounded border">
                    <div className="text-xs text-muted-foreground">Return label (merchant pays)</div>
                    <div className="font-medium">
                    <CurrencySpan
                        withAnimation={false}
                        value={refund.returnShippingEstimate?.cost ?? { amount: 0, currency }}
                    />
                    </div>
                </div>

                <div className="p-3 rounded border md:col-span-2">
                    <div className="text-xs text-muted-foreground">Merchant net position</div>
                    <div className="font-semibold">
                    <CurrencySpan withAnimation={false} value={{ amount: merchantOutOfPocket * -1, currency }} />
                    </div>
                </div>
              </section>

              {/* Items (keep table; consider a Collapsible later) */}
              <section className="border rounded">
                <Collapsible defaultOpen={false}>
                    <div className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-3">
                        <h3 className="text-base font-semibold">Items to Refund</h3>
                        <span className="text-xs text-muted-foreground">
                        {itemsCount} item{itemsCount !== 1 ? "s" : ""} • Subtotal:&nbsp;
                        <CurrencySpan
                            withAnimation={false}
                            value={{ amount: itemsSubtotal, currency }}
                        />
                        </span>
                    </div>

                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-1">
                        Details
                        <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
                        </Button>
                    </CollapsibleTrigger>
                    </div>

                    <CollapsibleContent>
                    <div className="px-3 pb-3">
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Refund Qty</TableHead>
                            <TableHead>Refund Amount</TableHead>
                            <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {refund.lines.map((line) => (
                            <TableRow key={line.id}>
                                <TableCell className="font-medium">{line.descriptor}</TableCell>
                                <TableCell>
                                <CurrencySpan withAnimation={false} value={line.price} />
                                </TableCell>
                                <TableCell>{line.quantity}</TableCell>
                                <TableCell>{line.refund_quantity}</TableCell>
                                <TableCell>
                                <CurrencySpan
                                    withAnimation={false}
                                    value={{
                                    amount: line.refund_quantity * line.price.amount,
                                    currency: line.price.currency,
                                    }}
                                />
                                </TableCell>
                                <TableCell>
                                {line.refund_status ? (
                                    <span className="text-xs px-2 py-1 bg-muted rounded">
                                    {line.refund_status}
                                    </span>
                                ) : (
                                    <span className="text-xs text-muted-foreground">
                                    Pending
                                    </span>
                                )}
                                </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                        </Table>

                        <div className="flex justify-end mt-2">
                        <div className="text-sm">
                            <span className="font-medium">Total Refund Amount: </span>
                            <CurrencySpan
                            value={{ amount: itemsSubtotal, currency }}
                            withAnimation={false}
                            />
                        </div>
                        </div>
                    </div>
                    </CollapsibleContent>
                </Collapsible>
            </section>

            {/* Evidence Photos */}
            {refund.evidencePhotos && refund.evidencePhotos.length > 0 && (
                <>
                <Separator />
                <section>
                    <h3 className="text-base font-semibold mb-3">Evidence Photos</h3>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                    {refund.evidencePhotos.map((photo, index) => (
                        <div key={index} className="relative border rounded-lg overflow-hidden">
                        <img 
                            src={photo.url} 
                            alt={`Evidence photo ${index + 1}`}
                            className="w-full h-24 object-cover cursor-pointer hover:opacity-80"
                            onClick={() => window.open(photo.url, '_blank')}
                        />
                        </div>
                    ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                    Customer provided {refund.evidencePhotos.length} photo{refund.evidencePhotos.length !== 1 ? "s" : ""} as evidence. Click to view full size.
                    </p>
                </section>
                </>
            )}

            {/* Evidence Videos */}
            {refund.evidenceVideos && refund.evidenceVideos.length > 0 && (
                <>
                <Separator />
                <section>
                    <h3 className="text-base font-semibold mb-3">Evidence Video</h3>
                    <div className="border rounded-lg overflow-hidden mb-3">
                        <video
                            controls
                            className="w-full max-h-96"
                            src={refund.evidenceVideos[0].url}
                        >
                            Your browser does not support the video tag.
                        </video>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Customer provided video evidence showing the issue.
                    </p>
                </section>
                </>
            )}

              {/* Return Shipping */}
              {(refund.returnShippingEstimate || hasLabels(refund)) && (
                <>
                  <Separator />
                  <section>
                    <h3 className="text-base font-semibold mb-3">Return Shipping</h3>

                    {hasLabels(refund) ? (
                      <div className="space-y-3">
                        <div className="p-3 border border-green-200 bg-green-50 rounded">
                          <div className="font-medium text-green-800 mb-1">✓ Return shipping labels generated</div>
                          <div className="text-sm text-green-700">
                            Customer can now print labels and return items
                          </div>
                        </div>

                        {(refund.returnShippingLabels ?? []).map((label, index) => (
                          <div key={label.label_id} className="flex justify-between items-center p-3 border rounded">
                            <div>
                              <div className="font-medium">
                                {label.carrier_code} — {label.service_code}
                              </div>
                              {label.tracking_number && (
                                <div className="text-sm text-muted-foreground">
                                  Tracking: {label.tracking_number}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {label.label_download?.pdf && (
                                <PDFViewButton
                                  fileName={`return-label-${refund.order.code}-${index + 1}.pdf`}
                                  pdfUrl={pdfUrl(label.label_download.pdf)}
                                  label="View Label"
                                />
                              )}
                              {label.label_download?.png && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(label.label_download.png, "_blank")}
                                >
                                  Download PNG
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      refund.returnShippingEstimate && (
                        <>
                          <div className="flex justify-between items-center p-3 border rounded">
                            <div>
                              <div className="font-medium">Return Shipping Required</div>
                              <div className="text-sm text-muted-foreground">
                                Return shipping label required
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">
                                <CurrencySpan value={refund.returnShippingEstimate.cost} withAnimation={false} />
                              </div>
                              <div className="text-xs text-muted-foreground">Shipping cost</div>
                            </div>
                          </div>

                          <div className="flex w-full mt-2">
                            <Button
                              variant="outline"
                              onClick={() => setPaymentOpen(true)}
                              className="w-full justify-center"
                              disabled={!canPayForLabel(refund)}
                            >
                              {status === "APPROVED" 
                                ? "Pay & Generate Label" 
                                : "Approve refund to pay for label"}
                            </Button>
                          </div>
                        </>
                      )
                    )}
                  </section>
                </>
              )}

              {/* Footer actions — now status‑aware */}
              <section className="flex justify-between pt-4 mt-auto ">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>

                {/* Only show moderation actions if actionable; otherwise show nothing or a subtle hint */}
                {isActionable(status) ? (
                  <div className="space-y-3">
                    {/* Request Better Evidence Form */}
                    {showBetterEvidenceForm ? (
                      <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
                        <h4 className="font-semibold text-orange-800 mb-2">Request Better Evidence</h4>
                        <p className="text-sm text-orange-700 mb-3">
                          Send a message to the customer explaining what evidence is needed.
                        </p>
                        <Textarea
                          value={evidenceMessage}
                          onChange={(e) => setEvidenceMessage(e.target.value)}
                          placeholder="Please provide clearer photos showing..."
                          className="mb-3"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setShowBetterEvidenceForm(false);
                              setEvidenceMessage("");
                            }}
                          >
                            Cancel
                          </Button>
                          <Button 
                            size="sm"
                            onClick={handleRequestBetterEvidence}
                            disabled={!evidenceMessage.trim() || requestBetterEvidence.mutation.isPending}
                          >
                            {requestBetterEvidence.mutation.isPending ? 'Sending...' : 'Send Request'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 flex-wrap">
                        <Button 
                          variant="destructive"
                          onClick={handleReject}
                          disabled={rejectRefund.mutation.isPending}
                        >
                          {rejectRefund.mutation.isPending ? 'Rejecting...' : 'Reject Refund'}
                        </Button>
                        
                        {refund.evidencePhotos && refund.evidencePhotos.length > 0 && (
                          <Button 
                            variant="outline"
                            onClick={() => setShowBetterEvidenceForm(true)}
                          >
                            Request Better Evidence
                          </Button>
                        )}
                        
                        <Button
                          onClick={handleApprove}
                          disabled={approveRefund.mutation.isPending}
                        >
                          {approveRefund.mutation.isPending ? 'Approving...' : 'Approve Refund'}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground self-center">
                    {isFinalized(status) ? "This refund is finalized." : null}
                  </div>
                )}
              </section>
            </div>
          </div>
          </PaymentLayout>
        </ChatLayout>
      </DialogFrameContent>
    </DialogFrame>
  );
}

export default ProcessRefundDialog;

'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { gql } from "@/lib/services/gql";
import { order_type, CommunicationModeType, refund_record_type } from "@/utils/spiriverse";
import { useQuery } from "@tanstack/react-query";
import ResponsiveContainer from "./ResponsiveContainer";
import { ChatLayout } from "@/components/ux/ChatControl/layout";
import { PaymentLayout } from "@/components/ux/PaymentLayout";
import ChatToggleButton from "@/components/ux/ChatControl/button";
import { Separator } from "@/components/ui/separator";
import RefundStatusBadge from "@/components/ux/RefundStatusBadge";
import PDFViewButton from "@/app/(site)/components/0_PDFS/_components/PDFViewButton";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import CurrencySpan from "@/components/ux/CurrencySpan";
import { capitalize } from "@/lib/functions";
import useOrderRefundPolicy from "../hooks/UseOrderRefundPolicy";
import useRefundEligibility from "../hooks/UseRefundEligibility";
import UseRequestRefundWithReason, { requestRefundWithReasonSchema } from "../hooks/UseRequestRefundWithReason";
import ReturnShippingLabels from "./ReturnShippingLabels";
import ReturnShippingEstimate from "./ReturnShippingEstimate";
import FileUploader from "@/components/ux/FileUploader";
import { media_type } from "@/utils/spiriverse";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X } from "lucide-react";
import StripePayment from "@/app/(site)/components/StripePayment";

type RefundModalProps = {
    order: order_type;
    children?: React.ReactNode;
}

const useRefundRequestLookup = (orderId: string, enabled: boolean) => {
    return useQuery({
        queryKey: ['refund', orderId],
        queryFn: async () => {
            const resp = await gql<{
                refund: refund_record_type | null
            }>(`query get_refund($orderId: ID!) {
                refund(orderId: $orderId) {
                    id
                    refund_status
                    evidencePhotos {
                        name
                        url
                        urlRelative
                        type
                        size
                    }
                    evidenceVideos {
                        name
                        url
                        urlRelative
                        type
                        size
                        sizeBytes
                        durationSeconds
                    }
                    lines {
                        id
                        descriptor
                        price {
                            amount
                            currency
                        }
                        quantity
                        refund_quantity
                        refund_status
                    }
                    returnShippingEstimate {
                        id
                        cost {
                            amount
                            currency
                        }
                        whoPayShipping
                        status
                        rate_id
                        boxes {
                            id
                            code
                            dimensions_cm {
                                depth
                                width
                                height
                            }
                            used_weight
                            items {
                                id
                                name
                                quantity
                            }
                        }
                    }
                    stripe {
                        setupIntentId
                        setupIntentSecret
                    }
                    returnShippingLabels {
                        label_id
                        tracking_number
                        carrier_code
                        service_code
                        label_download {
                            pdf
                            png
                            zpl
                        }
                    }
                }
            }`, { orderId });
            
            return resp.refund;
        },
        enabled
    });
};

const RefundModal: React.FC<RefundModalProps> = ({ order, children }) => {
    const [open, setOpen] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [selectedReasonId, setSelectedReasonId] = useState<string>("");
    const [showPaymentStep, setShowPaymentStep] = useState(false);
    const [paymentComplete, setPaymentComplete] = useState(false);
    
    const { data: refundRequest, isLoading, refetch } = useRefundRequestLookup(order.id, true);
    const { data: refundPolicy, isLoading: policyLoading } = useOrderRefundPolicy(order.id);
    const eligibility = useRefundEligibility(order, refundPolicy);
    const refundCreation = UseRequestRefundWithReason(order, refundRequest);

    const pdfUrl = (url: string): string => {
        return `/api/proxy-label?url=${encodeURIComponent(url)}`;
    };

    const handleReasonSelect = (reasonId: string) => {
        setSelectedReasonId(reasonId);
        const reason = eligibility.eligibleReasons.find(r => r.id === reasonId);
        if (reason) {
            refundCreation.applyReason(reason);
        }
    };

    const handleSubmit = async (values: requestRefundWithReasonSchema) => {
        await refundCreation.mutation.mutateAsync(values);
        
        // Refetch to get the refund record with stripe setup intent
        const { data: updatedRefund } = await refetch();
        
        // Check if customer needs to pay for shipping
        const needsPayment = updatedRefund?.returnShippingEstimate?.status === 'pending_payment' &&
                            updatedRefund?.returnShippingEstimate?.whoPayShipping === 'customer';
        
        if (needsPayment) {
            // Show payment step
            setShowPaymentStep(true);
        } else {
            // No payment needed, mark as complete
            setPaymentComplete(true);
        }
    };

    const renderContent = (onClose: () => void) => {
        // If loading, show loading state
        if (isLoading || policyLoading) {
            return (
                <div className="flex items-center justify-center p-8">
                    <div className="text-sm text-muted-foreground">
                        {isLoading ? "Loading refund status..." : "Loading refund policy..."}
                    </div>
                </div>
            );
        }

        // If there's an existing refund request, show the view component
        if (refundRequest) {
            // Check if payment is needed
            const needsPayment = (refundRequest.returnShippingEstimate as any)?.status === 'pending_payment' && 
                                (refundRequest.returnShippingEstimate as any)?.whoPayShipping === 'customer';

            const paymentPanel = needsPayment ? (
                <div className="h-full flex flex-col p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Complete Payment</h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPaymentOpen(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto">
                        <StripePayment
                            type="SETUP"
                            clientSecret={(refundRequest as any).stripe?.setupIntentSecret || ""}
                            onCancel={() => setPaymentOpen(false)}
                            onAlter={() => {
                                setPaymentOpen(false);
                                refetch();
                            }}
                        />
                    </div>
                </div>
            ) : null;

            return (
                <PaymentLayout
                    open={paymentOpen && needsPayment}
                    onOpenChange={setPaymentOpen}
                    paymentContent={paymentPanel}
                >
                <ChatLayout
                    open={chatOpen}
                    onOpenChange={setChatOpen}
                    chatProps={{
                        defaultMode: CommunicationModeType.PLATFORM,
                        forObject: { 
                            id: refundRequest.id, 
                            partition: [order.id] 
                        },
                        merchantId: order.lines[0].merchantId,
                        withDiscussion: false,
                        withAttachments: true,
                        withTitle: false,
                        allowResponseCodes: false,
                        vendorSettings: {
                            withUserName: true,
                            withCompanyLogo: false,
                            withCompanyName: true,
                        },
                    }}
                >
                    <div className="flex flex-col h-full min-h-0">
                        <div className="pb-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                    <h2 className="text-lg font-bold truncate">Order #{order.code}</h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <RefundStatusBadge status={refundRequest.refund_status} />
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <ChatToggleButton 
                                        onClick={() => setChatOpen(!chatOpen)}
                                        label="Chat"
                                    />
                                </div>
                            </div>
                        </div>

                        <Separator className="mb-4" />

                        <div className="flex-grow min-h-0 overflow-auto">
                            <div className="space-y-4">
                                {/* Items for Refund - Clickable Popover */}
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="text-sm font-semibold">Items for Refund:</h3>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="link" className="h-auto p-0 text-sm text-blue-600 hover:text-blue-800">
                                                    View {Array.isArray(refundRequest.lines) ? refundRequest.lines.length : 0} item(s)
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-80">
                                                <div className="space-y-2">
                                                    <h4 className="font-semibold text-sm mb-3">Refund Items</h4>
                                                    {Array.isArray(refundRequest.lines) && refundRequest.lines.map((line) => (
                                                        <div key={line.id} className="p-2 border rounded text-xs">
                                                            <div className="font-medium">{line.descriptor}</div>
                                                            <div className="text-muted-foreground mt-1">
                                                                Qty: {line.refund_quantity} • {line.refund_status || 'Pending'}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>

                                {/* Return Shipping */}
                                {(refundRequest.returnShippingEstimate || (Array.isArray(refundRequest.returnShippingLabels) && refundRequest.returnShippingLabels.length > 0)) && (
                                    <div>
                                        <h3 className="text-sm font-semibold mb-2">Return Shipping</h3>
                                        
                                        {Array.isArray(refundRequest.returnShippingLabels) && refundRequest.returnShippingLabels.length > 0 ? (
                                            <div className="space-y-2">
                                                <div className="p-2 border border-green-200 bg-green-50 rounded text-xs">
                                                    <div className="font-medium text-green-800">
                                                        ✓ Labels Ready
                                                    </div>
                                                    <p className="text-green-700 mt-1">
                                                        Print and attach to packages
                                                    </p>
                                                </div>
                                                
                                                {refundRequest.returnShippingLabels.map((label, index) => (
                                                    <div key={label.label_id} className="p-2 border rounded text-xs">
                                                        <div className="font-medium">
                                                            {label.carrier_code} - {label.service_code}
                                                        </div>
                                                        {label.tracking_number && (
                                                            <div className="text-muted-foreground mt-1">
                                                                {label.tracking_number}
                                                            </div>
                                                        )}
                                                        <div className="flex gap-1 mt-2">
                                                            {label.label_download?.pdf && (
                                                                <PDFViewButton
                                                                    fileName={`return-label-${order.code}-${index + 1}.pdf`}
                                                                    pdfUrl={pdfUrl(label.label_download.pdf)}
                                                                    label="PDF"
                                                                />
                                                            )}
                                                            {label.label_download?.png && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => window.open(label.label_download.png, '_blank')}
                                                                >
                                                                    PNG
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : refundRequest.returnShippingEstimate ? (
                                            <div className="space-y-2">
                                                {/* Check if customer needs to pay */}
                                                {needsPayment ? (
                                                    <div>
                                                        <div className="p-2 border border-blue-200 bg-blue-50 rounded mb-2 text-xs">
                                                            <div className="font-medium text-blue-800">
                                                                Payment Required
                                                            </div>
                                                            <div className="text-blue-700 mt-1">
                                                                Cost: <CurrencySpan value={(refundRequest.returnShippingEstimate as any).cost} />
                                                                {(refundRequest.returnShippingEstimate as any).whoPayShipping && (
                                                                    <span className="ml-1">• {(refundRequest.returnShippingEstimate as any).whoPayShipping} pays</span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Packages */}
                                                        {(refundRequest.returnShippingEstimate as any).boxes && (refundRequest.returnShippingEstimate as any).boxes.length > 0 && (
                                                            <div className="mb-2">
                                                                <div className="text-xs font-medium mb-1">Packages ({(refundRequest.returnShippingEstimate as any).boxes.length})</div>
                                                                {(refundRequest.returnShippingEstimate as any).boxes.map((box: any) => (
                                                                    <div key={box.id} className="p-2 border rounded text-xs mb-1">
                                                                        <div className="font-medium">{box.code}</div>
                                                                        <div className="text-muted-foreground">
                                                                            {box.dimensions_cm.width}×{box.dimensions_cm.height}×{box.dimensions_cm.depth}cm • {box.used_weight}kg
                                                                        </div>
                                                                        {box.items && box.items.length > 0 && (
                                                                            <div className="text-muted-foreground mt-1">
                                                                                {box.items.map((item: any) => `${item.name} (×${item.quantity})`).join(', ')}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        
                                                        <Button 
                                                            onClick={() => setPaymentOpen(true)}
                                                            className="w-full"
                                                            size="sm"
                                                        >
                                                            Complete Payment
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="p-2 border border-amber-200 bg-amber-50 rounded text-xs">
                                                        <div className="font-medium text-amber-800">
                                                            Label Pending
                                                        </div>
                                                        <div className="text-amber-700 mt-1">
                                                            Cost: <CurrencySpan value={(refundRequest.returnShippingEstimate as any).cost} />
                                                            {(refundRequest.returnShippingEstimate as any).whoPayShipping && (
                                                                <span className="ml-1">• {(refundRequest.returnShippingEstimate as any).whoPayShipping} pays</span>
                                                            )}
                                                        </div>
                                                        <div className="text-amber-600 mt-1">
                                                            Merchant processing
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : null}
                                    </div>
                                )}

                            {/* Evidence Section */}
                            {((refundRequest.evidencePhotos && refundRequest.evidencePhotos.length > 0) || 
                              (refundRequest.evidenceVideos && refundRequest.evidenceVideos.length > 0)) && (
                                <div className="mt-4 pt-4 border-t">
                                    <h3 className="text-sm font-semibold mb-2">Evidence</h3>
                                    
                                    {refundRequest.evidencePhotos && refundRequest.evidencePhotos.length > 0 && (
                                        <div className="grid grid-cols-4 gap-2 mb-2">
                                            {refundRequest.evidencePhotos.map((photo, index) => (
                                                <div key={index} className="relative border rounded overflow-hidden aspect-square">
                                                    <img
                                                        src={photo.url}
                                                        alt={`Evidence ${index + 1}`}
                                                        className="w-full h-full object-cover cursor-pointer hover:opacity-80"
                                                        onClick={() => window.open(photo.url, '_blank')}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {refundRequest.evidenceVideos && refundRequest.evidenceVideos.length > 0 && (
                                        <div className="border rounded overflow-hidden">
                                            <video
                                                controls
                                                className="w-full max-h-48"
                                                src={refundRequest.evidenceVideos[0].url}
                                            >
                                                Your browser does not support the video tag.
                                            </video>
                                        </div>
                                    )}
                                </div>
                            )}
                            </div>

                            <div className="text-center text-xs text-muted-foreground p-3 bg-muted/30 rounded mt-4">
                                <p>Use chat to communicate with the merchant • One refund request at a time</p>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 mt-auto">
                            <Button onClick={onClose} variant="outline">
                                Close
                            </Button>
                        </div>
                    </div>
                </ChatLayout>
                </PaymentLayout>
            );
        }

        // If not eligible for refund, show ineligibility message
        if (!eligibility.isEligible) {
            return (
                <div className="p-4">
                    <h2 className="text-xl font-bold mb-4">Refund Not Available</h2>
                    <p>No refund options are available for this order at this time.</p>
                    {Math.floor(eligibility.orderAgeDays) >= 1 && (
                        <p className="text-sm text-muted-foreground">Order is {Math.floor(eligibility.orderAgeDays)} days old.</p>
                    )}
                    <div className="flex justify-end pt-4">
                        <Button variant="outline" onClick={onClose}>Close</Button>
                    </div>
                </div>
            );
        }

        // Show payment step if customer needs to pay for shipping
        if (showPaymentStep && refundRequest) {
            const estimate = (refundRequest as any).returnShippingEstimate;
            const stripe = (refundRequest as any).stripe;
            
            if (!estimate) {
                return null;
            }

            const estimateWithStripe = {
                ...estimate,
                setupIntentClientSecret: stripe?.setupIntentSecret,
                setupIntentId: stripe?.setupIntentId
            };

            return (
                <div className="flex flex-col space-y-4 p-4 min-h-0 flex-grow">
                    <div className="text-center py-4">
                        <p className="text-lg font-medium text-green-600 mb-2">✓ Refund Request Submitted Successfully</p>
                        <p className="text-sm text-muted-foreground">
                            Please complete payment for return shipping to proceed.
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                            You can pay now or come back later to complete the payment.
                        </p>
                    </div>

                    {/* Show return shipping payment */}
                    <div className="flex-grow overflow-auto">
                        <ReturnShippingEstimate 
                            estimate={estimateWithStripe as any}
                            onPaymentComplete={() => {
                                setShowPaymentStep(false);
                                setPaymentComplete(true);
                                // Refetch to get updated refund with labels
                                refetch();
                            }}
                            className="max-h-full"
                        />
                    </div>

                    <div className="flex justify-between pt-4">
                        <Button onClick={onClose} variant="outline">
                            Pay Later
                        </Button>
                        <p className="text-xs text-muted-foreground self-center">
                            Your refund request is saved. Return anytime to complete payment.
                        </p>
                    </div>
                </div>
            );
        }

        // Show success/completion state
        if (paymentComplete || (refundRequest && !showPaymentStep && refundCreation.mutation.isSuccess)) {
            const labels = (refundRequest as any)?.returnShippingLabels;
            
            return (
                <div className="flex flex-col space-y-4 p-4 min-h-0 flex-grow">
                    <div className="text-center py-4">
                        <p className="text-lg font-medium text-green-600 mb-2">✓ Refund Request Complete</p>
                        <p className="text-sm text-muted-foreground">
                            Your refund request has been submitted successfully.
                        </p>
                        {labels && labels.length > 0 && (
                            <p className="text-sm text-muted-foreground mt-2">
                                Return shipping labels are ready below.
                            </p>
                        )}
                    </div>

                    {/* Show labels if available */}
                    {labels && labels.length > 0 && (
                        <div className="flex-grow overflow-auto">
                            <ReturnShippingLabels 
                                labels={labels}
                                className="max-h-full"
                            />
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <Button onClick={onClose}>
                            Close
                        </Button>
                    </div>
                </div>
            );
        }

        return (
            <Form {...refundCreation.form}>
                <form onSubmit={refundCreation.form.handleSubmit(handleSubmit)} className="flex flex-col space-y-4 p-4 min-h-0 flex-grow">
                    <div>
                        <h2 className="text-xl font-bold mb-4">Request Refund - Order #{order.code}</h2>
                        {Math.floor(eligibility.orderAgeDays) >= 1 && (
                            <p className="text-sm text-muted-foreground mb-4">Order is {Math.floor(eligibility.orderAgeDays)} days old</p>
                        )}
                    </div>
                    
                    <div className="flex-grow overflow-auto">
                        <h3 className="font-medium mb-2">Items to Refund</h3>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead>Quantity</TableHead>
                                    <TableHead>Refund Quantity</TableHead>
                                    <TableHead>Refund Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {refundCreation.form.getValues().lines.map((line, idx) => (
                                    <TableRow key={line.id}>
                                        <TableCell>{line.descriptor}</TableCell>
                                        <TableCell><CurrencySpan withAnimation={false} value={line.price} /></TableCell>
                                        <TableCell>{line.quantity}</TableCell>
                                        <TableCell>
                                            <FormField
                                                control={refundCreation.form.control}
                                                name={`lines.${idx}.refund_quantity`}
                                                render={({field}) => (
                                                    <FormItem className="flex flex-row space-y-0">
                                                        <FormControl>
                                                            <Input 
                                                                type="number"
                                                                min={0}
                                                                max={line.quantity}
                                                                {...field} 
                                                                value={field.value ?? 0} 
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )} 
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <CurrencySpan 
                                                withAnimation={false}
                                                value={{
                                                    amount: line.refund_quantity * line.price.amount * (eligibility.eligibleReasons.find(r => r.id === selectedReasonId)?.applicableTier?.refundPercentage || 1),
                                                    currency: line.price.currency
                                                }} 
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <div>
                        <FormLabel>Select Refund Reason</FormLabel>
                        <Select value={selectedReasonId} onValueChange={handleReasonSelect}>
                            <SelectTrigger>
                                <SelectValue placeholder="Choose a reason for refund" />
                            </SelectTrigger>
                            <SelectContent>
                                {eligibility.eligibleReasons.map((reason) => (
                                    <SelectItem key={reason.id} value={reason.id}>
                                        {reason.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedReasonId && (() => {
                        const selectedReason = eligibility.eligibleReasons.find(r => r.id === selectedReasonId);
                        return selectedReason && (
                            <div className="space-y-2">
                                {!selectedReason.no_refund && (
                                    <p className="text-sm text-muted-foreground">
                                        <span className="font-bold">{capitalize(selectedReason.whoPayShipping)}</span> pays for return shipping.
                                    </p>
                                )}

                                {selectedReason.conditions.length > 0 && (
                                    <div>
                                        <h4 className="font-medium">Conditions:</h4>
                                        <ul className="text-sm space-y-1">
                                            {selectedReason.conditions.map((condition) => (
                                                <li key={condition.id}>
                                                    <strong>{condition.title}:</strong> {selectedReason.applicableTier ? condition.description.replace(/\[X\]/g, selectedReason.applicableTier.daysUpTo.toString()) : condition.description}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {selectedReason.whoPayShipping === "NOT_REQUIRED" && (
                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="font-medium text-orange-600 mb-2">Evidence Required</h4>
                                            <p className="text-sm text-muted-foreground mb-3">
                                                Please upload at least 2 clear photos showing the item condition to support your refund request.
                                            </p>
                                        </div>
                                        <FormField
                                            control={refundCreation.form.control}
                                            name="evidencePhotos"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <FileUploader
                                                            id={`refund-evidence-${order.id}`}
                                                            connection={{
                                                                container: "refunds",
                                                                relative_path: `evidence/${order.id}`
                                                            }}
                                                            targetImage={{
                                                                width: 800,
                                                                height: 600
                                                            }}
                                                            targetImageVariants={[
                                                                { name: "thumb", width: 200, height: 150 }
                                                            ]}
                                                            acceptOnly={{
                                                                type: "IMAGE"
                                                            }}
                                                            allowMultiple={true}
                                                            value={Array.isArray(field.value) ? field.value.map((media) => media.url) : []}
                                                            onDropAsync={async (filenames: string[]) => {
                                                                console.log('Files dropped:', filenames);
                                                            }}
                                                            onUploadCompleteAsync={async (files: media_type[]) => {
                                                                const currentPhotos = field.value || [];
                                                                field.onChange([...currentPhotos, ...files]);
                                                            }}
                                                            onRemoveAsync={async (files: string[] | string) => {
                                                                if (typeof files === 'string') {
                                                                    field.onChange((field.value || []).filter((media) => {
                                                                        if (typeof files === "string") {
                                                                            return media.url !== files;
                                                                        }
                                                                        return true;
                                                                    }));
                                                                } else if (Array.isArray(files)) {
                                                                    field.onChange((field.value || []).filter((media) => {
                                                                        return !files.includes(media.url);
                                                                    }));
                                                                } else {
                                                                    field.onChange([]);
                                                                }
                                                            }}
                                                            className="min-h-[200px]"
                                                        />
                                                    </FormControl>
                                                    {field.value && field.value.length < 2 && (
                                                        <p className="text-sm text-red-600 mt-1">
                                                            Please upload at least 2 photos ({field.value.length}/2)
                                                        </p>
                                                    )}
                                                </FormItem>
                                            )}
                                        />

                                        {/* Video evidence - optional, shown for defective/damaged/wrong item */}
                                        {['DEFECTIVE_ITEM', 'WRONG_ITEM', 'DAMAGED_DELIVERY'].includes(selectedReason.code) && (
                                            <div>
                                                <h4 className="font-medium mb-2">Video Evidence (Optional)</h4>
                                                <p className="text-sm text-muted-foreground mb-3">
                                                    Upload a short video (max 60 seconds, 50MB) showing the issue for faster processing.
                                                </p>
                                                <FormField
                                                    control={refundCreation.form.control}
                                                    name="evidenceVideos"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormControl>
                                                                <FileUploader
                                                                    id={`refund-evidence-video-${order.id}`}
                                                                    connection={{
                                                                        container: "refunds",
                                                                        relative_path: `evidence/${order.id}/videos`
                                                                    }}
                                                                    targetImage={{
                                                                        width: 1920,
                                                                        height: 1080
                                                                    }}
                                                                    targetImageVariants={[]}
                                                                    acceptOnly={{
                                                                        type: "VIDEO"
                                                                    }}
                                                                    allowMultiple={false}
                                                                    value={Array.isArray(field.value) ? field.value.map((media) => media.url) : []}
                                                                    onDropAsync={async (filenames: string[]) => {
                                                                        console.log('Video dropped:', filenames);
                                                                    }}
                                                                    onUploadCompleteAsync={async (files: media_type[]) => {
                                                                        // Only accept first video
                                                                        field.onChange([files[0]]);
                                                                    }}
                                                                    onRemoveAsync={async () => {
                                                                        field.onChange([]);
                                                                    }}
                                                                    className="min-h-[150px]"
                                                                />
                                                            </FormControl>
                                                            {field.value && field.value.length > 0 && field.value[0].sizeBytes && field.value[0].sizeBytes > 50 * 1024 * 1024 && (
                                                                <p className="text-sm text-red-600 mt-1">
                                                                    Video must be under 50MB
                                                                </p>
                                                            )}
                                                            {field.value && field.value.length > 0 && field.value[0].durationSeconds && field.value[0].durationSeconds > 60 && (
                                                                <p className="text-sm text-red-600 mt-1">
                                                                    Video must be under 60 seconds
                                                                </p>
                                                            )}
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    <div className="flex justify-between pt-4">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={
                                !selectedReasonId || 
                                refundCreation.mutation.isPending ||
                                ((() => {
                                    const selectedReason = eligibility.eligibleReasons.find(r => r.id === selectedReasonId);
                                    return selectedReason?.whoPayShipping === "NOT_REQUIRED" && 
                                           (!refundCreation.form.getValues().evidencePhotos || refundCreation.form.getValues().evidencePhotos!.length < 2);
                                })())
                            }
                        >
                            {refundCreation.mutation.isPending ? 'Submitting...' : 'Submit Refund Request'}
                        </Button>
                    </div>
                </form>
            </Form>
        );
    };

    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen);
        if (!nextOpen) {
            // Reset state when closing
            setSelectedReasonId("");
            setShowPaymentStep(false);
            setPaymentComplete(false);
            setChatOpen(false);
        }
    };

    // Always use ResponsiveContainer - no conditional component switching
    return (
        <ResponsiveContainer
            open={open}
            onOpenChange={handleOpenChange}
            content={renderContent}
        >
            {children || (
                <Button variant="secondary" size="sm">
                    {(function(){
                        // Show "Continue Refund" when an active refund exists
                        if (!refundRequest) return 'Refund';
                        const s = (refundRequest.refund_status || '').toString().toLowerCase();
                        const inactive = ['complete','refunded','closed','cancelled'];
                        return inactive.includes(s) ? 'Refund' : 'Continue Refund';
                    })()}
                </Button>
            )}
        </ResponsiveContainer>
    );
};

export default RefundModal;
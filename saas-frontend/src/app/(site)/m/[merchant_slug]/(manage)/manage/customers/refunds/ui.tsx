'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import useMerchantRefunds, { MerchantRefundRequest } from "./_hooks/useMerchantRefunds";
import { DateTime } from "luxon";
import RefundStatusBadge from "@/components/ux/RefundStatusBadge";
import CurrencySpan from "@/components/ux/CurrencySpan";
import ProcessRefundDialog from "./_components/ProcessRefundDialog";

type Props = {
    merchantId: string;
    merchantSlug: string;
};

function RefundsLayout({ merchantId }: Props) {
    const { data: refundRequests, isLoading } = useMerchantRefunds(merchantId);
    const [selectedRefund, setSelectedRefund] = useState<MerchantRefundRequest | null>(null);

    const calculateTotalRefundAmount = (refund: MerchantRefundRequest) => {
        return refund.lines.reduce((total, line) => {
            return total + (line.refund_quantity * line.price.amount);
        }, 0);
    };

    return (
        <div className="flex flex-col h-screen p-4 space-y-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Handle Refunds</h1>
                <div className="text-sm text-muted-foreground">
                    {refundRequests?.length || 0} active refund requests
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <p className="text-muted-foreground">Loading refund requests...</p>
                </div>
            ) : refundRequests?.length === 0 ? (
                <div className="flex justify-center items-center h-64">
                    <div className="text-center">
                        <p className="text-muted-foreground text-lg">No active refund requests</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Refund requests from your customers will appear here
                        </p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 overflow-auto">
                    {refundRequests?.map((refund) => {
                        const totalAmount = calculateTotalRefundAmount(refund);
                        const createdDate = DateTime.fromISO(refund.order.createdDate);
                        
                        return (
                            <Card key={refund.id} className="hover:shadow-md transition-shadow">
                                <CardHeader className="flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-base font-semibold">
                                        Order #{refund.order.code}
                                    </CardTitle>
                                    <RefundStatusBadge status={refund.refund_status} />
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm">
                                    <div>
                                        <span className="font-medium">Customer:</span>{" "}
                                        <span className="text-muted-foreground">{refund.order.customerEmail}</span>
                                    </div>
                                    
                                    <div>
                                        <span className="font-medium">Refund Amount:</span>{" "}
                                        <CurrencySpan 
                                            value={{
                                                amount: totalAmount,
                                                currency: refund.lines[0]?.price.currency || 'USD'
                                            }} 
                                            withAnimation={false}
                                        />
                                    </div>

                                    <div>
                                        <span className="font-medium">Items:</span>{" "}
                                        <span className="text-muted-foreground">
                                            {refund.lines.length} item{refund.lines.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>

                                    <div>
                                        <span className="font-medium">Requested:</span>{" "}
                                        <span className="text-muted-foreground">
                                            {createdDate.toRelative()}
                                        </span>
                                    </div>

                                    {refund.returnShippingEstimate && (
                                        <div className="p-2 bg-muted/30 rounded">
                                            <div className="text-xs font-medium">Return Shipping Required:</div>
                                            
                                            <div className="text-xs">
                                                Cost: <CurrencySpan 
                                                    value={refund.returnShippingEstimate.cost} 
                                                    withAnimation={false} 
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-row gap-2 mt-4">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="flex-grow"
                                            onClick={() => setSelectedRefund(refund)}
                                        >
                                            Process Refund
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {selectedRefund && (
                <ProcessRefundDialog
                    open={!!selectedRefund}
                    onOpenChange={(open) => {
                        if (!open) setSelectedRefund(null);
                    }}
                    refund={selectedRefund}
                    merchantId={merchantId}
                />
            )}
        </div>
    );
}

const UI: React.FC<Props> = ({ merchantId, merchantSlug }) => {
    return <RefundsLayout merchantId={merchantId} merchantSlug={merchantSlug} />;
};

export default UI;